import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BookOpen, FileText, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { brl, fmtDate, competenciaLabel } from "@/lib/format";
import { toast } from "sonner";
import { criarCobranca } from "@/lib/cobranca.functions";

type ResumoItem = {
  mensalidade_id: string;
  nome: string;
  competencia: string;
  status: "ok" | "existente" | "erro";
  mensagem?: string;
  url?: string | null;
};

type Resumo = {
  tipo: "carne" | "boleto";
  quandoISO: string;
  totalFiltrado: number;
  processadas: number;
  ok: number;
  jaExistentes: number;
  erros: number;
  itens: ResumoItem[];
  filtros: { cidade: string; associadoId: string; vencDe: string; vencAte: string; diaPag: string };
};

export function CarneSection() {
  const [cidade, setCidade] = useState<string>("todas");
  const [associadoId, setAssociadoId] = useState<string>("todos");
  const [vencDe, setVencDe] = useState("");
  const [vencAte, setVencAte] = useState("");
  const [diaPag, setDiaPag] = useState<string>("");
  const [confirmaAcao, setConfirmaAcao] = useState<null | "carne" | "boleto">(null);
  const [resumo, setResumo] = useState<Resumo | null>(null);

  const { data: rows = [], isLoading, refetch } = useQuery({
    queryKey: ["carne-rows", cidade, associadoId, vencDe, vencAte, diaPag],
    enabled: false,
    queryFn: async () => {
      let q = supabase
        .from("mensalidades")
        .select("*, associados!inner(id, nome, codigo, cidade, endereco, estado, cpf, dia_vencimento, forma_pagamento, planos(nome, valor_mensal))")
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

  const gerarCob = useServerFn(criarCobranca);
  const [gerandoBol, setGerandoBol] = useState(false);
  const [gerandoCarne, setGerandoCarne] = useState(false);

  function filtrosSnapshot() {
    return { cidade, associadoId, vencDe, vencAte, diaPag };
  }

  async function gerar() {
    setGerandoCarne(true);
    try {
      const { data } = await refetch();
      const list = (data ?? []) as any[];
      if (list.length === 0) { toast.error("Nenhuma parcela com os filtros."); return; }
      imprimirCarnes(list);
      setResumo({
        tipo: "carne",
        quandoISO: new Date().toISOString(),
        totalFiltrado: list.length,
        processadas: list.length,
        ok: list.length,
        jaExistentes: 0,
        erros: 0,
        itens: list.map((r) => ({
          mensalidade_id: r.id,
          nome: r.associados?.nome ?? "",
          competencia: r.competencia,
          status: "ok" as const,
        })),
        filtros: filtrosSnapshot(),
      });
      toast.success(`${list.length} carnê(s) enviado(s) para impressão.`);
    } finally {
      setGerandoCarne(false);
    }
  }

  async function gerarBoletos() {
    const { data } = await refetch();
    const list = (data ?? []) as any[];
    const alvos = list.filter((r) => {
      const fp = r.associados?.forma_pagamento;
      return fp === "boleto" || fp === "pix" || fp === "boleto_pix";
    });
    if (alvos.length === 0) {
      toast.error("Nenhuma parcela de associado com forma de pagamento boleto/PIX nos filtros.");
      return;
    }
    setGerandoBol(true);
    const itens: ResumoItem[] = [];
    let ok = 0, jaGer = 0, erro = 0;
    for (const r of alvos) {
      if (r.cobranca_id) {
        jaGer++;
        itens.push({
          mensalidade_id: r.id, nome: r.associados?.nome ?? "",
          competencia: r.competencia, status: "existente", url: r.link_boleto,
        });
        continue;
      }
      try {
        const res: any = await gerarCob({ data: { mensalidade_id: r.id } });
        ok++;
        itens.push({
          mensalidade_id: r.id, nome: r.associados?.nome ?? "",
          competencia: r.competencia, status: "ok", url: res?.linkBoleto ?? null,
        });
      } catch (e: any) {
        erro++;
        itens.push({
          mensalidade_id: r.id, nome: r.associados?.nome ?? "",
          competencia: r.competencia, status: "erro", mensagem: e?.message ?? "Erro",
        });
      }
    }
    setGerandoBol(false);
    setResumo({
      tipo: "boleto",
      quandoISO: new Date().toISOString(),
      totalFiltrado: list.length,
      processadas: alvos.length,
      ok, jaExistentes: jaGer, erros: erro,
      itens,
      filtros: filtrosSnapshot(),
    });
    toast.success(`Boletos: ${ok} gerado(s), ${jaGer} já existente(s), ${erro} erro(s)`);
    imprimirLinksBoletos(itens.map((i) => ({ nome: i.nome, comp: i.competencia, url: i.url ?? null })));
  }

  async function confirmarAcao() {
    const acao = confirmaAcao;
    setConfirmaAcao(null);
    if (acao === "carne") await gerar();
    else if (acao === "boleto") await gerarBoletos();
  }

  async function precarregar() {
    // garante que a contagem esteja atualizada antes de abrir a confirmação
    await refetch();
  }

  return (
    <>
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
          <div className="flex flex-wrap gap-2">
            <Button onClick={async () => { await precarregar(); setConfirmaAcao("carne"); }} disabled={isLoading || gerandoCarne}>
              <BookOpen className="mr-2 h-4 w-4" />{gerandoCarne ? "Gerando..." : "Gerar carnês"}
            </Button>
            <Button variant="outline" onClick={async () => { await precarregar(); setConfirmaAcao("boleto"); }} disabled={isLoading || gerandoBol}>
              <FileText className="mr-2 h-4 w-4" />{gerandoBol ? "Gerando boletos..." : "Gerar boletos (boleto/PIX)"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            <b>Gerar carnês</b>: imprime carnê tradicional. <b>Gerar boletos</b>: emite cobranças (boleto + PIX) apenas para associados com forma de pagamento boleto ou PIX, usando a integração bancária ativa em Configurações.
          </p>

          {rows.length > 0 && (
            <div className="rounded border border-border px-3 py-2 text-sm">
              <b>{rows.length}</b> parcelas no último filtro aplicado.
            </div>
          )}
        </CardContent>
      </Card>

      {resumo && <ResumoPanel resumo={resumo} onFechar={() => setResumo(null)} />}

      <AlertDialog open={!!confirmaAcao} onOpenChange={(v) => !v && setConfirmaAcao(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmaAcao === "carne" ? "Confirmar geração de carnês" : "Confirmar emissão de boletos"}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  {confirmaAcao === "carne"
                    ? `Serão impressos ${rows.length} carnê(s) com os filtros atuais.`
                    : `Serão processadas até ${rows.filter((r: any) => ["boleto","pix","boleto_pix"].includes(r.associados?.forma_pagamento)).length} parcela(s) (associados com boleto/PIX).`}
                </p>
                <div className="rounded bg-muted p-2 text-xs">
                  <div>Cidade: <b>{cidade === "todas" ? "Todas" : cidade}</b></div>
                  <div>Associado: <b>{associadoId === "todos" ? "Todos" : ((associadosData as any[]).find((a) => a.id === associadoId)?.nome ?? assocBusca)}</b></div>
                  <div>Vencimento: <b>{vencDe || "—"}</b> até <b>{vencAte || "—"}</b></div>
                  <div>Dia de pagamento: <b>{diaPag || "—"}</b></div>
                </div>
                {confirmaAcao === "boleto" && (
                  <p className="text-xs text-muted-foreground">
                    Cobranças serão vinculadas às respectivas mensalidades no banco. Parcelas com cobrança já existente serão puladas.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarAcao}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function ResumoPanel({ resumo, onFechar }: { resumo: Resumo; onFechar: () => void }) {
  const dt = new Date(resumo.quandoISO);
  return (
    <Card className="border-border/60 shadow-soft">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="font-serif text-base flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-success" />
          Recibo do processamento — {resumo.tipo === "carne" ? "Carnês" : "Boletos"}
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={onFechar}>Fechar</Button>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
          <Metric label="Total no filtro" value={resumo.totalFiltrado} />
          <Metric label="Processadas" value={resumo.processadas} />
          <Metric label="Sucesso" value={resumo.ok} tone="success" />
          <Metric label="Já existentes" value={resumo.jaExistentes} tone="muted" />
          <Metric label="Erros" value={resumo.erros} tone={resumo.erros > 0 ? "danger" : "muted"} />
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />{dt.toLocaleString("pt-BR")}
        </div>
        <div className="max-h-64 overflow-auto rounded border border-border">
          <table className="w-full text-xs">
            <thead className="bg-muted text-left">
              <tr>
                <th className="px-2 py-1">Associado</th>
                <th className="px-2 py-1">Competência</th>
                <th className="px-2 py-1">Status</th>
                <th className="px-2 py-1">Link / Erro</th>
              </tr>
            </thead>
            <tbody>
              {resumo.itens.map((i, idx) => (
                <tr key={idx} className="border-t border-border">
                  <td className="px-2 py-1">{i.nome}</td>
                  <td className="px-2 py-1 capitalize">{competenciaLabel(i.competencia)}</td>
                  <td className="px-2 py-1">
                    {i.status === "ok" && <span className="text-success inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />OK</span>}
                    {i.status === "existente" && <span className="text-muted-foreground">Já existente</span>}
                    {i.status === "erro" && <span className="text-destructive inline-flex items-center gap-1"><AlertCircle className="h-3 w-3" />Erro</span>}
                  </td>
                  <td className="px-2 py-1">
                    {i.url ? <a href={i.url} target="_blank" rel="noreferrer" className="text-primary underline">Abrir</a>
                      : i.mensagem ? <span className="text-destructive">{i.mensagem}</span> : <span className="text-muted-foreground">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone?: "success" | "danger" | "muted" }) {
  const cls =
    tone === "success" ? "text-success"
    : tone === "danger" ? "text-destructive"
    : tone === "muted" ? "text-muted-foreground"
    : "text-foreground";
  return (
    <div className="rounded border border-border px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`font-serif text-xl font-semibold ${cls}`}>{value}</div>
    </div>
  );
}

function imprimirLinksBoletos(list: { nome: string; comp: string; url: string | null }[]) {
  const w = window.open("", "_blank", "width=800,height=800");
  if (!w) { toast.error("Permita pop-ups para visualizar os boletos."); return; }
  const rows = list.map((l, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${l.nome}</td>
      <td>${l.comp}</td>
      <td>${l.url ? `<a href="${l.url}" target="_blank" rel="noopener">Abrir boleto/PIX</a>` : '<span style="color:#999">Sem link</span>'}</td>
    </tr>`).join("");
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Boletos gerados</title>
    <style>body{font-family:system-ui,sans-serif;padding:20px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:6px 10px;text-align:left}th{background:#f5f5f5}a{color:#0a58ca}</style>
    </head><body>
    <h2>Boletos gerados (${list.length})</h2>
    <p>Clique em cada link para abrir o boleto/PIX no provedor.</p>
    <table><thead><tr><th>#</th><th>Associado</th><th>Competência</th><th>Boleto/PIX</th></tr></thead><tbody>${rows}</tbody></table>
    </body></html>`);
  w.document.close();
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
