
-- Add OS status enum values
ALTER TYPE servico_status ADD VALUE IF NOT EXISTS 'Aberta';
ALTER TYPE servico_status ADD VALUE IF NOT EXISTS 'Em Execução';
ALTER TYPE servico_status ADD VALUE IF NOT EXISTS 'Concluída';
ALTER TYPE servico_status ADD VALUE IF NOT EXISTS 'Cancelada';

-- Add OS-specific columns
ALTER TABLE public.servicos_funerarios
  ADD COLUMN IF NOT EXISTS atendente_nome text,
  ADD COLUMN IF NOT EXISTS autorizacao_responsavel text,
  ADD COLUMN IF NOT EXISTS os_hora time,
  ADD COLUMN IF NOT EXISTS os_data date,
  ADD COLUMN IF NOT EXISTS os_assinada_url text,
  ADD COLUMN IF NOT EXISTS os_materiais text;

-- Storage policies for os-assinadas
CREATE POLICY "Staff read os-assinadas"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'os-assinadas' AND private.is_staff(auth.uid()));

CREATE POLICY "Staff upload os-assinadas"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'os-assinadas' AND private.is_staff(auth.uid()));

CREATE POLICY "Staff update os-assinadas"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'os-assinadas' AND private.is_staff(auth.uid()));

CREATE POLICY "Staff delete os-assinadas"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'os-assinadas' AND private.is_staff(auth.uid()));
