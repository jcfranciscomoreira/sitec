-- 1. Adicionar tenant_id em user_roles
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

-- Vincular registros existentes à Matriz
UPDATE public.user_roles SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;

-- 2. Criar trigger de tenant_id para user_roles
DROP TRIGGER IF EXISTS tr_set_tenant_id ON public.user_roles;
CREATE TRIGGER tr_set_tenant_id BEFORE INSERT ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

-- 3. Atualizar RLS para user_roles
DROP POLICY IF EXISTS "Tenant Isolation" ON public.user_roles;
CREATE POLICY "Tenant Isolation" ON public.user_roles AS PERMISSIVE FOR ALL TO authenticated USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- 4. Garantir que a função has_role considere o tenant do usuário logado
-- A função has_role atual:
-- select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
-- Como a política de RLS já filtra as linhas de user_roles pelo tenant_id do usuário logado (auth.uid()), 
-- a função has_role(auth.uid(), 'admin') só verá o papel se ele for do mesmo tenant.
