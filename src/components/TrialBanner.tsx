import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, CalendarClock, Copy, CreditCard, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getAssinatura, criarPagamentoAssinatura } from "@/lib/saas-billing.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { brl, fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type Periodo = "mensal" | "semestral" | "anual";
const PERIODOS: { key: Periodo; label: string; meses: number }[] = [
  { key: "mensal", label: "Mensal", meses: 1 },
  { key: "semestral", label: "Semestral", meses: 6 },
  { key: "anual", label: "Anual", meses: 12 },
];

function precoDoPlano(p: any, periodo: Periodo) {
  if (periodo === "anual") return Number(p.preco_anual ?? Number(p.preco_mensal) * 12);
  if (periodo === "semestral") return Number(p.preco_semestral ?? Number(p.preco_mensal) * 6);
  return Number(p.preco_mensal);
}

export function TrialBanner() {
  const fetchAssinatura = useServerFn(getAssinatura);
  const pagar = useServerFn(criarPagamentoAssinatura);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [periodo, setPeriodo] = useState<Periodo>("mensal");
  const [cobranca, setCobranca] = useState<any>(null);

  const { data } = useQuery({
    queryKey: ["saas-assinatura"],
    queryFn: () => fetchAssinatura(),
    staleTime: 60_000,
  });

  const mutation = useMutation({
    mutationFn: (plan_id: string) => pagar({ data: { plan_id, periodo, forma: "boleto_pix" } }),
    onSuccess: (res) => {
      setCobranca(res);
      qc.invalidateQueries({ queryKey: ["saas-assinatura"] });
      toast.success("Cobrança gerada! Pague via PIX ou boleto.");
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao gerar cobrança"),
  });

  if (!data || data.pago) return null;

  const dias = data.diasRestantes ?? 0;
  const expirado = data.expirado;
  const urgente = expirado || dias <= 7;

  return (
    <>
      <Card
        className={cn(
          "mb-4 border-l-4",
          urgente ? "border-l-destructive bg-destructive/5" : "border-l-gold bg-gold/5",
        )}
      >
        <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            {urgente ? (
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            ) : (
              <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
            )}
            <div>
              <p className="text-sm font-semibold">
                {expirado
                  ? "Seu período de teste terminou"
                  : `Período de teste — faltam ${dias} ${dias === 1 ? "dia" : "dias"}`}
              </p>
              <p className="text-xs text-muted-foreground">
                {expirado
                  ? "Escolha um plano e faça o pagamento para continuar usando o sistema."
                  : `Seu acesso gratuito termina em ${fmtDate(data.fim)}. Escolha um plano para continuar sem interrupções.`}
              </p>
            </div>
          </div>
          <Button onClick={() => setOpen(true)} variant={urgente ? "destructive" : "default"} className="shrink-0">
            <CreditCard className="mr-2 h-4 w-4" /> Escolher plano e pagar
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setCobranca(null); }}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Contratar assinatura</DialogTitle>
            <DialogDescription>
              Pagamento por PIX ou boleto via Asaas. O acesso é liberado assim que o pagamento for confirmado.
            </DialogDescription>
          </DialogHeader>

          {cobranca ? (
            <div className="space-y-4">
              <div className="rounded-md border p-4">
                <p className="text-sm">
                  Valor: <span className="font-semibold">{brl(cobranca.valor)}</span> — vencimento {fmtDate(cobranca.vencimento)}
                </p>
              </div>
              {cobranca.qrCodeBase64 && (
                <div className="flex flex-col items-center gap-2">
                  <img src={`data:image/png;base64,${cobranca.qrCodeBase64}`} alt="QR Code PIX" className="h-48 w-48" />
                  <span className="text-xs text-muted-foreground">Escaneie o QR Code no app do seu banco</span>
                </div>
              )}
              {cobranca.pixCopiaCola && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    navigator.clipboard.writeText(cobranca.pixCopiaCola);
                    toast.success("Código PIX copiado");
                  }}
                >
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
                  <Button
                    key={p.key}
                    size="sm"
                    variant={periodo === p.key ? "default" : "outline"}
                    onClick={() => setPeriodo(p.key)}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {data.planos.map((p: any) => (
                  <Card key={p.id} className="flex flex-col">
                    <CardContent className="flex flex-1 flex-col gap-2 p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{p.nome}</span>
                        <Badge variant="secondary">{PERIODOS.find((x) => x.key === periodo)?.label}</Badge>
                      </div>
                      {p.descricao && <p className="text-xs text-muted-foreground">{p.descricao}</p>}
                      <div className="mt-auto pt-2">
                        <div className="text-xl font-bold">{brl(precoDoPlano(p, periodo))}</div>
                        <Button
                          className="mt-3 w-full"
                          disabled={mutation.isPending}
                          onClick={() => mutation.mutate(p.id)}
                        >
                          {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          Gerar cobrança
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {data.planos.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhum plano disponível no momento.</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
