import { supabase } from "@/integrations/supabase/client";

export type EmpresaHeader = {
  nome: string;
  subtitulo: string | null;
  logo_url: string | null;
  cnpj: string | null;
  endereco: string | null;
  telefone: string | null;
};

let cache: EmpresaHeader | null = null;

export async function loadEmpresaHeader(): Promise<EmpresaHeader> {
  if (cache) return cache;
  const { data } = await supabase
    .from("configuracoes")
    .select("nome_sistema, subtitulo, logo_url, cnpj, endereco, telefone")
    .eq("id", 1)
    .maybeSingle();
  const d = (data as any) ?? {};
  cache = {
    nome: d.nome_sistema ?? "Memorial",
    subtitulo: d.subtitulo ?? null,
    logo_url: d.logo_url ?? null,
    cnpj: d.cnpj ?? null,
    endereco: d.endereco ?? null,
    telefone: d.telefone ?? null,
  };
  return cache;
}

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

export function renderEmpresaHeaderHTML(h: EmpresaHeader): string {
  const contato = [h.cnpj && `CNPJ: ${h.cnpj}`, h.telefone && `Tel: ${h.telefone}`, h.endereco]
    .filter(Boolean)
    .map((v) => esc(String(v)))
    .join(" &middot; ");
  const logo = h.logo_url
    ? `<img src="${esc(h.logo_url)}" alt="logo" style="max-height:60px;max-width:160px;object-fit:contain" />`
    : "";
  return `<div style="display:flex;align-items:center;gap:14px;border-bottom:2px solid #111;padding-bottom:10px;margin-bottom:14px;font-family:Arial,sans-serif">
    ${logo}
    <div style="flex:1">
      <div style="font-size:18px;font-weight:700;color:#111">${esc(h.nome)}</div>
      ${h.subtitulo ? `<div style="font-size:12px;color:#555">${esc(h.subtitulo)}</div>` : ""}
      ${contato ? `<div style="font-size:11px;color:#555;margin-top:2px">${contato}</div>` : ""}
    </div>
  </div>`;
}

export async function getEmpresaHeaderHTML(): Promise<string> {
  return renderEmpresaHeaderHTML(await loadEmpresaHeader());
}

/**
 * Legacy support for older imports
 */
export function printHeader() {
  return `<div id="company-header-placeholder">Carregando cabeçalho...</div>
  <script>
    (async () => {
      // In a real print scenario, this would be pre-rendered server-side or 
      // the window would wait for this to load.
    })();
  </script>`;
}
