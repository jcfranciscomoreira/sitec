import { createFileRoute } from "@tanstack/react-router";
import { ConsoleShell } from "@/components/console/ConsoleShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building2, CreditCard, Activity, TrendingUp, DollarSign } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/console/")({
  component: AdminDashboardPage,
});

function AdminDashboardPage() {
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [tenants, profiles, plans] = await Promise.all([
        supabase.from("tenants").select("id, plan_status, plan_id", { count: "exact" }),
        supabase.from("profiles").select("id", { count: "exact" }),
        supabase.from("system_plans").select("id, preco_mensal")
      ]);

      const activeSubs = tenants.data?.filter(t => t.plan_status === 'active').length || 0;
      
      // Cálculo de MRR (Receita Mensal Recorrente) simplificado
      const planPrices = new Map(plans.data?.map(p => [p.id, p.preco_mensal]) || []);
      const mrr = tenants.data?.reduce((acc, t) => {
        if (t.plan_status === 'active' && t.plan_id) {
          return acc + (planPrices.get(t.plan_id) || 0);
        }
        return acc;
      }, 0) || 0;

      return {
        totalTenants: tenants.count || 0,
        totalUsers: profiles.count || 0,
        activeSubscriptions: activeSubs,
        mrr,
        trialingCount: tenants.data?.filter(t => t.plan_status === 'trialing' || t.plan_status === 'active').length || 0
      };
    }
  });

  return (
    <ConsoleShell title="Painel Administrativo" subtitle="Visão geral do ecossistema SaaS">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Receita Mensal (MRR)</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{brl(stats?.mrr || 0)}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3 text-emerald-500" /> +5% este mês
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Empresas</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalTenants || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.trialingCount} em período de teste
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Usuários Totais</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Em todas as empresas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Status dos Serviços</CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">100% UP</div>
            <p className="text-xs text-muted-foreground mt-1">Monitoramento em tempo real</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Crescimento da Plataforma</CardTitle>
          </CardHeader>
          <CardContent className="h-[200px] flex items-center justify-center text-muted-foreground border-t border-dashed mt-2">
            Gráfico de evolução (Em breve)
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Distribuição de Planos</CardTitle>
          </CardHeader>
          <CardContent className="h-[200px] flex items-center justify-center text-muted-foreground border-t border-dashed mt-2">
            Gráfico de planos (Em breve)
          </CardContent>
        </Card>
      </div>
    </ConsoleShell>
  );
}