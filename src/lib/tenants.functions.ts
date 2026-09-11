import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const createTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) => z.object({
    nome: z.string().min(3),
  }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: tenantId, error } = await supabaseAdmin.rpc("create_tenant_for_user", {
      target_user: context.userId,
      company_name: data.nome,
    });
    if (error) throw new Error(`Falha ao criar empresa: ${error.message}`);
    return { success: true, tenantId };
  });

export const getTenantConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", userId)
      .single();

    if (!profile?.tenant_id) return null;

    const { data: tenant } = await supabase
      .from("tenants")
      .select("*")
      .eq("id", profile.tenant_id)
      .single();

    return tenant;
  });
