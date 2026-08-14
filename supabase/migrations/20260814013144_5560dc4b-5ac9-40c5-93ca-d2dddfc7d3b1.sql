-- Adicionar campos de expiração e periodicidade para o SaaS
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz DEFAULT (now() + interval '30 days');
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- Adicionar suporte a periodicidade nos planos
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'plan_period') THEN
        CREATE TYPE public.plan_period AS ENUM ('mensal', 'semestral', 'anual');
    END IF;
END $$;

ALTER TABLE public.system_plans ADD COLUMN IF NOT EXISTS periodo public.plan_period DEFAULT 'mensal';
ALTER TABLE public.system_plans ADD COLUMN IF NOT EXISTS preco_semestral numeric;
ALTER TABLE public.system_plans ADD COLUMN IF NOT EXISTS preco_anual numeric;

-- Garantir que a Matriz nunca expire
UPDATE public.tenants 
SET trial_ends_at = NULL, expires_at = NULL, plan_status = 'active'
WHERE id = '00000000-0000-0000-0000-000000000000';

-- Grants necessários
GRANT SELECT, UPDATE ON public.tenants TO authenticated;
GRANT SELECT ON public.system_plans TO authenticated;
