import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Database, Download, FileJson, FileSpreadsheet, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { gerarBackup } from "@/lib/backup.functions";
import { BACKUP_TABELAS } from "@/lib/backup-tabelas";


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
  const executar = useServerFn(gerarBackup);
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
      const res: any = await executar({ data: { tabelas: selecionadas as any } });
      if (formato === "json") {
        baixar(JSON.stringify(res, null, 2), `backup_${stamp()}.json`, "application/json");
      } else {
        const partes = Object.entries(res.dados as Record<string, any[]>)
          .map(([tabela, linhas]) => `### ${tabela} (${linhas.length})\n${toCsv(linhas)}`)
          .join("\n\n");
        baixar(partes, `backup_${stamp()}.csv`, "text/csv;charset=utf-8;");
      }
      setUltimo({ em: new Date().toLocaleString("pt-BR"), resumo: res.resumo });
      toast.success("Backup gerado e baixado");
    } catch (e: any) {
      toast.error("Erro ao gerar backup", { description: e?.message });
    } finally {
      setRodando(null);
    }
  }

  if (loadingPerms) {
    return <div className="flex items-center p-8 text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando...</div>;
  }

  if (!isAdmin) {
    return (
      <Card className="max-w-2xl">
        <CardContent className="flex items-center gap-3 p-6 text-muted-foreground">
          <ShieldAlert className="h-5 w-5 text-destructive" />
          Apenas administradores podem gerar backups do sistema.
        </CardContent>
      </Card>
    );
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
