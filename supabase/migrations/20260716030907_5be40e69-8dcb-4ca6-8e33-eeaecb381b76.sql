-- Recreate the safe view without security_invoker so it acts as a controlled gateway
-- exposing only non-sensitive collector columns. The base table RLS still protects
-- phone/document from direct queries.
DROP VIEW IF EXISTS public.cobradores_publicos;

CREATE VIEW public.cobradores_publicos AS
SELECT id, nome, ativo, user_id
FROM public.cobradores
WHERE ativo = true;

ALTER VIEW public.cobradores_publicos OWNER TO postgres;

GRANT SELECT ON public.cobradores_publicos TO authenticated;