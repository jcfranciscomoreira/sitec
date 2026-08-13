-- Corrigindo a tabela tenants e as permissões de RLS
-- O erro anterior ocorreu porque a função has_role foi movida para o esquema 'private'

CREATE TABLE IF NOT EXISTS public.tenants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nome text NOT NULL,
    dominio text UNIQUE,
    status text NOT NULL DEFAULT 'ativo',
    configuracoes jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Garantir permissões para o Data API
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenants TO authenticated;
GRANT ALL ON public.tenants TO service_role;

-- Ativar RLS
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Criar política usando a função correta no esquema private
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Admins can manage tenants" ON public.tenants;
    
    -- Tenta usar private.has_role que é o padrão atual do projeto
    IF EXISTS (SELECT 1 FROM pg_proc n JOIN pg_namespace ns ON n.pronamespace = ns.oid WHERE ns.nspname = 'private' AND n.proname = 'has_role') THEN
        CREATE POLICY "Admins can manage tenants"
        ON public.tenants
        FOR ALL
        TO authenticated
        USING (private.has_role(auth.uid(), 'admin'));
    -- Fallback para public.has_role se private não existir (improvável dado o histórico)
    ELSIF EXISTS (SELECT 1 FROM pg_proc n JOIN pg_namespace ns ON n.pronamespace = ns.oid WHERE ns.nspname = 'public' AND n.proname = 'has_role') THEN
        CREATE POLICY "Admins can manage tenants"
        ON public.tenants
        FOR ALL
        TO authenticated
        USING (public.has_role(auth.uid(), 'admin'));
    END IF;
END $$;

-- Garantir que o tenant principal existe
INSERT INTO public.tenants (id, nome, status) 
VALUES ('00000000-0000-0000-0000-000000000000', 'Matriz Nuvem Planos', 'ativo')
ON CONFLICT (id) DO NOTHING;
