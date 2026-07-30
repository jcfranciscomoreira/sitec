CREATE TABLE public.logs_auditoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  user_nome text,
  user_email text,
  acao text NOT NULL,
  tabela text NOT NULL,
  registro_id text,
  descricao text,
  dados_antes jsonb,
  dados_depois jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_logs_auditoria_created_at ON public.logs_auditoria (created_at DESC);
CREATE INDEX idx_logs_auditoria_user ON public.logs_auditoria (user_id);
CREATE INDEX idx_logs_auditoria_tabela ON public.logs_auditoria (tabela);

GRANT SELECT ON public.logs_auditoria TO authenticated;
GRANT ALL ON public.logs_auditoria TO service_role;

ALTER TABLE public.logs_auditoria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem ver os logs"
ON public.logs_auditoria FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

CREATE OR REPLACE FUNCTION public.registrar_log_auditoria()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_nome text;
  v_email text;
  v_id text;
  v_desc text;
  v_antes jsonb;
  v_depois jsonb;
BEGIN
  SELECT p.nome, p.email INTO v_nome, v_email FROM public.profiles p WHERE p.id = v_uid;

  IF TG_OP = 'DELETE' THEN
    v_antes := to_jsonb(OLD);
    v_id := COALESCE(v_antes->>'id', '');
  ELSE
    v_depois := to_jsonb(NEW);
    v_id := COALESCE(v_depois->>'id', '');
    IF TG_OP = 'UPDATE' THEN v_antes := to_jsonb(OLD); END IF;
  END IF;

  v_desc := COALESCE(
    COALESCE(v_depois, v_antes)->>'nome',
    COALESCE(v_depois, v_antes)->>'descricao',
    COALESCE(v_depois, v_antes)->>'falecido_nome',
    COALESCE(v_depois, v_antes)->>'nome_sistema',
    NULL
  );

  INSERT INTO public.logs_auditoria (user_id, user_nome, user_email, acao, tabela, registro_id, descricao, dados_antes, dados_depois)
  VALUES (v_uid, v_nome, v_email, TG_OP, TG_TABLE_NAME, v_id, v_desc, v_antes, v_depois);

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'associados','dependentes','planos','mensalidades','contas_financeiras',
    'caixa_sessoes','caixa_movimentos','recebimentos_pendentes','baixa_sessoes',
    'servicos_funerarios','servico_checklist','servico_financeiro','servicos_produtos',
    'estoque_itens','estoque_movimentos','filiais','cobradores','crm_leads','crm_stages',
    'vendas_pins','user_roles','user_permissions','role_permissions','configuracoes','profiles'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_log_auditoria ON public.%I;', t);
    EXECUTE format('CREATE TRIGGER trg_log_auditoria AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.registrar_log_auditoria();', t);
  END LOOP;
END $$;