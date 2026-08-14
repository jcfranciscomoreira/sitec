import { createFileRoute, ErrorComponent } from "@tanstack/react-router";
import { useEffect, useRef, useState, useMemo } from "react";
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
import { CarteirinhaConfigTab } from "@/components/CarteirinhaConfig";
import { ContratoConfigTab } from "@/components/ContratoConfig";
import { FiliaisConfig } from "@/components/FiliaisConfig";
import { MapsConfig } from "@/components/MapsConfig";
import { LogsAuditoria } from "@/components/LogsAuditoria";
import { BackupConfig } from "@/components/BackupConfig";


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
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="identidade">Configuração da Empresa</TabsTrigger>
          <TabsTrigger value="filiais">Filiais</TabsTrigger>
          <TabsTrigger value="carteirinha">Carteirinha</TabsTrigger>
          <TabsTrigger value="contrato">Contrato padrão</TabsTrigger>
          <TabsTrigger value="integracao">Integração bancária</TabsTrigger>
          <TabsTrigger value="maps">Google Maps</TabsTrigger>
          <TabsTrigger value="logs">Log de atividades</TabsTrigger>
          <TabsTrigger value="backup">Backup</TabsTrigger>

        </TabsList>
        <TabsContent value="identidade" className="mt-4">
          <IdentidadeVisual />
        </TabsContent>
        <TabsContent value="filiais" className="mt-4">
          <FiliaisConfig />
        </TabsContent>
        <TabsContent value="carteirinha" className="mt-4">
          <CarteirinhaConfigTab />
        </TabsContent>
        <TabsContent value="contrato" className="mt-4">
          <ContratoConfigTab />
        </TabsContent>
        <TabsContent value="integracao" className="mt-4">
          <IntegracaoBancariaConfig />
        </TabsContent>
        <TabsContent value="maps" className="mt-4">
          <MapsConfig />
        </TabsContent>
        <TabsContent value="logs" className="mt-4">
          <LogsAuditoria />
        </TabsContent>
        <TabsContent value="backup" className="mt-4">
          <BackupConfig />
        </TabsContent>

      </Tabs>
    </AppShell>
  );
}

function IdentidadeVisual() {
  const [nome, setNome] = useState("");
  const [subtitulo, setSubtitulo] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [endereco, setEndereco] = useState("");
  const [telefone, setTelefone] = useState("");
  const [logo, setLogo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      let query = supabase
        .from("configuracoes")
        .select("nome_sistema, subtitulo, logo_url, cnpj, endereco, telefone, id")
        .eq("id", 1);
      
      if (profile?.tenant_id && profile.tenant_id !== '00000000-0000-0000-0000-000000000000') {
        const { data: tenantConfig } = await supabase
          .from("configuracoes")
          .select("nome_sistema, subtitulo, logo_url, cnpj, endereco, telefone, id")
          .eq("tenant_id", profile.tenant_id)
          .maybeSingle();
        
        if (tenantConfig) {
          setNome(tenantConfig.nome_sistema ?? "");
          setSubtitulo(tenantConfig.subtitulo ?? "");
          setLogo(tenantConfig.logo_url ?? null);
          setCnpj((tenantConfig as any).cnpj ?? "");
          setEndereco((tenantConfig as any).endereco ?? "");
          setTelefone((tenantConfig as any).telefone ?? "");
          setLoading(false);
          return;
        }
      }

      const { data, error } = await query.maybeSingle();
      if (error) toast.error(error.message);
      if (data) {
        setNome(data.nome_sistema ?? "");
        setSubtitulo(data.subtitulo ?? "");
        setLogo(data.logo_url ?? null);
        setCnpj((data as any).cnpj ?? "");
        setEndereco((data as any).endereco ?? "");
        setTelefone((data as any).telefone ?? "");
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .single();

    const payload = {
      nome_sistema: nome.trim(),
      subtitulo: subtitulo.trim() || null,
      logo_url: logo,
      cnpj: cnpj.trim() || null,
      endereco: endereco.trim() || null,
      telefone: telefone.trim() || null,
    };

    let result;
    if (profile?.tenant_id && profile.tenant_id !== '00000000-0000-0000-0000-000000000000') {
      // Tentar encontrar config do tenant
      const { data: existing } = await supabase
        .from("configuracoes")
        .select("id")
        .eq("tenant_id", profile.tenant_id)
        .maybeSingle();
      
      if (existing) {
        result = await supabase
          .from("configuracoes")
          .update(payload as any)
          .eq("id", existing.id);
      } else {
        result = await supabase
          .from("configuracoes")
          .insert({ ...payload, tenant_id: profile.tenant_id } as any);
      }
    } else {
      result = await supabase
        .from("configuracoes")
        .update(payload as any)
        .eq("id", 1);
    }

    setSaving(false);
    if (result.error) { toast.error(result.error.message); return; }
    await reloadConfiguracoes();
    toast.success("Configurações salvas");
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader><CardTitle>Configuração da Empresa</CardTitle></CardHeader>
      <CardContent className="space-y-5">
        {loading ? (
          <div className="flex items-center justify-center p-8 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando...
          </div>
        ) : (
          <>
            <div><Label>Nome do sistema *</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} /></div>
            <div><Label>Subtítulo</Label><Input value={subtitulo} onChange={(e) => setSubtitulo(e.target.value)} /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label>CNPJ</Label><Input value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" /></div>
              <div><Label>Telefone</Label><Input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(00) 0000-0000" /></div>
            </div>
            <div><Label>Endereço</Label><Input value={endereco} onChange={(e) => setEndereco(e.target.value)} placeholder="Rua, número, bairro, cidade - UF" /></div>
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
