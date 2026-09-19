import { supabase } from "@/integrations/supabase/client";
import { getCurrentTenantConfig } from "@/lib/tenant-config";
import { DEFAULT_CONTRATO_HTML } from "@/lib/contrato-template";

const TIPO = "contrato";

/** Modelo definido pelo administrador da plataforma (padrão para novas empresas) */
export async function loadPlatformContrato(): Promise<string | null> {
  const { data } = await (supabase.from("platform_documentos") as any)
    .select("html")
    .eq("tipo", TIPO)
    .maybeSingle();
  const html = (data as any)?.html as string | undefined;
  return html && html.trim() ? html : null;
}

/** Salva o modelo padrão da plataforma. Retorna a mensagem de erro, ou null em caso de sucesso. */
export async function savePlatformContrato(html: string): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await (supabase.from("platform_documentos") as any).upsert(
    { tipo: TIPO, html, updated_by: user?.id ?? null, updated_at: new Date().toISOString() },
    { onConflict: "tipo" },
  );
  return error ? error.message : null;
}

/** Modelo da empresa → modelo padrão da plataforma → modelo interno */
export async function loadContratoTemplate(): Promise<string> {
  try {
    const { data } = await getCurrentTenantConfig("contrato_template");
    const stored = (data as any)?.contrato_template as string | null;
    if (stored && stored.trim()) return stored;
  } catch { /* segue para os padrões */ }
  return (await loadPlatformContrato()) ?? DEFAULT_CONTRATO_HTML;
}
