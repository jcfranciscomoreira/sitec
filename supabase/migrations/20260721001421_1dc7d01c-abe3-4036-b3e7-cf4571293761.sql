
-- associados / dependentes / configuracoes: drop overly permissive SELECT
DROP POLICY IF EXISTS "Allow authenticated to select associados" ON public.associados;
DROP POLICY IF EXISTS "Allow authenticated to select dependentes" ON public.dependentes;
DROP POLICY IF EXISTS "Authenticated can read configuracoes" ON public.configuracoes;

CREATE POLICY "Staff can read configuracoes" ON public.configuracoes
  FOR SELECT TO authenticated
  USING (private.is_staff(auth.uid()));

-- servicos_funerarios: staff-only
DROP POLICY IF EXISTS "All authenticated can manage servicos" ON public.servicos_funerarios;
CREATE POLICY "Staff can manage servicos_funerarios" ON public.servicos_funerarios
  FOR ALL TO authenticated
  USING (private.is_staff(auth.uid()))
  WITH CHECK (private.is_staff(auth.uid()));

-- servico_checklist: staff-only
DROP POLICY IF EXISTS "All authenticated can manage servicos_checklist" ON public.servico_checklist;
CREATE POLICY "Staff can manage servico_checklist" ON public.servico_checklist
  FOR ALL TO authenticated
  USING (private.is_staff(auth.uid()))
  WITH CHECK (private.is_staff(auth.uid()));

-- servico_financeiro: staff-only
DROP POLICY IF EXISTS "All authenticated can manage servicos_financeiro" ON public.servico_financeiro;
CREATE POLICY "Staff can manage servico_financeiro" ON public.servico_financeiro
  FOR ALL TO authenticated
  USING (private.is_staff(auth.uid()))
  WITH CHECK (private.is_staff(auth.uid()));

-- servico_timeline: staff-only
DROP POLICY IF EXISTS "All authenticated can manage servicos_timeline" ON public.servico_timeline;
CREATE POLICY "Staff can manage servico_timeline" ON public.servico_timeline
  FOR ALL TO authenticated
  USING (private.is_staff(auth.uid()))
  WITH CHECK (private.is_staff(auth.uid()));

-- servicos_produtos: restrict writes to staff, keep read for authenticated
DROP POLICY IF EXISTS "Permitir atualização para autenticados" ON public.servicos_produtos;
DROP POLICY IF EXISTS "Permitir exclusão para autenticados" ON public.servicos_produtos;
DROP POLICY IF EXISTS "Permitir inserção para autenticados" ON public.servicos_produtos;

CREATE POLICY "Staff can insert servicos_produtos" ON public.servicos_produtos
  FOR INSERT TO authenticated
  WITH CHECK (private.is_staff(auth.uid()));

CREATE POLICY "Staff can update servicos_produtos" ON public.servicos_produtos
  FOR UPDATE TO authenticated
  USING (private.is_staff(auth.uid()))
  WITH CHECK (private.is_staff(auth.uid()));

CREATE POLICY "Staff can delete servicos_produtos" ON public.servicos_produtos
  FOR DELETE TO authenticated
  USING (private.is_staff(auth.uid()));
