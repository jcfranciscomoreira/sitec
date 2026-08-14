import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw redirect({ to: "/auth" });

    // Verificar expiração do tenant
    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", user.id)
      .single();

    if (profile?.tenant_id) {
      const { data: tenant } = await supabase
        .from("tenants")
        .select("plan_status, trial_ends_at, expires_at")
        .eq("id", profile.tenant_id)
        .single();

      if (tenant && profile.tenant_id !== '00000000-0000-0000-0000-000000000000') {
        const now = new Date();
        const isTrialExpired = tenant.trial_ends_at && new Date(tenant.trial_ends_at) < now;
        const isPlanExpired = tenant.expires_at && new Date(tenant.expires_at) < now;
        
        // Se expirou e não está com status ativo pago
        if ((isTrialExpired || isPlanExpired) && tenant.plan_status !== 'active') {
           // Em um cenário real, redirecionaríamos para uma página de checkout/planos
           // Por enquanto, vamos apenas permitir mas poderíamos lançar um redirect
           // throw redirect({ to: "/checkout" });
        }
      }
    }

    return { user };
  },
  component: () => <Outlet />,
});
