import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Pencil, Trash2, Users, Search, CheckCircle2, Printer } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { brl, fmtDate, competenciaLabel } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/associados")({
  head: () => ({ meta: [{ title: "Associados — Memorial" }] }),
  component: AssociadosPage,
});

type Associado = {
  id: string; codigo: number; nome: string; cpf: string | null; rg: string | null;
  data_nascimento: string | null; telefone: string | null; email: string | null;
  endereco: string | null; cidade: string | null; estado: string | null; cep: string | null;
  plano_id: string | null; data_adesao: string; dia_vencimento: number;
  status: "ativo" | "inativo" | "suspenso"; observacoes: string | null;
  planos?: { nome: string; valor_mensal: number } | null;
};

type Dependente = {
  id: string; associado_id: string; nome: string; cpf: string | null;
  data_nascimento: string | null; parentesco: string; observacoes: string | null;
};

function AssociadosPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Associado | null>(null);
  const [depOpen, setDepOpen] = useState<Associado | null>(null);

  const { data: associados = [], isLoading } = useQuery({
    queryKey: ["associados"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("associados")
        .select("*, planos(nome, valor_mensal)")
        .order("nome");
      if (error) throw error;
      return data as Associado[];
    },
  });

  const { data: planos = [] } = useQuery({
    queryKey: ["planos-ativos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("planos").select("id, nome, valor_mensal").eq("ativo", true).order("valor_mensal");
      if (error) throw error;
      return data;
    },
  });

  const upsert = useMutation({
    mutationFn: async (a: Partial<Associado> & { plano_id_form?: string }) => {
      const payload: any = { ...a };
      if (a.plano_id_form !== undefined) { payload.plano_id = a.plano_id_form || null; delete payload.plano_id_form; }
      if (a.id) {
        const { error } = await supabase.from("associados").update(payload).eq("id", a.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("associados").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["associados"] });
      setOpen(false); setEditing(null);
      toast.success("Associado salvo");
    },
    onError: (e: any) => toast.error("Erro", { description: e.message }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("associados").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["associados"] }); toast.success("Associado excluído"); },
    onError: (e: any) => toast.error("Erro", { description: e.message }),
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => { const v = String(fd.get(k) || ""); return v.trim() ? v : null; };
    upsert.mutate({
      id: editing?.id,
      nome: String(fd.get("nome")),
      cpf: get("cpf"),
      rg: get("rg"),
      data_nascimento: get("data_nascimento"),
      telefone: get("telefone"),
      email: get("email"),
      endereco: get("endereco"),
      cidade: get("cidade"),
      estado: get("estado"),
      cep: get("cep"),
      plano_id_form: String(fd.get("plano_id") || ""),
      data_adesao: String(fd.get("data_adesao") || new Date().toISOString().slice(0, 10)),
      dia_vencimento: Number(fd.get("dia_vencimento") || 10),
      status: (fd.get("status") as any) || "ativo",
      observacoes: get("observacoes"),
    });
  }

  const filtered = associados.filter((a) =>
    !search || a.nome.toLowerCase().includes(search.toLowerCase()) ||
    (a.cpf ?? "").includes(search) || String(a.codigo).includes(search)
  );

  return (
    <AppShell
      title="Associados"
      subtitle="Cadastro de titulares e dependentes"
      actions={
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Novo associado</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="font-serif">{editing ? `Editar — ${editing.nome}` : "Novo associado"}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2 col-span-2"><Label>Nome completo *</Label><Input name="nome" defaultValue={editing?.nome} required /></div>
                <div className="space-y-2"><Label>CPF</Label><Input name="cpf" defaultValue={editing?.cpf ?? ""} /></div>
                <div className="space-y-2"><Label>RG</Label><Input name="rg" defaultValue={editing?.rg ?? ""} /></div>
                <div className="space-y-2"><Label>Data de nascimento</Label><Input name="data_nascimento" type="date" defaultValue={editing?.data_nascimento ?? ""} /></div>
                <div className="space-y-2"><Label>Telefone</Label><Input name="telefone" defaultValue={editing?.telefone ?? ""} /></div>
                <div className="space-y-2 col-span-2"><Label>E-mail</Label><Input name="email" type="email" defaultValue={editing?.email ?? ""} /></div>
                <div className="space-y-2 col-span-2"><Label>Endereço</Label><Input name="endereco" defaultValue={editing?.endereco ?? ""} /></div>
                <div className="space-y-2"><Label>Cidade</Label><Input name="cidade" defaultValue={editing?.cidade ?? ""} /></div>
                <div className="space-y-2"><Label>Estado</Label><Input name="estado" maxLength={2} defaultValue={editing?.estado ?? ""} /></div>
                <div className="space-y-2"><Label>CEP</Label><Input name="cep" defaultValue={editing?.cep ?? ""} /></div>
                <div className="space-y-2"><Label>Status</Label>
                  <Select name="status" defaultValue={editing?.status ?? "ativo"}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="suspenso">Suspenso</SelectItem>
                      <SelectItem value="inativo">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Plano</Label>
                  <Select name="plano_id" defaultValue={editing?.plano_id ?? ""}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {planos.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>{p.nome} — {brl(p.valor_mensal)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Data de adesão</Label><Input name="data_adesao" type="date" defaultValue={editing?.data_adesao ?? new Date().toISOString().slice(0, 10)} /></div>
                <div className="space-y-2"><Label>Dia de vencimento</Label><Input name="dia_vencimento" type="number" min={1} max={28} defaultValue={editing?.dia_vencimento ?? 10} /></div>
                <div className="space-y-2 col-span-2"><Label>Observações</Label><Textarea name="observacoes" rows={2} defaultValue={editing?.observacoes ?? ""} /></div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={upsert.isPending}>{upsert.isPending ? "Salvando..." : "Salvar"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      }
    >
      <Card className="border-border/60 shadow-soft">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-serif">Lista de associados</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Buscar por nome, CPF, código..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Adesão</TableHead>
                <TableHead>Venc.</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Carregando...</TableCell></TableRow>}
              {!isLoading && filtered.length === 0 && <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Nenhum associado encontrado.</TableCell></TableRow>}
              {filtered.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">#{String(a.codigo).padStart(4, "0")}</TableCell>
                  <TableCell>
                    <div className="font-medium">{a.nome}</div>
                    <div className="text-xs text-muted-foreground">{a.cpf ?? "Sem CPF"}{a.telefone ? ` · ${a.telefone}` : ""}</div>
                  </TableCell>
                  <TableCell>{a.planos?.nome ?? <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell>{fmtDate(a.data_adesao)}</TableCell>
                  <TableCell>dia {a.dia_vencimento}</TableCell>
                  <TableCell><StatusBadge status={a.status} /></TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" title="Dependentes" onClick={() => setDepOpen(a)}><Users className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" title="Editar" onClick={() => { setEditing(a); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" title="Excluir" onClick={() => { if (confirm(`Excluir ${a.nome}?`)) del.mutate(a.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {depOpen && <DependentesDialog associado={depOpen} onClose={() => setDepOpen(null)} />}
    </AppShell>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ativo: "bg-success/15 text-success border-success/30",
    suspenso: "bg-gold/15 text-gold border-gold/30",
    inativo: "bg-muted text-muted-foreground",
  };
  return <Badge variant="outline" className={map[status] ?? ""}>{status}</Badge>;
}

function DependentesDialog({ associado, onClose }: { associado: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const { data: deps = [], isLoading } = useQuery({
    queryKey: ["dependentes", associado.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("dependentes").select("*").eq("associado_id", associado.id).order("nome");
      if (error) throw error;
      return data as Dependente[];
    },
  });

  const add = useMutation({
    mutationFn: async (d: Partial<Dependente>) => {
      const { error } = await supabase.from("dependentes").insert({ ...d, associado_id: associado.id } as any);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["dependentes", associado.id] }); setAdding(false); toast.success("Dependente adicionado"); },
    onError: (e: any) => toast.error("Erro", { description: e.message }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("dependentes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["dependentes", associado.id] }); toast.success("Removido"); },
  });

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle className="font-serif">Dependentes de {associado.nome}</DialogTitle></DialogHeader>
        {!adding && (
          <Button variant="outline" size="sm" onClick={() => setAdding(true)}><Plus className="mr-2 h-4 w-4" />Adicionar dependente</Button>
        )}
        {adding && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              add.mutate({
                nome: String(fd.get("nome")),
                parentesco: String(fd.get("parentesco")),
                data_nascimento: String(fd.get("data_nascimento") || "") || null,
                cpf: String(fd.get("cpf") || "") || null,
              });
            }}
            className="space-y-3 rounded-md border border-border p-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2 col-span-2"><Label>Nome</Label><Input name="nome" required /></div>
              <div className="space-y-2"><Label>Parentesco</Label><Input name="parentesco" placeholder="Cônjuge, Filho(a)..." required /></div>
              <div className="space-y-2"><Label>Data de nascimento</Label><Input name="data_nascimento" type="date" /></div>
              <div className="space-y-2 col-span-2"><Label>CPF</Label><Input name="cpf" /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setAdding(false)}>Cancelar</Button>
              <Button type="submit" disabled={add.isPending}>Salvar</Button>
            </div>
          </form>
        )}
        <div className="divide-y divide-border">
          {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
          {!isLoading && deps.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Nenhum dependente cadastrado.</p>}
          {deps.map((d) => (
            <div key={d.id} className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium">{d.nome}</p>
                <p className="text-xs text-muted-foreground">{d.parentesco}{d.data_nascimento ? ` · ${fmtDate(d.data_nascimento)}` : ""}</p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => { if (confirm(`Remover ${d.nome}?`)) del.mutate(d.id); }}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
