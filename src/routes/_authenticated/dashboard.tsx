import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Users, AlertTriangle, CircleDollarSign, TrendingUp, Wallet } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { brl, fmtDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Painel — Memorial" }] }),
  component: Dashboard,
});

function buildMonthOptions(count = 12) {
  const opts: { value: string; label: string }[] = [];
  const ref = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(ref.getFullYear(), ref.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    opts.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
  }
  return opts;
}

function Dashboard() {
  const monthOptions = useMemo(() => buildMonthOptions(12), []);
  const [mes, setMes] = useState<string>(monthOptions[0].value);

  const inicioMes = `${mes}-01`;
  const [ano, m] = mes.split("-").map(Number);
  const proxMes = new Date(ano, m, 1).toISOString().slice(0, 10);

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", mes],
    queryFn: async () => {
      const hojeIso = new Date().toISOString().slice(0, 10);

      const [assocAtivos, assocTotal, pagasMes, pendentes, atrasadas, ultimas, entradasMes] = await Promise.all([
        supabase.from("associados").select("*", { count: "exact", head: true }).eq("status", "ativo"),
        supabase.from("associados").select("*", { count: "exact", head: true }),
        supabase.from("mensalidades").select("valor").eq("status", "pago").gte("data_pagamento", inicioMes).lt("data_pagamento", proxMes),
        supabase.from("mensalidades").select("*", { count: "exact", head: true }).eq("status", "pendente"),
        supabase.from("mensalidades").select("*", { count: "exact", head: true }).in("status", ["pendente", "atrasado"]).lt("vencimento", hojeIso),
        supabase.from("mensalidades").select("id, valor, vencimento, status, associados(nome)").gte("vencimento", inicioMes).lt("vencimento", proxMes).order("vencimento", { ascending: false }).limit(10),
        supabase.from("contas_financeiras").select("valor").eq("tipo", "entrada").eq("status", "pago").gte("data_pagamento", inicioMes).lt("data_pagamento", proxMes),
      ]);

      const receitaPlanos = (pagasMes.data ?? []).reduce((s, r) => s + Number(r.valor), 0);
      const outrasReceitas = (entradasMes.data ?? []).reduce((s, r) => s + Number(r.valor), 0);

      return {
        ativos: assocAtivos.count ?? 0,
        total: assocTotal.count ?? 0,
        receitaPlanos,
        outrasReceitas,
        totalRecebido: receitaPlanos + outrasReceitas,
        pendentes: pendentes.count ?? 0,
        atrasadas: atrasadas.count ?? 0,
        ultimas: ultimas.data ?? [],
      };
    },
  });

  const cards = [
    { label: "Associados ativos", value: data?.ativos ?? 0, sub: `${data?.total ?? 0} no total`, icon: Users, tone: "text-primary" },
    { label: "Receita de planos", value: brl(data?.receitaPlanos ?? 0), sub: "Mensalidades quitadas no mês", icon: TrendingUp, tone: "text-success" },
    { label: "Outras receitas", value: brl(data?.outrasReceitas ?? 0), sub: "Entradas financeiras", icon: Wallet, tone: "text-gold" },
    { label: "Total recebido", value: brl(data?.totalRecebido ?? 0), sub: "Planos + outras entradas", icon: CircleDollarSign, tone: "text-primary" },
    { label: "Pendentes", value: data?.pendentes ?? 0, sub: "Aguardando pagamento", icon: CircleDollarSign, tone: "text-gold" },
    { label: "Em atraso", value: data?.atrasadas ?? 0, sub: "Inadimplência ativa", icon: AlertTriangle, tone: "text-destructive" },
  ];

  return (
    <AppShell title="Painel de controle" subtitle="Visão geral do seu plano funerário">
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Mês de referência</Label>
          <Select value={mes} onValueChange={setMes}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              {monthOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.label} className="border-border/60 shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
              <c.icon className={`h-5 w-5 ${c.tone}`} />
            </CardHeader>
            <CardContent>
              <div className="font-serif text-3xl font-semibold text-foreground">
                {isLoading ? "—" : c.value}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{c.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6 border-border/60 shadow-soft">
        <CardHeader>
          <CardTitle className="font-serif">Mensalidades do mês</CardTitle>
        </CardHeader>
        <CardContent>
          {(!data?.ultimas || data.ultimas.length === 0) ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhum lançamento no período.</p>
          ) : (
            <div className="divide-y divide-border">
              {data.ultimas.map((m: any) => (
                <div key={m.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-foreground">{m.associados?.nome ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">Vence em {fmtDate(m.vencimento)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{brl(m.valor)}</span>
                    <StatusBadge status={m.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
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
