
-- helpers
CREATE OR REPLACE FUNCTION private.current_tenant_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION private.is_super_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles p
    WHERE p.id = _user_id AND p.tenant_id = '00000000-0000-0000-0000-000000000000'::uuid)
$$;

REVOKE ALL ON FUNCTION private.current_tenant_id() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.is_super_admin(uuid) FROM PUBLIC, anon, authenticated;

-- 0028/0029: definer functions must not be callable from the exposed API
REVOKE ALL ON FUNCTION public.has_active_subscription(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.registrar_log_auditoria() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_tenant_id() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;

-- ============ tenant columns for tables that lacked them ============
ALTER TABLE public.baixa_sessoes ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
UPDATE public.baixa_sessoes b SET tenant_id = p.tenant_id
  FROM public.profiles p WHERE p.id = b.responsavel_id AND b.tenant_id IS NULL;
DROP TRIGGER IF EXISTS tr_set_tenant_id ON public.baixa_sessoes;
CREATE TRIGGER tr_set_tenant_id BEFORE INSERT ON public.baixa_sessoes
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

ALTER TABLE public.crm_stages ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);
ALTER TABLE public.crm_stages DROP CONSTRAINT IF EXISTS crm_stages_key_key;
UPDATE public.crm_stages SET tenant_id = '00000000-0000-0000-0000-000000000000'::uuid WHERE tenant_id IS NULL;
INSERT INTO public.crm_stages (key, label, color, ordem, tenant_id)
SELECT s.key, s.label, s.color, s.ordem, t.id
FROM public.crm_stages s
CROSS JOIN public.tenants t
WHERE s.tenant_id = '00000000-0000-0000-0000-000000000000'::uuid
  AND t.id <> '00000000-0000-0000-0000-000000000000'::uuid;
CREATE UNIQUE INDEX IF NOT EXISTS crm_stages_tenant_key_uidx ON public.crm_stages (tenant_id, key);
DROP TRIGGER IF EXISTS tr_set_tenant_id ON public.crm_stages;
CREATE TRIGGER tr_set_tenant_id BEFORE INSERT ON public.crm_stages
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

-- ============ staff policies: add tenant scoping ============
DROP POLICY IF EXISTS "Staff can read associados" ON public.associados;
DROP POLICY IF EXISTS "associados_staff_all" ON public.associados;
CREATE POLICY "associados_staff_all" ON public.associados FOR ALL TO authenticated
  USING (private.is_staff(auth.uid()) AND tenant_id = private.current_tenant_id())
  WITH CHECK (private.is_staff(auth.uid()) AND tenant_id = private.current_tenant_id());

DROP POLICY IF EXISTS "Staff can read baixa_sessoes" ON public.baixa_sessoes;
DROP POLICY IF EXISTS "staff_all_baixa_sessoes" ON public.baixa_sessoes;
CREATE POLICY "staff_all_baixa_sessoes" ON public.baixa_sessoes FOR ALL TO authenticated
  USING (private.is_staff(auth.uid()) AND tenant_id = private.current_tenant_id())
  WITH CHECK (private.is_staff(auth.uid()) AND tenant_id = private.current_tenant_id());

DROP POLICY IF EXISTS "staff insert caixa_movimentos" ON public.caixa_movimentos;
DROP POLICY IF EXISTS "staff read caixa_movimentos" ON public.caixa_movimentos;
DROP POLICY IF EXISTS "staff update caixa_movimentos" ON public.caixa_movimentos;
CREATE POLICY "staff manage caixa_movimentos" ON public.caixa_movimentos FOR ALL TO authenticated
  USING (private.is_staff(auth.uid()) AND tenant_id = private.current_tenant_id())
  WITH CHECK (private.is_staff(auth.uid()) AND tenant_id = private.current_tenant_id());

DROP POLICY IF EXISTS "staff insert caixa_sessoes" ON public.caixa_sessoes;
DROP POLICY IF EXISTS "staff read caixa_sessoes" ON public.caixa_sessoes;
DROP POLICY IF EXISTS "staff update caixa_sessoes" ON public.caixa_sessoes;
CREATE POLICY "staff manage caixa_sessoes" ON public.caixa_sessoes FOR ALL TO authenticated
  USING (private.is_staff(auth.uid()) AND tenant_id = private.current_tenant_id())
  WITH CHECK (private.is_staff(auth.uid()) AND tenant_id = private.current_tenant_id());

DROP POLICY IF EXISTS "Staff can read cobradores" ON public.cobradores;
DROP POLICY IF EXISTS "staff manage cobradores" ON public.cobradores;
CREATE POLICY "staff manage cobradores" ON public.cobradores FOR ALL TO authenticated
  USING (private.is_staff(auth.uid()) AND tenant_id = private.current_tenant_id())
  WITH CHECK (private.is_staff(auth.uid()) AND tenant_id = private.current_tenant_id());

DROP POLICY IF EXISTS "Staff can read configuracoes" ON public.configuracoes;
DROP POLICY IF EXISTS "Configuracoes admin insert" ON public.configuracoes;
DROP POLICY IF EXISTS "Configuracoes admin update" ON public.configuracoes;
CREATE POLICY "Staff can read configuracoes" ON public.configuracoes FOR SELECT TO authenticated
  USING (private.is_staff(auth.uid()) AND tenant_id = private.current_tenant_id());
CREATE POLICY "Configuracoes admin insert" ON public.configuracoes FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin') AND tenant_id = private.current_tenant_id());
CREATE POLICY "Configuracoes admin update" ON public.configuracoes FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin') AND tenant_id = private.current_tenant_id())
  WITH CHECK (private.has_role(auth.uid(), 'admin') AND tenant_id = private.current_tenant_id());

DROP POLICY IF EXISTS "Staff can read contas_financeiras" ON public.contas_financeiras;
DROP POLICY IF EXISTS "contas_financeiras_staff_all" ON public.contas_financeiras;
CREATE POLICY "contas_financeiras_staff_all" ON public.contas_financeiras FOR ALL TO authenticated
  USING (private.is_staff(auth.uid()) AND tenant_id = private.current_tenant_id())
  WITH CHECK (private.is_staff(auth.uid()) AND tenant_id = private.current_tenant_id());

DROP POLICY IF EXISTS "staff delete crm_leads" ON public.crm_leads;
DROP POLICY IF EXISTS "staff insert crm_leads" ON public.crm_leads;
DROP POLICY IF EXISTS "staff read crm_leads" ON public.crm_leads;
DROP POLICY IF EXISTS "staff update crm_leads" ON public.crm_leads;
CREATE POLICY "staff manage crm_leads" ON public.crm_leads FOR ALL TO authenticated
  USING (private.is_staff(auth.uid()) AND tenant_id = private.current_tenant_id())
  WITH CHECK (private.is_staff(auth.uid()) AND tenant_id = private.current_tenant_id());

DROP POLICY IF EXISTS "staff delete stages" ON public.crm_stages;
DROP POLICY IF EXISTS "staff insert stages" ON public.crm_stages;
DROP POLICY IF EXISTS "staff read stages" ON public.crm_stages;
DROP POLICY IF EXISTS "staff update stages" ON public.crm_stages;
CREATE POLICY "staff manage stages" ON public.crm_stages FOR ALL TO authenticated
  USING (private.is_staff(auth.uid()) AND tenant_id = private.current_tenant_id())
  WITH CHECK (private.is_staff(auth.uid()) AND tenant_id = private.current_tenant_id());

DROP POLICY IF EXISTS "Staff can read dependentes" ON public.dependentes;
DROP POLICY IF EXISTS "dependentes_staff_all" ON public.dependentes;
CREATE POLICY "dependentes_staff_all" ON public.dependentes FOR ALL TO authenticated
  USING (private.is_staff(auth.uid()) AND tenant_id = private.current_tenant_id())
  WITH CHECK (private.is_staff(auth.uid()) AND tenant_id = private.current_tenant_id());

DROP POLICY IF EXISTS "estoque_itens_staff_all" ON public.estoque_itens;
CREATE POLICY "estoque_itens_staff_all" ON public.estoque_itens FOR ALL TO authenticated
  USING (private.is_staff(auth.uid()) AND tenant_id = private.current_tenant_id())
  WITH CHECK (private.is_staff(auth.uid()) AND tenant_id = private.current_tenant_id());

DROP POLICY IF EXISTS "estoque_movimentos_staff_all" ON public.estoque_movimentos;
CREATE POLICY "estoque_movimentos_staff_all" ON public.estoque_movimentos FOR ALL TO authenticated
  USING (private.is_staff(auth.uid()) AND tenant_id = private.current_tenant_id())
  WITH CHECK (private.is_staff(auth.uid()) AND tenant_id = private.current_tenant_id());

DROP POLICY IF EXISTS "Staff can read filiais" ON public.filiais;
DROP POLICY IF EXISTS "filiais_staff_all" ON public.filiais;
CREATE POLICY "filiais_staff_all" ON public.filiais FOR ALL TO authenticated
  USING (private.is_staff(auth.uid()) AND tenant_id = private.current_tenant_id())
  WITH CHECK (private.is_staff(auth.uid()) AND tenant_id = private.current_tenant_id());

DROP POLICY IF EXISTS "Staff can read mensalidades" ON public.mensalidades;
DROP POLICY IF EXISTS "mensalidades_staff_all" ON public.mensalidades;
CREATE POLICY "mensalidades_staff_all" ON public.mensalidades FOR ALL TO authenticated
  USING (private.is_staff(auth.uid()) AND tenant_id = private.current_tenant_id())
  WITH CHECK (private.is_staff(auth.uid()) AND tenant_id = private.current_tenant_id());

DROP POLICY IF EXISTS "Staff can read recebimentos_pendentes" ON public.recebimentos_pendentes;
DROP POLICY IF EXISTS "recebimentos_pendentes_staff_delete" ON public.recebimentos_pendentes;
DROP POLICY IF EXISTS "recebimentos_pendentes_staff_insert" ON public.recebimentos_pendentes;
DROP POLICY IF EXISTS "recebimentos_pendentes_staff_update" ON public.recebimentos_pendentes;
CREATE POLICY "recebimentos_pendentes_staff_all" ON public.recebimentos_pendentes FOR ALL TO authenticated
  USING (private.is_staff(auth.uid()) AND tenant_id = private.current_tenant_id())
  WITH CHECK (private.is_staff(auth.uid()) AND tenant_id = private.current_tenant_id());

DROP POLICY IF EXISTS "Staff can manage servicos_funerarios" ON public.servicos_funerarios;
CREATE POLICY "Staff can manage servicos_funerarios" ON public.servicos_funerarios FOR ALL TO authenticated
  USING (private.is_staff(auth.uid()) AND tenant_id = private.current_tenant_id())
  WITH CHECK (private.is_staff(auth.uid()) AND tenant_id = private.current_tenant_id());

DROP POLICY IF EXISTS "Staff can delete servicos_produtos" ON public.servicos_produtos;
DROP POLICY IF EXISTS "Staff can insert servicos_produtos" ON public.servicos_produtos;
DROP POLICY IF EXISTS "Staff can update servicos_produtos" ON public.servicos_produtos;
DROP POLICY IF EXISTS "servicos_produtos_read_staff" ON public.servicos_produtos;
CREATE POLICY "servicos_produtos_staff_all" ON public.servicos_produtos FOR ALL TO authenticated
  USING (private.is_staff(auth.uid()) AND tenant_id = private.current_tenant_id())
  WITH CHECK (private.is_staff(auth.uid()) AND tenant_id = private.current_tenant_id());
CREATE POLICY "servicos_produtos_read_staff" ON public.servicos_produtos FOR SELECT TO authenticated
  USING ((private.is_staff(auth.uid()) OR private.has_role(auth.uid(), 'agente'))
         AND tenant_id = private.current_tenant_id());

DROP POLICY IF EXISTS "vendedor_delete_own_or_staff" ON public.vendas_pins;
DROP POLICY IF EXISTS "vendedor_select_own_or_staff" ON public.vendas_pins;
DROP POLICY IF EXISTS "vendedor_update_own_or_staff" ON public.vendas_pins;
CREATE POLICY "vendedor_select_own_or_staff" ON public.vendas_pins FOR SELECT TO authenticated
  USING (tenant_id = private.current_tenant_id()
         AND (vendedor_id = auth.uid() OR private.is_staff(auth.uid())));
CREATE POLICY "vendedor_update_own_or_staff" ON public.vendas_pins FOR UPDATE TO authenticated
  USING (tenant_id = private.current_tenant_id()
         AND (vendedor_id = auth.uid() OR private.is_staff(auth.uid())))
  WITH CHECK (tenant_id = private.current_tenant_id()
         AND (vendedor_id = auth.uid() OR private.is_staff(auth.uid())));
CREATE POLICY "vendedor_delete_own_or_staff" ON public.vendas_pins FOR DELETE TO authenticated
  USING (tenant_id = private.current_tenant_id()
         AND (vendedor_id = auth.uid() OR private.is_staff(auth.uid())));

-- ============ servico sub-tables: tenant via parent service ============
DROP POLICY IF EXISTS "Staff can manage servico_checklist" ON public.servico_checklist;
CREATE POLICY "Staff can manage servico_checklist" ON public.servico_checklist FOR ALL TO authenticated
  USING (private.is_staff(auth.uid()) AND EXISTS (
    SELECT 1 FROM public.servicos_funerarios s
    WHERE s.id = servico_id AND s.tenant_id = private.current_tenant_id()))
  WITH CHECK (private.is_staff(auth.uid()) AND EXISTS (
    SELECT 1 FROM public.servicos_funerarios s
    WHERE s.id = servico_id AND s.tenant_id = private.current_tenant_id()));

DROP POLICY IF EXISTS "Staff can manage servico_financeiro" ON public.servico_financeiro;
CREATE POLICY "Staff can manage servico_financeiro" ON public.servico_financeiro FOR ALL TO authenticated
  USING (private.is_staff(auth.uid()) AND EXISTS (
    SELECT 1 FROM public.servicos_funerarios s
    WHERE s.id = servico_id AND s.tenant_id = private.current_tenant_id()))
  WITH CHECK (private.is_staff(auth.uid()) AND EXISTS (
    SELECT 1 FROM public.servicos_funerarios s
    WHERE s.id = servico_id AND s.tenant_id = private.current_tenant_id()));

DROP POLICY IF EXISTS "Staff can manage servico_timeline" ON public.servico_timeline;
CREATE POLICY "Staff can manage servico_timeline" ON public.servico_timeline FOR ALL TO authenticated
  USING (private.is_staff(auth.uid()) AND EXISTS (
    SELECT 1 FROM public.servicos_funerarios s
    WHERE s.id = servico_id AND s.tenant_id = private.current_tenant_id()))
  WITH CHECK (private.is_staff(auth.uid()) AND EXISTS (
    SELECT 1 FROM public.servicos_funerarios s
    WHERE s.id = servico_id AND s.tenant_id = private.current_tenant_id()));

-- ============ admin checks: tenant scoped ============
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_select_own_or_admin" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id
    OR (private.has_role(auth.uid(), 'admin')
        AND (private.is_super_admin(auth.uid()) OR tenant_id = private.current_tenant_id())));

DROP POLICY IF EXISTS "user_roles_admin_manage" ON public.user_roles;
CREATE POLICY "user_roles_admin_manage" ON public.user_roles FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin')
    AND (private.is_super_admin(auth.uid()) OR tenant_id = private.current_tenant_id()))
  WITH CHECK (private.has_role(auth.uid(), 'admin')
    AND (private.is_super_admin(auth.uid()) OR tenant_id = private.current_tenant_id()));

DROP POLICY IF EXISTS "user_roles_select_own_or_admin" ON public.user_roles;
CREATE POLICY "user_roles_select_own_or_admin" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id
    OR (private.has_role(auth.uid(), 'admin')
        AND (private.is_super_admin(auth.uid()) OR tenant_id = private.current_tenant_id())));

DROP POLICY IF EXISTS "Admins can manage tenants" ON public.tenants;
CREATE POLICY "Admins can manage tenants" ON public.tenants FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin')
    AND (private.is_super_admin(auth.uid()) OR id = private.current_tenant_id()))
  WITH CHECK (private.has_role(auth.uid(), 'admin')
    AND (private.is_super_admin(auth.uid()) OR id = private.current_tenant_id()));
