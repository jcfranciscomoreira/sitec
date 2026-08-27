CREATE TABLE public.tenant_faturas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES public.system_plans(id),
  periodo public.plan_period NOT NULL DEFAULT 'mensal',
  valor numeric NOT NULL,
  vencimento date NOT NULL DEFAULT (now()::date + 3),
  status text NOT NULL DEFAULT 'pendente',
  data_pagamento date,
  cobranca_id text,
  cobranca_status text,
  link_boleto text,
  linha_digitavel text,
  pix_copia_cola text,
  qr_code_base64 text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.tenant_faturas TO authenticated;
GRANT ALL ON public.tenant_faturas TO service_role;

ALTER TABLE public.tenant_faturas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_faturas_select_own" ON public.tenant_faturas
  FOR SELECT TO authenticated
  USING (tenant_id = private.current_tenant_id() OR private.is_super_admin(auth.uid()));

CREATE POLICY "tenant_faturas_insert_own" ON public.tenant_faturas
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = private.current_tenant_id());

CREATE TRIGGER trg_tenant_faturas_updated_at
  BEFORE UPDATE ON public.tenant_faturas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_tenant_faturas_tenant ON public.tenant_faturas(tenant_id);
CREATE INDEX idx_tenant_faturas_cobranca ON public.tenant_faturas(cobranca_id);