CREATE TABLE public.cobradores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  telefone TEXT,
  documento TEXT,
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cobradores TO authenticated;
GRANT ALL ON public.cobradores TO service_role;
ALTER TABLE public.cobradores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage cobradores" ON public.cobradores FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER trg_cobradores_updated BEFORE UPDATE ON public.cobradores
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();