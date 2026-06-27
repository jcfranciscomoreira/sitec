
CREATE TABLE public.baixa_sessoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agente text NOT NULL,
  data_recebimento date NOT NULL,
  responsavel_id uuid REFERENCES auth.users(id),
  responsavel_nome text,
  total_qtd int NOT NULL DEFAULT 0,
  total_valor numeric(12,2) NOT NULL DEFAULT 0,
  itens jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.baixa_sessoes TO authenticated;
GRANT ALL ON public.baixa_sessoes TO service_role;
ALTER TABLE public.baixa_sessoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_all_baixa_sessoes" ON public.baixa_sessoes FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE INDEX idx_baixa_sessoes_data ON public.baixa_sessoes(data_recebimento DESC);
