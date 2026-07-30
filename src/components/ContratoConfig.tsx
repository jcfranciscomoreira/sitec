import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Bold, Italic, Underline as UnderlineIcon, List, ListOrdered,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Loader2, Save, RotateCcw,
  Heading1, Heading2, Undo2, Redo2, Eye, Plus, Minus,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_CONTRATO_HTML, CONTRATO_PLACEHOLDERS } from "@/lib/contrato-template";

function exec(cmd: string, value?: string) {
  document.execCommand(cmd, false, value);
}

export function ContratoConfigTab() {
  const editorRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");

  const [initialHtml, setInitialHtml] = useState<string>("");
  const [liveHtml, setLiveHtml] = useState<string>("");
  const [currentSize, setCurrentSize] = useState<string>("—");
  const [sections, setSections] = useState<{ level: number; text: string }[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("configuracoes").select("contrato_template").eq("id", 1).maybeSingle();
      const stored = (data as any)?.contrato_template as string | null;
      setInitialHtml(stored && stored.trim() ? stored : DEFAULT_CONTRATO_HTML);
      setLoading(false);
    })();
  }, []);

  function syncLive() {
    const editor = editorRef.current;
    if (!editor) return;
    setLiveHtml(editor.innerHTML);
    setSections(
      Array.from(editor.querySelectorAll("h1,h2,h3")).map((h) => ({
        level: Number(h.tagName.slice(1)),
        text: (h.textContent || "").trim(),
      })).filter((s) => s.text),
    );
  }

  useEffect(() => {
    if (!loading && !preview && editorRef.current && initialHtml && !editorRef.current.innerHTML) {
      editorRef.current.innerHTML = initialHtml;
      syncLive();
    }
  }, [loading, preview, initialHtml]);



  // Keep track of the last selection inside the editor (toolbar clicks steal focus)
  const savedRange = useRef<Range | null>(null);

  useEffect(() => {
    function onSelectionChange() {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      const editor = editorRef.current;
      if (editor && editor.contains(range.commonAncestorContainer)) {
        savedRange.current = range.cloneRange();
        const node = range.startContainer;
        const el = (node.nodeType === 3 ? node.parentElement : (node as HTMLElement)) as HTMLElement | null;
        if (el) setCurrentSize(`${Math.round(parseFloat(window.getComputedStyle(el).fontSize) || 16)}px`);
      }

    }
    document.addEventListener("selectionchange", onSelectionChange);
    return () => document.removeEventListener("selectionchange", onSelectionChange);
  }, []);

  function restoreSelection() {
    const editor = editorRef.current;
    const range = savedRange.current;
    if (!editor || !range) return false;
    editor.focus();
    const sel = window.getSelection();
    if (!sel) return false;
    sel.removeAllRanges();
    sel.addRange(range);
    return true;
  }

  function run(cmd: string, value?: string) {
    restoreSelection();
    exec(cmd, value);
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) savedRange.current = sel.getRangeAt(0).cloneRange();
  }

  function insertPlaceholder(key: string) {
    run("insertText", `{{${key}}}`);
  }

  function insertHeading(level: 1 | 2) {
    run("formatBlock", `H${level}`);
  }

  function setFontSize(px: string) {
    if (!restoreSelection()) { toast.info("Selecione o texto antes de mudar o tamanho"); return; }
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
      toast.info("Selecione o texto antes de mudar o tamanho");
      return;
    }
    const range = sel.getRangeAt(0);
    const span = document.createElement("span");
    span.style.fontSize = px;
    span.appendChild(range.extractContents());
    range.insertNode(span);
    // re-select the styled content
    const newRange = document.createRange();
    newRange.selectNodeContents(span);
    sel.removeAllRanges();
    sel.addRange(newRange);
    savedRange.current = newRange.cloneRange();
  }

  function adjustFontSize(delta: number) {
    if (!restoreSelection()) { toast.info("Selecione o texto antes de mudar o tamanho"); return; }
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
      toast.info("Selecione o texto antes de mudar o tamanho");
      return;
    }
    const node = sel.getRangeAt(0).startContainer;
    const el = (node.nodeType === 3 ? node.parentElement : (node as HTMLElement)) as HTMLElement | null;
    const current = el ? parseFloat(window.getComputedStyle(el).fontSize) || 16 : 16;
    const next = Math.min(72, Math.max(8, Math.round(current + delta)));
    setFontSize(`${next}px`);
  }

  async function save() {
    if (!editorRef.current) return;
    setSaving(true);
    const html = editorRef.current.innerHTML;
    const { error } = await supabase.from("configuracoes").update({ contrato_template: html }).eq("id", 1);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Modelo de contrato salvo");
  }

  function reset() {
    if (editorRef.current) editorRef.current.innerHTML = DEFAULT_CONTRATO_HTML;
    setInitialHtml(DEFAULT_CONTRATO_HTML);
    toast.info("Modelo restaurado (não salvo)");
  }

  function togglePreview() {
    if (!preview && editorRef.current) {
      const html = editorRef.current.innerHTML;
      setPreviewHtml(html);
      setInitialHtml(html);
    }
    setPreview((p) => !p);
  }


  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
        <CardTitle>Modelo padrão do contrato</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={togglePreview}><Eye className="mr-2 h-4 w-4" />{preview ? "Editar" : "Pré-visualizar"}</Button>
          <Button variant="outline" size="sm" onClick={reset}><RotateCcw className="mr-2 h-4 w-4" />Restaurar padrão</Button>
          <Button size="sm" onClick={save} disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Salvar</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center p-8 text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Carregando...</div>
        ) : preview ? (
          <div className="border rounded-md bg-white p-6 overflow-auto max-h-[70vh]" dangerouslySetInnerHTML={{ __html: previewHtml }} />
        ) : (
          <>
            <div
              className="flex flex-wrap gap-1 border rounded-md p-2 bg-muted/40 sticky top-0 z-10"
              onMouseDown={(e) => e.preventDefault()}
            >
              <Button variant="ghost" size="icon" title="Desfazer" onClick={() => run("undo")}><Undo2 className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" title="Refazer" onClick={() => run("redo")}><Redo2 className="h-4 w-4" /></Button>
              <div className="w-px h-6 bg-border mx-1 self-center" />
              <Button variant="ghost" size="icon" title="Negrito" onClick={() => run("bold")}><Bold className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" title="Itálico" onClick={() => run("italic")}><Italic className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" title="Sublinhado" onClick={() => run("underline")}><UnderlineIcon className="h-4 w-4" /></Button>
              <div className="w-px h-6 bg-border mx-1 self-center" />
              <Button variant="ghost" size="icon" title="Título 1" onClick={() => insertHeading(1)}><Heading1 className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" title="Título 2" onClick={() => insertHeading(2)}><Heading2 className="h-4 w-4" /></Button>
              <div className="w-px h-6 bg-border mx-1 self-center" />
              <Button variant="ghost" size="icon" title="Lista com marcadores" onClick={() => run("insertUnorderedList")}><List className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" title="Lista numerada" onClick={() => run("insertOrderedList")}><ListOrdered className="h-4 w-4" /></Button>
              <div className="w-px h-6 bg-border mx-1 self-center" />
              <Button variant="ghost" size="icon" title="Alinhar à esquerda" onClick={() => run("justifyLeft")}><AlignLeft className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" title="Centralizar" onClick={() => run("justifyCenter")}><AlignCenter className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" title="Alinhar à direita" onClick={() => run("justifyRight")}><AlignRight className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" title="Justificar" onClick={() => run("justifyFull")}><AlignJustify className="h-4 w-4" /></Button>
              <div className="w-px h-6 bg-border mx-1 self-center" />
              <Button variant="ghost" size="icon" title="Diminuir fonte" onClick={() => adjustFontSize(-2)}><Minus className="h-4 w-4" /></Button>
              <select
                className="h-8 rounded border bg-background text-sm px-2 self-center"
                value=""
                onMouseDown={(e) => e.stopPropagation()}
                onChange={(e) => { const v = e.target.value; if (v) { setFontSize(v); e.target.value = ""; } }}
                title="Tamanho da fonte"
              >
                <option value="">Tamanho</option>
                {["10px", "11px", "12px", "13px", "14px", "16px", "18px", "20px", "24px", "28px", "32px"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <Button variant="ghost" size="icon" title="Aumentar fonte" onClick={() => adjustFontSize(2)}><Plus className="h-4 w-4" /></Button>
              <input
                type="color"
                title="Cor do texto"
                className="h-8 w-10 rounded border self-center"
                onMouseDown={(e) => e.stopPropagation()}
                onChange={(e) => run("foreColor", e.target.value)}
              />
            </div>


            <div>
              <Label className="text-xs">Inserir variável do associado/plano:</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {CONTRATO_PLACEHOLDERS.map((p) => (
                  <Button key={p.key} size="sm" variant="secondary" className="h-7 text-xs"
                    onClick={() => insertPlaceholder(p.key)} title={p.label}>
                    {`{{${p.key}}}`}
                  </Button>
                ))}
              </div>
            </div>

            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              className="border rounded-md bg-white p-6 min-h-[500px] max-h-[70vh] overflow-auto text-black focus:outline-none prose max-w-none"
              style={{ fontFamily: "Georgia, serif", lineHeight: 1.55 }}
            />
            <p className="text-xs text-muted-foreground">
              As variáveis entre <code>{`{{ }}`}</code> são substituídas automaticamente pelos dados do associado quando o contrato é gerado.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
