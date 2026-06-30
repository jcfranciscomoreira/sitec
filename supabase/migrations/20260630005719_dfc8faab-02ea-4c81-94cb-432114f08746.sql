
-- Allow all authenticated users to read core operational tables
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'associados','mensalidades','dependentes','planos','cobradores',
    'centros_custo','contas_financeiras','baixa_sessoes','recebimentos_pendentes',
    'vendas_pins','configuracoes'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Authenticated can read %I" ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY "Authenticated can read %I" ON public.%I FOR SELECT TO authenticated USING (true)',
      t, t
    );
  END LOOP;
END$$;
