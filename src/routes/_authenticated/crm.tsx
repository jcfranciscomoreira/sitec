import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, GripVertical } from "lucide-react";

export const Route = createFileRoute("/_authenticated/crm")({
  component: CRMPage,
  errorComponent: ({ error }) => <div className="p-6 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-6">Não encontrado.</div>,
});

const STAGES = [
  { key: "novo", label: "Novo", color: "bg-slate-500" },
  { key: "contato", label: "Em contato", color: "bg-blue-500" },
  { key: "proposta", label: "Proposta enviada", color: "bg-amber-500" },
  { key: "negociacao", label: "Negociação", color: "bg-purple-500" },
  { key: "ganho", label: "Ganho", color: "bg-emerald-600" },
  { key: "perdido", label: "Perdido", color: "bg-rose-600" },
];

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
};

type Plano = { id: string; nome: string };

function CRMPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [{ data: l }, { data: p }] = await Promise.all([
      supabase.from("crm_leads").select("*").order("ordem", { ascending: true }).order("created_at", { ascending: false }),
      supabase.from("planos").select("id, nome").order("nome"),
    ]);
    setLeads((l as any) ?? []);
    setPlanos((p as any) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openNew(stage = "novo") {
    setEditing({
      id: "", nome: "", telefone: "", email: "", cidade: "", origem: "",
      plano_interesse: null, valor_estimado: 0, stage, observacoes: "", ordem: 0,
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

  return (
    <AppShell title="CRM — Kanban de Vendas">
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <div className="text-sm text-muted-foreground">
          {leads.length} leads · Total estimado: R$ {leads.reduce((s, l) => s + Number(l.valor_estimado || 0), 0).toFixed(2)}
        </div>
        <Button onClick={() => openNew()}><Plus className="w-4 h-4 mr-2" />Novo lead</Button>
      </div>

      {loading ? (
        <div className="text-muted-foreground">Carregando...</div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STAGES.map((s) => {
            const items = leads.filter((l) => l.stage === s.key);
            return (
              <div
                key={s.key}
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
                    {STAGES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
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
    </AppShell>
  );
}
