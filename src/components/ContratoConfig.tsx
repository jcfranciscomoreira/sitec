import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Bold, Italic, Underline as UnderlineIcon, List, ListOrdered,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Loader2, Save, RotateCcw,
  Heading1, Heading2, Undo2, Redo2, Eye,
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

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("configuracoes").select("contrato_template").eq("id", 1).maybeSingle();
      const stored = (data as any)?.contrato_template as string | null;
      setInitialHtml(stored && stored.trim() ? stored : DEFAULT_CONTRATO_HTML);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!loading && !preview && editorRef.current && initialHtml && !editorRef.current.innerHTML) {
      editorRef.current.innerHTML = initialHtml;
    }
  }, [loading, preview, initialHtml]);


  function insertPlaceholder(key: string) {
    editorRef.current?.focus();
    exec("insertText", `{{${key}}}`);
  }

  function insertHeading(level: 1 | 2) {
    exec("formatBlock", `H${level}`);
  }

  function setFontSize(px: string) {
    // wrap selection in span with fontSize
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    const span = document.createElement("span");
    span.style.fontSize = px;
    span.appendChild(range.extractContents());
    range.insertNode(span);
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
            <div className="flex flex-wrap gap-1 border rounded-md p-2 bg-muted/40 sticky top-0 z-10">
              <Button variant="ghost" size="icon" title="Desfazer" onClick={() => exec("undo")}><Undo2 className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" title="Refazer" onClick={() => exec("redo")}><Redo2 className="h-4 w-4" /></Button>
              <div className="w-px h-6 bg-border mx-1 self-center" />
              <Button variant="ghost" size="icon" title="Negrito" onClick={() => exec("bold")}><Bold className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" title="Itálico" onClick={() => exec("italic")}><Italic className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" title="Sublinhado" onClick={() => exec("underline")}><UnderlineIcon className="h-4 w-4" /></Button>
              <div className="w-px h-6 bg-border mx-1 self-center" />
              <Button variant="ghost" size="icon" title="Título 1" onClick={() => insertHeading(1)}><Heading1 className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" title="Título 2" onClick={() => insertHeading(2)}><Heading2 className="h-4 w-4" /></Button>
              <div className="w-px h-6 bg-border mx-1 self-center" />
              <Button variant="ghost" size="icon" title="Lista com marcadores" onClick={() => exec("insertUnorderedList")}><List className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" title="Lista numerada" onClick={() => exec("insertOrderedList")}><ListOrdered className="h-4 w-4" /></Button>
              <div className="w-px h-6 bg-border mx-1 self-center" />
              <Button variant="ghost" size="icon" title="Alinhar à esquerda" onClick={() => exec("justifyLeft")}><AlignLeft className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" title="Centralizar" onClick={() => exec("justifyCenter")}><AlignCenter className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" title="Alinhar à direita" onClick={() => exec("justifyRight")}><AlignRight className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" title="Justificar" onClick={() => exec("justifyFull")}><AlignJustify className="h-4 w-4" /></Button>
              <div className="w-px h-6 bg-border mx-1 self-center" />
              <select
                className="h-8 rounded border bg-background text-sm px-2"
                defaultValue=""
                onChange={(e) => { if (e.target.value) { setFontSize(e.target.value); e.target.value = ""; } }}
                title="Tamanho da fonte"
              >
                <option value="">Tamanho</option>
                {["10px", "11px", "12px", "13px", "14px", "16px", "18px", "20px", "24px"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <input
                type="color"
                title="Cor do texto"
                className="h-8 w-10 rounded border"
                onChange={(e) => exec("foreColor", e.target.value)}
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
