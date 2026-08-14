-- 1. Tornar tenant_id opcional temporariamente nas tabelas
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
        EXECUTE format('ALTER TABLE public.%I ALTER COLUMN tenant_id DROP NOT NULL', t);
    END LOOP;
END $$;

-- 2. Criar função para preenchimento automático do tenant_id
CREATE OR REPLACE FUNCTION public.set_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tenant_id IS NULL THEN
        SELECT tenant_id INTO NEW.tenant_id FROM public.profiles WHERE id = auth.uid();
    END IF;
    
    -- Se ainda for nulo (ex: insert via service_role ou usuário sem perfil), 
    -- não faz nada e deixa o banco validar se pode ser nulo ou não.
    -- Para segurança, podemos definir um default se for nulo e for um insert de usuário.
    IF NEW.tenant_id IS NULL AND auth.uid() IS NOT NULL THEN
        -- Tentar pegar o tenant da matriz como fallback seguro? 
        -- Ou apenas deixar falhar se for NOT NULL futuramente.
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Aplicar a trigger em todas as tabelas
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
        EXECUTE format('DROP TRIGGER IF EXISTS tr_set_tenant_id ON public.%I', t);
        EXECUTE format('CREATE TRIGGER tr_set_tenant_id BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id()', t);
    END LOOP;
END $$;
