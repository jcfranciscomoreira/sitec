ALTER TABLE public.contas_financeiras DROP COLUMN IF EXISTS centro_custo_id;
DROP TABLE IF EXISTS public.centros_custo CASCADE;