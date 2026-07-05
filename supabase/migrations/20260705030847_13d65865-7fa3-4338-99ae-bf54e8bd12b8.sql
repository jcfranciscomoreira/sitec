CREATE POLICY "cobrador_select_pins_dos_seus_associados" ON public.vendas_pins
FOR SELECT TO authenticated
USING (
  associado_id IN (
    SELECT a.id FROM public.associados a
    JOIN public.cobradores c ON c.id = a.cobrador_id
    WHERE c.user_id = auth.uid()
  )
);