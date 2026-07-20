import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Plus, Pencil, Trash2, CheckCircle2, Printer, Receipt, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { SkeletonTable } from "@/components/ui/skeleton-table";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { brl, fmtDate } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/contas")({
  head: () => ({ meta: [{ title: "Entradas e Saidas — Memorial" }] }),
  component: ContasPage,
});

type Conta = {
  id: string;
  tipo: "entrada" | "saida";
  descricao: string;
  categoria: string | null;
  filial_id: string | null;
  valor: number;
  data_emissao: string;
  vencimento: string;
  data_pagamento: string | null;
  forma_pagamento: string | null;
  status: "pendente" | "pago" | "atrasado" | "cancelado";
  fornecedor_cliente: string | null;
  observacoes: string | null;
};

function ContasPage() {
  const qc = useQueryClient();
  const [tipo, setTipo] = useState<"todos" | "entrada" | "saida">("todos");
  const [status, setStatus] = useState<string>("todos");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Conta | null>(null);
  const [payOpen, setPayOpen] = useState<Conta | null>(null);


  const { data: filiais = [] } = useQuery({
    queryKey: ["filiais-ativas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("filiais").select("id, nome").eq("ativo", true).order("nome");
      if (error) throw error;
      return data as { id: string; nome: string }[];
    },
  });

  const { data: lista = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["contas", tipo, status],
    queryFn: async () => {
      let q = supabase.from("contas_financeiras").select("*").order("vencimento", { ascending: false });
      if (tipo !== "todos") q = q.eq("tipo", tipo);
      if (status !== "todos") q = q.eq("status", status as any);
      const { data, error } = await q.limit(500);
      if (error) throw error;
      const hoje = new Date().toISOString().slice(0, 10);
      return (data as Conta[]).map((c) =>
        c.status === "pendente" && c.vencimento < hoje ? { ...c, status: "atrasado" as const } : c,
      );
    },
  });

  const save = useMutation({
    mutationFn: async (payload: any) => {
      if (editing) {
        const { error } = await supabase.from("contas_financeiras").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("contas_financeiras").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contas"] });
      qc.invalidateQueries({ queryKey: ["empresa-financeiro"] });
      setOpen(false); setEditing(null);
      toast.success("Lançamento salvo");
    },
    onError: (e: any) => toast.error("Erro", { description: e.message }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contas_financeiras").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contas"] });
      qc.invalidateQueries({ queryKey: ["empresa-financeiro"] });
      toast.success("Excluído");
    },
  });

  const pay = useMutation({
    mutationFn: async (p: { id: string; data_pagamento: string; forma_pagamento: string }) => {
      const { error } = await supabase.from("contas_financeiras").update({
        status: "pago", data_pagamento: p.data_pagamento, forma_pagamento: p.forma_pagamento,
      }).eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contas"] });
      qc.invalidateQueries({ queryKey: ["empresa-financeiro"] });
      setPayOpen(null);
      toast.success("Baixa registrada");
    },
    onError: (e: any) => toast.error("Erro", { description: e.message }),
  });

  const totais = useMemo(() => {
    const entradas = lista.filter((c) => c.tipo === "entrada");
    const saidas = lista.filter((c) => c.tipo === "saida");
    const recebido = entradas.filter((c) => c.status === "pago").reduce((s, c) => s + Number(c.valor), 0);
    const pago = saidas.filter((c) => c.status === "pago").reduce((s, c) => s + Number(c.valor), 0);
    const aReceber = entradas.filter((c) => c.status !== "pago" && c.status !== "cancelado").reduce((s, c) => s + Number(c.valor), 0);
    const aPagar = saidas.filter((c) => c.status !== "pago" && c.status !== "cancelado").reduce((s, c) => s + Number(c.valor), 0);
    return { recebido, pago, aReceber, aPagar, saldo: recebido - pago };
  }, [lista]);

  function imprimirRelatorio() {
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) return;
    const rows = lista.map((c) => `
      <tr>
        <td>${c.tipo === "entrada" ? "Entrada" : "Saída"}</td>
        <td>${c.descricao}</td>
        <td>${c.fornecedor_cliente ?? "—"}</td>
        <td>${fmtDate(c.vencimento)}</td>
        <td>${c.data_pagamento ? fmtDate(c.data_pagamento) : "—"}</td>
        <td style="text-align:right">${brl(c.valor)}</td>
        <td>${c.status}</td>
      </tr>`).join("");
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Relatório Financeiro</title>
      <style>body{font-family:Georgia,serif;padding:24px;color:#111}h1{font-size:20px;margin:0 0 4px}
      .sub{color:#666;margin-bottom:16px;font-size:12px}table{width:100%;border-collapse:collapse;font-size:12px}
      th,td{border-bottom:1px solid #ddd;padding:6px 8px;text-align:left}th{background:#f5f5f5}
      .kpi{display:flex;gap:16px;margin:16px 0}.kpi div{flex:1;border:1px solid #ddd;padding:8px;border-radius:6px}
      .kpi b{display:block;font-size:16px}</style></head><body>
      <h1>Relatório Financeiro</h1>
      <div class="sub">Gerado em ${new Date().toLocaleString("pt-BR")} — ${lista.length} lançamentos</div>
      <div class="kpi">
        <div><span>Recebido</span><b>${brl(totais.recebido)}</b></div>
        <div><span>Pago</span><b>${brl(totais.pago)}</b></div>
        <div><span>A receber</span><b>${brl(totais.aReceber)}</b></div>
        <div><span>A pagar</span><b>${brl(totais.aPagar)}</b></div>
        <div><span>Saldo</span><b>${brl(totais.saldo)}</b></div>
      </div>
      <table><thead><tr><th>Tipo</th><th>Descrição</th><th>Cliente/Fornecedor</th><th>Vencimento</th><th>Pagamento</th><th>Valor</th><th>Status</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <script>window.print()</script></body></html>`);
    w.document.close();
  }

  return (
    <AppShell
      title="Entradas e Saidas"
      subtitle="Lançamentos de entradas e saídas"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={imprimirRelatorio}><Printer className="mr-2 h-4 w-4" />Relatório</Button>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Novo lançamento</Button></DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle className="font-serif">{editing ? "Editar" : "Novo"} lançamento</DialogTitle></DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const fil = String(fd.get("filial_id") || "");
                  save.mutate({
                    tipo: fd.get("tipo") as "entrada" | "saida",
                    descricao: String(fd.get("descricao")),
                    categoria: String(fd.get("categoria") || "") || null,
                    filial_id: fil && fil !== "matriz" ? fil : null,
                    valor: Number(fd.get("valor")),
                    data_emissao: String(fd.get("data_emissao")),
                    vencimento: String(fd.get("vencimento")),
                    fornecedor_cliente: String(fd.get("fornecedor_cliente") || "") || null,
                    observacoes: String(fd.get("observacoes") || "") || null,
                    status: (fd.get("status") as Conta["status"]) || "pendente",
                  });
                }}
                className="grid gap-4 md:grid-cols-2"
              >
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select name="tipo" defaultValue={editing?.tipo ?? "saida"}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entrada">Entrada (a receber)</SelectItem>
                      <SelectItem value="saida">Saída (a pagar)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select name="status" defaultValue={editing?.status ?? "pendente"}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="pago">Pago</SelectItem>
                      <SelectItem value="cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2"><Label>Descrição</Label><Input name="descricao" required defaultValue={editing?.descricao ?? ""} /></div>
                <div className="space-y-2"><Label>Categoria</Label><Input name="categoria" placeholder="Ex: Energia, Salários" defaultValue={editing?.categoria ?? ""} /></div>
                <div className="space-y-2">
                  <Label>Filial</Label>
                  <Select name="filial_id" defaultValue={editing?.filial_id ?? "matriz"}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="matriz">Matriz</SelectItem>
                      {filiais.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Cliente / Fornecedor</Label><Input name="fornecedor_cliente" defaultValue={editing?.fornecedor_cliente ?? ""} /></div>
                <div className="space-y-2"><Label>Valor (R$)</Label><Input name="valor" type="number" step="0.01" min="0" required defaultValue={editing?.valor ?? ""} /></div>
                <div className="space-y-2"><Label>Emissão</Label><Input name="data_emissao" type="date" required defaultValue={editing?.data_emissao ?? new Date().toISOString().slice(0, 10)} /></div>
                <div className="space-y-2"><Label>Vencimento</Label><Input name="vencimento" type="date" required defaultValue={editing?.vencimento ?? new Date().toISOString().slice(0, 10)} /></div>
                <div className="space-y-2 md:col-span-2"><Label>Observações</Label><Textarea name="observacoes" rows={2} defaultValue={editing?.observacoes ?? ""} /></div>
                <DialogFooter className="md:col-span-2"><Button type="submit" disabled={save.isPending}>{save.isPending ? "Salvando..." : "Salvar"}</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      }
    >
      <div className="mb-6 grid gap-3 md:grid-cols-5">
        <KPI label="Recebido" value={brl(totais.recebido)} tone="success" />
        <KPI label="A receber" value={brl(totais.aReceber)} tone="gold" />
        <KPI label="Pago" value={brl(totais.pago)} tone="muted" />
        <KPI label="A pagar" value={brl(totais.aPagar)} tone="destructive" />
        <KPI label="Saldo (recebido - pago)" value={brl(totais.saldo)} tone={totais.saldo >= 0 ? "success" : "destructive"} />
      </div>

      <Card className="border-border/60 shadow-soft">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle className="font-serif">Lançamentos</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Tabs value={tipo} onValueChange={(v) => setTipo(v as any)}>
              <TabsList>
                <TabsTrigger value="todos">Todos</TabsTrigger>
                <TabsTrigger value="entrada">Entradas</TabsTrigger>
                <TabsTrigger value="saida">Saídas</TabsTrigger>
              </TabsList>
            </Tabs>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="pendente">Pendentes</SelectItem>
                <SelectItem value="pago">Pagos</SelectItem>
                <SelectItem value="cancelado">Cancelados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Descrição</TableHead>
                
                <TableHead>Vencimento</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={7} className="p-3"><SkeletonTable rows={5} cols={7} /></TableCell></TableRow>
              )}
              {!isLoading && isError && (
                <TableRow><TableCell colSpan={7} className="p-3"><ErrorState onRetry={() => refetch()} /></TableCell></TableRow>
              )}
              {!isLoading && !isError && lista.length === 0 && (
                <TableRow><TableCell colSpan={7} className="p-3"><EmptyState title="Nenhum lançamento" message="Cadastre uma nova entrada ou saída." icon={<Receipt className="h-8 w-8" />} /></TableCell></TableRow>
              )}
              {lista.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    {c.tipo === "entrada"
                      ? <span className="inline-flex items-center gap-1 text-success"><ArrowUpCircle className="h-4 w-4" />Entrada</span>
                      : <span className="inline-flex items-center gap-1 text-destructive"><ArrowDownCircle className="h-4 w-4" />Saída</span>}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{c.descricao}</div>
                    <div className="text-xs text-muted-foreground">{c.fornecedor_cliente || c.categoria || "—"}</div>
                  </TableCell>
                  
                  <TableCell>{fmtDate(c.vencimento)}</TableCell>
                  <TableCell className="font-medium">{brl(c.valor)}</TableCell>
                  <TableCell><StatusBadge status={c.status} /></TableCell>
                  <TableCell className="text-right">
                    {c.status !== "pago" && c.status !== "cancelado" && (
                      <Button size="sm" variant="outline" onClick={() => setPayOpen(c)}><CheckCircle2 className="mr-1 h-4 w-4" />Baixa</Button>
                    )}
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(c); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => { if (confirm("Excluir lançamento?")) del.mutate(c.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {payOpen && (
        <Dialog open onOpenChange={(v) => !v && setPayOpen(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-serif">Dar baixa</DialogTitle></DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                pay.mutate({
                  id: payOpen.id,
                  data_pagamento: String(fd.get("data_pagamento")),
                  forma_pagamento: String(fd.get("forma_pagamento")),
                });
              }}
              className="space-y-4"
            >
              <div className="rounded-md bg-muted p-3 text-sm">
                <p><strong>{payOpen.descricao}</strong></p>
                <p className="text-muted-foreground">Valor: <strong className="text-foreground">{brl(payOpen.valor)}</strong> — Vencimento: {fmtDate(payOpen.vencimento)}</p>
              </div>
              <div className="space-y-2"><Label>Data</Label><Input name="data_pagamento" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></div>
              <div className="space-y-2"><Label>Forma de pagamento</Label>
                <Select name="forma_pagamento" defaultValue="pix">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="cartao">Cartão</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter><Button type="submit" disabled={pay.isPending}>{pay.isPending ? "Salvando..." : "Confirmar baixa"}</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </AppShell>
  );
}

function KPI({ label, value, tone }: { label: string; value: string; tone: "success" | "gold" | "destructive" | "muted" }) {
  const tones: Record<string, string> = {
    success: "text-success",
    gold: "text-gold",
    destructive: "text-destructive",
    muted: "text-foreground",
  };
  return (
    <Card className="border-border/60 shadow-soft">
      <CardHeader className="pb-2"><CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</CardTitle></CardHeader>
      <CardContent><div className={`font-serif text-2xl font-semibold ${tones[tone]}`}>{value}</div></CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pago: { label: "Pago", cls: "bg-success/15 text-success border-success/30" },
    pendente: { label: "Pendente", cls: "bg-gold/15 text-gold border-gold/30" },
    atrasado: { label: "Atrasado", cls: "bg-destructive/15 text-destructive border-destructive/30" },
    cancelado: { label: "Cancelado", cls: "bg-muted text-muted-foreground" },
  };
  const v = map[status] ?? { label: status, cls: "" };
  return <Badge variant="outline" className={v.cls}>{v.label}</Badge>;
}
