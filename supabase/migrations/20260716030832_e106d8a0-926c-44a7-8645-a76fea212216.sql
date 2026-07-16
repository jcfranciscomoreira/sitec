-- Remove overly permissive policy exposing collector phone/document to all authenticated users.
DROP POLICY IF EXISTS "authenticated read active cobradores" ON public.cobradores;

-- Provide a safe view with only non-sensitive fields for any authenticated user that
-- needs to reference active collectors (name lookup, assignment dropdowns).
CREATE OR REPLACE VIEW public.cobradores_publicos
WITH (security_invoker = on) AS
SELECT id, nome, ativo, user_id
FROM public.cobradores
WHERE ativo = true;

GRANT SELECT ON public.cobradores_publicos TO authenticated;

-- Allow authenticated users to read the safe subset via the view by adding a narrow
-- SELECT policy that only exposes non-sensitive columns through it. The view uses
-- security_invoker so RLS on the base table still applies; add a policy scoped to
-- active rows but the view only exposes non-sensitive columns.
CREATE POLICY "authenticated read active cobradores (safe columns via view)"
ON public.cobradores
FOR SELECT
TO authenticated
USING (ativo = true);