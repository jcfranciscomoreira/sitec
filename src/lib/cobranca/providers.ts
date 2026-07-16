// Registro de provedores bancários suportados.
// Para adicionar um novo banco, inclua uma entrada aqui e crie o adaptador em src/lib/cobranca/<slug>.ts

export type ProviderFieldType = "text" | "password" | "textarea";

export type ProviderField = {
  key: string;
  label: string;
  type: ProviderFieldType;
  secret?: boolean; // true = vai para Lovable Secrets (não guarda no banco)
  placeholder?: string;
  helper?: string;
  required?: boolean;
};

export type ProviderStep = { title: string; body: string };

export type ProviderMeta = {
  slug: string;
  nome: string;
  descricao: string;
  suportaBoleto: boolean;
  suportaPix: boolean;
  implementado: boolean;
  fields: ProviderField[];
  passos: ProviderStep[];
  urlWebhook: (slug: string) => string; // exibido na UI
};

// Nome do secret gerado automaticamente por provedor + campo.
export function secretName(providerSlug: string, fieldKey: string) {
  const s = providerSlug.toUpperCase().replace(/[^A-Z0-9]/g, "_");
  const f = fieldKey.toUpperCase().replace(/[^A-Z0-9]/g, "_");
  return `COBRANCA_${s}_${f}`;
}

export const PROVIDERS: ProviderMeta[] = [
  {
    slug: "asaas",
    nome: "Asaas",
    descricao: "API simples para boleto e PIX. Emissão instantânea e webhook de compensação.",
    suportaBoleto: true,
    suportaPix: true,
    implementado: true,
    fields: [
      {
        key: "api_key",
        label: "API Key",
        type: "password",
        secret: true,
        required: true,
        helper: "Copie em Asaas → Integrações → Chave da API.",
      },
      {
        key: "webhook_token",
        label: "Token do Webhook",
        type: "password",
        secret: true,
        helper: "Defina em Asaas → Integrações → Webhooks (asaas-access-token).",
      },
    ],
    passos: [
      { title: "1. Crie a conta", body: "Acesse asaas.com e crie sua conta (comece em sandbox: sandbox.asaas.com)." },
      { title: "2. Gere a API Key", body: "No painel, vá em Minha Conta → Integrações → Chave da API. Copie e cole no campo API Key abaixo." },
      { title: "3. Cadastre o webhook", body: "Ainda em Integrações → Webhooks, cadastre a URL do webhook exibida acima. Marque os eventos PAYMENT_RECEIVED e PAYMENT_CONFIRMED. Defina um token e cole aqui em 'Token do Webhook'." },
      { title: "4. Teste a conexão", body: "Clique em 'Testar conexão' para validar as credenciais." },
      { title: "5. Ative", body: "Marque como ativo e salve. As mensalidades poderão gerar boleto/PIX pelo Asaas." },
    ],
    urlWebhook: (slug) => `${typeof window !== "undefined" ? window.location.origin : ""}/api/public/webhooks/cobranca/${slug}`,
  },
  {
    slug: "mercadopago",
    nome: "Mercado Pago",
    descricao: "Boleto + PIX pela API do Mercado Pago (em breve — apenas configuração).",
    suportaBoleto: true,
    suportaPix: true,
    implementado: false,
    fields: [
      { key: "access_token", label: "Access Token", type: "password", secret: true, required: true, helper: "Painel Mercado Pago → Suas integrações → Credenciais." },
    ],
    passos: [
      { title: "1. Credenciais", body: "Copie o Access Token em Mercado Pago → Suas integrações → Credenciais de teste ou produção." },
      { title: "2. Cadastre o webhook", body: "Em Suas integrações → Notificações Webhooks, cadastre a URL acima e marque o evento 'payment'." },
    ],
    urlWebhook: (slug) => `${typeof window !== "undefined" ? window.location.origin : ""}/api/public/webhooks/cobranca/${slug}`,
  },
  {
    slug: "inter",
    nome: "Banco Inter",
    descricao: "API do Inter via mTLS (em breve — apenas configuração).",
    suportaBoleto: true,
    suportaPix: true,
    implementado: false,
    fields: [
      { key: "client_id", label: "Client ID", type: "text", required: true },
      { key: "client_secret", label: "Client Secret", type: "password", secret: true, required: true },
      { key: "certificado_pfx_base64", label: "Certificado .pfx (base64)", type: "textarea", secret: true, required: true, helper: "Converta o .pfx para base64 e cole aqui." },
      { key: "certificado_senha", label: "Senha do certificado", type: "password", secret: true },
      { key: "conta_corrente", label: "Conta corrente", type: "text", required: true },
    ],
    passos: [
      { title: "1. Solicite a API", body: "No Internet Banking Inter Empresa, vá em API do Inter e solicite acesso ao produto Cobrança." },
      { title: "2. Gere o certificado", body: "Baixe o .pfx no painel e converta em base64 (ex.: base64 -w0 certificado.pfx)." },
      { title: "3. Cole as credenciais", body: "Preencha os campos abaixo e cadastre o webhook depois de ativar." },
    ],
    urlWebhook: (slug) => `${typeof window !== "undefined" ? window.location.origin : ""}/api/public/webhooks/cobranca/${slug}`,
  },
  {
    slug: "sicoob",
    nome: "Sicoob",
    descricao: "API Cobrança Bancária Sicoob (em breve — apenas configuração).",
    suportaBoleto: true,
    suportaPix: false,
    implementado: false,
    fields: [
      { key: "client_id", label: "Client ID", type: "text", required: true },
      { key: "certificado_pfx_base64", label: "Certificado .pfx (base64)", type: "textarea", secret: true, required: true },
      { key: "certificado_senha", label: "Senha do certificado", type: "password", secret: true },
      { key: "numero_contrato", label: "Número do contrato", type: "text", required: true },
    ],
    passos: [
      { title: "1. Sandbox Sicoob", body: "Acesse developers.sicoob.com.br e crie um app na API Cobrança Bancária." },
      { title: "2. Certificado", body: "Baixe o certificado sandbox/produção e converta para base64." },
    ],
    urlWebhook: (slug) => `${typeof window !== "undefined" ? window.location.origin : ""}/api/public/webhooks/cobranca/${slug}`,
  },
  {
    slug: "bb",
    nome: "Banco do Brasil",
    descricao: "API Cobrança BB (boleto + PIX) via OAuth2 do Developers BB. Em breve — apenas configuração.",
    suportaBoleto: true,
    suportaPix: true,
    implementado: false,
    fields: [
      { key: "client_id", label: "Client ID", type: "text", required: true },
      { key: "client_secret", label: "Client Secret", type: "password", secret: true, required: true },
      { key: "developer_application_key", label: "gw-dev-app-key (Developer Application Key)", type: "password", secret: true, required: true, helper: "Chave da aplicação em developers.bb.com.br." },
      { key: "convenio", label: "Número do convênio", type: "text", required: true },
      { key: "agencia", label: "Agência", type: "text", required: true },
      { key: "conta", label: "Conta corrente", type: "text", required: true },
      { key: "carteira", label: "Carteira / variação", type: "text", placeholder: "17-35" },
    ],
    passos: [
      { title: "1. Cadastre-se no BB Developers", body: "Acesse developers.bb.com.br, crie uma aplicação e assine a API 'Cobranças'." },
      { title: "2. Obtenha as credenciais", body: "Copie Client ID, Client Secret e a Developer Application Key (gw-dev-app-key) do painel da aplicação." },
      { title: "3. Homologação", body: "Solicite ao gerente do BB o número do convênio de cobrança e libere o ambiente de produção após homologar em sandbox." },
      { title: "4. Webhook (opcional)", body: "O BB não envia webhooks nativos — a baixa é feita por consulta periódica. Configure o job de sincronização depois de ativar." },
    ],
    urlWebhook: (slug) => `${typeof window !== "undefined" ? window.location.origin : ""}/api/public/webhooks/cobranca/${slug}`,
  },
  {
    slug: "bradesco",
    nome: "Bradesco",
    descricao: "API Cobrança Bradesco (Bradesco Net Empresa) — em breve, apenas configuração.",
    suportaBoleto: true,
    suportaPix: true,
    implementado: false,
    fields: [
      { key: "client_id", label: "Client ID", type: "text", required: true },
      { key: "client_secret", label: "Client Secret", type: "password", secret: true, required: true },
      { key: "certificado_pfx_base64", label: "Certificado .pfx (base64)", type: "textarea", secret: true, required: true, helper: "Converta o .pfx para base64 (base64 -w0 cert.pfx)." },
      { key: "certificado_senha", label: "Senha do certificado", type: "password", secret: true },
      { key: "agencia", label: "Agência", type: "text", required: true },
      { key: "conta", label: "Conta corrente", type: "text", required: true },
      { key: "carteira", label: "Carteira", type: "text", placeholder: "09/25" },
    ],
    passos: [
      { title: "1. Contrate a API", body: "No Bradesco Net Empresa, contrate o serviço 'API Cobrança' com o gerente." },
      { title: "2. Certificado A1", body: "Emita o certificado A1 no e-CAC ou AC parceira, exporte como .pfx e converta em base64." },
      { title: "3. Credenciais", body: "Receba Client ID/Secret da equipe Bradesco e cadastre a URL de webhook do PIX." },
    ],
    urlWebhook: (slug) => `${typeof window !== "undefined" ? window.location.origin : ""}/api/public/webhooks/cobranca/${slug}`,
  },
  {
    slug: "itau",
    nome: "Itaú",
    descricao: "API Cobrança / PIX Itaú (Itaú Developers) — em breve, apenas configuração.",
    suportaBoleto: true,
    suportaPix: true,
    implementado: false,
    fields: [
      { key: "client_id", label: "Client ID", type: "text", required: true },
      { key: "client_secret", label: "Client Secret", type: "password", secret: true, required: true },
      { key: "certificado_pfx_base64", label: "Certificado .pfx (base64)", type: "textarea", secret: true, required: true },
      { key: "certificado_senha", label: "Senha do certificado", type: "password", secret: true },
      { key: "agencia", label: "Agência", type: "text", required: true },
      { key: "conta", label: "Conta corrente", type: "text", required: true },
      { key: "carteira", label: "Carteira", type: "text" },
      { key: "chave_pix", label: "Chave PIX (recebedor)", type: "text" },
    ],
    passos: [
      { title: "1. Itaú Developers", body: "Acesse developer.itau.com.br, crie a aplicação e assine as APIs 'Cobrança' e 'PIX Recebimentos'." },
      { title: "2. Certificado mTLS", body: "Gere o certificado A1 no iToken/AC, exporte como .pfx e cole em base64." },
      { title: "3. Ative na conta", body: "Solicite ao gerente a liberação do convênio de cobrança e da chave PIX vinculada." },
    ],
    urlWebhook: (slug) => `${typeof window !== "undefined" ? window.location.origin : ""}/api/public/webhooks/cobranca/${slug}`,
  },
  {
    slug: "santander",
    nome: "Santander",
    descricao: "API Santander Empresas (Cobrança + PIX) — em breve, apenas configuração.",
    suportaBoleto: true,
    suportaPix: true,
    implementado: false,
    fields: [
      { key: "client_id", label: "Client ID", type: "text", required: true },
      { key: "client_secret", label: "Client Secret", type: "password", secret: true, required: true },
      { key: "certificado_pfx_base64", label: "Certificado .pfx (base64)", type: "textarea", secret: true, required: true },
      { key: "certificado_senha", label: "Senha do certificado", type: "password", secret: true },
      { key: "estacao", label: "Estação (workspace)", type: "text", required: true, helper: "Código da estação de trabalho fornecido pelo banco." },
      { key: "convenio", label: "Convênio", type: "text", required: true },
    ],
    passos: [
      { title: "1. Solicite a API", body: "No Santander Empresas, peça ao gerente a contratação da API de Cobrança e PIX." },
      { title: "2. Portal Developer", body: "Acesse developer.santander.com.br, crie a aplicação e obtenha Client ID/Secret." },
      { title: "3. Certificado A1", body: "Emita/registre o certificado A1 e informe a estação de trabalho." },
    ],
    urlWebhook: (slug) => `${typeof window !== "undefined" ? window.location.origin : ""}/api/public/webhooks/cobranca/${slug}`,
  },
  {
    slug: "caixa",
    nome: "Caixa Econômica",
    descricao: "API SIGCB / PIX Caixa — em breve, apenas configuração.",
    suportaBoleto: true,
    suportaPix: true,
    implementado: false,
    fields: [
      { key: "client_id", label: "Client ID", type: "text", required: true },
      { key: "client_secret", label: "Client Secret", type: "password", secret: true, required: true },
      { key: "certificado_pfx_base64", label: "Certificado .pfx (base64)", type: "textarea", secret: true, required: true },
      { key: "certificado_senha", label: "Senha do certificado", type: "password", secret: true },
      { key: "convenio", label: "Código do beneficiário / convênio", type: "text", required: true },
      { key: "chave_pix", label: "Chave PIX", type: "text" },
    ],
    passos: [
      { title: "1. Contrate SIGCB", body: "Peça ao gerente Caixa a contratação do SIGCB (cobrança) e do produto PIX PJ." },
      { title: "2. Portal Developer", body: "Acesse developers.caixa.gov.br, crie a aplicação nas APIs 'Cobrança' e 'PIX'." },
      { title: "3. Certificado", body: "Emita o certificado A1, converta em base64 e informe a senha." },
    ],
    urlWebhook: (slug) => `${typeof window !== "undefined" ? window.location.origin : ""}/api/public/webhooks/cobranca/${slug}`,
  },
  {
    slug: "sicredi",
    nome: "Sicredi",
    descricao: "API Cobrança Sicredi (boleto + PIX) — em breve, apenas configuração.",
    suportaBoleto: true,
    suportaPix: true,
    implementado: false,
    fields: [
      { key: "client_id", label: "Client ID", type: "text", required: true },
      { key: "client_secret", label: "Client Secret", type: "password", secret: true, required: true },
      { key: "api_key", label: "API Key (x-api-key)", type: "password", secret: true, required: true },
      { key: "cooperativa", label: "Cooperativa", type: "text", required: true },
      { key: "posto", label: "Posto", type: "text", required: true },
      { key: "conta", label: "Conta corrente", type: "text", required: true },
      { key: "beneficiario", label: "Código do beneficiário", type: "text", required: true },
    ],
    passos: [
      { title: "1. Solicite ao Sicredi", body: "Na sua cooperativa, peça o cadastro no Portal API Sicredi (api.sicredi.com.br)." },
      { title: "2. Aplicação", body: "Crie a aplicação nos produtos 'Cobrança' e receba Client ID, Client Secret e x-api-key." },
      { title: "3. Dados da conta", body: "Preencha cooperativa, posto, conta e código do beneficiário fornecidos pela cooperativa." },
    ],
    urlWebhook: (slug) => `${typeof window !== "undefined" ? window.location.origin : ""}/api/public/webhooks/cobranca/${slug}`,
  },
  {
    slug: "safra",
    nome: "Banco Safra",
    descricao: "API Cobrança/PIX Safra — em breve, apenas configuração.",
    suportaBoleto: true,
    suportaPix: true,
    implementado: false,
    fields: [
      { key: "client_id", label: "Client ID", type: "text", required: true },
      { key: "client_secret", label: "Client Secret", type: "password", secret: true, required: true },
      { key: "certificado_pfx_base64", label: "Certificado .pfx (base64)", type: "textarea", secret: true, required: true },
      { key: "certificado_senha", label: "Senha do certificado", type: "password", secret: true },
      { key: "agencia", label: "Agência", type: "text", required: true },
      { key: "conta", label: "Conta corrente", type: "text", required: true },
    ],
    passos: [
      { title: "1. Solicite a API", body: "Com o gerente Safra, contrate a API de Cobrança/PIX (Safra Empresas)." },
      { title: "2. Credenciais", body: "Receba Client ID/Secret e emita o certificado A1 para mTLS." },
    ],
    urlWebhook: (slug) => `${typeof window !== "undefined" ? window.location.origin : ""}/api/public/webhooks/cobranca/${slug}`,
  },
  {
    slug: "banrisul",
    nome: "Banrisul",
    descricao: "API Cobrança Banrisul — em breve, apenas configuração.",
    suportaBoleto: true,
    suportaPix: true,
    implementado: false,
    fields: [
      { key: "client_id", label: "Client ID", type: "text", required: true },
      { key: "client_secret", label: "Client Secret", type: "password", secret: true, required: true },
      { key: "certificado_pfx_base64", label: "Certificado .pfx (base64)", type: "textarea", secret: true },
      { key: "certificado_senha", label: "Senha do certificado", type: "password", secret: true },
      { key: "agencia", label: "Agência", type: "text", required: true },
      { key: "conta", label: "Conta corrente", type: "text", required: true },
      { key: "convenio", label: "Convênio", type: "text", required: true },
    ],
    passos: [
      { title: "1. Portal Developer", body: "Acesse developers.banrisul.com.br, crie a aplicação e assine a API de Cobrança." },
      { title: "2. Credenciais", body: "Copie Client ID/Secret e informe o convênio fornecido pelo gerente." },
    ],
    urlWebhook: (slug) => `${typeof window !== "undefined" ? window.location.origin : ""}/api/public/webhooks/cobranca/${slug}`,
  },
  {
    slug: "efi",
    nome: "Efí (Gerencianet)",
    descricao: "PIX e boleto pela API Efí — em breve, apenas configuração.",
    suportaBoleto: true,
    suportaPix: true,
    implementado: false,
    fields: [
      { key: "client_id", label: "Client ID", type: "text", required: true },
      { key: "client_secret", label: "Client Secret", type: "password", secret: true, required: true },
      { key: "certificado_pem_base64", label: "Certificado .p12/.pem (base64)", type: "textarea", secret: true, required: true, helper: "Obrigatório para PIX." },
      { key: "chave_pix", label: "Chave PIX", type: "text" },
    ],
    passos: [
      { title: "1. Conta Efí", body: "Crie conta em sejaefi.com.br e habilite as APIs Boletos e PIX." },
      { title: "2. Aplicação", body: "Em 'API' → 'Minhas aplicações', crie a aplicação, obtenha Client ID/Secret e baixe o certificado PIX." },
      { title: "3. Webhook PIX", body: "Cadastre a URL de webhook acima na chave PIX cadastrada." },
    ],
    urlWebhook: (slug) => `${typeof window !== "undefined" ? window.location.origin : ""}/api/public/webhooks/cobranca/${slug}`,
  },
  {
    slug: "pagseguro",
    nome: "PagBank (PagSeguro)",
    descricao: "Cobrança via PagBank (boleto + PIX) — em breve, apenas configuração.",
    suportaBoleto: true,
    suportaPix: true,
    implementado: false,
    fields: [
      { key: "token", label: "Token da aplicação", type: "password", secret: true, required: true, helper: "Painel PagBank → Vendas Online → Integrações → Token." },
    ],
    passos: [
      { title: "1. Ative APIs", body: "No painel PagBank, habilite as APIs de Cobrança/Checkout." },
      { title: "2. Token", body: "Copie o token da aplicação em Integrações e cole abaixo. Cadastre a URL de webhook para 'Notificações de Transação'." },
    ],
    urlWebhook: (slug) => `${typeof window !== "undefined" ? window.location.origin : ""}/api/public/webhooks/cobranca/${slug}`,
  },
  {
    slug: "cora",
    nome: "Cora",
    descricao: "API Cora (boleto + PIX para PJ) — em breve, apenas configuração.",
    suportaBoleto: true,
    suportaPix: true,
    implementado: false,
    fields: [
      { key: "client_id", label: "Client ID", type: "text", required: true },
      { key: "certificado_pem_base64", label: "Certificado (base64)", type: "textarea", secret: true, required: true },
      { key: "chave_privada_pem_base64", label: "Chave privada (base64)", type: "textarea", secret: true, required: true },
    ],
    passos: [
      { title: "1. Ative a API", body: "No app Cora, vá em 'Mais' → 'Integrações' → 'Cora API' e gere o par certificado + chave privada." },
      { title: "2. Cole aqui", body: "Converta cada arquivo para base64 e cole nos campos respectivos, junto com o Client ID." },
    ],
    urlWebhook: (slug) => `${typeof window !== "undefined" ? window.location.origin : ""}/api/public/webhooks/cobranca/${slug}`,
  },
  {
    slug: "stone",
    nome: "Stone / Ton",
    descricao: "API Stone Banking (boleto + PIX) — em breve, apenas configuração.",
    suportaBoleto: true,
    suportaPix: true,
    implementado: false,
    fields: [
      { key: "client_id", label: "Client ID", type: "text", required: true },
      { key: "chave_privada_pem_base64", label: "Chave privada (PEM base64)", type: "textarea", secret: true, required: true, helper: "Chave usada para assinar o JWT de autenticação." },
      { key: "conta_id", label: "Account ID", type: "text", required: true },
    ],
    passos: [
      { title: "1. Onboarding Stone", body: "Solicite acesso à Stone Banking API (openbank.stone.com.br) e crie a aplicação." },
      { title: "2. Chave", body: "Gere o par de chaves conforme documentação e cadastre a pública na Stone; cole a privada aqui." },
    ],
    urlWebhook: (slug) => `${typeof window !== "undefined" ? window.location.origin : ""}/api/public/webhooks/cobranca/${slug}`,
  },
  {
    slug: "generico",
    nome: "Outro banco (manual)",
    descricao: "Guarda credenciais/observações e permite lançar cobranças manualmente. Sem geração automática de boleto.",
    suportaBoleto: false,
    suportaPix: false,
    implementado: false,
    fields: [
      { key: "observacoes", label: "Observações da integração", type: "textarea" },
    ],
    passos: [
      { title: "Uso manual", body: "Use este provedor quando não houver API disponível. Registre pagamentos manualmente pelo Financeiro." },
    ],
    urlWebhook: (slug) => `${typeof window !== "undefined" ? window.location.origin : ""}/api/public/webhooks/cobranca/${slug}`,
  },
];

export function getProvider(slug: string) {
  return PROVIDERS.find((p) => p.slug === slug);
}
