
CREATE TYPE tipo_movimento AS ENUM ('entrada','saida');
CREATE TYPE status_conta AS ENUM ('pendente','pago','atrasado','cancelado');

CREATE TABLE public.centros_custo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  descricao text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.centros_custo TO authenticated;
GRANT ALL ON public.centros_custo TO service_role;
ALTER TABLE public.centros_custo ENABLE ROW LEVEL SECURITY;
CREATE POLICY centros_custo_all ON public.centros_custo FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_cc_updated BEFORE UPDATE ON public.centros_custo FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.contas_financeiras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo tipo_movimento NOT NULL,
  descricao text NOT NULL,
  categoria text,
  centro_custo_id uuid REFERENCES public.centros_custo(id) ON DELETE SET NULL,
  valor numeric(12,2) NOT NULL CHECK (valor >= 0),
  data_emissao date NOT NULL DEFAULT CURRENT_DATE,
  vencimento date NOT NULL,
  data_pagamento date,
  forma_pagamento text,
  status status_conta NOT NULL DEFAULT 'pendente',
  fornecedor_cliente text,
  observacoes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contas_financeiras TO authenticated;
GRANT ALL ON public.contas_financeiras TO service_role;
ALTER TABLE public.contas_financeiras ENABLE ROW LEVEL SECURITY;
CREATE POLICY contas_financeiras_all ON public.contas_financeiras FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_cf_updated BEFORE UPDATE ON public.contas_financeiras FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_cf_tipo ON public.contas_financeiras(tipo);
CREATE INDEX idx_cf_status ON public.contas_financeiras(status);
CREATE INDEX idx_cf_vencimento ON public.contas_financeiras(vencimento);
CREATE INDEX idx_cf_centro ON public.contas_financeiras(centro_custo_id);

INSERT INTO public.centros_custo (nome, descricao) VALUES
  ('Administrativo', 'Despesas administrativas gerais'),
  ('Operacional', 'Custos operacionais do serviço funerário'),
  ('Comercial', 'Marketing, vendas e captação'),
  ('Manutenção', 'Manutenção de instalações e veículos');
