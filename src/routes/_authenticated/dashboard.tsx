import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Users, AlertTriangle, CircleDollarSign, TrendingUp, Wallet } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/format";

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

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Painel — Memorial" }] }),
  component: Dashboard,
});

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
function daysAgoIso(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function Dashboard() {
  const [inicio, setInicio] = useState<string>(daysAgoIso(30));
  const [fim, setFim] = useState<string>(todayIso());

  const presets = [
    { label: "7 dias", days: 7 },
    { label: "15 dias", days: 15 },
    { label: "30 dias", days: 30 },
    { label: "60 dias", days: 60 },
    { label: "90 dias", days: 90 },
  ];

  const aplicarPreset = (days: number) => {
    setInicio(daysAgoIso(days));
    setFim(todayIso());
  };

  const monthOptions = useMemo(() => buildMonthOptions(12), []);
  const aplicarMes = (value: string) => {
    const [ano, m] = value.split("-").map(Number);
    const ini = `${value}-01`;
    const fimDate = new Date(ano, m, 0); // último dia do mês
    setInicio(ini);
    setFim(fimDate.toISOString().slice(0, 10));
  };


  // fim exclusivo (+1 dia) para incluir o dia final
  const fimExclusivo = useMemo(() => {
    const d = new Date(fim);
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }, [fim]);

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", inicio, fimExclusivo],
    queryFn: async () => {
      const hojeIso = todayIso();

      const [assocAtivos, assocInativos, assocTotal, pagasPer, pendentes, atrasadas, entradasPer] = await Promise.all([
        supabase.from("associados").select("*", { count: "exact", head: true }).eq("status", "ativo"),
        supabase.from("associados").select("*", { count: "exact", head: true }).neq("status", "ativo"),
        supabase.from("associados").select("*", { count: "exact", head: true }),
        supabase.from("mensalidades").select("valor").eq("status", "pago").gte("data_pagamento", inicio).lt("data_pagamento", fimExclusivo),
        supabase.from("mensalidades").select("*", { count: "exact", head: true }).eq("status", "pendente"),
        supabase.from("mensalidades").select("*", { count: "exact", head: true }).in("status", ["pendente", "atrasado"]).lt("vencimento", hojeIso),
        supabase.from("contas_financeiras").select("valor").eq("tipo", "entrada").eq("status", "pago").gte("data_pagamento", inicio).lt("data_pagamento", fimExclusivo),
      ]);

      const receitaPlanos = (pagasPer.data ?? []).reduce((s, r) => s + Number(r.valor), 0);
      const outrasReceitas = (entradasPer.data ?? []).reduce((s, r) => s + Number(r.valor), 0);

      return {
        ativos: assocAtivos.count ?? 0,
        inativos: assocInativos.count ?? 0,
        total: assocTotal.count ?? 0,
        receitaPlanos,
        outrasReceitas,
        totalRecebido: receitaPlanos + outrasReceitas,
        pendentes: pendentes.count ?? 0,
        atrasadas: atrasadas.count ?? 0,
      };
    },
  });

  const cards = [
    { label: "Associados ativos", value: data?.ativos ?? 0, sub: "", icon: Users, tone: "text-primary", linkStatus: "ativo" as const },
    { label: "Associados inativos", value: data?.inativos ?? 0, sub: "Cancelados/suspensos", icon: Users, tone: "text-destructive", linkStatus: "inativos" as const },
    { label: "Receita de planos", value: brl(data?.receitaPlanos ?? 0), sub: "Mensalidades quitadas no período", icon: TrendingUp, tone: "text-success" },
    { label: "Outras receitas", value: brl(data?.outrasReceitas ?? 0), sub: "Entradas financeiras", icon: Wallet, tone: "text-gold" },
    { label: "Total recebido", value: brl(data?.totalRecebido ?? 0), sub: "Planos + outras entradas", icon: CircleDollarSign, tone: "text-primary" },
    { label: "Pendentes", value: data?.pendentes ?? 0, sub: "Aguardando pagamento", icon: CircleDollarSign, tone: "text-gold" },
    { label: "Em atraso", value: data?.atrasadas ?? 0, sub: "Inadimplência ativa", icon: AlertTriangle, tone: "text-destructive" },
  ];

  return (
    <AppShell title="Painel de controle" subtitle="Visão geral do seu plano funerário">
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Início</Label>
          <Input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} className="w-44" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Fim</Label>
          <Input type="date" value={fim} onChange={(e) => setFim(e.target.value)} className="w-44" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Mês</Label>
          <Select onValueChange={aplicarMes}>
            <SelectTrigger className="w-52"><SelectValue placeholder="Selecionar mês" /></SelectTrigger>
            <SelectContent>
              {monthOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <Button key={p.days} type="button" variant="outline" size="sm" onClick={() => aplicarPreset(p.days)}>
              {p.label}
            </Button>
          ))}
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
              {c.linkStatus && (
                <Button asChild size="sm" variant="outline" className="mt-3">
                  <Link to="/associados-lista" search={{ status: c.linkStatus }}>Ver lista</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
