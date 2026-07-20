import { createFileRoute, ErrorComponent } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { SkeletonTable } from "@/components/ui/skeleton-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { usePermissions } from "@/hooks/use-permissions";
import { brl, fmtDate } from "@/lib/format";
import { Printer, FileDown } from "lucide-react";

export const Route = createFileRoute("/_authenticated/relatorios")({
  component: RelatoriosPage,
  errorComponent: ErrorComponent,
  notFoundComponent: () => <div className="p-6">Página não encontrada</div>,
});

type Associado = {
  id: string; codigo: number; nome: string; cpf: string | null; telefone: string | null;
  cidade: string | null; estado: string | null; status: string; plano_id: string | null;
  data_adesao: string; data_nascimento: string | null; forma_pagamento: string | null;
  filial_id: string | null;
};
type Plano = { id: string; nome: string; valor_mensal: number | null };
type Mensalidade = {
  id: string; codigo: number | null; associado_id: string; competencia: string;
  vencimento: string; valor: number; status: string;
  data_pagamento: string | null; forma_pagamento: string | null;
  agente_recebimento: string | null;
};
type Conta = {
  id: string; tipo: string; descricao: string; valor: number;
  vencimento: string; data_pagamento: string | null; status: string;
};
type Cobrador = { id: string; nome: string };
type Filial = { id: string; nome: string };

function RelatoriosPage() {
  const { canTab, isAdmin } = usePermissions();
  const [tab, setTab] = useState("associados");
  const [associados, setAssociados] = useState<Associado[]>([]);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [mensalidades, setMensalidades] = useState<Mensalidade[]>([]);
  const [contas, setContas] = useState<Conta[]>([]);
  const [cobradores, setCobradores] = useState<Cobrador[]>([]);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const [dateFrom, setDateFrom] = useState(firstOfMonth.toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(today.toISOString().slice(0, 10));

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [a, p, m, c, cb, fi] = await Promise.all([
        supabase.from("associados").select("id, codigo, nome, cpf, telefone, cidade, estado, status, plano_id, data_adesao, data_nascimento, forma_pagamento, filial_id").order("nome"),
        supabase.from("planos").select("id, nome, valor_mensal").order("nome"),
        supabase.from("mensalidades").select("id, codigo, associado_id, competencia, vencimento, valor, status, data_pagamento, forma_pagamento, agente_recebimento"),
        supabase.from("contas_financeiras").select("id, tipo, descricao, valor, vencimento, data_pagamento, status"),
        supabase.from("cobradores").select("id, nome").eq("ativo", true).order("nome"),
        supabase.from("filiais").select("id, nome").eq("ativo", true).order("nome"),
      ]);
      setAssociados((a.data ?? []) as Associado[]);
      setPlanos((p.data ?? []) as Plano[]);
      setMensalidades((m.data ?? []) as Mensalidade[]);
      setContas((c.data ?? []) as Conta[]);
      setCobradores((cb.data ?? []) as Cobrador[]);
      setFiliais((fi.data ?? []) as Filial[]);
      setLoading(false);
    })();
  }, []);

  const planoNome = (id: string | null) => planos.find((p) => p.id === id)?.nome ?? "—";
  const assocNome = (id: string) => associados.find((a) => a.id === id)?.nome ?? "—";

  const tabs: { key: string; label: string }[] = [
    { key: "associados", label: "Associados" },
    { key: "mensalidades", label: "Mensalidades" },
    { key: "recebimentos", label: "Recebimentos" },
    { key: "financeiro", label: "Financeiro" },
    { key: "planos", label: "Planos" },
    { key: "aniversariantes", label: "Aniversariantes" },
    { key: "inadimplencia", label: "Inadimplência" },
  ];
  const visibleTabs = tabs.filter((t) => isAdmin || canTab("relatorios", t.key));

  return (
    <AppShell title="Relatórios" subtitle="Central de relatórios do sistema">
      <div className="space-y-4">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex flex-wrap">
            {visibleTabs.map((t) => (
              <TabsTrigger key={t.key} value={t.key}>{t.label}</TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="associados" className="mt-4">
            <AssociadosReport associados={associados} planos={planos} filiais={filiais} planoNome={planoNome} loading={loading} />
          </TabsContent>
          <TabsContent value="mensalidades" className="mt-4">
            <MensalidadesReport
              mensalidades={mensalidades} assocNome={assocNome}
              dateFrom={dateFrom} dateTo={dateTo} setDateFrom={setDateFrom} setDateTo={setDateTo}
              loading={loading}
            />
          </TabsContent>
          <TabsContent value="recebimentos" className="mt-4">
            <RecebimentosReport
              mensalidades={mensalidades} assocNome={assocNome} cobradores={cobradores}
              dateFrom={dateFrom} dateTo={dateTo} setDateFrom={setDateFrom} setDateTo={setDateTo}
              loading={loading}
            />
          </TabsContent>
          <TabsContent value="financeiro" className="mt-4">
            <FinanceiroReport
              contas={contas}
              dateFrom={dateFrom} dateTo={dateTo} setDateFrom={setDateFrom} setDateTo={setDateTo}
              loading={loading}
            />
          </TabsContent>
          <TabsContent value="planos" className="mt-4">
            <PlanosReport associados={associados} planos={planos} loading={loading} />
          </TabsContent>
          <TabsContent value="aniversariantes" className="mt-4">
            <AniversariantesReport associados={associados} loading={loading} />
          </TabsContent>
          <TabsContent value="inadimplencia" className="mt-4">
            <InadimplenciaReport mensalidades={mensalidades} associados={associados} planoNome={planoNome} loading={loading} />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

/* ---------- Utilitários de exportação ---------- */

function toCSV(headers: string[], rows: (string | number)[][]) {
  const esc = (v: any) => {
    const s = String(v ?? "");
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(";"), ...rows.map((r) => r.map(esc).join(";"))].join("\n");
}

function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const csv = "\ufeff" + toCSV(headers, rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

async function printReport(title: string, subtitle: string, headers: string[], rows: (string | number)[][], footer?: string) {
  const w = window.open("", "_blank"); if (!w) return;
  const { getEmpresaHeaderHTML } = await import("@/lib/print-header");
  const header = await getEmpresaHeaderHTML();
  const html = `<!doctype html><html><head><title>${title}</title>
    <style>body{font-family:Arial,sans-serif;padding:24px;color:#111}
    h1{font-size:18px;margin:0 0 4px} .sub{color:#666;font-size:12px;margin-bottom:12px}
    table{width:100%;border-collapse:collapse} th,td{border:1px solid #ddd;padding:6px;font-size:12px;text-align:left}
    th{background:#f3f4f6} .foot{margin-top:12px;font-size:12px;color:#333}</style></head><body>
    ${header}
    <h1>${title}</h1><div class="sub">${subtitle}</div>
    <table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
    <tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c ?? ""}</td>`).join("")}</tr>`).join("")}</tbody></table>
    ${footer ? `<div class="foot">${footer}</div>` : ""}
    <script>window.onload=()=>window.print()</script></body></html>`;
  w.document.write(html); w.document.close();
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <Card><CardContent className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </CardContent></Card>
  );
}

function DateRange(props: {
  dateFrom: string; dateTo: string;
  setDateFrom: (s: string) => void; setDateTo: (s: string) => void;
}) {
  return (
    <>
      <div>
        <Label className="text-xs">De</Label>
        <Input type="date" value={props.dateFrom} onChange={(e) => props.setDateFrom(e.target.value)} />
      </div>
      <div>
        <Label className="text-xs">Até</Label>
        <Input type="date" value={props.dateTo} onChange={(e) => props.setDateTo(e.target.value)} />
      </div>
    </>
  );
}

/* ---------- Relatórios individuais ---------- */

function AssociadosReport({ associados, planos, filiais, planoNome, loading }: {
  associados: Associado[]; planos: Plano[]; filiais: Filial[]; planoNome: (id: string | null) => string; loading: boolean;
}) {
  const [status, setStatus] = useState("__all__");
  const [planoId, setPlanoId] = useState("__all__");
  const [cidade, setCidade] = useState("");
  const [filialId, setFilialId] = useState("__all__");

  const cidades = useMemo(() => Array.from(new Set(associados.map((a) => a.cidade).filter(Boolean) as string[])).sort(), [associados]);
  const filialNome = (id: string | null) => id ? (filiais.find((f) => f.id === id)?.nome ?? "—") : "Matriz";

  const filtered = useMemo(() => associados.filter((a) => {
    if (status !== "__all__" && a.status !== status) return false;
    if (planoId !== "__all__" && a.plano_id !== planoId) return false;
    if (cidade && !(a.cidade ?? "").toLowerCase().includes(cidade.toLowerCase())) return false;
    if (filialId !== "__all__") {
      if (filialId === "matriz" && a.filial_id) return false;
      if (filialId !== "matriz" && a.filial_id !== filialId) return false;
    }
    return true;
  }), [associados, status, planoId, cidade, filialId]);

  const headers = ["Código", "Nome", "CPF", "Telefone", "Cidade/UF", "Filial", "Plano", "Status", "Adesão"];
  const rows = filtered.map((a) => [
    a.codigo, a.nome, a.cpf ?? "", a.telefone ?? "",
    `${a.cidade ?? ""}${a.estado ? "/" + a.estado : ""}`,
    filialNome(a.filial_id),
    planoNome(a.plano_id), a.status, fmtDate(a.data_adesao),
  ]);

  return (
    <div className="space-y-3">
      <Card><CardContent className="grid gap-3 p-4 md:grid-cols-5">
        <div>
          <Label className="text-xs">Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="inativo">Inativo</SelectItem>
              <SelectItem value="suspenso">Suspenso</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Plano</Label>
          <Select value={planoId} onValueChange={setPlanoId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos</SelectItem>
              {planos.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Filial</Label>
          <Select value={filialId} onValueChange={setFilialId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas</SelectItem>
              <SelectItem value="matriz">Matriz</SelectItem>
              {filiais.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Cidade</Label>
          <Input value={cidade} onChange={(e) => setCidade(e.target.value)} list="rel-cidades" />
          <datalist id="rel-cidades">{cidades.map((c) => <option key={c} value={c} />)}</datalist>
        </div>
        <div className="flex items-end gap-2">
          <Button size="sm" variant="outline" onClick={() => printReport("Relatório de Associados", `${filtered.length} registros`, headers, rows)}>
            <Printer className="mr-2 h-4 w-4" /> Imprimir
          </Button>
          <Button size="sm" variant="outline" onClick={() => downloadCSV("associados.csv", headers, rows)}>
            <FileDown className="mr-2 h-4 w-4" /> CSV
          </Button>
        </div>
      </CardContent></Card>

      <div className="grid gap-3 md:grid-cols-3">
        <Kpi label="Total" value={filtered.length} />
        <Kpi label="Ativos" value={filtered.filter((a) => a.status === "ativo").length} />
        <Kpi label="Inativos" value={filtered.filter((a) => a.status !== "ativo").length} />
      </div>

      <Card><CardContent className="overflow-x-auto p-0">
        <Table>
          <TableHeader><TableRow>
            {headers.map((h) => <TableHead key={h}>{h}</TableHead>)}
          </TableRow></TableHeader>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={headers.length} className="p-3"><SkeletonTable rows={5} cols={headers.length} /></TableCell></TableRow>}
            {!loading && filtered.length === 0 && <TableRow><TableCell colSpan={headers.length} className="text-center text-sm text-muted-foreground">Sem registros</TableCell></TableRow>}
            {filtered.map((a) => (
              <TableRow key={a.id}>
                <TableCell>{a.codigo}</TableCell>
                <TableCell className="font-medium">{a.nome}</TableCell>
                <TableCell>{a.cpf ?? "—"}</TableCell>
                <TableCell>{a.telefone ?? "—"}</TableCell>
                <TableCell>{a.cidade ?? "—"}{a.estado ? `/${a.estado}` : ""}</TableCell>
                <TableCell>{filialNome(a.filial_id)}</TableCell>
                <TableCell>{planoNome(a.plano_id)}</TableCell>
                <TableCell><Badge variant="secondary">{a.status}</Badge></TableCell>
                <TableCell>{fmtDate(a.data_adesao)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}

function MensalidadesReport({ mensalidades, assocNome, dateFrom, dateTo, setDateFrom, setDateTo, loading }: {
  mensalidades: Mensalidade[]; assocNome: (id: string) => string;
  dateFrom: string; dateTo: string; setDateFrom: (s: string) => void; setDateTo: (s: string) => void;
  loading: boolean;
}) {
  const [status, setStatus] = useState("__all__");
  const filtered = useMemo(() => mensalidades.filter((m) => {
    if (m.vencimento < dateFrom || m.vencimento > dateTo) return false;
    if (status !== "__all__" && m.status !== status) return false;
    return true;
  }), [mensalidades, dateFrom, dateTo, status]);

  const total = filtered.reduce((s, m) => s + Number(m.valor), 0);
  const pago = filtered.filter((m) => m.status === "pago").reduce((s, m) => s + Number(m.valor), 0);
  const aberto = filtered.filter((m) => m.status !== "pago" && m.status !== "cancelado").reduce((s, m) => s + Number(m.valor), 0);

  const headers = ["Código", "Associado", "Competência", "Vencimento", "Valor", "Status", "Pagamento"];
  const rows = filtered.map((m) => [
    m.codigo ?? "", assocNome(m.associado_id), m.competencia.slice(0, 7),
    fmtDate(m.vencimento), brl(m.valor), m.status, m.data_pagamento ? fmtDate(m.data_pagamento) : "—",
  ]);

  return (
    <div className="space-y-3">
      <Card><CardContent className="grid gap-3 p-4 md:grid-cols-4">
        <DateRange dateFrom={dateFrom} dateTo={dateTo} setDateFrom={setDateFrom} setDateTo={setDateTo} />
        <div>
          <Label className="text-xs">Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="pago">Pago</SelectItem>
              <SelectItem value="atrasado">Atrasado</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end gap-2">
          <Button size="sm" variant="outline" onClick={() => printReport("Relatório de Mensalidades", `${dateFrom} a ${dateTo} — ${filtered.length} registros`, headers, rows, `Total: ${brl(total)} | Pago: ${brl(pago)} | Em aberto: ${brl(aberto)}`)}>
            <Printer className="mr-2 h-4 w-4" /> Imprimir
          </Button>
          <Button size="sm" variant="outline" onClick={() => downloadCSV("mensalidades.csv", headers, rows)}>
            <FileDown className="mr-2 h-4 w-4" /> CSV
          </Button>
        </div>
      </CardContent></Card>

      <div className="grid gap-3 md:grid-cols-4">
        <Kpi label="Parcelas" value={filtered.length} />
        <Kpi label="Total" value={brl(total)} />
        <Kpi label="Pago" value={brl(pago)} />
        <Kpi label="Em aberto" value={brl(aberto)} />
      </div>

      <Card><CardContent className="overflow-x-auto p-0">
        <Table>
          <TableHeader><TableRow>{headers.map((h) => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={headers.length} className="p-3"><SkeletonTable rows={5} cols={headers.length} /></TableCell></TableRow>}
            {!loading && filtered.length === 0 && <TableRow><TableCell colSpan={headers.length} className="text-center text-sm text-muted-foreground">Sem registros</TableCell></TableRow>}
            {filtered.map((m) => (
              <TableRow key={m.id}>
                <TableCell>{m.codigo ?? "—"}</TableCell>
                <TableCell className="font-medium">{assocNome(m.associado_id)}</TableCell>
                <TableCell>{m.competencia.slice(0, 7)}</TableCell>
                <TableCell>{fmtDate(m.vencimento)}</TableCell>
                <TableCell>{brl(m.valor)}</TableCell>
                <TableCell><Badge variant="secondary">{m.status}</Badge></TableCell>
                <TableCell>{m.data_pagamento ? fmtDate(m.data_pagamento) : "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}

function RecebimentosReport({ mensalidades, assocNome, cobradores, dateFrom, dateTo, setDateFrom, setDateTo, loading }: {
  mensalidades: Mensalidade[]; assocNome: (id: string) => string; cobradores: Cobrador[];
  dateFrom: string; dateTo: string; setDateFrom: (s: string) => void; setDateTo: (s: string) => void;
  loading: boolean;
}) {
  const [forma, setForma] = useState("__all__");
  const [cobradorId, setCobradorId] = useState("__all__");
  const cobradorNome = cobradores.find((c) => c.id === cobradorId)?.nome ?? "";

  const filtered = useMemo(() => mensalidades.filter((m) => {
    if (m.status !== "pago" || !m.data_pagamento) return false;
    if (m.data_pagamento < dateFrom || m.data_pagamento > dateTo) return false;
    if (forma !== "__all__" && (m.forma_pagamento ?? "") !== forma) return false;
    if (forma === "cobrador" && cobradorId !== "__all__" && m.agente_recebimento !== cobradorNome) return false;
    return true;
  }), [mensalidades, dateFrom, dateTo, forma, cobradorId, cobradorNome]);

  const total = filtered.reduce((s, m) => s + Number(m.valor), 0);
  const porForma = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const m of filtered) {
      const f = m.forma_pagamento || "não informado";
      acc[f] = (acc[f] ?? 0) + Number(m.valor);
    }
    return acc;
  }, [filtered]);

  const headers = ["Data Pgto", "Código", "Associado", "Vencimento", "Valor", "Forma", "Agente"];
  const rows = filtered.map((m) => [
    fmtDate(m.data_pagamento!), m.codigo ?? "", assocNome(m.associado_id),
    fmtDate(m.vencimento), brl(m.valor), m.forma_pagamento ?? "—", m.agente_recebimento ?? "—",
  ]);

  return (
    <div className="space-y-3">
      <Card><CardContent className="grid gap-3 p-4 md:grid-cols-5">
        <DateRange dateFrom={dateFrom} dateTo={dateTo} setDateFrom={setDateFrom} setDateTo={setDateTo} />
        <div>
          <Label className="text-xs">Forma de pagamento</Label>
          <Select value={forma} onValueChange={(v) => { setForma(v); setCobradorId("__all__"); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas</SelectItem>
              <SelectItem value="dinheiro">Dinheiro</SelectItem>
              <SelectItem value="pix">PIX</SelectItem>
              <SelectItem value="boleto">Boleto</SelectItem>
              <SelectItem value="cartao">Cartão</SelectItem>
              <SelectItem value="carne">Carnê</SelectItem>
              <SelectItem value="cobrador">Cobrador</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {forma === "cobrador" && (
          <div>
            <Label className="text-xs">Cobrador</Label>
            <Select value={cobradorId} onValueChange={setCobradorId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos os cobradores</SelectItem>
                {cobradores.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="flex items-end gap-2">
          <Button size="sm" variant="outline" onClick={() => printReport("Relatório de Recebimentos", `${dateFrom} a ${dateTo} — Total ${brl(total)}`, headers, rows)}>
            <Printer className="mr-2 h-4 w-4" /> Imprimir
          </Button>
          <Button size="sm" variant="outline" onClick={() => downloadCSV("recebimentos.csv", headers, rows)}>
            <FileDown className="mr-2 h-4 w-4" /> CSV
          </Button>
        </div>
      </CardContent></Card>

      <div className="grid gap-3 md:grid-cols-3">
        <Kpi label="Recebimentos" value={filtered.length} />
        <Kpi label="Total recebido" value={brl(total)} />
        <Kpi label="Ticket médio" value={brl(filtered.length ? total / filtered.length : 0)} />
      </div>

      {Object.keys(porForma).length > 0 && (
        <Card><CardContent className="p-4">
          <p className="mb-2 text-sm font-medium">Por forma de pagamento</p>
          <div className="grid gap-2 md:grid-cols-3">
            {Object.entries(porForma).map(([f, v]) => (
              <div key={f} className="flex justify-between rounded border p-2 text-sm">
                <span className="capitalize">{f}</span><span className="font-medium">{brl(v)}</span>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      <Card><CardContent className="overflow-x-auto p-0">
        <Table>
          <TableHeader><TableRow>{headers.map((h) => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={headers.length} className="p-3"><SkeletonTable rows={5} cols={headers.length} /></TableCell></TableRow>}
            {!loading && filtered.length === 0 && <TableRow><TableCell colSpan={headers.length} className="text-center text-sm text-muted-foreground">Sem registros</TableCell></TableRow>}
            {filtered.map((m) => (
              <TableRow key={m.id}>
                <TableCell>{fmtDate(m.data_pagamento!)}</TableCell>
                <TableCell>{m.codigo ?? "—"}</TableCell>
                <TableCell className="font-medium">{assocNome(m.associado_id)}</TableCell>
                <TableCell>{fmtDate(m.vencimento)}</TableCell>
                <TableCell>{brl(m.valor)}</TableCell>
                <TableCell className="capitalize">{m.forma_pagamento ?? "—"}</TableCell>
                <TableCell>{m.agente_recebimento ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}

function FinanceiroReport({ contas, dateFrom, dateTo, setDateFrom, setDateTo, loading }: {
  contas: Conta[];
  dateFrom: string; dateTo: string; setDateFrom: (s: string) => void; setDateTo: (s: string) => void;
  loading: boolean;
}) {
  const [tipo, setTipo] = useState("__all__");
  const [status, setStatus] = useState("__all__");

  const filtered = useMemo(() => contas.filter((c) => {
    const ref = c.data_pagamento ?? c.vencimento;
    if (ref < dateFrom || ref > dateTo) return false;
    if (tipo !== "__all__" && c.tipo !== tipo) return false;
    if (status !== "__all__" && c.status !== status) return false;
    return true;
  }), [contas, dateFrom, dateTo, tipo, status]);

  const receitas = filtered.filter((c) => c.tipo === "receita").reduce((s, c) => s + Number(c.valor), 0);
  const despesas = filtered.filter((c) => c.tipo === "despesa").reduce((s, c) => s + Number(c.valor), 0);

  const headers = ["Tipo", "Descrição", "Vencimento", "Pagamento", "Valor", "Status"];
  const rows = filtered.map((c) => [
    c.tipo, c.descricao,
    fmtDate(c.vencimento), c.data_pagamento ? fmtDate(c.data_pagamento) : "—",
    brl(c.valor), c.status,
  ]);

  return (
    <div className="space-y-3">
      <Card><CardContent className="grid gap-3 p-4 md:grid-cols-5">
        <DateRange dateFrom={dateFrom} dateTo={dateTo} setDateFrom={setDateFrom} setDateTo={setDateTo} />
        <div>
          <Label className="text-xs">Tipo</Label>
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos</SelectItem>
              <SelectItem value="receita">Receita</SelectItem>
              <SelectItem value="despesa">Despesa</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="pago">Pago</SelectItem>
              <SelectItem value="atrasado">Atrasado</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent></Card>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => printReport("Relatório Financeiro", `${dateFrom} a ${dateTo}`, headers, rows, `Receitas: ${brl(receitas)} | Despesas: ${brl(despesas)} | Saldo: ${brl(receitas - despesas)}`)}>
          <Printer className="mr-2 h-4 w-4" /> Imprimir
        </Button>
        <Button size="sm" variant="outline" onClick={() => downloadCSV("financeiro.csv", headers, rows)}>
          <FileDown className="mr-2 h-4 w-4" /> CSV
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Kpi label="Receitas" value={brl(receitas)} />
        <Kpi label="Despesas" value={brl(despesas)} />
        <Kpi label="Saldo" value={brl(receitas - despesas)} />
      </div>

      <Card><CardContent className="overflow-x-auto p-0">
        <Table>
          <TableHeader><TableRow>{headers.map((h) => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={headers.length} className="p-3"><SkeletonTable rows={5} cols={headers.length} /></TableCell></TableRow>}
            {!loading && filtered.length === 0 && <TableRow><TableCell colSpan={headers.length} className="text-center text-sm text-muted-foreground">Sem registros</TableCell></TableRow>}
            {filtered.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="capitalize">{c.tipo}</TableCell>
                <TableCell className="font-medium">{c.descricao}</TableCell>
                <TableCell>{fmtDate(c.vencimento)}</TableCell>
                <TableCell>{c.data_pagamento ? fmtDate(c.data_pagamento) : "—"}</TableCell>
                <TableCell>{brl(c.valor)}</TableCell>
                <TableCell><Badge variant="secondary">{c.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}

function PlanosReport({ associados, planos, loading }: { associados: Associado[]; planos: Plano[]; loading: boolean }) {
  const rows = useMemo(() => planos.map((p) => {
    const ativos = associados.filter((a) => a.plano_id === p.id && a.status === "ativo").length;
    const total = associados.filter((a) => a.plano_id === p.id).length;
    const receita = ativos * Number(p.valor_mensal ?? 0);
    return { id: p.id, nome: p.nome, valor: Number(p.valor_mensal ?? 0), ativos, total, receita };
  }), [planos, associados]);

  const totalAtivos = rows.reduce((s, r) => s + r.ativos, 0);
  const totalReceita = rows.reduce((s, r) => s + r.receita, 0);

  const headers = ["Plano", "Valor mensal", "Associados ativos", "Total associados", "Receita estimada"];
  const tableRows = rows.map((r) => [r.nome, brl(r.valor), r.ativos, r.total, brl(r.receita)]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => printReport("Relatório de Planos", "Distribuição de associados por plano", headers, tableRows, `Total ativos: ${totalAtivos} | Receita mensal estimada: ${brl(totalReceita)}`)}>
          <Printer className="mr-2 h-4 w-4" /> Imprimir
        </Button>
        <Button size="sm" variant="outline" onClick={() => downloadCSV("planos.csv", headers, tableRows)}>
          <FileDown className="mr-2 h-4 w-4" /> CSV
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Kpi label="Planos" value={rows.length} />
        <Kpi label="Ativos" value={totalAtivos} />
        <Kpi label="Receita mensal estimada" value={brl(totalReceita)} />
      </div>

      <Card><CardContent className="overflow-x-auto p-0">
        <Table>
          <TableHeader><TableRow>{headers.map((h) => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={headers.length} className="p-3"><SkeletonTable rows={5} cols={headers.length} /></TableCell></TableRow>}
            {!loading && rows.length === 0 && <TableRow><TableCell colSpan={headers.length} className="text-center text-sm text-muted-foreground">Sem planos</TableCell></TableRow>}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.nome}</TableCell>
                <TableCell>{brl(r.valor)}</TableCell>
                <TableCell>{r.ativos}</TableCell>
                <TableCell>{r.total}</TableCell>
                <TableCell>{brl(r.receita)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}

function AniversariantesReport({ associados, loading }: { associados: Associado[]; loading: boolean }) {
  const [mes, setMes] = useState(String(new Date().getMonth() + 1));
  const meses = [
    "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
    "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
  ];

  const filtered = useMemo(() => {
    const m = Number(mes);
    return associados
      .filter((a) => a.data_nascimento && Number(a.data_nascimento.slice(5, 7)) === m)
      .sort((a, b) => (a.data_nascimento ?? "").slice(8, 10).localeCompare((b.data_nascimento ?? "").slice(8, 10)));
  }, [associados, mes]);

  const headers = ["Dia", "Código", "Nome", "Telefone", "Cidade/UF"];
  const rows = filtered.map((a) => [
    (a.data_nascimento ?? "").slice(8, 10),
    a.codigo, a.nome, a.telefone ?? "",
    `${a.cidade ?? ""}${a.estado ? "/" + a.estado : ""}`,
  ]);

  return (
    <div className="space-y-3">
      <Card><CardContent className="grid gap-3 p-4 md:grid-cols-3">
        <div>
          <Label className="text-xs">Mês</Label>
          <Select value={mes} onValueChange={setMes}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {meses.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end gap-2 md:col-span-2">
          <Button size="sm" variant="outline" onClick={() => printReport("Aniversariantes do mês", meses[Number(mes) - 1], headers, rows)}>
            <Printer className="mr-2 h-4 w-4" /> Imprimir
          </Button>
          <Button size="sm" variant="outline" onClick={() => downloadCSV("aniversariantes.csv", headers, rows)}>
            <FileDown className="mr-2 h-4 w-4" /> CSV
          </Button>
        </div>
      </CardContent></Card>

      <Card><CardContent className="overflow-x-auto p-0">
        <Table>
          <TableHeader><TableRow>{headers.map((h) => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={headers.length} className="p-3"><SkeletonTable rows={5} cols={headers.length} /></TableCell></TableRow>}
            {!loading && filtered.length === 0 && <TableRow><TableCell colSpan={headers.length} className="text-center text-sm text-muted-foreground">Sem aniversariantes</TableCell></TableRow>}
            {filtered.map((a) => (
              <TableRow key={a.id}>
                <TableCell>{(a.data_nascimento ?? "").slice(8, 10)}</TableCell>
                <TableCell>{a.codigo}</TableCell>
                <TableCell className="font-medium">{a.nome}</TableCell>
                <TableCell>{a.telefone ?? "—"}</TableCell>
                <TableCell>{a.cidade ?? "—"}{a.estado ? `/${a.estado}` : ""}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}

function InadimplenciaReport({ mensalidades, associados, planoNome, loading }: {
  mensalidades: Mensalidade[]; associados: Associado[];
  planoNome: (id: string | null) => string; loading: boolean;
}) {
  const hoje = new Date().toISOString().slice(0, 10);
  const emAberto = useMemo(() => mensalidades.filter((m) =>
    m.status !== "pago" && m.status !== "cancelado" && m.vencimento < hoje
  ), [mensalidades, hoje]);

  const porAssociado = useMemo(() => {
    const acc = new Map<string, { assoc: Associado | undefined; parcelas: number; total: number; ultimoVenc: string }>();
    for (const m of emAberto) {
      const cur = acc.get(m.associado_id) ?? {
        assoc: associados.find((a) => a.id === m.associado_id),
        parcelas: 0, total: 0, ultimoVenc: m.vencimento,
      };
      cur.parcelas += 1;
      cur.total += Number(m.valor);
      if (m.vencimento > cur.ultimoVenc) cur.ultimoVenc = m.vencimento;
      acc.set(m.associado_id, cur);
    }
    return Array.from(acc.entries())
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.total - a.total);
  }, [emAberto, associados]);

  const total = porAssociado.reduce((s, r) => s + r.total, 0);
  const headers = ["Código", "Associado", "Plano", "Telefone", "Parcelas em atraso", "Valor total", "Último vencimento"];
  const rows = porAssociado.map((r) => [
    r.assoc?.codigo ?? "", r.assoc?.nome ?? "—", planoNome(r.assoc?.plano_id ?? null),
    r.assoc?.telefone ?? "—", r.parcelas, brl(r.total), fmtDate(r.ultimoVenc),
  ]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => printReport("Relatório de Inadimplência", `Posição em ${fmtDate(hoje)}`, headers, rows, `Associados inadimplentes: ${porAssociado.length} | Total em aberto: ${brl(total)}`)}>
          <Printer className="mr-2 h-4 w-4" /> Imprimir
        </Button>
        <Button size="sm" variant="outline" onClick={() => downloadCSV("inadimplencia.csv", headers, rows)}>
          <FileDown className="mr-2 h-4 w-4" /> CSV
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Kpi label="Associados inadimplentes" value={porAssociado.length} />
        <Kpi label="Parcelas em atraso" value={emAberto.length} />
        <Kpi label="Total em aberto" value={brl(total)} />
      </div>

      <Card><CardContent className="overflow-x-auto p-0">
        <Table>
          <TableHeader><TableRow>{headers.map((h) => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader>
          <TableBody>
            {loading && <TableRow><TableCell colSpan={headers.length} className="p-3"><SkeletonTable rows={5} cols={headers.length} /></TableCell></TableRow>}
            {!loading && porAssociado.length === 0 && <TableRow><TableCell colSpan={headers.length} className="text-center text-sm text-muted-foreground">Nenhum inadimplente 🎉</TableCell></TableRow>}
            {porAssociado.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.assoc?.codigo ?? "—"}</TableCell>
                <TableCell className="font-medium">{r.assoc?.nome ?? "—"}</TableCell>
                <TableCell>{planoNome(r.assoc?.plano_id ?? null)}</TableCell>
                <TableCell>{r.assoc?.telefone ?? "—"}</TableCell>
                <TableCell>{r.parcelas}</TableCell>
                <TableCell>{brl(r.total)}</TableCell>
                <TableCell>{fmtDate(r.ultimoVenc)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
