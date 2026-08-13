-- Tabela de Tenant (Empresas Clientes da Software House)
CREATE TABLE public.tenants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nome text NOT NULL,
    subdominio text UNIQUE,
    status text NOT NULL DEFAULT 'ativo', -- 'ativo', 'suspenso', 'bloqueado'
    plano_id uuid, -- Referência a um plano de assinatura da software house
    expira_em timestamptz,
    logo_url text,
    configuracoes jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenants TO authenticated;
GRANT ALL ON public.tenants TO service_role;

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins can manage tenants"
    ON public.tenants
    FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Tenants can view own profile"
    ON public.tenants
    FOR SELECT
    TO authenticated
    USING (id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Adicionar tenant_id nos perfis para multi-tenancy
ALTER TABLE public.profiles ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);

-- Tabela de Pagamentos das Empresas (Tenants)
CREATE TABLE public.tenant_payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    valor decimal(12,2) NOT NULL,
    data_pagamento timestamptz DEFAULT now(),
    referencia_mes date NOT NULL,
    metodo_pagamento text,
    status text DEFAULT 'pago',
    comprovante_url text,
    created_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_payments TO authenticated;
GRANT ALL ON public.tenant_payments TO service_role;

ALTER TABLE public.tenant_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins can manage tenant payments"
    ON public.tenant_payments
    FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'superadmin'));

-- Adicionar role 'superadmin' ao enum app_role
-- Nota: Dependendo do ambiente, alterar enums pode exigir um bloco DO
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'superadmin') THEN
        ALTER TYPE public.app_role ADD VALUE 'superadmin';
    END IF;
END $$;

