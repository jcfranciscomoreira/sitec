import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type AppRole = "admin" | "operador" | "vendedor" | "cobrador";

async function getAdminTenant(supabase: any, userId: string) {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", userId)
    .maybeSingle();
  if (profileError) throw new Error(profileError.message);
  if (!profile?.tenant_id) throw new Error("Sua conta não está vinculada a uma empresa");

  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("tenant_id", profile.tenant_id)
    .in("role", ["admin", "super_admin"])
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Apenas administradores podem gerenciar usuários");
  return profile.tenant_id as string;
}

async function ensureSuperAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "super_admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Apenas o usuário mestre pode consultar todas as contas");
}

async function ensureUserInTenant(admin: any, targetUserId: string, tenantId: string) {
  const { data, error } = await admin
    .from("profiles")
    .select("id")
    .eq("id", targetUserId)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Usuário não encontrado nesta empresa");
}

/** Impede alterar ou excluir o usuário mestre do sistema. */
async function ensureNotMaster(admin: any, targetUserId: string) {
  const { data } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", targetUserId)
    .eq("role", "super_admin")
    .maybeSingle();
  if (data) throw new Error("O usuário mestre do sistema não pode ser alterado ou excluído");
}

export const listUsuarios = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const tenantId = await getAdminTenant(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: tenantProfiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("id, nome, email")
      .eq("tenant_id", tenantId);
    if (profilesError) throw new Error(profilesError.message);
    const ids = (tenantProfiles ?? []).map((profile) => profile.id);
    if (ids.length === 0) return [];

    const { data: usersData, error: usersErr } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (usersErr) throw new Error(usersErr.message);

    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role")
      .eq("tenant_id", tenantId)
      .in("user_id", ids);

    return usersData.users.filter((u) => ids.includes(u.id)).map((u) => {
      const p = tenantProfiles?.find((x) => x.id === u.id);
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

export const listUsuariosGlobal = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: usersData, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (error) throw new Error(error.message);
    const ids = usersData.users.map((user) => user.id);
    if (ids.length === 0) return [];
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, nome, email").in("id", ids),
      supabaseAdmin.from("user_roles").select("user_id, role").in("user_id", ids),
    ]);
    return usersData.users.map((user) => {
      const profile = profiles?.find((row) => row.id === user.id);
      return {
        id: user.id,
        email: user.email ?? profile?.email ?? "",
        nome: profile?.nome ?? "",
        roles: (roles ?? []).filter((row) => row.user_id === user.id).map((row) => row.role as AppRole),
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at ?? null,
        confirmed: !!user.email_confirmed_at,
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
    const tenantId = await getAdminTenant(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { nome: data.nome },
    });
    if (error) throw new Error(error.message);
    const newId = created.user?.id;
    if (!newId) throw new Error("Não foi possível criar o usuário");

    // handle_new_user trigger inserts default role 'operador' (or 'admin' for the first user).
    // Replace with the requested role.
    await supabaseAdmin.from("user_roles").delete().eq("user_id", newId);
    const { error: profileErr } = await supabaseAdmin
      .from("profiles")
      .update({ nome: data.nome, email: data.email, tenant_id: tenantId })
      .eq("id", newId);
    if (profileErr) {
      await supabaseAdmin.auth.admin.deleteUser(newId);
      throw new Error(profileErr.message);
    }
    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: newId, role: data.role, tenant_id: tenantId });
    if (roleErr) {
      await supabaseAdmin.auth.admin.deleteUser(newId);
      throw new Error(roleErr.message);
    }

    if (data.role === "cobrador") {
      const { data: existing } = await supabaseAdmin
        .from("cobradores")
        .select("id,user_id")
        .or(`user_id.eq.${newId},nome.eq.${data.nome}`)
        .maybeSingle();
      if (existing) {
        await supabaseAdmin.from("cobradores").update({ user_id: newId, ativo: true }).eq("id", existing.id);
      } else {
        await supabaseAdmin.from("cobradores").insert({ nome: data.nome, ativo: true, user_id: newId, tenant_id: tenantId });
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
    const tenantId = await getAdminTenant(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await ensureUserInTenant(supabaseAdmin, data.userId, tenantId);
    await ensureNotMaster(supabaseAdmin, data.userId);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.userId, role: data.role, tenant_id: tenantId });
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
        await supabaseAdmin.from("cobradores").insert({ nome, ativo: true, user_id: data.userId, tenant_id: tenantId });
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
    const tenantId = await getAdminTenant(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await ensureUserInTenant(supabaseAdmin, data.userId, tenantId);
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
    const tenantId = await getAdminTenant(context.supabase, context.userId);
    if (data.userId === context.userId) {
      throw new Error("Você não pode excluir o próprio usuário");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await ensureUserInTenant(supabaseAdmin, data.userId, tenantId);
    await ensureNotMaster(supabaseAdmin, data.userId);
    const uid = data.userId;

    // Remove/limpa todos os vínculos do usuário antes de apagar a conta.
    // Vínculos que bloqueiam a exclusão (sem cascade):
    await supabaseAdmin.from("associados").update({ created_by: null }).eq("created_by", uid);
    await supabaseAdmin.from("baixa_sessoes").update({ responsavel_id: null }).eq("responsavel_id", uid);
    await supabaseAdmin.from("crm_leads").update({ responsavel_id: null }).eq("responsavel_id", uid);
    await supabaseAdmin.from("cobradores").update({ user_id: null, ativo: false }).eq("user_id", uid);

    // Dados próprios do usuário:
    await supabaseAdmin.from("vendas_pins").delete().eq("vendedor_id", uid);
    await supabaseAdmin.from("user_permissions").delete().eq("user_id", uid);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", uid);
    await supabaseAdmin.from("subscriptions").delete().eq("user_id", uid);
    await supabaseAdmin.from("logs_auditoria").delete().eq("user_id", uid);
    await supabaseAdmin.from("backup_logs").delete().eq("user_id", uid);
    await supabaseAdmin.from("profiles").delete().eq("id", uid);

    const { error } = await supabaseAdmin.auth.admin.deleteUser(uid);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
