import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getProvider } from "@/lib/cobranca/providers";

async function assertAdmin(ctx: any) {
  const { data } = await ctx.supabase
    .from("user_roles").select("role").eq("user_id", ctx.userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Apenas administradores podem alterar a integração bancária");
}

// Lê o registro de integração + decripta segredos (armazenados no banco)
async function loadIntegracao(provedor: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { decryptJson } = await import("@/lib/cobranca/crypto.server");
  const { data, error } = await supabaseAdmin
    .from("integracao_bancaria").select("*").eq("provedor", provedor).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error(`Integração ${provedor} não configurada`);
  const meta = getProvider(provedor);
  if (!meta) throw new Error(`Provedor desconhecido: ${provedor}`);
  let secrets: Record<string, string> = {};
  try {
    secrets = decryptJson((data as any).secrets_encrypted);
  } catch (e: any) {
    throw new Error("Falha ao decriptar segredos: " + e.message);
  }
  return { row: data, secrets, meta };
}

export const listIntegracoes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("integracao_bancaria")
      .select("id, provedor, ambiente, ativo, config_json, secrets_encrypted, updated_at");
    if (error) throw new Error(error.message);
    // Nunca devolvemos segredos para o cliente — só a lista de chaves configuradas.
    let decrypt: ((s: string | null) => Record<string, string>) | null = null;
    try {
      const mod = await import("@/lib/cobranca/crypto.server");
      decrypt = mod.decryptJson;
    } catch { /* sem chave configurada */ }
    return (data ?? []).map((r: any) => {
      let secret_keys: string[] = [];
      if (decrypt && r.secrets_encrypted) {
        try { secret_keys = Object.keys(decrypt(r.secrets_encrypted)); } catch { secret_keys = []; }
      }
      const { secrets_encrypted, ...rest } = r;
      return { ...rest, secret_keys };
    });
  });

const saveSchema = z.object({
  provedor: z.string().min(1).max(32),
  ambiente: z.enum(["sandbox", "producao"]),
  ativo: z.boolean(),
  config_json: z.record(z.string(), z.any()).default({}),
  // Novos valores de segredo digitados pelo usuário. Só sobrescreve o que vier preenchido.
  secrets: z.record(z.string(), z.string()).default({}),
  // Chaves de segredo que o usuário quer apagar
  secrets_remove: z.array(z.string()).default([]),
});

export const saveIntegracao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => saveSchema.parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { encryptJson, decryptJson } = await import("@/lib/cobranca/crypto.server");

    // Carrega segredos existentes para mesclar
    const { data: existing } = await supabaseAdmin
      .from("integracao_bancaria").select("secrets_encrypted").eq("provedor", data.provedor).maybeSingle();
    let currentSecrets: Record<string, string> = {};
    try { currentSecrets = decryptJson((existing as any)?.secrets_encrypted ?? null); } catch { currentSecrets = {}; }
    for (const [k, v] of Object.entries(data.secrets)) {
      if (typeof v === "string" && v.length > 0) currentSecrets[k] = v;
    }
    for (const k of data.secrets_remove) delete currentSecrets[k];
    const secrets_encrypted = Object.keys(currentSecrets).length > 0 ? encryptJson(currentSecrets) : null;

    if (data.ativo) {
      await supabaseAdmin.from("integracao_bancaria").update({ ativo: false }).neq("provedor", data.provedor);
    }
    const { error } = await supabaseAdmin.from("integracao_bancaria").upsert({
      provedor: data.provedor,
      ambiente: data.ambiente,
      ativo: data.ativo,
      config_json: data.config_json,
      secrets_encrypted,
    }, { onConflict: "provedor" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const testarConexao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ provedor: z.string() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { row, secrets, meta } = await loadIntegracao(data.provedor);
    if (!meta.implementado) throw new Error(`O adaptador ${meta.nome} ainda não está implementado (apenas configuração).`);
    if (data.provedor === "asaas") {
      const { testarConexaoAsaas } = await import("@/lib/cobranca/asaas.server");
      const apiKey = secrets["api_key"];
      if (!apiKey) throw new Error("API Key não configurada. Preencha o campo e salve antes de testar.");
      await testarConexaoAsaas({ apiKey, ambiente: row.ambiente as any });
      return { ok: true, mensagem: "Conexão OK — credenciais válidas." };
    }
    throw new Error("Provedor não implementado");
  });

export const criarCobranca = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ mensalidade_id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: m, error: me } = await context.supabase
      .from("mensalidades")
      .select("id, valor, vencimento, competencia, cobranca_id, associados(id, nome, cpf, email, telefone, forma_pagamento)")
      .eq("id", data.mensalidade_id).maybeSingle();
    if (me) throw new Error(me.message);
    if (!m) throw new Error("Mensalidade não encontrada");
    if ((m as any).cobranca_id) throw new Error("Esta mensalidade já possui cobrança gerada.");
    const assoc = (m as any).associados;
    if (!assoc) throw new Error("Associado não encontrado");
    const forma = (assoc.forma_pagamento || "boleto_pix") as "boleto" | "pix" | "boleto_pix";
    if (forma !== "boleto" && forma !== "pix" && forma !== "boleto_pix") {
      throw new Error("Forma de pagamento do associado não é boleto nem PIX.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: integ } = await supabaseAdmin
      .from("integracao_bancaria").select("*").eq("ativo", true).maybeSingle();
    if (!integ) throw new Error("Nenhuma integração bancária ativa. Configure em Configurações → Integração Bancária.");
    const { secrets, meta } = await loadIntegracao(integ.provedor);
    if (!meta.implementado) throw new Error(`Adaptador ${meta.nome} ainda não implementado.`);

    if (integ.provedor === "asaas") {
      const { criarCobrancaAsaas } = await import("@/lib/cobranca/asaas.server");
      const apiKey = secrets["api_key"];
      if (!apiKey) throw new Error("API Key do Asaas não configurada.");
      const result = await criarCobrancaAsaas({
        ambiente: integ.ambiente as any,
        apiKey,
        associado: { id: assoc.id, nome: assoc.nome, cpf: assoc.cpf, email: assoc.email, telefone: assoc.telefone },
        mensalidade: {
          id: (m as any).id,
          valor: Number((m as any).valor),
          vencimento: (m as any).vencimento,
          descricao: `Mensalidade ${(m as any).competencia}`,
          forma,
        },
      });

      const { error: ue } = await supabaseAdmin.from("mensalidades").update({
        cobranca_id: result.cobrancaId,
        cobranca_provedor: integ.provedor,
        cobranca_status: result.status,
        linha_digitavel: result.linhaDigitavel,
        codigo_barras: result.codigoBarras,
        pix_copia_cola: result.pixCopiaCola,
        qr_code_base64: result.qrCodeBase64,
        link_boleto: result.linkBoleto,
      }).eq("id", (m as any).id);
      if (ue) throw new Error(ue.message);

      return { ok: true, cobrancaId: result.cobrancaId, linkBoleto: result.linkBoleto };
    }

    throw new Error("Provedor não implementado");
  });

export const sincronizarCobranca = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ mensalidade_id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: m } = await context.supabase
      .from("mensalidades").select("id, cobranca_id, cobranca_provedor, status").eq("id", data.mensalidade_id).maybeSingle();
    if (!m || !(m as any).cobranca_id) throw new Error("Sem cobrança para sincronizar");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: integ } = await supabaseAdmin
      .from("integracao_bancaria").select("*").eq("provedor", (m as any).cobranca_provedor).maybeSingle();
    if (!integ) throw new Error("Provedor não configurado");
    const { secrets } = await loadIntegracao(integ.provedor);
    if (integ.provedor === "asaas") {
      const { consultarCobrancaAsaas } = await import("@/lib/cobranca/asaas.server");
      const r = await consultarCobrancaAsaas(secrets["api_key"]!, integ.ambiente as any, (m as any).cobranca_id);
      if (r.pago && (m as any).status !== "pago") {
        await supabaseAdmin.from("mensalidades").update({
          status: "pago",
          data_pagamento: r.dataPagamento ?? new Date().toISOString().slice(0, 10),
          forma_pagamento: "pix",
          cobranca_status: r.status,
        }).eq("id", (m as any).id);
      } else {
        await supabaseAdmin.from("mensalidades").update({ cobranca_status: r.status }).eq("id", (m as any).id);
      }
      return { ok: true, pago: r.pago, status: r.status };
    }
    throw new Error("Provedor não implementado");
  });
