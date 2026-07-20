import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Configuracoes = {
  nome_sistema: string;
  subtitulo: string | null;
  logo_url: string | null;
  google_maps_browser_key?: string | null;
  google_maps_tracking_id?: string | null;
};

const DEFAULT: Configuracoes = { nome_sistema: "Memorial", subtitulo: "Gestão de Planos", logo_url: null };
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
  const { data } = await supabase
    .from("configuracoes")
    .select("nome_sistema, subtitulo, logo_url, google_maps_browser_key, google_maps_tracking_id")
    .eq("id", 1)
    .maybeSingle();
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
