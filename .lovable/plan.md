
# Integração Bancária — Boleto, PIX e Compensação Automática

## O que vai ser entregue

**1. Nova aba "Integração Bancária" em Configurações**
- Você escolhe o provedor num dropdown (começamos com os que têm API pública documentada e webhook de compensação):
  - **Asaas** (recomendado — mais simples)
  - **Mercado Pago**
  - **Banco Inter** (requer certificado .pfx)
  - **Sicoob** (requer certificado)
  - **Genérico / Outro** (só armazena credenciais; emissão manual)
- Formulário dinâmico: os campos aparecem conforme o provedor escolhido (API Key, Client ID/Secret, certificado, carteira, conta, etc.).
- Botão **"Testar conexão"** que valida as credenciais chamando o endpoint de saúde de cada provedor.
- Passo a passo em tela para cada provedor: onde tirar a API Key, como cadastrar o webhook, qual URL colar no painel do banco.
- Opção sandbox/produção.

**2. Botão "Gerar boleto/PIX" nas mensalidades**
- No módulo Financeiro, ao lado de cada mensalidade pendente cujo associado tem forma de pagamento **boleto** ou **pix**, aparece o botão "Gerar cobrança".
- Ao clicar: chama o provedor configurado, salva `id_cobranca`, `linha_digitavel`, `codigo_barras`, `pix_copia_cola`, `qr_code_base64`, `link_boleto` na mensalidade.
- Diálogo mostra o boleto + QR Code + botão copiar linha digitável / código PIX / baixar PDF.
- Botão "Gerar em lote" para todas as pendentes do mês.

**3. Compensação automática via webhook**
- Endpoint público `/api/public/webhooks/cobranca/{provedor}` que recebe a notificação de pagamento do banco.
- Verifica assinatura/token do webhook.
- Localiza a mensalidade pelo `id_cobranca`, marca como **paga**, grava `data_pagamento`, `forma_pagamento`, valor recebido.
- Log de webhooks recebidos em nova tabela `webhook_logs` para auditoria.

## Estrutura técnica

**Banco de dados (migration):**
- Tabela `integracao_bancaria`: `provedor`, `ambiente` (sandbox/producao), `config_json` (campos não-secretos), `ativo`, `webhook_secret`.
- Credenciais sensíveis (API keys, client secrets, senhas de certificado) vão em **secrets** do Lovable Cloud, nunca no banco.
- Colunas novas em `mensalidades`: `cobranca_id`, `cobranca_provedor`, `linha_digitavel`, `codigo_barras`, `pix_copia_cola`, `qr_code_base64`, `link_boleto`, `cobranca_status`.
- Tabela `webhook_logs`: `provedor`, `payload`, `processado`, `erro`, `mensalidade_id`.

**Server functions (`src/lib/cobranca.functions.ts`):**
- `criarCobranca({ mensalidade_id })` — carrega config, chama o provedor certo, salva retorno.
- `testarConexao({ provedor })` — valida credenciais.
- `sincronizarCobranca({ mensalidade_id })` — consulta status manualmente (fallback caso webhook falhe).

**Adaptadores por provedor** (`src/lib/cobranca/`):
- `asaas.ts`, `mercadopago.ts`, `inter.ts`, `sicoob.ts` — cada um exporta `criar`, `consultar`, `validarWebhook`.
- Interface comum permite adicionar novos bancos sem tocar no resto.

**Server route (`src/routes/api/public/webhooks/cobranca.$provedor.ts`):**
- POST público, valida assinatura, atualiza mensalidade, loga.
- URL estável: `https://project--3e3c3d78-....lovable.app/api/public/webhooks/cobranca/asaas` — é essa que você cola no painel do banco.

## O que preciso de você durante a implementação

Depois que a aba estiver pronta, você entra em Configurações → Integração Bancária, escolhe o provedor e cola as credenciais (aparece um formulário seguro do Lovable para as chaves secretas). O passo a passo dentro da aba explica onde tirar cada valor no painel de cada banco.

## Fora de escopo desta entrega

- Registro de boleto direto no CIP/Bacen sem intermediário (exige homologação bancária de meses).
- Conciliação de extrato bancário (OFX/CNAB) — só compensamos o que o webhook do provedor informar.
- Geração de PDF do boleto no servidor (usamos o PDF que o próprio provedor retorna).

Aprove pra eu começar pela migration + aba de configuração, e depois o adaptador do primeiro provedor que você quiser ativar.
