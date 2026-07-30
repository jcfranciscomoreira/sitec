import { createFileRoute } from "@tanstack/react-router";
import { BACKUP_TABELAS } from "@/lib/backup-tabelas";

function devido(cfg: any, agora: Date): boolean {
  if (!cfg?.ativo) return false;
  if (agora.getUTCHours() < (cfg.hora ?? 3)) return false;
  const ultima = cfg.ultima_execucao ? new Date(cfg.ultima_execucao) : null;
  const horas = ultima ? (agora.getTime() - ultima.getTime()) / 36e5 : Infinity;
  if (cfg.periodicidade === "diario") return horas >= 20;
  if (cfg.periodicidade === "semanal") return agora.getUTCDay() === (cfg.dia_semana ?? 1) && horas >= 24 * 6;
  return agora.getUTCDate() === (cfg.dia_mes ?? 1) && horas >= 24 * 27;
}

export const Route = createFileRoute("/api/public/hooks/backup-automatico")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { registrarLog, enviarAlertaFalha, limparBackupsAntigos } = await import("@/lib/backup-helpers.server");

        const { data: cfg } = await supabaseAdmin.from("backup_config").select("*").eq("id", 1).maybeSingle();
        const agora = new Date();
        if (!devido(cfg, agora)) {
          return Response.json({ ok: true, executado: false });
        }

        const tabelas: string[] = (cfg as any)?.tabelas?.length ? (cfg as any).tabelas : [...BACKUP_TABELAS];
        const dados: Record<string, any[]> = {};
        const resumo: { tabela: string; registros: number }[] = [];

        try {
          for (const tabela of tabelas) {
            const linhas: any[] = [];
            for (let from = 0; ; from += 1000) {
              const { data: rows, error } = await supabaseAdmin
                .from(tabela as any).select("*").range(from, from + 999);
              if (error) throw new Error(`${tabela}: ${error.message}`);
              linhas.push(...(rows ?? []));
              if (!rows || rows.length < 1000) break;
            }
            dados[tabela] = linhas;
            resumo.push({ tabela, registros: linhas.length });
          }

          const nome = `auto/backup_${agora.toISOString().replace(/[:.]/g, "-")}.json`;
          const conteudo = JSON.stringify({ gerado_em: agora.toISOString(), versao: 1, resumo, dados });
          const up = await supabaseAdmin.storage
            .from("backups")
            .upload(nome, new Blob([conteudo], { type: "application/json" }), { upsert: true });
          if (up.error) throw new Error(up.error.message);

          const total = resumo.reduce((s, r) => s + r.registros, 0);

          let removidos: string[] = [];
          let erroRetencao: string | null = null;
          try {
            const r = await limparBackupsAntigos(Number((cfg as any)?.retencao_dias ?? 0));
            removidos = r.removidos;
          } catch (e: any) {
            erroRetencao = e?.message ?? "falha ao aplicar retenção";
          }

          await registrarLog({
            acao: "automatico", origem: "cron", formato: "json",
            tabelas, registros: total,
            detalhes: {
              arquivo: nome, resumo,
              retencao_dias: (cfg as any)?.retencao_dias ?? 0,
              removidos, erro_retencao: erroRetencao,
            },
          });
          await supabaseAdmin.from("backup_config").update({
            ultima_execucao: agora.toISOString(), ultimo_status: "sucesso", ultimo_erro: null,
          } as any).eq("id", 1);

          return Response.json({ ok: true, executado: true, arquivo: nome, registros: total, removidos });

        } catch (e: any) {
          const msg = e?.message ?? "erro desconhecido";
          await registrarLog({
            acao: "automatico", origem: "cron", formato: "json",
            tabelas, registros: 0, status: "erro", erro: msg,
          });
          await supabaseAdmin.from("backup_config").update({
            ultima_execucao: agora.toISOString(), ultimo_status: "erro", ultimo_erro: msg,
          } as any).eq("id", 1);
          await enviarAlertaFalha((cfg as any)?.alerta_email, `O backup automático falhou em ${agora.toISOString()}:\n\n${msg}`);
          return Response.json({ ok: false, erro: msg }, { status: 500 });
        }
      },
    },
  },
});
