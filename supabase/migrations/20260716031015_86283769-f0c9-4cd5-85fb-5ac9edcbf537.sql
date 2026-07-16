-- Drop the just-added policy and column-level grants; simplify to staff-only reads.
DROP POLICY IF EXISTS "authenticated read active cobradores (safe cols)" ON public.cobradores;

-- Reset table privileges: staff paths are gated by RLS on the base table.
REVOKE ALL ON public.cobradores FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cobradores TO authenticated;
GRANT ALL ON public.cobradores TO service_role;

-- Existing policies remain:
--   * "Staff can read cobradores" (SELECT, is_staff)
--   * "staff manage cobradores" (ALL, is_staff)
-- Non-staff authenticated users cannot read cobradores rows anymore.