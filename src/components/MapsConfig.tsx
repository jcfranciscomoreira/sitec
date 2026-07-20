import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, MapPin, ExternalLink } from "lucide-react";
import { toast } from "sonner";

type Status = "idle" | "testing" | "ok" | "fail";

export function MapsConfig() {
  const browserKey = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined;
  const trackingId = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID as string | undefined;
  const hasBrowserKey = Boolean(browserKey);
  const hasTracking = Boolean(trackingId);

  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showTest, setShowTest] = useState(false);

  useEffect(() => {
    if (!showTest || !hasBrowserKey) return;
    setStatus("testing");
    setErrorMsg(null);

    (window as any).initMapsConfigTest = () => {
      try {
        const el = document.getElementById("maps-config-test-map");
        if (!el || !(window as any).google?.maps) throw new Error("Google Maps não inicializou");
        new (window as any).google.maps.Map(el, {
          center: { lat: -15.78, lng: -47.93 },
          zoom: 4,
          disableDefaultUI: true,
        });
        setStatus("ok");
      } catch (e: any) {
        setStatus("fail");
        setErrorMsg(e?.message ?? "Erro desconhecido ao inicializar o mapa");
      }
    };

    const existing = document.getElementById("maps-config-test-script");
    if (existing) existing.remove();

    const s = document.createElement("script");
    s.id = "maps-config-test-script";
    s.async = true;
    s.src = `https://maps.googleapis.com/maps/api/js?key=${browserKey}&loading=async&callback=initMapsConfigTest${
      trackingId ? `&channel=${trackingId}` : ""
    }`;
    s.onerror = () => { setStatus("fail"); setErrorMsg("Falha ao carregar o script do Google Maps"); };
    document.body.appendChild(s);

    (window as any).gm_authFailure = () => {
      setStatus("fail");
      setErrorMsg("Autorização negada: verifique restrições de referrer/domínio da chave.");
    };

    return () => {
      delete (window as any).initMapsConfigTest;
    };
  }, [showTest, hasBrowserKey, browserKey, trackingId]);

  function copyDomain() {
    const url = window.location.origin;
    navigator.clipboard.writeText(url).then(() => toast.success("Domínio copiado"));
  }

  return (
    <div className="space-y-4">
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" /> Conexão do Google Maps
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 text-sm">
          <div className="rounded-md border p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium">Chave do navegador</div>
                <div className="text-xs text-muted-foreground">Necessária para carregar o mapa (Maps JS API).</div>
              </div>
              <StatusBadge ok={hasBrowserKey} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium">ID de rastreamento</div>
                <div className="text-xs text-muted-foreground">Opcional. Usado para atribuição de uso.</div>
              </div>
              <StatusBadge ok={hasTracking} optional />
            </div>
          </div>

          <div className="rounded-md border p-4 space-y-2">
            <div className="font-medium">Domínio atual</div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <code className="rounded bg-muted px-2 py-1 text-xs break-all">{typeof window !== "undefined" ? window.location.origin : ""}</code>
              <Button variant="outline" size="sm" onClick={copyDomain} className="w-full sm:w-auto">Copiar</Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Se você usa domínio próprio, adicione-o ao allowlist de referrers da sua chave no Google Cloud
              (ex.: <code>https://seudominio.com/*</code> e <code>https://*.seudominio.com/*</code>).
            </p>
          </div>

          <div className="rounded-md border p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <div className="font-medium">Testar conexão</div>
                <div className="text-xs text-muted-foreground">Carrega o Google Maps com a chave configurada.</div>
              </div>
              <Button
                onClick={() => setShowTest(true)}
                disabled={!hasBrowserKey || status === "testing"}
                className="w-full sm:w-auto"
              >
                {status === "testing" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {status === "ok" ? "Testar novamente" : "Testar agora"}
              </Button>
            </div>

            {showTest && (
              <>
                <div
                  id="maps-config-test-map"
                  className="h-52 w-full rounded-md border bg-muted"
                />
                {status === "ok" && (
                  <div className="flex items-center gap-2 text-green-600 text-sm">
                    <CheckCircle2 className="h-4 w-4" /> Mapa carregado com sucesso.
                  </div>
                )}
                {status === "fail" && (
                  <div className="flex items-start gap-2 text-destructive text-sm">
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{errorMsg ?? "Não foi possível carregar o mapa."}</span>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="rounded-md border p-4 space-y-3">
            <div className="font-medium">Integrar minha conta do Google Maps</div>
            <p className="text-xs text-muted-foreground">
              Use sua própria chave do Google Cloud (recomendado para domínio próprio, faturamento e limites dedicados).
              Peça no chat da Lovable: <em>"conectar Google Maps com minha conta"</em> — o assistente abrirá o fluxo seguro
              de conexão e vinculará sua chave ao projeto sem expô-la no código.
            </p>
            <ol className="list-decimal pl-5 text-xs text-muted-foreground space-y-1">
              <li>Crie/selecione um projeto no Google Cloud e ative <strong>billing</strong>.</li>
              <li>Ative as APIs: Maps JavaScript, Places (New), Geocoding e as demais que usar.</li>
              <li>Gere uma chave em <em>APIs & Services → Credentials</em>.</li>
              <li>Restrinja por <strong>HTTP referrers</strong> incluindo <code>https://seudominio.com/*</code> e <code>https://*.seudominio.com/*</code>.</li>
              <li>Volte aqui e peça no chat para conectar — cole a chave no formulário seguro.</li>
            </ol>
            <div className="flex flex-wrap gap-2 pt-1">
              <a
                href="https://console.cloud.google.com/google/maps-apis/credentials"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary underline"
              >
                Google Cloud Credentials <ExternalLink className="h-3 w-3" />
              </a>
              <a
                href="https://console.cloud.google.com/google/maps-apis/api-list"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary underline"
              >
                Ativar APIs do Maps <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ ok, optional }: { ok: boolean; optional?: boolean }) {
  if (ok) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 text-green-600 px-2 py-1 text-xs">
        <CheckCircle2 className="h-3 w-3" /> Configurado
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs ${optional ? "bg-muted text-muted-foreground" : "bg-destructive/10 text-destructive"}`}>
      <XCircle className="h-3 w-3" /> {optional ? "Não definido" : "Ausente"}
    </span>
  );
}
