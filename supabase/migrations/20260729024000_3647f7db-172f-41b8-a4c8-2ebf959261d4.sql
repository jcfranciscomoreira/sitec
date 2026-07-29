
-- 1) estoque_itens
CREATE TABLE public.estoque_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  unidade text,
  quantidade numeric NOT NULL DEFAULT 0,
  estoque_minimo numeric NOT NULL DEFAULT 0,
  produto_id uuid REFERENCES public.servicos_produtos(id) ON DELETE SET NULL,
  filial_id uuid REFERENCES public.filiais(id) ON DELETE SET NULL,
  ativo boolean NOT NULL DEFAULT true,
  observacoes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.estoque_itens TO authenticated;
GRANT ALL ON public.estoque_itens TO service_role;

ALTER TABLE public.estoque_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "estoque_itens_staff_all" ON public.estoque_itens
  FOR ALL TO authenticated
  USING (private.is_staff(auth.uid()))
  WITH CHECK (private.is_staff(auth.uid()));

CREATE TRIGGER estoque_itens_updated
  BEFORE UPDATE ON public.estoque_itens
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2) estoque_movimentos
CREATE TABLE public.estoque_movimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.estoque_itens(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('entrada','saida','ajuste')),
  quantidade numeric NOT NULL,
  servico_id uuid REFERENCES public.servicos_funerarios(id) ON DELETE SET NULL,
  observacao text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX estoque_movimentos_item_idx ON public.estoque_movimentos(item_id);
CREATE INDEX estoque_movimentos_servico_idx ON public.estoque_movimentos(servico_id);
-- idempotência de baixa por OS
CREATE UNIQUE INDEX estoque_movimentos_saida_por_os
  ON public.estoque_movimentos(servico_id, item_id)
  WHERE tipo = 'saida' AND servico_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.estoque_movimentos TO authenticated;
GRANT ALL ON public.estoque_movimentos TO service_role;

ALTER TABLE public.estoque_movimentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "estoque_movimentos_staff_all" ON public.estoque_movimentos
  FOR ALL TO authenticated
  USING (private.is_staff(auth.uid()))
  WITH CHECK (private.is_staff(auth.uid()));

-- 3) contas_financeiras: vínculo com serviço para idempotência
ALTER TABLE public.contas_financeiras
  ADD COLUMN IF NOT EXISTS servico_id uuid REFERENCES public.servicos_funerarios(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS contas_financeiras_servico_unico
  ON public.contas_financeiras(servico_id)
  WHERE servico_id IS NOT NULL;
