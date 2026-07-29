CREATE TABLE public.caixa_sessoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operador_id uuid,
  operador_nome text NOT NULL,
  filial_id uuid REFERENCES public.filiais(id) ON DELETE SET NULL,
  valor_abertura numeric NOT NULL DEFAULT 0,
  valor_fechamento_informado numeric,
  status text NOT NULL DEFAULT 'aberto',
  observacoes text,
  aberto_em timestamptz NOT NULL DEFAULT now(),
  fechado_em timestamptz,
  conta_financeira_id uuid REFERENCES public.contas_financeiras(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.caixa_movimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caixa_id uuid NOT NULL REFERENCES public.caixa_sessoes(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'entrada',
  descricao text NOT NULL,
  valor numeric NOT NULL,
  forma_pagamento text NOT NULL DEFAULT 'dinheiro',
  mensalidade_id uuid REFERENCES public.mensalidades(id) ON DELETE SET NULL,
  associado_id uuid REFERENCES public.associados(id) ON DELETE SET NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_caixa_movimentos_caixa ON public.caixa_movimentos(caixa_id);
CREATE INDEX idx_caixa_sessoes_status ON public.caixa_sessoes(status);

GRANT SELECT, INSERT, UPDATE ON public.caixa_sessoes TO authenticated;
GRANT ALL ON public.caixa_sessoes TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.caixa_movimentos TO authenticated;
GRANT ALL ON public.caixa_movimentos TO service_role;

ALTER TABLE public.caixa_sessoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caixa_movimentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff read caixa_sessoes" ON public.caixa_sessoes FOR SELECT TO authenticated USING (private.is_staff(auth.uid()));
CREATE POLICY "staff insert caixa_sessoes" ON public.caixa_sessoes FOR INSERT TO authenticated WITH CHECK (private.is_staff(auth.uid()));
CREATE POLICY "staff update caixa_sessoes" ON public.caixa_sessoes FOR UPDATE TO authenticated USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));

CREATE POLICY "staff read caixa_movimentos" ON public.caixa_movimentos FOR SELECT TO authenticated USING (private.is_staff(auth.uid()));
CREATE POLICY "staff insert caixa_movimentos" ON public.caixa_movimentos FOR INSERT TO authenticated WITH CHECK (private.is_staff(auth.uid()));
CREATE POLICY "staff update caixa_movimentos" ON public.caixa_movimentos FOR UPDATE TO authenticated USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));

CREATE TRIGGER trg_caixa_sessoes_updated_at BEFORE UPDATE ON public.caixa_sessoes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();