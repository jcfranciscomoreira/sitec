import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ROLES = ["admin", "operador", "vendedor", "cobrador"] as const;

export const listRolePermissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("role_permissions")
      .select("role, module, allowed");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const updateSchema = z.object({
  role: z.enum(ROLES),
  module: z.string().min(1).max(64),
  allowed: z.boolean(),
});

export const updateRolePermission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => updateSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { data: isAdmin } = await context.supabase
      .from("user_roles").select("role").eq("user_id", context.userId).eq("role", "admin").maybeSingle();
    if (!isAdmin) throw new Error("Apenas administradores podem alterar permissões");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("role_permissions")
      .upsert({ role: data.role, module: data.module, allowed: data.allowed }, { onConflict: "role,module" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
