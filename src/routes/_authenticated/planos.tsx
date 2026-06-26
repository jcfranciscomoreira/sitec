import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/planos")({
  head: () => ({ meta: [{ title: "Planos — Memorial" }] }),
  component: PlanosPage,
});

type Plano = {
  id: string; nome: string; descricao: string | null; valor_mensal: number;
  taxa_adesao: number; cobertura: string | null; ativo: boolean;
};

function PlanosPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Plano | null>(null);

  const { data: planos = [], isLoading } = useQuery({
    queryKey: ["planos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("planos").select("*").order("valor_mensal");
      if (error) throw error;
      return data as Plano[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (p: Partial<Plano>) => {
      if (p.id) {
        const { error } = await supabase.from("planos").update(p).eq("id", p.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("planos").insert(p as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["planos"] });
      setOpen(false); setEditing(null);
      toast.success("Plano salvo");
    },
    onError: (e: any) => toast.error("Erro ao salvar", { description: e.message }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("planos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["planos"] }); toast.success("Plano excluído"); },
    onError: (e: any) => toast.error("Erro ao excluir", { description: e.message }),
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    upsert.mutate({
      id: editing?.id,
      nome: String(fd.get("nome")),
      descricao: String(fd.get("descricao") || ""),
      valor_mensal: Number(fd.get("valor_mensal")),
      taxa_adesao: Number(fd.get("taxa_adesao") || 0),
      cobertura: String(fd.get("cobertura") || ""),
      ativo: fd.get("ativo") === "on",
    });
  }

  return (
    <AppShell
      title="Planos funerários"
      subtitle="Cadastre e gerencie os planos oferecidos"
      actions={
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Novo plano</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-serif">{editing ? "Editar plano" : "Novo plano"}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2"><Label>Nome</Label><Input name="nome" defaultValue={editing?.nome} required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Valor mensal (R$)</Label><Input name="valor_mensal" type="number" step="0.01" defaultValue={editing?.valor_mensal ?? ""} required /></div>
                <div className="space-y-2"><Label>Taxa de adesão (R$)</Label><Input name="taxa_adesao" type="number" step="0.01" defaultValue={editing?.taxa_adesao ?? 0} /></div>
              </div>
              <div className="space-y-2"><Label>Descrição</Label><Textarea name="descricao" defaultValue={editing?.descricao ?? ""} rows={2} /></div>
              <div className="space-y-2"><Label>Cobertura</Label><Textarea name="cobertura" defaultValue={editing?.cobertura ?? ""} rows={3} placeholder="Ex.: Urna, transporte, sala de velório, paramentação..." /></div>
              <div className="flex items-center justify-between rounded-md border border-border p-3">
                <Label htmlFor="ativo">Plano ativo</Label>
                <Switch id="ativo" name="ativo" defaultChecked={editing?.ativo ?? true} />
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
        <CardHeader><CardTitle className="font-serif">Catálogo</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Mensalidade</TableHead>
                <TableHead>Taxa adesão</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Carregando...</TableCell></TableRow>}
              {!isLoading && planos.length === 0 && <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Nenhum plano cadastrado.</TableCell></TableRow>}
              {planos.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="font-medium">{p.nome}</div>
                    {p.descricao && <div className="text-xs text-muted-foreground">{p.descricao}</div>}
                  </TableCell>
                  <TableCell className="font-medium">{brl(p.valor_mensal)}</TableCell>
                  <TableCell>{brl(p.taxa_adesao)}</TableCell>
                  <TableCell>
                    {p.ativo
                      ? <Badge className="bg-success/15 text-success border-success/30" variant="outline">Ativo</Badge>
                      : <Badge variant="outline">Inativo</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(p); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => { if (confirm(`Excluir ${p.nome}?`)) del.mutate(p.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
