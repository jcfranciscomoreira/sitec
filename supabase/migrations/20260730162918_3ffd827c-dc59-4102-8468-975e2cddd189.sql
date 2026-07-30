CREATE TABLE public.backup_config (
  id smallint PRIMARY KEY DEFAULT 1,
  ativo boolean NOT NULL DEFAULT false,
  periodicidade text NOT NULL DEFAULT 'diario',
  hora smallint NOT NULL DEFAULT 3,
  dia_semana smallint NOT NULL DEFAULT 1,
  dia_mes smallint NOT NULL DEFAULT 1,
  alerta_email text,
  tabelas text[] NOT NULL DEFAULT '{}',
  ultima_execucao timestamptz,
  ultimo_status text,
  ultimo_erro text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT backup_config_singleton CHECK (id = 1),
  CONSTRAINT backup_config_periodicidade CHECK (periodicidade IN ('diario','semanal','mensal'))
);

GRANT SELECT, INSERT, UPDATE ON public.backup_config TO authenticated;
GRANT ALL ON public.backup_config TO service_role;
ALTER TABLE public.backup_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins gerenciam config de backup" ON public.backup_config
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER backup_config_updated_at BEFORE UPDATE ON public.backup_config
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.backup_config (id) VALUES (1);

CREATE TABLE public.backup_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  user_nome text,
  user_email text,
  acao text NOT NULL,
  formato text,
  origem text NOT NULL DEFAULT 'manual',
  tabelas text[] NOT NULL DEFAULT '{}',
  registros integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'sucesso',
  erro text,
  detalhes jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT backup_logs_acao CHECK (acao IN ('gerar','baixar','restaurar','automatico'))
);

GRANT SELECT ON public.backup_logs TO authenticated;
GRANT ALL ON public.backup_logs TO service_role;
ALTER TABLE public.backup_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins leem logs de backup" ON public.backup_logs
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX backup_logs_created_at_idx ON public.backup_logs (created_at DESC);