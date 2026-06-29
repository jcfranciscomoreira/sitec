
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.configuracoes (
  id smallint PRIMARY KEY DEFAULT 1,
  nome_sistema text NOT NULL DEFAULT 'Memorial',
  subtitulo text,
  logo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT configuracoes_singleton CHECK (id = 1)
);

GRANT SELECT ON public.configuracoes TO anon, authenticated;
GRANT ALL ON public.configuracoes TO service_role;

ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Configuracoes leitura publica"
ON public.configuracoes FOR SELECT USING (true);

CREATE POLICY "Configuracoes admin update"
ON public.configuracoes FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Configuracoes admin insert"
ON public.configuracoes FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_configuracoes_updated_at
BEFORE UPDATE ON public.configuracoes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.configuracoes (id, nome_sistema, subtitulo)
VALUES (1, 'Memorial', 'Gestão de Planos')
ON CONFLICT (id) DO NOTHING;
