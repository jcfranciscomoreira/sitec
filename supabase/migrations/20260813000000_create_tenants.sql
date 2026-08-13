CREATE TABLE public.tenants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nome text NOT NULL,
    dominio text UNIQUE,
    status text NOT NULL DEFAULT 'ativo',
    configuracoes jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenants TO authenticated;
GRANT ALL ON public.tenants TO service_role;

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage tenants"
ON public.tenants
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Inserir o tenant principal (matriz/sistema atual)
INSERT INTO public.tenants (id, nome, status) 
VALUES ('00000000-0000-0000-0000-000000000000', 'Matriz Nuvem Planos', 'ativo');

-- Adicionar coluna tenant_id em tabelas principais para multi-empresa futuro
-- Nota: Por enquanto apenas criamos a gestão, sem migrar os dados existentes para isolamento total, 
-- permitindo que o usuário comece a gerenciar as empresas que compram o acesso.

