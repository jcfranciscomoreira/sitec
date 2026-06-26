import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Pencil, Trash2, Users, Search, CheckCircle2, Printer, Receipt } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { brl, fmtDate, competenciaLabel } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/associados")({
  head: () => ({ meta: [{ title: "Associados — Memorial" }] }),
  component: AssociadosPage,
});

type Associado = {
  id: string; codigo: number; nome: string; cpf: string | null; rg: string | null;
  data_nascimento: string | null; telefone: string | null; email: string | null;
  endereco: string | null; cidade: string | null; estado: string | null; cep: string | null;
  plano_id: string | null; data_adesao: string; dia_vencimento: number;
  status: "ativo" | "inativo" | "suspenso"; observacoes: string | null;
  planos?: { nome: string; valor_mensal: number } | null;
};

type Dependente = {
  id: string; associado_id: string; nome: string; cpf: string | null;
  data_nascimento: string | null; parentesco: string; observacoes: string | null;
};

function AssociadosPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Associado | null>(null);
  const [depOpen, setDepOpen] = useState<Associado | null>(null);
  const [mensOpen, setMensOpen] = useState<Associado | null>(null);

  const { data: associados = [], isLoading } = useQuery({
    queryKey: ["associados"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("associados")
        .select("*, planos(nome, valor_mensal)")
        .order("nome");
      if (error) throw error;
      return data as Associado[];
    },
  });

  const { data: planos = [] } = useQuery({
    queryKey: ["planos-ativos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("planos").select("id, nome, valor_mensal").eq("ativo", true).order("valor_mensal");
      if (error) throw error;
      return data;
    },
  });

  const upsert = useMutation({
    mutationFn: async (a: Partial<Associado> & { plano_id_form?: string }) => {
      const payload: any = { ...a };
      if (a.plano_id_form !== undefined) { payload.plano_id = a.plano_id_form || null; delete payload.plano_id_form; }
      if (a.id) {
        const { error } = await supabase.from("associados").update(payload).eq("id", a.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("associados").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["associados"] });
      setOpen(false); setEditing(null);
      toast.success("Associado salvo");
    },
    onError: (e: any) => toast.error("Erro", { description: e.message }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("associados").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["associados"] }); toast.success("Associado excluído"); },
    onError: (e: any) => toast.error("Erro", { description: e.message }),
  });

  const darBaixa = useMutation({
    mutationFn: async (a: Associado) => {
      const { data: pend, error } = await supabase
        .from("mensalidades")
        .select("id, competencia, valor")
        .eq("associado_id", a.id)
        .neq("status", "pago")
        .neq("status", "cancelado")
        .order("vencimento", { ascending: true })
        .limit(1);
      if (error) throw error;
      if (!pend || pend.length === 0) throw new Error("Nenhuma mensalidade pendente para este associado.");
      const m = pend[0];
      const { error: e2 } = await supabase.from("mensalidades").update({
        status: "pago",
        data_pagamento: new Date().toISOString().slice(0, 10),
        forma_pagamento: "dinheiro",
      }).eq("id", m.id);
      if (e2) throw e2;
      return m;
    },
    onSuccess: (m) => {
      qc.invalidateQueries({ queryKey: ["mensalidades"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Baixa registrada", { description: `${competenciaLabel(m.competencia)} — ${brl(m.valor)}` });
    },
    onError: (e: any) => toast.error("Erro", { description: e.message }),
  });

  const gerarMens = useMutation({
    mutationFn: async (a: Associado) => {
      if (!a.plano_id || !a.planos) throw new Error("Associado sem plano vinculado.");
      const hoje = new Date();
      const competencia = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-01`;
      const venc = new Date(hoje.getFullYear(), hoje.getMonth(), Math.min(a.dia_vencimento, 28))
        .toISOString().slice(0, 10);
      const { error, count } = await supabase.from("mensalidades").upsert([{
        associado_id: a.id,
        competencia,
        valor: a.planos.valor_mensal,
        vencimento: venc,
        status: "pendente" as const,
      }] as any, { onConflict: "associado_id,competencia", ignoreDuplicates: true, count: "exact" });
      if (error) throw error;
      return { count: count ?? 0, competencia };
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["mensalidades"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      if (r.count === 0) toast.info("Mensalidade já existia para este mês.");
      else toast.success("Mensalidade gerada", { description: competenciaLabel(r.competencia) });
    },
    onError: (e: any) => toast.error("Erro", { description: e.message }),
  });

  async function imprimirRelatorio(a: Associado) {
    const [{ data: deps }, { data: mens }] = await Promise.all([
      supabase.from("dependentes").select("*").eq("associado_id", a.id).order("nome"),
      supabase.from("mensalidades").select("*").eq("associado_id", a.id).order("competencia", { ascending: false }),
    ]);
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) { toast.error("Permita pop-ups para imprimir."); return; }
    const linha = (k: string, v: string) => `<tr><td style="padding:4px 8px;color:#666;width:180px">${k}</td><td style="padding:4px 8px">${v}</td></tr>`;
    const depsRows = (deps ?? []).map((d: any) =>
      `<tr><td>${d.nome}</td><td>${d.parentesco}</td><td>${d.data_nascimento ? fmtDate(d.data_nascimento) : "—"}</td><td>${d.cpf ?? "—"}</td></tr>`
    ).join("") || `<tr><td colspan="4" style="text-align:center;color:#888;padding:8px">Nenhum dependente</td></tr>`;
    const mensRows = (mens ?? []).map((m: any) =>
      `<tr><td>${competenciaLabel(m.competencia)}</td><td>${fmtDate(m.vencimento)}</td><td>${brl(m.valor)}</td><td>${m.status}</td><td>${m.data_pagamento ? fmtDate(m.data_pagamento) : "—"}</td></tr>`
    ).join("") || `<tr><td colspan="5" style="text-align:center;color:#888;padding:8px">Sem mensalidades</td></tr>`;
    const totalPago = (mens ?? []).filter((m: any) => m.status === "pago").reduce((s: number, m: any) => s + Number(m.valor), 0);
    const totalPend = (mens ?? []).filter((m: any) => m.status !== "pago" && m.status !== "cancelado").reduce((s: number, m: any) => s + Number(m.valor), 0);
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Relatório — ${a.nome}</title>
      <style>
        body{font-family:Georgia,serif;color:#111;padding:32px;max-width:820px;margin:0 auto}
        h1{font-size:22px;margin:0 0 4px;border-bottom:2px solid #1e3a5f;padding-bottom:8px;color:#1e3a5f}
        h2{font-size:14px;margin:24px 0 8px;color:#1e3a5f;text-transform:uppercase;letter-spacing:1px}
        table{width:100%;border-collapse:collapse;font-size:13px}
        th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}
        th{background:#f4f4f4}
        .meta{font-size:12px;color:#666;margin-bottom:16px}
        .totais{margin-top:12px;font-size:13px}
      </style></head><body>
      <h1>Relatório do Associado</h1>
      <div class="meta">Gerado em ${new Date().toLocaleString("pt-BR")} · Memorial</div>
      <h2>Dados cadastrais</h2>
      <table>
        ${linha("Código", `#${String(a.codigo).padStart(4, "0")}`)}
        ${linha("Nome", a.nome)}
        ${linha("CPF / RG", `${a.cpf ?? "—"} / ${a.rg ?? "—"}`)}
        ${linha("Nascimento", a.data_nascimento ? fmtDate(a.data_nascimento) : "—")}
        ${linha("Telefone", a.telefone ?? "—")}
        ${linha("E-mail", a.email ?? "—")}
        ${linha("Endereço", `${a.endereco ?? "—"} — ${a.cidade ?? ""}/${a.estado ?? ""} ${a.cep ?? ""}`)}
        ${linha("Plano", a.planos ? `${a.planos.nome} — ${brl(a.planos.valor_mensal)}` : "—")}
        ${linha("Adesão", fmtDate(a.data_adesao))}
        ${linha("Vencimento", `Dia ${a.dia_vencimento}`)}
        ${linha("Status", a.status)}
      </table>
      <h2>Dependentes</h2>
      <table><thead><tr><th>Nome</th><th>Parentesco</th><th>Nascimento</th><th>CPF</th></tr></thead><tbody>${depsRows}</tbody></table>
      <h2>Histórico financeiro</h2>
      <table><thead><tr><th>Competência</th><th>Vencimento</th><th>Valor</th><th>Status</th><th>Pagamento</th></tr></thead><tbody>${mensRows}</tbody></table>
      <div class="totais"><strong>Total pago:</strong> ${brl(totalPago)} &nbsp;·&nbsp; <strong>Em aberto:</strong> ${brl(totalPend)}</div>
      <script>window.onload=()=>{window.print();}</script>
      </body></html>`);
    w.document.close();
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => { const v = String(fd.get(k) || ""); return v.trim() ? v : null; };
    upsert.mutate({
      id: editing?.id,
      nome: String(fd.get("nome")),
      cpf: get("cpf"),
      rg: get("rg"),
      data_nascimento: get("data_nascimento"),
      telefone: get("telefone"),
      email: get("email"),
      endereco: get("endereco"),
      cidade: get("cidade"),
      estado: get("estado"),
      cep: get("cep"),
      plano_id_form: String(fd.get("plano_id") || ""),
      data_adesao: String(fd.get("data_adesao") || new Date().toISOString().slice(0, 10)),
      dia_vencimento: Number(fd.get("dia_vencimento") || 10),
      status: (fd.get("status") as any) || "ativo",
      observacoes: get("observacoes"),
    });
  }

  const filtered = associados.filter((a) =>
    !search || a.nome.toLowerCase().includes(search.toLowerCase()) ||
    (a.cpf ?? "").includes(search) || String(a.codigo).includes(search)
  );

  return (
    <AppShell
      title="Associados"
      subtitle="Cadastro de titulares e dependentes"
      actions={
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Novo associado</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="font-serif">{editing ? `Editar — ${editing.nome}` : "Novo associado"}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2 col-span-2"><Label>Nome completo *</Label><Input name="nome" defaultValue={editing?.nome} required /></div>
                <div className="space-y-2"><Label>CPF</Label><Input name="cpf" defaultValue={editing?.cpf ?? ""} /></div>
                <div className="space-y-2"><Label>RG</Label><Input name="rg" defaultValue={editing?.rg ?? ""} /></div>
                <div className="space-y-2"><Label>Data de nascimento</Label><Input name="data_nascimento" type="date" defaultValue={editing?.data_nascimento ?? ""} /></div>
                <div className="space-y-2"><Label>Telefone</Label><Input name="telefone" defaultValue={editing?.telefone ?? ""} /></div>
                <div className="space-y-2 col-span-2"><Label>E-mail</Label><Input name="email" type="email" defaultValue={editing?.email ?? ""} /></div>
                <div className="space-y-2 col-span-2"><Label>Endereço</Label><Input name="endereco" defaultValue={editing?.endereco ?? ""} /></div>
                <div className="space-y-2"><Label>Cidade</Label><Input name="cidade" defaultValue={editing?.cidade ?? ""} /></div>
                <div className="space-y-2"><Label>Estado</Label><Input name="estado" maxLength={2} defaultValue={editing?.estado ?? ""} /></div>
                <div className="space-y-2"><Label>CEP</Label><Input name="cep" defaultValue={editing?.cep ?? ""} /></div>
                <div className="space-y-2"><Label>Status</Label>
                  <Select name="status" defaultValue={editing?.status ?? "ativo"}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="suspenso">Suspenso</SelectItem>
                      <SelectItem value="inativo">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Plano</Label>
                  <Select name="plano_id" defaultValue={editing?.plano_id ?? ""}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {planos.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>{p.nome} — {brl(p.valor_mensal)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Data de adesão</Label><Input name="data_adesao" type="date" defaultValue={editing?.data_adesao ?? new Date().toISOString().slice(0, 10)} /></div>
                <div className="space-y-2"><Label>Dia de vencimento</Label><Input name="dia_vencimento" type="number" min={1} max={28} defaultValue={editing?.dia_vencimento ?? 10} /></div>
                <div className="space-y-2 col-span-2"><Label>Observações</Label><Textarea name="observacoes" rows={2} defaultValue={editing?.observacoes ?? ""} /></div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={upsert.isPending}>{upsert.isPending ? "Salvando..." : "Salvar"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      }
    >
      <Card className="border-border/60 shadow-soft">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-serif">Lista de associados</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Buscar por nome, CPF, código..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Adesão</TableHead>
                <TableHead>Venc.</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Carregando...</TableCell></TableRow>}
              {!isLoading && filtered.length === 0 && <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Nenhum associado encontrado.</TableCell></TableRow>}
              {filtered.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">#{String(a.codigo).padStart(4, "0")}</TableCell>
                  <TableCell>
                    <div className="font-medium">{a.nome}</div>
                    <div className="text-xs text-muted-foreground">{a.cpf ?? "Sem CPF"}{a.telefone ? ` · ${a.telefone}` : ""}</div>
                  </TableCell>
                  <TableCell>{a.planos?.nome ?? <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell>{fmtDate(a.data_adesao)}</TableCell>
                  <TableCell>dia {a.dia_vencimento}</TableCell>
                  <TableCell><StatusBadge status={a.status} /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" title="Dar baixa (último pendente)" onClick={() => darBaixa.mutate(a)} disabled={darBaixa.isPending}><CheckCircle2 className="h-4 w-4 text-success" /></Button>
                      <Button size="icon" variant="ghost" title="Gerar mensalidade do mês" onClick={() => gerarMens.mutate(a)} disabled={gerarMens.isPending}><Plus className="h-4 w-4 text-gold" /></Button>
                      <Button size="icon" variant="ghost" title="Imprimir relatório" onClick={() => imprimirRelatorio(a)}><Printer className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" title="Mensalidades geradas" onClick={() => setMensOpen(a)}><Receipt className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" title="Dependentes" onClick={() => setDepOpen(a)}><Users className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" title="Editar" onClick={() => { setEditing(a); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" title="Excluir" onClick={() => { if (confirm(`Excluir ${a.nome}?`)) del.mutate(a.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {depOpen && <DependentesDialog associado={depOpen} onClose={() => setDepOpen(null)} />}
    </AppShell>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ativo: "bg-success/15 text-success border-success/30",
    suspenso: "bg-gold/15 text-gold border-gold/30",
    inativo: "bg-muted text-muted-foreground",
  };
  return <Badge variant="outline" className={map[status] ?? ""}>{status}</Badge>;
}

function DependentesDialog({ associado, onClose }: { associado: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const { data: deps = [], isLoading } = useQuery({
    queryKey: ["dependentes", associado.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("dependentes").select("*").eq("associado_id", associado.id).order("nome");
      if (error) throw error;
      return data as Dependente[];
    },
  });

  const add = useMutation({
    mutationFn: async (d: Partial<Dependente>) => {
      const { error } = await supabase.from("dependentes").insert({ ...d, associado_id: associado.id } as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["dependentes", associado.id] }); setAdding(false); toast.success("Dependente adicionado"); },
    onError: (e: any) => toast.error("Erro", { description: e.message }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("dependentes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["dependentes", associado.id] }); toast.success("Removido"); },
  });

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle className="font-serif">Dependentes de {associado.nome}</DialogTitle></DialogHeader>
        {!adding && (
          <Button variant="outline" size="sm" onClick={() => setAdding(true)}><Plus className="mr-2 h-4 w-4" />Adicionar dependente</Button>
        )}
        {adding && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              add.mutate({
                nome: String(fd.get("nome")),
                parentesco: String(fd.get("parentesco")),
                data_nascimento: String(fd.get("data_nascimento") || "") || null,
                cpf: String(fd.get("cpf") || "") || null,
              });
            }}
            className="space-y-3 rounded-md border border-border p-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2 col-span-2"><Label>Nome</Label><Input name="nome" required /></div>
              <div className="space-y-2"><Label>Parentesco</Label><Input name="parentesco" placeholder="Cônjuge, Filho(a)..." required /></div>
              <div className="space-y-2"><Label>Data de nascimento</Label><Input name="data_nascimento" type="date" /></div>
              <div className="space-y-2 col-span-2"><Label>CPF</Label><Input name="cpf" /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setAdding(false)}>Cancelar</Button>
              <Button type="submit" disabled={add.isPending}>Salvar</Button>
            </div>
          </form>
        )}
        <div className="divide-y divide-border">
          {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
          {!isLoading && deps.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Nenhum dependente cadastrado.</p>}
          {deps.map((d) => (
            <div key={d.id} className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium">{d.nome}</p>
                <p className="text-xs text-muted-foreground">{d.parentesco}{d.data_nascimento ? ` · ${fmtDate(d.data_nascimento)}` : ""}</p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => { if (confirm(`Remover ${d.nome}?`)) del.mutate(d.id); }}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
