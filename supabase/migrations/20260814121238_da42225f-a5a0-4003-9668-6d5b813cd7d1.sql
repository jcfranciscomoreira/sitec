
DO $$
DECLARE t text;
  scoped text[] := ARRAY['associados','baixa_sessoes','caixa_movimentos','caixa_sessoes','cobradores','configuracoes','contas_financeiras','crm_leads','crm_stages','dependentes','estoque_itens','estoque_movimentos','filiais','integracao_bancaria','logs_auditoria','mensalidades','planos','profiles','recebimentos_pendentes','servicos_funerarios','servicos_produtos','vendas_pins','user_roles'];
BEGIN
  FOREACH t IN ARRAY scoped LOOP
    EXECUTE format('DROP POLICY IF EXISTS super_admin_full_access ON public.%I', t);
    EXECUTE format($f$CREATE POLICY super_admin_full_access ON public.%I AS PERMISSIVE FOR ALL TO authenticated
      USING (private.is_super_admin(auth.uid()) AND tenant_id = private.current_tenant_id())
      WITH CHECK (private.is_super_admin(auth.uid()) AND tenant_id = private.current_tenant_id())$f$, t);
  END LOOP;
END $$;

-- Sub-tabelas de serviços: escopo pelo serviço pai da mesma empresa
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['servico_checklist','servico_financeiro','servico_timeline'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS super_admin_full_access ON public.%I', t);
    EXECUTE format($f$CREATE POLICY super_admin_full_access ON public.%I AS PERMISSIVE FOR ALL TO authenticated
      USING (private.is_super_admin(auth.uid()) AND EXISTS (SELECT 1 FROM public.servicos_funerarios s WHERE s.id = %I.servico_id AND s.tenant_id = private.current_tenant_id()))
      WITH CHECK (private.is_super_admin(auth.uid()) AND EXISTS (SELECT 1 FROM public.servicos_funerarios s WHERE s.id = %I.servico_id AND s.tenant_id = private.current_tenant_id()))$f$, t, t, t);
  END LOOP;
END $$;

-- Tabelas sem tenant_id e não relacionadas ao painel SaaS: remover bypass global
DROP POLICY IF EXISTS super_admin_full_access ON public.backup_config;
DROP POLICY IF EXISTS super_admin_full_access ON public.backup_logs;
DROP POLICY IF EXISTS super_admin_full_access ON public.webhook_logs;
DROP POLICY IF EXISTS super_admin_full_access ON public.role_permissions;
DROP POLICY IF EXISTS super_admin_full_access ON public.user_permissions;
