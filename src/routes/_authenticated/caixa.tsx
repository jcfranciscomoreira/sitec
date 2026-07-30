import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Wallet, Lock, Unlock, Plus, Printer, History, Search, XCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SkeletonTable } from "@/components/ui/skeleton-table";
import { EmptyState } from "@/components/ui/empty-state";
import { supabase } from "@/integrations/supabase/client";
import { brl, fmtDate, competenciaLabel } from "@/lib/format";
import { getEmpresaHeaderHTML } from "@/lib/print-header";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/use-permissions";
import { useServerFn } from "@tanstack/react-start";
import { verificarSenhaAdmin } from "@/lib/caixa-admin.functions";


export const Route = createFileRoute("/_authenticated/caixa")({
  head: () => ({
    meta: [
      { title: "Caixa — Abertura e fechamento" },
      { name: "description", content: "Abertura e fechamento de caixa da secretaria com recebimento de mensalidades no escritório." },
      { property: "og:title", content: "Caixa — Abertura e fechamento" },
      { property: "og:description", content: "Controle diário de caixa: abertura, recebimentos, sangrias e fechamento." },
    ],
  }),
  component: CaixaPage,
});

type Caixa = {
  id: string;
  operador_id: string | null;
  operador_nome: string;
  filial_id: string | null;
  valor_abertura: number;
  valor_fechamento_informado: number | null;
  status: string;
  observacoes: string | null;
  aberto_em: string;
  fechado_em: string | null;
};

type Movimento = {
  id: string;
  caixa_id: string;
  tipo: string;
  descricao: string;
  valor: number;
  forma_pagamento: string;
  mensalidade_id: string | null;
  associado_id: string | null;
  created_at: string;
};

function useSession() {
  return useQuery({
    queryKey: ["caixa-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data: prof } = await supabase.from("profiles").select("nome").eq("id", user.id).maybeSingle();
      return { id: user.id, nome: prof?.nome ?? user.email ?? "Usuário" };
    },
  });
}

function CaixaPage() {
  const [tab, setTab] = useState<"operacao" | "historico">("operacao");
  return (
    <AppShell title="Caixa" subtitle="Abertura e fechamento de caixa da secretaria">
      <div className="mb-4 flex flex-wrap gap-2">
        <Button variant={tab === "operacao" ? "default" : "outline"} onClick={() => setTab("operacao")}>
          <Wallet className="mr-2 h-4 w-4" />Operação do caixa
        </Button>
        <Button variant={tab === "historico" ? "default" : "outline"} onClick={() => setTab("historico")}>
          <History className="mr-2 h-4 w-4" />Histórico de caixas
        </Button>
      </div>
      {tab === "operacao" ? <OperacaoSection /> : <HistoricoSection />}
    </AppShell>
  );
}

/* ------------------------------- Operação ------------------------------- */

function OperacaoSection() {
  const qc = useQueryClient();
  const { data: me } = useSession();

  const { data: caixa, isLoading } = useQuery({
    queryKey: ["caixa-aberto", me?.id],
    enabled: !!me,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("caixa_sessoes")
        .select("*")
        .eq("status", "aberto")
        .eq("operador_id", me!.id)
        .order("aberto_em", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as Caixa) ?? null;
    },
  });

  const { data: filiais = [] } = useQuery({
    queryKey: ["filiais-ativas"],
    queryFn: async () => {
      const { data } = await supabase.from("filiais").select("id, nome").eq("ativo", true).order("nome");
      return (data ?? []) as { id: string; nome: string }[];
    },
  });

  const abrir = useMutation({
    mutationFn: async (p: { valor_abertura: number; filial_id: string | null; observacoes: string }) => {
      const { error } = await supabase.from("caixa_sessoes").insert({
        operador_id: me!.id,
        operador_nome: me!.nome,
        filial_id: p.filial_id,
        valor_abertura: p.valor_abertura,
        observacoes: p.observacoes || null,
        status: "aberto",
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["caixa-aberto"] });
      qc.invalidateQueries({ queryKey: ["caixas-historico"] });
      toast.success("Caixa aberto");
    },
    onError: (e: any) => toast.error("Erro ao abrir caixa", { description: e.message }),
  });

  if (isLoading) return <SkeletonTable rows={4} />;

  if (!caixa) {
    return (
      <Card className="mx-auto max-w-lg border-border/60 shadow-soft">
        <CardHeader>
          <CardTitle className="font-serif flex items-center gap-2"><Unlock className="h-5 w-5" />Abrir caixa</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const filial = String(fd.get("filial_id") ?? "matriz");
              abrir.mutate({
                valor_abertura: Number(String(fd.get("valor_abertura") ?? "0").replace(",", ".")) || 0,
                filial_id: filial === "matriz" ? null : filial,
                observacoes: String(fd.get("observacoes") ?? ""),
              });
            }}
          >
            <div className="space-y-2">
              <Label>Valor de abertura (troco)</Label>
              <Input name="valor_abertura" type="number" step="0.01" min="0" defaultValue="0" required />
              <p className="text-xs text-muted-foreground">
                Este valor é apenas fundo de troco: <b>não é lançado no financeiro</b>. Somente os recebimentos do turno entram na gestão financeira.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Filial</Label>
              <Select name="filial_id" defaultValue="matriz">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="matriz">Matriz</SelectItem>
                  {filiais.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea name="observacoes" rows={2} />
            </div>
            <Button type="submit" className="w-full" disabled={abrir.isPending}>
              {abrir.isPending ? "Abrindo..." : "Abrir caixa"}
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  return <CaixaAberto caixa={caixa} operadorNome={me?.nome ?? ""} />;
}

function totais(movs: Movimento[], abertura: number) {
  const entradas = movs.filter((m) => m.tipo === "entrada");
  const totalEntradas = entradas.reduce((s, m) => s + Number(m.valor), 0);
  const suprimentos = movs.filter((m) => m.tipo === "suprimento").reduce((s, m) => s + Number(m.valor), 0);
  const sangrias = movs.filter((m) => m.tipo === "sangria").reduce((s, m) => s + Number(m.valor), 0);
  const dinheiro = entradas.filter((m) => m.forma_pagamento === "dinheiro").reduce((s, m) => s + Number(m.valor), 0);
  const saldoGaveta = abertura + dinheiro + suprimentos - sangrias;
  return { totalEntradas, suprimentos, sangrias, dinheiro, saldoGaveta };
}

function CaixaAberto({ caixa, operadorNome }: { caixa: Caixa; operadorNome: string }) {
  const qc = useQueryClient();
  const { isAdmin } = usePermissions();
  const [fecharOpen, setFecharOpen] = useState(false);
  const [pagina, setPagina] = useState(0);
  const porPagina = 6;
  const [movCancelar, setMovCancelar] = useState<Movimento | null>(null);
  const [admEmail, setAdmEmail] = useState("");
  const [admSenha, setAdmSenha] = useState("");
  const [validando, setValidando] = useState(false);
  const verificarAdmin = useServerFn(verificarSenhaAdmin);

  const cancelar = useMutation({
    mutationFn: async (m: Movimento) => {
      if (m.mensalidade_id) {
        const { error: e1 } = await supabase.from("mensalidades").update({
          status: "pendente", data_pagamento: null, forma_pagamento: null, agente_recebimento: null,
        } as any).eq("id", m.mensalidade_id);
        if (e1) throw e1;
      }
      const { error } = await supabase.from("caixa_movimentos").update({
        tipo: "cancelado",
        descricao: `[CANCELADO] ${m.descricao}`,
      } as any).eq("id", m.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["caixa-movs", caixa.id] });
      qc.invalidateQueries({ queryKey: ["caixa-parcelas-abertas"] });
      qc.invalidateQueries({ queryKey: ["mensalidades"] });
      toast.success("Recebimento cancelado", { description: "A parcela voltou para em aberto." });
    },
    onError: (e: any) => toast.error("Erro ao cancelar", { description: e.message }),
  });



  const { data: movs = [], isLoading } = useQuery({
    queryKey: ["caixa-movs", caixa.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("caixa_movimentos")
        .select("*")
        .eq("caixa_id", caixa.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Movimento[];
    },
  });

  const t = totais(movs, Number(caixa.valor_abertura));

  const fechar = useMutation({
    mutationFn: async (p: { informado: number; obs: string }) => {
      // Lança no financeiro APENAS o total recebido no turno (abertura não entra)
      let contaId: string | null = null;
      if (t.totalEntradas > 0) {
        const hoje = new Date().toISOString().slice(0, 10);
        const { data: conta, error: ec } = await supabase
          .from("contas_financeiras")
          .insert({
            tipo: "entrada",
            descricao: `Fechamento de caixa — ${caixa.operador_nome} (${fmtDate(caixa.aberto_em)})`,
            categoria: "Recebimento no escritório",
            valor: t.totalEntradas,
            data_emissao: hoje,
            vencimento: hoje,
            data_pagamento: hoje,
            status: "pago",
            forma_pagamento: "diversos",
            filial_id: caixa.filial_id,
            observacoes: `Caixa ${caixa.id}`,
          } as any)
          .select("id")
          .maybeSingle();
        if (ec) throw ec;
        contaId = (conta as any)?.id ?? null;
      }
      const { error } = await supabase
        .from("caixa_sessoes")
        .update({
          status: "fechado",
          fechado_em: new Date().toISOString(),
          valor_fechamento_informado: p.informado,
          observacoes: p.obs || caixa.observacoes,
          conta_financeira_id: contaId,
        } as any)
        .eq("id", caixa.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["caixa-aberto"] });
      qc.invalidateQueries({ queryKey: ["caixas-historico"] });
      qc.invalidateQueries({ queryKey: ["contas"] });
      setFecharOpen(false);
      toast.success("Caixa fechado", { description: "Somente os recebimentos foram lançados no financeiro." });
    },
    onError: (e: any) => toast.error("Erro ao fechar caixa", { description: e.message }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Badge variant="outline" className="border-success/30 bg-success/15 text-success">Caixa aberto</Badge>
          <p className="mt-1 text-sm text-muted-foreground">
            {caixa.operador_nome} · aberto em {new Date(caixa.aberto_em).toLocaleString("pt-BR")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => printCaixa(caixa, movs)}><Printer className="mr-2 h-4 w-4" />Imprimir</Button>
          <Button onClick={() => setFecharOpen(true)}><Lock className="mr-2 h-4 w-4" />Fechar caixa</Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPI title="Abertura (não financeiro)" value={brl(caixa.valor_abertura)} muted />
        <KPI title="Recebido no turno" value={brl(t.totalEntradas)} accent="success" />
        <KPI title="Sangrias" value={brl(t.sangrias)} accent="destructive" />
        <KPI title="Saldo em gaveta (dinheiro)" value={brl(t.saldoGaveta)} accent="gold" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ReceberParcelaCard caixa={caixa} />
        <MovimentoAvulsoCard caixa={caixa} />
      </div>

      <Card className="border-border/60 shadow-soft">
        <CardHeader><CardTitle className="font-serif text-base">Movimentações do caixa</CardTitle></CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {isLoading ? <SkeletonTable rows={3} /> : movs.length === 0 ? (
            <EmptyState title="Nenhuma movimentação" message="Receba uma mensalidade ou registre um lançamento avulso." />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hora</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Forma</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movs.slice(pagina * porPagina, pagina * porPagina + porPagina).map((m) => (
                    <TableRow key={m.id} className={m.tipo === "cancelado" ? "opacity-60" : ""}>
                      <TableCell className="whitespace-nowrap text-xs">{new Date(m.created_at).toLocaleTimeString("pt-BR")}</TableCell>
                      <TableCell><TipoBadge tipo={m.tipo} /></TableCell>
                      <TableCell className="max-w-[280px] truncate">{m.descricao}</TableCell>
                      <TableCell className="capitalize">{m.forma_pagamento}</TableCell>
                      <TableCell className="text-right font-medium">{m.tipo === "sangria" ? "-" : ""}{brl(m.valor)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" title="Imprimir comprovante" onClick={() => printComprovanteMov(caixa, m)}>
                            <Printer className="h-4 w-4" />
                          </Button>
                          {m.tipo === "entrada" && (
                            <Button size="icon" variant="ghost" title="Cancelar recebimento (requer senha do administrador)"
                              className="text-destructive"
                              disabled={cancelar.isPending}
                              onClick={() => { setAdmEmail(""); setAdmSenha(""); setMovCancelar(m); }}>
                              <XCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>

              </Table>
              {movs.length > porPagina && (
                <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-0">
                  <p className="text-xs text-muted-foreground">
                    Mostrando {pagina * porPagina + 1}–{Math.min((pagina + 1) * porPagina, movs.length)} de {movs.length}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={pagina === 0} onClick={() => setPagina((p) => p - 1)}>Anterior</Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={(pagina + 1) * porPagina >= movs.length}
                      onClick={() => setPagina((p) => p + 1)}
                    >
                      Próximos
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>


      <Dialog open={fecharOpen} onOpenChange={setFecharOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-serif">Fechar caixa</DialogTitle></DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              fechar.mutate({
                informado: Number(String(fd.get("informado") ?? "0").replace(",", ".")) || 0,
                obs: String(fd.get("obs") ?? ""),
              });
            }}
          >
            <div className="rounded-md bg-muted p-3 text-sm space-y-1">
              <p><span className="text-muted-foreground">Abertura:</span> <b>{brl(caixa.valor_abertura)}</b> <span className="text-xs text-muted-foreground">(não lançado no financeiro)</span></p>
              <p><span className="text-muted-foreground">Recebido no turno:</span> <b>{brl(t.totalEntradas)}</b></p>
              <p><span className="text-muted-foreground">Saldo esperado em dinheiro:</span> <b>{brl(t.saldoGaveta)}</b></p>
            </div>
            <div className="space-y-2">
              <Label>Valor conferido na gaveta</Label>
              <Input name="informado" type="number" step="0.01" min="0" defaultValue={t.saldoGaveta.toFixed(2)} required />
            </div>
            <div className="space-y-2"><Label>Observações</Label><Textarea name="obs" rows={2} /></div>
            <DialogFooter>
              <Button type="submit" disabled={fechar.isPending}>{fechar.isPending ? "Fechando..." : "Confirmar fechamento"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!movCancelar} onOpenChange={(o) => { if (!o) setMovCancelar(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-serif">Cancelar recebimento</DialogTitle></DialogHeader>
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const mov = movCancelar;
              if (!mov) return;
              if (!isAdmin) {
                setValidando(true);
                try {
                  const r = await verificarAdmin({ data: { email: admEmail, senha: admSenha } });
                  if (!r.ok) {
                    toast.error(r.motivo === "sem_permissao" ? "Este usuário não é administrador" : "E-mail ou senha inválidos");
                    return;
                  }
                } catch (err: any) {
                  toast.error("Não foi possível validar", { description: err?.message });
                  return;
                } finally {
                  setValidando(false);
                }
              }
              setMovCancelar(null);
              cancelar.mutate(mov);
            }}
          >
            <div className="rounded-md bg-muted p-3 text-sm">
              <p className="truncate">{movCancelar?.descricao}</p>
              <p className="text-muted-foreground">Valor: <b>{movCancelar ? brl(movCancelar.valor) : ""}</b> — a parcela voltará para em aberto.</p>
            </div>
            {!isAdmin && (
              <>
                <p className="text-sm text-muted-foreground">Esta ação exige autorização de um administrador.</p>
                <div className="space-y-2">
                  <Label>E-mail do administrador</Label>
                  <Input type="email" autoComplete="off" value={admEmail} onChange={(e) => setAdmEmail(e.target.value)} required maxLength={255} />
                </div>
                <div className="space-y-2">
                  <Label>Senha do administrador</Label>
                  <Input type="password" autoComplete="off" value={admSenha} onChange={(e) => setAdmSenha(e.target.value)} required maxLength={200} />
                </div>
              </>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setMovCancelar(null)}>Voltar</Button>
              <Button type="submit" variant="destructive" disabled={validando || cancelar.isPending}>
                {validando ? "Validando..." : "Confirmar cancelamento"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KPI({ title, value, accent, muted }: { title: string; value: string; accent?: "success" | "destructive" | "gold"; muted?: boolean }) {
  const cls = muted ? "text-muted-foreground" : accent === "success" ? "text-success" : accent === "destructive" ? "text-destructive" : accent === "gold" ? "text-gold" : "";
  return (
    <Card className="border-border/60 shadow-soft">
      <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle></CardHeader>
      <CardContent><div className={`font-serif text-2xl font-semibold ${cls}`}>{value}</div></CardContent>
    </Card>
  );
}

function TipoBadge({ tipo }: { tipo: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    entrada: { label: "Recebimento", cls: "bg-success/15 text-success border-success/30" },
    sangria: { label: "Sangria", cls: "bg-destructive/15 text-destructive border-destructive/30" },
    suprimento: { label: "Suprimento", cls: "bg-gold/15 text-gold border-gold/30" },
    cancelado: { label: "Cancelado", cls: "bg-muted text-muted-foreground line-through" },

  };
  const v = map[tipo] ?? { label: tipo, cls: "" };
  return <Badge variant="outline" className={v.cls}>{v.label}</Badge>;
}

/* --------------------------- Receber mensalidade --------------------------- */

type ParcelaPreview = {
  id: string; codigo: number; competencia: string; vencimento: string; valor: number; status: string;
  associado_id: string; associados?: { nome: string; codigo: number } | null;
};

function ReceberParcelaCard({ caixa }: { caixa: Caixa }) {
  const qc = useQueryClient();
  const [busca, setBusca] = useState("");
  const [termo, setTermo] = useState("");
  const [assoc, setAssoc] = useState<{ id: string; nome: string; codigo: number } | null>(null);
  const [sel, setSel] = useState<Record<string, boolean>>({});
  const [forma, setForma] = useState("dinheiro");

  const { data: associados = [], isFetching: buscando } = useQuery({
    queryKey: ["caixa-busca-assoc", termo],
    enabled: termo.trim().length >= 2 && !assoc,
    queryFn: async () => {
      const t = termo.trim();
      const num = Number(t);
      let q = supabase.from("associados").select("id, nome, codigo").order("nome").limit(20);
      q = Number.isFinite(num) && t !== "" && /^\d+$/.test(t)
        ? q.or(`codigo.eq.${num},nome.ilike.%${t}%`)
        : q.ilike("nome", `%${t}%`);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as { id: string; nome: string; codigo: number }[];
    },
  });

  const { data: parcelas = [], isLoading: loadingParcelas } = useQuery({
    queryKey: ["caixa-parcelas-abertas", assoc?.id],
    enabled: !!assoc,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mensalidades")
        .select("id, codigo, competencia, vencimento, valor, status, associado_id, associados!inner(nome, codigo)")
        .eq("associado_id", assoc!.id)
        .neq("status", "pago")
        .neq("status", "cancelado")
        .order("vencimento");
      if (error) throw error;
      return (data ?? []) as unknown as ParcelaPreview[];
    },
  });

  const selecionadas = parcelas.filter((p) => sel[p.id]);
  const totalSel = selecionadas.reduce((s, p) => s + Number(p.valor), 0);
  const valorRecebido = valorRec.trim() === "" ? totalSel : Number(valorRec.replace(",", "."));
  const valorValido = Number.isFinite(valorRecebido) && valorRecebido > 0;

  const receber = useMutation({
    mutationFn: async () => {
      if (selecionadas.length === 0) throw new Error("Selecione ao menos uma parcela");
      if (!valorValido) throw new Error("Informe um valor recebido válido");
      const hoje = new Date().toISOString().slice(0, 10);
      const selIds = new Set(selecionadas.map((p) => p.id));
      // ordem: selecionadas por vencimento, depois demais em aberto (para abater excedente)
      const fila = [
        ...selecionadas.slice().sort((a, b) => a.vencimento.localeCompare(b.vencimento)),
        ...parcelas.filter((p) => !selIds.has(p.id)).sort((a, b) => a.vencimento.localeCompare(b.vencimento)),
      ];

      let restante = Math.round(valorRecebido * 100) / 100;
      const pagas: ParcelaPreview[] = [];

      for (const p of fila) {
        if (restante <= 0.001) break;
        const valorParcela = Number(p.valor);
        const aplicado = Math.min(restante, valorParcela);
        const diff = Math.round((valorParcela - aplicado) * 100) / 100;

        const { error: e1 } = await supabase.from("mensalidades").update({
          status: "pago", data_pagamento: hoje, forma_pagamento: forma,
          valor: aplicado,
          agente_recebimento: `Caixa — ${caixa.operador_nome}`,
          ...(diff > 0 ? { observacoes: `Pagamento parcial — saldo de ${brl(diff)} lançado em nova parcela` } : {}),
        } as any).eq("id", p.id);
        if (e1) throw e1;

        const { error: e2 } = await supabase.from("caixa_movimentos").insert({
          caixa_id: caixa.id,
          tipo: "entrada",
          descricao: `Parcela #${p.codigo} — ${p.associados?.nome ?? assoc?.nome ?? ""} (${competenciaLabel(p.competencia)})${diff > 0 ? " — pagamento parcial" : ""}`,
          valor: aplicado,
          forma_pagamento: forma,
          mensalidade_id: p.id,
          associado_id: p.associado_id,
        } as any);
        if (e2) throw e2;

        if (diff > 0.001) {
          const d = new Date(p.vencimento + "T00:00:00");
          d.setMonth(d.getMonth() + 1);
          const novoVenc = d.toISOString().slice(0, 10);
          const { error: e3 } = await supabase.from("mensalidades").insert({
            associado_id: p.associado_id,
            competencia: novoVenc.slice(0, 7) + "-01",
            vencimento: novoVenc,
            valor: diff,
            status: "pendente",
            observacoes: `Diferença de pagamento parcial da parcela #${p.codigo}`,
          } as any);
          if (e3) throw e3;
        }

        pagas.push({ ...p, valor: aplicado });
        restante = Math.round((restante - aplicado) * 100) / 100;
      }

      return { pagas, restante };
    },
    onSuccess: ({ pagas, restante }) => {
      qc.invalidateQueries({ queryKey: ["caixa-movs", caixa.id] });
      qc.invalidateQueries({ queryKey: ["caixa-parcelas-abertas"] });
      qc.invalidateQueries({ queryKey: ["mensalidades"] });
      setSel({});
      setValorRec("");
      toast.success(`${pagas.length} recebimento(s) registrado(s)`, {
        description: restante > 0.001 ? `Sobra de ${brl(restante)} não aplicada (sem parcelas em aberto)` : undefined,
      });
      printComprovanteLote(caixa, pagas, forma);
    },
    onError: (e: any) => toast.error("Erro", { description: e.message }),
  });


  return (
    <Card className="border-border/60 shadow-soft">
      <CardHeader><CardTitle className="font-serif text-base">Receber mensalidade no balcão</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label>Buscar associado (nome ou código)</Label>
          <div className="flex gap-2">
            <Input value={busca} placeholder="Ex: Maria Silva ou 1024"
              onChange={(e) => { setBusca(e.target.value); if (assoc) { setAssoc(null); setSel({}); } }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); setTermo(busca); } }} />
            <Button type="button" variant="outline" onClick={() => setTermo(busca)}><Search className="h-4 w-4" /></Button>
          </div>
        </div>

        {!assoc && termo.trim().length >= 2 && (
          <div className="max-h-48 overflow-auto rounded-md border">
            {buscando ? (
              <p className="p-3 text-sm text-muted-foreground">Buscando...</p>
            ) : associados.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">Nenhum associado encontrado.</p>
            ) : associados.map((a) => (
              <button key={a.id} type="button"
                className="flex w-full items-center justify-between gap-2 border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-muted"
                onClick={() => { setAssoc(a); setSel({}); setBusca(a.nome); }}>
                <span>{a.nome}</span>
                <span className="text-xs text-muted-foreground">#{String(a.codigo).padStart(4, "0")}</span>
              </button>
            ))}
          </div>
        )}

        {assoc && (
          <div className="space-y-3 rounded-md border p-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <p><span className="text-muted-foreground">Associado:</span> <b>{assoc.nome}</b></p>
              <Button size="sm" variant="ghost" onClick={() => { setAssoc(null); setSel({}); }}>Trocar</Button>
            </div>
            {loadingParcelas ? (
              <p className="text-muted-foreground">Carregando parcelas...</p>
            ) : parcelas.length === 0 ? (
              <p className="text-muted-foreground">Nenhuma parcela em aberto.</p>
            ) : (
              <div className="max-h-60 overflow-auto rounded-md border">
                {parcelas.map((p) => (
                  <label key={p.id} className="flex cursor-pointer items-center gap-3 border-b px-3 py-2 last:border-b-0 hover:bg-muted">
                    <input type="checkbox" className="h-4 w-4 accent-primary"
                      checked={!!sel[p.id]}
                      onChange={(e) => setSel((s) => ({ ...s, [p.id]: e.target.checked }))} />
                    <span className="flex-1">
                      <span className="font-medium">#{p.codigo}</span>{" "}
                      <span className="capitalize">{competenciaLabel(p.competencia)}</span>
                      <span className="block text-xs text-muted-foreground">venc. {fmtDate(p.vencimento)} · {p.status}</span>
                    </span>
                    <span className="font-medium">{brl(p.valor)}</span>
                  </label>
                ))}
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-xs">Forma de pagamento</Label>
              <Select value={forma} onValueChange={setForma}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="cartao">Cartão</SelectItem>
                  <SelectItem value="transferencia">Transferência</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-md bg-muted px-3 py-2">
              <span className="text-muted-foreground">{selecionadas.length} parcela(s) selecionada(s)</span>
              <b>{brl(totalSel)}</b>
            </div>
            <Button className="w-full" onClick={() => receber.mutate()} disabled={receber.isPending || selecionadas.length === 0}>
              {receber.isPending ? "Registrando..." : "Confirmar recebimento"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


/* ---------------------------- Lançamento avulso ---------------------------- */

function MovimentoAvulsoCard({ caixa }: { caixa: Caixa }) {
  const qc = useQueryClient();
  const add = useMutation({
    mutationFn: async (p: { tipo: string; descricao: string; valor: number; forma: string }) => {
      if (p.valor <= 0) throw new Error("Informe um valor válido");
      const { error } = await supabase.from("caixa_movimentos").insert({
        caixa_id: caixa.id, tipo: p.tipo, descricao: p.descricao, valor: p.valor, forma_pagamento: p.forma,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["caixa-movs", caixa.id] });
      toast.success("Lançamento registrado");
    },
    onError: (e: any) => toast.error("Erro", { description: e.message }),
  });

  return (
    <Card className="border-border/60 shadow-soft">
      <CardHeader><CardTitle className="font-serif text-base">Lançamento avulso</CardTitle></CardHeader>
      <CardContent>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const fd = new FormData(form);
            add.mutate({
              tipo: String(fd.get("tipo")),
              descricao: String(fd.get("descricao")),
              valor: Number(String(fd.get("valor") ?? "0").replace(",", ".")) || 0,
              forma: String(fd.get("forma")),
            }, { onSuccess: () => form.reset() });
          }}
        >
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select name="tipo" defaultValue="entrada">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="entrada">Recebimento avulso (entra no financeiro)</SelectItem>
                <SelectItem value="suprimento">Suprimento / reforço de troco</SelectItem>
                <SelectItem value="sangria">Sangria / retirada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Descrição</Label><Input name="descricao" required placeholder="Ex: taxa de adesão, retirada para o cofre..." /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Valor</Label><Input name="valor" type="number" step="0.01" min="0" required /></div>
            <div className="space-y-2">
              <Label>Forma</Label>
              <Select name="forma" defaultValue="dinheiro">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="cartao">Cartão</SelectItem>
                  <SelectItem value="transferencia">Transferência</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button type="submit" className="w-full" variant="outline" disabled={add.isPending}>
            <Plus className="mr-2 h-4 w-4" />Registrar
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

/* -------------------------------- Histórico -------------------------------- */

function HistoricoSection() {
  const [detalhe, setDetalhe] = useState<Caixa | null>(null);
  const { data: lista = [], isLoading } = useQuery({
    queryKey: ["caixas-historico"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("caixa_sessoes")
        .select("*")
        .order("aberto_em", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as Caixa[];
    },
  });

  if (isLoading) return <SkeletonTable rows={5} />;
  if (lista.length === 0) return <EmptyState title="Nenhum caixa registrado" message="Abra um caixa na aba de operação." />;

  return (
    <>
      <Card className="border-border/60 shadow-soft">
        <CardContent className="p-0 sm:p-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Abertura</TableHead>
                  <TableHead>Operador</TableHead>
                  <TableHead>Fechamento</TableHead>
                  <TableHead className="text-right">Valor abertura</TableHead>
                  <TableHead className="text-right">Conferido</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="whitespace-nowrap">{new Date(c.aberto_em).toLocaleString("pt-BR")}</TableCell>
                    <TableCell>{c.operador_nome}</TableCell>
                    <TableCell className="whitespace-nowrap">{c.fechado_em ? new Date(c.fechado_em).toLocaleString("pt-BR") : "—"}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{brl(c.valor_abertura)}</TableCell>
                    <TableCell className="text-right">{c.valor_fechamento_informado != null ? brl(c.valor_fechamento_informado) : "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={c.status === "aberto" ? "border-success/30 bg-success/15 text-success" : "bg-muted text-muted-foreground"}>
                        {c.status === "aberto" ? "Aberto" : "Fechado"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => setDetalhe(c)}>Detalhes</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      {detalhe && <DetalheDialog caixa={detalhe} onClose={() => setDetalhe(null)} />}
    </>
  );
}

function DetalheDialog({ caixa, onClose }: { caixa: Caixa; onClose: () => void }) {
  const { data: movs = [] } = useQuery({
    queryKey: ["caixa-movs", caixa.id],
    queryFn: async () => {
      const { data } = await supabase.from("caixa_movimentos").select("*").eq("caixa_id", caixa.id).order("created_at");
      return (data ?? []) as unknown as Movimento[];
    },
  });
  const t = totais(movs, Number(caixa.valor_abertura));
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle className="font-serif">Caixa de {caixa.operador_nome}</DialogTitle></DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="rounded-md bg-muted p-3">
            <p><span className="text-muted-foreground">Abertura:</span> {new Date(caixa.aberto_em).toLocaleString("pt-BR")} · <b>{brl(caixa.valor_abertura)}</b> <span className="text-xs">(fora do financeiro)</span></p>
            <p><span className="text-muted-foreground">Recebido no turno:</span> <b>{brl(t.totalEntradas)}</b></p>
            <p><span className="text-muted-foreground">Sangrias:</span> {brl(t.sangrias)} · <span className="text-muted-foreground">Suprimentos:</span> {brl(t.suprimentos)}</p>
            <p><span className="text-muted-foreground">Conferido no fechamento:</span> {caixa.valor_fechamento_informado != null ? brl(caixa.valor_fechamento_informado) : "—"}</p>
          </div>
          <div className="max-h-80 overflow-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Hora</TableHead><TableHead>Tipo</TableHead><TableHead>Descrição</TableHead><TableHead className="text-right">Valor</TableHead></TableRow></TableHeader>
              <TableBody>
                {movs.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-xs">{new Date(m.created_at).toLocaleTimeString("pt-BR")}</TableCell>
                    <TableCell><TipoBadge tipo={m.tipo} /></TableCell>
                    <TableCell className="max-w-[260px] truncate">{m.descricao}</TableCell>
                    <TableCell className="text-right">{brl(m.valor)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => printCaixa(caixa, movs)}><Printer className="mr-2 h-4 w-4" />Imprimir relatório</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* --------------------------------- Impressão -------------------------------- */

function openPrint(html: string) {
  const w = window.open("", "_blank", "width=820,height=900");
  if (!w) { toast.error("Permita pop-ups para imprimir"); return; }
  w.document.write(`<html><head><title>Caixa</title></head><body style="font-family:Arial,sans-serif;padding:24px">${html}</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 400);
}

async function printCaixa(caixa: Caixa, movs: Movimento[]) {
  const header = await getEmpresaHeaderHTML();
  const t = totais(movs, Number(caixa.valor_abertura));
  const linhas = movs.map((m) => `<tr>
    <td>${new Date(m.created_at).toLocaleTimeString("pt-BR")}</td>
    <td>${m.tipo}</td>
    <td>${m.descricao}</td>
    <td>${m.forma_pagamento}</td>
    <td style="text-align:right">${brl(m.valor)}</td>
  </tr>`).join("");
  openPrint(`${header}
    <h2 style="font-size:16px;margin:0 0 8px">Relatório de Caixa</h2>
    <p style="font-size:12px;margin:0 0 4px">Operador: <b>${caixa.operador_nome}</b></p>
    <p style="font-size:12px;margin:0 0 4px">Abertura: ${new Date(caixa.aberto_em).toLocaleString("pt-BR")} — ${caixa.fechado_em ? `Fechamento: ${new Date(caixa.fechado_em).toLocaleString("pt-BR")}` : "Em aberto"}</p>
    <table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:12px" border="1" cellpadding="6">
      <thead style="background:#eee"><tr><th>Hora</th><th>Tipo</th><th>Descrição</th><th>Forma</th><th style="text-align:right">Valor</th></tr></thead>
      <tbody>${linhas || `<tr><td colspan="5">Sem movimentações</td></tr>`}</tbody>
    </table>
    <div style="margin-top:14px;font-size:13px">
      <p>Valor de abertura (troco, fora do financeiro): <b>${brl(caixa.valor_abertura)}</b></p>
      <p>Total recebido no turno (lançado no financeiro): <b>${brl(t.totalEntradas)}</b></p>
      <p>Sangrias: ${brl(t.sangrias)} · Suprimentos: ${brl(t.suprimentos)}</p>
      <p>Saldo esperado em dinheiro: <b>${brl(t.saldoGaveta)}</b></p>
      ${caixa.valor_fechamento_informado != null ? `<p>Valor conferido: <b>${brl(caixa.valor_fechamento_informado)}</b></p>` : ""}
    </div>
    <div style="margin-top:48px;font-size:12px">____________________________________<br/>${caixa.operador_nome}</div>`);
}

async function printComprovanteLote(caixa: Caixa, parcelas: ParcelaPreview[], forma: string) {
  const header = await getEmpresaHeaderHTML();
  const total = parcelas.reduce((s, p) => s + Number(p.valor), 0);
  const linhas = parcelas.map((p) => `<tr>
    <td>#${p.codigo}</td>
    <td>${competenciaLabel(p.competencia)}</td>
    <td>${fmtDate(p.vencimento)}</td>
    <td style="text-align:right">${brl(p.valor)}</td>
  </tr>`).join("");
  const a = parcelas[0]?.associados;
  openPrint(`${header}
    <h2 style="font-size:16px;margin:0 0 10px">Comprovante de Pagamento</h2>
    <p style="font-size:13px;margin:0 0 4px">Associado: <b>${a?.nome ?? ""}</b>${a?.codigo ? ` (#${String(a.codigo).padStart(4, "0")})` : ""}</p>
    <p style="font-size:13px;margin:0 0 10px">Forma: ${forma} · Data: ${new Date().toLocaleString("pt-BR")}</p>
    <table style="width:100%;border-collapse:collapse;font-size:13px" border="1" cellpadding="6">
      <thead style="background:#eee"><tr><th>Parcela</th><th>Competência</th><th>Vencimento</th><th style="text-align:right">Valor</th></tr></thead>
      <tbody>${linhas}</tbody>
      <tfoot><tr><td colspan="3" style="text-align:right"><b>Total</b></td><td style="text-align:right"><b>${brl(total)}</b></td></tr></tfoot>
    </table>
    <p style="font-size:13px;margin-top:8px">Recebido por: ${caixa.operador_nome} (caixa)</p>
    <div style="margin-top:48px;font-size:12px">____________________________________<br/>${caixa.operador_nome}</div>`);
}

async function printComprovanteMov(caixa: Caixa, m: Movimento) {
  const header = await getEmpresaHeaderHTML();
  openPrint(`${header}
    <h2 style="font-size:16px;margin:0 0 10px">Comprovante — ${m.tipo === "cancelado" ? "Recebimento cancelado" : "Movimentação de caixa"}</h2>
    <table style="width:100%;border-collapse:collapse;font-size:13px" border="1" cellpadding="6">
      <tr><td>Descrição</td><td>${m.descricao}</td></tr>
      <tr><td>Tipo</td><td>${m.tipo}</td></tr>
      <tr><td>Valor</td><td><b>${brl(m.valor)}</b></td></tr>
      <tr><td>Forma</td><td>${m.forma_pagamento}</td></tr>
      <tr><td>Data</td><td>${new Date(m.created_at).toLocaleString("pt-BR")}</td></tr>
      <tr><td>Recebido por</td><td>${caixa.operador_nome} (caixa)</td></tr>
    </table>
    <div style="margin-top:48px;font-size:12px">____________________________________<br/>${caixa.operador_nome}</div>`);
}

