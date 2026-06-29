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
import { MapPin, Trash2, Loader2, Crosshair } from "lucide-react";
import { reverseGeocode } from "@/lib/geocode.functions";

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
  observacoes: string | null;
  latitude: number;
  longitude: number;
};

type Plano = { id: string; nome: string };
type Associado = { id: string; nome: string; codigo: number };

let mapsLoading: Promise<void> | null = null;
function loadGoogleMaps(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject();
  if ((window as any).google?.maps) return Promise.resolve();
  if (mapsLoading) return mapsLoading;
  mapsLoading = new Promise((resolve, reject) => {
    const key = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY;
    const ch = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID;
    if (!key) return reject(new Error("Maps key missing"));
    (window as any).__initGmaps = () => resolve();
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&callback=__initGmaps${ch ? `&channel=${ch}` : ""}`;
    s.async = true;
    s.onerror = () => reject(new Error("Falha ao carregar Google Maps"));
    document.head.appendChild(s);
  });
  return mapsLoading;
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
  const [municipioFiltro, setMunicipioFiltro] = useState<string>("__auto__");
  const [meMunicipio, setMeMunicipio] = useState<string | null>(null);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id ?? null);
    const [{ data: p }, { data: pl }, { data: as }] = await Promise.all([
      supabase.from("vendas_pins").select("*").order("created_at", { ascending: false }),
      supabase.from("planos").select("id, nome").eq("ativo", true).order("nome"),
      supabase.from("associados").select("id, nome, codigo").order("nome"),
    ]);
    setPins((p ?? []) as Pin[]);
    setPlanos((pl ?? []) as Plano[]);
    setAssociados((as ?? []) as Associado[]);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadGoogleMaps();
        if (cancelled) return;
        await loadData();
        if (cancelled || !mapDivRef.current) return;
        const google = (window as any).google;
        const initial = { lat: -15.7801, lng: -47.9292 };
        mapRef.current = new google.maps.Map(mapDivRef.current, {
          center: initial,
          zoom: 13,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });
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
    if (municipioFiltro === "__all__") return pins;
    if (municipioFiltro === "__auto__") {
      if (!meMunicipio) return pins;
      return pins.filter((p) => p.municipio === meMunicipio);
    }
    return pins.filter((p) => p.municipio === municipioFiltro);
  }, [pins, municipioFiltro, meMunicipio]);

  // Sync markers (only filtered)
  useEffect(() => {
    if (!mapRef.current) return;
    const google = (window as any).google;
    if (!google) return;
    const seen = new Set<string>();
    for (const pin of filteredPins) {
      seen.add(pin.id);
      const existing = markersRef.current.get(pin.id);
      const statusDef = STATUS_OPTIONS.find((s) => s.value === pin.status) ?? STATUS_OPTIONS[0];
      const color =
        pin.status === "associado" ? "#059669" :
        pin.status === "recusou" ? "#ef4444" :
        pin.status === "sem_interesse" ? "#f59e0b" :
        pin.status === "retornar" ? "#a855f7" : "#3b82f6";
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
        m.addListener("click", () => setDialog({ open: true, pin }));
        markersRef.current.set(pin.id, m);
      }
    }
    for (const [id, m] of markersRef.current) {
      if (!seen.has(id)) { m.setMap(null); markersRef.current.delete(id); }
    }
  }, [filteredPins]);

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
      observacoes: form.observacoes || null,
      latitude: form.latitude,
      longitude: form.longitude,
      plano_id: form.plano_id || null,
      associado_id: form.associado_id || null,
    };
    if (form.id) {
      const { error } = await supabase.from("vendas_pins").update(payload).eq("id", form.id);
      if (error) return toast.error(error.message);
      toast.success("Pin atualizado");
    } else {
      if (!userId) return toast.error("Sessão inválida");
      const { error } = await supabase.from("vendas_pins").insert({ ...payload, vendedor_id: userId });
      if (error) return toast.error(error.message);
      toast.success("Pin criado");
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
        mapRef.current?.panTo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        mapRef.current?.setZoom(16);
      },
      () => toast.error("Não foi possível obter localização"),
    );
  }

  return (
    <AppShell
      title="Mapa de Vendas"
      subtitle="Toque no mapa para registrar um ponto"
      actions={
        <Button size="sm" variant="outline" onClick={centerOnMe}>
          <Crosshair className="mr-2 h-4 w-4" /> Minha localização
        </Button>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="overflow-hidden">
          <div className="relative">
            {loading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            )}
            <div ref={mapDivRef} className="h-[60vh] w-full lg:h-[75vh]" />
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
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Pontos ({filteredPins.length})</h3>
            </div>
            <div className="flex flex-wrap gap-1 text-xs">
              {STATUS_OPTIONS.map((s) => (
                <span key={s.value} className="flex items-center gap-1">
                  <span className={`inline-block h-2.5 w-2.5 rounded-full ${s.color}`} />
                  {s.label}
                </span>
              ))}
            </div>
            <div className="max-h-[55vh] space-y-2 overflow-y-auto">
              {filteredPins.map((p) => {
                const st = STATUS_OPTIONS.find((s) => s.value === p.status) ?? STATUS_OPTIONS[0];
                const plano = planos.find((pl) => pl.id === p.plano_id);
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      mapRef.current?.panTo({ lat: p.latitude, lng: p.longitude });
                      mapRef.current?.setZoom(17);
                      setDialog({ open: true, pin: p });
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
  useEffect(() => { setForm(state.pin ?? {}); }, [state.pin, state.open]);

  return (
    <Dialog open={state.open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            {form.id ? "Editar ponto" : "Novo ponto"}
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
              <Select
                value={form.associado_id ?? "none"}
                onValueChange={(v) => setForm({ ...form, associado_id: v === "none" ? null : v })}
              >
                <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {associados.slice(0, 200).map((a) => (
                    <SelectItem key={a.id} value={a.id}>#{a.codigo} — {a.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea
              rows={3}
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

        <DialogFooter className="gap-2 sm:justify-between">
          <div>
            {form.id && (
              <Button variant="destructive" size="sm" onClick={() => form.id && onDelete(form.id)}>
                <Trash2 className="mr-2 h-4 w-4" /> Excluir
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={() => onSave(form)}>Salvar</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
