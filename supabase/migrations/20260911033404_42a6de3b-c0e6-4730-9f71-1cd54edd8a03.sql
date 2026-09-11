CREATE OR REPLACE FUNCTION public.confirm_tenant_invoice_payment(
  invoice_id uuid,
  provider_status text,
  paid_on date DEFAULT CURRENT_DATE
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice public.tenant_faturas%ROWTYPE;
  v_current_expiry timestamptz;
  v_base timestamptz;
  v_months integer;
BEGIN
  SELECT * INTO v_invoice
  FROM public.tenant_faturas
  WHERE id = invoice_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fatura não encontrada';
  END IF;

  IF v_invoice.status = 'pago' THEN
    RETURN false;
  END IF;

  v_months := CASE v_invoice.periodo::text
    WHEN 'anual' THEN 12
    WHEN 'semestral' THEN 6
    ELSE 1
  END;

  SELECT expires_at INTO v_current_expiry
  FROM public.tenants
  WHERE id = v_invoice.tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Empresa não encontrada';
  END IF;

  v_base := CASE
    WHEN v_current_expiry IS NOT NULL AND v_current_expiry > now() THEN v_current_expiry
    ELSE now()
  END;

  UPDATE public.tenant_faturas
  SET status = 'pago',
      cobranca_status = provider_status,
      data_pagamento = COALESCE(paid_on, CURRENT_DATE),
      updated_at = now()
  WHERE id = v_invoice.id;

  UPDATE public.tenants
  SET plan_status = 'active',
      plan_id = v_invoice.plan_id,
      status = 'ativo',
      expires_at = v_base + make_interval(months => v_months),
      updated_at = now()
  WHERE id = v_invoice.tenant_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_tenant_invoice_payment(uuid, text, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_tenant_invoice_payment(uuid, text, date) TO service_role;