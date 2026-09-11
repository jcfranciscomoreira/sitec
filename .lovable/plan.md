# Corrigir isolamento de usuários por empresa

## Objetivo
Garantir que cada administrador gerencie apenas os usuários da própria empresa, enquanto o usuário mestre mantém a visão global exclusivamente no console da plataforma.

## Alterações
- Corrigir o cadastro de uma nova empresa para vincular, de forma atômica, o novo administrador ao tenant recém-criado em `profiles` e `user_roles`.
- Corrigir a criação de funcionários para herdar obrigatoriamente o tenant do administrador que os criou.
- Filtrar listagem, alteração de perfil, permissões, redefinição de senha e exclusão pelo tenant do administrador solicitante.
- Separar a listagem global usada pelo console da plataforma, protegendo-a para `super_admin`.
- Reforçar no banco a consistência entre o tenant do perfil e o tenant do papel do usuário, sem misturar empresas.
- Reparar as contas recentes que ficaram sem empresa somente quando for possível identificar o vínculo correto com segurança; casos ambíguos permanecerão sinalizados para decisão manual.

## Validação
- Confirmar que um administrador comum vê e gerencia somente usuários da própria empresa.
- Confirmar que um usuário recém-cadastrado como dono recebe uma empresa exclusiva e papel de administrador nela.
- Confirmar que o usuário mestre continua vendo todas as contas no console.
- Verificar compilação, regras de acesso e os vínculos persistidos no banco.
