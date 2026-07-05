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
