CREATE OR REPLACE FUNCTION private.has_any_role(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id);
$$;

REVOKE ALL ON FUNCTION private.has_any_role(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_any_role(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "planos_read" ON public.planos;
CREATE POLICY "planos_read" ON public.planos
FOR SELECT TO authenticated
USING (private.has_any_role(auth.uid()));

DROP POLICY IF EXISTS "Permitir leitura para autenticados" ON public.servicos_produtos;
CREATE POLICY "servicos_produtos_read_staff" ON public.servicos_produtos
FOR SELECT TO authenticated
USING (private.is_staff(auth.uid()) OR private.has_role(auth.uid(), 'agente'::app_role));

DROP POLICY IF EXISTS "recebimentos_pendentes_cobrador_update_own" ON public.recebimentos_pendentes;
CREATE POLICY "recebimentos_pendentes_cobrador_update_own" ON public.recebimentos_pendentes
FOR UPDATE TO authenticated
USING (private.has_role(auth.uid(), 'cobrador'::app_role) AND created_by = auth.uid() AND status = 'pendente')
WITH CHECK (private.has_role(auth.uid(), 'cobrador'::app_role) AND created_by = auth.uid() AND status = 'pendente');