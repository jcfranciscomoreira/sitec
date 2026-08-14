GRANT EXECUTE ON FUNCTION private.current_tenant_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_super_admin(uuid) TO authenticated, service_role;