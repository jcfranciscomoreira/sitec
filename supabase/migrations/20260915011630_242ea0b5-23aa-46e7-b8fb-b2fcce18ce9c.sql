DROP POLICY IF EXISTS "planos_admin_write" ON public.planos;
CREATE POLICY "planos_admin_write" ON public.planos FOR ALL TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "admin manage permissions" ON public.role_permissions;
CREATE POLICY "admin manage permissions" ON public.role_permissions FOR ALL TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "admin read permissions" ON public.role_permissions;
CREATE POLICY "admin read permissions" ON public.role_permissions FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "admin manage user_permissions" ON public.user_permissions;
CREATE POLICY "admin manage user_permissions" ON public.user_permissions FOR ALL TO authenticated
USING (private.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));