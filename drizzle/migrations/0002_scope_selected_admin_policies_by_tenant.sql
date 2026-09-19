DROP POLICY IF EXISTS "Admins gerenciam config de backup" ON public.backup_config;
CREATE POLICY "Super admin gerencia config de backup"
ON public.backup_config
FOR ALL
TO authenticated
USING (private.is_super_admin(auth.uid()))
WITH CHECK (private.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins leem logs de backup" ON public.backup_logs;
CREATE POLICY "Admins leem logs de backup da empresa"
ON public.backup_logs
FOR SELECT
TO authenticated
USING (
  private.is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = backup_logs.user_id
      AND p.tenant_id = private.current_tenant_id()
  )
);

DROP POLICY IF EXISTS "admin_all_integracao" ON public.integracao_bancaria;
CREATE POLICY "admin_all_integracao"
ON public.integracao_bancaria
FOR ALL
TO authenticated
USING (
  private.has_role(auth.uid(), 'admin'::public.app_role)
  AND tenant_id = private.current_tenant_id()
)
WITH CHECK (
  private.has_role(auth.uid(), 'admin'::public.app_role)
  AND tenant_id = private.current_tenant_id()
);

DROP POLICY IF EXISTS "Admins podem ver os logs" ON public.logs_auditoria;
CREATE POLICY "Admins podem ver os logs"
ON public.logs_auditoria
FOR SELECT
TO authenticated
USING (
  private.has_role(auth.uid(), 'admin'::public.app_role)
  AND tenant_id = private.current_tenant_id()
);

DROP POLICY IF EXISTS "admin manage permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "admin read permissions" ON public.role_permissions;
CREATE POLICY "super_admin_manage_global_role_permissions"
ON public.role_permissions
FOR ALL
TO authenticated
USING (private.is_super_admin(auth.uid()))
WITH CHECK (private.is_super_admin(auth.uid()));
CREATE POLICY "authenticated_read_global_role_permissions"
ON public.role_permissions
FOR SELECT
TO authenticated
USING (private.current_tenant_id() IS NOT NULL);

DROP POLICY IF EXISTS "admin manage user_permissions" ON public.user_permissions;
CREATE POLICY "admin manage user_permissions"
ON public.user_permissions
FOR ALL
TO authenticated
USING (
  private.has_role(auth.uid(), 'admin'::public.app_role)
  AND EXISTS (
    SELECT 1
    FROM public.profiles target_profile
    WHERE target_profile.id = user_permissions.user_id
      AND target_profile.tenant_id = private.current_tenant_id()
  )
)
WITH CHECK (
  private.has_role(auth.uid(), 'admin'::public.app_role)
  AND EXISTS (
    SELECT 1
    FROM public.profiles target_profile
    WHERE target_profile.id = user_permissions.user_id
      AND target_profile.tenant_id = private.current_tenant_id()
  )
);

ALTER TABLE public.webhook_logs
ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS webhook_logs_tenant_id_idx ON public.webhook_logs(tenant_id);
UPDATE public.webhook_logs wl
SET tenant_id = m.tenant_id
FROM public.mensalidades m
WHERE wl.mensalidade_id = m.id
  AND wl.tenant_id IS NULL;
UPDATE public.webhook_logs wl
SET tenant_id = tf.tenant_id
FROM public.tenant_faturas tf
WHERE wl.tenant_id IS NULL
  AND tf.cobranca_id = wl.payload #>> '{payment,id}';
DROP POLICY IF EXISTS "admin_read_webhook_logs" ON public.webhook_logs;
CREATE POLICY "admin_read_webhook_logs"
ON public.webhook_logs
FOR SELECT
TO authenticated
USING (
  private.has_role(auth.uid(), 'admin'::public.app_role)
  AND tenant_id = private.current_tenant_id()
);