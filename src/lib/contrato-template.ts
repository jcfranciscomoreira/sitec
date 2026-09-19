import { brl, fmtDate } from "@/lib/format";

export const DEFAULT_CONTRATO_HTML = `
<h1 style="text-align:center;color:#1e3a5f;text-transform:uppercase;letter-spacing:1px">Contrato de Adesão — Plano Funerário</h1>
<p style="text-align:center;color:#666;font-size:11px">Nuvem Planos · Emitido em {{data_hoje}}</p>

<p>Pelo presente instrumento particular, de um lado a <b>Nuvem Planos</b>, doravante denominada <b>CONTRATADA</b>, e de outro lado o(a) associado(a) abaixo qualificado, doravante denominado(a) <b>CONTRATANTE</b>, têm entre si justo e contratado o seguinte:</p>

<h2 style="color:#1e3a5f;text-transform:uppercase;border-bottom:1px solid #1e3a5f">I. Identificação do Contratante</h2>
<p><b>Código:</b> {{codigo}} &nbsp; <b>Nome:</b> {{nome}}<br>
<b>CPF:</b> {{cpf}} &nbsp; <b>RG:</b> {{rg}} &nbsp; <b>Nascimento:</b> {{nascimento}}<br>
<b>Telefone:</b> {{telefone}} &nbsp; <b>E-mail:</b> {{email}}<br>
<b>Endereço:</b> {{endereco}} — {{cidade}}/{{estado}} {{cep}}</p>

<h2 style="color:#1e3a5f;text-transform:uppercase;border-bottom:1px solid #1e3a5f">II. Plano Contratado</h2>
<p><b>Plano:</b> {{plano_nome}} &nbsp; <b>Mensalidade:</b> {{plano_valor}}<br>
<b>Adesão:</b> {{data_adesao}} &nbsp; <b>Vencimento mensal:</b> dia {{dia_vencimento}}</p>

<h2 style="color:#1e3a5f;text-transform:uppercase;border-bottom:1px solid #1e3a5f">III. Serviços e Coberturas</h2>
{{cobertura}}

<h2 style="color:#1e3a5f;text-transform:uppercase;border-bottom:1px solid #1e3a5f">IV. Dependentes Inclusos</h2>
{{dependentes}}

<h2 style="color:#1e3a5f;text-transform:uppercase;border-bottom:1px solid #1e3a5f">V. Condições Gerais</h2>
<p><b>1.</b> O CONTRATANTE compromete-se a efetuar o pagamento da mensalidade no valor de <b>{{plano_valor}}</b> até o dia <b>{{dia_vencimento}}</b> de cada mês, sob pena de suspensão dos serviços contratados.</p>
<p><b>2.</b> O atraso superior a 60 (sessenta) dias acarretará a suspensão automática da cobertura, sendo necessária a regularização integral dos débitos para reativação.</p>
<p><b>3.</b> O presente contrato vigora por prazo indeterminado, podendo ser rescindido por qualquer das partes mediante comunicação prévia por escrito.</p>
<p><b>4.</b> A inclusão de novos dependentes deverá ser solicitada formalmente à CONTRATADA.</p>
<p><b>5.</b> Os serviços abrangidos por este contrato são exclusivamente aqueles descritos na cláusula III.</p>
<p><b>6.</b> Fica eleito o foro da comarca do CONTRATANTE para dirimir quaisquer questões oriundas deste contrato.</p>

<p style="margin-top:24px">E por estarem assim justos e contratados, firmam o presente em duas vias de igual teor.</p>
<p style="text-align:right">{{cidade}}/{{estado}}, {{data_hoje}}</p>

<table style="width:100%;margin-top:60px"><tr>
<td style="text-align:center;border-top:1px solid #111;padding-top:6px">CONTRATANTE<br>{{nome}}<br>CPF: {{cpf}}</td>
<td style="width:40px"></td>
<td style="text-align:center;border-top:1px solid #111;padding-top:6px">CONTRATADA<br>Nuvem Planos</td>
</tr></table>
`.trim();

export const CONTRATO_PLACEHOLDERS: { key: string; label: string }[] = [
  { key: "codigo", label: "Código do associado" },
  { key: "nome", label: "Nome" },
  { key: "cpf", label: "CPF" },
  { key: "rg", label: "RG" },
  { key: "nascimento", label: "Data de nascimento" },
  { key: "telefone", label: "Telefone" },
  { key: "email", label: "E-mail" },
  { key: "endereco", label: "Endereço" },
  { key: "cidade", label: "Cidade" },
  { key: "estado", label: "Estado" },
  { key: "cep", label: "CEP" },
  { key: "plano_nome", label: "Nome do plano" },
  { key: "plano_valor", label: "Valor da mensalidade" },
  { key: "data_adesao", label: "Data de adesão" },
  { key: "dia_vencimento", label: "Dia de vencimento" },
  { key: "cobertura", label: "Cobertura do plano (lista)" },
  { key: "dependentes", label: "Tabela de dependentes" },
  { key: "data_hoje", label: "Data de hoje" },
];

export type ContratoAssoc = {
  codigo: number; nome: string; cpf: string | null; rg: string | null;
  data_nascimento: string | null; telefone: string | null; email: string | null;
  endereco: string | null; cidade: string | null; estado: string | null; cep: string | null;
  data_adesao: string; dia_vencimento: number;
};

export function renderContratoHTML(
  assoc: ContratoAssoc,
  plano: { nome: string; valor_mensal: number; cobertura?: string | null; descricao?: string | null },
  deps: { nome: string; parentesco: string; data_nascimento: string | null; cpf: string | null }[],
  template: string = DEFAULT_CONTRATO_HTML,
): string {
  const hoje = new Date().toLocaleDateString("pt-BR");
  const depsTable = deps.length
    ? `<table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr><th style="border:1px solid #ccc;padding:5px;background:#f4f4f4">Nome</th><th style="border:1px solid #ccc;padding:5px;background:#f4f4f4">Parentesco</th><th style="border:1px solid #ccc;padding:5px;background:#f4f4f4">Nascimento</th><th style="border:1px solid #ccc;padding:5px;background:#f4f4f4">CPF</th></tr></thead><tbody>${deps.map((d) => `<tr><td style="border:1px solid #ccc;padding:5px">${d.nome}</td><td style="border:1px solid #ccc;padding:5px">${d.parentesco}</td><td style="border:1px solid #ccc;padding:5px">${d.data_nascimento ? fmtDate(d.data_nascimento) : "—"}</td><td style="border:1px solid #ccc;padding:5px">${d.cpf ?? "—"}</td></tr>`).join("")}</tbody></table>`
    : `<p style="color:#888;font-style:italic">Nenhum dependente cadastrado.</p>`;
  const cobertura = (plano.cobertura ?? "").trim()
    ? `<ul>${(plano.cobertura as string).split(/\r?\n|;|•/).map((s) => s.trim()).filter(Boolean).map((s) => `<li>${s}</li>`).join("")}</ul>`
    : `<p style="color:#888;font-style:italic">Cobertura conforme descrição do plano.</p>`;

  const values: Record<string, string> = {
    codigo: `#${String(assoc.codigo).padStart(4, "0")}`,
    nome: assoc.nome,
    cpf: assoc.cpf ?? "—",
    rg: assoc.rg ?? "—",
    nascimento: assoc.data_nascimento ? fmtDate(assoc.data_nascimento) : "—",
    telefone: assoc.telefone ?? "—",
    email: assoc.email ?? "—",
    endereco: assoc.endereco ?? "—",
    cidade: assoc.cidade ?? "",
    estado: assoc.estado ?? "",
    cep: assoc.cep ?? "",
    plano_nome: plano.nome,
    plano_valor: brl(plano.valor_mensal),
    data_adesao: fmtDate(assoc.data_adesao),
    dia_vencimento: String(assoc.dia_vencimento),
    cobertura,
    dependentes: depsTable,
    data_hoje: hoje,
  };

  let html = editorHTMLToTemplate(template);
  for (const [k, v] of Object.entries(values)) {
    html = html.replaceAll(`{{${k}}}`, v);
  }
  return `<div class="contrato-doc" style="max-width:820px;margin:0 auto;padding:40px">${html}</div>`;
}

/** Rótulo amigável de cada variável */
export const PLACEHOLDER_LABELS: Record<string, string> = Object.fromEntries(
  CONTRATO_PLACEHOLDERS.map((p) => [p.key, p.label]),
);

/** Converte {{chave}} em "chips" visuais para o editor */
export function templateToEditorHTML(template: string): string {
  return template.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_m, key: string) => {
    const label = PLACEHOLDER_LABELS[key] ?? key;
    return `<span class="ph-chip" data-ph="${key}" contenteditable="false">${label}</span>`;
  });
}

/** Converte os "chips" do editor de volta para {{chave}} */
export function editorHTMLToTemplate(html: string): string {
  if (typeof document === "undefined") {
    return html.replace(/<span[^>]*data-ph="([a-z_]+)"[^>]*>.*?<\/span>/gi, (_m, key: string) => `{{${key}}}`);
  }
  const root = document.createElement("div");
  root.innerHTML = html;
  root.querySelectorAll("[data-ph]").forEach((el) => {
    el.replaceWith(document.createTextNode(`{{${el.getAttribute("data-ph")}}}`));
  });
  return root.innerHTML;
}

/** CSS compartilhado entre o editor e a impressão/PDF */
export const CONTRATO_CSS = `
.contrato-doc{font-family:Georgia,serif;color:#111;line-height:1.55;font-size:14px}
.contrato-doc h1{font-size:22px;font-weight:700;margin:0 0 12px}
.contrato-doc h2{font-size:16px;font-weight:700;margin:18px 0 8px}
.contrato-doc h3{font-size:14px;font-weight:700;margin:14px 0 6px}
.contrato-doc p{margin:0 0 10px}
.contrato-doc ul{list-style:disc;padding-left:26px;margin:0 0 10px}
.contrato-doc ol{list-style:decimal;padding-left:26px;margin:0 0 10px}
.contrato-doc li{margin:2px 0}
.contrato-doc b,.contrato-doc strong{font-weight:700}
.contrato-doc i,.contrato-doc em{font-style:italic}
.contrato-doc u{text-decoration:underline}
.contrato-doc table{border-collapse:collapse}
.contrato-doc img{max-width:100%}
`.trim();

/** CSS extra apenas para o editor (aparência dos campos) */
export const CONTRATO_CHIP_CSS = `
.contrato-doc .ph-chip{display:inline-block;background:#e8eef7;color:#1e3a5f;border:1px solid #b9cbe4;
border-radius:4px;padding:0 6px;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:600;
line-height:1.5;white-space:nowrap;cursor:default}
`.trim();
