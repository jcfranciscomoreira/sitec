import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, Building2, CreditCard, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/tenants")({
  component: TenantsPage,
});

function TenantsPage() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<any>(null);

  async function fetchTenants() {
    setLoading(true);
    const { data, error } = await supabase
      .from("tenants" as any)
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) toast.error(error.message);
    else setTenants(data || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchTenants();
  }, []);

  return (
    <AppShell 
      title="Gestão de Empresas" 
      subtitle="Administração de clientes do sistema e faturamento"
      actions={
        <Button onClick={() => { setSelectedTenant(null); setOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Nova Empresa
        </Button>
      }
    >
      <div className="grid gap-6">
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
                    <TableHead>Empresa</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expiração</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenants.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.nome}</TableCell>
                      <TableCell>
                        <Badge variant={t.status === 'ativo' ? 'default' : 'destructive'}>
                          {t.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{t.expira_em ? new Date(t.expira_em).toLocaleDateString() : 'Vitalício'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => { setSelectedTenant(t); setOpen(true); }}>
                          Editar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <TenantDialog 
        open={open} 
        tenant={selectedTenant} 
        onClose={() => setOpen(false)} 
        onSave={fetchTenants} 
      />
    </AppShell>
  );
}

function TenantDialog({ open, tenant, onClose, onSave }: any) {
  const [nome, setNome] = useState("");
  const [status, setStatus] = useState("ativo");
  const [expiraEm, setExpiraEm] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (tenant) {
      setNome(tenant.nome);
      setStatus(tenant.status);
      setExpiraEm(tenant.expira_em ? tenant.expira_em.split('T')[0] : "");
    } else {
      setNome("");
      setStatus("ativo");
      setExpiraEm("");
    }
  }, [tenant, open]);

  async function handleSave() {
    setSaving(true);
    const payload = {
      nome,
      status,
      expira_em: expiraEm || null,
    };

    const { error } = tenant 
      ? await supabase.from("tenants" as any).update(payload).eq("id", tenant.id)
      : await supabase.from("tenants" as any).insert([payload]);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Empresa salva com sucesso");
      onSave();
      onClose();
    }
    setSaving(false);
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{tenant ? "Editar Empresa" : "Nova Empresa"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nome da Empresa</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Funerária São José" />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="suspenso">Suspenso</SelectItem>
                <SelectItem value="bloqueado">Bloqueado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Data de Expiração</Label>
            <Input type="date" value={expiraEm} onChange={(e) => setExpiraEm(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
