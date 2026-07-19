import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Users, AlertTriangle, CircleDollarSign, TrendingUp, Wallet, Eye } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  const [detalheFilial, setDetalheFilial] = useState<{ id: string; nome: string } | null>(null);

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
      const inicioMesIso = `${hojeIso.slice(0, 7)}-01`;
      const proxMes = (() => {
        const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + 1);
        return d.toISOString().slice(0, 10);
      })();
      const amanhaIso = (() => {
        const d = new Date(); d.setDate(d.getDate() + 1);
        return d.toISOString().slice(0, 10);
      })();

      const [assocAtivos, assocInativos, assocTotal, pagasPer, pendentes, atrasadas, entradasPer, saidasPer, saidasPendentesPer, novosMes, novosHoje, filiaisList] = await Promise.all([
        supabase.from("associados").select("*", { count: "exact", head: true }).eq("status", "ativo"),
        supabase.from("associados").select("*", { count: "exact", head: true }).neq("status", "ativo"),
        supabase.from("associados").select("*", { count: "exact", head: true }),
        supabase.from("mensalidades").select("valor, associados(filial_id)").eq("status", "pago").gte("data_pagamento", inicio).lt("data_pagamento", fimExclusivo),
        supabase.from("mensalidades").select("*", { count: "exact", head: true }).eq("status", "pendente"),
        supabase.from("mensalidades").select("*", { count: "exact", head: true }).in("status", ["pendente", "atrasado"]).lt("vencimento", hojeIso),
        supabase.from("contas_financeiras").select("valor,data_pagamento,vencimento,filial_id").eq("tipo", "entrada").eq("status", "pago"),
        supabase.from("contas_financeiras").select("valor,data_pagamento,vencimento,filial_id").eq("tipo", "saida").eq("status", "pago"),
        supabase.from("contas_financeiras").select("valor,data_pagamento,vencimento").eq("tipo", "saida").eq("status", "pendente"),
        supabase.from("associados").select("*", { count: "exact", head: true }).gte("created_at", inicioMesIso).lt("created_at", proxMes),
        supabase.from("associados").select("*", { count: "exact", head: true }).gte("created_at", hojeIso).lt("created_at", amanhaIso),
        supabase.from("filiais").select("id, nome").order("nome"),
      ]);

      const receitaPlanos = (pagasPer.data ?? []).reduce((s: number, r: any) => s + Number(r.valor), 0);
      const inRange = (r: any) => {
        const d = r.data_pagamento ?? r.vencimento;
        return d && d >= inicio && d < fimExclusivo;
      };
      const outrasReceitas = (entradasPer.data ?? []).filter(inRange).reduce((s: number, r: any) => s + Number(r.valor), 0);
      const totalDespesas = (saidasPer.data ?? []).filter(inRange).reduce((s: number, r: any) => s + Number(r.valor), 0);
      const despesasPendentes = (saidasPendentesPer.data ?? []).filter(inRange).reduce((s: number, r: any) => s + Number(r.valor), 0);

      // Por filial (Matriz não é exibida)
      const filiais = (filiaisList.data as { id: string; nome: string }[]) ?? [];
      const bucket = new Map<string, { id: string; nome: string; receitas: number; despesas: number }>();
      for (const f of filiais) bucket.set(f.id, { id: f.id, nome: f.nome, receitas: 0, despesas: 0 });
      const bump = (key: string | null | undefined, field: "receitas" | "despesas", v: number) => {
        if (!key || key === "matriz") return;
        const b = bucket.get(key);
        if (b) b[field] += v;
      };
      for (const r of (pagasPer.data ?? []) as any[]) bump(r.associados?.filial_id, "receitas", Number(r.valor));
      for (const r of (entradasPer.data ?? []) as any[]) if (inRange(r)) bump(r.filial_id, "receitas", Number(r.valor));
      for (const r of (saidasPer.data ?? []) as any[]) if (inRange(r)) bump(r.filial_id, "despesas", Number(r.valor));
      const porFilial = Array.from(bucket.values()).filter((b) => b.receitas > 0 || b.despesas > 0);

      return {
        ativos: assocAtivos.count ?? 0,
        inativos: assocInativos.count ?? 0,
        total: assocTotal.count ?? 0,
        receitaPlanos,
        outrasReceitas,
        totalDespesas,
        despesasPendentes,
        totalRecebido: receitaPlanos + outrasReceitas,
        pendentes: pendentes.count ?? 0,
        atrasadas: atrasadas.count ?? 0,
        novosMes: novosMes.count ?? 0,
        novosHoje: novosHoje.count ?? 0,
        porFilial,
      };
    },
  });


  const cards = [
    { label: "Associados ativos", value: data?.ativos ?? 0, sub: "", icon: Users, tone: "text-primary", linkStatus: "ativo" as const },
    { label: "Associados inativos", value: data?.inativos ?? 0, sub: "Cancelados/suspensos", icon: Users, tone: "text-destructive", linkStatus: "inativos" as const },
    { label: "Novos planos no mês", value: data?.novosMes ?? 0, sub: "Associados cadastrados no mês", icon: TrendingUp, tone: "text-success" },
    { label: "Novos planos hoje", value: data?.novosHoje ?? 0, sub: "Cadastrados hoje", icon: TrendingUp, tone: "text-success" },
    { label: "Receita de planos", value: brl(data?.receitaPlanos ?? 0), sub: "Mensalidades quitadas no período", icon: TrendingUp, tone: "text-success" },
    { label: "Outras entradas", value: brl(data?.outrasReceitas ?? 0), sub: "Entradas financeiras no período", icon: Wallet, tone: "text-gold" },
    { label: "Total recebido", value: brl(data?.totalRecebido ?? 0), sub: "Planos + outras entradas", icon: CircleDollarSign, tone: "text-primary" },
    { label: "Total de despesas", value: brl(data?.totalDespesas ?? 0), sub: "Saídas pagas no período", icon: AlertTriangle, tone: "text-destructive" },
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

      {(data?.porFilial?.length ?? 0) > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 font-serif text-lg text-foreground">Receitas e despesas por filial</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data!.porFilial.map((f) => (
              <Card key={f.id} className="border-border/60 shadow-soft">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{f.nome}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Receitas</span>
                    <span className="font-serif text-lg font-semibold text-success">{brl(f.receitas)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Despesas</span>
                    <span className="font-serif text-lg font-semibold text-destructive">{brl(f.despesas)}</span>
                  </div>
                  <div className="flex items-center justify-between border-t pt-2">
                    <span className="text-xs text-muted-foreground">Resultado</span>
                    <span className={`font-serif text-lg font-semibold ${f.receitas - f.despesas >= 0 ? "text-primary" : "text-destructive"}`}>
                      {brl(f.receitas - f.despesas)}
                    </span>
                  </div>
                  <Button size="sm" variant="outline" className="w-full mt-2" onClick={() => setDetalheFilial({ id: f.id, nome: f.nome })}>
                    <Eye className="mr-2 h-4 w-4" />Ver detalhes
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <FilialDetalhesDialog
        filial={detalheFilial}
        inicio={inicio}
        fimExclusivo={fimExclusivo}
        onClose={() => setDetalheFilial(null)}
      />
    </AppShell>
  );
}

function FilialDetalhesDialog({
  filial, inicio, fimExclusivo, onClose,
}: {
  filial: { id: string; nome: string } | null;
  inicio: string;
  fimExclusivo: string;
  onClose: () => void;
}) {
  const open = !!filial;
  const { data, isLoading } = useQuery({
    enabled: open,
    queryKey: ["filial-detalhes", filial?.id, inicio, fimExclusivo],
    queryFn: async () => {
      const fid = filial!.id;
      const [mens, entradas, saidas] = await Promise.all([
        supabase
          .from("mensalidades")
          .select("valor, data_pagamento, competencia, associados!inner(nome, filial_id)")
          .eq("status", "pago")
          .gte("data_pagamento", inicio).lt("data_pagamento", fimExclusivo)
          .eq("associados.filial_id", fid),
        supabase
          .from("contas_financeiras")
          .select("descricao, valor, data_pagamento, vencimento")
          .eq("tipo", "entrada").eq("status", "pago").eq("filial_id", fid),
        supabase
          .from("contas_financeiras")
          .select("descricao, valor, data_pagamento, vencimento")
          .eq("tipo", "saida").eq("status", "pago").eq("filial_id", fid),
      ]);
      const inRange = (r: any) => {
        const d = r.data_pagamento ?? r.vencimento;
        return d && d >= inicio && d < fimExclusivo;
      };
      return {
        mens: (mens.data ?? []) as any[],
        entradas: (entradas.data ?? []).filter(inRange) as any[],
        saidas: (saidas.data ?? []).filter(inRange) as any[],
      };
    },
  });

  const receitasPlano = (data?.mens ?? []).reduce((s, r: any) => s + Number(r.valor), 0);
  const outrasReceitas = (data?.entradas ?? []).reduce((s, r: any) => s + Number(r.valor), 0);
  const totalDespesas = (data?.saidas ?? []).reduce((s, r: any) => s + Number(r.valor), 0);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes — {filial?.nome}</DialogTitle>
          <p className="text-xs text-muted-foreground">Período: {inicio} até {fimExclusivo} (exclusivo)</p>
        </DialogHeader>
        {isLoading ? (
          <p className="text-sm text-muted-foreground p-4">Carregando...</p>
        ) : (
          <Tabs defaultValue="receitas">
            <TabsList>
              <TabsTrigger value="receitas">Receitas de planos ({brl(receitasPlano)})</TabsTrigger>
              <TabsTrigger value="entradas">Outras entradas ({brl(outrasReceitas)})</TabsTrigger>
              <TabsTrigger value="saidas">Despesas ({brl(totalDespesas)})</TabsTrigger>
            </TabsList>
            <TabsContent value="receitas">
              <TabelaSimples
                cols={["Associado", "Competência", "Pagamento", "Valor"]}
                rows={(data?.mens ?? []).map((r: any) => [
                  r.associados?.nome ?? "—",
                  r.competencia ?? "—",
                  r.data_pagamento ?? "—",
                  brl(Number(r.valor)),
                ])}
              />
            </TabsContent>
            <TabsContent value="entradas">
              <TabelaSimples
                cols={["Descrição", "Data", "Valor"]}
                rows={(data?.entradas ?? []).map((r: any) => [
                  r.descricao ?? "—",
                  r.data_pagamento ?? r.vencimento ?? "—",
                  brl(Number(r.valor)),
                ])}
              />
            </TabsContent>
            <TabsContent value="saidas">
              <TabelaSimples
                cols={["Descrição", "Data", "Valor"]}
                rows={(data?.saidas ?? []).map((r: any) => [
                  r.descricao ?? "—",
                  r.data_pagamento ?? r.vencimento ?? "—",
                  brl(Number(r.valor)),
                ])}
              />
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

function TabelaSimples({ cols, rows }: { cols: string[]; rows: (string | number)[][] }) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground p-4">Sem lançamentos no período.</p>;
  return (
    <div className="overflow-x-auto mt-2">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">{cols.map((c) => <th key={c} className="text-left p-2 font-medium text-muted-foreground">{c}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b last:border-0">
              {r.map((cell, j) => <td key={j} className="p-2">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
