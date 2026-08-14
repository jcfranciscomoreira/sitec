-- Recriar a política com cast explícito para evitar erro de tipo no has_role
DROP POLICY IF EXISTS "Super-admins can manage system plans" ON public.system_plans;

CREATE POLICY "Super-admins can manage system plans"
ON public.system_plans
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.tenant_id = '00000000-0000-0000-0000-000000000000'::uuid
  )
);
