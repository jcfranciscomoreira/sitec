import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { BACKUP_TABELAS } from "@/lib/backup-tabelas";

export const gerarBackup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ tabelas: z.array(z.enum(BACKUP_TABELAS)).min(1) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { data: admin } = await context.supabase
      .from("user_roles").select("role").eq("user_id", context.userId).eq("role", "admin").maybeSingle();
    if (!admin) throw new Error("Apenas administradores podem gerar backups");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const dados: Record<string, any[]> = {};
    const resumo: { tabela: string; registros: number }[] = [];
    const pageSize = 1000;

    for (const tabela of data.tabelas) {
      const linhas: any[] = [];
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

    return { gerado_em: new Date().toISOString(), versao: 1, resumo, dados };
  });
