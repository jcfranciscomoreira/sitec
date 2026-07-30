import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, RefreshCw, Eye } from "lucide-react";
import { toast } from "sonner";

type LogRow = {
  id: string;
  user_nome: string | null;
  user_email: string | null;
  acao: string;
  tabela: string;
  registro_id: string | null;
  descricao: string | null;
  dados_antes: any;
  dados_depois: any;
  created_at: string;
};

const ACOES: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  INSERT: { label: "Criação", variant: "default" },
  UPDATE: { label: "Alteração", variant: "secondary" },
  DELETE: { label: "Exclusão", variant: "destructive" },
};

const PAGE_SIZE = 20;

export function LogsAuditoria() {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [acao, setAcao] = useState("todas");
  const [tabela, setTabela] = useState("todas");
  const [page, setPage] = useState(0);
  const [detalhe, setDetalhe] = useState<LogRow | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("logs_auditoria")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setRows((data ?? []) as LogRow[]);
  }

  useEffect(() => { load(); }, []);

  const tabelas = useMemo(
    () => Array.from(new Set(rows.map((r) => r.tabela))).sort(),
    [rows],
  );

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return rows.filter((r) => {
      if (acao !== "todas" && r.acao !== acao) return false;
      if (tabela !== "todas" && r.tabela !== tabela) return false;
      if (!q) return true;
      return [r.user_nome, r.user_email, r.descricao, r.tabela, r.registro_id]
        .some((v) => (v ?? "").toLowerCase().includes(q));
    });
  }, [rows, busca, acao, tabela]);

  const totalPages = Math.max(1, Math.ceil(filtradas.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages - 1);
  const visiveis = filtradas.slice(pageSafe * PAGE_SIZE, pageSafe * PAGE_SIZE + PAGE_SIZE);

  useEffect(() => { setPage(0); }, [busca, acao, tabela]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle>Registro de atividades</CardTitle>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Atualizar
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label>Buscar</Label>
            <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Usuário, registro..." />
          </div>
          <div>
            <Label>Ação</Label>
            <Select value={acao} onValueChange={setAcao}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="INSERT">Criação</SelectItem>
                <SelectItem value="UPDATE">Alteração</SelectItem>
                <SelectItem value="DELETE">Exclusão</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Cadastro</Label>
            <Select value={tabela} onValueChange={setTabela}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todos</SelectItem>
                {tabelas.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-8 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando...
          </div>
        ) : visiveis.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">Nenhuma atividade registrada.</p>
        ) : (
          <div className="space-y-2">
            {visiveis.map((r) => (
              <div key={r.id} className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={ACOES[r.acao]?.variant ?? "secondary"}>{ACOES[r.acao]?.label ?? r.acao}</Badge>
                    <span className="text-sm font-medium">{r.tabela}</span>
                    {r.descricao && <span className="truncate text-sm text-muted-foreground">— {r.descricao}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {r.user_nome || r.user_email || "Sistema"} · {new Date(r.created_at).toLocaleString("pt-BR")}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setDetalhe(r)}>
                  <Eye className="mr-2 h-4 w-4" /> Detalhes
                </Button>
              </div>
            ))}
          </div>
        )}

        {filtradas.length > PAGE_SIZE && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Página {pageSafe + 1} de {totalPages} · {filtradas.length} registros
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={pageSafe === 0} onClick={() => setPage(pageSafe - 1)}>Anterior</Button>
              <Button variant="outline" size="sm" disabled={pageSafe >= totalPages - 1} onClick={() => setPage(pageSafe + 1)}>Próxima</Button>
            </div>
          </div>
        )}
      </CardContent>

      <Dialog open={!!detalhe} onOpenChange={(o) => !o && setDetalhe(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>Detalhes da atividade</DialogTitle></DialogHeader>
          {detalhe && (
            <div className="space-y-3 text-sm">
              <p><strong>Usuário:</strong> {detalhe.user_nome || "—"} {detalhe.user_email ? `(${detalhe.user_email})` : ""}</p>
              <p><strong>Ação:</strong> {ACOES[detalhe.acao]?.label ?? detalhe.acao} em {detalhe.tabela}</p>
              <p><strong>Data:</strong> {new Date(detalhe.created_at).toLocaleString("pt-BR")}</p>
              <p><strong>Registro:</strong> {detalhe.registro_id || "—"}</p>
              {detalhe.dados_antes && (
                <div>
                  <p className="font-medium">Antes</p>
                  <pre className="max-h-60 overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(detalhe.dados_antes, null, 2)}</pre>
                </div>
              )}
              {detalhe.dados_depois && (
                <div>
                  <p className="font-medium">Depois</p>
                  <pre className="max-h-60 overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(detalhe.dados_depois, null, 2)}</pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
