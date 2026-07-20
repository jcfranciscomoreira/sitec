GRANT SELECT ON public.associados TO authenticated;
-- The existing policy might already cover it, but let's ensure it's broad enough for SELECT.
-- Actually, the existing policies are:
-- "Staff can read associados" (admin/operador)
-- "associados_cobrador_read" (cobrador restricted)
-- I will add a general read policy for all authenticated users to facilitate the funeral service search.
DROP POLICY IF EXISTS "Allow authenticated to select associados" ON public.associados;
CREATE POLICY "Allow authenticated to select associados" ON public.associados FOR SELECT TO authenticated USING (true);
