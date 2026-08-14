
CREATE OR REPLACE FUNCTION private.is_super_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id AND ur.role = 'super_admin'::app_role
  )
$$;
REVOKE ALL ON FUNCTION private.is_super_admin(uuid) FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Super-admins can manage system plans" ON public.system_plans;
CREATE POLICY "Super-admins can manage system plans" ON public.system_plans FOR ALL TO authenticated
  USING (private.is_super_admin(auth.uid()))
  WITH CHECK (private.is_super_admin(auth.uid()));
CREATE POLICY "Signed-in users can read system plans" ON public.system_plans FOR SELECT TO authenticated
  USING (ativo IS TRUE);

DROP POLICY IF EXISTS "Admins can manage tenants" ON public.tenants;
CREATE POLICY "Admins can manage tenants" ON public.tenants FOR ALL TO authenticated
  USING (private.is_super_admin(auth.uid())
     OR (private.has_role(auth.uid(), 'admin') AND id = private.current_tenant_id()))
  WITH CHECK (private.is_super_admin(auth.uid())
     OR (private.has_role(auth.uid(), 'admin') AND id = private.current_tenant_id()));

-- protege o papel mestre contra remoção/alteração
CREATE OR REPLACE FUNCTION public.protect_super_admin_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.role = 'super_admin'::app_role THEN
    RAISE EXCEPTION 'O papel de mestre do sistema não pode ser alterado ou removido';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.protect_super_admin_role() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_protect_super_admin ON public.user_roles;
CREATE TRIGGER trg_protect_super_admin
  BEFORE UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.protect_super_admin_role();
