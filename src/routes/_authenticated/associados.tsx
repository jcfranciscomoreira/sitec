import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Pencil, Trash2, Search, Printer, Receipt, FileSignature } from "lucide-react";
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

  async function gerarContrato(a: Associado) {
    if (!a.plano_id) { toast.error("Associado sem plano vinculado."); return; }
    const [{ data: plano }, { data: deps }] = await Promise.all([
      supabase.from("planos").select("*").eq("id", a.plano_id).maybeSingle(),
      supabase.from("dependentes").select("*").eq("associado_id", a.id).order("nome"),
    ]);
    if (!plano) { toast.error("Plano não encontrado."); return; }
    const w = window.open("", "_blank", "width=900,height=800");
    if (!w) { toast.error("Permita pop-ups para gerar o contrato."); return; }
    const hoje = new Date();
    const depsRows = (deps ?? []).length
      ? `<table><thead><tr><th>Nome</th><th>Parentesco</th><th>Nascimento</th><th>CPF</th></tr></thead><tbody>${(deps ?? []).map((d: any) => `<tr><td>${d.nome}</td><td>${d.parentesco}</td><td>${d.data_nascimento ? fmtDate(d.data_nascimento) : "—"}</td><td>${d.cpf ?? "—"}</td></tr>`).join("")}</tbody></table>`
      : `<p class="muted">Nenhum dependente cadastrado.</p>`;
    const cobertura = (plano.cobertura ?? "").trim()
      ? `<ul>${(plano.cobertura as string).split(/\r?\n|;|•/).map((s) => s.trim()).filter(Boolean).map((s) => `<li>${s}</li>`).join("")}</ul>`
      : `<p class="muted">Cobertura conforme descrição do plano.</p>`;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Contrato — ${a.nome}</title>
      <style>
        body{font-family:Georgia,serif;color:#111;padding:40px;max-width:820px;margin:0 auto;line-height:1.55}
        h1{font-size:20px;text-align:center;margin:0 0 4px;color:#1e3a5f;letter-spacing:1px;text-transform:uppercase}
        h2{font-size:13px;margin:22px 0 8px;color:#1e3a5f;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #1e3a5f;padding-bottom:4px}
        p{margin:6px 0;text-align:justify;font-size:13px}
        table{width:100%;border-collapse:collapse;font-size:12px;margin-top:6px}
        th,td{border:1px solid #ccc;padding:5px 7px;text-align:left}
        th{background:#f4f4f4}
        ul{font-size:13px;margin:4px 0 4px 20px}
        .meta{text-align:center;font-size:11px;color:#666;margin-bottom:18px}
        .muted{color:#888;font-size:12px;font-style:italic}
        .grid{display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;font-size:13px;margin-top:6px}
        .grid div b{color:#1e3a5f}
        .assinaturas{margin-top:60px;display:grid;grid-template-columns:1fr 1fr;gap:60px;font-size:12px;text-align:center}
        .linha{border-top:1px solid #111;padding-top:4px;margin-top:60px}
        @media print{body{padding:24px}}
      </style></head><body>
      <h1>Contrato de Adesão — Plano Funerário</h1>
      <div class="meta">Memorial · Emitido em ${hoje.toLocaleDateString("pt-BR")}</div>

      <p>Pelo presente instrumento particular, de um lado a <b>MEMORIAL</b>, doravante denominada <b>CONTRATADA</b>, e de outro lado o(a) associado(a) abaixo qualificado, doravante denominado(a) <b>CONTRATANTE</b>, têm entre si justo e contratado o seguinte:</p>

      <h2>I. Identificação do Contratante</h2>
      <div class="grid">
        <div><b>Código:</b> #${String(a.codigo).padStart(4, "0")}</div>
        <div><b>Nome:</b> ${a.nome}</div>
        <div><b>CPF:</b> ${a.cpf ?? "—"}</div>
        <div><b>RG:</b> ${a.rg ?? "—"}</div>
        <div><b>Nascimento:</b> ${a.data_nascimento ? fmtDate(a.data_nascimento) : "—"}</div>
        <div><b>Telefone:</b> ${a.telefone ?? "—"}</div>
        <div style="grid-column:span 2"><b>E-mail:</b> ${a.email ?? "—"}</div>
        <div style="grid-column:span 2"><b>Endereço:</b> ${a.endereco ?? "—"} — ${a.cidade ?? ""}/${a.estado ?? ""} ${a.cep ?? ""}</div>
      </div>

      <h2>II. Plano Contratado</h2>
      <div class="grid">
        <div><b>Plano:</b> ${plano.nome}</div>
        <div><b>Mensalidade:</b> ${brl(plano.valor_mensal)}</div>
        <div><b>Adesão:</b> ${fmtDate(a.data_adesao)}</div>
        <div><b>Vencimento mensal:</b> dia ${a.dia_vencimento}</div>
        <div><b>Status:</b> ${a.status}</div>
      </div>
      ${plano.descricao ? `<p style="margin-top:8px"><b>Descrição:</b> ${plano.descricao}</p>` : ""}

      <h2>III. Serviços e Coberturas</h2>
      ${cobertura}

      <h2>IV. Dependentes Inclusos</h2>
      ${depsRows}

      <h2>V. Condições Gerais</h2>
      <p><b>1.</b> O CONTRATANTE compromete-se a efetuar o pagamento da mensalidade no valor de <b>${brl(plano.valor_mensal)}</b> até o dia <b>${a.dia_vencimento}</b> de cada mês, sob pena de suspensão dos serviços contratados.</p>
      <p><b>2.</b> O atraso superior a 60 (sessenta) dias acarretará a suspensão automática da cobertura, sendo necessária a regularização integral dos débitos para reativação.</p>
      <p><b>3.</b> O presente contrato vigora por prazo indeterminado, podendo ser rescindido por qualquer das partes mediante comunicação prévia por escrito.</p>
      <p><b>4.</b> A inclusão de novos dependentes está limitada ao número máximo previsto no plano contratado e deverá ser solicitada formalmente à CONTRATADA.</p>
      <p><b>5.</b> Os serviços abrangidos por este contrato são exclusivamente aqueles descritos na cláusula III, ficando excluídos quaisquer serviços não relacionados.</p>
      <p><b>6.</b> Fica eleito o foro da comarca do CONTRATANTE para dirimir quaisquer questões oriundas deste contrato.</p>

      <p style="margin-top:24px">E por estarem assim justos e contratados, firmam o presente em duas vias de igual teor.</p>
      <p style="text-align:right">${a.cidade ? `${a.cidade}${a.estado ? "/" + a.estado : ""}, ` : ""}${hoje.toLocaleDateString("pt-BR")}</p>

      <div class="assinaturas">
        <div><div class="linha">CONTRATANTE<br/>${a.nome}<br/>CPF: ${a.cpf ?? "—"}</div></div>
        <div><div class="linha">CONTRATADA<br/>Memorial</div></div>
      </div>

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
                      <Button size="icon" variant="ghost" title="Gerar contrato" onClick={() => gerarContrato(a)}><FileSignature className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" title="Imprimir relatório" onClick={() => imprimirRelatorio(a)}><Printer className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" title="Mensalidades geradas" onClick={() => setMensOpen(a)}><Receipt className="h-4 w-4" /></Button>
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

      
      {mensOpen && <MensalidadesDialog associado={mensOpen} onClose={() => setMensOpen(null)} />}
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

function MensalidadesDialog({ associado, onClose }: { associado: Associado; onClose: () => void }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: mens = [], isLoading } = useQuery({
    queryKey: ["mensalidades-associado", associado.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mensalidades")
        .select("*")
        .eq("associado_id", associado.id)
        .order("competencia", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const upsertParcela = useMutation({
    mutationFn: async (p: any) => {
      const payload: any = {
        competencia: p.competencia,
        vencimento: p.vencimento,
        valor: Number(p.valor),
        status: p.status,
        data_pagamento: p.status === "pago" ? (p.data_pagamento || new Date().toISOString().slice(0, 10)) : null,
        forma_pagamento: p.forma_pagamento || null,
        observacoes: p.observacoes || null,
      };
      if (p.id) {
        const { error } = await supabase.from("mensalidades").update(payload).eq("id", p.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("mensalidades").insert({ ...payload, associado_id: associado.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mensalidades-associado", associado.id] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["mensalidades"] });
      setEditing(null); setCreating(false);
      toast.success("Parcela salva");
    },
    onError: (e: any) => toast.error("Erro", { description: e.message }),
  });

  const cancelar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("mensalidades").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mensalidades-associado", associado.id] });
      toast.success("Parcela removida");
    },
    onError: (e: any) => toast.error("Erro", { description: e.message }),
  });

  const totalPago = mens.filter((m) => m.status === "pago").reduce((s, m) => s + Number(m.valor), 0);
  const totalAberto = mens.filter((m) => m.status !== "pago" && m.status !== "cancelado").reduce((s, m) => s + Number(m.valor), 0);

  function novaParcelaDefaults() {
    const hoje = new Date();
    // próximo mês a partir da última competência, ou mês corrente
    let ano = hoje.getFullYear(), mes = hoje.getMonth() + 1;
    if (mens.length > 0) {
      const [y, m] = mens[0].competencia.split("-").map(Number);
      const d = new Date(y, m, 1); ano = d.getFullYear(); mes = d.getMonth() + 1;
    }
    const competencia = `${ano}-${String(mes).padStart(2, "0")}-01`;
    const venc = new Date(ano, mes - 1, Math.min(associado.dia_vencimento, 28)).toISOString().slice(0, 10);
    return {
      competencia,
      vencimento: venc,
      valor: associado.planos?.valor_mensal ?? 0,
      status: "pendente",
      data_pagamento: "",
      forma_pagamento: "",
      observacoes: "",
    };
  }

  const form = editing || (creating ? novaParcelaDefaults() : null);

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif">Mensalidades de {associado.nome}</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-4 text-sm">
            <div className="rounded border border-border px-3 py-2">
              <div className="text-xs text-muted-foreground">Total pago</div>
              <div className="font-semibold text-success">{brl(totalPago)}</div>
            </div>
            <div className="rounded border border-border px-3 py-2">
              <div className="text-xs text-muted-foreground">Em aberto</div>
              <div className="font-semibold text-gold">{brl(totalAberto)}</div>
            </div>
          </div>
          {!form && (
            <Button onClick={() => setCreating(true)}><Plus className="mr-2 h-4 w-4" />Nova parcela</Button>
          )}
        </div>

        {form && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              upsertParcela.mutate({
                id: editing?.id,
                competencia: String(fd.get("competencia")),
                vencimento: String(fd.get("vencimento")),
                valor: String(fd.get("valor")),
                status: String(fd.get("status")),
                data_pagamento: String(fd.get("data_pagamento") || ""),
                forma_pagamento: String(fd.get("forma_pagamento") || ""),
                observacoes: String(fd.get("observacoes") || ""),
              });
            }}
            className="space-y-3 rounded-md border border-border p-4"
          >
            <div className="text-sm font-medium">{editing ? "Editar parcela" : "Nova parcela"}</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Competência (1º dia do mês)</Label>
                <Input name="competencia" type="date" defaultValue={form.competencia} required />
              </div>
              <div className="space-y-2">
                <Label>Vencimento</Label>
                <Input name="vencimento" type="date" defaultValue={form.vencimento} required />
              </div>
              <div className="space-y-2">
                <Label>Valor</Label>
                <Input name="valor" type="number" step="0.01" min="0" defaultValue={form.valor} required />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select name="status" defaultValue={form.status}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="pago">Pago</SelectItem>
                    <SelectItem value="atrasado">Atrasado</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data de pagamento</Label>
                <Input name="data_pagamento" type="date" defaultValue={form.data_pagamento ?? ""} />
              </div>
              <div className="space-y-2">
                <Label>Forma de pagamento</Label>
                <Select name="forma_pagamento" defaultValue={form.forma_pagamento ?? ""}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="cartao">Cartão</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Observações</Label>
                <Textarea name="observacoes" rows={2} defaultValue={form.observacoes ?? ""} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => { setEditing(null); setCreating(false); }}>Cancelar</Button>
              <Button type="submit" disabled={upsertParcela.isPending}>{upsertParcela.isPending ? "Salvando..." : "Salvar"}</Button>
            </div>
          </form>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Competência</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Pagamento</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Carregando...</TableCell></TableRow>}
            {!isLoading && mens.length === 0 && <TableRow><TableCell colSpan={6} className="py-6 text-center text-muted-foreground">Nenhuma parcela gerada.</TableCell></TableRow>}
            {mens.map((m) => (
              <TableRow key={m.id}>
                <TableCell>{competenciaLabel(m.competencia)}</TableCell>
                <TableCell>{fmtDate(m.vencimento)}</TableCell>
                <TableCell>{brl(m.valor)}</TableCell>
                <TableCell><StatusBadge status={m.status} /></TableCell>
                <TableCell>{m.data_pagamento ? fmtDate(m.data_pagamento) : "—"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" title="Editar parcela" onClick={() => { setCreating(false); setEditing(m); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" title="Excluir" onClick={() => { if (confirm("Excluir parcela?")) cancelar.mutate(m.id); }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
}
