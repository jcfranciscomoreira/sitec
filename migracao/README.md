# Migração para um Supabase próprio (VPS / servidor com VPN)

Este guia leva o Nuvem Planos para um backend Supabase da **sua conta**, onde você
tem acesso total às chaves — inclusive a `SUPABASE_SERVICE_ROLE_KEY`.

---

## 1. Criar o projeto Supabase

1. Acesse https://supabase.com e crie um novo projeto (ou instale o Supabase
   self-hosted no seu servidor, se preferir manter tudo dentro da VPN).
2. Anote a região e a senha do banco.

## 2. Criar o schema

1. Abra **SQL Editor** no seu projeto.
2. Cole todo o conteúdo de `migracao/01-schema-completo.sql` e execute.
   - O arquivo contém, em ordem cronológica: tabelas, enums, funções,
     triggers, GRANTs e todas as políticas de segurança (RLS).
   - Se algum bloco falhar por objeto já existente, pode ignorar e seguir.

## 3. Configurar a autenticação

Em **Authentication → Providers / Settings** do seu projeto:

- Ative **Email** (senha).
- Desative "Confirm email" apenas se quiser cadastro imediato.
- Se usar Google, ative o provedor Google e cadastre o `redirect_uri`
  do seu domínio (ex.: `https://seudominio.com.br`).
- Em **URL Configuration**, defina `Site URL` e adicione as
  `Redirect URLs` do seu domínio.

## 4. Copiar as chaves

Em **Project Settings → API** copie:

| Valor no Supabase        | Variável de ambiente                              |
| ------------------------ | ------------------------------------------------- |
| Project URL              | `SUPABASE_URL` e `VITE_SUPABASE_URL`              |
| anon / publishable key   | `SUPABASE_PUBLISHABLE_KEY` e `VITE_SUPABASE_PUBLISHABLE_KEY` |
| service_role key         | `SUPABASE_SERVICE_ROLE_KEY` (**somente servidor**) |

> A `service_role` **nunca** pode ir para variáveis `VITE_*`: elas são
> embutidas no código do navegador e qualquer visitante conseguiria ler.

## 5. Variáveis de ambiente no seu servidor

Crie um `.env` no servidor onde o app roda (não versionar):

```env
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_PUBLISHABLE_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>

VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon key>

# Chave usada para criptografar os segredos da integração bancária
COBRANCA_ENCRYPTION_KEY=<gere com: openssl rand -hex 32>
```

Reinicie o processo do app depois de definir as variáveis.

## 6. Migrar os dados existentes

O próprio sistema já tem exportação/importação:

1. No sistema atual (Lovable Cloud), entre em **Configurações → Backup**.
2. Selecione **todas as tabelas** e gere um backup em **JSON**. Baixe o arquivo.
3. Suba o sistema apontando para o novo Supabase.
4. Crie o primeiro usuário administrador pela tela de cadastro.
5. Entre em **Configurações → Backup → Restaurar**, envie o JSON,
   confira a prévia e confirme a aplicação.

> Usuários de login (e-mail/senha) **não** são migrados pelo backup, pois ficam
> no schema `auth`. Recadastre-os em **Usuários** ou peça que redefinam a senha.

## 7. Webhooks e integrações

- Integração bancária (Asaas): atualize a URL do webhook no painel do provedor
  para `https://seudominio.com.br/api/public/webhooks/cobranca/asaas`.
- Backup automático: `https://seudominio.com.br/api/public/hooks/backup-automatico`.
- Google Maps: reconfigure a chave em **Configurações → Mapa**.

## 8. Checklist final

- [ ] Login e cadastro funcionando
- [ ] Módulo **Usuários** abrindo (valida a `service_role`)
- [ ] Associados, mensalidades e caixa carregando dados
- [ ] Impressões (contrato, carnê, carteirinha) com o logo correto
- [ ] Webhook bancário recebendo eventos
