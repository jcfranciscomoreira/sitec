import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Copy, DollarSign, ExternalLink, Receipt } from "lucide-react";
import { toast } from "sonner";
import { ConsoleShell } from "@/components/console/ConsoleShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { brl, fmtDate } from "@/lib/format";

export const Route = createFileRoute("/console/cobrancas")({
  component: ConsoleCobrancasPage,
});

function ConsoleCobrancasPage() {
  const [busca, setBusca] = useState("");
  const [somentePendentes, setSomentePendentes] = useState(true);

  const { data: faturas = [], isLoading } = useQuery({
    queryKey: ["console-cobrancas"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_faturas")
        .select("id, tenant_id, valor, periodo, status, cobranca_status, vencimento, data_pagamento, link_boleto, pix_copia_cola, linha_digitavel, created_at, tenants(nome, email), system_plans(nome)")
        .order("vencimento", { ascending: true })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return (faturas as any[]).filter((f) => {
      if (somentePendentes && (f.status === "pago" || f.status === "cancelado")) return false;
      if (!q) return true;
      return (f.tenants?.nome ?? "").toLowerCase().includes(q) || (f.system_plans?.nome ?? "").toLowerCase().includes(q);
    });
  }, [faturas, busca, somentePendentes]);

  const hoje = new Date().toISOString().slice(0, 10);
  const pendentes = (faturas as any[]).filter((f) => f.status !== "pago" && f.status !== "cancelado");
  const vencidas = pendentes.filter((f) => f.vencimento < hoje);
  const totalPendente = pendentes.reduce((s, f) => s + Number(f.valor), 0);

  return (
    <ConsoleShell title="Cobranças" subtitle="Todas as cobranças das empresas em um só lugar">
      <div className="grid gap-4 md:grid-cols-3">
        <KPI label="Cobranças pendentes" value={String(pendentes.length)} icon={Receipt} />
        <KPI label="Total em aberto" value={brl(totalPendente)} icon={DollarSign} />
        <KPI label="Vencidas" value={String(vencidas.length)} icon={AlertTriangle} />
      </div>

      <Card className="mt-6">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>{somentePendentes ? "Cobranças pendentes" : "Todas as cobranças"}</CardTitle>
          <div className="flex gap-2">
            <Input
              placeholder="Buscar empresa ou plano..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="h-9 w-56"
            />
            <Button variant="outline" size="sm" onClick={() => setSomentePendentes((v) => !v)}>
              {somentePendentes ? "Ver todas" : "Só pendentes"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Pagamento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.map((f) => {
                const vencida = f.status !== "pago" && f.status !== "cancelado" && f.vencimento < hoje;
                return (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">
                      {f.tenants?.nome ?? "—"}
                      {f.tenants?.email && <div className="text-xs text-muted-foreground">{f.tenants.email}</div>}
                    </TableCell>
                    <TableCell>{f.system_plans?.nome ?? "—"}</TableCell>
                    <TableCell className="capitalize">{f.periodo}</TableCell>
                    <TableCell>{brl(Number(f.valor))}</TableCell>
                    <TableCell className={`text-xs ${vencida ? "font-semibold text-destructive" : ""}`}>{fmtDate(f.vencimento)}</TableCell>
                    <TableCell>
                      <Badge variant={f.status === "pago" ? "default" : f.status === "erro" ? "destructive" : vencida ? "destructive" : "secondary"}>
                        {f.status === "pago" ? "Pago" : vencida ? "Vencida" : f.status}
                      </Badge>
                      {f.cobranca_status && <div className="text-[11px] text-muted-foreground">{f.cobranca_status}</div>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {f.pix_copia_cola && f.status !== "pago" && (
                          <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(f.pix_copia_cola); toast.success("Código PIX copiado"); }}>
                            <Copy className="mr-1 h-3.5 w-3.5" /> PIX
                          </Button>
                        )}
                        {f.link_boleto && (
                          <Button size="sm" variant="outline" asChild>
                            <a href={f.link_boleto} target="_blank" rel="noreferrer">
                              <ExternalLink className="mr-1 h-3.5 w-3.5" /> Link
                            </a>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!isLoading && lista.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    Nenhuma cobrança encontrada.
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

function KPI({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent><div className="text-2xl font-bold">{value}</div></CardContent>
    </Card>
  );
}
