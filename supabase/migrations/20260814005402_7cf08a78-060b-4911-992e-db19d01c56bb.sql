CREATE TABLE public.system_plans (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nome text NOT NULL,
    descricao text,
    preco_mensal numeric NOT NULL DEFAULT 0,
    limite_usuarios integer,
    limite_associados integer,
    recursos jsonb DEFAULT '[]',
    ativo boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_plans TO authenticated;
GRANT ALL ON public.system_plans TO service_role;

ALTER TABLE public.tenants ADD COLUMN plan_id uuid REFERENCES public.system_plans(id);

ALTER TABLE public.system_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super-admins can manage system plans"
ON public.system_plans
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.tenant_id = '00000000-0000-0000-0000-000000000000'
  )
);

-- Inserir alguns planos iniciais
INSERT INTO public.system_plans (nome, descricao, preco_mensal, limite_usuarios, limite_associados)
VALUES 
('Básico', 'Ideal para pequenas funerárias', 199.90, 3, 500),
('Profissional', 'Para funerárias em crescimento', 399.90, 10, 2000),
('Enterprise', 'Gestão completa sem limites', 799.90, NULL, NULL);

-- Atualizar o tenant matriz com o plano enterprise
UPDATE public.tenants 
SET plan_id = (SELECT id FROM public.system_plans WHERE nome = 'Enterprise')
WHERE id = '00000000-0000-0000-0000-000000000000';
