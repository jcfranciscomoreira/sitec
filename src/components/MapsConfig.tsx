import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, Loader2, MapPin, ExternalLink, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { reloadConfiguracoes } from "@/hooks/use-configuracoes";

type Status = "idle" | "testing" | "ok" | "fail";

export function MapsConfig() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [browserKey, setBrowserKey] = useState("");
  const [trackingId, setTrackingId] = useState("");
  const [showKey, setShowKey] = useState(false);

  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showTest, setShowTest] = useState(false);
  const [testKey, setTestKey] = useState<string | null>(null);

  const envBrowserKey = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined;
  const envTracking = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID as string | undefined;

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("configuracoes")
        .select("google_maps_browser_key, google_maps_tracking_id")
        .eq("id", 1)
        .maybeSingle();
      if (error) toast.error(error.message);
      if (data) {
        setBrowserKey((data as any).google_maps_browser_key ?? "");
        setTrackingId((data as any).google_maps_tracking_id ?? "");
      }
      setLoading(false);
    })();
  }, []);

  const activeKey = browserKey.trim() || envBrowserKey || "";
  const activeTracking = trackingId.trim() || envTracking || "";
  const usingCustom = Boolean(browserKey.trim());

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("configuracoes")
      .update({
        google_maps_browser_key: browserKey.trim() || null,
        google_maps_tracking_id: trackingId.trim() || null,
      } as any)
      .eq("id", 1);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    await reloadConfiguracoes();
    toast.success("Chave do Google Maps salva");
    setShowTest(false);
    setStatus("idle");
  }

  async function clearKey() {
    setBrowserKey("");
    setTrackingId("");
    setSaving(true);
    const { error } = await supabase
      .from("configuracoes")
      .update({ google_maps_browser_key: null, google_maps_tracking_id: null } as any)
      .eq("id", 1);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    await reloadConfiguracoes();
    toast.success("Chave removida. Usando integração padrão.");
  }

  useEffect(() => {
    if (!showTest || !testKey) return;
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
    // Force fresh load so a newly pasted key is honored
    delete (window as any).google;

    const s = document.createElement("script");
    s.id = "maps-config-test-script";
    s.async = true;
    s.src = `https://maps.googleapis.com/maps/api/js?key=${testKey}&loading=async&callback=initMapsConfigTest${
      activeTracking ? `&channel=${activeTracking}` : ""
    }`;
    s.onerror = () => { setStatus("fail"); setErrorMsg("Falha ao carregar o script do Google Maps"); };
    document.body.appendChild(s);

    (window as any).gm_authFailure = () => {
      setStatus("fail");
      setErrorMsg("Autorização negada: verifique restrições de referrer/domínio da chave.");
    };

    return () => { delete (window as any).initMapsConfigTest; };
  }, [showTest, testKey, activeTracking]);

  function copyDomain() {
    const url = window.location.origin;
    navigator.clipboard.writeText(url).then(() => toast.success("Domínio copiado"));
  }

  function runTest() {
    if (!activeKey) { toast.error("Nenhuma chave configurada para testar"); return; }
    setTestKey(activeKey + "?t=" + Date.now()); // ensure state change triggers effect
    // But key must be clean for URL; use a separate trigger
    setTestKey(activeKey);
    setShowTest(true);
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
                <div className="font-medium">Status atual</div>
                <div className="text-xs text-muted-foreground">
                  {usingCustom
                    ? "Usando sua chave personalizada."
                    : envBrowserKey
                    ? "Usando a integração padrão da Lovable."
                    : "Nenhuma chave configurada."}
                </div>
              </div>
              <StatusBadge ok={Boolean(activeKey)} />
            </div>
          </div>

          <div className="rounded-md border p-4 space-y-4">
            <div>
              <div className="font-medium">Integrar minha conta do Google Maps</div>
              <p className="text-xs text-muted-foreground">
                Cole aqui a chave gerada no seu Google Cloud. Ela é armazenada no banco do sistema e passa a ser
                usada em todos os mapas do app (Vendas, CRM etc.).
              </p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center p-4 text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando...
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Chave do navegador (Browser API Key) *</Label>
                  <div className="flex gap-2">
                    <Input
                      type={showKey ? "text" : "password"}
                      value={browserKey}
                      onChange={(e) => setBrowserKey(e.target.value)}
                      placeholder="AIza..."
                      autoComplete="off"
                    />
                    <Button type="button" variant="outline" size="icon" onClick={() => setShowKey((v) => !v)}>
                      {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Restrinja por HTTP referrer no Google Cloud: <code>{typeof window !== "undefined" ? window.location.origin + "/*" : ""}</code>
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>ID de rastreamento (opcional)</Label>
                  <Input
                    value={trackingId}
                    onChange={(e) => setTrackingId(e.target.value)}
                    placeholder="ex.: meuapp-prod"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
                  {(browserKey || trackingId) && (
                    <Button type="button" variant="ghost" onClick={clearKey} disabled={saving}>
                      Limpar
                    </Button>
                  )}
                  <Button type="button" onClick={save} disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar chave
                  </Button>
                </div>
              </>
            )}
          </div>

          <div className="rounded-md border p-4 space-y-2">
            <div className="font-medium">Domínio atual</div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <code className="rounded bg-muted px-2 py-1 text-xs break-all">{typeof window !== "undefined" ? window.location.origin : ""}</code>
              <Button variant="outline" size="sm" onClick={copyDomain} className="w-full sm:w-auto">Copiar</Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Adicione este domínio ao allowlist da sua chave: <code>{typeof window !== "undefined" ? window.location.origin : ""}/*</code>
            </p>
          </div>

          <div className="rounded-md border p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <div className="font-medium">Testar conexão</div>
                <div className="text-xs text-muted-foreground">Carrega o Google Maps com a chave ativa.</div>
              </div>
              <Button
                onClick={runTest}
                disabled={!activeKey || status === "testing"}
                className="w-full sm:w-auto"
              >
                {status === "testing" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {status === "ok" ? "Testar novamente" : "Testar agora"}
              </Button>
            </div>

            {showTest && (
              <>
                <div id="maps-config-test-map" className="h-52 w-full rounded-md border bg-muted" />
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
            <div className="font-medium">Como obter sua chave</div>
            <ol className="list-decimal pl-5 text-xs text-muted-foreground space-y-1">
              <li>Crie/selecione um projeto no Google Cloud e ative <strong>billing</strong>.</li>
              <li>Ative as APIs: <em>Maps JavaScript API</em>, <em>Places API (New)</em>, <em>Geocoding API</em>.</li>
              <li>Em <em>APIs & Services → Credentials</em>, clique em <em>Create credentials → API key</em>.</li>
              <li>
                Restrinja a chave por <strong>HTTP referrers</strong> e inclua:
                <code className="ml-1">{typeof window !== "undefined" ? window.location.origin : ""}/*</code>
              </li>
              <li>Copie a chave e cole no campo acima. Clique em <em>Salvar chave</em>.</li>
            </ol>
            <div className="flex flex-wrap gap-3 pt-1">
              <a href="https://console.cloud.google.com/google/maps-apis/credentials" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-primary underline">
                Google Cloud Credentials <ExternalLink className="h-3 w-3" />
              </a>
              <a href="https://console.cloud.google.com/google/maps-apis/api-list" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-primary underline">
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
