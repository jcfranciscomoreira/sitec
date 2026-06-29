ALTER TABLE public.dependentes
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inativo','falecido')),
  ADD COLUMN IF NOT EXISTS data_falecimento DATE;