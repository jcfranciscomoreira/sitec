ALTER TABLE public.associados DROP CONSTRAINT associados_forma_pagamento_check;
ALTER TABLE public.associados ADD CONSTRAINT associados_forma_pagamento_check
  CHECK (forma_pagamento IS NULL OR forma_pagamento = ANY (ARRAY['boleto','boleto_pix','pix','carne','escritorio','cobrador']));