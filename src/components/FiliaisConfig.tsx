import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export type Filial = {
  id: string;
  nome: string;
  codigo: string | null;
  cidade: string | null;
  estado: string | null;
  endereco: string | null;
  telefone: string | null;
  responsavel: string | null;
  ativo: boolean;
};

export function FiliaisConfig() {
  const [rows, setRows] = useState<Filial[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Filial | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("filiais").select("*").order("nome");
    if (error) toast.error(error.message);
    setRows((data as Filial[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => { const v = String(fd.get(k) ?? "").trim(); return v || null; };
    const payload = {
      nome: String(fd.get("nome") ?? "").trim(),
      codigo: get("codigo"),
      cidade: get("cidade"),
      estado: get("estado"),
      endereco: get("endereco"),
      telefone: get("telefone"),
      responsavel: get("responsavel"),
      ativo: fd.get("ativo") === "on",
    };
    if (!payload.nome) { toast.error("Informe o nome da filial"); return; }
    setSaving(true);
    const { error } = editing
      ? await supabase.from("filiais").update(payload).eq("id", editing.id)
      : await supabase.from("filiais").insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "Filial atualizada" : "Filial cadastrada");
    setOpen(false); setEditing(null);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Excluir esta filial?")) return;
    const { error } = await supabase.from("filiais").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Filial excluída");
    load();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Filiais</CardTitle>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-2 h-4 w-4" />Nova filial</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editing ? "Editar filial" : "Nova filial"}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1"><Label>Nome *</Label><Input name="nome" defaultValue={editing?.nome ?? ""} required /></div>
                <div className="space-y-1"><Label>Código</Label><Input name="codigo" defaultValue={editing?.codigo ?? ""} /></div>
                <div className="space-y-1"><Label>Responsável</Label><Input name="responsavel" defaultValue={editing?.responsavel ?? ""} /></div>
                <div className="space-y-1"><Label>Telefone</Label><Input name="telefone" defaultValue={editing?.telefone ?? ""} /></div>
                <div className="space-y-1"><Label>Cidade</Label><Input name="cidade" defaultValue={editing?.cidade ?? ""} /></div>
                <div className="space-y-1"><Label>Estado</Label><Input name="estado" maxLength={2} defaultValue={editing?.estado ?? ""} /></div>
                <div className="col-span-2 space-y-1"><Label>Endereço</Label><Input name="endereco" defaultValue={editing?.endereco ?? ""} /></div>
                <div className="col-span-2 flex items-center gap-2">
                  <Switch id="ativo" name="ativo" defaultChecked={editing ? editing.ativo : true} />
                  <Label htmlFor="ativo">Ativa</Label>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-6 text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Carregando...</div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma filial cadastrada. Todos os associados são considerados da matriz.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Cidade/UF</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">{f.nome}</TableCell>
                  <TableCell>{f.codigo ?? "—"}</TableCell>
                  <TableCell>{[f.cidade, f.estado].filter(Boolean).join("/") || "—"}</TableCell>
                  <TableCell>{f.responsavel ?? "—"}</TableCell>
                  <TableCell><Badge variant={f.ativo ? "default" : "secondary"}>{f.ativo ? "Ativa" : "Inativa"}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => { setEditing(f); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(f.id)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
