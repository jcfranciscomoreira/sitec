
DROP POLICY IF EXISTS "Authenticated can read associados" ON public.associados;
DROP POLICY IF EXISTS "Authenticated can read dependentes" ON public.dependentes;
DROP POLICY IF EXISTS "Authenticated can read mensalidades" ON public.mensalidades;
DROP POLICY IF EXISTS "Authenticated can read cobradores" ON public.cobradores;
DROP POLICY IF EXISTS "Authenticated can read contas_financeiras" ON public.contas_financeiras;
DROP POLICY IF EXISTS "Authenticated can read baixa_sessoes" ON public.baixa_sessoes;
DROP POLICY IF EXISTS "Authenticated can read recebimentos_pendentes" ON public.recebimentos_pendentes;
DROP POLICY IF EXISTS "Authenticated can read vendas_pins" ON public.vendas_pins;

CREATE POLICY "Staff can read associados" ON public.associados FOR SELECT TO authenticated USING (private.is_staff(auth.uid()));
CREATE POLICY "Staff can read dependentes" ON public.dependentes FOR SELECT TO authenticated USING (private.is_staff(auth.uid()));
CREATE POLICY "Staff can read mensalidades" ON public.mensalidades FOR SELECT TO authenticated USING (private.is_staff(auth.uid()));
CREATE POLICY "Staff can read cobradores" ON public.cobradores FOR SELECT TO authenticated USING (private.is_staff(auth.uid()));
CREATE POLICY "Staff can read contas_financeiras" ON public.contas_financeiras FOR SELECT TO authenticated USING (private.is_staff(auth.uid()));
CREATE POLICY "Staff can read baixa_sessoes" ON public.baixa_sessoes FOR SELECT TO authenticated USING (private.is_staff(auth.uid()));
CREATE POLICY "Staff can read recebimentos_pendentes" ON public.recebimentos_pendentes FOR SELECT TO authenticated USING (private.is_staff(auth.uid()));
