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

async function assertAdmin(ctx: any) {
  const { data: isAdmin } = await ctx.supabase
    .from("user_roles").select("role").eq("user_id", ctx.userId).eq("role", "admin").maybeSingle();
  if (!isAdmin) throw new Error("Apenas administradores podem alterar permissões");
}

export const listUserPermissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("user_permissions").select("module, allowed").eq("user_id", data.userId);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const setUserPermission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    userId: z.string().uuid(),
    module: z.string().min(1).max(64),
    allowed: z.boolean().nullable(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.allowed === null) {
      const { error } = await supabaseAdmin.from("user_permissions")
        .delete().eq("user_id", data.userId).eq("module", data.module);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("user_permissions")
        .upsert({ user_id: data.userId, module: data.module, allowed: data.allowed }, { onConflict: "user_id,module" });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const setUserPermissionsBulk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    userId: z.string().uuid(),
    permissions: z.array(z.object({ module: z.string().min(1).max(64), allowed: z.boolean() })),
  }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_permissions").delete().eq("user_id", data.userId);
    if (data.permissions.length > 0) {
      const rows = data.permissions.map((p) => ({ user_id: data.userId, module: p.module, allowed: p.allowed }));
      const { error } = await supabaseAdmin.from("user_permissions").insert(rows);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });
