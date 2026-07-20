import { createFileRoute, ErrorComponent, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MapPin, Trash2, Loader2, Crosshair, WifiOff, RefreshCw } from "lucide-react";
import { reverseGeocode } from "@/lib/geocode.functions";
import { getCachedConfiguracoes, reloadConfiguracoes } from "@/hooks/use-configuracoes";

const CACHE_KEY = "vendas:cache:v1";
const QUEUE_KEY = "vendas:queue:v1";

function readCache(): any | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function writeCache(d: any) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(d)); } catch {}
}
function readQueue(): any[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function writeQueue(q: any[]) {
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); } catch {}
}

export const Route = createFileRoute("/_authenticated/vendas")({
  component: VendasPage,
  errorComponent: ErrorComponent,
  notFoundComponent: () => <div className="p-6">Página não encontrada</div>,
});

const STATUS_OPTIONS = [
  { value: "prospect", label: "Prospect", color: "bg-blue-500" },
  { value: "associado", label: "Associado", color: "bg-emerald-600" },
  { value: "recusou", label: "Recusou", color: "bg-red-500" },
  { value: "sem_interesse", label: "Sem interesse", color: "bg-amber-500" },
  { value: "retornar", label: "Retornar", color: "bg-purple-500" },
  { value: "concorrencia", label: "Concorrência", color: "bg-pink-600" },
];

const TIPO_VENDA_OPTIONS = [
  { value: "nova_venda", label: "Nova venda (novo associado)" },
  { value: "troca_plano", label: "Troca de plano" },
  { value: "cancelamento", label: "Cancelamento" },
];

type Pin = {
  id: string;
  vendedor_id: string;
  associado_id: string | null;
  plano_id: string | null;
  nome: string;
  telefone: string | null;
  endereco: string | null;
  municipio: string | null;
  uf: string | null;
  status: string;
  tipo_venda: string | null;
  data_retorno: string | null;
  concorrente: string | null;
  observacoes: string | null;
  latitude: number;
  longitude: number;
};

type Plano = { id: string; nome: string };
type Associado = { id: string; nome: string; codigo: number };

let mapsLoading: Promise<void> | null = null;
async function loadGoogleMaps(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject();
  if ((window as any).google?.maps) return Promise.resolve();
  if (mapsLoading) return mapsLoading;
  mapsLoading = (async () => {
    let cfg = getCachedConfiguracoes();
    if (!cfg?.google_maps_browser_key) {
      try { cfg = await reloadConfiguracoes(); } catch {}
    }
    const key = cfg?.google_maps_browser_key || import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY;
    const ch = cfg?.google_maps_tracking_id || import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID;
    if (!key) throw new Error("Maps key missing");
    return new Promise<void>((resolve, reject) => {
      (window as any).__initGmaps = () => resolve();
      const s = document.createElement("script");
      s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&callback=__initGmaps${ch ? `&channel=${ch}` : ""}`;
      s.async = true;
      s.onerror = () => reject(new Error("Falha ao carregar Google Maps"));
      document.head.appendChild(s);
    });
  })();
  return mapsLoading;
}

function getLocationHelpUrl(): string {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return "https://support.apple.com/pt-br/HT207092";
  if (/Android/i.test(ua)) return "https://support.google.com/chrome/answer/142065?hl=pt-BR&co=GENIE.Platform%3DAndroid";
  return "https://support.google.com/chrome/answer/142065?hl=pt-BR&co=GENIE.Platform%3DDesktop";
}

function showLocationDeniedToast() {
  const url = getLocationHelpUrl();
  toast.error("Acesso à localização negado. Habilite nas configurações do navegador/sistema.", {
    duration: 10000,
    action: { label: "Como autorizar", onClick: () => window.open(url, "_blank", "noopener") },
  });
}


function VendasPage() {
  const router = useRouter();
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const meMarkerRef = useRef<any>(null);
  const meAccuracyRef = useRef<any>(null);
  const geoWatchRef = useRef<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [pins, setPins] = useState<Pin[]>([]);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [associados, setAssociados] = useState<Associado[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ open: boolean; pin: Partial<Pin> | null }>({ open: false, pin: null });
  const [viewPin, setViewPin] = useState<Pin | null>(null);
  const [soloPinId, setSoloPinId] = useState<string | null>(null);
  const [municipioFiltro, setMunicipioFiltro] = useState<string>("__auto__");
  const [statusFiltro, setStatusFiltro] = useState<string>("__all__");
  const [meMunicipio, setMeMunicipio] = useState<string | null>(null);

  const [online, setOnline] = useState<boolean>(typeof navigator === "undefined" ? true : navigator.onLine);
  const [pendingCount, setPendingCount] = useState<number>(0);

  async function loadData() {
    const cached = readCache();
    const queueToPins = (q: any[]): Pin[] =>
      q.map((it) => ({ ...it, id: it._tmpId ?? it.id }) as Pin);
    if (cached) {
      const queue = readQueue();
      setPins([...queueToPins(queue), ...((cached.pins ?? []) as Pin[])]);
      setPlanos((cached.planos ?? []) as Plano[]);
      setAssociados((cached.associados ?? []) as Associado[]);
      setPendingCount(queue.length);
    }
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);
      const [{ data: p }, { data: pl }, { data: as }] = await Promise.all([
        supabase.from("vendas_pins").select("*").order("created_at", { ascending: false }),
        supabase.from("planos").select("id, nome").eq("ativo", true).order("nome"),
        supabase.from("associados").select("id, nome, codigo").order("nome"),
      ]);
      const pinsData = (p ?? []) as Pin[];
      const planosData = (pl ?? []) as Plano[];
      const assocData = (as ?? []) as Associado[];
      writeCache({ pins: pinsData, planos: planosData, associados: assocData });
      const queue = readQueue();
      setPins([...queueToPins(queue), ...pinsData]);
      setPlanos(planosData);
      setAssociados(assocData);
      setPendingCount(queue.length);
    } catch {
      // offline / network — cache already applied
    }
  }

  async function flushQueue() {
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    const queue = readQueue();
    if (queue.length === 0) return;
    const remaining: any[] = [];
    for (const item of queue) {
      const { _tmpId, ...payload } = item;
      const { error } = await supabase.from("vendas_pins").insert(payload);
      if (error) remaining.push(item);
    }
    writeQueue(remaining);
    setPendingCount(remaining.length);
    if (remaining.length < queue.length) {
      toast.success(`${queue.length - remaining.length} ponto(s) sincronizado(s)`);
      await loadData();
    }
  }

  useEffect(() => {
    function onOnline() { setOnline(true); flushQueue(); }
    function onOffline() { setOnline(false); }
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        try { await loadGoogleMaps(); } catch (e) {
          if (!navigator.onLine) {
            await loadData();
            return;
          }
          throw e;
        }
        if (cancelled) return;
        await loadData();
        await flushQueue();
        if (cancelled || !mapDivRef.current) return;
        const google = (window as any).google;
        if (!google?.maps) return;
        const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
        const initialFix = await new Promise<{ lat: number; lng: number; accuracy?: number } | null>(async (resolve) => {
          if (!navigator.geolocation) return resolve(null);
          if (isMobile) {
            try {
              const perm = await (navigator as any).permissions?.query?.({ name: "geolocation" });
              if (perm?.state === "denied") {
                showLocationDeniedToast();
                return resolve(null);
              }
              if (perm?.state !== "granted") {
                toast.info("Permita o acesso à sua localização para ver pontos próximos.");
              }
            } catch {}
          }
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
            (err) => {
              if (err?.code === 1) {
                showLocationDeniedToast();
              } else if (isMobile) {
                toast("Toque em 'Minha localização' para autorizar o acesso.", {
                  action: { label: "Autorizar", onClick: () => centerOnMe() },
                });
              }
              resolve(null);
            },
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
          );
        });
        if (cancelled) return;
        const initial = initialFix ?? { lat: -15.7801, lng: -47.9292 };
        mapRef.current = new google.maps.Map(mapDivRef.current, {
          center: { lat: initial.lat, lng: initial.lng },
          zoom: initialFix ? 15 : 13,
          mapTypeControl: true,
          mapTypeControlOptions: {
            style: google.maps.MapTypeControlStyle.DROPDOWN_MENU,
            mapTypeIds: ["roadmap", "satellite", "hybrid", "terrain"],
          },
          streetViewControl: false,
          fullscreenControl: false,
        });
        if (initialFix) {
          updateMeMarker({ lat: initialFix.lat, lng: initialFix.lng }, initialFix.accuracy);
          try {
            const geo = await reverseGeocode({ data: { lat: initialFix.lat, lng: initialFix.lng } });
            if (!cancelled && geo.municipio) setMeMunicipio(geo.municipio);
          } catch {}
        }

        mapRef.current.addListener("click", async (e: any) => {
          const lat = e.latLng.lat();
          const lng = e.latLng.lng();
          setDialog({
            open: true,
            pin: { latitude: lat, longitude: lng, status: "prospect", nome: "" },
          });
          try {
            const geo = await reverseGeocode({ data: { lat, lng } });
            setDialog((d) =>
              d.open && d.pin && d.pin.latitude === lat && d.pin.longitude === lng
                ? {
                    open: true,
                    pin: {
                      ...d.pin,
                      municipio: geo.municipio,
                      uf: geo.uf,
                      endereco: d.pin.endereco || geo.endereco,
                    },
                  }
                : d,
            );
          } catch {}
        });
        if (navigator.geolocation) {
          let firstFix = true;
          geoWatchRef.current = navigator.geolocation.watchPosition(
            async (pos) => {
              const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
              updateMeMarker(here, pos.coords.accuracy);
              if (firstFix) {
                firstFix = false;
                mapRef.current?.setCenter(here);
                mapRef.current?.setZoom(15);
                try {
                  const geo = await reverseGeocode({ data: here });
                  if (!cancelled && geo.municipio) setMeMunicipio(geo.municipio);
                } catch {}
              }
            },
            () => {},
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
          );
        }
      } catch (err: any) {
        toast.error(err?.message ?? "Erro ao carregar mapa");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      if (geoWatchRef.current != null && navigator.geolocation) {
        navigator.geolocation.clearWatch(geoWatchRef.current);
        geoWatchRef.current = null;
      }
      meMarkerRef.current?.setMap?.(null);
      meAccuracyRef.current?.setMap?.(null);
      meMarkerRef.current = null;
      meAccuracyRef.current = null;
    };
  }, []);

  function updateMeMarker(pos: { lat: number; lng: number }, accuracy?: number) {
    const google = (window as any).google;
    if (!google || !mapRef.current) return;
    if (!meMarkerRef.current) {
      meMarkerRef.current = new google.maps.Marker({
        position: pos,
        map: mapRef.current,
        title: "Você está aqui",
        zIndex: 9999,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: "#1d4ed8",
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 3,
          scale: 8,
        },
      });
    } else {
      meMarkerRef.current.setPosition(pos);
    }
    if (accuracy && accuracy > 0) {
      if (!meAccuracyRef.current) {
        meAccuracyRef.current = new google.maps.Circle({
          map: mapRef.current,
          center: pos,
          radius: accuracy,
          fillColor: "#1d4ed8",
          fillOpacity: 0.12,
          strokeColor: "#1d4ed8",
          strokeOpacity: 0.35,
          strokeWeight: 1,
          clickable: false,
        });
      } else {
        meAccuracyRef.current.setCenter(pos);
        meAccuracyRef.current.setRadius(accuracy);
      }
    }
  }

  const municipios = useMemo(() => {
    const set = new Set<string>();
    for (const p of pins) if (p.municipio) set.add(p.municipio);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [pins]);

  const filteredPins = useMemo(() => {
    let list = pins;
    if (municipioFiltro === "__auto__") {
      if (meMunicipio) list = list.filter((p) => p.municipio === meMunicipio);
    } else if (municipioFiltro !== "__all__") {
      list = list.filter((p) => p.municipio === municipioFiltro);
    }
    if (statusFiltro !== "__all__") {
      list = list.filter((p) => p.status === statusFiltro);
    }
    return list;
  }, [pins, municipioFiltro, statusFiltro, meMunicipio]);

  // Sync markers (only filtered)
  useEffect(() => {
    if (!mapRef.current) return;
    const google = (window as any).google;
    if (!google) return;
    const seen = new Set<string>();
    const visiblePins = soloPinId ? filteredPins.filter((p) => p.id === soloPinId) : filteredPins;
    for (const pin of visiblePins) {
      seen.add(pin.id);
      const existing = markersRef.current.get(pin.id);
      const statusDef = STATUS_OPTIONS.find((s) => s.value === pin.status) ?? STATUS_OPTIONS[0];
      const color =
        pin.status === "associado" ? "#059669" :
        pin.status === "recusou" ? "#ef4444" :
        pin.status === "sem_interesse" ? "#f59e0b" :
        pin.status === "retornar" ? "#a855f7" :
        pin.status === "concorrencia" ? "#db2777" : "#3b82f6";
      const icon = {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: color,
        fillOpacity: 1,
        strokeColor: "#fff",
        strokeWeight: 2,
        scale: 9,
      };
      if (existing) {
        existing.setPosition({ lat: pin.latitude, lng: pin.longitude });
        existing.setIcon(icon);
        existing.setTitle(`${pin.nome} — ${statusDef.label}`);
        existing.setMap(mapRef.current);
      } else {
        const m = new google.maps.Marker({
          position: { lat: pin.latitude, lng: pin.longitude },
          map: mapRef.current,
          title: `${pin.nome} — ${statusDef.label}`,
          icon,
        });
        m.addListener("click", () => setViewPin(pin));
        markersRef.current.set(pin.id, m);
      }
    }
    for (const [id, m] of markersRef.current) {
      if (!seen.has(id)) { m.setMap(null); markersRef.current.delete(id); }
    }
  }, [filteredPins, soloPinId]);

  // Centraliza o mapa no município selecionado no filtro
  useEffect(() => {
    if (!mapRef.current) return;
    const google = (window as any).google;
    if (!google) return;
    const alvo =
      municipioFiltro === "__auto__" ? meMunicipio :
      municipioFiltro === "__all__" ? null : municipioFiltro;
    if (!alvo) return;
    const doMunic = pins.filter((p) => p.municipio === alvo);
    if (doMunic.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    for (const p of doMunic) bounds.extend({ lat: p.latitude, lng: p.longitude });
    mapRef.current.fitBounds(bounds, 64);
  }, [municipioFiltro, meMunicipio, pins]);

  async function savePin(form: Partial<Pin>) {
    if (!form.nome || form.latitude == null || form.longitude == null) {
      toast.error("Informe nome e localização");
      return;
    }
    let municipio = form.municipio ?? null;
    let uf = form.uf ?? null;
    if (!municipio) {
      try {
        const geo = await reverseGeocode({ data: { lat: form.latitude, lng: form.longitude } });
        municipio = geo.municipio;
        uf = uf ?? geo.uf;
      } catch {}
    }
    const payload = {
      nome: form.nome,
      telefone: form.telefone || null,
      endereco: form.endereco || null,
      municipio,
      uf,
      status: form.status || "prospect",
      tipo_venda: form.tipo_venda || null,
      data_retorno: form.status === "retornar" ? (form.data_retorno || null) : null,
      concorrente: form.status === "concorrencia" ? (form.concorrente || null) : null,
      observacoes: form.observacoes || null,
      latitude: form.latitude,
      longitude: form.longitude,
      plano_id: form.plano_id || null,
      associado_id: form.associado_id || null,
    };
    const offline = typeof navigator !== "undefined" && !navigator.onLine;
    if (form.id) {
      if (offline) {
        toast.error("Edição de pontos exige conexão");
        return;
      }
      const { error } = await supabase.from("vendas_pins").update(payload).eq("id", form.id);
      if (error) return toast.error(error.message);
      toast.success("Pin atualizado");
    } else {
      const vendedorId = userId ?? (await supabase.auth.getUser()).data.user?.id ?? null;
      if (offline) {
        if (!vendedorId) return toast.error("Sessão inválida");
        const tmpId = `local-${Date.now()}`;
        const queue = readQueue();
        queue.unshift({ ...payload, vendedor_id: vendedorId, _tmpId: tmpId });
        writeQueue(queue);
        setPins((prev) => [{ id: tmpId, vendedor_id: vendedorId, ...payload } as Pin, ...prev]);
        setPendingCount(queue.length);
        toast.success("Salvo offline — sincroniza ao reconectar");
        setDialog({ open: false, pin: null });
        return;
      }
      if (!vendedorId) return toast.error("Sessão inválida");
      const { error } = await supabase.from("vendas_pins").insert({ ...payload, vendedor_id: vendedorId });
      if (error) return toast.error(error.message);
      toast.success("Pin criado");
    }
    // Sincroniza alterações no associado vinculado
    if (form.associado_id && form.tipo_venda) {
      if (form.tipo_venda === "troca_plano" && form.plano_id) {
        const { error: e } = await supabase
          .from("associados")
          .update({ plano_id: form.plano_id })
          .eq("id", form.associado_id);
        if (e) toast.error("Falha ao atualizar plano do associado: " + e.message);
        else toast.success("Plano do associado atualizado");
      } else if (form.tipo_venda === "cancelamento") {
        const { error: e } = await supabase
          .from("associados")
          .update({ status: "inativo" })
          .eq("id", form.associado_id);
        if (e) toast.error("Falha ao inativar associado: " + e.message);
        else toast.success("Associado marcado como inativo");
      }
    }
    setDialog({ open: false, pin: null });
    await loadData();
  }

  async function deletePin(id: string) {
    if (!confirm("Excluir este pin?")) return;
    const { error } = await supabase.from("vendas_pins").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Pin excluído");
    setDialog({ open: false, pin: null });
    await loadData();
  }

  function centerOnMe() {
    if (!navigator.geolocation) return toast.error("Geolocalização indisponível");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        updateMeMarker(here, pos.coords.accuracy);
        mapRef.current?.panTo(here);
        mapRef.current?.setZoom(16);
      },
      (err) => {
        if (err?.code === 1) {
          showLocationDeniedToast();
        } else {
          toast.error("Não foi possível obter localização");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }


  return (
    <AppShell
      title="Mapa de Vendas"
      subtitle="Mapeie prospects, associados e concorrência no território."
      actions={
        <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
          {!online && (
            <Badge variant="secondary" className="gap-1">
              <WifiOff className="h-3 w-3" /> Offline
            </Badge>
          )}
          {pendingCount > 0 && (
            <Button size="sm" variant="outline" onClick={flushQueue} disabled={!online}>
              <RefreshCw className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Sincronizar </span>
              ({pendingCount})
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={centerOnMe}>
            <Crosshair className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Minha localização</span>
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-[minmax(0,1fr)_320px] pb-10 sm:pb-0">
        <Card className="overflow-hidden">
          <div className="relative">
            {loading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            )}
            <div ref={mapDivRef} className="h-[50dvh] min-h-[300px] w-full lg:h-[75dvh]" />
          </div>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-4">
            <div>
              <Label className="text-xs">Filtrar por município</Label>
              <Select value={municipioFiltro} onValueChange={setMunicipioFiltro}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__auto__">
                    Minha região{meMunicipio ? ` (${meMunicipio})` : ""}
                  </SelectItem>
                  <SelectItem value="__all__">Todos os municípios</SelectItem>
                  {municipios.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Filtrar por status</Label>
              <Select value={statusFiltro} onValueChange={setStatusFiltro}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos os status</SelectItem>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Pontos ({filteredPins.length})</h3>
              {soloPinId && (
                <button
                  onClick={() => setSoloPinId(null)}
                  className="text-xs text-primary hover:underline"
                >
                  Mostrar todos
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1 text-xs">
              {STATUS_OPTIONS.map((s) => (
                <span key={s.value} className="flex items-center gap-1">
                  <span className={`inline-block h-2.5 w-2.5 rounded-full ${s.color}`} />
                  {s.label}
                </span>
              ))}
            </div>
            <div className="max-h-[40vh] sm:max-h-[55vh] space-y-2 overflow-y-auto pr-1">
              {filteredPins.map((p) => {
                const st = STATUS_OPTIONS.find((s) => s.value === p.status) ?? STATUS_OPTIONS[0];
                const plano = planos.find((pl) => pl.id === p.plano_id);
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSoloPinId(p.id);
                      mapRef.current?.panTo({ lat: p.latitude, lng: p.longitude });
                      mapRef.current?.setZoom(17);
                    }}
                    className="w-full rounded-md border p-2 text-left hover:bg-accent"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{p.nome}</p>
                        {p.municipio && (
                          <p className="truncate text-xs text-muted-foreground">
                            {p.municipio}{p.uf ? ` - ${p.uf}` : ""}
                          </p>
                        )}
                        {p.endereco && <p className="truncate text-xs text-muted-foreground">{p.endereco}</p>}
                        {plano && <p className="text-xs text-muted-foreground">Plano: {plano.nome}</p>}
                      </div>
                      <Badge variant="secondary" className="shrink-0">
                        <span className={`mr-1 inline-block h-2 w-2 rounded-full ${st.color}`} />
                        {st.label}
                      </Badge>
                    </div>
                  </button>
                );
              })}
              {filteredPins.length === 0 && !loading && (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Nenhum ponto neste filtro.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <PinViewDialog
        pin={viewPin}
        planos={planos}
        associados={associados}
        onClose={() => setViewPin(null)}
        onEdit={(p) => { setViewPin(null); setDialog({ open: true, pin: p }); }}
      />

      <PinDialog
        state={dialog}
        onClose={() => setDialog({ open: false, pin: null })}
        onSave={savePin}
        onDelete={deletePin}
        planos={planos}
        associados={associados}
      />
    </AppShell>
  );
}

function PinViewDialog({
  pin, planos, associados, onClose, onEdit,
}: {
  pin: Pin | null;
  planos: Plano[];
  associados: Associado[];
  onClose: () => void;
  onEdit: (p: Pin) => void;
}) {
  if (!pin) return null;
  const st = STATUS_OPTIONS.find((s) => s.value === pin.status) ?? STATUS_OPTIONS[0];
  const tipo = TIPO_VENDA_OPTIONS.find((t) => t.value === pin.tipo_venda);
  const plano = planos.find((p) => p.id === pin.plano_id);
  const assoc = associados.find((a) => a.id === pin.associado_id);
  const Row = ({ label, value }: { label: string; value: React.ReactNode }) =>
    value ? (
      <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-1 sm:gap-2 text-sm border-b pb-2 sm:border-0 sm:pb-0">
        <span className="text-muted-foreground">{label}</span>
        <span className="break-words">{value}</span>
      </div>
    ) : null;

  return (
    <Dialog open={!!pin} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[95vw] max-w-lg max-h-[90dvh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <MapPin className="h-4 w-4 shrink-0" />
            <span className="truncate">{pin.nome}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Badge variant="secondary">
            <span className={`mr-1 inline-block h-2 w-2 rounded-full ${st.color}`} />
            {st.label}
          </Badge>
          <Row label="Telefone" value={pin.telefone} />
          <Row label="Endereço" value={pin.endereco} />
          <Row label="Município" value={pin.municipio ? `${pin.municipio}${pin.uf ? ` - ${pin.uf}` : ""}` : null} />
          <Row label="Negociação" value={tipo?.label} />
          {pin.status === "retornar" && <Row label="Data retorno" value={pin.data_retorno} />}
          {pin.status === "concorrencia" && <Row label="Concorrente" value={pin.concorrente} />}
          <Row label="Plano" value={plano?.nome} />
          <Row label="Associado" value={assoc ? `#${assoc.codigo} — ${assoc.nome}` : null} />
          <Row label="Observações" value={pin.observacoes ? <pre className="whitespace-pre-wrap font-sans text-sm">{pin.observacoes}</pre> : null} />
          <Row label="Coordenadas" value={`${pin.latitude.toFixed(6)}, ${pin.longitude.toFixed(6)}`} />
        </div>
        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">Fechar</Button>
          <Button onClick={() => onEdit(pin)} className="w-full sm:w-auto">Editar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PinDialog({
  state, onClose, onSave, onDelete, planos, associados,
}: {
  state: { open: boolean; pin: Partial<Pin> | null };
  onClose: () => void;
  onSave: (p: Partial<Pin>) => void;
  onDelete: (id: string) => void;
  planos: Plano[];
  associados: Associado[];
}) {
  const [form, setForm] = useState<Partial<Pin>>({});
  const [assocSearch, setAssocSearch] = useState("");
  useEffect(() => { setForm(state.pin ?? {}); setAssocSearch(""); }, [state.pin, state.open]);
  const selectedAssoc = associados.find((a) => a.id === form.associado_id);
  const assocMatches = (() => {
    const q = assocSearch.trim().toLowerCase();
    if (!q) return [];
    return associados
      .filter((a) => a.nome.toLowerCase().includes(q) || String(a.codigo).includes(q))
      .slice(0, 15);
  })();

  return (
    <Dialog open={state.open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[95vw] max-w-lg max-h-[90dvh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <MapPin className="h-4 w-4 shrink-0" />
            <span className="truncate">{form.id ? "Editar ponto" : "Novo ponto"}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Nome *</Label>
            <Input value={form.nome ?? ""} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Telefone</Label>
              <Input value={form.telefone ?? ""} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status ?? "prospect"} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Tipo de negociação</Label>
              <Select
                value={form.tipo_venda ?? "none"}
                onValueChange={(v) => setForm({ ...form, tipo_venda: v === "none" ? null : v })}
              >
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Não definido</SelectItem>
                  {TIPO_VENDA_OPTIONS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.status === "retornar" && (
              <div>
                <Label>Data de retorno</Label>
                <Input
                  type="date"
                  value={form.data_retorno ?? ""}
                  onChange={(e) => setForm({ ...form, data_retorno: e.target.value })}
                />
              </div>
            )}
          </div>
          {form.status === "concorrencia" && (
            <div>
              <Label>Empresa concorrente *</Label>
              <Input
                value={form.concorrente ?? ""}
                placeholder="Nome da empresa concorrente"
                onChange={(e) => setForm({ ...form, concorrente: e.target.value })}
              />
            </div>
          )}
          <div>
            <Label>Endereço</Label>
            <Input value={form.endereco ?? ""} onChange={(e) => setForm({ ...form, endereco: e.target.value })} />
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_100px]">
            <div>
              <Label>Município</Label>
              <Input
                value={form.municipio ?? ""}
                placeholder="Detectado automaticamente"
                onChange={(e) => setForm({ ...form, municipio: e.target.value })}
              />
            </div>
            <div>
              <Label>UF</Label>
              <Input
                value={form.uf ?? ""}
                maxLength={2}
                onChange={(e) => setForm({ ...form, uf: e.target.value.toUpperCase() })}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Plano</Label>
              <Select
                value={form.plano_id ?? "none"}
                onValueChange={(v) => setForm({ ...form, plano_id: v === "none" ? null : v })}
              >
                <SelectTrigger><SelectValue placeholder="Sem plano" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem plano</SelectItem>
                  {planos.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Vincular associado</Label>
              {selectedAssoc ? (
                <div className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm">
                  <span className="truncate">#{selectedAssoc.codigo} — {selectedAssoc.nome}</span>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setForm({ ...form, associado_id: null })}>
                    Remover
                  </Button>
                </div>
              ) : (
                <>
                  <Input
                    placeholder="Digite nome ou código..."
                    value={assocSearch}
                    onChange={(e) => setAssocSearch(e.target.value)}
                  />
                  {assocSearch && (
                    <div className="mt-1 max-h-48 overflow-y-auto rounded-md border">
                      {assocMatches.length === 0 && (
                        <div className="p-2 text-xs text-muted-foreground">Nenhum associado</div>
                      )}
                      {assocMatches.map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          className="w-full px-2 py-1.5 text-left text-xs hover:bg-muted"
                          onClick={() => { setForm({ ...form, associado_id: a.id }); setAssocSearch(""); }}
                        >
                          #{a.codigo} — {a.nome}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label>Observações</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={async () => {
                  const { data: { user } } = await supabase.auth.getUser();
                  let nome = user?.email ?? "Usuário";
                  if (user?.id) {
                    const { data: prof } = await supabase
                      .from("profiles").select("nome").eq("id", user.id).maybeSingle();
                    if (prof?.nome) nome = prof.nome;
                  }
                  const now = new Date();
                  const data = now.toLocaleDateString("pt-BR");
                  const hora = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
                  const linha = `Visita: ${data} ${hora} - ${nome}`;
                  setForm((f) => ({
                    ...f,
                    observacoes: f.observacoes ? `${linha}\n${f.observacoes}` : linha,
                  }));
                  toast.success("Visita registrada (lembre de salvar)");
                }}
              >
                Registrar visita
              </Button>
            </div>
            <Textarea
              rows={4}
              value={form.observacoes ?? ""}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
            />
          </div>
          {form.latitude != null && form.longitude != null && (
            <p className="text-xs text-muted-foreground">
              Lat: {form.latitude.toFixed(6)}, Lng: {form.longitude.toFixed(6)}
            </p>
          )}
        </div>

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <div className="w-full sm:w-auto">
            {form.id && (
              <Button variant="destructive" size="sm" onClick={() => form.id && onDelete(form.id)} className="w-full sm:w-auto">
                <Trash2 className="mr-2 h-4 w-4" /> Excluir
              </Button>
            )}
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">Cancelar</Button>
            <Button onClick={() => onSave(form)} className="w-full sm:w-auto">Salvar</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
