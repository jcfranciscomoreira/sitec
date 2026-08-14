import { useEffect, useState } from "react";
import { getTenantConfig } from "@/lib/tenants.functions";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

export function useBranding() {
  const [config, setConfig] = useState<any>(null);
  const fetchConfig = useServerFn(getTenantConfig);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      try {
        const tenant = await fetchConfig();
        if (mounted && tenant) {
          setConfig(tenant);
          applyBranding(tenant);
        }
      } catch (error) {
        console.error("Erro ao carregar branding:", error);
      }
    }

    load();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') load();
      if (event === 'SIGNED_OUT') {
        setConfig(null);
        resetBranding();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  function applyBranding(tenant: any) {
    const root = document.documentElement;
    if (tenant.primary_color) {
      // Nota: O Tailwind v4 usa oklch por padrão, mas podemos injetar variáveis CSS
      // para sobrescrever cores semânticas se estiverem mapeadas para variáveis.
      // Como o projeto usa shadcn e Tailwind v4, vamos injetar variáveis compatíveis.
      
      // Se primary_color for hex, podemos converter para oklch ou apenas injetar --primary
      root.style.setProperty('--primary', tenant.primary_color);
    }
    
    // Atualizar o favicon e o título se necessário
    if (tenant.nome) {
      document.title = `${tenant.nome} — Nuvem Planos`;
    }
  }

  function resetBranding() {
    const root = document.documentElement;
    root.style.removeProperty('--primary');
    document.title = "Nuvem Planos";
  }

  return config;
}
