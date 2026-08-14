# Usuário mestre do sistema

Hoje o acesso ao painel SaaS depende apenas de "pertencer à empresa Matriz". Como os 5 usuários atuais estão na Matriz, qualquer um deles (inclusive cobradores e agente) consegue abrir o painel de administração do SaaS. A proposta cria um papel de mestre explícito e exclusivo para jcfranciscomoreira@gmail.com.

## O que muda

- Novo papel **super_admin**, concedido apenas a jcfranciscomoreira@gmail.com.
- O painel SaaS (Empresas, Planos, Dashboard do SaaS) passa a exigir esse papel — pertencer à Matriz deixa de bastar.
- O menu lateral só mostra os itens de administração do SaaS para o mestre.
- O mestre gerencia empresas, planos, assinaturas, usuários e o financeiro do SaaS. Ele **não** ganha acesso aos dados operacionais das funerárias (associados, mensalidades, serviços) — o isolamento por empresa continua valendo.
- Proteção contra remoção acidental: o painel de usuários não permite excluir o papel de mestre nem apagar a conta mestre, e o mestre não aparece como opção de troca de papel.
- Os demais usuários continuam na Matriz, como está hoje.

## Detalhes técnicos

Migração de banco:
- `ALTER TYPE app_role ADD VALUE 'super_admin'`.
- Inserir `user_roles(user_id, role)` = super_admin para `6e88db68-7ff4-4b6a-83eb-4a297ed4ff85`.
- Redefinir `private.is_super_admin(uuid)` para `EXISTS (select 1 from user_roles where user_id=_user_id and role='super_admin')`, mantendo a assinatura atual (usada nas políticas de profiles, user_roles e tenants criadas na última migração).
- Política de `system_plans` (`Super-admins can manage system plans`) e de `tenants` passam a usar `private.is_super_admin(auth.uid())` em vez da comparação direta com o id da Matriz.
- Trigger `BEFORE DELETE/UPDATE` em `user_roles` impedindo remover/alterar a linha super_admin desse usuário.
- Nenhuma política nova dando ao mestre leitura das tabelas operacionais.

Código:
- `src/lib/admin.functions.ts`: `isSuperAdmin` passa a consultar o papel super_admin.
- `src/routes/_authenticated/admin.tsx`: guarda por papel super_admin (consulta `user_roles`) em vez do tenant.
- `src/components/AppShell.tsx`: `isSuper` derivado do papel.
- `src/routes/_authenticated/usuarios.tsx`: esconder/bloquear ações sobre a conta mestre; `super_admin` não entra na lista de papéis atribuíveis.
- `src/lib/usuarios.functions.ts`: bloquear no servidor troca de papel e exclusão do usuário mestre.
- Regras de branding por empresa (`use-configuracoes.ts`, `configuracoes.tsx`) permanecem como estão.
