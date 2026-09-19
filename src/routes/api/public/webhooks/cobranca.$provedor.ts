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

        async function markProcessed(
          mensalidade_id?: string | null,
          erro?: string,
          tenant_id?: string | null,
        ) {
          if (!logId) return;
          await supabaseAdmin.from("webhook_logs").update({
            processado: !erro,
            erro: erro ?? null,
            mensalidade_id: mensalidade_id ?? null,
            tenant_id: tenant_id ?? null,
          }).eq("id", logId);
        }

        try {
          if (provedor === "asaas") {
            const expected = process.env["ASAAS_WEBHOOK_TOKEN"];
            const apiKey = process.env["ASAAS_API_KEY"];
            if (!expected || !apiKey) {
              await markProcessed(null, "Integração Asaas de produção incompleta");
              return new Response("Webhook unavailable", { status: 503 });
            }
            const received = request.headers.get("asaas-access-token");
            if (received !== expected) {
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
            if (!m) {
              // Pode ser uma fatura de assinatura do SaaS
              const { data: fat } = await supabaseAdmin.from("tenant_faturas")
                .select("id, tenant_id, plan_id, periodo, status").eq("cobranca_id", pay.id).maybeSingle();
              if (!fat) { await markProcessed(null, "Cobrança não encontrada"); return new Response("ok"); }

              const ev = payload?.event as string | undefined;
              const confirmado = ev === "PAYMENT_RECEIVED" || ev === "PAYMENT_CONFIRMED"
                || ["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH", "SETTLED"].includes(pay.status);

              if (confirmado && fat.status !== "pago") {
                const { consultarCobrancaAsaas } = await import("@/lib/cobranca/asaas.server");
                const real = await consultarCobrancaAsaas(apiKey, "producao", pay.id);
                if (!real.pago) {
                  await markProcessed(null, "Pagamento não confirmado diretamente no Asaas");
                  return new Response("Payment not confirmed", { status: 409 });
                }
                const { error } = await supabaseAdmin.rpc("confirm_tenant_invoice_payment", {
                  invoice_id: fat.id,
                  provider_status: real.status,
                  paid_on: real.dataPagamento ?? new Date().toISOString().slice(0, 10),
                });
                if (error) throw error;
              } else {
                await supabaseAdmin.from("tenant_faturas").update({ cobranca_status: pay.status }).eq("id", fat.id);
              }
              await markProcessed(null, undefined, fat.tenant_id);
              return new Response("ok");
            }

            const { data: mensalidadeTenant } = await supabaseAdmin
              .from("mensalidades")
              .select("tenant_id")
              .eq("id", m.id)
              .maybeSingle();

            const pagou = evento === "PAYMENT_RECEIVED" || evento === "PAYMENT_CONFIRMED" || pay.status === "RECEIVED" || pay.status === "CONFIRMED" || pay.status === "RECEIVED_IN_CASH" || pay.status === "SETTLED";
            if (pagou && m.status !== "pago") {
              const forma = (pay.billingType === "PIX" ? "pix" : pay.billingType === "BOLETO" ? "boleto" : "pix");
              const { error } = await supabaseAdmin.from("mensalidades").update({
                status: "pago",
                data_pagamento: pay.paymentDate || pay.clientPaymentDate || new Date().toISOString().slice(0, 10),
                forma_pagamento: forma,
                cobranca_status: pay.status,
              }).eq("id", m.id);
               if (error) {
                 await markProcessed(m.id, error.message, mensalidadeTenant?.tenant_id);
                 return new Response("ok");
               }
            } else {
              await supabaseAdmin.from("mensalidades").update({ cobranca_status: pay.status }).eq("id", m.id);
            }
            await markProcessed(m.id, undefined, mensalidadeTenant?.tenant_id);
            return new Response("ok");
          }

          // provedor não implementado: só loga
          await markProcessed(null, "Provedor não implementado");
          return new Response("ok");
        } catch (e: any) {
          await markProcessed(null, e?.message ?? "Erro desconhecido");
          return new Response("temporary failure", { status: 500 });
        }
      },
      GET: async ({ params }) => new Response(`Webhook ${params.provedor} ok`),
    },
  },
});
