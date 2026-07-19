ALTER TABLE public.configuracoes 
  ADD COLUMN IF NOT EXISTS carteirinha_config jsonb,
  ADD COLUMN IF NOT EXISTS contrato_template text;