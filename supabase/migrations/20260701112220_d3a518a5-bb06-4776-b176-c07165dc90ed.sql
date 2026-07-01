-- Fix: restrict cobrador SELECT on associados
DROP POLICY IF EXISTS "associados_cobrador_read" ON public.associados;
CREATE POLICY "associados_cobrador_read" ON public.associados
FOR SELECT TO authenticated
USING (
  private.has_role(auth.uid(), 'cobrador'::app_role)
  AND cobrador_id IN (SELECT id FROM public.cobradores WHERE user_id = auth.uid())
);

-- Fix: restrict cobrador SELECT on mensalidades
DROP POLICY IF EXISTS "mensalidades_cobrador_read" ON public.mensalidades;
CREATE POLICY "mensalidades_cobrador_read" ON public.mensalidades
FOR SELECT TO authenticated
USING (
  private.has_role(auth.uid(), 'cobrador'::app_role)
  AND associado_id IN (
    SELECT a.id FROM public.associados a
    JOIN public.cobradores c ON c.id = a.cobrador_id
    WHERE c.user_id = auth.uid()
  )
);

-- Fix: add explicit INSERT policy on profiles (trigger runs as SECURITY DEFINER; this allows self-insert only as safety)
DROP POLICY IF EXISTS "profiles_self_insert" ON public.profiles;
CREATE POLICY "profiles_self_insert" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (id = auth.uid());

-- Fix: recebimentos_pendentes - restrict writes to staff only, remove created_by bypass
DROP POLICY IF EXISTS "staff manages recebimentos_pendentes" ON public.recebimentos_pendentes;
CREATE POLICY "recebimentos_pendentes_staff_insert" ON public.recebimentos_pendentes
FOR INSERT TO authenticated
WITH CHECK (private.is_staff(auth.uid()));
CREATE POLICY "recebimentos_pendentes_staff_update" ON public.recebimentos_pendentes
FOR UPDATE TO authenticated
USING (private.is_staff(auth.uid()))
WITH CHECK (private.is_staff(auth.uid()));
CREATE POLICY "recebimentos_pendentes_staff_delete" ON public.recebimentos_pendentes
FOR DELETE TO authenticated
USING (private.is_staff(auth.uid()));

-- Allow cobradores to insert their own pending receipts (mobile receipt flow)
CREATE POLICY "recebimentos_pendentes_cobrador_insert" ON public.recebimentos_pendentes
FOR INSERT TO authenticated
WITH CHECK (
  private.has_role(auth.uid(), 'cobrador'::app_role)
  AND created_by = auth.uid()
);
CREATE POLICY "recebimentos_pendentes_cobrador_update_own" ON public.recebimentos_pendentes
FOR UPDATE TO authenticated
USING (
  private.has_role(auth.uid(), 'cobrador'::app_role)
  AND created_by = auth.uid()
  AND status = 'pendente'
)
WITH CHECK (created_by = auth.uid());
CREATE POLICY "recebimentos_pendentes_cobrador_delete_own" ON public.recebimentos_pendentes
FOR DELETE TO authenticated
USING (
  private.has_role(auth.uid(), 'cobrador'::app_role)
  AND created_by = auth.uid()
  AND status = 'pendente'
);
