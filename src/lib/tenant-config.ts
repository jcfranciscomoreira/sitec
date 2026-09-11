import { supabase } from "@/integrations/supabase/client";

export async function getCurrentTenantId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado");

  const { data, error } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();
  if (error) throw new Error(error.message);
  if (!data?.tenant_id) throw new Error("Sua conta não está vinculada a uma empresa");
  return data.tenant_id;
}

export async function getCurrentTenantConfig<T extends string>(columns: T) {
  const tenantId = await getCurrentTenantId();
  const { data, error } = await supabase
    .from("configuracoes")
    .select(columns)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return { data, tenantId };
}