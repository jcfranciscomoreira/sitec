import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/webhooks/cobranca/$provedor")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const provedor = params.provedor;
        const bodyText = await request.text();
        let payload: any = null;
        try { payload = JSON.parse(bodyText); } catch { /* ignore */ }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Registra o webhook (sempre, para auditoria)
        const { data: logRow } = await supabaseAdmin.from("webhook_logs").insert({
          provedor, payload: payload ?? { raw: bodyText }, processado: false,
        }).select("id").maybeSingle();
        const logId = logRow?.id;

        async function markProcessed(mensalidade_id?: string | null, erro?: string) {
          if (!logId) return;
          await supabaseAdmin.from("webhook_logs").update({
            processado: !erro, erro: erro ?? null, mensalidade_id: mensalidade_id ?? null,
          }).eq("id", logId);
        }

        try {
          if (provedor === "asaas") {
            // Validação por token no header (asaas-access-token) — lido da integração criptografada no banco
            let expected: string | undefined;
            try {
              const { data: integ } = await supabaseAdmin
                .from("integracao_bancaria").select("secrets_encrypted").eq("provedor", "asaas").maybeSingle();
              if ((integ as any)?.secrets_encrypted) {
                const { decryptJson } = await import("@/lib/cobranca/crypto.server");
                expected = decryptJson((integ as any).secrets_encrypted)["webhook_token"];
              }
            } catch { /* segredo ausente = sem validação estrita */ }
            const received = request.headers.get("asaas-access-token");
            if (expected && received !== expected) {
              await markProcessed(null, "Token inválido");
              return new Response("Invalid token", { status: 401 });
            }
            const evento = payload?.event as string | undefined;
            const pay = payload?.payment;
            if (!pay?.id) {
              await markProcessed(null, "Payload sem payment.id");
              return new Response("ok"); // ack sem processar
            }
            // Localiza mensalidade pela cobranca_id
            const { data: m } = await supabaseAdmin.from("mensalidades")
              .select("id, status").eq("cobranca_id", pay.id).maybeSingle();
            if (!m) { await markProcessed(null, "Mensalidade não encontrada"); return new Response("ok"); }

            const pagou = evento === "PAYMENT_RECEIVED" || evento === "PAYMENT_CONFIRMED" || pay.status === "RECEIVED" || pay.status === "CONFIRMED";
            if (pagou && m.status !== "pago") {
              const forma = (pay.billingType === "PIX" ? "pix" : pay.billingType === "BOLETO" ? "boleto" : "pix");
              const { error } = await supabaseAdmin.from("mensalidades").update({
                status: "pago",
                data_pagamento: pay.paymentDate || pay.clientPaymentDate || new Date().toISOString().slice(0, 10),
                forma_pagamento: forma,
                cobranca_status: pay.status,
              }).eq("id", m.id);
              if (error) { await markProcessed(m.id, error.message); return new Response("ok"); }
            } else {
              await supabaseAdmin.from("mensalidades").update({ cobranca_status: pay.status }).eq("id", m.id);
            }
            await markProcessed(m.id);
            return new Response("ok");
          }

          // provedor não implementado: só loga
          await markProcessed(null, "Provedor não implementado");
          return new Response("ok");
        } catch (e: any) {
          await markProcessed(null, e?.message ?? "Erro desconhecido");
          return new Response("ok"); // ack pra o provedor não reenviar em loop
        }
      },
      GET: async ({ params }) => new Response(`Webhook ${params.provedor} ok`),
    },
  },
});
