import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type AppRole = "admin" | "operador" | "vendedor" | "cobrador";

async function ensureAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Apenas administradores podem gerenciar usuários");
}

export const listUsuarios = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: usersData, error: usersErr } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (usersErr) throw new Error(usersErr.message);

    const ids = usersData.users.map((u) => u.id);
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, nome, email").in("id", ids),
      supabaseAdmin.from("user_roles").select("user_id, role").in("user_id", ids),
    ]);

    return usersData.users.map((u) => {
      const p = profiles?.find((x) => x.id === u.id);
      const userRoles = (roles ?? []).filter((r) => r.user_id === u.id).map((r) => r.role as AppRole);
      return {
        id: u.id,
        email: u.email ?? p?.email ?? "",
        nome: p?.nome ?? "",
        roles: userRoles,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
        confirmed: !!u.email_confirmed_at,
      };
    });
  });

const createSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(72),
  nome: z.string().trim().min(1).max(120),
  role: z.enum(["admin", "operador", "vendedor", "cobrador", "agente"]),
});

export const createUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => createSchema.parse(data))
  .handler(async ({ context, data }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { nome: data.nome },
    });
    if (error) throw new Error(error.message);
    const newId = created.user!.id;

    // handle_new_user trigger inserts default role 'operador' (or 'admin' for the first user).
    // Replace with the requested role.
    await supabaseAdmin.from("user_roles").delete().eq("user_id", newId);
    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: newId, role: data.role });
    if (roleErr) throw new Error(roleErr.message);

    await supabaseAdmin
      .from("profiles")
      .update({ nome: data.nome, email: data.email })
      .eq("id", newId);

    if (data.role === "cobrador") {
      const { data: existing } = await supabaseAdmin
        .from("cobradores")
        .select("id,user_id")
        .or(`user_id.eq.${newId},nome.eq.${data.nome}`)
        .maybeSingle();
      if (existing) {
        await supabaseAdmin.from("cobradores").update({ user_id: newId, ativo: true }).eq("id", existing.id);
      } else {
        await supabaseAdmin.from("cobradores").insert({ nome: data.nome, ativo: true, user_id: newId });
      }
    }


    return { id: newId };
  });

const updateRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["admin", "operador", "vendedor", "cobrador", "agente"]),
});

export const updateUsuarioRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => updateRoleSchema.parse(data))
  .handler(async ({ context, data }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.userId, role: data.role });
    if (error) throw new Error(error.message);

    if (data.role === "cobrador") {
      const { data: prof } = await supabaseAdmin
        .from("profiles")
        .select("nome")
        .eq("id", data.userId)
        .maybeSingle();
      const nome = prof?.nome?.trim() || "Cobrador";
      const { data: existing } = await supabaseAdmin
        .from("cobradores")
        .select("id")
        .or(`user_id.eq.${data.userId},nome.eq.${nome}`)
        .maybeSingle();
      if (existing) {
        await supabaseAdmin.from("cobradores").update({ user_id: data.userId, ativo: true }).eq("id", existing.id);
      } else {
        await supabaseAdmin.from("cobradores").insert({ nome, ativo: true, user_id: data.userId });
      }
    }


    return { ok: true };
  });

const resetPwSchema = z.object({
  userId: z.string().uuid(),
  password: z.string().min(8).max(72),
});

export const resetUsuarioPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => resetPwSchema.parse(data))
  .handler(async ({ context, data }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: data.password,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const deleteSchema = z.object({ userId: z.string().uuid() });

export const deleteUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => deleteSchema.parse(data))
  .handler(async ({ context, data }) => {
    await ensureAdmin(context.supabase, context.userId);
    if (data.userId === context.userId) {
      throw new Error("Você não pode excluir o próprio usuário");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
