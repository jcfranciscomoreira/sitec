# Plano de Consolidação da Gestão SaaS

O objetivo é centralizar a gestão de empresas e planos no painel administrativo do SaaS, corrigindo o fluxo de cadastro e implementando o controle financeiro (assinaturas, expiração e planos mensais/semestrais/anuais).

## Alterações Sugeridas

### 1. Limpeza e Consolidação da Interface
- **Remover Módulo Redundante**: Remover "Gestão de Empresas" (`/empresas`) do menu lateral em `src/lib/modules.ts`. Esta funcionalidade agora está centralizada em "Empresas SaaS" (`/admin/tenants`), acessível apenas para super-admins da Matriz.
- **Remover Botão de Inserção Indireta**: Garantir que novos tenants sejam criados apenas via fluxo de cadastro ou pelo painel centralizado de admin, removendo diálogos de criação manual espalhados pelo sistema que não seguem o fluxo de provisionamento SaaS.

### 2. Correção do Fluxo de Cadastro e Autenticação
- **Bug de Credenciais**: Investigar e corrigir o erro de credenciais no cadastro em `src/routes/auth.tsx`. O problema parece ocorrer na tentativa de login imediato após o `signUp`.
- **Provisionamento Automático**: Refinar a server function `createTenant` em `src/lib/tenants.functions.ts` para garantir que toda nova conta receba um tenant_id, perfil configurado e o período de teste (trial) de 30 dias.

### 3. Gestão de Planos e Assinaturas (SaaS Financeiro)
- **Expiração de 30 Dias**: Implementar lógica de expiração baseada na data de criação do tenant.
- **Frequência de Pagamento**: Adicionar suporte a planos Mensais, Semestrais e Anuais na tabela `system_plans` e na interface de gestão.
- **Bloqueio de Acesso**: Adicionar um guardião de rota que redireciona para uma página de "Assinatura Expirada" caso o tenant esteja com plano vencido e sem pagamento confirmado.

### 4. Painel Financeiro SaaS
- **Dashboard Global**: Expandir `src/routes/_authenticated/admin/dashboard.tsx` para incluir métricas financeiras (MRR - Receita Recorrente Mensal, Churn, Projeção).
- **Gestão de Status**: Em `src/routes/_authenticated/admin/tenants.tsx`, adicionar a funcionalidade de "Gerenciar" para permitir que o administrador altere o status do plano (Ativo, Pendente, Suspenso) e a data de expiração manualmente.

## Detalhes Técnicos
- **Banco de Dados**: Nova migração para adicionar `expired_at` em `tenants` e campos de periodicidade em `system_plans`.
- **Middlewares**: Reforçar o check de `isSuper` em `src/routes/_authenticated/admin.tsx`.
- **TanStack Start**: Uso de Server Functions para processar pagamentos simulados ou integração futura com gateway.
