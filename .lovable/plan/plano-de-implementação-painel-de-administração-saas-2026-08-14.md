# Plano de Implementação: Painel de Administração SaaS

Implementar um painel centralizado para gestão do ecossistema SaaS Nuvem Planos, permitindo que administradores do sistema gerenciem empresas (tenants), planos de assinatura e visualizem métricas globais.

## Alterações

### 1. Banco de Dados (Supabase)
- Criar a tabela `system_plans` para gerenciar os planos de acesso ao sistema (ex: Básico, Profissional, Enterprise).
- Atualizar a tabela `tenants` para incluir referência ao `plan_id`.
- Garantir RLS para que apenas super-admins (usuários vinculados ao tenant matriz) possam gerenciar estas tabelas.

### 2. Frontend (TanStack Router)
- Criar nova rota `/_authenticated/admin/dashboard` para visão geral do sistema.
- Criar nova rota `/_authenticated/admin/tenants` para listagem e edição de empresas.
- Criar nova rota `/_authenticated/admin/planos` para gestão dos pacotes de assinatura.
- Atualizar o `MODULES` no arquivo `src/lib/modules.ts` para incluir a seção "Administração do Sistema" visível apenas para super-admins.

### 3. Componentes
- Criar `AdminAppShell` ou adaptar o existente para lidar com o menu administrativo.
- Implementar diálogos de criação/edição para Tenants e Planos do Sistema.

## Detalhes Técnicos

### Esquema SQL
```sql
CREATE TABLE public.system_plans (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nome text NOT NULL,
    descricao text,
    preco_mensal numeric NOT NULL DEFAULT 0,
    limite_usuarios integer,
    limite_associados integer,
    recursos jsonb DEFAULT '[]',
    ativo boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_plans TO authenticated;
GRANT ALL ON public.system_plans TO service_role;

ALTER TABLE public.tenants ADD COLUMN plan_id uuid REFERENCES public.system_plans(id);

-- Políticas de RLS restritas ao Tenant Matriz (00000000-0000-0000-0000-000000000000)
```

### Lógica de Acesso
O acesso a este painel será restrito a usuários que pertençam ao tenant `00000000-0000-0000-0000-000000000000` (Matriz Nuvem Planos).
