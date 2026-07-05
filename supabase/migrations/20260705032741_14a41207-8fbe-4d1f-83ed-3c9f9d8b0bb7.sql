
CREATE TABLE public.integracao_bancaria (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provedor TEXT NOT NULL,
  ambiente TEXT NOT NULL DEFAULT 'sandbox' CHECK (ambiente IN ('sandbox','producao')),
  ativo BOOLEAN NOT NULL DEFAULT false,
  config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  webhook_secret TEXT,
  secret_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provedor)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.integracao_bancaria TO authenticated;
GRANT ALL ON public.integracao_bancaria TO service_role;
ALTER TABLE public.integracao_bancaria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_integracao" ON public.integracao_bancaria FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (private.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "operador_read_integracao" ON public.integracao_bancaria FOR SELECT TO authenticated
  USING (true);
CREATE TRIGGER trg_integ_updated BEFORE UPDATE ON public.integracao_bancaria
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.webhook_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provedor TEXT NOT NULL,
  evento TEXT,
  payload JSONB NOT NULL,
  processado BOOLEAN NOT NULL DEFAULT false,
  erro TEXT,
  mensalidade_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.webhook_logs TO authenticated;
GRANT ALL ON public.webhook_logs TO service_role;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_read_webhook_logs" ON public.webhook_logs FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(),'admin'::app_role));

ALTER TABLE public.mensalidades
  ADD COLUMN IF NOT EXISTS cobranca_id TEXT,
  ADD COLUMN IF NOT EXISTS cobranca_provedor TEXT,
  ADD COLUMN IF NOT EXISTS linha_digitavel TEXT,
  ADD COLUMN IF NOT EXISTS codigo_barras TEXT,
  ADD COLUMN IF NOT EXISTS pix_copia_cola TEXT,
  ADD COLUMN IF NOT EXISTS qr_code_base64 TEXT,
  ADD COLUMN IF NOT EXISTS link_boleto TEXT,
  ADD COLUMN IF NOT EXISTS cobranca_status TEXT;

CREATE INDEX IF NOT EXISTS idx_mensalidades_cobranca_id ON public.mensalidades(cobranca_id);
