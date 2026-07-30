import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/**
 * Valida as credenciais de um administrador (e-mail + senha) sem alterar
 * a sessão do usuário logado. Usado para liberar ações restritas no caixa.
 */
export const verificarSenhaAdmin = createServerFn({ method: "POST" })
  .inputValidator((data: { email: string; senha: string }) => {
    const email = String(data?.email ?? "").trim().toLowerCase();
    const senha = String(data?.senha ?? "");
    if (!email || email.length > 255 || !email.includes("@")) throw new Error("E-mail inválido");
    if (!senha || senha.length > 200) throw new Error("Senha inválida");
    return { email, senha };
  })
  .handler(async ({ data }) => {
    const url = process.env.SUPABASE_URL!;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const client = createClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });

    const { data: auth, error } = await client.auth.signInWithPassword({
      email: data.email,
      password: data.senha,
    });
    if (error || !auth?.user) return { ok: false as const, motivo: "credenciais" as const };

    const { data: role } = await client
      .from("user_roles")
      .select("role")
      .eq("user_id", auth.user.id)
      .eq("role", "admin")
      .maybeSingle();

    await client.auth.signOut();

    if (!role) return { ok: false as const, motivo: "sem_permissao" as const };
    return { ok: true as const };
  });
