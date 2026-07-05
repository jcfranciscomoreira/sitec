import { createFileRoute, ErrorComponent } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Upload, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { reloadConfiguracoes } from "@/hooks/use-configuracoes";
import { IntegracaoBancariaConfig } from "@/components/IntegracaoBancariaConfig";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  component: ConfiguracoesPage,
  errorComponent: ErrorComponent,
  notFoundComponent: () => <div className="p-6">Página não encontrada</div>,
});

const MAX_BYTES = 500 * 1024;

function ConfiguracoesPage() {
  return (
    <AppShell title="Configurações" subtitle="Personalização e integrações do sistema">
      <Tabs defaultValue="identidade" className="w-full">
        <TabsList>
          <TabsTrigger value="identidade">Identidade visual</TabsTrigger>
          <TabsTrigger value="integracao">Integração bancária</TabsTrigger>
        </TabsList>
        <TabsContent value="identidade" className="mt-4">
          <IdentidadeVisual />
        </TabsContent>
        <TabsContent value="integracao" className="mt-4">
          <IntegracaoBancariaConfig />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function IdentidadeVisual() {
  const [nome, setNome] = useState("");
  const [subtitulo, setSubtitulo] = useState("");
  const [logo, setLogo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("configuracoes")
        .select("nome_sistema, subtitulo, logo_url")
        .eq("id", 1)
        .maybeSingle();
      if (error) toast.error(error.message);
      if (data) {
        setNome(data.nome_sistema ?? "");
        setSubtitulo(data.subtitulo ?? "");
        setLogo(data.logo_url ?? null);
      }
      setLoading(false);
    })();
  }, []);

  async function handleFile(file: File) {
    if (file.size > MAX_BYTES) { toast.error("Imagem muito grande (máx. 500 KB)"); return; }
    const reader = new FileReader();
    reader.onload = () => setLogo(String(reader.result));
    reader.readAsDataURL(file);
  }

  async function save() {
    if (!nome.trim()) { toast.error("Informe o nome"); return; }
    setSaving(true);
    const { error } = await supabase
      .from("configuracoes")
      .update({ nome_sistema: nome.trim(), subtitulo: subtitulo.trim() || null, logo_url: logo })
      .eq("id", 1);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    await reloadConfiguracoes();
    toast.success("Configurações salvas");
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader><CardTitle>Identidade visual</CardTitle></CardHeader>
      <CardContent className="space-y-5">
        {loading ? (
          <div className="flex items-center justify-center p-8 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando...
          </div>
        ) : (
          <>
            <div><Label>Nome do sistema *</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} /></div>
            <div><Label>Subtítulo</Label><Input value={subtitulo} onChange={(e) => setSubtitulo(e.target.value)} /></div>
            <div className="space-y-2">
              <Label>Logo</Label>
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-md border bg-muted overflow-hidden">
                  {logo ? <img src={logo} alt="logo" className="h-full w-full object-contain" /> : <span className="text-xs text-muted-foreground">Sem logo</span>}
                </div>
                <div className="flex flex-col gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                    <Upload className="mr-2 h-4 w-4" /> Escolher imagem
                  </Button>
                  {logo && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setLogo(null)}>
                      <Trash2 className="mr-2 h-4 w-4" /> Remover
                    </Button>
                  )}
                  <input ref={fileRef} type="file" accept="image/*" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
                  <p className="text-xs text-muted-foreground">PNG, JPG ou SVG até 500 KB.</p>
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={save} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
