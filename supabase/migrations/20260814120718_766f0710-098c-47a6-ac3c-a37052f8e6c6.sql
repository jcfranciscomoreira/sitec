DO $$
DECLARE t record;
BEGIN
  FOR t IN
    SELECT c.relname AS tbl
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS super_admin_full_access ON public.%I', t.tbl);
    EXECUTE format(
      'CREATE POLICY super_admin_full_access ON public.%I AS PERMISSIVE FOR ALL TO authenticated USING (private.is_super_admin(auth.uid())) WITH CHECK (private.is_super_admin(auth.uid()))',
      t.tbl
    );
  END LOOP;
END $$;