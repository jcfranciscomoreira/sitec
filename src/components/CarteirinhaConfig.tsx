import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Plus, Trash2, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_CARTEIRINHA, type CarteirinhaConfig, type CarteirinhaElement,
} from "@/lib/carteirinha-template";

const SAMPLE = { codigo: "#0001", nome: "João da Silva Exemplo", plano: "Plano Familiar", tipo: "Titular" };

const FIELD_KEYS: { key: string; label: string }[] = [
  { key: "nome", label: "Nome" },
  { key: "codigo", label: "Código" },
  { key: "plano", label: "Plano" },
  { key: "tipo", label: "Tipo (Titular/Dependente)" },
];

function resolveSample(el: CarteirinhaElement) {
  if (el.kind === "text") return el.content;
  return (SAMPLE as any)[el.content] ?? el.content;
}

export function CarteirinhaConfigTab() {
  const [cfg, setCfg] = useState<CarteirinhaConfig>(DEFAULT_CARTEIRINHA);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ id: string; offX: number; offY: number } | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("configuracoes").select("carteirinha_config").eq("id", 1).maybeSingle();
      const stored = (data as any)?.carteirinha_config as CarteirinhaConfig | null;
      if (stored?.elements?.length) setCfg(stored);
      setLoading(false);
    })();
  }, []);

  function updateEl(id: string, patch: Partial<CarteirinhaElement>) {
    setCfg((c) => ({ ...c, elements: c.elements.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
  }

  function onMouseDown(e: React.MouseEvent, el: CarteirinhaElement) {
    e.preventDefault();
    setSelectedId(el.id);
    const rect = boardRef.current!.getBoundingClientRect();
    dragState.current = { id: el.id, offX: e.clientX - rect.left - el.x, offY: e.clientY - rect.top - el.y };
  }

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!dragState.current || !boardRef.current) return;
      const rect = boardRef.current.getBoundingClientRect();
      const nx = Math.max(0, Math.min(cfg.width - 20, e.clientX - rect.left - dragState.current.offX));
      const ny = Math.max(0, Math.min(cfg.height - 10, e.clientY - rect.top - dragState.current.offY));
      updateEl(dragState.current.id, { x: Math.round(nx), y: Math.round(ny) });
    }
    function onUp() { dragState.current = null; }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [cfg.width, cfg.height]);

  function addElement(kind: "text" | "field") {
    const id = `el_${Date.now()}`;
    const el: CarteirinhaElement = {
      id, kind,
      content: kind === "text" ? "Novo texto" : "nome",
      x: 30, y: 60, fontSize: 12, color: cfg.color,
    };
    setCfg((c) => ({ ...c, elements: [...c.elements, el] }));
    setSelectedId(id);
  }

  function removeSelected() {
    if (!selectedId) return;
    setCfg((c) => ({ ...c, elements: c.elements.filter((e) => e.id !== selectedId) }));
    setSelectedId(null);
  }

  async function save() {
    setSaving(true);
    const { error } = await supabase.from("configuracoes").update({ carteirinha_config: cfg as any }).eq("id", 1);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Layout da carteirinha salvo");
  }

  function reset() { setCfg(DEFAULT_CARTEIRINHA); setSelectedId(null); toast.info("Restaurado padrão (não salvo)"); }

  const selected = cfg.elements.find((e) => e.id === selectedId) ?? null;

  if (loading) return <div className="flex items-center justify-center p-8 text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Carregando...</div>;

  return (
    <div className="grid gap-4 md:grid-cols-[auto,1fr]">
      <Card>
        <CardHeader><CardTitle>Pré-visualização (arraste os campos)</CardTitle></CardHeader>
        <CardContent>
          <div
            ref={boardRef}
            style={{
              position: "relative", width: cfg.width, height: cfg.height,
              background: cfg.background, color: cfg.color, borderRadius: 14,
              boxShadow: "0 8px 24px rgba(0,0,0,.2)", fontFamily: "Georgia,serif",
              userSelect: "none", overflow: "hidden",
            }}
            onMouseDown={(e) => { if (e.target === boardRef.current) setSelectedId(null); }}
          >
            {cfg.elements.map((el) => (
              <div
                key={el.id}
                onMouseDown={(e) => onMouseDown(e, el)}
                style={{
                  position: "absolute", left: el.x, top: el.y,
                  fontSize: el.fontSize, color: el.color ?? cfg.color,
                  fontWeight: el.bold ? "bold" : "normal",
                  cursor: "move", whiteSpace: "nowrap",
                  padding: "2px 4px",
                  outline: selectedId === el.id ? "2px dashed #d4af37" : "1px dashed rgba(255,255,255,.25)",
                  background: el.id === "codigo" ? "#d4af37" : "transparent",
                  borderRadius: el.id === "codigo" ? 6 : 3,
                  fontFamily: el.id === "codigo" ? "monospace" : undefined,
                }}
              >
                {resolveSample(el)}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">Clique em um item para editar. Arraste para posicionar.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Propriedades</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => addElement("text")}><Plus className="mr-1 h-4 w-4" />Texto</Button>
            <Button size="sm" variant="outline" onClick={() => addElement("field")}><Plus className="mr-1 h-4 w-4" />Campo</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!selected && <p className="text-sm text-muted-foreground">Selecione um item na pré-visualização para editar.</p>}
          {selected && (
            <>
              <div>
                <Label className="text-xs">Tipo</Label>
                <div className="text-sm">{selected.kind === "text" ? "Texto fixo" : "Campo dinâmico"}</div>
              </div>
              {selected.kind === "text" ? (
                <div>
                  <Label>Texto</Label>
                  <Input value={selected.content} onChange={(e) => updateEl(selected.id, { content: e.target.value })} />
                </div>
              ) : (
                <div>
                  <Label>Campo</Label>
                  <select
                    className="w-full h-9 rounded-md border bg-background px-2 text-sm"
                    value={selected.content}
                    onChange={(e) => updateEl(selected.id, { content: e.target.value })}
                  >
                    {FIELD_KEYS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
                  </select>
                </div>
              )}
              <div>
                <Label>Tamanho da fonte: {selected.fontSize}px</Label>
                <Slider
                  min={8} max={48} step={1}
                  value={[selected.fontSize]}
                  onValueChange={(v) => updateEl(selected.id, { fontSize: v[0] })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Posição X: {selected.x}px</Label>
                  <Slider min={0} max={cfg.width} step={1} value={[selected.x]} onValueChange={(v) => updateEl(selected.id, { x: v[0] })} />
                </div>
                <div>
                  <Label>Posição Y: {selected.y}px</Label>
                  <Slider min={0} max={cfg.height} step={1} value={[selected.y]} onValueChange={(v) => updateEl(selected.id, { y: v[0] })} />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Checkbox id="bold" checked={!!selected.bold} onCheckedChange={(v) => updateEl(selected.id, { bold: !!v })} />
                  <Label htmlFor="bold">Negrito</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Label>Cor</Label>
                  <input type="color" value={selected.color ?? cfg.color} onChange={(e) => updateEl(selected.id, { color: e.target.value })} className="h-8 w-12 rounded border" />
                </div>
              </div>
              <Button variant="destructive" size="sm" onClick={removeSelected}><Trash2 className="mr-2 h-4 w-4" />Remover item</Button>
            </>
          )}

          <div className="border-t pt-4 space-y-3">
            <div className="text-sm font-medium">Cartão</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Cor do texto</Label>
                <input type="color" value={cfg.color} onChange={(e) => setCfg((c) => ({ ...c, color: e.target.value }))} className="h-9 w-full rounded border" />
              </div>
              <div>
                <Label>Fundo (CSS)</Label>
                <Input value={cfg.background} onChange={(e) => setCfg((c) => ({ ...c, background: e.target.value }))} />
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Salvar</Button>
            <Button variant="outline" onClick={reset}><RotateCcw className="mr-2 h-4 w-4" />Restaurar padrão</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
