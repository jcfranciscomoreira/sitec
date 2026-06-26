import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { CheckCircle2, BookOpen, Filter } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { brl, fmtDate, competenciaLabel } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/recebimento")({
  head: () => ({ meta: [{ title: "Recebimento — Memorial" }] }),
  component: RecebimentoPage,
});

type Row = {
  id: string; competencia: string; vencimento: string; valor: number;
  status: string; data_pagamento: string | null; forma_pagamento: string | null;
  agente_recebimento: string | null;
  associados: { id: string; nome: string; codigo: number; cidade: string | null; endereco: string | null; estado: string | null; cpf: string | null; planos: { nome: string; valor_mensal: number } | null } | null;
};

function RecebimentoPage() {
  const qc = useQueryClient();
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

      {tab === "baixa" ? <BaixaSection qc={qc} /> : <CarneSection />}
    </AppShell>
  );
}

function BaixaSection({ qc }: { qc: ReturnType<typeof useQueryClient> }) {
  const [cidade, setCidade] = useState<string>("todas");
  const [vencDe, setVencDe] = useState("");
  const [vencAte, setVencAte] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["receb-pendentes", cidade, vencDe, vencAte],
    queryFn: async () => {
      let q = supabase
        .from("mensalidades")
        .select("*, associados!inner(id, nome, codigo, cidade, endereco, estado, cpf, planos(nome, valor_mensal))")
        .in("status", ["pendente", "atrasado"])
        .order("vencimento", { ascending: true });
      if (vencDe) q = q.gte("vencimento", vencDe);
      if (vencAte) q = q.lte("vencimento", vencAte);
      const { data, error } = await q.limit(500);
      if (error) throw error;
      let list = (data ?? []) as unknown as Row[];
      if (cidade !== "todas") list = list.filter((r) => (r.associados?.cidade ?? "") === cidade);
      return list;
    },
  });

  const cidades = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => { if (r.associados?.cidade) s.add(r.associados.cidade); });
    return Array.from(s).sort();
  }, [rows]);

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.id)));
  };
  const toggle = (id: string) => {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  };

  const totalSel = rows.filter((r) => selected.has(r.id)).reduce((s, r) => s + Number(r.valor), 0);

  const baixar = useMutation({
    mutationFn: async (p: { ids: string[]; data: string; forma: string; agente: string }) => {
      const { error } = await supabase
        .from("mensalidades")
        .update({ status: "pago", data_pagamento: p.data, forma_pagamento: p.forma, agente_recebimento: p.agente || null })
        .in("id", p.ids);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["receb-pendentes"] });
      qc.invalidateQueries({ queryKey: ["mensalidades"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setSelected(new Set());
      setConfirmOpen(false);
      toast.success("Baixa registrada");
    },
    onError: (e: any) => toast.error("Erro", { description: e.message }),
  });

  return (
    <Card className="border-border/60 shadow-soft">
      <CardHeader>
        <CardTitle className="font-serif flex items-center gap-2"><Filter className="h-4 w-4" />Filtros</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="space-y-2">
            <Label>Cidade</Label>
            <Select value={cidade} onValueChange={setCidade}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                {cidades.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Vencimento de</Label><Input type="date" value={vencDe} onChange={(e) => setVencDe(e.target.value)} /></div>
          <div className="space-y-2"><Label>Vencimento até</Label><Input type="date" value={vencAte} onChange={(e) => setVencAte(e.target.value)} /></div>
          <div className="flex items-end">
            <Button className="w-full" disabled={selected.size === 0} onClick={() => setConfirmOpen(true)}>
              <CheckCircle2 className="mr-2 h-4 w-4" />Dar baixa ({selected.size})
            </Button>
          </div>
        </div>

        <div className="rounded border border-border px-3 py-2 text-sm">
          <span className="text-muted-foreground">Selecionado:</span> <b>{selected.size}</b> &nbsp;·&nbsp;
          <span className="text-muted-foreground">Total:</span> <b className="text-success">{brl(totalSel)}</b>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"><Checkbox checked={allSelected} onCheckedChange={toggleAll} /></TableHead>
              <TableHead>Associado</TableHead>
              <TableHead>Cidade</TableHead>
              <TableHead>Competência</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead className="text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Carregando...</TableCell></TableRow>}
            {!isLoading && rows.length === 0 && <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Nenhuma mensalidade em aberto com os filtros.</TableCell></TableRow>}
            {rows.map((r) => (
              <TableRow key={r.id} className={selected.has(r.id) ? "bg-muted/40" : ""}>
                <TableCell><Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggle(r.id)} /></TableCell>
                <TableCell>
                  <div className="font-medium">{r.associados?.nome}</div>
                  <div className="text-xs text-muted-foreground">#{String(r.associados?.codigo ?? "").padStart(4, "0")}</div>
                </TableCell>
                <TableCell>{r.associados?.cidade ?? "—"}</TableCell>
                <TableCell className="capitalize">{competenciaLabel(r.competencia)}</TableCell>
                <TableCell>{fmtDate(r.vencimento)}</TableCell>
                <TableCell className="text-right font-medium">{brl(r.valor)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      {confirmOpen && (
        <Dialog open onOpenChange={(v) => !v && setConfirmOpen(false)}>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-serif">Baixa por agente</DialogTitle></DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                baixar.mutate({
                  ids: Array.from(selected),
                  data: String(fd.get("data")),
                  forma: String(fd.get("forma")),
                  agente: String(fd.get("agente") || "").trim(),
                });
              }}
              className="space-y-4"
            >
              <div className="rounded-md bg-muted p-3 text-sm">
                Receber <b>{selected.size}</b> mensalidades · Total <b className="text-success">{brl(totalSel)}</b>
              </div>
              <div className="space-y-2"><Label>Data do pagamento</Label><Input name="data" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></div>
              <div className="space-y-2"><Label>Forma de pagamento</Label>
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
              <div className="space-y-2"><Label>Agente de recebimento</Label><Input name="agente" placeholder="Nome do cobrador/agente" required /></div>
              <DialogFooter><Button type="submit" disabled={baixar.isPending}>{baixar.isPending ? "Salvando..." : "Confirmar baixa"}</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}

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
