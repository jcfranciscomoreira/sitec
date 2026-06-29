
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.app_role NOT NULL,
  module text NOT NULL,
  allowed boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role, module)
);

GRANT SELECT ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated read permissions" ON public.role_permissions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manage permissions" ON public.role_permissions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER role_permissions_updated_at
  BEFORE UPDATE ON public.role_permissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.role_permissions (role, module, allowed) VALUES
  ('admin','dashboard',true),('admin','associados',true),('admin','planos',true),
  ('admin','financeiro',true),('admin','recebimento',true),('admin','empresa-financeiro',true),
  ('admin','contas',true),('admin','centros-custo',true),('admin','vendas',true),
  ('admin','vendas-relatorio',true),('admin','usuarios',true),('admin','configuracoes',true),
  ('operador','dashboard',true),('operador','associados',true),('operador','planos',true),
  ('operador','financeiro',true),('operador','recebimento',true),('operador','empresa-financeiro',true),
  ('operador','contas',true),('operador','centros-custo',true),('operador','vendas',false),
  ('operador','vendas-relatorio',false),('operador','usuarios',false),('operador','configuracoes',false),
  ('vendedor','dashboard',false),('vendedor','associados',false),('vendedor','planos',false),
  ('vendedor','financeiro',false),('vendedor','recebimento',false),('vendedor','empresa-financeiro',false),
  ('vendedor','contas',false),('vendedor','centros-custo',false),('vendedor','vendas',true),
  ('vendedor','vendas-relatorio',true),('vendedor','usuarios',false),('vendedor','configuracoes',false),
  ('cobrador','dashboard',false),('cobrador','associados',false),('cobrador','planos',false),
  ('cobrador','financeiro',false),('cobrador','recebimento',true),('cobrador','empresa-financeiro',false),
  ('cobrador','contas',false),('cobrador','centros-custo',false),('cobrador','vendas',false),
  ('cobrador','vendas-relatorio',false),('cobrador','usuarios',false),('cobrador','configuracoes',false)
ON CONFLICT (role, module) DO NOTHING;
