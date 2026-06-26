import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, BookOpen, Filter, Plus, Printer, X, ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { brl, fmtDate, competenciaLabel } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/recebimento")({
  head: () => ({ meta: [{ title: "Recebimento — Memorial" }] }),
  component: RecebimentoPage,
});

function RecebimentoPage() {
  const [tab, setTab] = useState<"baixa" | "carne">("baixa");

  return (
    <AppShell title="Recebimento" subtitle="Baixa em massa de mensalidades e geração de carnês">
      <div className="mb-4 flex gap-2">
        <Button variant={tab === "baixa" ? "default" : "outline"} onClick={() => setTab("baixa")}>
          <CheckCircle2 className="mr-2 h-4 w-4" />Baixa por agente
        </Button>
        <Button variant={tab === "carne" ? "default" : "outline"} onClick={() => setTab("carne")}>
          <BookOpen className="mr-2 h-4 w-4" />Gerar carnês em massa
        </Button>
      </div>

      {tab === "baixa" ? <BaixaWizard /> : <CarneSection />}
    </AppShell>
  );
}

// ============= Baixa Wizard =============

type Session = { agente: string; data: string; forma: string; responsavel: string };
type RecebItem = {
  mensalidadeId: string;
  codigo: string;
  associado: string;
  codAssoc: number;
  competencia: string;
  vencimento: string;
  valorOriginal: number;
  valorRecebido: number;
  diferenca: number; // positivo = excesso, negativo = falta
  acao: "Quitada" | "Quitada + abate na próxima" | "Parcial + nova parcela gerada";
};

function BaixaWizard() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [session, setSession] = useState<Session | null>(null);
  const [items, setItems] = useState<RecebItem[]>([]);

  // Buscar nome do responsável (usuário logado)
  const [responsavel, setResponsavel] = useState("");
  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: p } = await supabase.from("profiles").select("nome,email").eq("id", u.user.id).maybeSingle();
      setResponsavel(p?.nome || p?.email || u.user.email || "");
    })();
  }, []);

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
              const forma = String(fd.get("forma") || "dinheiro");
              if (!agente || !data) { toast.error("Preencha agente e data."); return; }
              setSession({ agente, data, forma, responsavel });
              setItems([]);
              setStep(2);
            }}
          >
            <div className="space-y-2"><Label>Agente de recebimento</Label><Input name="agente" placeholder="Nome do cobrador" required /></div>
            <div className="space-y-2"><Label>Data do recebimento</Label><Input name="data" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></div>
            <div className="space-y-2">
              <Label>Forma de pagamento</Label>
              <Select name="forma" defaultValue="dinheiro">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="cartao">Cartão</SelectItem>
                  <SelectItem value="boleto">Boleto</SelectItem>
                  <SelectItem value="transferencia">Transferência</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Responsável pela baixa</Label><Input value={responsavel} disabled /></div>
            <div className="md:col-span-2"><Button type="submit"><Plus className="mr-2 h-4 w-4" />Iniciar baixa</Button></div>
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
        onFinalize={() => { if (items.length === 0) { toast.error("Nenhuma parcela registrada."); return; } imprimirRelatorio(session, items); setStep(3); }}
      />
    );
  }

  // step 3
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

function BaixaEntrada({ session, items, setItems, onCancel, onFinalize }: {
  session: Session; items: RecebItem[]; setItems: (f: (x: RecebItem[]) => RecebItem[]) => void;
  onCancel: () => void; onFinalize: () => void;
}) {
  const [codigo, setCodigo] = useState("");
  const [valor, setValor] = useState("");
  const [busy, setBusy] = useState(false);

  const totais = useMemo(() => ({
    qtd: items.length,
    valor: items.reduce((s, i) => s + i.valorRecebido, 0),
  }), [items]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const cod = codigo.trim().toLowerCase();
    const v = Number(String(valor).replace(",", "."));
    if (!cod || cod.length < 4) { toast.error("Informe o código da parcela (mín. 4 caracteres)."); return; }
    if (!v || v <= 0) { toast.error("Informe o valor recebido."); return; }
    setBusy(true);
    try {
      const { data: matches, error } = await supabase
        .from("mensalidades")
        .select("*, associados!inner(id, nome, codigo, planos(nome, valor_mensal))")
        .ilike("id", `${cod}%`)
        .limit(2);
      if (error) throw error;
      if (!matches || matches.length === 0) { toast.error("Parcela não encontrada."); return; }
      if (matches.length > 1) { toast.error("Código ambíguo, informe mais caracteres."); return; }
      const m: any = matches[0];
      if (m.status === "pago") { toast.error("Parcela já está paga."); return; }
      if (items.some((i) => i.mensalidadeId === m.id)) { toast.error("Parcela já adicionada nesta baixa."); return; }

      const valorOriginal = Number(m.valor);
      const updates: Array<Promise<any>> = [];
      let acao: RecebItem["acao"] = "Quitada";
      const baseUpd = { status: "pago" as const, data_pagamento: session.data, forma_pagamento: session.forma, agente_recebimento: session.agente };

      if (v === valorOriginal) {
        updates.push(supabase.from("mensalidades").update(baseUpd).eq("id", m.id));
      } else if (v > valorOriginal) {
        const excesso = v - valorOriginal;
        updates.push(supabase.from("mensalidades").update(baseUpd).eq("id", m.id));
        // próxima parcela em aberto do mesmo associado
        const { data: nx } = await supabase.from("mensalidades")
          .select("id, valor, vencimento")
          .eq("associado_id", m.associado_id)
          .in("status", ["pendente", "atrasado"])
          .gt("vencimento", m.vencimento)
          .order("vencimento", { ascending: true }).limit(1);
        const next: any = nx?.[0];
        if (next) {
          const novo = Math.max(0, Number(next.valor) - excesso);
          if (novo === 0) {
            updates.push(supabase.from("mensalidades").update({ ...baseUpd, observacoes: `Quitada por excedente de ${brl(excesso)}` }).eq("id", next.id));
          } else {
            updates.push(supabase.from("mensalidades").update({ valor: novo, observacoes: `Abatido ${brl(excesso)} de excedente da parcela anterior` }).eq("id", next.id));
          }
          acao = "Quitada + abate na próxima";
        } else {
          acao = "Quitada"; // sem próxima parcela para abater
        }
      } else {
        // recebido < valor: marca pago com valor recebido e gera nova parcela
        const diff = valorOriginal - v;
        updates.push(supabase.from("mensalidades").update({ ...baseUpd, valor: v, observacoes: `Pagamento parcial. Diferença de ${brl(diff)} gerada em nova parcela.` }).eq("id", m.id));
        const { data: nx } = await supabase.from("mensalidades")
          .select("vencimento").eq("associado_id", m.associado_id)
          .in("status", ["pendente", "atrasado"])
          .gt("vencimento", m.vencimento)
          .order("vencimento", { ascending: true }).limit(1);
        let novoVenc = nx?.[0]?.vencimento as string | undefined;
        if (!novoVenc) {
          const d = new Date(m.vencimento + "T00:00:00"); d.setMonth(d.getMonth() + 1);
          novoVenc = d.toISOString().slice(0, 10);
        }
        const comp = novoVenc.slice(0, 7) + "-01";
        updates.push(supabase.from("mensalidades").insert({
          associado_id: m.associado_id, competencia: comp, vencimento: novoVenc, valor: diff,
          status: "pendente", observacoes: `Diferença de pagamento parcial da parcela ${m.id.slice(0, 8).toUpperCase()}`,
        }));
        acao = "Parcial + nova parcela gerada";
      }

      const results = await Promise.all(updates);
      const errs = results.find((r: any) => r?.error);
      if (errs?.error) throw errs.error;

      const item: RecebItem = {
        mensalidadeId: m.id,
        codigo: m.id.slice(0, 8).toUpperCase(),
        associado: m.associados?.nome ?? "",
        codAssoc: m.associados?.codigo ?? 0,
        competencia: m.competencia,
        vencimento: m.vencimento,
        valorOriginal,
        valorRecebido: v,
        diferenca: v - valorOriginal,
        acao,
      };
      setItems((prev) => [...prev, item]);
      setCodigo(""); setValor("");
      toast.success("Parcela registrada", { description: `${item.associado} · ${brl(v)}` });
    } catch (e: any) {
      toast.error("Erro", { description: e.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="border-border/60 shadow-soft">
      <CardHeader>
        <CardTitle className="font-serif flex items-center justify-between">
          <span>Registrar parcelas — Agente: {session.agente}</span>
          <span className="text-sm font-sans text-muted-foreground">{fmtDate(session.data)} · {session.forma}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleAdd} className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
          <div className="space-y-2"><Label>Código da parcela</Label><Input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Ex: A1B2C3D4" autoFocus /></div>
          <div className="space-y-2"><Label>Valor recebido (R$)</Label><Input value={valor} onChange={(e) => setValor(e.target.value)} type="number" step="0.01" min="0" /></div>
          <div className="flex items-end"><Button type="submit" disabled={busy}>{busy ? "..." : "OK"}</Button></div>
        </form>

        <div className="rounded border border-border px-3 py-2 text-sm flex flex-wrap gap-x-6 gap-y-1">
          <span><span className="text-muted-foreground">Parcelas recebidas:</span> <b>{totais.qtd}</b></span>
          <span><span className="text-muted-foreground">Total recebido:</span> <b className="text-success">{brl(totais.valor)}</b></span>
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 && <TableRow><TableCell colSpan={7} className="py-6 text-center text-muted-foreground">Nenhuma parcela registrada ainda.</TableCell></TableRow>}
            {items.map((i) => (
              <TableRow key={i.mensalidadeId}>
                <TableCell className="font-mono text-xs">{i.codigo}</TableCell>
                <TableCell>{i.associado} <span className="text-xs text-muted-foreground">#{String(i.codAssoc).padStart(4, "0")}</span></TableCell>
                <TableCell className="capitalize">{competenciaLabel(i.competencia)}</TableCell>
                <TableCell className="text-right">{brl(i.valorOriginal)}</TableCell>
                <TableCell className="text-right font-medium text-success">{brl(i.valorRecebido)}</TableCell>
                <TableCell className={`text-right ${i.diferenca === 0 ? "" : i.diferenca > 0 ? "text-primary" : "text-destructive"}`}>{i.diferenca === 0 ? "—" : brl(i.diferenca)}</TableCell>
                <TableCell className="text-xs">{i.acao}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={onCancel}><ArrowLeft className="mr-2 h-4 w-4" />Voltar</Button>
          <Button onClick={onFinalize} disabled={items.length === 0}><Printer className="mr-2 h-4 w-4" />Concluir e imprimir relatório</Button>
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
      <td>${i.codigo}</td>
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
      .meta{margin:12px 0;padding:10px;background:#f5f3ec;border:1px solid #ddd;border-radius:6px;font-size:12px;display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
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
      <div><span>Forma de pagamento</span><b style="text-transform:capitalize">${session.forma}</b></div>
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

// ============= Carnê Section (inalterada) =============

function CarneSection() {
  const [cidade, setCidade] = useState<string>("todas");
  const [vencDe, setVencDe] = useState("");
  const [vencAte, setVencAte] = useState("");
  const [diaPag, setDiaPag] = useState<string>("");

  const { data: rows = [], isLoading, refetch } = useQuery({
    queryKey: ["carne-rows", cidade, vencDe, vencAte, diaPag],
    enabled: false,
    queryFn: async () => {
      let q = supabase
        .from("mensalidades")
        .select("*, associados!inner(id, nome, codigo, cidade, endereco, estado, cpf, dia_vencimento, planos(nome, valor_mensal))")
        .order("vencimento", { ascending: true });
      if (vencDe) q = q.gte("vencimento", vencDe);
      if (vencAte) q = q.lte("vencimento", vencAte);
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
        <div className="grid gap-3 md:grid-cols-5">
          <div className="space-y-2">
            <Label>Cidade</Label>
            <Select value={cidade} onValueChange={setCidade}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                {cidadesData.map((c: string) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Vencimento de</Label><Input type="date" value={vencDe} onChange={(e) => setVencDe(e.target.value)} /></div>
          <div className="space-y-2"><Label>Vencimento até</Label><Input type="date" value={vencAte} onChange={(e) => setVencAte(e.target.value)} /></div>
          <div className="space-y-2"><Label>Dia de pagamento</Label><Input type="number" min="1" max="31" value={diaPag} onChange={(e) => setDiaPag(e.target.value)} placeholder="Ex: 10" /></div>
          <div className="flex items-end">
            <Button className="w-full" onClick={gerar} disabled={isLoading}>
              <BookOpen className="mr-2 h-4 w-4" />Gerar carnês
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Gera uma página por parcela com os dados do associado, valor, vencimento e código de identificação. Use os filtros para imprimir somente o lote desejado.
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
    const ident = `${codigo} ${String(m.id).slice(0, 8).toUpperCase()}`;
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
