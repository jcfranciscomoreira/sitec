-- 1. Nova empresa para o usuário que ficou preso na Matriz
DO $$
DECLARE
  v_user uuid := 'e4a4bb58-9ac0-405e-88c0-a42a5eab24e7';
  v_tenant uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user) THEN
    INSERT INTO public.tenants (nome, status, plan_status, trial_ends_at)
    VALUES ('Empresa Ivolandia', 'ativo', 'trialing', now() + interval '30 days')
    RETURNING id INTO v_tenant;

    UPDATE public.profiles SET tenant_id = v_tenant WHERE id = v_user;

    DELETE FROM public.user_roles WHERE user_id = v_user;
    INSERT INTO public.user_roles (user_id, role, tenant_id) VALUES (v_user, 'admin', v_tenant);
  END IF;
END $$;

-- 2. Permitir que um usuário sem empresa crie a própria empresa no cadastro
DROP POLICY IF EXISTS "New users can create their own tenant" ON public.tenants;
CREATE POLICY "New users can create their own tenant"
ON public.tenants FOR INSERT TO authenticated
WITH CHECK (
  (SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid()) IS NULL
);