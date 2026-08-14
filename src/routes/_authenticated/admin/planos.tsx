import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/planos")({
  component: AdminPlanosPage,
});

type SystemPlan = {
  id: string;
  nome: string;
  descricao: string | null;
  preco_mensal: number;
  limite_usuarios: number | null;
  limite_associados: number | null;
  ativo: boolean;
};

function AdminPlanosPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SystemPlan | null>(null);

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["admin-system-plans"],
    queryFn: async () => {
      const { data, error } = await supabase.from("system_plans" as any).select("*").order("preco_mensal");
      if (error) throw error;
      return data as SystemPlan[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (p: Partial<SystemPlan>) => {
      if (p.id) {
        const { error } = await supabase.from("system_plans" as any).update(p).eq("id", p.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("system_plans" as any).insert(p as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-system-plans"] });
      setOpen(false);
      setEditing(null);
      toast.success("Plano salvo com sucesso");
    },
    onError: (e: any) => toast.error("Erro ao salvar: " + e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("system_plans" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-system-plans"] });
      toast.success("Plano removido");
    },
    onError: (e: any) => toast.error("Erro ao remover: " + e.message),
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    upsert.mutate({
      id: editing?.id,
      nome: String(fd.get("nome")),
      descricao: String(fd.get("descricao")),
      preco_mensal: Number(fd.get("preco_mensal")),
      limite_usuarios: fd.get("limite_usuarios") ? Number(fd.get("limite_usuarios")) : null,
      limite_associados: fd.get("limite_associados") ? Number(fd.get("limite_associados")) : null,
      ativo: true
    });
  }

  return (
    <AppShell title="Planos do Sistema" subtitle="Gerencie os pacotes de assinatura do SaaS">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Pacotes Disponíveis</CardTitle>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="mr-2 h-4 w-4" /> Novo Plano</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? "Editar Plano" : "Novo Plano"}</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome do Plano</Label>
                  <Input name="nome" defaultValue={editing?.nome} required />
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea name="descricao" defaultValue={editing?.descricao || ""} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Preço Mensal (R$)</Label>
                    <Input name="preco_mensal" type="number" step="0.01" defaultValue={editing?.preco_mensal} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Limite de Usuários</Label>
                    <Input name="limite_usuarios" type="number" defaultValue={editing?.limite_usuarios || ""} placeholder="Ilimitado" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Limite de Associados</Label>
                  <Input name="limite_associados" type="number" defaultValue={editing?.limite_associados || ""} placeholder="Ilimitado" />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={upsert.isPending}>Salvar Plano</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plano</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Limites</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.nome}</TableCell>
                  <TableCell>{brl(p.preco_mensal)}</TableCell>
                  <TableCell className="text-xs">
                    {p.limite_usuarios || "∞"} usuários / {p.limite_associados || "∞"} associados
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.ativo ? "default" : "secondary"}>{p.ativo ? "Ativo" : "Inativo"}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => { setEditing(p); setOpen(true); }}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => { if(confirm("Excluir?")) del.mutate(p.id); }}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}