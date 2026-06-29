import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, CheckCircle2, FileText } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { brl, fmtDate, competenciaLabel } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/financeiro")({
  head: () => ({ meta: [{ title: "Financeiro — Memorial" }] }),
  component: FinanceiroPage,
});

type Mensalidade = {
  id: string; associado_id: string; competencia: string; valor: number;
  vencimento: string; data_pagamento: string | null; forma_pagamento: string | null;
  status: "pendente" | "pago" | "atrasado" | "cancelado"; observacoes: string | null;
  associados?: { nome: string; codigo: number } | null;
};

function FinanceiroPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [openGerar, setOpenGerar] = useState(false);
  const [payOpen, setPayOpen] = useState<Mensalidade | null>(null);

  const { data: lista = [], isLoading } = useQuery({
    queryKey: ["mensalidades", statusFilter],
    queryFn: async () => {
      let q = supabase.from("mensalidades").select("*, associados(nome, codigo)").order("vencimento", { ascending: false });
      if (statusFilter !== "todos") q = q.eq("status", statusFilter as any);
      const { data, error } = await q.limit(200);
      if (error) throw error;
      // atualizar atrasadas em memória (display)
      const hoje = new Date().toISOString().slice(0, 10);
      return (data as Mensalidade[]).map((m) => {
        if (m.status === "pendente" && m.vencimento < hoje) return { ...m, status: "atrasado" as const };
        return m;
      });
    },
  });

  const gerar = useMutation({
    mutationFn: async (range: { inicio: string; fim: string }) => {
      const { data: associados, error } = await supabase
        .from("associados")
        .select("id, dia_vencimento, planos(valor_mensal)")
        .eq("status", "ativo")
        .not("plano_id", "is", null);
      if (error) throw error;
      const start = new Date(range.inicio + "-01T00:00:00");
      const end = new Date(range.fim + "-01T00:00:00");
      if (end < start) throw new Error("Mês final deve ser maior ou igual ao inicial.");
      const competencias: Date[] = [];
      const cursor = new Date(start);
      while (cursor <= end) {
        competencias.push(new Date(cursor));
        cursor.setMonth(cursor.getMonth() + 1);
      }
      const payload = (associados ?? []).flatMap((a: any) =>
        competencias.map((compDate) => {
          const venc = new Date(compDate.getFullYear(), compDate.getMonth(), Math.min(a.dia_vencimento, 28));
          const compStr = `${compDate.getFullYear()}-${String(compDate.getMonth() + 1).padStart(2, "0")}-01`;
          return {
            associado_id: a.id,
            competencia: compStr,
            valor: a.planos?.valor_mensal ?? 0,
            vencimento: venc.toISOString().slice(0, 10),
            status: "pendente" as const,
          };
        }),
      );
      if (payload.length === 0) throw new Error("Nenhum associado ativo com plano para gerar.");
      const { error: e2, count } = await supabase.from("mensalidades").upsert(payload as any, { onConflict: "associado_id,competencia", ignoreDuplicates: true, count: "exact" });
      if (e2) throw e2;
      return { tentadas: payload.length, inseridas: count ?? 0, meses: competencias.length };
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["mensalidades"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setOpenGerar(false);
      toast.success(`Mensalidades geradas`, { description: `${r.inseridas} novas em ${r.meses} mês(es) (${r.tentadas} tentadas).` });
    },
    onError: (e: any) => toast.error("Erro", { description: e.message }),
  });


  const pay = useMutation({
    mutationFn: async (p: { id: string; data_pagamento: string; forma_pagamento: string }) => {
      const { error } = await supabase.from("mensalidades").update({
        status: "pago", data_pagamento: p.data_pagamento, forma_pagamento: p.forma_pagamento,
      }).eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mensalidades"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setPayOpen(null);
      toast.success("Pagamento registrado");
    },
    onError: (e: any) => toast.error("Erro", { description: e.message }),
  });

  const totalRecebido = lista.filter((m) => m.status === "pago").reduce((s, m) => s + Number(m.valor), 0);
  const totalAReceber = lista.filter((m) => m.status !== "pago" && m.status !== "cancelado").reduce((s, m) => s + Number(m.valor), 0);

  const currentMonth = new Date().toISOString().slice(0, 7);

  return (
    <AppShell
      title="Financeiro"
      subtitle="Controle de mensalidades e recebimentos"
      actions={
        <Dialog open={openGerar} onOpenChange={setOpenGerar}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Gerar mensalidades</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-serif">Gerar mensalidades</DialogTitle></DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                gerar.mutate({ inicio: String(fd.get("inicio")), fim: String(fd.get("fim")) });
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Mês inicial</Label>
                  <Input name="inicio" type="month" defaultValue={currentMonth} required />
                </div>
                <div className="space-y-2">
                  <Label>Mês final</Label>
                  <Input name="fim" type="month" defaultValue={currentMonth} required />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Cria uma mensalidade pendente por mês no intervalo selecionado, para cada associado ativo com plano. Lançamentos duplicados são ignorados.</p>
              <DialogFooter><Button type="submit" disabled={gerar.isPending}>{gerar.isPending ? "Gerando..." : "Gerar"}</Button></DialogFooter>
            </form>
          </DialogContent>

        </Dialog>
      }
    >
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <Card className="border-border/60 shadow-soft">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Recebido (filtro atual)</CardTitle></CardHeader>
          <CardContent><div className="font-serif text-3xl font-semibold text-success">{brl(totalRecebido)}</div></CardContent>
        </Card>
        <Card className="border-border/60 shadow-soft">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">A receber (filtro atual)</CardTitle></CardHeader>
          <CardContent><div className="font-serif text-3xl font-semibold text-gold">{brl(totalAReceber)}</div></CardContent>
        </Card>
      </div>

      <Card className="border-border/60 shadow-soft">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-serif">Mensalidades</CardTitle>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              <SelectItem value="pendente">Pendentes</SelectItem>
              <SelectItem value="pago">Pagas</SelectItem>
              <SelectItem value="cancelado">Canceladas</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Associado</TableHead>
                <TableHead>Competência</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Carregando...</TableCell></TableRow>}
              {!isLoading && lista.length === 0 && (
                <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  <FileText className="mx-auto mb-2 h-8 w-8 opacity-40" />
                  Nenhuma mensalidade. Use "Gerar mensalidades" para criar as do mês.
                </TableCell></TableRow>
              )}
              {lista.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <div className="font-medium">{m.associados?.nome ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">#{String(m.associados?.codigo ?? "").padStart(4, "0")}</div>
                  </TableCell>
                  <TableCell className="capitalize">{competenciaLabel(m.competencia)}</TableCell>
                  <TableCell>{fmtDate(m.vencimento)}</TableCell>
                  <TableCell className="font-medium">{brl(m.valor)}</TableCell>
                  <TableCell>{m.data_pagamento ? fmtDate(m.data_pagamento) : "—"}</TableCell>
                  <TableCell><StatusBadge status={m.status} /></TableCell>
                  <TableCell className="text-right">
                    {m.status !== "pago" && m.status !== "cancelado" && (
                      <Button size="sm" variant="outline" onClick={() => setPayOpen(m)}>
                        <CheckCircle2 className="mr-1 h-4 w-4" />Receber
                      </Button>
                    )}
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
            <DialogHeader><DialogTitle className="font-serif">Registrar pagamento</DialogTitle></DialogHeader>
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
                <p><span className="text-muted-foreground">Associado:</span> {payOpen.associados?.nome}</p>
                <p><span className="text-muted-foreground">Competência:</span> <span className="capitalize">{competenciaLabel(payOpen.competencia)}</span></p>
                <p><span className="text-muted-foreground">Valor:</span> <strong>{brl(payOpen.valor)}</strong></p>
              </div>
              <div className="space-y-2"><Label>Data do pagamento</Label><Input name="data_pagamento" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></div>
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
              <DialogFooter><Button type="submit" disabled={pay.isPending}>{pay.isPending ? "Salvando..." : "Confirmar"}</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </AppShell>
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
