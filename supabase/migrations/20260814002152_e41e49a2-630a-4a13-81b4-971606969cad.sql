-- Ajustar a função set_tenant_id para maior segurança
ALTER FUNCTION public.set_tenant_id() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.set_tenant_id() FROM public;
REVOKE EXECUTE ON FUNCTION public.set_tenant_id() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.set_tenant_id() FROM anon;
GRANT EXECUTE ON FUNCTION public.set_tenant_id() TO service_role;
