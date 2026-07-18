// Adaptador do Asaas. Server-only.
// Docs: https://docs.asaas.com/

type Env = "sandbox" | "producao";

function baseUrl(env: Env) {
  return env === "producao" ? "https://api.asaas.com/v3" : "https://sandbox.asaas.com/api/v3";
}

type AsaasCreds = { apiKey: string; ambiente: Env };

async function asaasFetch(creds: AsaasCreds, path: string, init?: RequestInit) {
  const res = await fetch(`${baseUrl(creds.ambiente)}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "SITEC-Cobranca/1.0",
      access_token: creds.apiKey,
      ...(init?.headers as Record<string, string> | undefined),
    },
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg = json?.errors?.[0]?.description || json?.message || `Asaas HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json;
}

export async function testarConexaoAsaas(creds: AsaasCreds) {
  await asaasFetch(creds, "/myAccount");
  return { ok: true };
}

// Localiza ou cria o customer Asaas para o associado
async function upsertCustomer(creds: AsaasCreds, assoc: { id: string; nome: string; cpf?: string | null; email?: string | null; telefone?: string | null; }) {
  const cpf = (assoc.cpf ?? "").replace(/\D/g, "");
  // busca por cpf
  if (cpf) {
    const found = await asaasFetch(creds, `/customers?cpfCnpj=${cpf}`);
    if (found?.data?.[0]?.id) return found.data[0].id as string;
  }
  const created = await asaasFetch(creds, "/customers", {
    method: "POST",
    body: JSON.stringify({
      name: assoc.nome,
      cpfCnpj: cpf || undefined,
      email: assoc.email || undefined,
      mobilePhone: (assoc.telefone ?? "").replace(/\D/g, "") || undefined,
      externalReference: assoc.id,
    }),
  });
  return created.id as string;
}

export type CriarCobrancaInput = {
  ambiente: Env;
  apiKey: string;
  associado: { id: string; nome: string; cpf?: string | null; email?: string | null; telefone?: string | null; };
  mensalidade: { id: string; valor: number; vencimento: string; descricao: string; forma: "boleto" | "pix" | "boleto_pix" };
};

export async function criarCobrancaAsaas(input: CriarCobrancaInput) {
  const creds: AsaasCreds = { apiKey: input.apiKey, ambiente: input.ambiente };
  const customerId = await upsertCustomer(creds, input.associado);

  const billingType = input.mensalidade.forma === "pix" ? "PIX"
    : input.mensalidade.forma === "boleto" ? "BOLETO"
    : "UNDEFINED"; // UNDEFINED = cliente escolhe (boleto ou pix)

  const cobranca = await asaasFetch(creds, "/payments", {
    method: "POST",
    body: JSON.stringify({
      customer: customerId,
      billingType,
      value: Number(input.mensalidade.valor),
      dueDate: input.mensalidade.vencimento,
      description: input.mensalidade.descricao,
      externalReference: input.mensalidade.id,
    }),
  });

  const cobrancaId: string = cobranca.id;

  // PIX QR
  let pixCopiaCola: string | null = null;
  let qrCodeBase64: string | null = null;
  if (billingType !== "BOLETO") {
    try {
      const pix = await asaasFetch(creds, `/payments/${cobrancaId}/pixQrCode`);
      pixCopiaCola = pix?.payload ?? null;
      qrCodeBase64 = pix?.encodedImage ?? null;
    } catch { /* boleto puro não retorna pix */ }
  }

  // Boleto
  let linhaDigitavel: string | null = null;
  let codigoBarras: string | null = null;
  let linkBoleto: string | null = cobranca.invoiceUrl ?? null;
  if (billingType !== "PIX") {
    try {
      const b = await asaasFetch(creds, `/payments/${cobrancaId}/identificationField`);
      linhaDigitavel = b?.identificationField ?? null;
      codigoBarras = b?.barCode ?? null;
      linkBoleto = cobranca.bankSlipUrl ?? linkBoleto;
    } catch { /* ignore */ }
  }

  return {
    cobrancaId,
    status: (cobranca.status ?? "PENDING") as string,
    linhaDigitavel,
    codigoBarras,
    pixCopiaCola,
    qrCodeBase64,
    linkBoleto,
  };
}

// Consulta status para reconciliação
export async function consultarCobrancaAsaas(apiKey: string, ambiente: Env, cobrancaId: string) {
  const r = await asaasFetch({ apiKey, ambiente }, `/payments/${cobrancaId}`);
  return {
    status: r.status as string,
    pago: r.status === "RECEIVED" || r.status === "CONFIRMED" || r.status === "RECEIVED_IN_CASH",
    dataPagamento: (r.paymentDate || r.clientPaymentDate) as string | null,
    valorPago: (r.value ?? null) as number | null,
  };
}
