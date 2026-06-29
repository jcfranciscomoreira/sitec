import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Configuracoes = {
  nome_sistema: string;
  subtitulo: string | null;
  logo_url: string | null;
};

const DEFAULT: Configuracoes = { nome_sistema: "Memorial", subtitulo: "Gestão de Planos", logo_url: null };

let cache: Configuracoes | null = null;
const listeners = new Set<(c: Configuracoes) => void>();

async function load() {
  const { data } = await supabase
    .from("configuracoes")
    .select("nome_sistema, subtitulo, logo_url")
    .eq("id", 1)
    .maybeSingle();
  cache = (data as Configuracoes) ?? DEFAULT;
  listeners.forEach((l) => l(cache!));
  return cache;
}

export function useConfiguracoes() {
  const [config, setConfig] = useState<Configuracoes>(cache ?? DEFAULT);
  useEffect(() => {
    listeners.add(setConfig);
    if (!cache) load();
    return () => { listeners.delete(setConfig); };
  }, []);
  return { config, reload: load };
}

export function reloadConfiguracoes() { return load(); }
