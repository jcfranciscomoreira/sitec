export type CarteirinhaElement = {
  id: string;
  kind: "text" | "field";
  content: string; // literal text OR field key: nome, codigo, plano, tipo
  x: number;
  y: number;
  fontSize: number;
  bold?: boolean;
  color?: string;
};

export type CarteirinhaConfig = {
  width: number;
  height: number;
  background: string; // css background
  color: string;
  elements: CarteirinhaElement[];
};

export const DEFAULT_CARTEIRINHA: CarteirinhaConfig = {
  width: 340,
  height: 210,
  background: "linear-gradient(135deg,#1e3a5f 0%,#2c5282 100%)",
  color: "#ffffff",
  elements: [
    { id: "brand", kind: "text", content: "MEMORIAL", x: 22, y: 16, fontSize: 11, bold: true, color: "#ffffff" },
    { id: "tipo", kind: "field", content: "tipo", x: 22, y: 34, fontSize: 13, color: "#d4af37" },
    { id: "labelNome", kind: "text", content: "NOME", x: 22, y: 78, fontSize: 9, color: "#ffffff" },
    { id: "nome", kind: "field", content: "nome", x: 22, y: 94, fontSize: 18, bold: true, color: "#ffffff" },
    { id: "plano", kind: "field", content: "plano", x: 22, y: 178, fontSize: 11, color: "#ffffff" },
    { id: "codigo", kind: "field", content: "codigo", x: 240, y: 174, fontSize: 14, bold: true, color: "#1e3a5f" },
  ],
};

export type CarteirinhaData = { codigo: string; nome: string; plano: string; tipo: string };

function resolve(el: CarteirinhaElement, data: CarteirinhaData): string {
  if (el.kind === "text") return el.content;
  return (data as any)[el.content] ?? "";
}

function esc(s: string) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

export function renderCarteirinhaHTML(data: CarteirinhaData, cfg: CarteirinhaConfig = DEFAULT_CARTEIRINHA): string {
  const items = cfg.elements.map((el) => {
    const text = esc(resolve(el, data));
    const style = [
      `position:absolute`,
      `left:${el.x}px`,
      `top:${el.y}px`,
      `font-size:${el.fontSize}px`,
      `color:${el.color ?? cfg.color}`,
      el.bold ? "font-weight:bold" : "",
      el.id === "codigo" ? "background:#d4af37;padding:4px 10px;border-radius:6px;font-family:monospace" : "",
    ].filter(Boolean).join(";");
    return `<div style="${style}">${text}</div>`;
  }).join("");
  return `<div class="card" style="position:relative;width:${cfg.width}px;height:${cfg.height}px;background:${cfg.background};color:${cfg.color};border-radius:14px;box-shadow:0 8px 24px rgba(0,0,0,.2);font-family:Georgia,serif;overflow:hidden">${items}</div>`;
}
