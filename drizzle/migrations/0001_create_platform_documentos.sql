CREATE TABLE IF NOT EXISTS public.platform_documentos (
  tipo text PRIMARY KEY,
  html text NOT NULL,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.platform_documentos TO authenticated;
GRANT INSERT, UPDATE ON public.platform_documentos TO authenticated;
GRANT ALL ON public.platform_documentos TO service_role;

ALTER TABLE public.platform_documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_documentos_read" ON public.platform_documentos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "platform_documentos_insert" ON public.platform_documentos
  FOR INSERT TO authenticated WITH CHECK (private.is_super_admin(auth.uid()));

CREATE POLICY "platform_documentos_update" ON public.platform_documentos
  FOR UPDATE TO authenticated
  USING (private.is_super_admin(auth.uid()))
  WITH CHECK (private.is_super_admin(auth.uid()));