import { createFileRoute, ErrorComponent } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Printer, BarChart3 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/vendas-relatorio")({
  component: VendasRelatorioPage,
  errorComponent: ErrorComponent,
  notFoundComponent: () => <div className="p-6">Página não encontrada</div>,
});

const TIPO_VENDA_OPTIONS = [
  { value: "nova_venda", label: "Nova venda" },
  { value: "troca_plano", label: "Troca de plano" },
  { value: "cancelamento", label: "Cancelamento" },
];

const STATUS_OPTIONS = [
  { value: "prospect", label: "Prospect" },
  { value: "associado", label: "Associado" },
  { value: "recusou", label: "Recusou" },
  { value: "sem_interesse", label: "Sem interesse" },
  { value: "retornar", label: "Retornar" },
];

type Pin = {
  id: string;
  nome: string;
  telefone: string | null;
  endereco: string | null;
  municipio: string | null;
  uf: string | null;
  status: string;
  tipo_venda: string | null;
  data_retorno: string | null;
  observacoes: string | null;
  plano_id: string | null;
  associado_id: string | null;
  latitude: number;
  longitude: number;
  created_at: string;
  vendedor_id: string;
};

type Plano = { id: string; nome: string; valor_mensal: number | null };

function VendasRelatorioPage() {
  const [pins, setPins] = useState<Pin[]>([]);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const firstDay = new Date(); firstDay.setDate(1);
  const [dateFrom, setDateFrom] = useState(firstDay.toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(today);
  const [tipo, setTipo] = useState<string>("__all__");
  const [municipio, setMunicipio] = useState<string>("__all__");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<Partial<Pin>>({});

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id ?? null);
    const [{ data: p }, { data: pl }] = await Promise.all([
      supabase.from("vendas_pins").select("*").order("created_at", { ascending: false }),
      supabase.from("planos").select("id, nome, valor_mensal").eq("ativo", true).order("nome"),
    ]);
    setPins((p ?? []) as Pin[]);
    setPlanos((pl ?? []) as Plano[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const municipios = useMemo(() => {
    const s = new Set<string>();
    for (const p of pins) if (p.municipio) s.add(p.municipio);
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [pins]);

  const filtered = useMemo(() => {
    return pins.filter((p) => {
      const d = p.created_at.slice(0, 10);
      if (d < dateFrom || d > dateTo) return false;
      if (tipo !== "__all__" && p.tipo_venda !== tipo) return false;
      if (municipio !== "__all__" && p.municipio !== municipio) return false;
      return true;
    });
  }, [pins, dateFrom, dateTo, tipo, municipio]);

  const stats = useMemo(() => {
    const counts: Record<string, number> = { nova_venda: 0, troca_plano: 0, cancelamento: 0, sem_tipo: 0 };
    let receitaEstimada = 0;
    for (const p of filtered) {
      const key = p.tipo_venda ?? "sem_tipo";
      counts[key] = (counts[key] ?? 0) + 1;
      if (p.tipo_venda === "nova_venda" && p.plano_id) {
        const pl = planos.find((x) => x.id === p.plano_id);
        if (pl?.valor_mensal) receitaEstimada += Number(pl.valor_mensal);
      }
    }
    return { counts, total: filtered.length, receitaEstimada };
  }, [filtered, planos]);

  function openNew() {
    setForm({
      nome: "",
      status: "associado",
      tipo_venda: "nova_venda",
      latitude: 0,
      longitude: 0,
    });
    setDialogOpen(true);
  }

  async function save() {
    if (!form.nome) return toast.error("Informe o nome");
    if (!userId) return toast.error("Sessão inválida");
    const payload = {
      nome: form.nome,
      telefone: form.telefone || null,
      endereco: form.endereco || null,
      municipio: form.municipio || null,
      uf: form.uf || null,
      status: form.status || "associado",
      tipo_venda: form.tipo_venda || null,
      data_retorno: form.status === "retornar" ? (form.data_retorno || null) : null,
      observacoes: form.observacoes || null,
      plano_id: form.plano_id || null,
      latitude: form.latitude ?? 0,
      longitude: form.longitude ?? 0,
      vendedor_id: userId,
    };
    const { error } = await supabase.from("vendas_pins").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Venda registrada");
    setDialogOpen(false);
    await load();
  }

  function printReport() {
    const w = window.open("", "_blank");
    if (!w) return;
    const rows = filtered.map((p) => {
      const pl = planos.find((x) => x.id === p.plano_id);
      const t = TIPO_VENDA_OPTIONS.find((x) => x.value === p.tipo_venda)?.label ?? "-";
      return `<tr>
        <td>${new Date(p.created_at).toLocaleDateString("pt-BR")}</td>
        <td>${p.nome}</td>
        <td>${t}</td>
        <td>${pl?.nome ?? "-"}</td>
        <td>${p.municipio ?? "-"}${p.uf ? "/" + p.uf : ""}</td>
        <td>${p.telefone ?? "-"}</td>
      </tr>`;
    }).join("");
    w.document.write(`<!doctype html><html><head><title>Relatório de Vendas</title>
      <style>body{font-family:Arial;padding:24px}table{width:100%;border-collapse:collapse}
      th,td{border:1px solid #ccc;padding:6px;font-size:12px;text-align:left}
      th{background:#f3f4f6}h1{font-size:18px}</style></head><body>
      <h1>Relatório de Vendas</h1>
      <p>Período: ${dateFrom} a ${dateTo} — Total: ${filtered.length}</p>
      <table><thead><tr><th>Data</th><th>Nome</th><th>Tipo</th><th>Plano</th><th>Município</th><th>Telefone</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <script>window.print()</script></body></html>`);
    w.document.close();
  }

  return (
    <AppShell
      title="Relatório de Vendas"
      subtitle="Vendas registradas a partir do mapa"
      actions={
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={printReport}>
            <Printer className="mr-2 h-4 w-4" /> Imprimir
          </Button>
          <Button size="sm" onClick={openNew}>
            <Plus className="mr-2 h-4 w-4" /> Nova venda
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Card>
          <CardContent className="grid gap-3 p-4 md:grid-cols-4">
            <div>
              <Label className="text-xs">De</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Até</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Tipo</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos</SelectItem>
                  {TIPO_VENDA_OPTIONS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Município</Label>
              <Select value={municipio} onValueChange={setMunicipio}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos</SelectItem>
                  {municipios.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-3 md:grid-cols-4">
          <KpiCard label="Total" value={stats.total} />
          <KpiCard label="Novas vendas" value={stats.counts.nova_venda ?? 0} />
          <KpiCard label="Trocas de plano" value={stats.counts.troca_plano ?? 0} />
          <KpiCard label="Cancelamentos" value={stats.counts.cancelamento ?? 0} />
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Município</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground">Carregando...</TableCell></TableRow>
                )}
                {!loading && filtered.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground">Nenhum registro</TableCell></TableRow>
                )}
                {filtered.map((p) => {
                  const pl = planos.find((x) => x.id === p.plano_id);
                  const t = TIPO_VENDA_OPTIONS.find((x) => x.value === p.tipo_venda)?.label;
                  const st = STATUS_OPTIONS.find((x) => x.value === p.status)?.label ?? p.status;
                  return (
                    <TableRow key={p.id}>
                      <TableCell>{new Date(p.created_at).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell className="font-medium">{p.nome}</TableCell>
                      <TableCell>{t ?? <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell>{pl?.nome ?? "—"}</TableCell>
                      <TableCell>{p.municipio ?? "—"}{p.uf ? `/${p.uf}` : ""}</TableCell>
                      <TableCell>{p.telefone ?? "—"}</TableCell>
                      <TableCell><Badge variant="secondary">{st}</Badge></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Nova venda
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome *</Label>
              <Input value={form.nome ?? ""} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Telefone</Label>
                <Input value={form.telefone ?? ""} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
              </div>
              <div>
                <Label>Tipo de negociação</Label>
                <Select
                  value={form.tipo_venda ?? "nova_venda"}
                  onValueChange={(v) => setForm({ ...form, tipo_venda: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPO_VENDA_OPTIONS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Status</Label>
                <Select value={form.status ?? "associado"} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Plano</Label>
                <Select
                  value={form.plano_id ?? "none"}
                  onValueChange={(v) => setForm({ ...form, plano_id: v === "none" ? null : v })}
                >
                  <SelectTrigger><SelectValue placeholder="Sem plano" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem plano</SelectItem>
                    {planos.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {form.status === "retornar" && (
              <div>
                <Label>Data de retorno</Label>
                <Input
                  type="date"
                  value={form.data_retorno ?? ""}
                  onChange={(e) => setForm({ ...form, data_retorno: e.target.value })}
                />
              </div>
            )}
            <div>
              <Label>Endereço</Label>
              <Input value={form.endereco ?? ""} onChange={(e) => setForm({ ...form, endereco: e.target.value })} />
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_100px]">
              <div>
                <Label>Município</Label>
                <Input value={form.municipio ?? ""} onChange={(e) => setForm({ ...form, municipio: e.target.value })} />
              </div>
              <div>
                <Label>UF</Label>
                <Input value={form.uf ?? ""} maxLength={2} onChange={(e) => setForm({ ...form, uf: e.target.value.toUpperCase() })} />
              </div>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea rows={3} value={form.observacoes ?? ""} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function KpiCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}
