
CREATE TABLE public.crm_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  color text NOT NULL DEFAULT 'bg-slate-500',
  ordem int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_stages TO authenticated;
GRANT ALL ON public.crm_stages TO service_role;
ALTER TABLE public.crm_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read stages" ON public.crm_stages FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth manage stages" ON public.crm_stages FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO public.crm_stages (key,label,color,ordem) VALUES
  ('novo','Novo','bg-slate-500',1),
  ('contato','Em contato','bg-blue-500',2),
  ('proposta','Proposta enviada','bg-amber-500',3),
  ('negociacao','Negociação','bg-purple-500',4),
  ('ganho','Ganho','bg-emerald-600',5),
  ('perdido','Perdido','bg-rose-600',6)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS vendas_pin_id uuid REFERENCES public.vendas_pins(id) ON DELETE SET NULL;
