import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, ExternalLink, Copy, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { PROVIDERS, getProvider, secretName, type ProviderMeta } from "@/lib/cobranca/providers";
import { listIntegracoes, saveIntegracao, testarConexao } from "@/lib/cobranca.functions";

type IntegRow = { id: string; provedor: string; ambiente: string; ativo: boolean; config_json: Record<string, any> };

export function IntegracaoBancariaConfig() {
  const list = useServerFn(listIntegracoes);
  const save = useServerFn(saveIntegracao);
  const test = useServerFn(testarConexao);

  const [rows, setRows] = useState<IntegRow[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string>(PROVIDERS[0].slug);
  const [ambiente, setAmbiente] = useState<"sandbox" | "producao">("sandbox");
  const [ativo, setAtivo] = useState(false);
  const [config, setConfig] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const meta = useMemo(() => getProvider(selectedSlug)!, [selectedSlug]);

  async function reload() {
    setLoading(true);
    try {
      const data = (await list()) as any as IntegRow[];
      setRows(data);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { reload(); }, []);

  useEffect(() => {
    const existing = rows.find((r) => r.provedor === selectedSlug);
    if (existing) {
      setAmbiente((existing.ambiente as any) || "sandbox");
      setAtivo(!!existing.ativo);
      setConfig((existing.config_json ?? {}) as Record<string, string>);
    } else {
      setAmbiente("sandbox"); setAtivo(false); setConfig({});
    }
  }, [selectedSlug, rows]);

  async function handleSave() {
    setSaving(true);
    try {
      // Só campos não-secretos vão pro DB
      const nonSecret: Record<string, string> = {};
      for (const f of meta.fields) {
        if (!f.secret && config[f.key] !== undefined) nonSecret[f.key] = config[f.key];
      }
      await save({ data: { provedor: selectedSlug, ambiente, ativo, config_json: nonSecret } });
      toast.success("Integração salva");
      await reload();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  async function handleTest() {
    setTesting(true);
    try {
      const r = await test({ data: { provedor: selectedSlug } });
      toast.success((r as any).mensagem ?? "Conexão OK");
    } catch (e: any) { toast.error(e.message); }
    finally { setTesting(false); }
  }

  const activeRow = rows.find((r) => r.ativo);
  const webhookUrl = meta.urlWebhook(selectedSlug);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Provedor de cobrança</CardTitle>
          <CardDescription>
            Escolha o banco/gateway que vai emitir os boletos e PIX das mensalidades e receber a compensação automática.
            {activeRow && (
              <span className="ml-2 inline-flex items-center gap-1">
                <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                  <CheckCircle2 className="mr-1 h-3 w-3" /> Ativo: {getProvider(activeRow.provedor)?.nome ?? activeRow.provedor}
                </Badge>
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Provedor</Label>
              <Select value={selectedSlug} onValueChange={setSelectedSlug}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map((p) => (
                    <SelectItem key={p.slug} value={p.slug}>
                      {p.nome} {!p.implementado && <span className="text-xs text-muted-foreground">(config)</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{meta.descricao}</p>
            </div>
            <div className="space-y-2">
              <Label>Ambiente</Label>
              <Select value={ambiente} onValueChange={(v) => setAmbiente(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sandbox">Sandbox (teste)</SelectItem>
                  <SelectItem value="producao">Produção (real)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="font-medium">Integração ativa</p>
              <p className="text-xs text-muted-foreground">Apenas um provedor pode estar ativo por vez. Ao ativar este, os outros são desativados.</p>
            </div>
            <Switch checked={ativo} onCheckedChange={setAtivo} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Passo a passo — {meta.nome}</CardTitle></CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {meta.passos.map((p, i) => (
              <li key={i} className="rounded-md border p-3">
                <p className="font-medium">{p.title}</p>
                <p className="text-sm text-muted-foreground">{p.body}</p>
              </li>
            ))}
          </ol>
          <div className="mt-4 rounded-md border bg-muted p-3">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">URL do Webhook (cole no painel do banco)</Label>
            <div className="mt-1 flex items-center gap-2">
              <code className="flex-1 truncate rounded bg-background px-2 py-1 text-xs">{webhookUrl}</code>
              <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(webhookUrl); toast.success("Copiado"); }}>
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Credenciais</CardTitle>
          <CardDescription>
            Campos marcados com <KeyRound className="inline h-3 w-3" /> são armazenados como segredos criptografados no Lovable Cloud, nunca no banco de dados. Para (re)definir um segredo, use o botão ao lado do campo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {meta.fields.map((f) => (
            <FieldRow
              key={f.key}
              providerSlug={selectedSlug}
              field={f}
              value={config[f.key] ?? ""}
              onChange={(v) => setConfig((c) => ({ ...c, [f.key]: v }))}
            />
          ))}

          <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={handleSave} disabled={saving || loading}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar configuração
            </Button>
            <Button variant="outline" onClick={handleTest} disabled={testing || !meta.implementado}>
              {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Testar conexão
            </Button>
            {!meta.implementado && (
              <Badge variant="outline" className="ml-2">Adaptador ainda não implementado — só configuração</Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function FieldRow({ providerSlug, field, value, onChange }: {
  providerSlug: string;
  field: ProviderMeta["fields"][number];
  value: string;
  onChange: (v: string) => void;
}) {
  if (field.secret) {
    const name = secretName(providerSlug, field.key);
    return (
      <div className="space-y-2">
        <Label className="flex items-center gap-1">
          <KeyRound className="h-3 w-3" /> {field.label} {field.required && <span className="text-destructive">*</span>}
        </Label>
        <div className="flex items-center gap-2 rounded-md border bg-muted p-3">
          <code className="flex-1 truncate text-xs">{name}</code>
          <Button size="sm" variant="outline" type="button"
            onClick={() => {
              // Dispara diálogo de secrets do Lovable — usa o link universal
              window.dispatchEvent(new CustomEvent("lovable:add-secret", { detail: { name } }));
              toast.info("Peça ao Lovable para configurar o segredo: “" + name + "”");
            }}>
            Configurar segredo
          </Button>
        </div>
        {field.helper && <p className="text-xs text-muted-foreground">{field.helper}</p>}
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <Label>{field.label} {field.required && <span className="text-destructive">*</span>}</Label>
      {field.type === "textarea" ? (
        <Textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} placeholder={field.placeholder} />
      ) : (
        <Input
          type={field.type === "password" ? "password" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
        />
      )}
      {field.helper && <p className="text-xs text-muted-foreground">{field.helper}</p>}
    </div>
  );
}
