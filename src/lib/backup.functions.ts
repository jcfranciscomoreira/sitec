import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const BACKUP_TABELAS = [
  "configuracoes",
  "filiais",
  "planos",
  "associados",
  "dependentes",
  "mensalidades",
  "cobradores",
  "recebimentos_pendentes",
  "contas_financeiras",
  "caixa_sessoes",
  "caixa_movimentos",
  "servicos_funerarios",
  "servicos_produtos",
  "servico_checklist",
  "servico_financeiro",
  "servico_timeline",
  "estoque_itens",
  "estoque_movimentos",
  "crm_leads",
  "crm_stages",
  "vendas_pins",
  "profiles",
  "user_roles",
  "role_permissions",
  "user_permissions",
  "logs_auditoria",
] as const;

const schema = z.object({
  tabelas: z.array(z.enum(BACKUP_TABELAS)).min(1).max(BACKUP_TABELAS.length),
});

async function assertAdmin(ctx: any) {
  const { data } = await ctx.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", ctx.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Apenas administradores podem gerar backups");
}

export const gerarBackup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const dados: Record<string, any[]> = {};
    const resumo: { tabela: string; registros: number }[] = [];

    for (const tabela of data.tabelas) {
      const linhas: any[] = [];
      const pageSize = 1000;
      for (let from = 0; ; from += pageSize) {
        const { data: rows, error } = await supabaseAdmin
          .from(tabela)
          .select("*")
          .range(from, from + pageSize - 1);
        if (error) throw new Error(`${tabela}: ${error.message}`);
        linhas.push(...(rows ?? []));
        if (!rows || rows.length < pageSize) break;
      }
      dados[tabela] = linhas;
      resumo.push({ tabela, registros: linhas.length });
    }

    return {
      gerado_em: new Date().toISOString(),
      versao: 1,
      resumo,
      dados,
    };
  });
