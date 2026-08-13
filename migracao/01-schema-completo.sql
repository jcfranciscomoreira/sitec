-- ============================================================
-- Nuvem Planos — Schema completo (gerado a partir das migrações)
-- Execute este arquivo no SQL Editor do SEU projeto Supabase.
-- Ordem cronológica preservada.
-- ============================================================


-- ############ 20240720000001_servicos_produtos.sql ############
CREATE TABLE IF NOT EXISTS public.servicos_produtos (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    nome text NOT NULL,
    tipo text NOT NULL CHECK (tipo IN ('Serviço', 'Produto')),
    preco numeric(12,2) NOT NULL DEFAULT 0,
    descricao text,
    ativo boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.servicos_produtos TO authenticated;
GRANT ALL ON public.servicos_produtos TO service_role;

ALTER TABLE public.servicos_produtos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura para autenticados" ON public.servicos_produtos
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Permitir inserção para autenticados" ON public.servicos_produtos
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Permitir atualização para autenticados" ON public.servicos_produtos
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Permitir exclusão para autenticados" ON public.servicos_produtos
    FOR DELETE TO authenticated USING (true);

-- Adicionar campo associado_id e dependente_id na tabela servicos_funerarios se não existirem
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'servicos_funerarios' AND COLUMN_NAME = 'associado_id') THEN
        ALTER TABLE public.servicos_funerarios ADD COLUMN associado_id uuid REFERENCES public.associados(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'servicos_funerarios' AND COLUMN_NAME = 'dependente_id') THEN
        ALTER TABLE public.servicos_funerarios ADD COLUMN dependente_id uuid REFERENCES public.dependentes(id);
    END IF;
END$$;


-- ############ 20240720000002_servico_financeiro.sql ############
-- Add financial fields to servicos_funerarios
ALTER TABLE public.servicos_funerarios ADD COLUMN IF NOT EXISTS valor_total decimal(12,2) DEFAULT 0;
ALTER TABLE public.servicos_funerarios ADD COLUMN IF NOT EXISTS desconto decimal(12,2) DEFAULT 0;
ALTER TABLE public.servicos_funerarios ADD COLUMN IF NOT EXISTS valor_final decimal(12,2) DEFAULT 0;

-- Table for items selected in the service
CREATE TABLE IF NOT EXISTS public.servico_itens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    servico_id uuid REFERENCES public.servicos_funerarios(id) ON DELETE CASCADE,
    item_id uuid REFERENCES public.servicos_produtos(id),
    nome text NOT NULL,
    quantidade integer DEFAULT 1,
    preco_unitario decimal(12,2) NOT NULL,
    subtotal decimal(12,2) NOT NULL,
    created_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.servico_itens TO authenticated;
GRANT ALL ON public.servico_itens TO service_role;

ALTER TABLE public.servico_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage items for their services" ON public.servico_itens
    FOR ALL TO authenticated USING (true) WITH CHECK (true);



-- ############ 20240721000000_servico_funerario.sql ############
-- Enum for Service Status
create type public.servico_status as enum ('Em Atendimento', 'Preparação', 'Velório', 'Sepultamento', 'Finalizado', 'Cancelado');

-- Enum for Payment Types
create type public.servico_tipo as enum ('Plano', 'Particular', 'Convênio', 'Prefeitura');

-- Services Table
create table public.servicos_funerarios (
    id uuid primary key default gen_random_uuid(),
    numero_servico serial,
    data_abertura timestamp with time zone default now(),
    data_obito date,
    hora_obito time,
    tipo servico_tipo not null,
    status servico_status default 'Em Atendimento',
    
    -- Falecido
    falecido_nome text not null,
    falecido_cpf text,
    falecido_rg text,
    falecido_sexo text,
    falecido_estado_civil text,
    falecido_data_nascimento date,
    falecido_naturalidade text,
    falecido_nacionalidade text,
    falecido_profissao text,
    falecido_nome_pai text,
    falecido_nome_mae text,
    falecido_endereco text,
    
    -- Informações do Óbito
    local_obito text,
    cidade_obito text,
    hospital_obito text,
    medico_responsavel text,
    causa_morte text,
    numero_do text,
    cartorio text,
    
    -- Responsável
    responsavel_nome text,
    responsavel_cpf text,
    responsavel_rg text,
    responsavel_telefone text,
    responsavel_whatsapp text,
    responsavel_parentesco text,
    responsavel_endereco text,
    responsavel_email text,
    
    -- Plano (optional link)
    associado_id uuid references public.associados(id),
    
    -- Equipe e Veículo
    agente_funerario text,
    motorista text,
    auxiliar text,
    tanatopraxista text,
    cerimonialista text,
    veiculo_placa text,
    km_saida numeric,
    km_retorno numeric,
    combustivel text,
    
    -- Velório e Sepultamento
    velorio_local text,
    velorio_cidade text,
    velorio_endereco text,
    velorio_capela text,
    velorio_inicio timestamp with time zone,
    velorio_termino timestamp with time zone,
    sepultamento_cemiterio text,
    sepultamento_cidade text,
    sepultamento_jazigo text,
    sepultamento_quadra text,
    sepultamento_lote text,
    sepultamento_horario timestamp with time zone,
    cremacao boolean default false,
    
    observacoes text,
    filial_id uuid references public.filiais(id),
    created_at timestamp with time zone default now()
);

-- Timeline for events
create table public.servico_timeline (
    id uuid primary key default gen_random_uuid(),
    servico_id uuid references public.servicos_funerarios(id) on delete cascade,
    evento text not null,
    created_at timestamp with time zone default now()
);

-- Checklist of services
create table public.servico_checklist (
    id uuid primary key default gen_random_uuid(),
    servico_id uuid references public.servicos_funerarios(id) on delete cascade,
    item text not null,
    concluido boolean default false
);

-- Financial records for service
create table public.servico_financeiro (
    id uuid primary key default gen_random_uuid(),
    servico_id uuid references public.servicos_funerarios(id) on delete cascade,
    valor_total numeric(12,2) default 0,
    desconto numeric(12,2) default 0,
    acrescimo numeric(12,2) default 0,
    valor_final numeric(12,2) default 0,
    status text default 'pendente'
);

-- Grants
grant select, insert, update, delete on public.servicos_funerarios to authenticated;
grant select, insert, update, delete on public.servico_timeline to authenticated;
grant select, insert, update, delete on public.servico_checklist to authenticated;
grant select, insert, update, delete on public.servico_financeiro to authenticated;

grant all on public.servicos_funerarios to service_role;
grant all on public.servico_timeline to service_role;
grant all on public.servico_checklist to service_role;
grant all on public.servico_financeiro to service_role;

-- RLS
alter table public.servicos_funerarios enable row level security;
alter table public.servico_timeline enable row level security;
alter table public.servico_checklist enable row level security;
alter table public.servico_financeiro enable row level security;

create policy "All authenticated can manage servicos" on public.servicos_funerarios for all to authenticated using (true);
create policy "All authenticated can manage servicos_timeline" on public.servico_timeline for all to authenticated using (true);
create policy "All authenticated can manage servicos_checklist" on public.servico_checklist for all to authenticated using (true);
create policy "All authenticated can manage servicos_financeiro" on public.servico_financeiro for all to authenticated using (true);


-- ############ 20240721000001_trigger_regeneration.sql ############
alter table public.associados add column __temp_regeneration_trigger boolean;
alter table public.associados drop column __temp_regeneration_trigger;


-- ############ 20260625175748_281881a4-a5b1-4fe8-82b8-fbbbe86d8d1f.sql ############

-- Roles enum + tables
CREATE TYPE public.app_role AS ENUM ('admin', 'operador');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_auth" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "user_roles_select_own_or_admin" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "user_roles_admin_manage" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- updated_at helper
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- Handle new user: create profile + default 'operador' role; first user becomes admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  user_count INT;
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email,'@',1)), NEW.email);

  SELECT count(*) INTO user_count FROM auth.users;
  IF user_count = 1 THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'operador');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Planos
CREATE TABLE public.planos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  valor_mensal NUMERIC(10,2) NOT NULL CHECK (valor_mensal >= 0),
  max_dependentes INT NOT NULL DEFAULT 0,
  cobertura TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planos TO authenticated;
GRANT ALL ON public.planos TO service_role;
ALTER TABLE public.planos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "planos_read" ON public.planos FOR SELECT TO authenticated USING (true);
CREATE POLICY "planos_admin_write" ON public.planos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER planos_touch BEFORE UPDATE ON public.planos
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Associados
CREATE TYPE public.status_associado AS ENUM ('ativo','inativo','suspenso');

CREATE TABLE public.associados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo SERIAL UNIQUE,
  nome TEXT NOT NULL,
  cpf TEXT UNIQUE,
  rg TEXT,
  data_nascimento DATE,
  telefone TEXT,
  email TEXT,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  plano_id UUID REFERENCES public.planos(id) ON DELETE RESTRICT,
  data_adesao DATE NOT NULL DEFAULT CURRENT_DATE,
  dia_vencimento INT NOT NULL DEFAULT 10 CHECK (dia_vencimento BETWEEN 1 AND 28),
  status public.status_associado NOT NULL DEFAULT 'ativo',
  observacoes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.associados TO authenticated;
GRANT ALL ON public.associados TO service_role;
ALTER TABLE public.associados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "associados_read" ON public.associados FOR SELECT TO authenticated USING (true);
CREATE POLICY "associados_write" ON public.associados FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER associados_touch BEFORE UPDATE ON public.associados
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Dependentes
CREATE TABLE public.dependentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  associado_id UUID NOT NULL REFERENCES public.associados(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cpf TEXT,
  data_nascimento DATE,
  parentesco TEXT NOT NULL,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dependentes TO authenticated;
GRANT ALL ON public.dependentes TO service_role;
ALTER TABLE public.dependentes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dependentes_all" ON public.dependentes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER dependentes_touch BEFORE UPDATE ON public.dependentes
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Mensalidades
CREATE TYPE public.status_mensalidade AS ENUM ('pendente','pago','atrasado','cancelado');

CREATE TABLE public.mensalidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  associado_id UUID NOT NULL REFERENCES public.associados(id) ON DELETE CASCADE,
  competencia DATE NOT NULL, -- primeiro dia do mes de referencia
  valor NUMERIC(10,2) NOT NULL CHECK (valor >= 0),
  vencimento DATE NOT NULL,
  data_pagamento DATE,
  forma_pagamento TEXT,
  status public.status_mensalidade NOT NULL DEFAULT 'pendente',
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(associado_id, competencia)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mensalidades TO authenticated;
GRANT ALL ON public.mensalidades TO service_role;
ALTER TABLE public.mensalidades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mensalidades_all" ON public.mensalidades FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER mensalidades_touch BEFORE UPDATE ON public.mensalidades
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_mensalidades_associado ON public.mensalidades(associado_id);
CREATE INDEX idx_mensalidades_status ON public.mensalidades(status);
CREATE INDEX idx_associados_status ON public.associados(status);
CREATE INDEX idx_dependentes_associado ON public.dependentes(associado_id);


-- ############ 20260625182225_92875f25-4886-40c2-ae1d-47c4835b03d4.sql ############

CREATE TYPE tipo_movimento AS ENUM ('entrada','saida');
CREATE TYPE status_conta AS ENUM ('pendente','pago','atrasado','cancelado');

CREATE TABLE public.centros_custo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  descricao text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.centros_custo TO authenticated;
GRANT ALL ON public.centros_custo TO service_role;
ALTER TABLE public.centros_custo ENABLE ROW LEVEL SECURITY;
CREATE POLICY centros_custo_all ON public.centros_custo FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_cc_updated BEFORE UPDATE ON public.centros_custo FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.contas_financeiras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo tipo_movimento NOT NULL,
  descricao text NOT NULL,
  categoria text,
  centro_custo_id uuid REFERENCES public.centros_custo(id) ON DELETE SET NULL,
  valor numeric(12,2) NOT NULL CHECK (valor >= 0),
  data_emissao date NOT NULL DEFAULT CURRENT_DATE,
  vencimento date NOT NULL,
  data_pagamento date,
  forma_pagamento text,
  status status_conta NOT NULL DEFAULT 'pendente',
  fornecedor_cliente text,
  observacoes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contas_financeiras TO authenticated;
GRANT ALL ON public.contas_financeiras TO service_role;
ALTER TABLE public.contas_financeiras ENABLE ROW LEVEL SECURITY;
CREATE POLICY contas_financeiras_all ON public.contas_financeiras FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_cf_updated BEFORE UPDATE ON public.contas_financeiras FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_cf_tipo ON public.contas_financeiras(tipo);
CREATE INDEX idx_cf_status ON public.contas_financeiras(status);
CREATE INDEX idx_cf_vencimento ON public.contas_financeiras(vencimento);
CREATE INDEX idx_cf_centro ON public.contas_financeiras(centro_custo_id);

INSERT INTO public.centros_custo (nome, descricao) VALUES
  ('Administrativo', 'Despesas administrativas gerais'),
  ('Operacional', 'Custos operacionais do serviço funerário'),
  ('Comercial', 'Marketing, vendas e captação'),
  ('Manutenção', 'Manutenção de instalações e veículos');


-- ############ 20260625190102_0b83ac2d-caec-490e-8f14-1acc61cc8e42.sql ############

-- Helper: admin or operador
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','operador'))
$$;

REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;

-- associados
DROP POLICY IF EXISTS associados_read ON public.associados;
DROP POLICY IF EXISTS associados_write ON public.associados;
CREATE POLICY associados_staff_all ON public.associados FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- dependentes
DROP POLICY IF EXISTS dependentes_all ON public.dependentes;
CREATE POLICY dependentes_staff_all ON public.dependentes FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- mensalidades
DROP POLICY IF EXISTS mensalidades_all ON public.mensalidades;
CREATE POLICY mensalidades_staff_all ON public.mensalidades FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- contas_financeiras
DROP POLICY IF EXISTS contas_financeiras_all ON public.contas_financeiras;
CREATE POLICY contas_financeiras_staff_all ON public.contas_financeiras FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- centros_custo
DROP POLICY IF EXISTS centros_custo_all ON public.centros_custo;
CREATE POLICY centros_custo_staff_all ON public.centros_custo FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- profiles
DROP POLICY IF EXISTS profiles_select_auth ON public.profiles;
CREATE POLICY profiles_select_own_or_admin ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

-- Lock down trigger functions: only the table owner (postgres) runs them
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
-- has_role is used inside RLS expressions, so authenticated needs EXECUTE; revoke from anon
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;


-- ############ 20260626180149_d673bb62-68ca-4fcc-99d9-35985ea55258.sql ############
ALTER TABLE public.planos DROP COLUMN IF EXISTS max_dependentes;

-- ############ 20260626181833_6f2b5850-a534-4aa4-b598-447c99e8d681.sql ############
ALTER TABLE public.planos ADD COLUMN IF NOT EXISTS taxa_adesao numeric(10,2) NOT NULL DEFAULT 0;

-- ############ 20260626183300_a72d3f6b-8767-406c-bab5-b6b364f6aa7c.sql ############
ALTER TABLE public.mensalidades ADD COLUMN IF NOT EXISTS agente_recebimento text;

-- ############ 20260626210900_8505b6dc-8290-4229-87a3-ba652f058c63.sql ############

CREATE SEQUENCE IF NOT EXISTS public.mensalidades_codigo_seq START 1000;
ALTER TABLE public.mensalidades
  ADD COLUMN IF NOT EXISTS codigo BIGINT UNIQUE DEFAULT nextval('public.mensalidades_codigo_seq');
ALTER SEQUENCE public.mensalidades_codigo_seq OWNED BY public.mensalidades.codigo;
UPDATE public.mensalidades SET codigo = nextval('public.mensalidades_codigo_seq') WHERE codigo IS NULL;
ALTER TABLE public.mensalidades ALTER COLUMN codigo SET NOT NULL;
CREATE INDEX IF NOT EXISTS mensalidades_codigo_idx ON public.mensalidades(codigo);


-- ############ 20260627023113_cea91803-6ca5-48e8-b80c-b74432605b9c.sql ############

CREATE TABLE public.baixa_sessoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agente text NOT NULL,
  data_recebimento date NOT NULL,
  responsavel_id uuid REFERENCES auth.users(id),
  responsavel_nome text,
  total_qtd int NOT NULL DEFAULT 0,
  total_valor numeric(12,2) NOT NULL DEFAULT 0,
  itens jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.baixa_sessoes TO authenticated;
GRANT ALL ON public.baixa_sessoes TO service_role;
ALTER TABLE public.baixa_sessoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_all_baixa_sessoes" ON public.baixa_sessoes FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE INDEX idx_baixa_sessoes_data ON public.baixa_sessoes(data_recebimento DESC);


-- ############ 20260627025243_e5dbc8ad-7f02-4cd2-a108-d847f90b9ab7.sql ############

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$function$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','operador'));
$function$;


-- ############ 20260629004937_0550dda2-472b-4345-9575-f072395db66e.sql ############
ALTER TABLE public.dependentes
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inativo','falecido')),
  ADD COLUMN IF NOT EXISTS data_falecimento DATE;

-- ############ 20260629152003_02071a3f-e978-4561-8ff9-8f9f1aee1b0a.sql ############
CREATE TABLE public.cobradores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  telefone TEXT,
  documento TEXT,
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cobradores TO authenticated;
GRANT ALL ON public.cobradores TO service_role;
ALTER TABLE public.cobradores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff manage cobradores" ON public.cobradores FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER trg_cobradores_updated BEFORE UPDATE ON public.cobradores
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ############ 20260629154235_9c3f3de2-5418-4278-9e32-29ac046b336b.sql ############

-- Add 'vendedor' role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'vendedor';

-- Pins table for sales mapping
CREATE TABLE public.vendas_pins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  associado_id uuid REFERENCES public.associados(id) ON DELETE SET NULL,
  plano_id uuid REFERENCES public.planos(id) ON DELETE SET NULL,
  nome text NOT NULL,
  telefone text,
  endereco text,
  status text NOT NULL DEFAULT 'prospect',
  observacoes text,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendas_pins TO authenticated;
GRANT ALL ON public.vendas_pins TO service_role;

ALTER TABLE public.vendas_pins ENABLE ROW LEVEL SECURITY;

-- Vendedor sees only own pins; staff (admin/operador) sees all
CREATE POLICY "vendedor_select_own_or_staff" ON public.vendas_pins
FOR SELECT TO authenticated
USING (
  vendedor_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'operador')
);

CREATE POLICY "vendedor_insert_own" ON public.vendas_pins
FOR INSERT TO authenticated
WITH CHECK (vendedor_id = auth.uid());

CREATE POLICY "vendedor_update_own_or_staff" ON public.vendas_pins
FOR UPDATE TO authenticated
USING (
  vendedor_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'operador')
);

CREATE POLICY "vendedor_delete_own_or_staff" ON public.vendas_pins
FOR DELETE TO authenticated
USING (
  vendedor_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'operador')
);

CREATE TRIGGER touch_vendas_pins
BEFORE UPDATE ON public.vendas_pins
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_vendas_pins_vendedor ON public.vendas_pins(vendedor_id);
CREATE INDEX idx_vendas_pins_status ON public.vendas_pins(status);


-- ############ 20260629155855_4d4432e3-2f11-4a55-a81b-19f118b60784.sql ############

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.configuracoes (
  id smallint PRIMARY KEY DEFAULT 1,
  nome_sistema text NOT NULL DEFAULT 'Memorial',
  subtitulo text,
  logo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT configuracoes_singleton CHECK (id = 1)
);

GRANT SELECT ON public.configuracoes TO anon, authenticated;
GRANT ALL ON public.configuracoes TO service_role;

ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Configuracoes leitura publica"
ON public.configuracoes FOR SELECT USING (true);

CREATE POLICY "Configuracoes admin update"
ON public.configuracoes FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Configuracoes admin insert"
ON public.configuracoes FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_configuracoes_updated_at
BEFORE UPDATE ON public.configuracoes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.configuracoes (id, nome_sistema, subtitulo)
VALUES (1, 'Memorial', 'Gestão de Planos')
ON CONFLICT (id) DO NOTHING;


-- ############ 20260629160739_e1910da7-b6a9-45a6-85cb-98f7f6b7704f.sql ############
ALTER TABLE public.vendas_pins ADD COLUMN IF NOT EXISTS municipio text, ADD COLUMN IF NOT EXISTS uf text;

-- ############ 20260629162832_d4e48994-e2ed-4496-9a34-3b540eb0c5e3.sql ############
ALTER TABLE public.vendas_pins
  ADD COLUMN IF NOT EXISTS tipo_venda text,
  ADD COLUMN IF NOT EXISTS data_retorno date;

-- ############ 20260629180221_b1ff01ff-3661-4a3c-87e3-7cbdbeae0497.sql ############
ALTER TABLE public.vendas_pins ADD COLUMN IF NOT EXISTS concorrente TEXT;

-- ############ 20260629192335_80e6ce7d-c852-4a6c-b301-d67ff31a2fd3.sql ############
ALTER TABLE public.associados
  ADD COLUMN IF NOT EXISTS forma_pagamento TEXT CHECK (forma_pagamento IN ('boleto','carne','escritorio','cobrador')),
  ADD COLUMN IF NOT EXISTS cobrador_id UUID REFERENCES public.cobradores(id) ON DELETE SET NULL;

-- ############ 20260629193336_a8121279-6733-4e5a-aee4-873d95422582.sql ############
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'cobrador';

-- ############ 20260629193358_74e73f45-4255-47ee-a805-d33abb2f750a.sql ############

CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.app_role NOT NULL,
  module text NOT NULL,
  allowed boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role, module)
);

GRANT SELECT ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated read permissions" ON public.role_permissions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manage permissions" ON public.role_permissions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER role_permissions_updated_at
  BEFORE UPDATE ON public.role_permissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.role_permissions (role, module, allowed) VALUES
  ('admin','dashboard',true),('admin','associados',true),('admin','planos',true),
  ('admin','financeiro',true),('admin','recebimento',true),('admin','empresa-financeiro',true),
  ('admin','contas',true),('admin','centros-custo',true),('admin','vendas',true),
  ('admin','vendas-relatorio',true),('admin','usuarios',true),('admin','configuracoes',true),
  ('operador','dashboard',true),('operador','associados',true),('operador','planos',true),
  ('operador','financeiro',true),('operador','recebimento',true),('operador','empresa-financeiro',true),
  ('operador','contas',true),('operador','centros-custo',true),('operador','vendas',false),
  ('operador','vendas-relatorio',false),('operador','usuarios',false),('operador','configuracoes',false),
  ('vendedor','dashboard',false),('vendedor','associados',false),('vendedor','planos',false),
  ('vendedor','financeiro',false),('vendedor','recebimento',false),('vendedor','empresa-financeiro',false),
  ('vendedor','contas',false),('vendedor','centros-custo',false),('vendedor','vendas',true),
  ('vendedor','vendas-relatorio',true),('vendedor','usuarios',false),('vendedor','configuracoes',false),
  ('cobrador','dashboard',false),('cobrador','associados',false),('cobrador','planos',false),
  ('cobrador','financeiro',false),('cobrador','recebimento',true),('cobrador','empresa-financeiro',false),
  ('cobrador','contas',false),('cobrador','centros-custo',false),('cobrador','vendas',false),
  ('cobrador','vendas-relatorio',false),('cobrador','usuarios',false),('cobrador','configuracoes',false)
ON CONFLICT (role, module) DO NOTHING;


-- ############ 20260629194231_023cb584-e207-43a0-a049-a793da5f77c7.sql ############

CREATE TABLE public.user_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module TEXT NOT NULL,
  allowed BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, module)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_permissions TO authenticated;
GRANT ALL ON public.user_permissions TO service_role;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage user_permissions" ON public.user_permissions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "user read own permissions" ON public.user_permissions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE TRIGGER trg_user_permissions_updated_at BEFORE UPDATE ON public.user_permissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ############ 20260629200256_17f4887d-e397-4ce2-9c11-494252104602.sql ############

-- Restrict role_permissions reads to admins only
DROP POLICY IF EXISTS "authenticated read permissions" ON public.role_permissions;

-- Convert has_role / is_staff to SECURITY DEFINER so they always read the full user_roles table
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','operador'));
$$;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated, service_role;


-- ############ 20260629213124_24b4328a-bc15-4e63-9316-807ad5b182d6.sql ############

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;

DROP POLICY IF EXISTS "Avatars public read" ON storage.objects;
CREATE POLICY "Avatars public read" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Avatars users upload own" ON storage.objects;
CREATE POLICY "Avatars users upload own" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Avatars users update own" ON storage.objects;
CREATE POLICY "Avatars users update own" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Avatars users delete own" ON storage.objects;
CREATE POLICY "Avatars users delete own" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);


-- ############ 20260629221913_9f12db5f-a47c-4042-8f20-3f0643db9d94.sql ############
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon;

-- ############ 20260629222017_aa7a0a0f-a30c-45d0-9acb-fe7719649691.sql ############

CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION private.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','operador'));
$$;

REVOKE EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.is_staff(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_staff(uuid) TO authenticated;

-- Recreate policies using private.* helpers
DROP POLICY IF EXISTS user_roles_select_own_or_admin ON public.user_roles;
DROP POLICY IF EXISTS user_roles_admin_manage ON public.user_roles;
CREATE POLICY user_roles_select_own_or_admin ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'));
CREATE POLICY user_roles_admin_manage ON public.user_roles FOR ALL USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS planos_admin_write ON public.planos;
CREATE POLICY planos_admin_write ON public.planos FOR ALL USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS associados_staff_all ON public.associados;
CREATE POLICY associados_staff_all ON public.associados FOR ALL USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));

DROP POLICY IF EXISTS dependentes_staff_all ON public.dependentes;
CREATE POLICY dependentes_staff_all ON public.dependentes FOR ALL USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));

DROP POLICY IF EXISTS mensalidades_staff_all ON public.mensalidades;
CREATE POLICY mensalidades_staff_all ON public.mensalidades FOR ALL USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));

DROP POLICY IF EXISTS contas_financeiras_staff_all ON public.contas_financeiras;
CREATE POLICY contas_financeiras_staff_all ON public.contas_financeiras FOR ALL USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));

DROP POLICY IF EXISTS centros_custo_staff_all ON public.centros_custo;
CREATE POLICY centros_custo_staff_all ON public.centros_custo FOR ALL USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));

DROP POLICY IF EXISTS profiles_select_own_or_admin ON public.profiles;
CREATE POLICY profiles_select_own_or_admin ON public.profiles FOR SELECT USING (auth.uid() = id OR private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS staff_all_baixa_sessoes ON public.baixa_sessoes;
CREATE POLICY staff_all_baixa_sessoes ON public.baixa_sessoes FOR ALL USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));

DROP POLICY IF EXISTS "staff manage cobradores" ON public.cobradores;
CREATE POLICY "staff manage cobradores" ON public.cobradores FOR ALL USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));

DROP POLICY IF EXISTS vendedor_select_own_or_staff ON public.vendas_pins;
DROP POLICY IF EXISTS vendedor_update_own_or_staff ON public.vendas_pins;
DROP POLICY IF EXISTS vendedor_delete_own_or_staff ON public.vendas_pins;
CREATE POLICY vendedor_select_own_or_staff ON public.vendas_pins FOR SELECT USING (vendedor_id = auth.uid() OR private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'operador'));
CREATE POLICY vendedor_update_own_or_staff ON public.vendas_pins FOR UPDATE USING (vendedor_id = auth.uid() OR private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'operador'));
CREATE POLICY vendedor_delete_own_or_staff ON public.vendas_pins FOR DELETE USING (vendedor_id = auth.uid() OR private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'operador'));

DROP POLICY IF EXISTS "Configuracoes admin update" ON public.configuracoes;
DROP POLICY IF EXISTS "Configuracoes admin insert" ON public.configuracoes;
CREATE POLICY "Configuracoes admin update" ON public.configuracoes FOR UPDATE USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));
CREATE POLICY "Configuracoes admin insert" ON public.configuracoes FOR INSERT WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "staff manages recebimentos_pendentes" ON public.recebimentos_pendentes;
CREATE POLICY "staff manages recebimentos_pendentes" ON public.recebimentos_pendentes FOR ALL USING (private.is_staff(auth.uid()) OR created_by = auth.uid()) WITH CHECK (private.is_staff(auth.uid()) OR created_by = auth.uid());

DROP POLICY IF EXISTS "admin manage permissions" ON public.role_permissions;
CREATE POLICY "admin manage permissions" ON public.role_permissions FOR ALL USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admin manage user_permissions" ON public.user_permissions;
CREATE POLICY "admin manage user_permissions" ON public.user_permissions FOR ALL USING (private.has_role(auth.uid(), 'admin')) WITH CHECK (private.has_role(auth.uid(), 'admin'));

-- Now drop the public helpers (no longer referenced)
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
DROP FUNCTION IF EXISTS public.is_staff(uuid);


-- ############ 20260630002152_9a7c4ddc-b31d-41e6-a741-ae9cff333665.sql ############
ALTER TABLE public.cobradores ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS cobradores_user_id_key ON public.cobradores(user_id) WHERE user_id IS NOT NULL;

-- Backfill: link existing cobradores to users by matching profile name (case-insensitive, trimmed)
UPDATE public.cobradores c
SET user_id = p.id
FROM public.profiles p
JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'cobrador'
WHERE c.user_id IS NULL
  AND lower(btrim(c.nome)) = lower(btrim(coalesce(p.nome, '')));

-- ############ 20260630003245_ec8c8681-a861-455d-9ec6-82ddaf993132.sql ############
CREATE POLICY "authenticated read active cobradores" ON public.cobradores FOR SELECT TO authenticated USING (ativo = true OR private.is_staff(auth.uid()));

-- ############ 20260630004054_044248d6-07c4-4372-bafa-49845a260eba.sql ############
CREATE POLICY associados_cobrador_read ON public.associados FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'cobrador'));
CREATE POLICY mensalidades_cobrador_read ON public.mensalidades FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'cobrador'));

-- ############ 20260630005719_dfc8faab-02ea-4c81-94cb-432114f08746.sql ############

-- Allow all authenticated users to read core operational tables
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'associados','mensalidades','dependentes','planos','cobradores',
    'centros_custo','contas_financeiras','baixa_sessoes','recebimentos_pendentes',
    'vendas_pins','configuracoes'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Authenticated can read %I" ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY "Authenticated can read %I" ON public.%I FOR SELECT TO authenticated USING (true)',
      t, t
    );
  END LOOP;
END$$;


-- ############ 20260630013215_de0c15f4-5184-4e89-b96b-20ba984e43db.sql ############
ALTER TABLE public.mensalidades ADD COLUMN IF NOT EXISTS reagendamento_data date;

-- ############ 20260630023633_bbb844c3-61a0-4fb2-aa30-ac33297761a7.sql ############

DROP POLICY IF EXISTS "Authenticated can read associados" ON public.associados;
DROP POLICY IF EXISTS "Authenticated can read dependentes" ON public.dependentes;
DROP POLICY IF EXISTS "Authenticated can read mensalidades" ON public.mensalidades;
DROP POLICY IF EXISTS "Authenticated can read cobradores" ON public.cobradores;
DROP POLICY IF EXISTS "Authenticated can read contas_financeiras" ON public.contas_financeiras;
DROP POLICY IF EXISTS "Authenticated can read baixa_sessoes" ON public.baixa_sessoes;
DROP POLICY IF EXISTS "Authenticated can read recebimentos_pendentes" ON public.recebimentos_pendentes;
DROP POLICY IF EXISTS "Authenticated can read vendas_pins" ON public.vendas_pins;

CREATE POLICY "Staff can read associados" ON public.associados FOR SELECT TO authenticated USING (private.is_staff(auth.uid()));
CREATE POLICY "Staff can read dependentes" ON public.dependentes FOR SELECT TO authenticated USING (private.is_staff(auth.uid()));
CREATE POLICY "Staff can read mensalidades" ON public.mensalidades FOR SELECT TO authenticated USING (private.is_staff(auth.uid()));
CREATE POLICY "Staff can read cobradores" ON public.cobradores FOR SELECT TO authenticated USING (private.is_staff(auth.uid()));
CREATE POLICY "Staff can read contas_financeiras" ON public.contas_financeiras FOR SELECT TO authenticated USING (private.is_staff(auth.uid()));
CREATE POLICY "Staff can read baixa_sessoes" ON public.baixa_sessoes FOR SELECT TO authenticated USING (private.is_staff(auth.uid()));
CREATE POLICY "Staff can read recebimentos_pendentes" ON public.recebimentos_pendentes FOR SELECT TO authenticated USING (private.is_staff(auth.uid()));


-- ############ 20260701112220_d3a518a5-bb06-4776-b176-c07165dc90ed.sql ############
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


-- ############ 20260701143227_09457da5-15b8-40e2-9943-39530ba2ffff.sql ############
CREATE TABLE public.crm_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  telefone text,
  email text,
  cidade text,
  origem text,
  plano_interesse uuid REFERENCES public.planos(id) ON DELETE SET NULL,
  valor_estimado numeric(12,2) DEFAULT 0,
  stage text NOT NULL DEFAULT 'novo',
  responsavel_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  observacoes text,
  ordem int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_leads TO authenticated;
GRANT ALL ON public.crm_leads TO service_role;

ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read crm_leads" ON public.crm_leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert crm_leads" ON public.crm_leads FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update crm_leads" ON public.crm_leads FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "staff delete crm_leads" ON public.crm_leads FOR DELETE TO authenticated USING (private.is_staff(auth.uid()));

CREATE TRIGGER crm_leads_touch BEFORE UPDATE ON public.crm_leads FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ############ 20260701144731_c58fae65-a907-4bc7-a4cc-1783f45663b6.sql ############

CREATE TABLE public.crm_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  color text NOT NULL DEFAULT 'bg-slate-500',
  ordem int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_stages TO authenticated;
GRANT ALL ON public.crm_stages TO service_role;
ALTER TABLE public.crm_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read stages" ON public.crm_stages FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth manage stages" ON public.crm_stages FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO public.crm_stages (key,label,color,ordem) VALUES
  ('novo','Novo','bg-slate-500',1),
  ('contato','Em contato','bg-blue-500',2),
  ('proposta','Proposta enviada','bg-amber-500',3),
  ('negociacao','Negociação','bg-purple-500',4),
  ('ganho','Ganho','bg-emerald-600',5),
  ('perdido','Perdido','bg-rose-600',6)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS vendas_pin_id uuid REFERENCES public.vendas_pins(id) ON DELETE SET NULL;


-- ############ 20260701144751_d01c05c1-8283-4001-819a-a7093638fc61.sql ############

DROP POLICY IF EXISTS "auth manage stages" ON public.crm_stages;
CREATE POLICY "staff insert stages" ON public.crm_stages FOR INSERT TO authenticated WITH CHECK (private.is_staff(auth.uid()));
CREATE POLICY "staff update stages" ON public.crm_stages FOR UPDATE TO authenticated USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));
CREATE POLICY "staff delete stages" ON public.crm_stages FOR DELETE TO authenticated USING (private.is_staff(auth.uid()));


-- ############ 20260705021414_20ba512a-f076-4f0c-92af-922f13462eeb.sql ############

DROP POLICY IF EXISTS "auth read crm_leads" ON public.crm_leads;
DROP POLICY IF EXISTS "auth insert crm_leads" ON public.crm_leads;
DROP POLICY IF EXISTS "auth update crm_leads" ON public.crm_leads;

CREATE POLICY "staff read crm_leads" ON public.crm_leads
  FOR SELECT USING (private.is_staff(auth.uid()));
CREATE POLICY "staff insert crm_leads" ON public.crm_leads
  FOR INSERT WITH CHECK (private.is_staff(auth.uid()));
CREATE POLICY "staff update crm_leads" ON public.crm_leads
  FOR UPDATE USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));

CREATE POLICY "admin read permissions" ON public.role_permissions
  FOR SELECT USING (private.has_role(auth.uid(), 'admin'::app_role));


-- ############ 20260705030847_13d65865-7fa3-4338-99ae-bf54e8bd12b8.sql ############
CREATE POLICY "cobrador_select_pins_dos_seus_associados" ON public.vendas_pins
FOR SELECT TO authenticated
USING (
  associado_id IN (
    SELECT a.id FROM public.associados a
    JOIN public.cobradores c ON c.id = a.cobrador_id
    WHERE c.user_id = auth.uid()
  )
);

-- ############ 20260705032741_14a41207-8fbe-4d1f-83ed-3c9f9d8b0bb7.sql ############

CREATE TABLE public.integracao_bancaria (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provedor TEXT NOT NULL,
  ambiente TEXT NOT NULL DEFAULT 'sandbox' CHECK (ambiente IN ('sandbox','producao')),
  ativo BOOLEAN NOT NULL DEFAULT false,
  config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  webhook_secret TEXT,
  secret_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provedor)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.integracao_bancaria TO authenticated;
GRANT ALL ON public.integracao_bancaria TO service_role;
ALTER TABLE public.integracao_bancaria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_integracao" ON public.integracao_bancaria FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (private.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "operador_read_integracao" ON public.integracao_bancaria FOR SELECT TO authenticated
  USING (true);
CREATE TRIGGER trg_integ_updated BEFORE UPDATE ON public.integracao_bancaria
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.webhook_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provedor TEXT NOT NULL,
  evento TEXT,
  payload JSONB NOT NULL,
  processado BOOLEAN NOT NULL DEFAULT false,
  erro TEXT,
  mensalidade_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.webhook_logs TO authenticated;
GRANT ALL ON public.webhook_logs TO service_role;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_read_webhook_logs" ON public.webhook_logs FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(),'admin'::app_role));

ALTER TABLE public.mensalidades
  ADD COLUMN IF NOT EXISTS cobranca_id TEXT,
  ADD COLUMN IF NOT EXISTS cobranca_provedor TEXT,
  ADD COLUMN IF NOT EXISTS linha_digitavel TEXT,
  ADD COLUMN IF NOT EXISTS codigo_barras TEXT,
  ADD COLUMN IF NOT EXISTS pix_copia_cola TEXT,
  ADD COLUMN IF NOT EXISTS qr_code_base64 TEXT,
  ADD COLUMN IF NOT EXISTS link_boleto TEXT,
  ADD COLUMN IF NOT EXISTS cobranca_status TEXT;

CREATE INDEX IF NOT EXISTS idx_mensalidades_cobranca_id ON public.mensalidades(cobranca_id);


-- ############ 20260705041605_ef365f09-e632-4a22-926f-fa0d8af4e9dd.sql ############
ALTER TABLE public.integracao_bancaria ADD COLUMN IF NOT EXISTS secrets_encrypted text;

-- ############ 20260716020833_28258357-d249-4cb0-9b54-6ac6ad4f1a3d.sql ############

-- Restrict banking integration reads to admins
DROP POLICY IF EXISTS "operador_read_integracao" ON public.integracao_bancaria;

-- Restrict centros_custo reads to staff
DROP POLICY IF EXISTS "Authenticated can read centros_custo" ON public.centros_custo;
CREATE POLICY "Staff can read centros_custo" ON public.centros_custo
  FOR SELECT TO authenticated
  USING (private.is_staff(auth.uid()));

-- Restrict crm_stages reads to staff
DROP POLICY IF EXISTS "auth read stages" ON public.crm_stages;
CREATE POLICY "staff read stages" ON public.crm_stages
  FOR SELECT TO authenticated
  USING (private.is_staff(auth.uid()));

-- Restrict configuracoes reads to authenticated only (remove anon public read)
DROP POLICY IF EXISTS "Configuracoes leitura publica" ON public.configuracoes;
-- "Authenticated can read configuracoes" already exists for authenticated role

-- Consolidate planos reads: keep single authenticated read policy
DROP POLICY IF EXISTS "Authenticated can read planos" ON public.planos;
-- "planos_read" remains for authenticated users (shared catalog data)


-- ############ 20260716030832_e106d8a0-926c-44a7-8645-a76fea212216.sql ############
-- Remove overly permissive policy exposing collector phone/document to all authenticated users.
DROP POLICY IF EXISTS "authenticated read active cobradores" ON public.cobradores;

-- Provide a safe view with only non-sensitive fields for any authenticated user that
-- needs to reference active collectors (name lookup, assignment dropdowns).
CREATE OR REPLACE VIEW public.cobradores_publicos
WITH (security_invoker = on) AS
SELECT id, nome, ativo, user_id
FROM public.cobradores
WHERE ativo = true;

GRANT SELECT ON public.cobradores_publicos TO authenticated;

-- Allow authenticated users to read the safe subset via the view by adding a narrow
-- SELECT policy that only exposes non-sensitive columns through it. The view uses
-- security_invoker so RLS on the base table still applies; add a policy scoped to
-- active rows but the view only exposes non-sensitive columns.
CREATE POLICY "authenticated read active cobradores (safe columns via view)"
ON public.cobradores
FOR SELECT
TO authenticated
USING (ativo = true);

-- ############ 20260716030850_a7aebe21-26fc-4f43-aa56-41d422db6bd4.sql ############
DROP POLICY IF EXISTS "authenticated read active cobradores (safe columns via view)" ON public.cobradores;

-- ############ 20260716030907_5be40e69-8dcb-4ca6-8e33-eeaecb381b76.sql ############
-- Recreate the safe view without security_invoker so it acts as a controlled gateway
-- exposing only non-sensitive collector columns. The base table RLS still protects
-- phone/document from direct queries.
DROP VIEW IF EXISTS public.cobradores_publicos;

CREATE VIEW public.cobradores_publicos AS
SELECT id, nome, ativo, user_id
FROM public.cobradores
WHERE ativo = true;

ALTER VIEW public.cobradores_publicos OWNER TO postgres;

GRANT SELECT ON public.cobradores_publicos TO authenticated;

-- ############ 20260716030926_22014df0-e8d4-4f67-b1ab-50006e27df73.sql ############
-- Drop the security-definer view; use column-level privileges instead.
DROP VIEW IF EXISTS public.cobradores_publicos;

-- Revoke broad table privileges then re-grant only non-sensitive columns to authenticated.
REVOKE SELECT ON public.cobradores FROM authenticated;
GRANT SELECT (id, nome, ativo, user_id) ON public.cobradores TO authenticated;
-- Staff paths use service_role or the staff RLS policy (which requires table-level SELECT
-- via the postgres role for definer functions); keep full access for service_role.
GRANT ALL ON public.cobradores TO service_role;

-- Row-level policy: authenticated users may select active rows (columns already limited by GRANT).
CREATE POLICY "authenticated read active cobradores (safe cols)"
ON public.cobradores
FOR SELECT
TO authenticated
USING (ativo = true OR private.is_staff(auth.uid()));

-- ############ 20260716031015_86283769-f0c9-4cd5-85fb-5ac9edcbf537.sql ############
-- Drop the just-added policy and column-level grants; simplify to staff-only reads.
DROP POLICY IF EXISTS "authenticated read active cobradores (safe cols)" ON public.cobradores;

-- Reset table privileges: staff paths are gated by RLS on the base table.
REVOKE ALL ON public.cobradores FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cobradores TO authenticated;
GRANT ALL ON public.cobradores TO service_role;

-- Existing policies remain:
--   * "Staff can read cobradores" (SELECT, is_staff)
--   * "staff manage cobradores" (ALL, is_staff)
-- Non-staff authenticated users cannot read cobradores rows anymore.

-- ############ 20260719003533_2b59371f-9672-4ecc-a7e0-2bc174c0dd07.sql ############
ALTER TABLE public.configuracoes 
  ADD COLUMN IF NOT EXISTS carteirinha_config jsonb,
  ADD COLUMN IF NOT EXISTS contrato_template text;

-- ############ 20260719032643_f0d0a252-8ea7-4639-b1ea-fe25ecac2a77.sql ############

CREATE TABLE public.filiais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  codigo TEXT,
  cidade TEXT,
  estado TEXT,
  endereco TEXT,
  telefone TEXT,
  responsavel TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.filiais TO authenticated;
GRANT ALL ON public.filiais TO service_role;

ALTER TABLE public.filiais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read filiais" ON public.filiais FOR SELECT TO authenticated USING (private.is_staff(auth.uid()));
CREATE POLICY "filiais_staff_all" ON public.filiais FOR ALL USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));

CREATE TRIGGER filiais_touch_updated_at BEFORE UPDATE ON public.filiais FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.associados ADD COLUMN filial_id UUID REFERENCES public.filiais(id) ON DELETE SET NULL;
ALTER TABLE public.contas_financeiras ADD COLUMN filial_id UUID REFERENCES public.filiais(id) ON DELETE SET NULL;

CREATE INDEX idx_associados_filial_id ON public.associados(filial_id);
CREATE INDEX idx_contas_financeiras_filial_id ON public.contas_financeiras(filial_id);


-- ############ 20260719034052_9e4f3493-383b-407c-8f64-b59497de5fcf.sql ############
ALTER TABLE public.configuracoes ADD COLUMN IF NOT EXISTS cnpj text, ADD COLUMN IF NOT EXISTS endereco text, ADD COLUMN IF NOT EXISTS telefone text;

-- ############ 20260720182025_9a651c26-e9c8-4c36-b57e-8640976aed8d.sql ############
ALTER TABLE public.configuracoes
  ADD COLUMN IF NOT EXISTS google_maps_browser_key text,
  ADD COLUMN IF NOT EXISTS google_maps_tracking_id text;

-- ############ 20260720183658_0ba8bcf4-7193-44b5-9b0c-34ab937e42a8.sql ############
ALTER TABLE public.contas_financeiras DROP COLUMN IF EXISTS centro_custo_id;
DROP TABLE IF EXISTS public.centros_custo CASCADE;

-- ############ 20260720193751_311835d6-6ca0-4888-b4c9-0ec643bc7358.sql ############
-- Re-running the module creation to ensure types are generated
create type public.servico_status as enum ('Em Atendimento', 'Preparação', 'Velório', 'Sepultamento', 'Finalizado', 'Cancelado');
create type public.servico_tipo as enum ('Plano', 'Particular', 'Convênio', 'Prefeitura');

create table public.servicos_funerarios (
    id uuid primary key default gen_random_uuid(),
    numero_servico serial,
    data_abertura timestamp with time zone default now(),
    data_obito date,
    hora_obito time,
    tipo servico_tipo not null,
    status servico_status default 'Em Atendimento',
    falecido_nome text not null,
    falecido_cpf text,
    falecido_rg text,
    falecido_sexo text,
    falecido_estado_civil text,
    falecido_data_nascimento date,
    falecido_naturalidade text,
    falecido_nacionalidade text,
    falecido_profissao text,
    falecido_nome_pai text,
    falecido_nome_mae text,
    falecido_endereco text,
    local_obito text,
    cidade_obito text,
    hospital_obito text,
    medico_responsavel text,
    causa_morte text,
    numero_do text,
    cartorio text,
    responsavel_nome text,
    responsavel_cpf text,
    responsavel_rg text,
    responsavel_telefone text,
    responsavel_whatsapp text,
    responsavel_parentesco text,
    responsavel_endereco text,
    responsavel_email text,
    associado_id uuid references public.associados(id),
    agente_funerario text,
    motorista text,
    auxiliar text,
    tanatopraxista text,
    cerimonialista text,
    veiculo_placa text,
    km_saida numeric,
    km_retorno numeric,
    combustivel text,
    velorio_local text,
    velorio_cidade text,
    velorio_endereco text,
    velorio_capela text,
    velorio_inicio timestamp with time zone,
    velorio_termino timestamp with time zone,
    sepultamento_cemiterio text,
    sepultamento_cidade text,
    sepultamento_jazigo text,
    sepultamento_quadra text,
    sepultamento_lote text,
    sepultamento_horario timestamp with time zone,
    cremacao boolean default false,
    observacoes text,
    filial_id uuid references public.filiais(id),
    created_at timestamp with time zone default now()
);

create table public.servico_timeline (
    id uuid primary key default gen_random_uuid(),
    servico_id uuid references public.servicos_funerarios(id) on delete cascade,
    evento text not null,
    created_at timestamp with time zone default now()
);

create table public.servico_checklist (
    id uuid primary key default gen_random_uuid(),
    servico_id uuid references public.servicos_funerarios(id) on delete cascade,
    item text not null,
    concluido boolean default false
);

create table public.servico_financeiro (
    id uuid primary key default gen_random_uuid(),
    servico_id uuid references public.servicos_funerarios(id) on delete cascade,
    valor_total numeric(12,2) default 0,
    desconto numeric(12,2) default 0,
    acrescimo numeric(12,2) default 0,
    valor_final numeric(12,2) default 0,
    status text default 'pendente'
);

grant select, insert, update, delete on public.servicos_funerarios to authenticated;
grant select, insert, update, delete on public.servico_timeline to authenticated;
grant select, insert, update, delete on public.servico_checklist to authenticated;
grant select, insert, update, delete on public.servico_financeiro to authenticated;

grant all on public.servicos_funerarios to service_role;
grant all on public.servico_timeline to service_role;
grant all on public.servico_checklist to service_role;
grant all on public.servico_financeiro to service_role;

alter table public.servicos_funerarios enable row level security;
alter table public.servico_timeline enable row level security;
alter table public.servico_checklist enable row level security;
alter table public.servico_financeiro enable row level security;

create policy "All authenticated can manage servicos" on public.servicos_funerarios for all to authenticated using (true);
create policy "All authenticated can manage servicos_timeline" on public.servico_timeline for all to authenticated using (true);
create policy "All authenticated can manage servicos_checklist" on public.servico_checklist for all to authenticated using (true);
create policy "All authenticated can manage servicos_financeiro" on public.servico_financeiro for all to authenticated using (true);


-- ############ 20260720201150_35e4c5fc-c687-4bd1-8c81-d2ec9ef31883.sql ############
CREATE TABLE IF NOT EXISTS public.servicos_produtos (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    nome text NOT NULL,
    tipo text NOT NULL CHECK (tipo IN ('Serviço', 'Produto')),
    preco numeric(12,2) NOT NULL DEFAULT 0,
    descricao text,
    ativo boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.servicos_produtos TO authenticated;
GRANT ALL ON public.servicos_produtos TO service_role;

ALTER TABLE public.servicos_produtos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura para autenticados" ON public.servicos_produtos
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Permitir inserção para autenticados" ON public.servicos_produtos
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Permitir atualização para autenticados" ON public.servicos_produtos
    FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Permitir exclusão para autenticados" ON public.servicos_produtos
    FOR DELETE TO authenticated USING (true);

ALTER TABLE public.servicos_funerarios ADD COLUMN IF NOT EXISTS associado_id uuid REFERENCES public.associados(id);
ALTER TABLE public.servicos_funerarios ADD COLUMN IF NOT EXISTS dependente_id uuid REFERENCES public.dependentes(id);

-- ############ 20260720233147_094e0081-4917-49ab-ad05-84cc1e018a55.sql ############
GRANT SELECT ON public.associados TO authenticated;
-- The existing policy might already cover it, but let's ensure it's broad enough for SELECT.
-- Actually, the existing policies are:
-- "Staff can read associados" (admin/operador)
-- "associados_cobrador_read" (cobrador restricted)
-- I will add a general read policy for all authenticated users to facilitate the funeral service search.
DROP POLICY IF EXISTS "Allow authenticated to select associados" ON public.associados;
CREATE POLICY "Allow authenticated to select associados" ON public.associados FOR SELECT TO authenticated USING (true);


-- ############ 20260720233707_1477e650-3065-4697-a119-3b8af95ced16.sql ############
DROP POLICY IF EXISTS "Allow authenticated to select dependentes" ON public.dependentes;
CREATE POLICY "Allow authenticated to select dependentes" ON public.dependentes FOR SELECT TO authenticated USING (true);

-- ############ 20260721001421_1dc7d01c-abe3-4036-b3e7-cf4571293761.sql ############

-- associados / dependentes / configuracoes: drop overly permissive SELECT
DROP POLICY IF EXISTS "Allow authenticated to select associados" ON public.associados;
DROP POLICY IF EXISTS "Allow authenticated to select dependentes" ON public.dependentes;
DROP POLICY IF EXISTS "Authenticated can read configuracoes" ON public.configuracoes;

CREATE POLICY "Staff can read configuracoes" ON public.configuracoes
  FOR SELECT TO authenticated
  USING (private.is_staff(auth.uid()));

-- servicos_funerarios: staff-only
DROP POLICY IF EXISTS "All authenticated can manage servicos" ON public.servicos_funerarios;
CREATE POLICY "Staff can manage servicos_funerarios" ON public.servicos_funerarios
  FOR ALL TO authenticated
  USING (private.is_staff(auth.uid()))
  WITH CHECK (private.is_staff(auth.uid()));

-- servico_checklist: staff-only
DROP POLICY IF EXISTS "All authenticated can manage servicos_checklist" ON public.servico_checklist;
CREATE POLICY "Staff can manage servico_checklist" ON public.servico_checklist
  FOR ALL TO authenticated
  USING (private.is_staff(auth.uid()))
  WITH CHECK (private.is_staff(auth.uid()));

-- servico_financeiro: staff-only
DROP POLICY IF EXISTS "All authenticated can manage servicos_financeiro" ON public.servico_financeiro;
CREATE POLICY "Staff can manage servico_financeiro" ON public.servico_financeiro
  FOR ALL TO authenticated
  USING (private.is_staff(auth.uid()))
  WITH CHECK (private.is_staff(auth.uid()));

-- servico_timeline: staff-only
DROP POLICY IF EXISTS "All authenticated can manage servicos_timeline" ON public.servico_timeline;
CREATE POLICY "Staff can manage servico_timeline" ON public.servico_timeline
  FOR ALL TO authenticated
  USING (private.is_staff(auth.uid()))
  WITH CHECK (private.is_staff(auth.uid()));

-- servicos_produtos: restrict writes to staff, keep read for authenticated
DROP POLICY IF EXISTS "Permitir atualização para autenticados" ON public.servicos_produtos;
DROP POLICY IF EXISTS "Permitir exclusão para autenticados" ON public.servicos_produtos;
DROP POLICY IF EXISTS "Permitir inserção para autenticados" ON public.servicos_produtos;

CREATE POLICY "Staff can insert servicos_produtos" ON public.servicos_produtos
  FOR INSERT TO authenticated
  WITH CHECK (private.is_staff(auth.uid()));

CREATE POLICY "Staff can update servicos_produtos" ON public.servicos_produtos
  FOR UPDATE TO authenticated
  USING (private.is_staff(auth.uid()))
  WITH CHECK (private.is_staff(auth.uid()));

CREATE POLICY "Staff can delete servicos_produtos" ON public.servicos_produtos
  FOR DELETE TO authenticated
  USING (private.is_staff(auth.uid()));


-- ############ 20260721133256_0ac540a3-e4bb-4ce6-9f13-1de9f69328df.sql ############

-- Add OS status enum values
ALTER TYPE servico_status ADD VALUE IF NOT EXISTS 'Aberta';
ALTER TYPE servico_status ADD VALUE IF NOT EXISTS 'Em Execução';
ALTER TYPE servico_status ADD VALUE IF NOT EXISTS 'Concluída';
ALTER TYPE servico_status ADD VALUE IF NOT EXISTS 'Cancelada';

-- Add OS-specific columns
ALTER TABLE public.servicos_funerarios
  ADD COLUMN IF NOT EXISTS atendente_nome text,
  ADD COLUMN IF NOT EXISTS autorizacao_responsavel text,
  ADD COLUMN IF NOT EXISTS os_hora time,
  ADD COLUMN IF NOT EXISTS os_data date,
  ADD COLUMN IF NOT EXISTS os_assinada_url text,
  ADD COLUMN IF NOT EXISTS os_materiais text;

-- Storage policies for os-assinadas
CREATE POLICY "Staff read os-assinadas"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'os-assinadas' AND private.is_staff(auth.uid()));

CREATE POLICY "Staff upload os-assinadas"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'os-assinadas' AND private.is_staff(auth.uid()));

CREATE POLICY "Staff update os-assinadas"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'os-assinadas' AND private.is_staff(auth.uid()));

CREATE POLICY "Staff delete os-assinadas"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'os-assinadas' AND private.is_staff(auth.uid()));


-- ############ 20260722145808_cc49e1c0-6e20-4c6b-9cbc-879010a3a8e7.sql ############
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'agente';
ALTER TABLE public.servicos_funerarios ADD COLUMN IF NOT EXISTS os_arquivos JSONB NOT NULL DEFAULT '[]'::jsonb;

-- ############ 20260729024000_3647f7db-172f-41b8-a4c8-2ebf959261d4.sql ############

-- 1) estoque_itens
CREATE TABLE public.estoque_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  unidade text,
  quantidade numeric NOT NULL DEFAULT 0,
  estoque_minimo numeric NOT NULL DEFAULT 0,
  produto_id uuid REFERENCES public.servicos_produtos(id) ON DELETE SET NULL,
  filial_id uuid REFERENCES public.filiais(id) ON DELETE SET NULL,
  ativo boolean NOT NULL DEFAULT true,
  observacoes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.estoque_itens TO authenticated;
GRANT ALL ON public.estoque_itens TO service_role;

ALTER TABLE public.estoque_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "estoque_itens_staff_all" ON public.estoque_itens
  FOR ALL TO authenticated
  USING (private.is_staff(auth.uid()))
  WITH CHECK (private.is_staff(auth.uid()));

CREATE TRIGGER estoque_itens_updated
  BEFORE UPDATE ON public.estoque_itens
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2) estoque_movimentos
CREATE TABLE public.estoque_movimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.estoque_itens(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('entrada','saida','ajuste')),
  quantidade numeric NOT NULL,
  servico_id uuid REFERENCES public.servicos_funerarios(id) ON DELETE SET NULL,
  observacao text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX estoque_movimentos_item_idx ON public.estoque_movimentos(item_id);
CREATE INDEX estoque_movimentos_servico_idx ON public.estoque_movimentos(servico_id);
-- idempotência de baixa por OS
CREATE UNIQUE INDEX estoque_movimentos_saida_por_os
  ON public.estoque_movimentos(servico_id, item_id)
  WHERE tipo = 'saida' AND servico_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.estoque_movimentos TO authenticated;
GRANT ALL ON public.estoque_movimentos TO service_role;

ALTER TABLE public.estoque_movimentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "estoque_movimentos_staff_all" ON public.estoque_movimentos
  FOR ALL TO authenticated
  USING (private.is_staff(auth.uid()))
  WITH CHECK (private.is_staff(auth.uid()));

-- 3) contas_financeiras: vínculo com serviço para idempotência
ALTER TABLE public.contas_financeiras
  ADD COLUMN IF NOT EXISTS servico_id uuid REFERENCES public.servicos_funerarios(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS contas_financeiras_servico_unico
  ON public.contas_financeiras(servico_id)
  WHERE servico_id IS NOT NULL;


-- ############ 20260729174301_95679c44-b0aa-47fb-87fb-d7c1073c68bd.sql ############
CREATE TABLE public.caixa_sessoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operador_id uuid,
  operador_nome text NOT NULL,
  filial_id uuid REFERENCES public.filiais(id) ON DELETE SET NULL,
  valor_abertura numeric NOT NULL DEFAULT 0,
  valor_fechamento_informado numeric,
  status text NOT NULL DEFAULT 'aberto',
  observacoes text,
  aberto_em timestamptz NOT NULL DEFAULT now(),
  fechado_em timestamptz,
  conta_financeira_id uuid REFERENCES public.contas_financeiras(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.caixa_movimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caixa_id uuid NOT NULL REFERENCES public.caixa_sessoes(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'entrada',
  descricao text NOT NULL,
  valor numeric NOT NULL,
  forma_pagamento text NOT NULL DEFAULT 'dinheiro',
  mensalidade_id uuid REFERENCES public.mensalidades(id) ON DELETE SET NULL,
  associado_id uuid REFERENCES public.associados(id) ON DELETE SET NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_caixa_movimentos_caixa ON public.caixa_movimentos(caixa_id);
CREATE INDEX idx_caixa_sessoes_status ON public.caixa_sessoes(status);

GRANT SELECT, INSERT, UPDATE ON public.caixa_sessoes TO authenticated;
GRANT ALL ON public.caixa_sessoes TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.caixa_movimentos TO authenticated;
GRANT ALL ON public.caixa_movimentos TO service_role;

ALTER TABLE public.caixa_sessoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caixa_movimentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff read caixa_sessoes" ON public.caixa_sessoes FOR SELECT TO authenticated USING (private.is_staff(auth.uid()));
CREATE POLICY "staff insert caixa_sessoes" ON public.caixa_sessoes FOR INSERT TO authenticated WITH CHECK (private.is_staff(auth.uid()));
CREATE POLICY "staff update caixa_sessoes" ON public.caixa_sessoes FOR UPDATE TO authenticated USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));

CREATE POLICY "staff read caixa_movimentos" ON public.caixa_movimentos FOR SELECT TO authenticated USING (private.is_staff(auth.uid()));
CREATE POLICY "staff insert caixa_movimentos" ON public.caixa_movimentos FOR INSERT TO authenticated WITH CHECK (private.is_staff(auth.uid()));
CREATE POLICY "staff update caixa_movimentos" ON public.caixa_movimentos FOR UPDATE TO authenticated USING (private.is_staff(auth.uid())) WITH CHECK (private.is_staff(auth.uid()));

CREATE TRIGGER trg_caixa_sessoes_updated_at BEFORE UPDATE ON public.caixa_sessoes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ############ 20260730140123_4bbf7272-2568-4dd3-a89d-c6ed762dfbac.sql ############
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_staff(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated;

-- ############ 20260730145748_a1535e72-3d1b-4b5b-b722-19dbc2c0d308.sql ############
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

-- ############ 20260730145812_eb176412-f853-416a-b5ee-89e7f91fce14.sql ############
REVOKE ALL ON FUNCTION public.registrar_log_auditoria() FROM PUBLIC, anon, authenticated;

-- ############ 20260730160142_35bf11c8-ef87-433c-88d1-765c2c21f9b3.sql ############
ALTER TABLE public.mensalidades
  ADD COLUMN IF NOT EXISTS bonificada boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bonificacao_motivo text,
  ADD COLUMN IF NOT EXISTS bonificado_por uuid,
  ADD COLUMN IF NOT EXISTS bonificado_por_nome text,
  ADD COLUMN IF NOT EXISTS bonificado_em timestamptz;

CREATE INDEX IF NOT EXISTS idx_mensalidades_bonificada ON public.mensalidades (bonificada) WHERE bonificada;

-- ############ 20260730161717_c3739728-6a34-481b-89fa-8e994709cd77.sql ############
CREATE OR REPLACE FUNCTION private.has_any_role(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id);
$$;

REVOKE ALL ON FUNCTION private.has_any_role(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_any_role(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "planos_read" ON public.planos;
CREATE POLICY "planos_read" ON public.planos
FOR SELECT TO authenticated
USING (private.has_any_role(auth.uid()));

DROP POLICY IF EXISTS "Permitir leitura para autenticados" ON public.servicos_produtos;
CREATE POLICY "servicos_produtos_read_staff" ON public.servicos_produtos
FOR SELECT TO authenticated
USING (private.is_staff(auth.uid()) OR private.has_role(auth.uid(), 'agente'::app_role));

DROP POLICY IF EXISTS "recebimentos_pendentes_cobrador_update_own" ON public.recebimentos_pendentes;
CREATE POLICY "recebimentos_pendentes_cobrador_update_own" ON public.recebimentos_pendentes
FOR UPDATE TO authenticated
USING (private.has_role(auth.uid(), 'cobrador'::app_role) AND created_by = auth.uid() AND status = 'pendente')
WITH CHECK (private.has_role(auth.uid(), 'cobrador'::app_role) AND created_by = auth.uid() AND status = 'pendente');

-- ############ 20260730162918_3ffd827c-dc59-4102-8468-975e2cddd189.sql ############
CREATE TABLE public.backup_config (
  id smallint PRIMARY KEY DEFAULT 1,
  ativo boolean NOT NULL DEFAULT false,
  periodicidade text NOT NULL DEFAULT 'diario',
  hora smallint NOT NULL DEFAULT 3,
  dia_semana smallint NOT NULL DEFAULT 1,
  dia_mes smallint NOT NULL DEFAULT 1,
  alerta_email text,
  tabelas text[] NOT NULL DEFAULT '{}',
  ultima_execucao timestamptz,
  ultimo_status text,
  ultimo_erro text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT backup_config_singleton CHECK (id = 1),
  CONSTRAINT backup_config_periodicidade CHECK (periodicidade IN ('diario','semanal','mensal'))
);

GRANT SELECT, INSERT, UPDATE ON public.backup_config TO authenticated;
GRANT ALL ON public.backup_config TO service_role;
ALTER TABLE public.backup_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins gerenciam config de backup" ON public.backup_config
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER backup_config_updated_at BEFORE UPDATE ON public.backup_config
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.backup_config (id) VALUES (1);

CREATE TABLE public.backup_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  user_nome text,
  user_email text,
  acao text NOT NULL,
  formato text,
  origem text NOT NULL DEFAULT 'manual',
  tabelas text[] NOT NULL DEFAULT '{}',
  registros integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'sucesso',
  erro text,
  detalhes jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT backup_logs_acao CHECK (acao IN ('gerar','baixar','restaurar','automatico'))
);

GRANT SELECT ON public.backup_logs TO authenticated;
GRANT ALL ON public.backup_logs TO service_role;
ALTER TABLE public.backup_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins leem logs de backup" ON public.backup_logs
  FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX backup_logs_created_at_idx ON public.backup_logs (created_at DESC);

-- ############ 20260730163348_27e8ca87-a46e-4e43-ba46-6b649f3e49e9.sql ############
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ############ 20260730163423_6b6003bc-1ace-451c-9cf5-c14a8a9dac53.sql ############
DROP EXTENSION IF EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ############ 20260730192404_25093a59-0140-4b4a-be00-93377f55cef5.sql ############
ALTER TABLE public.backup_config ADD COLUMN IF NOT EXISTS retencao_dias integer NOT NULL DEFAULT 90;

-- ############ 20260812172847_01e0b882-8651-4fcd-b3ca-94a7ec1ed87c.sql ############
DROP POLICY IF EXISTS "Avatars public read" ON storage.objects;
DROP POLICY IF EXISTS "Avatars owner read" ON storage.objects;
CREATE POLICY "Avatars owner read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ############ 20260813000000_create_tenants.sql ############
CREATE TABLE public.tenants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nome text NOT NULL,
    dominio text UNIQUE,
    status text NOT NULL DEFAULT 'ativo',
    configuracoes jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenants TO authenticated;
GRANT ALL ON public.tenants TO service_role;

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage tenants"
ON public.tenants
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Inserir o tenant principal (matriz/sistema atual)
INSERT INTO public.tenants (id, nome, status) 
VALUES ('00000000-0000-0000-0000-000000000000', 'Matriz Nuvem Planos', 'ativo');

-- Adicionar coluna tenant_id em tabelas principais para multi-empresa futuro
-- Nota: Por enquanto apenas criamos a gestão, sem migrar os dados existentes para isolamento total, 
-- permitindo que o usuário comece a gerenciar as empresas que compram o acesso.



-- ############ 20260813013913_50de3b24-fcb5-4b37-8c61-7d3f8c21ead8.sql ############
UPDATE public.configuracoes SET nome_sistema = 'Nuvem Planos' WHERE id = 1;

-- ############ 20260813175541_a3d17b61-ff93-41c1-ba78-342bf272f959.sql ############
-- Corrigindo a tabela tenants e as permissões de RLS
-- O erro anterior ocorreu porque a função has_role foi movida para o esquema 'private'

CREATE TABLE IF NOT EXISTS public.tenants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nome text NOT NULL,
    dominio text UNIQUE,
    status text NOT NULL DEFAULT 'ativo',
    configuracoes jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Garantir permissões para o Data API
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenants TO authenticated;
GRANT ALL ON public.tenants TO service_role;

-- Ativar RLS
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Criar política usando a função correta no esquema private
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Admins can manage tenants" ON public.tenants;
    
    -- Tenta usar private.has_role que é o padrão atual do projeto
    IF EXISTS (SELECT 1 FROM pg_proc n JOIN pg_namespace ns ON n.pronamespace = ns.oid WHERE ns.nspname = 'private' AND n.proname = 'has_role') THEN
        CREATE POLICY "Admins can manage tenants"
        ON public.tenants
        FOR ALL
        TO authenticated
        USING (private.has_role(auth.uid(), 'admin'));
    -- Fallback para public.has_role se private não existir (improvável dado o histórico)
    ELSIF EXISTS (SELECT 1 FROM pg_proc n JOIN pg_namespace ns ON n.pronamespace = ns.oid WHERE ns.nspname = 'public' AND n.proname = 'has_role') THEN
        CREATE POLICY "Admins can manage tenants"
        ON public.tenants
        FOR ALL
        TO authenticated
        USING (public.has_role(auth.uid(), 'admin'));
    END IF;
END $$;

-- Garantir que o tenant principal existe
INSERT INTO public.tenants (id, nome, status) 
VALUES ('00000000-0000-0000-0000-000000000000', 'Matriz Nuvem Planos', 'ativo')
ON CONFLICT (id) DO NOTHING;


-- ############ 20260813180033_243138b6-2597-4201-a397-d67a6d29c578.sql ############
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS cnpj text,
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS telefone text,
ADD COLUMN IF NOT EXISTS endereco text;
