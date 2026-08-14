import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Edit, ExternalLink, Calendar, ShieldCheck, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { fmtDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/tenants")({
  component: AdminTenantsPage,
});

function AdminTenantsPage() {
  const qc = useQueryClient();
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ["admin-tenants-full"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select(`
          *,
          system_plans (id, nome)
        `)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const { data: plans = [] } = useQuery({
    queryKey: ["admin-system-plans-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("system_plans").select("id, nome");
      if (error) throw error;
      return data;
    },
  });

  const updateTenant = useMutation({
    mutationFn: async (vars: any) => {
      const { error } = await supabase.from("tenants").update(vars).eq("id", selectedTenant.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-tenants-full"] });
      setIsDialogOpen(false);
      toast.success("Empresa atualizada com sucesso");
    },
    onError: (e: any) => toast.error("Erro ao atualizar: " + e.message),
  });

  function handleManage(tenant: any) {
    setSelectedTenant(tenant);
    setIsDialogOpen(true);
  }

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    updateTenant.mutate({
      plan_id: fd.get("plan_id"),
      plan_status: fd.get("plan_status"),
      trial_ends_at: fd.get("trial_ends_at") || null,
      expires_at: fd.get("expires_at") || null,
    });
  }

  return (
    <AppShell title="Empresas SaaS" subtitle="Gestão global de todos os clientes Nuvem Planos">
      <Card>
        <CardHeader>
          <CardTitle>Empresas Ativas no Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>Domínio</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Expiração / Trial</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map((t: any) => {
                const isExpired = t.expires_at && new Date(t.expires_at) < new Date();
                const isTrial = t.plan_status === 'active' && t.trial_ends_at && new Date(t.trial_ends_at) > new Date();

                return (
                  <TableRow key={t.id}>
                    <TableCell>
                      <div className="font-medium">{t.nome}</div>
                      <div className="text-[10px] text-muted-foreground">{t.id}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {t.dominio || "—"}
                        {t.dominio && <ExternalLink className="h-3 w-3 text-muted-foreground" />}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{t.system_plans?.nome || "Sem Plano"}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {t.expires_at ? (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span className={isExpired ? "text-destructive font-bold" : ""}>
                            Expira: {fmtDate(t.expires_at)}
                          </span>
                        </div>
                      ) : t.trial_ends_at ? (
                        <div className="text-muted-foreground">
                          Trial até: {fmtDate(t.trial_ends_at)}
                        </div>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={t.plan_status === 'active' ? "success" : "warning" as any}>
                        {t.plan_status || 'pendente'}
                      </Badge>
                      {isTrial && <Badge variant="secondary" className="ml-1 text-[9px] px-1 h-4 uppercase">Teste</Badge>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleManage(t)}>
                        <Edit className="mr-2 h-4 w-4" /> Gerenciar
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {tenants.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Nenhuma empresa encontrada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Gerenciar Empresa: {selectedTenant?.nome}</DialogTitle>
          </DialogHeader>
          {selectedTenant && (
            <form onSubmit={handleSave} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Plano SaaS</Label>
                <Select name="plan_id" defaultValue={selectedTenant.plan_id}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um plano" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status da Assinatura</Label>
                <Select name="plan_status" defaultValue={selectedTenant.plan_status}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo (Pago/Trial)</SelectItem>
                    <SelectItem value="past_due">Atrasado</SelectItem>
                    <SelectItem value="canceled">Cancelado</SelectItem>
                    <SelectItem value="trialing">Em Teste</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fim do Período de Teste</Label>
                  <Input 
                    type="date" 
                    name="trial_ends_at" 
                    defaultValue={selectedTenant.trial_ends_at ? new Date(selectedTenant.trial_ends_at).toISOString().split('T')[0] : ""} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data de Expiração (Paga)</Label>
                  <Input 
                    type="date" 
                    name="expires_at" 
                    defaultValue={selectedTenant.expires_at ? new Date(selectedTenant.expires_at).toISOString().split('T')[0] : ""} 
                  />
                </div>
              </div>

              <div className="rounded-lg bg-secondary/30 p-3 flex gap-2 items-start">
                <AlertCircle className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Ao definir uma data de expiração, o sistema bloqueará o acesso do tenant após essa data caso não haja renovação automática.
                </p>
              </div>

              <DialogFooter className="pt-4">
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={updateTenant.isPending}>
                  {updateTenant.isPending ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}