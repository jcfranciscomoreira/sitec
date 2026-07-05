
DROP POLICY IF EXISTS "auth read crm_leads" ON public.crm_leads;
DROP POLICY IF EXISTS "auth insert crm_leads" ON public.crm_leads;
DROP POLICY IF EXISTS "auth update crm_leads" ON public.crm_leads;

CREATE POLICY "staff read crm_leads" ON public.crm_leads
  FOR SELECT USING (private.is_staff(auth.uid()));
CREATE POLICY "staff insert crm_leads" ON public.crm_leads
  FOR INSERT WITH CHECK (private.is_staff(auth.uid()));
CREATE POLICY "staff update crm_leads" ON public.crm_leads
  FOR UPDATE USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));

CREATE POLICY "admin read permissions" ON public.role_permissions
  FOR SELECT USING (private.has_role(auth.uid(), 'admin'::app_role));
