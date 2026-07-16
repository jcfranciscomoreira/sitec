-- Drop the security-definer view; use column-level privileges instead.
DROP VIEW IF EXISTS public.cobradores_publicos;

-- Revoke broad table privileges then re-grant only non-sensitive columns to authenticated.
REVOKE SELECT ON public.cobradores FROM authenticated;
GRANT SELECT (id, nome, ativo, user_id) ON public.cobradores TO authenticated;
-- Staff paths use service_role or the staff RLS policy (which requires table-level SELECT
-- via the postgres role for definer functions); keep full access for service_role.
GRANT ALL ON public.cobradores TO service_role;

-- Row-level policy: authenticated users may select active rows (columns already limited by GRANT).
CREATE POLICY "authenticated read active cobradores (safe cols)"
ON public.cobradores
FOR SELECT
TO authenticated
USING (ativo = true OR private.is_staff(auth.uid()));