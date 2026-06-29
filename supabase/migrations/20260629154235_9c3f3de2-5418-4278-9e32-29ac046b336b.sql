
-- Add 'vendedor' role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'vendedor';

-- Pins table for sales mapping
CREATE TABLE public.vendas_pins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  associado_id uuid REFERENCES public.associados(id) ON DELETE SET NULL,
  plano_id uuid REFERENCES public.planos(id) ON DELETE SET NULL,
  nome text NOT NULL,
  telefone text,
  endereco text,
  status text NOT NULL DEFAULT 'prospect',
  observacoes text,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendas_pins TO authenticated;
GRANT ALL ON public.vendas_pins TO service_role;

ALTER TABLE public.vendas_pins ENABLE ROW LEVEL SECURITY;

-- Vendedor sees only own pins; staff (admin/operador) sees all
CREATE POLICY "vendedor_select_own_or_staff" ON public.vendas_pins
FOR SELECT TO authenticated
USING (
  vendedor_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'operador')
);

CREATE POLICY "vendedor_insert_own" ON public.vendas_pins
FOR INSERT TO authenticated
WITH CHECK (vendedor_id = auth.uid());

CREATE POLICY "vendedor_update_own_or_staff" ON public.vendas_pins
FOR UPDATE TO authenticated
USING (
  vendedor_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'operador')
);

CREATE POLICY "vendedor_delete_own_or_staff" ON public.vendas_pins
FOR DELETE TO authenticated
USING (
  vendedor_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'operador')
);

CREATE TRIGGER touch_vendas_pins
BEFORE UPDATE ON public.vendas_pins
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_vendas_pins_vendedor ON public.vendas_pins(vendedor_id);
CREATE INDEX idx_vendas_pins_status ON public.vendas_pins(status);
