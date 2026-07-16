
-- Restrict banking integration reads to admins
DROP POLICY IF EXISTS "operador_read_integracao" ON public.integracao_bancaria;

-- Restrict centros_custo reads to staff
DROP POLICY IF EXISTS "Authenticated can read centros_custo" ON public.centros_custo;
CREATE POLICY "Staff can read centros_custo" ON public.centros_custo
  FOR SELECT TO authenticated
  USING (private.is_staff(auth.uid()));

-- Restrict crm_stages reads to staff
DROP POLICY IF EXISTS "auth read stages" ON public.crm_stages;
CREATE POLICY "staff read stages" ON public.crm_stages
  FOR SELECT TO authenticated
  USING (private.is_staff(auth.uid()));

-- Restrict configuracoes reads to authenticated only (remove anon public read)
DROP POLICY IF EXISTS "Configuracoes leitura publica" ON public.configuracoes;
-- "Authenticated can read configuracoes" already exists for authenticated role

-- Consolidate planos reads: keep single authenticated read policy
DROP POLICY IF EXISTS "Authenticated can read planos" ON public.planos;
-- "planos_read" remains for authenticated users (shared catalog data)
