import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, GripVertical, Settings, MapPin, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/crm")({
  component: CRMPage,
  errorComponent: ({ error }) => <div className="p-6 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-6">Não encontrado.</div>,
});

const COLOR_OPTIONS = [
  "bg-slate-500", "bg-blue-500", "bg-amber-500", "bg-purple-500",
  "bg-emerald-600", "bg-rose-600", "bg-teal-500", "bg-orange-500", "bg-pink-500",
];

type Stage = { id: string; key: string; label: string; color: string; ordem: number };
type Lead = {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  cidade: string | null;
  origem: string | null;
  plano_interesse: string | null;
  valor_estimado: number | null;
  stage: string;
  observacoes: string | null;
  ordem: number;
  vendas_pin_id: string | null;
};
type Plano = { id: string; nome: string };
type Pin = { id: string; nome: string | null; municipio: string | null; endereco: string | null };

function CRMPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [pins, setPins] = useState<Pin[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [stagesDialogOpen, setStagesDialogOpen] = useState(false);
  const [pinSearch, setPinSearch] = useState("");

  async function load() {
    setLoading(true);
    const [{ data: l }, { data: p }, { data: s }, { data: v }] = await Promise.all([
      supabase.from("crm_leads").select("*").order("ordem", { ascending: true }).order("created_at", { ascending: false }),
      supabase.from("planos").select("id, nome").order("nome"),
      supabase.from("crm_stages").select("*").order("ordem"),
      supabase.from("vendas_pins").select("id, nome, municipio, endereco").order("created_at", { ascending: false }).limit(500),
    ]);
    setLeads((l as any) ?? []);
    setPlanos((p as any) ?? []);
    setStages((s as any) ?? []);
    setPins((v as any) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openNew(stage: string) {
    setEditing({
      id: "", nome: "", telefone: "", email: "", cidade: "", origem: "",
      plano_interesse: null, valor_estimado: 0, stage, observacoes: "", ordem: 0, vendas_pin_id: null,
    });
    setDialogOpen(true);
  }

  async function save() {
    if (!editing) return;
    if (!editing.nome.trim()) { toast.error("Informe o nome"); return; }
    const payload: any = {
      nome: editing.nome,
      telefone: editing.telefone || null,
      email: editing.email || null,
      cidade: editing.cidade || null,
      origem: editing.origem || null,
      plano_interesse: editing.plano_interesse || null,
      valor_estimado: editing.valor_estimado || 0,
      stage: editing.stage,
      observacoes: editing.observacoes || null,
      vendas_pin_id: editing.vendas_pin_id || null,
    };
    const { error } = editing.id
      ? await supabase.from("crm_leads").update(payload).eq("id", editing.id)
      : await supabase.from("crm_leads").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Salvo");
    setDialogOpen(false);
    setEditing(null);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Excluir este lead?")) return;
    const { error } = await supabase.from("crm_leads").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    load();
  }

  async function moveTo(id: string, stage: string) {
    const lead = leads.find((l) => l.id === id);
    if (!lead || lead.stage === stage) return;
    setLeads((prev) => prev.map((l) => l.id === id ? { ...l, stage } : l));
    const { error } = await supabase.from("crm_leads").update({ stage }).eq("id", id);
    if (error) { toast.error(error.message); load(); }
  }

  const totalPorStage = (s: string) =>
    leads.filter((l) => l.stage === s).reduce((sum, l) => sum + Number(l.valor_estimado || 0), 0);

  const filteredPins = useMemo(() => {
    const q = pinSearch.toLowerCase().trim();
    if (!q) return pins.slice(0, 20);
    return pins.filter((p) =>
      (p.nome ?? "").toLowerCase().includes(q) ||
      (p.municipio ?? "").toLowerCase().includes(q) ||
      (p.endereco ?? "").toLowerCase().includes(q)
    ).slice(0, 20);
  }, [pinSearch, pins]);

  return (
    <AppShell title="CRM — Kanban de Vendas">
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <div className="text-sm text-muted-foreground">
          {leads.length} leads · Total estimado: R$ {leads.reduce((s, l) => s + Number(l.valor_estimado || 0), 0).toFixed(2)}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setStagesDialogOpen(true)}>
            <Settings className="w-4 h-4 mr-2" />Colunas
          </Button>
          <Button onClick={() => openNew(stages[0]?.key ?? "novo")}><Plus className="w-4 h-4 mr-2" />Novo lead</Button>
        </div>
      </div>

      {loading ? (
        <div className="text-muted-foreground">Carregando...</div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {stages.map((s) => {
            const items = leads.filter((l) => l.stage === s.key);
            return (
              <div
                key={s.id}
                className="w-72 shrink-0 bg-muted/40 rounded-lg p-2 flex flex-col"
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => { if (dragId) moveTo(dragId, s.key); setDragId(null); }}
              >
                <div className="flex items-center justify-between px-1 mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${s.color}`} />
                    <span className="font-medium text-sm">{s.label}</span>
                    <Badge variant="secondary">{items.length}</Badge>
                  </div>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => openNew(s.key)}>
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
                <div className="text-[11px] text-muted-foreground px-1 mb-2">
                  R$ {totalPorStage(s.key).toFixed(2)}
                </div>
                <div className="flex flex-col gap-2 min-h-40">
                  {items.map((l) => (
                    <Card
                      key={l.id}
                      className="cursor-move hover:shadow-md transition"
                      draggable
                      onDragStart={() => setDragId(l.id)}
                      onDragEnd={() => setDragId(null)}
                      onClick={() => { setEditing(l); setDialogOpen(true); }}
                    >
                      <CardHeader className="p-3 pb-1">
                        <CardTitle className="text-sm flex items-center justify-between gap-2">
                          <span className="truncate">{l.nome}</span>
                          <GripVertical className="w-3 h-3 text-muted-foreground shrink-0" />
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-3 pt-1 text-xs space-y-1">
                        {l.telefone && <div className="text-muted-foreground">{l.telefone}</div>}
                        {l.cidade && <div className="text-muted-foreground">{l.cidade}</div>}
                        {l.vendas_pin_id && (
                          <div className="flex items-center gap-1 text-emerald-600">
                            <MapPin className="w-3 h-3" />
                            <span className="truncate">
                              {pins.find((p) => p.id === l.vendas_pin_id)?.nome || "Ponto vinculado"}
                            </span>
                          </div>
                        )}
                        {!!l.valor_estimado && (
                          <div className="font-medium">R$ {Number(l.valor_estimado).toFixed(2)}</div>
                        )}
                        <div className="flex justify-end pt-1">
                          <Button
                            size="icon" variant="ghost" className="h-6 w-6"
                            onClick={(e) => { e.stopPropagation(); remove(l.id); }}
                          >
                            <Trash2 className="w-3 h-3 text-destructive" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lead dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditing(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar lead" : "Novo lead"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Nome *</Label>
                <Input value={editing.nome} onChange={(e) => setEditing({ ...editing, nome: e.target.value })} />
              </div>
              <div><Label>Telefone</Label><Input value={editing.telefone ?? ""} onChange={(e) => setEditing({ ...editing, telefone: e.target.value })} /></div>
              <div><Label>Email</Label><Input value={editing.email ?? ""} onChange={(e) => setEditing({ ...editing, email: e.target.value })} /></div>
              <div><Label>Cidade</Label><Input value={editing.cidade ?? ""} onChange={(e) => setEditing({ ...editing, cidade: e.target.value })} /></div>
              <div><Label>Origem</Label><Input placeholder="Indicação, Facebook..." value={editing.origem ?? ""} onChange={(e) => setEditing({ ...editing, origem: e.target.value })} /></div>
              <div>
                <Label>Plano de interesse</Label>
                <Select value={editing.plano_interesse ?? "none"} onValueChange={(v) => setEditing({ ...editing, plano_interesse: v === "none" ? null : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {planos.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valor estimado</Label>
                <Input type="number" step="0.01" value={editing.valor_estimado ?? 0} onChange={(e) => setEditing({ ...editing, valor_estimado: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="col-span-2">
                <Label>Estágio</Label>
                <Select value={editing.stage} onValueChange={(v) => setEditing({ ...editing, stage: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {stages.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Vincular a ponto do mapa de vendas</Label>
                {editing.vendas_pin_id ? (
                  <div className="flex items-center justify-between gap-2 border rounded-md p-2 text-sm">
                    <div className="flex items-center gap-2 truncate">
                      <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="truncate">
                        {pins.find((p) => p.id === editing.vendas_pin_id)?.nome || "Ponto"}
                        {pins.find((p) => p.id === editing.vendas_pin_id)?.municipio ? ` — ${pins.find((p) => p.id === editing.vendas_pin_id)?.municipio}` : ""}
                      </span>
                    </div>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditing({ ...editing, vendas_pin_id: null })}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <Input placeholder="Buscar por nome, município..." value={pinSearch} onChange={(e) => setPinSearch(e.target.value)} />
                    {pinSearch && (
                      <div className="border rounded-md mt-1 max-h-40 overflow-y-auto">
                        {filteredPins.length === 0 && <div className="p-2 text-xs text-muted-foreground">Nenhum ponto</div>}
                        {filteredPins.map((p) => (
                          <button
                            key={p.id} type="button"
                            className="w-full text-left px-2 py-1.5 text-xs hover:bg-muted"
                            onClick={() => { setEditing({ ...editing, vendas_pin_id: p.id }); setPinSearch(""); }}
                          >
                            <div className="font-medium">{p.nome || "(sem nome)"}</div>
                            <div className="text-muted-foreground">{p.municipio} {p.endereco ? `· ${p.endereco}` : ""}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="col-span-2">
                <Label>Observações</Label>
                <Textarea rows={3} value={editing.observacoes ?? ""} onChange={(e) => setEditing({ ...editing, observacoes: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <StagesDialog
        open={stagesDialogOpen}
        onOpenChange={setStagesDialogOpen}
        stages={stages}
        onReload={load}
        leads={leads}
      />
    </AppShell>
  );
}

function StagesDialog({ open, onOpenChange, stages, onReload, leads }: {
  open: boolean; onOpenChange: (o: boolean) => void; stages: Stage[]; onReload: () => void; leads: Lead[];
}) {
  const [novaLabel, setNovaLabel] = useState("");
  const [novaCor, setNovaCor] = useState(COLOR_OPTIONS[0]);

  async function addStage() {
    const label = novaLabel.trim();
    if (!label) { toast.error("Informe o nome"); return; }
    const key = label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    if (!key) { toast.error("Nome inválido"); return; }
    const ordem = (stages[stages.length - 1]?.ordem ?? 0) + 1;
    const { error } = await supabase.from("crm_stages").insert({ key, label, color: novaCor, ordem });
    if (error) { toast.error(error.message); return; }
    setNovaLabel("");
    onReload();
  }

  async function removeStage(s: Stage) {
    const count = leads.filter((l) => l.stage === s.key).length;
    if (count > 0) { toast.error(`Existem ${count} leads nesta coluna. Mova-os antes de remover.`); return; }
    if (!confirm(`Remover coluna "${s.label}"?`)) return;
    const { error } = await supabase.from("crm_stages").delete().eq("id", s.id);
    if (error) { toast.error(error.message); return; }
    onReload();
  }

  async function updateColor(s: Stage, color: string) {
    const { error } = await supabase.from("crm_stages").update({ color }).eq("id", s.id);
    if (error) { toast.error(error.message); return; }
    onReload();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Colunas do Kanban</DialogTitle></DialogHeader>
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {stages.map((s) => (
            <div key={s.id} className="flex items-center gap-2 border rounded-md p-2">
              <span className={`w-3 h-3 rounded-full ${s.color}`} />
              <span className="flex-1 text-sm">{s.label}</span>
              <Select value={s.color} onValueChange={(v) => updateColor(s, v)}>
                <SelectTrigger className="w-24 h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COLOR_OPTIONS.map((c) => (
                    <SelectItem key={c} value={c}>
                      <span className="flex items-center gap-2"><span className={`w-3 h-3 rounded-full ${c}`} />{c.replace("bg-", "").replace("-500", "").replace("-600", "")}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeStage(s)}>
                <Trash2 className="w-3 h-3 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
        <div className="border-t pt-3 space-y-2">
          <Label>Nova coluna</Label>
          <div className="flex gap-2">
            <Input placeholder="Nome" value={novaLabel} onChange={(e) => setNovaLabel(e.target.value)} />
            <Select value={novaCor} onValueChange={setNovaCor}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                {COLOR_OPTIONS.map((c) => (
                  <SelectItem key={c} value={c}>
                    <span className="flex items-center gap-2"><span className={`w-3 h-3 rounded-full ${c}`} />cor</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={addStage}><Plus className="w-4 h-4" /></Button>
          </div>
          <p className="text-xs text-muted-foreground">Apenas administradores podem adicionar/remover colunas.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
