
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
