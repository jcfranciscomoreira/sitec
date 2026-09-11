CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email, tenant_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email,
    NULL
  );
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

CREATE OR REPLACE FUNCTION public.create_own_tenant(company_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_existing_tenant uuid;
  v_tenant uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  IF length(trim(company_name)) < 3 OR length(trim(company_name)) > 160 THEN
    RAISE EXCEPTION 'Nome da empresa inválido';
  END IF;

  SELECT tenant_id INTO v_existing_tenant
  FROM public.profiles
  WHERE id = v_user
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
  WHERE id = v_user;

  DELETE FROM public.user_roles WHERE user_id = v_user;
  INSERT INTO public.user_roles (user_id, role, tenant_id)
  VALUES (v_user, 'admin', v_tenant);

  RETURN v_tenant;
END;
$$;

REVOKE ALL ON FUNCTION public.create_own_tenant(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_own_tenant(text) TO authenticated, service_role;