# Plano de Implementação: SaaS Multi-tenant (Nuvem Planos)

Transformação do sistema em uma plataforma SaaS multi-empresa com faturamento via Stripe, isolamento de dados e personalização por tenant.

## Objetivos
- Integrar Stripe para faturamento de assinaturas por empresa.
- Garantir isolamento de dados por `tenant_id` em todas as tabelas.
- Personalização de marca (logo, cores, nome) por tenant.
- Fluxo de onboarding automatizado (cadastro -> criação de empresa -> checkout).

## Etapas Técnicas

### 1. Banco de Dados (Supabase)
- Adicionar `tenant_id uuid references tenants(id)` em todas as tabelas operacionais:
  - `associados`, `planos`, `mensalidades`, `filiais`, `contas_financeiras`, `estoque_itens`, `servicos_funerarios`, etc.
- Atualizar políticas RLS para filtrar por `auth.uid()` -> `profiles.tenant_id`.
- Adicionar colunas de configuração visual na tabela `tenants`.
- Adicionar colunas para controle de assinatura Stripe na tabela `tenants` (`stripe_customer_id`, `stripe_subscription_id`, `plan_status`).

### 2. Autenticação e Onboarding
- Modificar `src/routes/auth.tsx`:
  - No `signUp`, criar um novo `tenant` e um `profile` vinculado a ele.
  - Definir o primeiro usuário como `admin`.
- Criar `src/lib/tenants.functions.ts` para gerenciar a criação de empresas.

### 3. Integração Stripe
- Habilitar Stripe via ferramenta Lovable.
- Criar rotas de API para checkout e webhooks (`src/routes/api/public/stripe-webhook.ts`).
- Adicionar middleware ou loader global para verificar status da assinatura antes de permitir acesso ao dashboard.

### 4. Personalização Visual (White-label)
- Criar um hook `useTenantConfig` para buscar as configurações do tenant atual.
- Injetar variáveis CSS (Tailwind v4) dinamicamente baseadas nas cores do tenant.
- Atualizar componentes de cabeçalho e login para usar o logo do tenant.

### 5. RBAC por Tenant
- Refinar a função `has_role` para validar o papel dentro do escopo do tenant do usuário.

## Detalhes Técnicos
- **Isolamento**: Cada consulta ao banco incluirá obrigatoriamente o filtro de `tenant_id`.
- **Faturamento**: O acesso ao sistema será bloqueado se `plan_status !== 'active'`.
- **Performance**: Usar cache para configurações do tenant para evitar múltiplas consultas durante a navegação.
