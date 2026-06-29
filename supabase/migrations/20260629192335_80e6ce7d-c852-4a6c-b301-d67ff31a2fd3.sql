ALTER TABLE public.associados
  ADD COLUMN IF NOT EXISTS forma_pagamento TEXT CHECK (forma_pagamento IN ('boleto','carne','escritorio','cobrador')),
  ADD COLUMN IF NOT EXISTS cobrador_id UUID REFERENCES public.cobradores(id) ON DELETE SET NULL;