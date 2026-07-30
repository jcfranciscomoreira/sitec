import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(context: any) {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Apenas administradores podem bonificar parcelas");
}

const bonificarSchema = z.object({
  mensalidadeIds: z.array(z.string().uuid()).min(1).max(200),
  motivo: z.string().trim().min(3).max(300),
});

export const bonificarParcelas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => bonificarSchema.parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: prof } = await supabaseAdmin
      .from("profiles").select("nome, email").eq("id", context.userId).maybeSingle();
    const nome = prof?.nome?.trim() || prof?.email || "Administrador";

    const { data: rows, error: selErr } = await supabaseAdmin
      .from("mensalidades")
      .select("id, status, bonificada")
      .in("id", data.mensalidadeIds);
    if (selErr) throw new Error(selErr.message);

    const alvos = (rows ?? []).filter((r: any) => !r.bonificada && r.status !== "pago");
    if (alvos.length === 0) throw new Error("Nenhuma parcela elegível para bonificação");

    const { error } = await supabaseAdmin
      .from("mensalidades")
      .update({
        status: "pago",
        data_pagamento: new Date().toISOString().slice(0, 10),
        forma_pagamento: "bonificacao",
        bonificada: true,
        bonificacao_motivo: data.motivo,
        bonificado_por: context.userId,
        bonificado_por_nome: nome,
        bonificado_em: new Date().toISOString(),
      } as any)
      .in("id", alvos.map((a: any) => a.id));
    if (error) throw new Error(error.message);

    return { ok: true, total: alvos.length };
  });

export const cancelarBonificacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ mensalidadeId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row, error: selErr } = await supabaseAdmin
      .from("mensalidades")
      .select("id, vencimento, bonificada")
      .eq("id", data.mensalidadeId)
      .maybeSingle();
    if (selErr) throw new Error(selErr.message);
    if (!row) throw new Error("Parcela não encontrada");
    if (!(row as any).bonificada) throw new Error("Esta parcela não está bonificada");

    const vencida = new Date((row as any).vencimento) < new Date(new Date().toISOString().slice(0, 10));

    const { error } = await supabaseAdmin
      .from("mensalidades")
      .update({
        status: vencida ? "atrasado" : "pendente",
        data_pagamento: null,
        forma_pagamento: null,
        bonificada: false,
        bonificacao_motivo: null,
        bonificado_por: null,
        bonificado_por_nome: null,
        bonificado_em: null,
      } as any)
      .eq("id", data.mensalidadeId);
    if (error) throw new Error(error.message);

    return { ok: true };
  });
