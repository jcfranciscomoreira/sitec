import { BACKUP_TABELAS } from "@/lib/backup-tabelas";

export type ArquivoBackup = {
  formato: "json" | "csv";
  dados: Record<string, any[]>;
  tabelas: string[];
  ignoradas: string[];
  gerado_em?: string;
};

const VALIDAS = new Set<string>(BACKUP_TABELAS as readonly string[]);

function coagir(valor: string): any {
  if (valor === "") return null;
  const t = valor.trim();
  if (t === "true") return true;
  if (t === "false") return false;
  if ((t.startsWith("{") && t.endsWith("}")) || (t.startsWith("[") && t.endsWith("]"))) {
    try { return JSON.parse(t); } catch { return valor; }
  }
  return valor;
}

function parseLinhaCsv(linha: string): string[] {
  const out: string[] = [];
  let atual = "";
  let aspas = false;
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i];
    if (aspas) {
      if (c === '"') {
        if (linha[i + 1] === '"') { atual += '"'; i++; } else { aspas = false; }
      } else atual += c;
    } else if (c === '"') aspas = true;
    else if (c === ",") { out.push(atual); atual = ""; }
    else atual += c;
  }
  out.push(atual);
  return out;
}

function dividirCsv(texto: string): string[] {
  // divide em linhas respeitando aspas
  const linhas: string[] = [];
  let atual = "";
  let aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (c === '"') { aspas = !aspas; atual += c; continue; }
    if (c === "\n" && !aspas) { linhas.push(atual.replace(/\r$/, "")); atual = ""; continue; }
    atual += c;
  }
  if (atual.length) linhas.push(atual.replace(/\r$/, ""));
  return linhas;
}

export function parseBackupJson(texto: string): ArquivoBackup {
  const obj = JSON.parse(texto);
  const bruto = obj?.dados && typeof obj.dados === "object" ? obj.dados : obj;
  if (!bruto || typeof bruto !== "object") throw new Error("Arquivo JSON não reconhecido");
  const dados: Record<string, any[]> = {};
  const ignoradas: string[] = [];
  for (const [tabela, linhas] of Object.entries(bruto)) {
    if (!Array.isArray(linhas)) continue;
    if (!VALIDAS.has(tabela)) { ignoradas.push(tabela); continue; }
    dados[tabela] = linhas as any[];
  }
  if (!Object.keys(dados).length) throw new Error("Nenhuma tabela válida encontrada no arquivo");
  return { formato: "json", dados, tabelas: Object.keys(dados), ignoradas, gerado_em: obj?.gerado_em };
}

export function parseBackupCsv(texto: string): ArquivoBackup {
  const linhas = dividirCsv(texto);
  const dados: Record<string, any[]> = {};
  const ignoradas: string[] = [];
  let tabela: string | null = null;
  let cabecalho: string[] | null = null;
  let valida = false;

  for (const linha of linhas) {
    const m = linha.match(/^###\s+([a-z0-9_]+)/i);
    if (m) {
      tabela = m[1];
      cabecalho = null;
      valida = VALIDAS.has(tabela);
      if (!valida) ignoradas.push(tabela);
      else dados[tabela] = [];
      continue;
    }
    if (!tabela || !valida || !linha.trim()) continue;
    if (!cabecalho) { cabecalho = parseLinhaCsv(linha); continue; }
    const celulas = parseLinhaCsv(linha);
    const registro: Record<string, any> = {};
    cabecalho.forEach((col, i) => { registro[col] = coagir(celulas[i] ?? ""); });
    dados[tabela].push(registro);
  }

  const comDados = Object.fromEntries(Object.entries(dados).filter(([, v]) => v.length >= 0));
  if (!Object.keys(comDados).length) throw new Error("Nenhuma tabela válida encontrada no CSV");
  return { formato: "csv", dados: comDados, tabelas: Object.keys(comDados), ignoradas };
}

export function parseArquivoBackup(nome: string, texto: string): ArquivoBackup {
  return nome.toLowerCase().endsWith(".csv") ? parseBackupCsv(texto) : parseBackupJson(texto);
}
