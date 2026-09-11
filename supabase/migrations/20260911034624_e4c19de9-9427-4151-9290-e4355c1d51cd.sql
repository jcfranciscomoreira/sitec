ALTER TABLE public.configuracoes DROP CONSTRAINT IF EXISTS configuracoes_singleton;

CREATE SEQUENCE IF NOT EXISTS public.configuracoes_id_seq AS smallint;
ALTER SEQUENCE public.configuracoes_id_seq OWNED BY public.configuracoes.id;
ALTER TABLE public.configuracoes ALTER COLUMN id SET DEFAULT nextval('public.configuracoes_id_seq');
SELECT setval('public.configuracoes_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM public.configuracoes), 1), 1), true);

CREATE UNIQUE INDEX IF NOT EXISTS configuracoes_tenant_id_key
ON public.configuracoes (tenant_id)
WHERE tenant_id IS NOT NULL;

UPDATE public.configuracoes
SET tenant_id = '00000000-0000-0000-0000-000000000000'::uuid
WHERE id = 1 AND tenant_id IS NULL;

GRANT USAGE, SELECT ON SEQUENCE public.configuracoes_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.configuracoes_id_seq TO service_role;