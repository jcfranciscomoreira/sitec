import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Configuracoes = {
  nome_sistema: string;
  subtitulo: string | null;
  logo_url: string | null;
  google_maps_browser_key?: string | null;
  google_maps_tracking_id?: string | null;
};

const DEFAULT: Configuracoes = { nome_sistema: "Nuvem Planos", subtitulo: "Gestão de Planos", logo_url: null };
const STORAGE_KEY = "configuracoes_cache_v1";

function readStorage(): Configuracoes | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Configuracoes) : null;
  } catch { return null; }
}

function writeStorage(c: Configuracoes) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(c)); } catch { /* ignore */ }
}

let cache: Configuracoes | null = readStorage();
const listeners = new Set<(c: Configuracoes) => void>();

async function load() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return DEFAULT;

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  const query = supabase
    .from("configuracoes")
    .select("nome_sistema, subtitulo, logo_url, google_maps_browser_key, google_maps_tracking_id")
    .eq("id", 1);
  
  // Se for multi-tenant, buscar pelo tenant_id
  if (profile?.tenant_id && profile.tenant_id !== '00000000-0000-0000-0000-000000000000') {
    const { data: tenantConfig } = await supabase
      .from("configuracoes")
      .select("nome_sistema, subtitulo, logo_url, google_maps_browser_key, google_maps_tracking_id")
      .eq("tenant_id", profile.tenant_id)
      .maybeSingle();
    
    if (tenantConfig) {
      cache = tenantConfig as Configuracoes;
      writeStorage(cache);
      listeners.forEach((l) => l(cache!));
      return cache;
    }
  }

  const { data } = await query.maybeSingle();
  cache = (data as Configuracoes) ?? DEFAULT;
  writeStorage(cache);
  listeners.forEach((l) => l(cache!));
  return cache;
}

export function useConfiguracoes() {
  const [config, setConfig] = useState<Configuracoes>(cache ?? readStorage() ?? DEFAULT);
  useEffect(() => {
    listeners.add(setConfig);
    if (cache) setConfig(cache);
    load();
    return () => { listeners.delete(setConfig); };
  }, []);
  return { config, reload: load };
}

export function reloadConfiguracoes() { return load(); }

export function getCachedConfiguracoes(): Configuracoes | null {
  return cache ?? readStorage();
}
