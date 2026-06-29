import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, BookOpen, Plus, Printer, ArrowLeft, History, Eye, Users, Pencil, Trash2, Smartphone, ClipboardCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { brl, fmtDate, competenciaLabel } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/recebimento")({
  head: () => ({ meta: [{ title: "Recebimento — Memorial" }] }),
  component: RecebimentoPage,
});

function RecebimentoPage() {
  const [tab, setTab] = useState<"baixa" | "carne" | "historico" | "cobradores" | "mobile" | "conciliar">("baixa");

  return (
    <AppShell title="Recebimento" subtitle="Recebimento mobile, conciliação, baixas, carnês e cobradores">
      <div className="mb-4 flex flex-wrap gap-2">
        <Button variant={tab === "mobile" ? "default" : "outline"} onClick={() => setTab("mobile")}>
          <Smartphone className="mr-2 h-4 w-4" />Recebimento mobile
        </Button>
        <Button variant={tab === "conciliar" ? "default" : "outline"} onClick={() => setTab("conciliar")}>
          <ClipboardCheck className="mr-2 h-4 w-4" />Conciliação (supervisor)
        </Button>
        <Button variant={tab === "baixa" ? "default" : "outline"} onClick={() => setTab("baixa")}>
          <CheckCircle2 className="mr-2 h-4 w-4" />Baixa por agente
        </Button>
        <Button variant={tab === "historico" ? "default" : "outline"} onClick={() => setTab("historico")}>
          <History className="mr-2 h-4 w-4" />Histórico de baixas
        </Button>
        <Button variant={tab === "carne" ? "default" : "outline"} onClick={() => setTab("carne")}>
          <BookOpen className="mr-2 h-4 w-4" />Gerar carnês em massa
        </Button>
        <Button variant={tab === "cobradores" ? "default" : "outline"} onClick={() => setTab("cobradores")}>
          <Users className="mr-2 h-4 w-4" />Cadastro de cobradores
        </Button>
      </div>

      {tab === "mobile" && <MobileRecebimentoSection />}
      {tab === "conciliar" && <ConciliacaoSection />}
      {tab === "baixa" && <BaixaWizard />}
      {tab === "historico" && <HistoricoSection />}
      {tab === "carne" && <CarneSection />}
      {tab === "cobradores" && <CobradoresSection />}
    </AppShell>
  );
}


type Cobrador = { id: string; nome: string; telefone: string | null; documento: string | null; observacoes: string | null; ativo: boolean };

function CobradoresSection() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Cobrador | null>(null);
  const [stats, setStats] = useState<Cobrador | null>(null);
  const [statsMes, setStatsMes] = useState<string>(() => new Date().toISOString().slice(0, 7));

  const { data: lista = [], isLoading } = useQuery({
    queryKey: ["cobradores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cobradores").select("*").order("nome");
      if (error) throw error;
      return data as Cobrador[];
    },
  });

  const save = useMutation({
    mutationFn: async (payload: any) => {
      if (editing) {
        const { error } = await supabase.from("cobradores").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("cobradores").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cobradores"] });
      setOpen(false); setEditing(null);
      toast.success("Cobrador salvo");
    },
    onError: (e: any) => toast.error("Erro", { description: e.message }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cobradores").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["cobradores"] }); toast.success("Excluído"); },
    onError: (e: any) => toast.error("Erro", { description: e.message }),
  });

  return (
    <Card className="border-border/60 shadow-soft">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-serif">Cobradores</CardTitle>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Novo cobrador</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-serif">{editing ? "Editar" : "Novo"} cobrador</DialogTitle></DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                save.mutate({
                  nome: String(fd.get("nome") || "").trim(),
                  telefone: String(fd.get("telefone") || "") || null,
                  documento: String(fd.get("documento") || "") || null,
                  observacoes: String(fd.get("observacoes") || "") || null,
                  ativo: fd.get("ativo") === "on",
                });
              }}
            >
              <div className="space-y-2"><Label>Nome</Label><Input name="nome" required defaultValue={editing?.nome ?? ""} /></div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2"><Label>Telefone</Label><Input name="telefone" defaultValue={editing?.telefone ?? ""} /></div>
                <div className="space-y-2"><Label>Documento (CPF/RG)</Label><Input name="documento" defaultValue={editing?.documento ?? ""} /></div>
              </div>
              <div className="space-y-2"><Label>Observações</Label><Textarea name="observacoes" rows={2} defaultValue={editing?.observacoes ?? ""} /></div>
              <div className="flex items-center gap-2">
                <input type="checkbox" name="ativo" id="ativo" defaultChecked={editing ? editing.ativo : true} className="h-4 w-4" />
                <Label htmlFor="ativo">Ativo</Label>
              </div>
              <DialogFooter><Button type="submit" disabled={save.isPending}>{save.isPending ? "Salvando..." : "Salvar"}</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Carregando...</TableCell></TableRow>}
            {!isLoading && lista.length === 0 && <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">Nenhum cobrador cadastrado.</TableCell></TableRow>}
            {lista.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.nome}</TableCell>
                <TableCell>{c.telefone ?? "—"}</TableCell>
                <TableCell>{c.documento ?? "—"}</TableCell>
                <TableCell>{c.ativo ? <Badge className="bg-success/15 text-success border-success/30" variant="outline">Ativo</Badge> : <Badge variant="outline">Inativo</Badge>}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" onClick={() => setStats(c)}><Eye className="mr-1 h-4 w-4" />Recebido no mês</Button>
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(c); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => { if (confirm("Excluir cobrador?")) del.mutate(c.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      {stats && <CobradorStatsDialog cobrador={stats} mes={statsMes} setMes={setStatsMes} onClose={() => setStats(null)} />}
    </Card>
  );
}

function CobradorStatsDialog({ cobrador, mes, setMes, onClose }: { cobrador: Cobrador; mes: string; setMes: (v: string) => void; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["cobrador-stats", cobrador.nome, mes],
    queryFn: async () => {
      const ini = `${mes}-01`;
      const d = new Date(ini + "T00:00:00"); d.setMonth(d.getMonth() + 1);
      const fim = d.toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("baixa_sessoes")
        .select("total_qtd,total_valor,data_recebimento")
        .eq("agente", cobrador.nome)
        .gte("data_recebimento", ini)
        .lt("data_recebimento", fim);
      if (error) throw error;
      const qtd = (data ?? []).reduce((s, r: any) => s + Number(r.total_qtd || 0), 0);
      const valor = (data ?? []).reduce((s, r: any) => s + Number(r.total_valor || 0), 0);
      return { qtd, valor, sessoes: data?.length ?? 0 };
    },
  });

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-serif">Recebido no mês — {cobrador.nome}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Mês</Label><Input type="month" value={mes} onChange={(e) => setMes(e.target.value)} /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-primary/40 bg-primary/5 px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Quantidade de parcelas</div>
              <div className="text-3xl font-bold text-primary">{isLoading ? "..." : data?.qtd ?? 0}</div>
            </div>
            <div className="rounded-lg border border-success/40 bg-success/5 px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Total recebido</div>
              <div className="text-3xl font-bold text-success">{isLoading ? "..." : brl(data?.valor ?? 0)}</div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{data?.sessoes ?? 0} sessão(ões) de baixa neste mês.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============= Baixa Wizard =============

type Session = { agente: string; data: string; responsavel: string; responsavelId?: string };
type RecebItem = {
  mensalidadeId: string;
  codigo: number;
  associadoId: string;
  associado: string;
  codAssoc: number;
  competencia: string;
  vencimento: string;
  valorOriginal: number;
  valorRecebido: number;
  diferenca: number;
  acao: "Quitada" | "Quitada + abate na próxima" | "Parcial + nova parcela gerada";
};

function BaixaWizard() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [session, setSession] = useState<Session | null>(null);
  const [items, setItems] = useState<RecebItem[]>([]);
  const [finalizing, setFinalizing] = useState(false);
  const qc = useQueryClient();

  const [responsavel, setResponsavel] = useState("");
  const [responsavelId, setResponsavelId] = useState<string | undefined>();
  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setResponsavelId(u.user.id);
      const { data: p } = await supabase.from("profiles").select("nome,email").eq("id", u.user.id).maybeSingle();
      setResponsavel(p?.nome || p?.email || u.user.email || "");
    })();
  }, []);

  async function finalize() {
    if (!session || items.length === 0) { toast.error("Nenhuma parcela registrada."); return; }
    setFinalizing(true);
    try {
      // Aplica todas as baixas no banco agora
      for (const i of items) {
        const baseUpd = { status: "pago" as const, data_pagamento: session.data, agente_recebimento: session.agente };
        if (i.diferenca === 0) {
          const { error } = await supabase.from("mensalidades").update(baseUpd).eq("id", i.mensalidadeId);
          if (error) throw error;
        } else if (i.diferenca > 0) {
          // Excesso: quita esta e abate na próxima
          const { error } = await supabase.from("mensalidades").update(baseUpd).eq("id", i.mensalidadeId);
          if (error) throw error;
          const excesso = i.diferenca;
          const { data: nx } = await supabase.from("mensalidades")
            .select("id, valor").eq("associado_id", i.associadoId)
            .in("status", ["pendente", "atrasado"])
            .gt("vencimento", i.vencimento)
            .order("vencimento", { ascending: true }).limit(1);
          const next: any = nx?.[0];
          if (next) {
            const novo = Math.max(0, Number(next.valor) - excesso);
            if (novo === 0) {
              await supabase.from("mensalidades").update({ ...baseUpd, observacoes: `Quitada por excedente de ${brl(excesso)}` }).eq("id", next.id);
            } else {
              await supabase.from("mensalidades").update({ valor: novo, observacoes: `Abatido ${brl(excesso)} de excedente da parcela anterior` }).eq("id", next.id);
            }
          }
        } else {
          // Parcial: quita com valor parcial e gera nova
          const diff = -i.diferenca;
          const { error } = await supabase.from("mensalidades").update({ ...baseUpd, valor: i.valorRecebido, observacoes: `Pagamento parcial. Diferença de ${brl(diff)} gerada em nova parcela.` }).eq("id", i.mensalidadeId);
          if (error) throw error;
          const { data: nx } = await supabase.from("mensalidades")
            .select("vencimento").eq("associado_id", i.associadoId)
            .in("status", ["pendente", "atrasado"])
            .gt("vencimento", i.vencimento)
            .order("vencimento", { ascending: true }).limit(1);
          let novoVenc = nx?.[0]?.vencimento as string | undefined;
          if (!novoVenc) {
            const d = new Date(i.vencimento + "T00:00:00"); d.setMonth(d.getMonth() + 1);
            novoVenc = d.toISOString().slice(0, 10);
          }
          const comp = novoVenc.slice(0, 7) + "-01";
          await supabase.from("mensalidades").insert({
            associado_id: i.associadoId, competencia: comp, vencimento: novoVenc, valor: diff,
            status: "pendente", observacoes: `Diferença de pagamento parcial da parcela #${i.codigo}`,
          });
        }
      }

      // Registra sessão de baixa no histórico
      const total = items.reduce((s, x) => s + x.valorRecebido, 0);
      await supabase.from("baixa_sessoes").insert({
        agente: session.agente,
        data_recebimento: session.data,
        responsavel_id: session.responsavelId ?? null,
        responsavel_nome: session.responsavel,
        total_qtd: items.length,
        total_valor: total,
        itens: items as any,
      });

      qc.invalidateQueries({ queryKey: ["baixa-sessoes"] });
      imprimirRelatorio(session, items);
      setStep(3);
      toast.success("Baixa concluída", { description: `${items.length} parcela(s) — ${brl(total)}` });
    } catch (e: any) {
      toast.error("Erro ao finalizar", { description: e.message });
    } finally {
      setFinalizing(false);
    }
  }

  const { data: cobradores = [] } = useQuery({
    queryKey: ["cobradores", "ativos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cobradores").select("id,nome").eq("ativo", true).order("nome");
      if (error) throw error;
      return data as { id: string; nome: string }[];
    },
  });

  if (step === 1) {
    return (
      <Card className="border-border/60 shadow-soft">
        <CardHeader><CardTitle className="font-serif">Nova baixa</CardTitle></CardHeader>
        <CardContent>
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const agente = String(fd.get("agente") || "").trim();
              const data = String(fd.get("data") || "");
              if (!agente || !data) { toast.error("Selecione o cobrador e a data."); return; }
              setSession({ agente, data, responsavel, responsavelId });
              setItems([]);
              setStep(2);
            }}
          >
            <div className="space-y-2">
              <Label>Agente de recebimento (cobrador)</Label>
              {cobradores.length === 0 ? (
                <div className="rounded border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  Nenhum cobrador ativo. Cadastre um na aba "Cadastro de cobradores".
                </div>
              ) : (
                <Select name="agente" required>
                  <SelectTrigger><SelectValue placeholder="Selecione o cobrador" /></SelectTrigger>
                  <SelectContent>
                    {cobradores.map((c) => <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2"><Label>Data do recebimento</Label><Input name="data" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></div>
            <div className="space-y-2 md:col-span-2"><Label>Responsável pela baixa</Label><Input value={responsavel} disabled /></div>
            <div className="md:col-span-2"><Button type="submit" disabled={cobradores.length === 0}><Plus className="mr-2 h-4 w-4" />Iniciar baixa</Button></div>
          </form>
        </CardContent>
      </Card>
    );
  }

  if (step === 2 && session) {
    return (
      <BaixaEntrada
        session={session}
        items={items}
        setItems={setItems}
        onCancel={() => { setStep(1); setItems([]); setSession(null); }}
        onFinalize={finalize}
        finalizing={finalizing}
      />
    );
  }

  return (
    <Card className="border-border/60 shadow-soft">
      <CardHeader><CardTitle className="font-serif">Baixa concluída</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">Relatório aberto para impressão. {items.length} parcela(s) registradas — total {brl(items.reduce((s, i) => s + i.valorRecebido, 0))}.</p>
        <Button onClick={() => { setStep(1); setItems([]); setSession(null); }}><Plus className="mr-2 h-4 w-4" />Nova baixa</Button>
      </CardContent>
    </Card>
  );
}

function BaixaEntrada({ session, items, setItems, onCancel, onFinalize, finalizing }: {
  session: Session; items: RecebItem[]; setItems: (f: (x: RecebItem[]) => RecebItem[]) => void;
  onCancel: () => void; onFinalize: () => void; finalizing: boolean;
}) {
  const [codigo, setCodigo] = useState("");
  const [valor, setValor] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<any | null>(null);
  const [previewErr, setPreviewErr] = useState<string>("");

  const totais = useMemo(() => ({
    qtd: items.length,
    valor: items.reduce((s, i) => s + i.valorRecebido, 0),
  }), [items]);

  useEffect(() => {
    const cod = Number(codigo.trim());
    if (!cod || !Number.isFinite(cod)) { setPreview(null); setPreviewErr(""); return; }
    let cancel = false;
    const t = setTimeout(async () => {
      const { data, error } = await supabase
        .from("mensalidades")
        .select("id, codigo, competencia, vencimento, valor, status, associado_id, associados!inner(nome, codigo)")
        .eq("codigo", cod)
        .maybeSingle();
      if (cancel) return;
      if (error || !data) { setPreview(null); setPreviewErr("Parcela não encontrada"); return; }
      setPreview(data);
      setPreviewErr("");
      setValor((cur) => cur || String(Number((data as any).valor)));
    }, 250);
    return () => { cancel = true; clearTimeout(t); };
  }, [codigo]);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const cod = Number(codigo.trim());
    const v = Number(String(valor).replace(",", "."));
    if (!cod) { toast.error("Informe o código numérico da parcela."); return; }
    if (!v || v <= 0) { toast.error("Informe o valor recebido."); return; }
    if (!preview) { toast.error("Parcela não encontrada."); return; }
    if ((preview as any).status === "pago") { toast.error("Parcela já está paga."); return; }
    if (items.some((i) => i.mensalidadeId === (preview as any).id)) { toast.error("Parcela já adicionada nesta baixa."); return; }

    setBusy(true);
    try {
      const m: any = preview;
      const valorOriginal = Number(m.valor);
      const diferenca = v - valorOriginal;
      let acao: RecebItem["acao"] = "Quitada";
      if (diferenca > 0) acao = "Quitada + abate na próxima";
      else if (diferenca < 0) acao = "Parcial + nova parcela gerada";

      const item: RecebItem = {
        mensalidadeId: m.id,
        codigo: Number(m.codigo),
        associadoId: m.associado_id,
        associado: m.associados?.nome ?? "",
        codAssoc: m.associados?.codigo ?? 0,
        competencia: m.competencia,
        vencimento: m.vencimento,
        valorOriginal,
        valorRecebido: v,
        diferenca,
        acao,
      };
      setItems((prev) => [...prev, item]);
      setCodigo(""); setValor(""); setPreview(null); setPreviewErr("");
      toast.success("Parcela listada", { description: `${item.associado} · ${brl(v)} — baixa apenas ao concluir` });
    } finally {
      setBusy(false);
    }
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.mensalidadeId !== id));
  }

  return (
    <Card className="border-border/60 shadow-soft">
      <CardHeader>
        <CardTitle className="font-serif flex items-center justify-between">
          <span>Registrar parcelas — Agente: {session.agente}</span>
          <span className="text-sm font-sans text-muted-foreground">{fmtDate(session.data)}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded border border-gold/40 bg-gold/5 px-3 py-2 text-xs text-muted-foreground">
          Ao clicar em <b>OK</b> a parcela é apenas <b>listada</b> abaixo. A baixa só é efetivada quando você clicar em <b>Concluir e imprimir relatório</b>.
        </div>

        <form onSubmit={handleAdd} className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
          <div className="space-y-2"><Label>Código da parcela</Label><Input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Ex: 1024" autoFocus inputMode="numeric" /></div>
          <div className="space-y-2"><Label>Valor recebido (R$)</Label><Input value={valor} onChange={(e) => setValor(e.target.value)} type="number" step="0.01" min="0" /></div>
          <div className="flex items-end"><Button type="submit" disabled={busy || !preview || (preview as any)?.status === "pago"}>{busy ? "..." : "OK"}</Button></div>
        </form>

        {preview && (
          <div className={`rounded border px-3 py-2 text-sm flex flex-wrap gap-x-6 gap-y-1 ${(preview as any).status === "pago" ? "border-destructive/40 bg-destructive/5" : "border-primary/40 bg-primary/5"}`}>
            <span><span className="text-muted-foreground">Código:</span> <b>#{(preview as any).codigo}</b></span>
            <span><span className="text-muted-foreground">Associado:</span> <b>{(preview as any).associados?.nome}</b> <span className="text-xs text-muted-foreground">#{String((preview as any).associados?.codigo ?? "").padStart(4, "0")}</span></span>
            <span><span className="text-muted-foreground">Vencimento:</span> <b>{fmtDate((preview as any).vencimento)}</b></span>
            <span><span className="text-muted-foreground">Valor:</span> <b>{brl(Number((preview as any).valor))}</b></span>
            <span className="capitalize"><span className="text-muted-foreground">Status:</span> <b>{(preview as any).status}</b></span>
          </div>
        )}
        {!preview && previewErr && codigo && (
          <div className="rounded border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">{previewErr}</div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-primary/40 bg-primary/5 px-4 py-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Quantidade de parcelas</div>
            <div className="text-2xl font-bold text-primary">{totais.qtd}</div>
          </div>
          <div className="rounded-lg border border-success/40 bg-success/5 px-4 py-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Total recebido</div>
            <div className="text-2xl font-bold text-success">{brl(totais.valor)}</div>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Associado</TableHead>
              <TableHead>Competência</TableHead>
              <TableHead className="text-right">Parcela</TableHead>
              <TableHead className="text-right">Recebido</TableHead>
              <TableHead className="text-right">Diferença</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 && <TableRow><TableCell colSpan={8} className="py-6 text-center text-muted-foreground">Nenhuma parcela listada ainda.</TableCell></TableRow>}
            {items.map((i) => (
              <TableRow key={i.mensalidadeId}>
                <TableCell className="font-mono text-xs">{i.codigo}</TableCell>
                <TableCell>{i.associado} <span className="text-xs text-muted-foreground">#{String(i.codAssoc).padStart(4, "0")}</span></TableCell>
                <TableCell className="capitalize">{competenciaLabel(i.competencia)}</TableCell>
                <TableCell className="text-right">{brl(i.valorOriginal)}</TableCell>
                <TableCell className="text-right font-medium text-success">{brl(i.valorRecebido)}</TableCell>
                <TableCell className={`text-right ${i.diferenca === 0 ? "" : i.diferenca > 0 ? "text-primary" : "text-destructive"}`}>{i.diferenca === 0 ? "—" : brl(i.diferenca)}</TableCell>
                <TableCell className="text-xs">{i.acao}</TableCell>
                <TableCell><Button size="sm" variant="ghost" onClick={() => removeItem(i.mensalidadeId)}>Remover</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={onCancel} disabled={finalizing}><ArrowLeft className="mr-2 h-4 w-4" />Voltar</Button>
          <Button onClick={onFinalize} disabled={items.length === 0 || finalizing}><Printer className="mr-2 h-4 w-4" />{finalizing ? "Processando..." : "Concluir e imprimir relatório"}</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function imprimirRelatorio(session: Session, items: RecebItem[]) {
  const w = window.open("", "_blank", "width=900,height=800");
  if (!w) { toast.error("Permita pop-ups."); return; }
  const total = items.reduce((s, i) => s + i.valorRecebido, 0);
  const rows = items.map((i) => `
    <tr>
      <td>#${i.codigo}</td>
      <td>${i.associado}<br><span class="muted">#${String(i.codAssoc).padStart(4, "0")}</span></td>
      <td>${competenciaLabel(i.competencia)}</td>
      <td>${fmtDate(i.vencimento)}</td>
      <td class="r">${brl(i.valorOriginal)}</td>
      <td class="r"><b>${brl(i.valorRecebido)}</b></td>
      <td class="r">${i.diferenca === 0 ? "—" : brl(i.diferenca)}</td>
      <td>${i.acao}</td>
    </tr>`).join("");
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Relatório de Baixa — Memorial</title>
    <style>
      body{font-family:Georgia,serif;color:#111;margin:24px}
      h1{font-size:18px;color:#1e3a5f;margin:0 0 4px}
      .brand{letter-spacing:3px;text-transform:uppercase;color:#1e3a5f;font-weight:bold;font-size:12px}
      .meta{margin:12px 0;padding:10px;background:#f5f3ec;border:1px solid #ddd;border-radius:6px;font-size:12px;display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
      .meta div span{color:#666;display:block;font-size:10px}
      table{width:100%;border-collapse:collapse;font-size:11px;margin-top:10px}
      th,td{border:1px solid #ccc;padding:6px 8px;text-align:left;vertical-align:top}
      th{background:#1e3a5f;color:#fff;text-transform:uppercase;font-size:10px}
      .r{text-align:right}
      .muted{color:#888;font-size:10px}
      .tot{margin-top:14px;padding:12px;border:2px solid #1e3a5f;border-radius:6px;display:flex;justify-content:space-between;font-size:14px}
      .tot b{color:#1e3a5f;font-size:18px}
      .ass{margin-top:50px;display:grid;grid-template-columns:1fr 1fr;gap:40px;text-align:center;font-size:11px}
      .linha{border-top:1px solid #111;padding-top:4px}
    </style></head><body>
    <div class="brand">Memorial</div>
    <h1>Relatório de Baixa por Agente</h1>
    <div class="meta">
      <div><span>Agente</span><b>${session.agente}</b></div>
      <div><span>Data</span><b>${fmtDate(session.data)}</b></div>
      <div><span>Responsável pela baixa</span><b>${session.responsavel || "—"}</b></div>
    </div>
    <table>
      <thead><tr><th>Código</th><th>Associado</th><th>Competência</th><th>Vencimento</th><th class="r">Parcela</th><th class="r">Recebido</th><th class="r">Diferença</th><th>Ação</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="tot"><span>Total de parcelas: <b>${items.length}</b></span><span>Total recebido: <b>${brl(total)}</b></span></div>
    <div class="ass">
      <div><div class="linha">${session.agente}</div>Agente de recebimento</div>
      <div><div class="linha">${session.responsavel || ""}</div>Responsável pela baixa</div>
    </div>
    <script>window.onload=()=>{window.print();}</script>
    </body></html>`);
  w.document.close();
}

// ============= Histórico =============

function HistoricoSection() {
  const [view, setView] = useState<any | null>(null);
  const { data: sessoes = [], isLoading } = useQuery({
    queryKey: ["baixa-sessoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("baixa_sessoes")
        .select("*")
        .order("data_recebimento", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <Card className="border-border/60 shadow-soft">
      <CardHeader><CardTitle className="font-serif flex items-center gap-2"><History className="h-4 w-4" />Histórico de baixas</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Agente</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead className="text-right">Parcelas</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={6} className="py-6 text-center text-muted-foreground">Carregando...</TableCell></TableRow>}
            {!isLoading && sessoes.length === 0 && <TableRow><TableCell colSpan={6} className="py-6 text-center text-muted-foreground">Nenhuma baixa registrada.</TableCell></TableRow>}
            {sessoes.map((s: any) => (
              <TableRow key={s.id}>
                <TableCell>{fmtDate(s.data_recebimento)}</TableCell>
                <TableCell className="font-medium">{s.agente}</TableCell>
                <TableCell>{s.responsavel_nome || "—"}</TableCell>
                <TableCell className="text-right">{s.total_qtd}</TableCell>
                <TableCell className="text-right text-success font-medium">{brl(Number(s.total_valor))}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" onClick={() => setView(s)}><Eye className="mr-1 h-4 w-4" />Visualizar</Button>
                  <Button size="sm" variant="ghost" className="ml-1" onClick={() => {
                    const sess: Session = { agente: s.agente, data: s.data_recebimento, responsavel: s.responsavel_nome || "" };
                    imprimirRelatorio(sess, s.itens as RecebItem[]);
                  }}><Printer className="mr-1 h-4 w-4" />Imprimir</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      {view && (
        <Dialog open onOpenChange={(v) => !v && setView(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader><DialogTitle className="font-serif">Baixa de {fmtDate(view.data_recebimento)} — {view.agente}</DialogTitle></DialogHeader>
            <div className="rounded border border-border bg-muted/30 px-3 py-2 text-sm flex flex-wrap gap-x-6 gap-y-1">
              <span><span className="text-muted-foreground">Responsável:</span> <b>{view.responsavel_nome || "—"}</b></span>
              <span><span className="text-muted-foreground">Parcelas:</span> <b>{view.total_qtd}</b></span>
              <span><span className="text-muted-foreground">Total:</span> <b className="text-success">{brl(Number(view.total_valor))}</b></span>
            </div>
            <div className="max-h-[60vh] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Associado</TableHead>
                    <TableHead>Competência</TableHead>
                    <TableHead className="text-right">Parcela</TableHead>
                    <TableHead className="text-right">Recebido</TableHead>
                    <TableHead className="text-right">Diferença</TableHead>
                    <TableHead>Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(view.itens as RecebItem[]).map((i) => (
                    <TableRow key={i.mensalidadeId}>
                      <TableCell className="font-mono text-xs">{i.codigo}</TableCell>
                      <TableCell>{i.associado} <span className="text-xs text-muted-foreground">#{String(i.codAssoc).padStart(4, "0")}</span></TableCell>
                      <TableCell className="capitalize">{competenciaLabel(i.competencia)}</TableCell>
                      <TableCell className="text-right">{brl(i.valorOriginal)}</TableCell>
                      <TableCell className="text-right text-success">{brl(i.valorRecebido)}</TableCell>
                      <TableCell className={`text-right ${i.diferenca === 0 ? "" : i.diferenca > 0 ? "text-primary" : "text-destructive"}`}>{i.diferenca === 0 ? "—" : brl(i.diferenca)}</TableCell>
                      <TableCell className="text-xs">{i.acao}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => {
                const sess: Session = { agente: view.agente, data: view.data_recebimento, responsavel: view.responsavel_nome || "" };
                imprimirRelatorio(sess, view.itens as RecebItem[]);
              }}><Printer className="mr-2 h-4 w-4" />Imprimir relatório</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}

// ============= Carnê Section =============

function CarneSection() {
  const [cidade, setCidade] = useState<string>("todas");
  const [associadoId, setAssociadoId] = useState<string>("todos");
  const [vencDe, setVencDe] = useState("");
  const [vencAte, setVencAte] = useState("");
  const [diaPag, setDiaPag] = useState<string>("");

  const { data: rows = [], isLoading, refetch } = useQuery({
    queryKey: ["carne-rows", cidade, associadoId, vencDe, vencAte, diaPag],
    enabled: false,
    queryFn: async () => {
      let q = supabase
        .from("mensalidades")
        .select("*, associados!inner(id, nome, codigo, cidade, endereco, estado, cpf, dia_vencimento, planos(nome, valor_mensal))")
        .in("status", ["pendente", "atrasado"]) 
        .order("vencimento", { ascending: true });
      if (vencDe) q = q.gte("vencimento", vencDe);
      if (vencAte) q = q.lte("vencimento", vencAte);
      if (associadoId !== "todos") q = q.eq("associado_id", associadoId);
      const { data, error } = await q.limit(1000);
      if (error) throw error;
      let list = (data ?? []) as any[];
      if (cidade !== "todas") list = list.filter((r) => (r.associados?.cidade ?? "") === cidade);
      if (diaPag) list = list.filter((r) => String(r.associados?.dia_vencimento) === diaPag);
      return list;
    },
  });

  const { data: cidadesData = [] } = useQuery({
    queryKey: ["assoc-cidades"],
    queryFn: async () => {
      const { data, error } = await supabase.from("associados").select("cidade").not("cidade", "is", null);
      if (error) throw error;
      const s = new Set<string>();
      (data ?? []).forEach((d: any) => { if (d.cidade) s.add(d.cidade); });
      return Array.from(s).sort();
    },
  });

  const [assocBusca, setAssocBusca] = useState("");
  const { data: associadosData = [] } = useQuery({
    queryKey: ["assoc-list-carne", cidade, assocBusca],
    enabled: assocBusca.trim().length >= 2,
    queryFn: async () => {
      const termo = assocBusca.trim();
      let q = supabase.from("associados").select("id, nome, codigo, cidade, cpf").order("nome", { ascending: true });
      if (cidade !== "todas") q = q.eq("cidade", cidade);
      const codNum = Number(termo);
      if (!Number.isNaN(codNum) && /^\d+$/.test(termo)) {
        q = q.or(`nome.ilike.%${termo}%,cpf.ilike.%${termo}%,codigo.eq.${codNum}`);
      } else {
        q = q.or(`nome.ilike.%${termo}%,cpf.ilike.%${termo}%`);
      }
      const { data, error } = await q.limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });


  async function gerar() {
    const { data } = await refetch();
    const list = (data ?? []) as any[];
    if (list.length === 0) { toast.error("Nenhuma parcela com os filtros."); return; }
    imprimirCarnes(list);
  }

  return (
    <Card className="border-border/60 shadow-soft">
      <CardHeader><CardTitle className="font-serif flex items-center gap-2"><BookOpen className="h-4 w-4" />Carnês em massa</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-6">
          <div className="space-y-2">
            <Label>Cidade</Label>
            <Select value={cidade} onValueChange={(v) => { setCidade(v); setAssociadoId("todos"); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                {cidadesData.map((c: string) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Associado (nome, código ou CPF)</Label>
            <Input
              value={assocBusca}
              onChange={(e) => { setAssocBusca(e.target.value); setAssociadoId("todos"); }}
              placeholder="Digite ao menos 2 caracteres"
            />
            {associadoId !== "todos" ? (
              <div className="flex items-center justify-between rounded border border-border px-2 py-1 text-xs">
                <span>
                  Selecionado: <b>{(associadosData as any[]).find((a) => a.id === associadoId)?.nome ?? assocBusca}</b>
                </span>
                <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => setAssociadoId("todos")}>Limpar</button>
              </div>
            ) : assocBusca.trim().length >= 2 && (associadosData as any[]).length > 0 ? (
              <div className="max-h-40 overflow-auto rounded border border-border text-sm">
                {(associadosData as any[]).map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    className="block w-full px-2 py-1 text-left hover:bg-muted"
                    onClick={() => setAssociadoId(a.id)}
                  >
                    #{String(a.codigo ?? "").padStart(4, "0")} — {a.nome}
                    {a.cpf ? <span className="text-xs text-muted-foreground"> · {a.cpf}</span> : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="space-y-2"><Label>Vencimento de</Label><Input type="date" value={vencDe} onChange={(e) => setVencDe(e.target.value)} /></div>
          <div className="space-y-2"><Label>Vencimento até</Label><Input type="date" value={vencAte} onChange={(e) => setVencAte(e.target.value)} /></div>
          <div className="space-y-2"><Label>Dia de pagamento</Label><Input type="number" min="1" max="31" value={diaPag} onChange={(e) => setDiaPag(e.target.value)} placeholder="Ex: 10" /></div>
        </div>
        <div>
          <Button onClick={gerar} disabled={isLoading}>
            <BookOpen className="mr-2 h-4 w-4" />Gerar carnês
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Gera uma página por parcela com os dados do associado, valor, vencimento e código de identificação. Filtre por associado para imprimir o carnê individual.
        </p>
        {rows.length > 0 && (
          <div className="rounded border border-border px-3 py-2 text-sm">
            <b>{rows.length}</b> parcelas no último filtro aplicado.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function imprimirCarnes(list: any[]) {
  const w = window.open("", "_blank", "width=900,height=800");
  if (!w) { toast.error("Permita pop-ups."); return; }
  const cards = list.map((m) => {
    const a = m.associados;
    const codigo = `#${String(a?.codigo ?? "").padStart(4, "0")}`;
    const ident = `PARCELA #${m.codigo ?? ""}`;
    return `
      <div class="carne">
        <div class="canhoto">
          <div class="brand">Memorial</div>
          <div class="small">Plano Funerário · Via do associado</div>
          <table>
            <tr><td>Associado</td><td><b>${a?.nome ?? ""}</b></td></tr>
            <tr><td>Código</td><td>${codigo}</td></tr>
            <tr><td>Plano</td><td>${a?.planos?.nome ?? "—"}</td></tr>
            <tr><td>Competência</td><td style="text-transform:capitalize">${competenciaLabel(m.competencia)}</td></tr>
            <tr><td>Vencimento</td><td><b>${fmtDate(m.vencimento)}</b></td></tr>
            <tr><td>Valor</td><td><b>${brl(m.valor)}</b></td></tr>
          </table>
        </div>
        <div class="ficha">
          <div class="head">
            <div>
              <div class="brand">Memorial</div>
              <div class="small">Carnê de pagamento · Plano Funerário</div>
            </div>
            <div class="valor">${brl(m.valor)}</div>
          </div>
          <table>
            <tr><td>Associado</td><td><b>${a?.nome ?? ""}</b> · ${codigo}</td></tr>
            <tr><td>CPF</td><td>${a?.cpf ?? "—"}</td></tr>
            <tr><td>Endereço</td><td>${a?.endereco ?? "—"} — ${a?.cidade ?? ""}/${a?.estado ?? ""}</td></tr>
            <tr><td>Plano</td><td>${a?.planos?.nome ?? "—"}</td></tr>
            <tr><td>Competência</td><td style="text-transform:capitalize">${competenciaLabel(m.competencia)}</td></tr>
            <tr><td>Vencimento</td><td><b>${fmtDate(m.vencimento)}</b></td></tr>
          </table>
          <div class="ident">${ident}</div>
          <div class="ass">
            <div class="linha"></div>
            <div class="small">Assinatura do recebedor</div>
          </div>
        </div>
      </div>
    `;
  }).join("");

  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Carnês — Memorial</title>
    <style>
      *{box-sizing:border-box}
      body{font-family:Georgia,serif;color:#111;margin:0;padding:0}
      .carne{display:grid;grid-template-columns:1fr 2.2fr;gap:0;border:1px solid #333;margin:8px;height:240px;page-break-inside:avoid}
      .canhoto{border-right:2px dashed #333;padding:10px 12px;background:#f8f7f2}
      .ficha{padding:10px 14px}
      .brand{font-size:14px;color:#1e3a5f;font-weight:bold;letter-spacing:2px;text-transform:uppercase}
      .small{font-size:10px;color:#666}
      table{width:100%;border-collapse:collapse;font-size:11px;margin-top:6px}
      td{padding:3px 4px;border-bottom:1px dotted #ccc;vertical-align:top}
      td:first-child{color:#666;width:90px}
      .head{display:flex;justify-content:space-between;align-items:flex-start}
      .valor{font-size:22px;font-weight:bold;color:#1e3a5f;background:#f5f3ec;padding:6px 12px;border-radius:6px}
      .ident{margin-top:8px;font-family:monospace;font-size:13px;letter-spacing:2px;background:#1e3a5f;color:#fff;padding:6px 10px;text-align:center;border-radius:4px}
      .ass{margin-top:12px;text-align:center}
      .linha{border-top:1px solid #111;width:70%;margin:24px auto 2px}
      @media print{ body{padding:0} .carne{margin:6px} }
    </style></head><body>
    ${cards}
    <script>window.onload=()=>{window.print();}</script>
    </body></html>`);
  w.document.close();
}

// ============= Recebimento Mobile (Cobrador) =============

type Pendente = {
  id: string;
  mensalidade_id: string;
  associado_id: string;
  cobrador_id: string | null;
  cobrador_nome: string;
  valor_recebido: number;
  data_recebimento: string;
  observacoes: string | null;
  status: string;
  created_at: string;
};

function MobileRecebimentoSection() {
  const qc = useQueryClient();
  const [cobradorId, setCobradorId] = useState<string>("");
  const [cobradorNome, setCobradorNome] = useState<string>("");
  const [codigo, setCodigo] = useState("");
  const [valor, setValor] = useState("");
  const [obs, setObs] = useState("");
  const [preview, setPreview] = useState<any | null>(null);
  const [previewErr, setPreviewErr] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: cobradores = [] } = useQuery({
    queryKey: ["cobradores", "ativos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cobradores").select("id,nome").eq("ativo", true).order("nome");
      if (error) throw error;
      return data as { id: string; nome: string }[];
    },
  });

  const { data: meus = [] } = useQuery({
    queryKey: ["receb-pendentes-meus", cobradorId],
    enabled: !!cobradorId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("recebimentos_pendentes")
        .select("*, mensalidades(codigo, competencia, vencimento), associados(nome, codigo)")
        .eq("cobrador_id", cobradorId)
        .eq("status", "pendente")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const hoje = new Date().toISOString().slice(0, 10);
  const { data: aReceber = [], isLoading: loadingAR } = useQuery({
    queryKey: ["receb-mobile-areceber", cobradorId, hoje],
    enabled: !!cobradorId,
    queryFn: async () => {
      const { data: assocs, error: e1 } = await supabase
        .from("associados")
        .select("id")
        .eq("cobrador_id", cobradorId)
        .eq("forma_pagamento", "cobrador");
      if (e1) throw e1;
      const ids = (assocs ?? []).map((a: any) => a.id);
      if (ids.length === 0) return [] as any[];
      const { data, error } = await supabase
        .from("mensalidades")
        .select("id, codigo, competencia, vencimento, valor, status, associados!inner(nome, codigo, endereco, cidade, telefone)")
        .in("associado_id", ids)
        .in("status", ["pendente", "atrasado"])
        .lte("vencimento", hoje)
        .order("vencimento", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    const cod = Number(codigo.trim());
    if (!cod || !Number.isFinite(cod)) { setPreview(null); setPreviewErr(""); return; }
    let cancel = false;
    const t = setTimeout(async () => {
      const { data, error } = await supabase
        .from("mensalidades")
        .select("id, codigo, competencia, vencimento, valor, status, associado_id, associados!inner(nome, codigo)")
        .eq("codigo", cod)
        .maybeSingle();
      if (cancel) return;
      if (error || !data) { setPreview(null); setPreviewErr("Parcela não encontrada"); return; }
      setPreview(data);
      setPreviewErr("");
      setValor((cur) => cur || String(Number((data as any).valor)));
    }, 250);
    return () => { cancel = true; clearTimeout(t); };
  }, [codigo]);

  async function registrar() {
    if (!cobradorId || !cobradorNome) { toast.error("Selecione o cobrador."); return; }
    if (!preview) { toast.error("Informe um código de parcela válido."); return; }
    if ((preview as any).status === "pago") { toast.error("Parcela já está paga."); return; }
    const v = Number(String(valor).replace(",", "."));
    if (!v || v <= 0) { toast.error("Informe o valor recebido."); return; }
    setBusy(true);
    try {
      const m: any = preview;
      const dataRec = new Date().toISOString().slice(0, 10);
      const { data: ins, error } = await (supabase as any).from("recebimentos_pendentes").insert({
        mensalidade_id: m.id,
        associado_id: m.associado_id,
        cobrador_id: cobradorId,
        cobrador_nome: cobradorNome,
        valor_recebido: v,
        data_recebimento: dataRec,
        observacoes: obs || null,
        status: "pendente",
      }).select("id").single();
      if (error) throw error;
      imprimirComprovante({
        id: ins.id,
        cobrador: cobradorNome,
        data: dataRec,
        codigoParcela: m.codigo,
        associado: m.associados?.nome ?? "",
        codAssoc: m.associados?.codigo ?? 0,
        competencia: m.competencia,
        vencimento: m.vencimento,
        valorParcela: Number(m.valor),
        valorRecebido: v,
        observacoes: obs,
      });
      toast.success("Recebimento registrado", { description: "Comprovante enviado para impressão. Baixa pendente de conciliação." });
      setCodigo(""); setValor(""); setObs(""); setPreview(null); setPreviewErr("");
      qc.invalidateQueries({ queryKey: ["receb-pendentes-meus"] });
      qc.invalidateQueries({ queryKey: ["receb-pendentes-conciliar"] });
    } catch (e: any) {
      toast.error("Erro ao registrar", { description: e.message });
    } finally {
      setBusy(false);
    }
  }

  const totalMes = (meus as any[]).reduce((s, p) => s + Number(p.valor_recebido), 0);

  return (
    <Card className="border-border/60 shadow-soft">
      <CardHeader>
        <CardTitle className="font-serif flex items-center gap-2"><Smartphone className="h-4 w-4" />Recebimento mobile do cobrador</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded border border-gold/40 bg-gold/5 px-3 py-2 text-xs text-muted-foreground">
          O recebimento gera <b>comprovante</b> para o associado, mas a <b>baixa da mensalidade</b> só ocorre após a <b>conciliação com o supervisor</b> no escritório.
        </div>

        <div className="space-y-2">
          <Label>Cobrador</Label>
          {cobradores.length === 0 ? (
            <div className="rounded border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              Nenhum cobrador ativo. Cadastre um na aba "Cadastro de cobradores".
            </div>
          ) : (
            <Select value={cobradorId} onValueChange={(v) => { const c = cobradores.find((x) => x.id === v); setCobradorId(v); setCobradorNome(c?.nome ?? ""); }}>
              <SelectTrigger><SelectValue placeholder="Selecione o cobrador" /></SelectTrigger>
              <SelectContent>
                {cobradores.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>

        {cobradorId && (
          <div className="rounded border border-border/60 bg-muted/20 p-3 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="font-serif text-base">Parcelas a receber hoje</h3>
              <div className="flex gap-2">
                <span className="text-xs text-muted-foreground">
                  {(aReceber as any[]).length} parcela(s) — <b className="text-foreground">{brl((aReceber as any[]).reduce((s, m: any) => s + Number(m.valor), 0))}</b>
                </span>
                <Button size="sm" variant="outline" onClick={() => imprimirRotaCobrador(cobradorNome, aReceber as any[])} disabled={(aReceber as any[]).length === 0}>
                  <Printer className="mr-2 h-3 w-3" />Imprimir rota
                </Button>
              </div>
            </div>
            {loadingAR && <div className="text-xs text-muted-foreground">Carregando...</div>}
            {!loadingAR && (aReceber as any[]).length === 0 && (
              <div className="text-xs text-muted-foreground">Nenhuma parcela em aberto vencida até hoje para este cobrador.</div>
            )}
            {(aReceber as any[]).length > 0 && (
              <div className="max-h-64 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cód.</TableHead>
                      <TableHead>Associado</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(aReceber as any[]).map((m: any) => (
                      <TableRow key={m.id} className="cursor-pointer" onClick={() => { setCodigo(String(m.codigo)); setValor(String(Number(m.valor))); }}>
                        <TableCell className="font-mono text-xs">#{m.codigo}</TableCell>
                        <TableCell>{m.associados?.nome}</TableCell>
                        <TableCell>{fmtDate(m.vencimento)}</TableCell>
                        <TableCell className="text-right">{brl(Number(m.valor))}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setCodigo(String(m.codigo)); setValor(String(Number(m.valor))); }}>Selecionar</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}


        <div className="grid gap-3 md:grid-cols-[1fr_180px]">
          <div className="space-y-2"><Label>Código da parcela</Label><Input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Ex: 1024" inputMode="numeric" /></div>
          <div className="space-y-2"><Label>Valor recebido (R$)</Label><Input value={valor} onChange={(e) => setValor(e.target.value)} type="number" step="0.01" min="0" /></div>
        </div>

        {preview && (
          <div className={`rounded border px-3 py-2 text-sm flex flex-wrap gap-x-6 gap-y-1 ${(preview as any).status === "pago" ? "border-destructive/40 bg-destructive/5" : "border-primary/40 bg-primary/5"}`}>
            <span><span className="text-muted-foreground">Código:</span> <b>#{(preview as any).codigo}</b></span>
            <span><span className="text-muted-foreground">Associado:</span> <b>{(preview as any).associados?.nome}</b></span>
            <span><span className="text-muted-foreground">Vencimento:</span> <b>{fmtDate((preview as any).vencimento)}</b></span>
            <span><span className="text-muted-foreground">Valor:</span> <b>{brl(Number((preview as any).valor))}</b></span>
            <span className="capitalize"><span className="text-muted-foreground">Status:</span> <b>{(preview as any).status}</b></span>
          </div>
        )}
        {!preview && previewErr && codigo && (
          <div className="rounded border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">{previewErr}</div>
        )}

        <div className="space-y-2"><Label>Observações (opcional)</Label><Textarea rows={2} value={obs} onChange={(e) => setObs(e.target.value)} /></div>

        <Button onClick={registrar} disabled={busy || !preview || !cobradorId} size="lg" className="w-full md:w-auto">
          <Printer className="mr-2 h-4 w-4" />{busy ? "Registrando..." : "Receber e imprimir comprovante"}
        </Button>

        {cobradorId && (
          <div className="pt-4 border-t border-border">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-serif text-base">Meus recebimentos pendentes de conciliação</h3>
              <span className="text-sm text-muted-foreground">{(meus as any[]).length} item(ns) — <b className="text-success">{brl(totalMes)}</b></span>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Cód. parcela</TableHead>
                  <TableHead>Associado</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(meus as any[]).length === 0 && <TableRow><TableCell colSpan={5} className="py-6 text-center text-muted-foreground">Nenhum recebimento pendente.</TableCell></TableRow>}
                {(meus as any[]).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{fmtDate(p.data_recebimento)}</TableCell>
                    <TableCell className="font-mono text-xs">#{p.mensalidades?.codigo}</TableCell>
                    <TableCell>{p.associados?.nome}</TableCell>
                    <TableCell className="text-right text-success font-medium">{brl(Number(p.valor_recebido))}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => imprimirComprovante({
                        id: p.id, cobrador: p.cobrador_nome, data: p.data_recebimento,
                        codigoParcela: p.mensalidades?.codigo ?? 0, associado: p.associados?.nome ?? "",
                        codAssoc: p.associados?.codigo ?? 0, competencia: p.mensalidades?.competencia ?? "",
                        vencimento: p.mensalidades?.vencimento ?? "", valorParcela: Number(p.valor_recebido),
                        valorRecebido: Number(p.valor_recebido), observacoes: p.observacoes ?? "",
                      })}><Printer className="h-4 w-4" /></Button>
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

function imprimirRotaCobrador(cobrador: string, parcelas: any[]) {
  const w = window.open("", "_blank", "width=800,height=900");
  if (!w) { toast.error("Permita pop-ups."); return; }
  const total = parcelas.reduce((s, m) => s + Number(m.valor), 0);
  const rows = parcelas.map((m) => `
    <tr>
      <td>#${m.codigo}</td>
      <td>${m.associados?.nome ?? ""}</td>
      <td>${m.associados?.endereco ?? ""}${m.associados?.cidade ? " — " + m.associados.cidade : ""}</td>
      <td>${m.associados?.telefone ?? ""}</td>
      <td>${new Date(m.vencimento + "T00:00:00").toLocaleDateString("pt-BR")}</td>
      <td style="text-align:right">R$ ${Number(m.valor).toFixed(2).replace(".", ",")}</td>
      <td style="width:80px;border-bottom:1px solid #000">&nbsp;</td>
    </tr>`).join("");
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Rota do cobrador</title>
    <style>
      body{font-family:Georgia,serif;color:#111;margin:18px}
      h1{font-size:16px;color:#1e3a5f;margin:0 0 4px}
      .sub{font-size:12px;color:#555;margin-bottom:10px}
      table{width:100%;border-collapse:collapse;font-size:11px}
      th,td{border:1px solid #999;padding:5px 6px;text-align:left;vertical-align:top}
      th{background:#f5f3ec}
      tfoot td{font-weight:bold;background:#fafafa}
    </style></head><body>
    <h1>Rota de recebimento — ${cobrador}</h1>
    <div class="sub">Emitido em ${new Date().toLocaleString("pt-BR")} · ${parcelas.length} parcela(s)</div>
    <table>
      <thead><tr><th>Cód.</th><th>Associado</th><th>Endereço</th><th>Telefone</th><th>Vencimento</th><th style="text-align:right">Valor</th><th>Recebido</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr><td colspan="5" style="text-align:right">Total</td><td style="text-align:right">R$ ${total.toFixed(2).replace(".", ",")}</td><td></td></tr></tfoot>
    </table>
    <script>window.print();</script>
    </body></html>`);
  w.document.close();

function imprimirComprovante(c: {
  id: string; cobrador: string; data: string; codigoParcela: number;
  associado: string; codAssoc: number; competencia: string; vencimento: string;
  valorParcela: number; valorRecebido: number; observacoes: string;
}) {
  const w = window.open("", "_blank", "width=420,height=700");
  if (!w) { toast.error("Permita pop-ups."); return; }
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Comprovante</title>
    <style>
      body{font-family:Georgia,serif;color:#111;margin:0;padding:14px;max-width:360px}
      .brand{text-align:center;font-weight:bold;color:#1e3a5f;letter-spacing:3px;font-size:14px}
      h1{font-size:14px;text-align:center;margin:6px 0;color:#1e3a5f}
      .alert{border:1px dashed #b8860b;background:#fffbe6;color:#7a5c00;padding:8px;font-size:11px;border-radius:4px;margin:8px 0;text-align:center}
      table{width:100%;border-collapse:collapse;font-size:12px;margin-top:6px}
      td{padding:4px 2px;border-bottom:1px dotted #ccc;vertical-align:top}
      td:first-child{color:#666;width:42%}
      .val{margin-top:10px;text-align:center;font-size:20px;font-weight:bold;color:#1e3a5f;background:#f5f3ec;padding:8px;border-radius:6px}
      .ass{margin-top:34px;text-align:center;font-size:11px}
      .linha{border-top:1px solid #111;width:80%;margin:0 auto 2px}
      .pid{margin-top:8px;font-family:monospace;font-size:10px;text-align:center;color:#666}
      @media print{ body{padding:6px} }
    </style></head><body>
    <div class="brand">Memorial</div>
    <h1>Comprovante de Recebimento</h1>
    <div class="alert">PROVISÓRIO — baixa sujeita a conciliação com o supervisor</div>
    <table>
      <tr><td>Data</td><td><b>${fmtDate(c.data)}</b></td></tr>
      <tr><td>Cobrador</td><td><b>${c.cobrador}</b></td></tr>
      <tr><td>Associado</td><td><b>${c.associado}</b> #${String(c.codAssoc).padStart(4, "0")}</td></tr>
      <tr><td>Parcela</td><td>#${c.codigoParcela} — ${competenciaLabel(c.competencia)}</td></tr>
      <tr><td>Vencimento</td><td>${fmtDate(c.vencimento)}</td></tr>
      ${c.observacoes ? `<tr><td>Obs.</td><td>${c.observacoes}</td></tr>` : ""}
    </table>
    <div class="val">${brl(c.valorRecebido)}</div>
    <div class="ass"><div class="linha"></div>Assinatura do associado</div>
    <div class="ass"><div class="linha"></div>${c.cobrador} — Cobrador</div>
    <div class="pid">Protocolo: ${c.id}</div>
    <script>window.onload=()=>{window.print();}</script>
    </body></html>`;
  w.document.write(html);
  w.document.close();
}

// ============= Conciliação (Supervisor) =============

function ConciliacaoSection() {
  const qc = useQueryClient();
  const [selecionados, setSelecionados] = useState<Record<string, boolean>>({});
  const [filtroCobrador, setFiltroCobrador] = useState<string>("todos");
  const [busy, setBusy] = useState(false);

  const { data: pendentes = [], isLoading } = useQuery({
    queryKey: ["receb-pendentes-conciliar", filtroCobrador],
    queryFn: async () => {
      let q = (supabase as any)
        .from("recebimentos_pendentes")
        .select("*, mensalidades(codigo, competencia, vencimento, valor), associados(nome, codigo)")
        .eq("status", "pendente")
        .order("data_recebimento", { ascending: false });
      if (filtroCobrador !== "todos") q = q.eq("cobrador_id", filtroCobrador);
      const { data, error } = await q.limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: cobradores = [] } = useQuery({
    queryKey: ["cobradores", "ativos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cobradores").select("id,nome").eq("ativo", true).order("nome");
      if (error) throw error;
      return data as { id: string; nome: string }[];
    },
  });

  const selectedIds = useMemo(() => Object.keys(selecionados).filter((k) => selecionados[k]), [selecionados]);
  const selectedList = useMemo(() => (pendentes as any[]).filter((p) => selecionados[p.id]), [pendentes, selecionados]);
  const totalSel = selectedList.reduce((s, p) => s + Number(p.valor_recebido), 0);

  async function conciliar() {
    if (selectedIds.length === 0) { toast.error("Selecione ao menos um recebimento."); return; }
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const userId = u.user?.id ?? null;
      let userNome = "";
      if (userId) {
        const { data: p } = await supabase.from("profiles").select("nome,email").eq("id", userId).maybeSingle();
        userNome = (p as any)?.nome || (p as any)?.email || u.user?.email || "";
      }
      for (const item of selectedList) {
        const baseUpd = { status: "pago" as const, data_pagamento: item.data_recebimento, agente_recebimento: item.cobrador_nome };
        const { error } = await supabase.from("mensalidades").update(baseUpd).eq("id", item.mensalidade_id);
        if (error) throw error;
        const { error: e2 } = await (supabase as any).from("recebimentos_pendentes").update({
          status: "conciliado", conciliado_em: new Date().toISOString(), conciliado_por: userId, conciliado_por_nome: userNome,
        }).eq("id", item.id);
        if (e2) throw e2;
      }
      toast.success("Conciliado", { description: `${selectedIds.length} recebimento(s) — ${brl(totalSel)} baixados.` });
      setSelecionados({});
      qc.invalidateQueries({ queryKey: ["receb-pendentes-conciliar"] });
      qc.invalidateQueries({ queryKey: ["receb-pendentes-meus"] });
      qc.invalidateQueries({ queryKey: ["mensalidades"] });
    } catch (e: any) {
      toast.error("Erro na conciliação", { description: e.message });
    } finally {
      setBusy(false);
    }
  }

  async function rejeitar(id: string) {
    if (!confirm("Rejeitar este recebimento? Ele não baixará a parcela.")) return;
    const { error } = await (supabase as any).from("recebimentos_pendentes").update({ status: "rejeitado" }).eq("id", id);
    if (error) { toast.error("Erro", { description: error.message }); return; }
    toast.success("Recebimento rejeitado");
    qc.invalidateQueries({ queryKey: ["receb-pendentes-conciliar"] });
  }

  const totalGeral = (pendentes as any[]).reduce((s, p) => s + Number(p.valor_recebido), 0);

  return (
    <Card className="border-border/60 shadow-soft">
      <CardHeader>
        <CardTitle className="font-serif flex items-center gap-2"><ClipboardCheck className="h-4 w-4" />Conciliação de recebimentos do cobrador</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[260px_1fr_1fr]">
          <div className="space-y-2">
            <Label>Filtrar por cobrador</Label>
            <Select value={filtroCobrador} onValueChange={setFiltroCobrador}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {cobradores.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-lg border border-primary/40 bg-primary/5 px-4 py-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Pendentes</div>
            <div className="text-2xl font-bold text-primary">{(pendentes as any[]).length} — {brl(totalGeral)}</div>
          </div>
          <div className="rounded-lg border border-success/40 bg-success/5 px-4 py-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Selecionados</div>
            <div className="text-2xl font-bold text-success">{selectedIds.length} — {brl(totalSel)}</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={conciliar} disabled={busy || selectedIds.length === 0}>
            <CheckCircle2 className="mr-2 h-4 w-4" />{busy ? "Conciliando..." : "Conciliar e dar baixa"}
          </Button>
          <Button variant="outline" onClick={() => {
            const all: Record<string, boolean> = {};
            (pendentes as any[]).forEach((p) => { all[p.id] = true; });
            setSelecionados(all);
          }}>Selecionar todos</Button>
          <Button variant="outline" onClick={() => setSelecionados({})}>Limpar seleção</Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Cobrador</TableHead>
              <TableHead>Cód. parcela</TableHead>
              <TableHead>Associado</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead className="text-right">Parcela</TableHead>
              <TableHead className="text-right">Recebido</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={9} className="py-6 text-center text-muted-foreground">Carregando...</TableCell></TableRow>}
            {!isLoading && (pendentes as any[]).length === 0 && <TableRow><TableCell colSpan={9} className="py-10 text-center text-muted-foreground">Nenhum recebimento pendente de conciliação.</TableCell></TableRow>}
            {(pendentes as any[]).map((p) => (
              <TableRow key={p.id}>
                <TableCell><input type="checkbox" checked={!!selecionados[p.id]} onChange={(e) => setSelecionados((s) => ({ ...s, [p.id]: e.target.checked }))} className="h-4 w-4" /></TableCell>
                <TableCell>{fmtDate(p.data_recebimento)}</TableCell>
                <TableCell>{p.cobrador_nome}</TableCell>
                <TableCell className="font-mono text-xs">#{p.mensalidades?.codigo}</TableCell>
                <TableCell>{p.associados?.nome} <span className="text-xs text-muted-foreground">#{String(p.associados?.codigo ?? "").padStart(4, "0")}</span></TableCell>
                <TableCell>{p.mensalidades?.vencimento ? fmtDate(p.mensalidades.vencimento) : "—"}</TableCell>
                <TableCell className="text-right">{brl(Number(p.mensalidades?.valor ?? 0))}</TableCell>
                <TableCell className="text-right text-success font-medium">{brl(Number(p.valor_recebido))}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => rejeitar(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
