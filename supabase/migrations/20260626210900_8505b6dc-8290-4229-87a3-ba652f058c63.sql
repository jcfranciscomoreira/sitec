
CREATE SEQUENCE IF NOT EXISTS public.mensalidades_codigo_seq START 1000;
ALTER TABLE public.mensalidades
  ADD COLUMN IF NOT EXISTS codigo BIGINT UNIQUE DEFAULT nextval('public.mensalidades_codigo_seq');
ALTER SEQUENCE public.mensalidades_codigo_seq OWNED BY public.mensalidades.codigo;
UPDATE public.mensalidades SET codigo = nextval('public.mensalidades_codigo_seq') WHERE codigo IS NULL;
ALTER TABLE public.mensalidades ALTER COLUMN codigo SET NOT NULL;
CREATE INDEX IF NOT EXISTS mensalidades_codigo_idx ON public.mensalidades(codigo);
