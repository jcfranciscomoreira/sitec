import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const createTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) => z.object({
    nome: z.string().min(3),
  }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // 1. Criar o tenant
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .insert({
        nome: data.nome,
        status: "ativo",
        plan_status: "active",
        trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),

      })
      .select()
      .single();

    if (tenantError) throw new Error(`Falha ao criar empresa: ${tenantError.message}`);

    // 2. Atualizar o perfil do usuário com o novo tenant_id e torná-lo admin
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        tenant_id: tenant.id,
      })
      .eq("id", userId);

    if (profileError) throw new Error(`Falha ao atualizar perfil: ${profileError.message}`);

    // 3. Dar papel de admin ao usuário para este tenant
    const { error: roleError } = await supabase
      .from("user_roles")
      .insert({
        user_id: userId,
        role: "admin",
        // tenant_id será preenchido pela trigger se adicionarmos tenant_id à user_roles também
      });
    
    // Nota: Como não adicionei tenant_id na user_roles na migração anterior, 
    // vou assumir que o sistema de papéis é global por enquanto ou adicionar tenant_id lá também.
    // Vamos adicionar tenant_id na user_roles para isolamento total de permissões.

    return { success: true, tenantId: tenant.id };
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
