
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION private.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','operador'));
$$;

REVOKE EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.is_staff(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_staff(uuid) TO authenticated;

-- Recreate policies using private.* helpers
DROP POLICY IF EXISTS user_roles_select_own_or_admin ON public.user_roles;
DROP POLICY IF EXISTS user_roles_admin_manage ON public.user_roles;
CREATE POLICY user_roles_select_own_or_admin ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'));
CREATE POLICY user_roles_admin_manage ON public.user_roles FOR ALL USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS planos_admin_write ON public.planos;
CREATE POLICY planos_admin_write ON public.planos FOR ALL USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS associados_staff_all ON public.associados;
CREATE POLICY associados_staff_all ON public.associados FOR ALL USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));

DROP POLICY IF EXISTS dependentes_staff_all ON public.dependentes;
CREATE POLICY dependentes_staff_all ON public.dependentes FOR ALL USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));

DROP POLICY IF EXISTS mensalidades_staff_all ON public.mensalidades;
CREATE POLICY mensalidades_staff_all ON public.mensalidades FOR ALL USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));

DROP POLICY IF EXISTS contas_financeiras_staff_all ON public.contas_financeiras;
CREATE POLICY contas_financeiras_staff_all ON public.contas_financeiras FOR ALL USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));

DROP POLICY IF EXISTS centros_custo_staff_all ON public.centros_custo;
CREATE POLICY centros_custo_staff_all ON public.centros_custo FOR ALL USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));

DROP POLICY IF EXISTS profiles_select_own_or_admin ON public.profiles;
CREATE POLICY profiles_select_own_or_admin ON public.profiles FOR SELECT USING (auth.uid() = id OR private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS staff_all_baixa_sessoes ON public.baixa_sessoes;
CREATE POLICY staff_all_baixa_sessoes ON public.baixa_sessoes FOR ALL USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));

DROP POLICY IF EXISTS "staff manage cobradores" ON public.cobradores;
CREATE POLICY "staff manage cobradores" ON public.cobradores FOR ALL USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));

DROP POLICY IF EXISTS vendedor_select_own_or_staff ON public.vendas_pins;
DROP POLICY IF EXISTS vendedor_update_own_or_staff ON public.vendas_pins;
DROP POLICY IF EXISTS vendedor_delete_own_or_staff ON public.vendas_pins;
CREATE POLICY vendedor_select_own_or_staff ON public.vendas_pins FOR SELECT USING (vendedor_id = auth.uid() OR private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'operador'));
CREATE POLICY vendedor_update_own_or_staff ON public.vendas_pins FOR UPDATE USING (vendedor_id = auth.uid() OR private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'operador'));
CREATE POLICY vendedor_delete_own_or_staff ON public.vendas_pins FOR DELETE USING (vendedor_id = auth.uid() OR private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'operador'));

DROP POLICY IF EXISTS "Configuracoes admin update" ON public.configuracoes;
DROP POLICY IF EXISTS "Configuracoes admin insert" ON public.configuracoes;
CREATE POLICY "Configuracoes admin update" ON public.configuracoes FOR UPDATE USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Configuracoes admin insert" ON public.configuracoes FOR INSERT WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "staff manages recebimentos_pendentes" ON public.recebimentos_pendentes;
CREATE POLICY "staff manages recebimentos_pendentes" ON public.recebimentos_pendentes FOR ALL USING (private.is_staff(auth.uid()) OR created_by = auth.uid()) WITH CHECK (private.is_staff(auth.uid()) OR created_by = auth.uid());

DROP POLICY IF EXISTS "admin manage permissions" ON public.role_permissions;
CREATE POLICY "admin manage permissions" ON public.role_permissions FOR ALL USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admin manage user_permissions" ON public.user_permissions;
CREATE POLICY "admin manage user_permissions" ON public.user_permissions FOR ALL USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));

-- Now drop the public helpers (no longer referenced)
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
DROP FUNCTION IF EXISTS public.is_staff(uuid);
