DROP FUNCTION IF EXISTS public.create_own_tenant(text);

CREATE OR REPLACE FUNCTION public.create_tenant_for_user(target_user uuid, company_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_tenant uuid;
  v_tenant uuid;
BEGIN
  IF target_user IS NULL THEN
    RAISE EXCEPTION 'Usuário não informado';
  END IF;

  IF length(trim(company_name)) < 3 OR length(trim(company_name)) > 160 THEN
    RAISE EXCEPTION 'Nome da empresa inválido';
  END IF;

  SELECT tenant_id INTO v_existing_tenant
  FROM public.profiles
  WHERE id = target_user
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil do usuário não encontrado';
  END IF;

  IF v_existing_tenant IS NOT NULL THEN
    RAISE EXCEPTION 'Este usuário já pertence a uma empresa';
  END IF;

  INSERT INTO public.tenants (nome, status, plan_status, trial_ends_at)
  VALUES (trim(company_name), 'ativo', 'trialing', now() + interval '30 days')
  RETURNING id INTO v_tenant;

  UPDATE public.profiles
  SET tenant_id = v_tenant, updated_at = now()
  WHERE id = target_user;

  DELETE FROM public.user_roles WHERE user_id = target_user;
  INSERT INTO public.user_roles (user_id, role, tenant_id)
  VALUES (target_user, 'admin', v_tenant);

  RETURN v_tenant;
END;
$$;

REVOKE ALL ON FUNCTION public.create_tenant_for_user(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_tenant_for_user(uuid, text) TO service_role;