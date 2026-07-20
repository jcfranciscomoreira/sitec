import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { TrendingUp, TrendingDown, Wallet, AlertTriangle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { brl, fmtDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/empresa-financeiro")({
  head: () => ({ meta: [{ title: "Painel Financeiro — Memorial" }] }),
  component: PainelFinanceiroPage,
});

type Row = {
  id: string; tipo: "entrada" | "saida"; descricao: string; valor: number;
  vencimento: string; data_pagamento: string | null; status: string;
};

function PainelFinanceiroPage() {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["empresa-financeiro"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contas_financeiras")
        .select("id, tipo, descricao, valor, vencimento, data_pagamento, status")
        .order("vencimento", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data as Row[];
    },
  });

  const { data: planosRev = [] } = useQuery({
    queryKey: ["receitas-por-plano"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mensalidades")
        .select("valor, status, data_pagamento, competencia, associados(planos(nome))")
        .eq("status", "pago");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const stats = useMemo(() => {
    const hoje = new Date().toISOString().slice(0, 10);
    const mes = hoje.slice(0, 7);
    const inMes = (d: string) => d.slice(0, 7) === mes;
    const entradas = rows.filter((r) => r.tipo === "entrada");
    const saidas = rows.filter((r) => r.tipo === "saida");
    const recebidoMes = entradas.filter((r) => r.status === "pago" && r.data_pagamento && inMes(r.data_pagamento)).reduce((s, r) => s + Number(r.valor), 0);
    const pagoMes = saidas.filter((r) => r.status === "pago" && r.data_pagamento && inMes(r.data_pagamento)).reduce((s, r) => s + Number(r.valor), 0);
    const aReceber = entradas.filter((r) => r.status !== "pago" && r.status !== "cancelado").reduce((s, r) => s + Number(r.valor), 0);
    const aPagar = saidas.filter((r) => r.status !== "pago" && r.status !== "cancelado").reduce((s, r) => s + Number(r.valor), 0);
    const atrasadas = rows.filter((r) => r.status !== "pago" && r.status !== "cancelado" && r.vencimento < hoje);


    // série últimos 6 meses
    const serie: { mes: string; entradas: number; saidas: number }[] = [];
    const ref = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(ref.getFullYear(), ref.getMonth() - i, 1);
      const key = d.toISOString().slice(0, 7);
      const label = d.toLocaleDateString("pt-BR", { month: "short" });
      const e = entradas.filter((r) => r.status === "pago" && r.data_pagamento?.slice(0, 7) === key).reduce((s, r) => s + Number(r.valor), 0);
      const sa = saidas.filter((r) => r.status === "pago" && r.data_pagamento?.slice(0, 7) === key).reduce((s, r) => s + Number(r.valor), 0);
      serie.push({ mes: label, entradas: e, saidas: sa });
    }
    const maxSerie = Math.max(1, ...serie.flatMap((s) => [s.entradas, s.saidas]));

    return { recebidoMes, pagoMes, aReceber, aPagar, atrasadas, serie, maxSerie, saldoMes: recebidoMes - pagoMes };
  }, [rows]);

  const planoStats = useMemo(() => {
    const hoje = new Date().toISOString().slice(0, 10);
    const mes = hoje.slice(0, 7);
    const porPlano = new Map<string, { totalGeral: number; totalMes: number; qtdMes: number }>();
    let totalMesGeral = 0;
    for (const m of planosRev) {
      const nome = m.associados?.planos?.nome ?? "Sem plano";
      const v = Number(m.valor);
      const cur = porPlano.get(nome) ?? { totalGeral: 0, totalMes: 0, qtdMes: 0 };
      cur.totalGeral += v;
      if (m.data_pagamento && m.data_pagamento.slice(0, 7) === mes) {
        cur.totalMes += v;
        cur.qtdMes += 1;
        totalMesGeral += v;
      }
      porPlano.set(nome, cur);
    }
    const lista = Array.from(porPlano.entries())
      .map(([nome, v]) => ({ nome, ...v }))
      .sort((a, b) => b.totalMes - a.totalMes);
    const maxMes = Math.max(1, ...lista.map((l) => l.totalMes));
    return { lista, maxMes, totalMesGeral };
  }, [planosRev]);


  return (
    <AppShell title="Painel Financeiro" subtitle="Resultados consolidados da empresa">
      {isLoading && <p className="text-muted-foreground">Carregando...</p>}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPI label="Recebido no mês" value={brl(stats.recebidoMes + planoStats.totalMesGeral)} icon={<TrendingUp className="h-5 w-5 text-success" />} tone="success" />
        <KPI label="Pago no mês" value={brl(stats.pagoMes)} icon={<TrendingDown className="h-5 w-5 text-destructive" />} tone="destructive" />
        <KPI label="Saldo do mês" value={brl(stats.recebidoMes + planoStats.totalMesGeral - stats.pagoMes)} icon={<Wallet className="h-5 w-5 text-gold" />} tone={(stats.recebidoMes + planoStats.totalMesGeral - stats.pagoMes) >= 0 ? "success" : "destructive"} />
        <KPI label="Vencidas em aberto" value={String(stats.atrasadas.length)} icon={<AlertTriangle className="h-5 w-5 text-destructive" />} tone="destructive" />
      </div>

      <Card className="mt-6 border-border/60 shadow-soft">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-serif">Receitas por plano (mensalidades pagas)</CardTitle>
          <div className="text-sm text-muted-foreground">
            Total do mês: <span className="font-semibold text-success">{brl(planoStats.totalMesGeral)}</span>
          </div>
        </CardHeader>
        <CardContent>
          {planoStats.lista.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma mensalidade paga ainda.</p>}
          <div className="space-y-3">
            {planoStats.lista.map((p) => (
              <div key={p.nome}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium">{p.nome}</span>
                  <span className="text-muted-foreground">
                    <span className="mr-3">{p.qtdMes} pgto(s) no mês</span>
                    <span className="font-semibold text-success">{brl(p.totalMes)}</span>
                    <span className="ml-3 text-xs">acum: {brl(p.totalGeral)}</span>
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded bg-muted">
                  <div className="h-full bg-success" style={{ width: `${(p.totalMes / planoStats.maxMes) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>


      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card className="border-border/60 shadow-soft">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total a receber</CardTitle></CardHeader>
          <CardContent><div className="font-serif text-3xl font-semibold text-gold">{brl(stats.aReceber)}</div></CardContent>
        </Card>
        <Card className="border-border/60 shadow-soft">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total a pagar</CardTitle></CardHeader>
          <CardContent><div className="font-serif text-3xl font-semibold text-destructive">{brl(stats.aPagar)}</div></CardContent>
        </Card>
      </div>

      <Card className="mt-6 border-border/60 shadow-soft">
        <CardHeader><CardTitle className="font-serif">Fluxo dos últimos 6 meses</CardTitle></CardHeader>
        <CardContent>
          <div className="flex h-56 items-end gap-3">
            {stats.serie.map((s) => (
              <div key={s.mes} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex h-full w-full items-end justify-center gap-1">
                  <div className="w-1/2 rounded-t bg-success/70" style={{ height: `${(s.entradas / stats.maxSerie) * 100}%` }} title={`Entradas: ${brl(s.entradas)}`} />
                  <div className="w-1/2 rounded-t bg-destructive/70" style={{ height: `${(s.saidas / stats.maxSerie) * 100}%` }} title={`Saídas: ${brl(s.saidas)}`} />
                </div>
                <span className="text-xs capitalize text-muted-foreground">{s.mes.replace(".", "")}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded bg-success/70" />Entradas</span>
            <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded bg-destructive/70" />Saídas</span>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-4">


        <Card className="border-border/60 shadow-soft">
          <CardHeader><CardTitle className="font-serif">Vencidas em aberto</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Descrição</TableHead><TableHead>Vencimento</TableHead><TableHead>Tipo</TableHead><TableHead className="text-right">Valor</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {stats.atrasadas.slice(0, 8).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.descricao}</TableCell>
                    <TableCell>{fmtDate(r.vencimento)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={r.tipo === "entrada" ? "bg-success/15 text-success border-success/30" : "bg-destructive/15 text-destructive border-destructive/30"}>
                        {r.tipo === "entrada" ? "Entrada" : "Saída"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">{brl(r.valor)}</TableCell>
                  </TableRow>
                ))}
                {stats.atrasadas.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="py-6 text-center text-sm text-muted-foreground">Sem pendências vencidas.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function KPI({ label, value, icon, tone }: { label: string; value: string; icon: React.ReactNode; tone: "success" | "destructive" | "gold" }) {
  const tones = { success: "text-success", destructive: "text-destructive", gold: "text-gold" };
  return (
    <Card className="border-border/60 shadow-soft">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent><div className={`font-serif text-2xl font-semibold ${tones[tone]}`}>{value}</div></CardContent>
    </Card>
  );
}
