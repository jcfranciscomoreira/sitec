
DROP POLICY IF EXISTS "auth manage stages" ON public.crm_stages;
CREATE POLICY "staff insert stages" ON public.crm_stages FOR INSERT TO authenticated WITH CHECK (private.is_staff(auth.uid()));
CREATE POLICY "staff update stages" ON public.crm_stages FOR UPDATE TO authenticated USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));
CREATE POLICY "staff delete stages" ON public.crm_stages FOR DELETE TO authenticated USING (private.is_staff(auth.uid()));
