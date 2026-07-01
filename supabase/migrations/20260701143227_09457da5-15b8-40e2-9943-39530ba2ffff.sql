CREATE TABLE public.crm_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  telefone text,
  email text,
  cidade text,
  origem text,
  plano_interesse uuid REFERENCES public.planos(id) ON DELETE SET NULL,
  valor_estimado numeric(12,2) DEFAULT 0,
  stage text NOT NULL DEFAULT 'novo',
  responsavel_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  observacoes text,
  ordem int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_leads TO authenticated;
GRANT ALL ON public.crm_leads TO service_role;

ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read crm_leads" ON public.crm_leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert crm_leads" ON public.crm_leads FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update crm_leads" ON public.crm_leads FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "staff delete crm_leads" ON public.crm_leads FOR DELETE TO authenticated USING (private.is_staff(auth.uid()));

CREATE TRIGGER crm_leads_touch BEFORE UPDATE ON public.crm_leads FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();