import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Building2, Trash2, Edit, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/empresas")({
  component: EmpresasPage,
});

type Tenant = {
  id: string;
  nome: string;
  dominio: string | null;
  cnpj: string | null;
  email: string | null;
  telefone: string | null;
  endereco: string | null;
  status: string;
  created_at: string;
};

function EmpresasPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Partial<Tenant> | null>(null);

  useEffect(() => {
    fetchTenants();
  }, []);

  async function fetchTenants() {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("tenants")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) toast.error("Erro ao carregar empresas: " + error.message);
    else setTenants((data as any[]) || []);
    setLoading(false);
  }

  async function handleSave() {
    if (!selected?.nome) return toast.error("Nome é obrigatório");
    setSaving(true);
    
    const promise = selected.id 
      ? (supabase as any).from("tenants").update(selected).eq("id", selected.id)
      : (supabase as any).from("tenants").insert([selected]);
      
    const { error } = await promise;
    setSaving(false);
    
    if (error) toast.error("Erro ao salvar: " + error.message);
    else {
      toast.success(selected.id ? "Empresa atualizada" : "Empresa cadastrada");
      setOpen(false);
      fetchTenants();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Deseja realmente excluir esta empresa?")) return;
    const { error } = await (supabase as any).from("tenants").delete().eq("id", id);
    if (error) toast.error("Erro ao excluir: " + error.message);
    else {
      toast.success("Empresa excluída");
      fetchTenants();
    }
  }

  return (
    <AppShell 
      title="Gestão de Empresas" 
      subtitle="Administração das empresas que utilizam o sistema"
      actions={
        <Button onClick={() => { setSelected({}); setOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Nova Empresa
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Empresas Cadastradas</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Domínio</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data Cadastro</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.nome}</TableCell>
                    <TableCell>{t.dominio || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={t.status === "ativo" ? "default" : "secondary"}>
                        {t.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(t.created_at).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => { setSelected(t); setOpen(true); }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(t.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {tenants.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Nenhuma empresa cadastrada.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selected?.id ? "Editar Empresa" : "Cadastrar Nova Empresa"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Nome da Empresa *</Label>
              <Input 
                value={selected?.nome || ""} 
                onChange={(e) => {
                  const nome = e.target.value;
                  const slug = nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
                  setSelected({ 
                    ...selected, 
                    nome,
                    dominio: selected.id ? selected.dominio : (slug ? `${slug}.nuvemplanos.com.br` : "")
                  });
                }}
                placeholder="Ex: Memorial Paz Ltda"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Subdomínio (automático)</Label>
              <Input 
                value={selected?.dominio || ""} 
                onChange={(e) => setSelected({ ...selected, dominio: e.target.value })}
                placeholder="slug.nuvemplanos.com.br"
              />
            </div>
            <div className="space-y-2">
              <Label>CNPJ</Label>
              <Input 
                value={selected?.cnpj || ""} 
                onChange={(e) => setSelected({ ...selected, cnpj: e.target.value })}
                placeholder="00.000.000/0000-00"
              />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input 
                value={selected?.telefone || ""} 
                onChange={(e) => setSelected({ ...selected, telefone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input 
                type="email"
                value={selected?.email || ""} 
                onChange={(e) => setSelected({ ...selected, email: e.target.value })}
                placeholder="contato@empresa.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Endereço</Label>
              <Input 
                value={selected?.endereco || ""} 
                onChange={(e) => setSelected({ ...selected, endereco: e.target.value })}
                placeholder="Rua, Número, Bairro, Cidade"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
