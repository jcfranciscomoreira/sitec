import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CalendarClock, Copy, CreditCard, ExternalLink, Loader2, RefreshCw, ShieldAlert } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { brl, fmtDate } from "@/lib/format";
import { usePermissions } from "@/hooks/use-permissions";
import {
  getAssinatura,
  criarPagamentoAssinatura,
  listarFaturasEmpresa,
  sincronizarFaturasEmpresa,
} from "@/lib/saas-billing.functions";

export const Route = createFileRoute("/_authenticated/assinatura")({
  head: () => ({
    meta: [
      { title: "Cobranças da assinatura — Nuvem Planos" },
      { name: "description", content: "Acompanhe as faturas da sua assinatura, gere cobrança por PIX ou boleto e veja o status do pagamento." },
      { property: "og:title", content: "Cobranças da assinatura — Nuvem Planos" },
      { property: "og:description", content: "Faturas pendentes, geração de PIX/boleto e status do pagamento da sua empresa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AssinaturaPage,
});

type Periodo = "mensal" | "semestral" | "anual";
const PERIODOS: { key: Periodo; label: string }[] = [
  { key: "mensal", label: "Mensal" },
  { key: "semestral", label: "Semestral" },
  { key: "anual", label: "Anual" },
];

function precoDoPlano(p: any, periodo: Periodo) {
  if (periodo === "anual") return Number(p.preco_anual ?? Number(p.preco_mensal) * 12);
  if (periodo === "semestral") return Number(p.preco_semestral ?? Number(p.preco_mensal) * 6);
  return Number(p.preco_mensal);
}

function statusBadge(status: string) {
  if (status === "pago") return <Badge className="bg-success/15 text-success border-success/30" variant="outline">Pago</Badge>;
  if (status === "erro") return <Badge variant="destructive">Erro</Badge>;
  return <Badge variant="secondary">Pendente</Badge>;
}

function AssinaturaPage() {
  const { isAdmin, loading: permsLoading } = usePermissions();
  const qc = useQueryClient();
  const fetchAssinatura = useServerFn(getAssinatura);
  const fetchFaturas = useServerFn(listarFaturasEmpresa);
  const sincronizar = useServerFn(sincronizarFaturasEmpresa);
  const pagar = useServerFn(criarPagamentoAssinatura);

  const [open, setOpen] = useState(false);
  const [periodo, setPeriodo] = useState<Periodo>("mensal");
  const [cobranca, setCobranca] = useState<any>(null);

  const { data: assinatura } = useQuery({
    queryKey: ["saas-assinatura"],
    queryFn: () => fetchAssinatura(),
    refetchInterval: 60_000,
  });

  const { data: faturas = [], isLoading } = useQuery({
    queryKey: ["saas-faturas-empresa"],
    queryFn: () => fetchFaturas(),
    refetchInterval: 60_000,
  });

  const sync = useMutation({
    mutationFn: () => sincronizar(),
    onSuccess: (r: any) => {
      qc.invalidateQueries({ queryKey: ["saas-assinatura"] });
      qc.invalidateQueries({ queryKey: ["saas-faturas-empresa"] });
      if (r?.atualizadas > 0) toast.success("Pagamento confirmado! Acesso atualizado.");
    },
  });

  // Atualiza o status junto ao provedor ao abrir a tela (reflete no banner de teste)
  useEffect(() => {
    if (isAdmin) sync.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const gerar = useMutation({
    mutationFn: (plan_id: string) => pagar({ data: { plan_id, periodo, forma: "boleto_pix" } }),
    onSuccess: (res) => {
      setCobranca(res);
      qc.invalidateQueries({ queryKey: ["saas-assinatura"] });
      qc.invalidateQueries({ queryKey: ["saas-faturas-empresa"] });
      toast.success("Cobrança gerada! Pague via PIX ou boleto.");
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao gerar cobrança"),
  });

  if (permsLoading) return <AppShell title="Cobranças" subtitle="Assinatura da sua empresa"><p className="text-muted-foreground">Carregando...</p></AppShell>;

  if (!isAdmin) {
    return (
      <AppShell title="Cobranças" subtitle="Assinatura da sua empresa">
        <Card className="border-border/60">
          <CardContent className="flex items-center gap-3 py-8">
            <ShieldAlert className="h-5 w-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Somente o administrador da empresa pode ver e pagar as faturas da assinatura.
            </p>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  const pendentes = (faturas as any[]).filter((f) => f.status !== "pago" && f.status !== "cancelado");
  const totalPendente = pendentes.reduce((s, f) => s + Number(f.valor), 0);

  return (
    <AppShell
      title="Cobranças"
      subtitle="Faturas da assinatura da sua empresa"
      actions={
        <Button variant="outline" size="sm" onClick={() => sync.mutate()} disabled={sync.isPending}>
          {sync.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Atualizar status
        </Button>
      }
    >
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/60">
          <CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Situação</CardTitle></CardHeader>
          <CardContent>
            <div className="font-serif text-2xl font-semibold">
              {assinatura?.pago ? "Assinatura ativa" : assinatura?.expirado ? "Acesso expirado" : "Período de teste"}
            </div>
            {assinatura?.fim && (
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <CalendarClock className="h-3.5 w-3.5" /> até {fmtDate(assinatura.fim)}
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Faturas pendentes</CardTitle></CardHeader>
          <CardContent><div className="font-serif text-2xl font-semibold">{pendentes.length}</div></CardContent>
        </Card>
        <Card className="border-border/60">
          <CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">Total em aberto</CardTitle></CardHeader>
          <CardContent><div className="font-serif text-2xl font-semibold text-gold">{brl(totalPendente)}</div></CardContent>
        </Card>
      </div>

      <div className="mt-4 flex justify-end">
        <Button
          onClick={() => { setCobranca(null); setOpen(true); }}
          disabled={!assinatura?.documentoConfigurado}
          title={!assinatura?.documentoConfigurado ? "Informe o CPF ou CNPJ nas Configurações da Empresa" : undefined}
        >
          <CreditCard className="mr-2 h-4 w-4" /> Gerar cobrança PIX/boleto
        </Button>
      </div>
      {!assinatura?.documentoConfigurado && (
        <p className="mt-2 text-right text-sm text-destructive">
          Informe um CPF ou CNPJ válido nas Configurações da Empresa para gerar cobranças.
        </p>
      )}

      <Card className="mt-4 border-border/60">
        <CardHeader><CardTitle className="font-serif">Minhas faturas</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plano</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Pagamento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(faturas as any[]).map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">{f.system_plans?.nome ?? "—"}</TableCell>
                  <TableCell className="capitalize">{f.periodo}</TableCell>
                  <TableCell>{brl(Number(f.valor))}</TableCell>
                  <TableCell className="text-xs">{fmtDate(f.vencimento)}</TableCell>
                  <TableCell>{statusBadge(f.status)}</TableCell>
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
                            <ExternalLink className="mr-1 h-3.5 w-3.5" /> Boleto
                          </a>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && (faturas as any[]).length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Nenhuma fatura gerada até o momento.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setCobranca(null); }}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Contratar assinatura</DialogTitle>
            <DialogDescription>
              Pagamento por PIX ou boleto. O acesso é liberado assim que o pagamento for confirmado.
            </DialogDescription>
          </DialogHeader>

          {cobranca ? (
            <div className="space-y-4">
              <div className="rounded-md border p-4 text-sm">
                Valor: <span className="font-semibold">{brl(cobranca.valor)}</span> — vencimento {fmtDate(cobranca.vencimento)}
              </div>
              {cobranca.qrCodeBase64 && (
                <div className="flex flex-col items-center gap-2">
                  <img src={`data:image/png;base64,${cobranca.qrCodeBase64}`} alt="QR Code PIX da fatura" className="h-48 w-48" />
                  <span className="text-xs text-muted-foreground">Escaneie o QR Code no app do seu banco</span>
                </div>
              )}
              {cobranca.pixCopiaCola && (
                <Button variant="outline" className="w-full" onClick={() => { navigator.clipboard.writeText(cobranca.pixCopiaCola); toast.success("Código PIX copiado"); }}>
                  <Copy className="mr-2 h-4 w-4" /> Copiar PIX copia e cola
                </Button>
              )}
              {cobranca.linkBoleto && (
                <Button variant="outline" className="w-full" asChild>
                  <a href={cobranca.linkBoleto} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" /> Abrir boleto
                  </a>
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-2">
                {PERIODOS.map((p) => (
                  <Button key={p.key} size="sm" variant={periodo === p.key ? "default" : "outline"} onClick={() => setPeriodo(p.key)}>
                    {p.label}
                  </Button>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {(assinatura?.planos ?? []).map((p: any) => (
                  <Card key={p.id} className="flex flex-col">
                    <CardContent className="flex flex-1 flex-col gap-2 p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{p.nome}</span>
                        <Badge variant="secondary">{PERIODOS.find((x) => x.key === periodo)?.label}</Badge>
                      </div>
                      {p.descricao && <p className="text-xs text-muted-foreground">{p.descricao}</p>}
                      <div className="mt-auto pt-2">
                        <div className="text-xl font-bold">{brl(precoDoPlano(p, periodo))}</div>
                        <Button className="mt-3 w-full" disabled={gerar.isPending} onClick={() => gerar.mutate(p.id)}>
                          {gerar.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          Gerar cobrança
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {(assinatura?.planos ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhum plano disponível no momento.</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
