import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { BACKUP_TABELAS } from "@/lib/backup-tabelas";

const tabelaEnum = z.enum(BACKUP_TABELAS);

export const gerarBackup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      tabelas: z.array(tabelaEnum).min(1),
      formato: z.enum(["json", "csv"]).default("json"),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { exigirAdmin, registrarLog } = await import("@/lib/backup-helpers.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const perfil = await exigirAdmin(context.supabase, context.userId);

    const dados: Record<string, any[]> = {};
    const resumo: { tabela: string; registros: number }[] = [];
    const pageSize = 1000;

    try {
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
    } catch (e: any) {
      await registrarLog({
        userId: context.userId, ...perfil, acao: "gerar", formato: data.formato,
        tabelas: data.tabelas as string[], registros: 0, status: "erro", erro: e?.message,
      });
      throw e;
    }

    const total = resumo.reduce((s, r) => s + r.registros, 0);
    await registrarLog({
      userId: context.userId, ...perfil, acao: "gerar", formato: data.formato,
      tabelas: data.tabelas as string[], registros: total, detalhes: resumo,
    });

    return { gerado_em: new Date().toISOString(), versao: 1, resumo, dados };
  });

export const registrarDownloadBackup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      tabelas: z.array(z.string()).default([]),
      formato: z.string().default("json"),
      registros: z.number().default(0),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { exigirAdmin, registrarLog } = await import("@/lib/backup-helpers.server");
    const perfil = await exigirAdmin(context.supabase, context.userId);
    await registrarLog({
      userId: context.userId, ...perfil, acao: "baixar",
      formato: data.formato, tabelas: data.tabelas, registros: data.registros,
    });
    return { ok: true };
  });

export const restaurarBackup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      formato: z.enum(["json", "csv"]).default("json"),
      aplicar: z.boolean().default(false),
      tabelas: z.array(tabelaEnum).min(1),
      dados: z.record(z.string(), z.array(z.record(z.string(), z.any()))),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { exigirAdmin, registrarLog } = await import("@/lib/backup-helpers.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const perfil = await exigirAdmin(context.supabase, context.userId);

    const relatorio: {
      tabela: string;
      no_arquivo: number;
      na_base: number;
      sobrescritos: number;
      novos: number;
      sem_id: number;
      colunas_desconhecidas: string[];
      aplicados?: number;
    }[] = [];

    for (const tabela of data.tabelas) {
      const linhas = (data.dados[tabela] ?? []).filter((l) => l && typeof l === "object");
      const ids = linhas
        .map((l) => (l as any).id)
        .filter((v) => v !== undefined && v !== null && v !== "");
      const semId = linhas.length - ids.length;

      const { count } = await supabaseAdmin.from(tabela).select("id", { count: "exact", head: true });

      let colunasDesconhecidas: string[] = [];
      const { data: amostra } = await supabaseAdmin.from(tabela).select("*").limit(1);
      if (amostra?.length) {
        const validas = new Set(Object.keys(amostra[0] as any));
        const doArquivo = new Set(linhas.flatMap((l) => Object.keys(l)));
        colunasDesconhecidas = [...doArquivo].filter((c) => !validas.has(c));
      }

      let sobrescritos = 0;
      for (let i = 0; i < ids.length; i += 200) {
        const lote = ids.slice(i, i + 200);
        const { data: existentes } = await supabaseAdmin.from(tabela).select("id").in("id", lote as any);
        sobrescritos += existentes?.length ?? 0;
      }

      relatorio.push({
        tabela,
        no_arquivo: linhas.length,
        na_base: count ?? 0,
        sobrescritos,
        novos: ids.length - sobrescritos,
        sem_id: semId,
        colunas_desconhecidas: colunasDesconhecidas,
      });
    }

    const bloqueios = relatorio.filter((r) => r.colunas_desconhecidas.length > 0 || r.sem_id > 0);

    if (!data.aplicar) {
      return { modo: "previa" as const, relatorio, bloqueios: bloqueios.map((b) => b.tabela) };
    }

    if (bloqueios.length) {
      throw new Error(
        `Arquivo inválido para: ${bloqueios.map((b) => b.tabela).join(", ")}. Corrija colunas desconhecidas ou registros sem id.`,
      );
    }

    let totalAplicado = 0;
    try {
      for (const item of relatorio) {
        const linhas = data.dados[item.tabela] ?? [];
        for (let i = 0; i < linhas.length; i += 200) {
          const lote = linhas.slice(i, i + 200);
          const { error } = await supabaseAdmin
            .from(item.tabela as any)
            .upsert(lote as any, { onConflict: "id" });
          if (error) throw new Error(`${item.tabela}: ${error.message}`);
        }
        item.aplicados = linhas.length;
        totalAplicado += linhas.length;
      }
    } catch (e: any) {
      await registrarLog({
        userId: context.userId, ...perfil, acao: "restaurar", formato: data.formato,
        tabelas: data.tabelas as string[], registros: totalAplicado, status: "erro",
        erro: e?.message, detalhes: relatorio,
      });
      throw e;
    }

    await registrarLog({
      userId: context.userId, ...perfil, acao: "restaurar", formato: data.formato,
      tabelas: data.tabelas as string[], registros: totalAplicado, detalhes: relatorio,
    });

    return { modo: "aplicado" as const, relatorio, bloqueios: [] as string[] };
  });
