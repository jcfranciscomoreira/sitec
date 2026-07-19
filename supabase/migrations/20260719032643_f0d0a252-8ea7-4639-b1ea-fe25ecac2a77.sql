
CREATE TABLE public.filiais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  codigo TEXT,
  cidade TEXT,
  estado TEXT,
  endereco TEXT,
  telefone TEXT,
  responsavel TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.filiais TO authenticated;
GRANT ALL ON public.filiais TO service_role;

ALTER TABLE public.filiais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read filiais" ON public.filiais FOR SELECT TO authenticated USING (private.is_staff(auth.uid()));
CREATE POLICY "filiais_staff_all" ON public.filiais FOR ALL USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));

CREATE TRIGGER filiais_touch_updated_at BEFORE UPDATE ON public.filiais FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.associados ADD COLUMN filial_id UUID REFERENCES public.filiais(id) ON DELETE SET NULL;
ALTER TABLE public.contas_financeiras ADD COLUMN filial_id UUID REFERENCES public.filiais(id) ON DELETE SET NULL;

CREATE INDEX idx_associados_filial_id ON public.associados(filial_id);
CREATE INDEX idx_contas_financeiras_filial_id ON public.contas_financeiras(filial_id);
