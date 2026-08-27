import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/console")({
  ssr: false,
  beforeLoad: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw redirect({ to: "/console-login" });

    const { data: master } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "super_admin" as any)
      .maybeSingle();

    if (!master) throw redirect({ to: "/console-login", search: { erro: "sem-acesso" } });

    return { user };
  },
  component: () => <Outlet />,
});
