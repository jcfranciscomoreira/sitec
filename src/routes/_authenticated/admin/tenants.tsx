import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/tenants")({
  component: AdminTenantsPage,
});

function AdminTenantsPage() {
  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ["admin-tenants-full"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select(`
          *,
          system_plans (nome)
        `)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

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
                <TableHead>Status Financeiro</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map((t: any) => (
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
                  <TableCell>
                    <Badge variant={t.plan_status === 'active' ? "success" : "warning" as any}>
                      {t.plan_status || 'pendente'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm"><Edit className="mr-2 h-4 w-4" /> Gerenciar</Button>
                  </TableCell>
                </TableRow>
              ))}
              {tenants.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    Nenhuma empresa encontrada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}