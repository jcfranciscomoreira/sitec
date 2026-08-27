import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MATRIZ = "00000000-0000-0000-0000-000000000000";

export const getAssinatura = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: profile } = await supabase
      .from("profiles").select("tenant_id").eq("id", userId).maybeSingle();
    const tenantId = profile?.tenant_id ?? null;
    if (!tenantId || tenantId === MATRIZ) return null;

    const { data: tenant } = await supabase
      .from("tenants")
      .select("id, nome, plan_id, plan_status, trial_ends_at, expires_at, email, cnpj, telefone")
      .eq("id", tenantId)
      .maybeSingle();
    if (!tenant) return null;

    const { data: planos } = await supabase
      .from("system_plans")
      .select("id, nome, descricao, preco_mensal, preco_semestral, preco_anual, ativo")
      .eq("ativo", true)
      .order("preco_mensal");

    const { data: faturas } = await supabase
      .from("tenant_faturas")
      .select("id, status, valor, periodo, vencimento, link_boleto, pix_copia_cola, qr_code_base64, created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(5);

    const agora = Date.now();
    const fim = tenant.expires_at ?? tenant.trial_ends_at;
    const diasRestantes = fim
      ? Math.ceil((new Date(fim).getTime() - agora) / 86_400_000)
      : null;

    const pago = tenant.plan_status === "active" && !!tenant.expires_at && new Date(tenant.expires_at).getTime() > agora;
    const emTeste = !pago && !!tenant.trial_ends_at;

    return {
      tenant: { id: tenant.id, nome: tenant.nome, plan_id: tenant.plan_id, plan_status: tenant.plan_status },
      emTeste,
      pago,
      expirado: diasRestantes !== null && diasRestantes <= 0,
      diasRestantes,
      fim,
      planos: planos ?? [],
      faturas: faturas ?? [],
    };
  });

const MESES: Record<string, number> = { mensal: 1, semestral: 6, anual: 12 };

export const criarPagamentoAssinatura = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      plan_id: z.string().uuid(),
      periodo: z.enum(["mensal", "semestral", "anual"]),
      forma: z.enum(["pix", "boleto", "boleto_pix"]).default("boleto_pix"),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    const { data: profile } = await supabase
      .from("profiles").select("tenant_id").eq("id", userId).maybeSingle();
    const tenantId = profile?.tenant_id;
    if (!tenantId || tenantId === MATRIZ) throw new Error("Empresa não encontrada para este usuário");

    const { data: isAdmin } = await supabase
      .from("user_roles").select("role").eq("user_id", userId)
      .in("role", ["admin", "super_admin"]).limit(1).maybeSingle();
    if (!isAdmin) throw new Error("Apenas o administrador da empresa pode contratar um plano");

    const { data: tenant } = await supabase
      .from("tenants").select("id, nome, email, cnpj, telefone").eq("id", tenantId).maybeSingle();
    if (!tenant) throw new Error("Empresa não encontrada");

    const { data: plano } = await supabase
      .from("system_plans")
      .select("id, nome, preco_mensal, preco_semestral, preco_anual")
      .eq("id", data.plan_id)
      .maybeSingle();
    if (!plano) throw new Error("Plano não encontrado");

    const meses = MESES[data.periodo]!;
    const valor =
      data.periodo === "anual"
        ? Number(plano.preco_anual ?? Number(plano.preco_mensal) * 12)
        : data.periodo === "semestral"
          ? Number(plano.preco_semestral ?? Number(plano.preco_mensal) * 6)
          : Number(plano.preco_mensal);
    if (!valor || valor <= 0) throw new Error("Plano sem preço configurado para este período");

    const vencimento = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: fatura, error: fatErr } = await supabaseAdmin
      .from("tenant_faturas")
      .insert({
        tenant_id: tenantId,
        plan_id: plano.id,
        periodo: data.periodo,
        valor,
        vencimento,
        status: "pendente",
        created_by: userId,
      })
      .select("id")
      .single();
    if (fatErr) throw new Error(fatErr.message);

    // Credenciais Asaas da plataforma (integração da Matriz, com fallback para a ativa)
    const { data: integs } = await supabaseAdmin
      .from("integracao_bancaria")
      .select("ambiente, ativo, tenant_id, secrets_encrypted")
      .eq("provedor", "asaas");
    const integ =
      (integs ?? []).find((i: any) => i.tenant_id === MATRIZ) ??
      (integs ?? []).find((i: any) => i.ativo) ??
      (integs ?? [])[0];
    if (!integ?.secrets_encrypted) throw new Error("Integração Asaas da plataforma não configurada");

    const { decryptJson } = await import("@/lib/cobranca/crypto.server");
    const apiKey = decryptJson((integ as any).secrets_encrypted)["api_key"];
    if (!apiKey) throw new Error("API Key do Asaas não configurada");

    const { criarCobrancaAsaas } = await import("@/lib/cobranca/asaas.server");
    try {
      const cob = await criarCobrancaAsaas({
        ambiente: (integ as any).ambiente === "producao" ? "producao" : "sandbox",
        apiKey,
        associado: {
          id: tenantId,
          nome: tenant.nome,
          cpf: tenant.cnpj ?? null,
          email: tenant.email ?? null,
          telefone: tenant.telefone ?? null,
        },
        mensalidade: {
          id: `saas:${fatura.id}`,
          valor,
          vencimento,
          descricao: `Assinatura ${plano.nome} (${data.periodo}) — ${meses} ${meses === 1 ? "mês" : "meses"}`,
          forma: data.forma,
        },
      });

      await supabaseAdmin
        .from("tenant_faturas")
        .update({
          cobranca_id: cob.cobrancaId,
          cobranca_status: cob.status,
          link_boleto: cob.linkBoleto,
          linha_digitavel: cob.linhaDigitavel,
          pix_copia_cola: cob.pixCopiaCola,
          qr_code_base64: cob.qrCodeBase64,
        })
        .eq("id", fatura.id);

      return {
        faturaId: fatura.id,
        valor,
        vencimento,
        linkBoleto: cob.linkBoleto,
        linhaDigitavel: cob.linhaDigitavel,
        pixCopiaCola: cob.pixCopiaCola,
        qrCodeBase64: cob.qrCodeBase64,
      };
    } catch (e: any) {
      await supabaseAdmin.from("tenant_faturas").update({ status: "erro" }).eq("id", fatura.id);
      throw new Error(e?.message ?? "Falha ao gerar cobrança no Asaas");
    }
  });
