import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function exigirAdmin(supabase: any, userId: string) {
  const { data: admin } = await supabase
    .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!admin) throw new Error("Apenas administradores podem gerenciar backups");
  const { data: perfil } = await supabase
    .from("profiles").select("nome, email").eq("id", userId).maybeSingle();
  return { nome: perfil?.nome ?? null, email: perfil?.email ?? null };
}

export type LogBackup = {
  userId?: string | null;
  nome?: string | null;
  email?: string | null;
  acao: "gerar" | "baixar" | "restaurar" | "automatico";
  formato?: string | null;
  origem?: string;
  tabelas: string[];
  registros: number;
  status?: string;
  erro?: string | null;
  detalhes?: any;
};

export async function registrarLog(entrada: LogBackup) {
  await supabaseAdmin.from("backup_logs").insert({
    user_id: entrada.userId ?? null,
    user_nome: entrada.nome ?? null,
    user_email: entrada.email ?? null,
    acao: entrada.acao,
    formato: entrada.formato ?? null,
    origem: entrada.origem ?? "manual",
    tabelas: entrada.tabelas,
    registros: entrada.registros,
    status: entrada.status ?? "sucesso",
    erro: entrada.erro ?? null,
    detalhes: entrada.detalhes ?? null,
  } as any);
}

/** Remove arquivos de backup automático mais antigos que `dias`. 0 = manter para sempre. */
export async function limparBackupsAntigos(dias: number) {
  if (!dias || dias <= 0) return { removidos: [] as string[] };
  const limite = Date.now() - dias * 24 * 60 * 60 * 1000;
  const removidos: string[] = [];

  for (let offset = 0; ; offset += 100) {
    const { data, error } = await supabaseAdmin.storage
      .from("backups")
      .list("auto", { limit: 100, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw new Error(error.message);
    if (!data?.length) break;

    for (const arq of data) {
      const criado = arq.created_at ? new Date(arq.created_at).getTime() : NaN;
      if (Number.isFinite(criado) && criado < limite) removidos.push(`auto/${arq.name}`);
    }
    if (data.length < 100) break;
  }

  if (removidos.length) {
    const { error } = await supabaseAdmin.storage.from("backups").remove(removidos);
    if (error) throw new Error(error.message);
  }
  return { removidos };
}

/** Envia alerta de falha de backup (e-mail via Resend quando configurado). */
export async function enviarAlertaFalha(destino: string | null | undefined, mensagem: string) {
  if (!destino) return { enviado: false, motivo: "sem destinatário" };
  const key = process.env.RESEND_API_KEY;
  if (!key) return { enviado: false, motivo: "RESEND_API_KEY não configurada" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Backup <onboarding@resend.dev>",
        to: [destino],
        subject: "Falha no backup automático",
        text: mensagem,
      }),
    });
    if (!res.ok) return { enviado: false, motivo: await res.text() };
    return { enviado: true };
  } catch (e: any) {
    return { enviado: false, motivo: e?.message };
  }
}
