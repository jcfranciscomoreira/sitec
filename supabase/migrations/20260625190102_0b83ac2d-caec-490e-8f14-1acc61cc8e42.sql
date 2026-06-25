
-- Helper: admin or operador
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','operador'))
$$;

REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;

-- associados
DROP POLICY IF EXISTS associados_read ON public.associados;
DROP POLICY IF EXISTS associados_write ON public.associados;
CREATE POLICY associados_staff_all ON public.associados FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- dependentes
DROP POLICY IF EXISTS dependentes_all ON public.dependentes;
CREATE POLICY dependentes_staff_all ON public.dependentes FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- mensalidades
DROP POLICY IF EXISTS mensalidades_all ON public.mensalidades;
CREATE POLICY mensalidades_staff_all ON public.mensalidades FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- contas_financeiras
DROP POLICY IF EXISTS contas_financeiras_all ON public.contas_financeiras;
CREATE POLICY contas_financeiras_staff_all ON public.contas_financeiras FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- centros_custo
DROP POLICY IF EXISTS centros_custo_all ON public.centros_custo;
CREATE POLICY centros_custo_staff_all ON public.centros_custo FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- profiles
DROP POLICY IF EXISTS profiles_select_auth ON public.profiles;
CREATE POLICY profiles_select_own_or_admin ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

-- Lock down trigger functions: only the table owner (postgres) runs them
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
-- has_role is used inside RLS expressions, so authenticated needs EXECUTE; revoke from anon
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
