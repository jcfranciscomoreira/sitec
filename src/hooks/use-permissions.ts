import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "operador" | "vendedor" | "cobrador" | "agente";

export function usePermissions() {
  const [allowedModules, setAllowedModules] = useState<Set<string> | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (!cancel) { setAllowedModules(new Set()); setLoading(false); } return; }
      const { data: ur } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      const userRoles = (ur ?? []).map((r: any) => r.role as AppRole);
      if (userRoles.includes("admin")) {
        if (!cancel) { setRoles(userRoles); setAllowedModules(new Set(["*"])); setLoading(false); }
        return;
      }
      const [{ data: perms }, { data: overrides }] = await Promise.all([
        supabase.from("role_permissions").select("module, allowed, role").in("role", userRoles),
        supabase.from("user_permissions").select("module, allowed").eq("user_id", user.id),
      ]);
      const allowed = new Set<string>();
      (perms ?? []).forEach((p: any) => { if (p.allowed) allowed.add(p.module); });
      // User overrides win
      (overrides ?? []).forEach((o: any) => {
        if (o.allowed) allowed.add(o.module);
        else allowed.delete(o.module);
      });
      if (!cancel) { setRoles(userRoles); setAllowedModules(allowed); setLoading(false); }
    })();
    return () => { cancel = true; };
  }, []);

  function can(module: string) {
    if (!allowedModules) return false;
    if (allowedModules.has("*")) return true;
    return allowedModules.has(module);
  }

  function canTab(module: string, tab: string) {
    if (!can(module)) return false;
    if (!allowedModules || allowedModules.has("*")) return true;
    const key = `${module}.${tab}`;
    if (allowedModules.has(key)) return true;
    // Compatibilidade: se nenhuma permissão por aba foi definida para este módulo,
    // liberar todas as abas (módulo simplesmente ativo).
    for (const k of allowedModules) if (k.startsWith(`${module}.`)) return false;
    return true;
  }

  return { roles, can, canTab, loading, isAdmin: roles.includes("admin") };
}
