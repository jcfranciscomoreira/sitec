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

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function obterPixDaCobranca(creds: AsaasCreds, cobrancaId: string) {
  for (let tentativa = 0; tentativa < 4; tentativa++) {
    try {
      const pix = await asaasFetch(creds, `/payments/${cobrancaId}/pixQrCode`);
      const pixCopiaCola = pix?.payload ?? null;
      const qrCodeBase64 = pix?.encodedImage ?? null;
      if (pixCopiaCola || qrCodeBase64) return { pixCopiaCola, qrCodeBase64 };
    } catch {
      // O Asaas pode levar alguns instantes para disponibilizar o PIX do boleto.
    }

    if (tentativa < 3) await wait(700 * (tentativa + 1));
  }

  return { pixCopiaCola: null, qrCodeBase64: null };
}

export async function testarConexaoAsaas(creds: AsaasCreds) {
  await asaasFetch(creds, "/myAccount");
  return { ok: true };
}

// Localiza ou cria o customer Asaas para o associado
async function upsertCustomer(creds: AsaasCreds, assoc: { id: string; nome: string; cpf?: string | null; email?: string | null; telefone?: string | null; }) {
  const cpf = (assoc.cpf ?? "").replace(/\D/g, "");
  if (cpf.length !== 11 && cpf.length !== 14) {
    throw new Error("CPF ou CNPJ não informado ou inválido");
  }
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

  // O Asaas também disponibiliza PIX para cobranças com boleto. A geração pode
  // ser assíncrona, então repetimos a consulta antes de devolver a cobrança.
  const { pixCopiaCola, qrCodeBase64 } = await obterPixDaCobranca(creds, cobrancaId);

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

// Cancela/remove a cobrança no Asaas
export async function cancelarCobrancaAsaas(apiKey: string, ambiente: Env, cobrancaId: string) {
  try {
    const r = await asaasFetch({ apiKey, ambiente }, `/payments/${cobrancaId}`, { method: "DELETE" });
    return { ok: true, deleted: r?.deleted ?? true };
  } catch (e: any) {
    const msg = String(e?.message ?? "");
    // Se já não existe no provedor, tratamos como sucesso
    if (/not found|não encontrad|inexistente|invalid object/i.test(msg)) return { ok: true, deleted: true };
    throw e;
  }
}

// Consulta status para reconciliação
export async function consultarCobrancaAsaas(apiKey: string, ambiente: Env, cobrancaId: string) {
  const r = await asaasFetch({ apiKey, ambiente }, `/payments/${cobrancaId}`);
  return {
    status: r.status as string,
    pago: r.status === "RECEIVED" || r.status === "CONFIRMED" || r.status === "RECEIVED_IN_CASH" || r.status === "SETTLED",
    dataPagamento: (r.paymentDate || r.clientPaymentDate) as string | null,
    valorPago: (r.value ?? null) as number | null,
  };
}
