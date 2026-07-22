ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'agente';
ALTER TABLE public.servicos_funerarios ADD COLUMN IF NOT EXISTS os_arquivos JSONB NOT NULL DEFAULT '[]'::jsonb;