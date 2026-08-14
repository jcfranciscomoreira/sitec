-- 1. Atualizar a tabela tenants com campos para Stripe e Personalização
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS stripe_customer_id text,
ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
ADD COLUMN IF NOT EXISTS plan_status text DEFAULT 'trialing',
ADD COLUMN IF NOT EXISTS logo_url text,
ADD COLUMN IF NOT EXISTS primary_color text DEFAULT '#1e3a5f',
ADD COLUMN IF NOT EXISTS secondary_color text DEFAULT '#d4af37',
ADD COLUMN IF NOT EXISTS subtitulo text;

-- 2. Adicionar tenant_id em profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

-- Vincular perfis existentes ao tenant Matriz
UPDATE public.profiles SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;

-- 3. Adicionar tenant_id nas tabelas operacionais e vincular à Matriz
DO $$
DECLARE
    t text;
    tables_to_update text[] := ARRAY[
        'associados', 'planos', 'dependentes', 'mensalidades', 'filiais', 
        'contas_financeiras', 'cobradores', 'caixa_sessoes', 'caixa_movimentos', 
        'servicos_funerarios', 'servicos_produtos', 'estoque_itens', 
        'estoque_movimentos', 'crm_leads', 'vendas_pins', 'recebimentos_pendentes',
        'configuracoes', 'integracao_bancaria', 'logs_auditoria'
    ];
BEGIN
    FOREACH t IN ARRAY tables_to_update LOOP
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id)', t);
        EXECUTE format('UPDATE public.%I SET tenant_id = ''00000000-0000-0000-0000-000000000000'' WHERE tenant_id IS NULL', t);
        EXECUTE format('ALTER TABLE public.%I ALTER COLUMN tenant_id SET NOT NULL', t);
        EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    END LOOP;
END $$;

-- 4. Atualizar RLS para filtrar por tenant_id
DO $$
DECLARE
    t text;
    tables_to_update text[] := ARRAY[
        'associados', 'planos', 'dependentes', 'mensalidades', 'filiais', 
        'contas_financeiras', 'cobradores', 'caixa_sessoes', 'caixa_movimentos', 
        'servicos_funerarios', 'servicos_produtos', 'estoque_itens', 
        'estoque_movimentos', 'crm_leads', 'vendas_pins', 'recebimentos_pendentes',
        'configuracoes', 'integracao_bancaria', 'logs_auditoria'
    ];
BEGIN
    FOREACH t IN ARRAY tables_to_update LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation" ON public.%I', t);
        EXECUTE format('CREATE POLICY "Tenant Isolation" ON public.%I AS PERMISSIVE FOR ALL TO authenticated USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()))', t);
    END LOOP;
END $$;

-- 5. Grant em tenants e profiles
GRANT SELECT ON public.tenants TO authenticated;
DROP POLICY IF EXISTS "Users can view their own tenant" ON public.tenants;
CREATE POLICY "Users can view their own tenant" ON public.tenants FOR SELECT TO authenticated USING (id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

GRANT SELECT, UPDATE ON public.profiles TO authenticated;
