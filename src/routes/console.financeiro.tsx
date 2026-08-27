import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ConsoleShell } from "@/components/console/ConsoleShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { brl, fmtDate } from "@/lib/format";
import { DollarSign, Receipt, AlertTriangle, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/console/financeiro")({
  component: ConsoleFinanceiroPage,
});

function ConsoleFinanceiroPage() {
  const { data } = useQuery({
    queryKey: ["console-financeiro"],
    queryFn: async () => {
      const [faturasRes, tenantsRes, plansRes] = await Promise.all([
        supabase
          .from("tenant_faturas")
          .select("id, tenant_id, valor, periodo, status, vencimento, data_pagamento, created_at, tenants(nome), system_plans(nome)")
          .order("created_at", { ascending: false })
          .limit(100),
        supabase.from("tenants").select("id, plan_id, plan_status"),
        supabase.from("system_plans").select("id, preco_mensal"),
      ]);

      const faturas = (faturasRes.data ?? []) as any[];
      const precos = new Map((plansRes.data ?? []).map((p: any) => [p.id, Number(p.preco_mensal)]));
      const mrr = (tenantsRes.data ?? []).reduce(
        (acc: number, t: any) => (t.plan_status === "active" && t.plan_id ? acc + (precos.get(t.plan_id) ?? 0) : acc),
        0,
      );

      const pagas = faturas.filter((f) => f.status === "pago");
      const pendentes = faturas.filter((f) => f.status === "pendente");
      const vencidas = pendentes.filter((f) => new Date(f.vencimento) < new Date());

      return {
        faturas,
        mrr,
        recebido: pagas.reduce((a, f) => a + Number(f.valor), 0),
        aReceber: pendentes.reduce((a, f) => a + Number(f.valor), 0),
        vencidas: vencidas.length,
      };
    },
  });

  const kpis = [
    { label: "MRR (recorrente)", value: brl(data?.mrr ?? 0), icon: TrendingUp },
    { label: "Recebido (faturas pagas)", value: brl(data?.recebido ?? 0), icon: DollarSign },
    { label: "A receber", value: brl(data?.aReceber ?? 0), icon: Receipt },
    { label: "Faturas vencidas", value: String(data?.vencidas ?? 0), icon: AlertTriangle },
  ];

  return (
    <ConsoleShell title="Financeiro do SaaS" subtitle="Assinaturas, faturas e receita da plataforma">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{k.label}</CardTitle>
              <k.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{k.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader><CardTitle>Faturas das empresas</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.faturas ?? []).map((f: any) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">{f.tenants?.nome ?? "—"}</TableCell>
                  <TableCell>{f.system_plans?.nome ?? "—"}</TableCell>
                  <TableCell className="capitalize">{f.periodo}</TableCell>
                  <TableCell>{brl(Number(f.valor))}</TableCell>
                  <TableCell className="text-xs">{fmtDate(f.vencimento)}</TableCell>
                  <TableCell>
                    <Badge variant={f.status === "pago" ? "default" : f.status === "erro" ? "destructive" : "secondary"}>
                      {f.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {(data?.faturas ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Nenhuma fatura registrada até o momento.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </ConsoleShell>
  );
}
