import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Pencil, Trash2, Layers } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/centros-custo")({
  head: () => ({ meta: [{ title: "Centros de Custo — Memorial" }] }),
  component: CentrosCustoPage,
});

type Centro = { id: string; nome: string; descricao: string | null; ativo: boolean };

function CentrosCustoPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Centro | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["centros_custo"],
    queryFn: async () => {
      const { data, error } = await supabase.from("centros_custo").select("*").order("nome");
      if (error) throw error;
      return data as Centro[];
    },
  });

  const save = useMutation({
    mutationFn: async (payload: Partial<Centro> & { nome: string }) => {
      if (editing) {
        const { error } = await supabase.from("centros_custo").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("centros_custo").insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["centros_custo"] });
      setOpen(false); setEditing(null);
      toast.success("Centro de custo salvo");
    },
    onError: (e: any) => toast.error("Erro", { description: e.message }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("centros_custo").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["centros_custo"] }); toast.success("Excluído"); },
    onError: (e: any) => toast.error("Erro", { description: e.message }),
  });

  return (
    <AppShell
      title="Centros de Custo"
      subtitle="Classificação de despesas e receitas"
      actions={
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Novo centro</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-serif">{editing ? "Editar" : "Novo"} centro de custo</DialogTitle></DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                save.mutate({
                  nome: String(fd.get("nome")),
                  descricao: String(fd.get("descricao") || "") || null,
                  ativo: fd.get("ativo") === "on",
                });
              }}
              className="space-y-4"
            >
              <div className="space-y-2"><Label>Nome</Label><Input name="nome" required defaultValue={editing?.nome ?? ""} /></div>
              <div className="space-y-2"><Label>Descrição</Label><Textarea name="descricao" rows={3} defaultValue={editing?.descricao ?? ""} /></div>
              <div className="flex items-center gap-2"><Switch name="ativo" defaultChecked={editing?.ativo ?? true} /><Label>Ativo</Label></div>
              <DialogFooter><Button type="submit" disabled={save.isPending}>{save.isPending ? "Salvando..." : "Salvar"}</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      }
    >
      <Card className="border-border/60 shadow-soft">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Carregando...</TableCell></TableRow>}
              {!isLoading && data.length === 0 && (
                <TableRow><TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                  <Layers className="mx-auto mb-2 h-8 w-8 opacity-40" />Nenhum centro de custo cadastrado.
                </TableCell></TableRow>
              )}
              {data.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nome}</TableCell>
                  <TableCell className="text-muted-foreground">{c.descricao || "—"}</TableCell>
                  <TableCell>
                    {c.ativo ? <Badge className="bg-success/15 text-success border-success/30" variant="outline">Ativo</Badge>
                      : <Badge variant="outline" className="bg-muted text-muted-foreground">Inativo</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(c); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => { if (confirm("Excluir?")) del.mutate(c.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
