ALTER TABLE public.mensalidades
  ADD COLUMN IF NOT EXISTS bonificada boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bonificacao_motivo text,
  ADD COLUMN IF NOT EXISTS bonificado_por uuid,
  ADD COLUMN IF NOT EXISTS bonificado_por_nome text,
  ADD COLUMN IF NOT EXISTS bonificado_em timestamptz;

CREATE INDEX IF NOT EXISTS idx_mensalidades_bonificada ON public.mensalidades (bonificada) WHERE bonificada;