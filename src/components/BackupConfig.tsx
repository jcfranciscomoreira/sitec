import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Loader2, Database, Download, FileJson, FileSpreadsheet, ShieldAlert, Upload,
  RotateCcw, Clock, History, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { gerarBackup, registrarDownloadBackup, restaurarBackup } from "@/lib/backup.functions";
import { BACKUP_TABELAS } from "@/lib/backup-tabelas";
import { parseArquivoBackup, type ArquivoBackup } from "@/lib/backup-parse";
import { usePermissions } from "@/hooks/use-permissions";
import { supabase } from "@/integrations/supabase/client";

const LABELS: Record<string, string> = {
  configuracoes: "Configurações",
  filiais: "Filiais",
  planos: "Planos",
  associados: "Associados",
  dependentes: "Dependentes",
  mensalidades: "Mensalidades",
  cobradores: "Cobradores",
  recebimentos_pendentes: "Recebimentos pendentes",
  contas_financeiras: "Entradas e saídas",
  caixa_sessoes: "Caixa — sessões",
  caixa_movimentos: "Caixa — movimentos",
  servicos_funerarios: "Serviços funerários",
  servicos_produtos: "Catálogo de serviços/produtos",
  servico_checklist: "Checklist de OS",
  servico_financeiro: "Financeiro de OS",
  servico_timeline: "Linha do tempo de OS",
  estoque_itens: "Estoque — itens",
  estoque_movimentos: "Estoque — movimentos",
  crm_leads: "CRM — leads",
  crm_stages: "CRM — colunas",
  vendas_pins: "Vendas — pontos no mapa",
  profiles: "Usuários (perfis)",
  user_roles: "Perfis de acesso",
  role_permissions: "Permissões por perfil",
  user_permissions: "Permissões por usuário",
  logs_auditoria: "Log de atividades",
};

function stamp() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
}

function baixar(conteudo: string, nome: string, tipo: string) {
  const blob = new Blob([conteudo], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}

function toCsv(linhas: any[]) {
  if (!linhas.length) return "";
  const cols = Array.from(new Set(linhas.flatMap((l) => Object.keys(l))));
  const cell = (v: any) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return `"${s.replace(/"/g, '""')}"`;
  };
  return [cols.join(","), ...linhas.map((l) => cols.map((c) => cell(l[c])).join(","))].join("\n");
}

export function BackupConfig() {
  const { isAdmin, loading: loadingPerms } = usePermissions();

  if (loadingPerms) {
    return <div className="flex items-center p-8 text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando...</div>;
  }

  if (!isAdmin) {
    return (
      <Card className="max-w-2xl">
        <CardContent className="flex items-center gap-3 p-6 text-muted-foreground">
          <ShieldAlert className="h-5 w-5 text-destructive" />
          Apenas administradores podem gerar, restaurar ou configurar backups.
        </CardContent>
      </Card>
    );
  }

  return (
    <Tabs defaultValue="gerar" className="w-full">
      <TabsList className="flex-wrap h-auto">
        <TabsTrigger value="gerar">Gerar backup</TabsTrigger>
        <TabsTrigger value="restaurar">Restaurar</TabsTrigger>
        <TabsTrigger value="automatico">Backup automático</TabsTrigger>
        <TabsTrigger value="historico">Auditoria</TabsTrigger>
      </TabsList>
      <TabsContent value="gerar" className="mt-4"><GerarTab /></TabsContent>
      <TabsContent value="restaurar" className="mt-4"><RestaurarTab /></TabsContent>
      <TabsContent value="automatico" className="mt-4"><AutomaticoTab /></TabsContent>
      <TabsContent value="historico" className="mt-4"><HistoricoTab /></TabsContent>
    </Tabs>
  );
}

function GerarTab() {
  const executar = useServerFn(gerarBackup);
  const registrar = useServerFn(registrarDownloadBackup);
  const [selecionadas, setSelecionadas] = useState<string[]>([...BACKUP_TABELAS]);
  const [rodando, setRodando] = useState<null | "json" | "csv">(null);
  const [ultimo, setUltimo] = useState<{ em: string; resumo: { tabela: string; registros: number }[] } | null>(null);

  const total = useMemo(() => selecionadas.length, [selecionadas]);

  function alternar(t: string) {
    setSelecionadas((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  async function rodar(formato: "json" | "csv") {
    if (!total) { toast.error("Selecione ao menos uma tabela"); return; }
    setRodando(formato);
    try {
      const res: any = await executar({ data: { tabelas: selecionadas as any, formato } });
      if (formato === "json") {
        baixar(JSON.stringify(res, null, 2), `backup_${stamp()}.json`, "application/json");
      } else {
        const partes = Object.entries(res.dados as Record<string, any[]>)
          .map(([tabela, linhas]) => `### ${tabela} (${linhas.length})\n${toCsv(linhas)}`)
          .join("\n\n");
        baixar(partes, `backup_${stamp()}.csv`, "text/csv;charset=utf-8;");
      }
      const registros = res.resumo.reduce((s: number, r: any) => s + r.registros, 0);
      await registrar({ data: { tabelas: selecionadas, formato, registros } });
      setUltimo({ em: new Date().toLocaleString("pt-BR"), resumo: res.resumo });
      toast.success("Backup gerado e baixado");
    } catch (e: any) {
      toast.error("Erro ao gerar backup", { description: e?.message });
    } finally {
      setRodando(null);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5" /> Backup do sistema</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm text-muted-foreground">
            Gere uma cópia de segurança dos dados. O arquivo JSON preserva a estrutura completa (ideal para restauração)
            e o CSV é útil para conferência em planilhas. Guarde o arquivo em local seguro — ele contém dados pessoais.
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelecionadas([...BACKUP_TABELAS])}>Selecionar tudo</Button>
            <Button variant="outline" size="sm" onClick={() => setSelecionadas([])}>Limpar seleção</Button>
            <Badge variant="secondary">{total} de {BACKUP_TABELAS.length} tabelas</Badge>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {BACKUP_TABELAS.map((t) => (
              <label key={t} className="flex items-center gap-2 rounded-md border border-border/60 p-2 text-sm">
                <Checkbox checked={selecionadas.includes(t)} onCheckedChange={() => alternar(t)} />
                <span>{LABELS[t] ?? t}</span>
              </label>
            ))}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => rodar("csv")} disabled={rodando !== null}>
              {rodando === "csv" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
              Baixar CSV
            </Button>
            <Button onClick={() => rodar("json")} disabled={rodando !== null}>
              {rodando === "json" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileJson className="mr-2 h-4 w-4" />}
              Baixar backup (JSON)
            </Button>
          </div>
        </CardContent>
      </Card>

      {ultimo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Download className="h-4 w-4" /> Último backup — {ultimo.em}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {ultimo.resumo.map((r) => (
                <div key={r.tabela} className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm">
                  <span className="truncate">{LABELS[r.tabela] ?? r.tabela}</span>
                  <span className="font-medium">{r.registros}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

type Previa = {
  tabela: string; no_arquivo: number; na_base: number; sobrescritos: number;
  novos: number; sem_id: number; colunas_desconhecidas: string[];
};

function RestaurarTab() {
  const executar = useServerFn(restaurarBackup);
  const fileRef = useRef<HTMLInputElement>(null);
  const [arquivo, setArquivo] = useState<ArquivoBackup | null>(null);
  const [nomeArquivo, setNomeArquivo] = useState("");
  const [selecionadas, setSelecionadas] = useState<string[]>([]);
  const [previa, setPrevia] = useState<Previa[] | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [confirmar, setConfirmar] = useState(false);

  async function carregar(file: File) {
    try {
      const texto = await file.text();
      const parsed = parseArquivoBackup(file.name, texto);
      setArquivo(parsed);
      setNomeArquivo(file.name);
      setSelecionadas(parsed.tabelas);
      setPrevia(null);
      if (parsed.ignoradas.length) {
        toast.warning(`Tabelas ignoradas (desconhecidas): ${parsed.ignoradas.join(", ")}`);
      }
      toast.success(`Arquivo lido: ${parsed.tabelas.length} tabela(s)`);
    } catch (e: any) {
      setArquivo(null);
      toast.error("Arquivo inválido", { description: e?.message });
    }
  }

  async function gerarPrevia() {
    if (!arquivo || !selecionadas.length) { toast.error("Selecione ao menos uma tabela"); return; }
    setCarregando(true);
    try {
      const dados = Object.fromEntries(selecionadas.map((t) => [t, arquivo.dados[t] ?? []]));
      const res: any = await executar({ data: { formato: arquivo.formato, aplicar: false, tabelas: selecionadas as any, dados } });
      setPrevia(res.relatorio);
    } catch (e: any) {
      toast.error("Erro ao analisar backup", { description: e?.message });
    } finally {
      setCarregando(false);
    }
  }

  async function aplicar() {
    if (!arquivo) return;
    setCarregando(true);
    try {
      const dados = Object.fromEntries(selecionadas.map((t) => [t, arquivo.dados[t] ?? []]));
      const res: any = await executar({ data: { formato: arquivo.formato, aplicar: true, tabelas: selecionadas as any, dados } });
      setPrevia(res.relatorio);
      toast.success("Restauração concluída");
    } catch (e: any) {
      toast.error("Erro ao restaurar", { description: e?.message });
    } finally {
      setCarregando(false);
      setConfirmar(false);
    }
  }

  const bloqueado = (previa ?? []).some((p) => p.colunas_desconhecidas.length > 0 || p.sem_id > 0);
  const totalSobrescrito = (previa ?? []).reduce((s, p) => s + p.sobrescritos, 0);
  const totalNovos = (previa ?? []).reduce((s, p) => s + p.novos, 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><RotateCcw className="h-5 w-5" /> Restaurar backup</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Selecione um arquivo de backup (.json ou .csv gerado por este sistema). Os registros são gravados por
            <strong> id</strong>: registros existentes são sobrescritos e os demais são inseridos. Nada é aplicado antes da prévia e da confirmação.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" /> Escolher arquivo
            </Button>
            <input ref={fileRef} type="file" accept=".json,.csv,application/json,text/csv" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) carregar(f); e.target.value = ""; }} />
            {nomeArquivo && <Badge variant="secondary">{nomeArquivo}</Badge>}
            {arquivo?.gerado_em && <span className="text-xs text-muted-foreground">Gerado em {new Date(arquivo.gerado_em).toLocaleString("pt-BR")}</span>}
          </div>

          {arquivo && (
            <>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {arquivo.tabelas.map((t) => (
                  <label key={t} className="flex items-center justify-between gap-2 rounded-md border border-border/60 p-2 text-sm">
                    <span className="flex items-center gap-2">
                      <Checkbox checked={selecionadas.includes(t)}
                        onCheckedChange={() => setSelecionadas((p) => p.includes(t) ? p.filter((x) => x !== t) : [...p, t])} />
                      <span>{LABELS[t] ?? t}</span>
                    </span>
                    <span className="text-xs text-muted-foreground">{arquivo.dados[t]?.length ?? 0}</span>
                  </label>
                ))}
              </div>
              <div className="flex justify-end">
                <Button onClick={gerarPrevia} disabled={carregando}>
                  {carregando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Analisar e ver prévia
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {previa && (
        <Card>
          <CardHeader><CardTitle className="text-base">Prévia da restauração</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tabela</TableHead>
                    <TableHead className="text-right">No arquivo</TableHead>
                    <TableHead className="text-right">Na base</TableHead>
                    <TableHead className="text-right">Serão sobrescritos</TableHead>
                    <TableHead className="text-right">Novos</TableHead>
                    <TableHead>Problemas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previa.map((p) => (
                    <TableRow key={p.tabela}>
                      <TableCell>{LABELS[p.tabela] ?? p.tabela}</TableCell>
                      <TableCell className="text-right">{p.no_arquivo}</TableCell>
                      <TableCell className="text-right">{p.na_base}</TableCell>
                      <TableCell className="text-right font-medium text-destructive">{p.sobrescritos}</TableCell>
                      <TableCell className="text-right">{p.novos}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {p.sem_id > 0 && <div>{p.sem_id} registro(s) sem id</div>}
                        {p.colunas_desconhecidas.length > 0 && <div>Colunas: {p.colunas_desconhecidas.join(", ")}</div>}
                        {p.sem_id === 0 && !p.colunas_desconhecidas.length && "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {bloqueado && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
                <span>O arquivo contém colunas desconhecidas ou registros sem id. Corrija o arquivo antes de restaurar.</span>
              </div>
            )}

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm text-muted-foreground">
                {totalSobrescrito} registro(s) serão sobrescritos e {totalNovos} inserido(s).
              </span>
              <Button variant="destructive" disabled={bloqueado || carregando} onClick={() => setConfirmar(true)}>
                {carregando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Restaurar agora
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={confirmar} onOpenChange={setConfirmar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar restauração</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação sobrescreve {totalSobrescrito} registro(s) existentes em {selecionadas.length} tabela(s) e não pode ser desfeita.
              Recomendamos gerar um backup atual antes de continuar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={aplicar}>Sim, restaurar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AutomaticoTab() {
  const [cfg, setCfg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("backup_config" as any).select("*").eq("id", 1).maybeSingle();
      if (error) toast.error(error.message);
      setCfg(data ?? { id: 1, ativo: false, periodicidade: "diario", hora: 3, dia_semana: 1, dia_mes: 1, tabelas: [] });
      setLoading(false);
    })();
  }, []);

  async function salvar() {
    setSaving(true);
    const { error } = await supabase.from("backup_config" as any).update({
      ativo: cfg.ativo,
      periodicidade: cfg.periodicidade,
      hora: Number(cfg.hora) || 0,
      dia_semana: Number(cfg.dia_semana) || 1,
      dia_mes: Number(cfg.dia_mes) || 1,
      alerta_email: cfg.alerta_email?.trim() || null,
      tabelas: cfg.tabelas ?? [],
    } as any).eq("id", 1);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Configuração de backup automático salva");
  }

  if (loading) return <div className="flex items-center p-8 text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando...</div>;

  return (
    <Card className="max-w-3xl">
      <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" /> Backup automático</CardTitle></CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <Label>Ativar backups automáticos</Label>
            <p className="text-xs text-muted-foreground">Os arquivos são guardados com segurança no armazenamento do sistema.</p>
          </div>
          <Switch checked={!!cfg.ativo} onCheckedChange={(v) => setCfg({ ...cfg, ativo: v })} />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label>Periodicidade</Label>
            <Select value={cfg.periodicidade} onValueChange={(v) => setCfg({ ...cfg, periodicidade: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="diario">Diário</SelectItem>
                <SelectItem value="semanal">Semanal</SelectItem>
                <SelectItem value="mensal">Mensal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Hora (UTC)</Label>
            <Input type="number" min={0} max={23} value={cfg.hora} onChange={(e) => setCfg({ ...cfg, hora: e.target.value })} />
          </div>
          {cfg.periodicidade === "semanal" ? (
            <div>
              <Label>Dia da semana</Label>
              <Select value={String(cfg.dia_semana)} onValueChange={(v) => setCfg({ ...cfg, dia_semana: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"].map((d, i) => (
                    <SelectItem key={i} value={String(i)}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : cfg.periodicidade === "mensal" ? (
            <div>
              <Label>Dia do mês</Label>
              <Input type="number" min={1} max={28} value={cfg.dia_mes} onChange={(e) => setCfg({ ...cfg, dia_mes: e.target.value })} />
            </div>
          ) : <div />}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Manter backups por (dias)</Label>
            <Input type="number" min={0} max={3650} value={cfg.retencao_dias ?? 90}
              onChange={(e) => setCfg({ ...cfg, retencao_dias: e.target.value })} />
            <p className="mt-1 text-xs text-muted-foreground">
              Arquivos automáticos mais antigos que esse período são apagados na próxima execução. Use 0 para manter para sempre.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {[
                { l: "30 dias", v: 30 }, { l: "90 dias", v: 90 },
                { l: "6 meses", v: 180 }, { l: "1 ano", v: 365 },
              ].map((o) => (
                <Button key={o.v} type="button" variant="outline" size="sm"
                  onClick={() => setCfg({ ...cfg, retencao_dias: o.v })}>{o.l}</Button>
              ))}
            </div>
          </div>
          <div>
            <Label>E-mail para alertas de falha</Label>
            <Input type="email" placeholder="responsavel@empresa.com" value={cfg.alerta_email ?? ""}
              onChange={(e) => setCfg({ ...cfg, alerta_email: e.target.value })} />
            <p className="mt-1 text-xs text-muted-foreground">
              Falhas sempre ficam registradas na aba Auditoria; o e-mail é enviado quando o serviço de e-mail está configurado.
            </p>
          </div>
        </div>


        <div className="space-y-2">
          <Label>Tabelas incluídas</Label>
          <p className="text-xs text-muted-foreground">Deixe tudo desmarcado para incluir todas as tabelas.</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {BACKUP_TABELAS.map((t) => (
              <label key={t} className="flex items-center gap-2 rounded-md border border-border/60 p-2 text-sm">
                <Checkbox checked={(cfg.tabelas ?? []).includes(t)}
                  onCheckedChange={() => setCfg({
                    ...cfg,
                    tabelas: (cfg.tabelas ?? []).includes(t)
                      ? (cfg.tabelas ?? []).filter((x: string) => x !== t)
                      : [...(cfg.tabelas ?? []), t],
                  })} />
                <span>{LABELS[t] ?? t}</span>
              </label>
            ))}
          </div>
        </div>

        {cfg.ultima_execucao && (
          <div className={`rounded-md border p-3 text-sm ${cfg.ultimo_status === "erro" ? "border-destructive/40 bg-destructive/10" : "bg-muted/40"}`}>
            Última execução: {new Date(cfg.ultima_execucao).toLocaleString("pt-BR")} — {cfg.ultimo_status}
            {cfg.ultimo_erro && <div className="text-xs text-destructive">{cfg.ultimo_erro}</div>}
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={salvar} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar</Button>
        </div>
      </CardContent>
    </Card>
  );
}

const ACOES: Record<string, string> = {
  gerar: "Gerou", baixar: "Baixou", restaurar: "Restaurou", automatico: "Automático",
};

function HistoricoTab() {
  const [linhas, setLinhas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("todos");

  useEffect(() => {
    (async () => {
      setLoading(true);
      let q = supabase.from("backup_logs" as any).select("*").order("created_at", { ascending: false }).limit(200);
      if (filtro !== "todos") q = q.eq("acao", filtro);
      const { data, error } = await q;
      if (error) toast.error(error.message);
      setLinhas((data as any[]) ?? []);
      setLoading(false);
    })();
  }, [filtro]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2 text-base"><History className="h-4 w-4" /> Auditoria de backups</CardTitle>
        <Select value={filtro} onValueChange={setFiltro}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas as ações</SelectItem>
            <SelectItem value="gerar">Geração</SelectItem>
            <SelectItem value="baixar">Download</SelectItem>
            <SelectItem value="restaurar">Restauração</SelectItem>
            <SelectItem value="automatico">Automático</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center p-6 text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando...</div>
        ) : !linhas.length ? (
          <p className="p-4 text-sm text-muted-foreground">Nenhum registro ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/hora</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Formato</TableHead>
                  <TableHead className="text-right">Registros</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tabelas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhas.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="whitespace-nowrap">{new Date(l.created_at).toLocaleString("pt-BR")}</TableCell>
                    <TableCell>{l.user_nome ?? (l.origem === "cron" ? "Sistema" : "—")}<div className="text-xs text-muted-foreground">{l.user_email ?? ""}</div></TableCell>
                    <TableCell>{ACOES[l.acao] ?? l.acao}</TableCell>
                    <TableCell className="uppercase">{l.formato ?? "—"}</TableCell>
                    <TableCell className="text-right">{l.registros}</TableCell>
                    <TableCell>
                      <Badge variant={l.status === "erro" ? "destructive" : "secondary"}>{l.status}</Badge>
                      {l.erro && <div className="max-w-[220px] truncate text-xs text-destructive" title={l.erro}>{l.erro}</div>}
                    </TableCell>
                    <TableCell className="max-w-[280px] text-xs text-muted-foreground">
                      {(l.tabelas ?? []).map((t: string) => LABELS[t] ?? t).join(", ")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
