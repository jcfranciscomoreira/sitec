import { brl, fmtDate, competenciaLabel } from "@/lib/format";
import { toast } from "sonner";

type AssocInfo = {
  nome: string;
  codigo: number | string | null;
  cpf?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  estado?: string | null;
  planos?: { nome?: string | null; valor_mensal?: number | null } | null;
};

type Mens = {
  id: string;
  codigo?: number | string | null;
  competencia: string;
  vencimento: string;
  valor: number | string;
};

export function imprimirCarnesAssociado(associado: AssocInfo, mensalidades: Mens[]) {
  if (mensalidades.length === 0) {
    toast.error("Nenhuma parcela para imprimir.");
    return;
  }
  const w = window.open("", "_blank", "width=900,height=800");
  if (!w) { toast.error("Permita pop-ups."); return; }
  const codigo = `#${String(associado.codigo ?? "").padStart(4, "0")}`;
  const cards = mensalidades.map((m) => {
    const ident = `PARCELA #${m.codigo ?? ""}`;
    return `
      <div class="carne">
        <div class="canhoto">
          <div class="brand">Memorial</div>
          <div class="small">Plano Funerário · Via do associado</div>
          <table>
            <tr><td>Associado</td><td><b>${associado.nome}</b></td></tr>
            <tr><td>Código</td><td>${codigo}</td></tr>
            <tr><td>Plano</td><td>${associado.planos?.nome ?? "—"}</td></tr>
            <tr><td>Competência</td><td style="text-transform:capitalize">${competenciaLabel(m.competencia)}</td></tr>
            <tr><td>Vencimento</td><td><b>${fmtDate(m.vencimento)}</b></td></tr>
            <tr><td>Valor</td><td><b>${brl(Number(m.valor))}</b></td></tr>
          </table>
        </div>
        <div class="ficha">
          <div class="head">
            <div>
              <div class="brand">Memorial</div>
              <div class="small">Carnê de pagamento · Plano Funerário</div>
            </div>
            <div class="valor">${brl(Number(m.valor))}</div>
          </div>
          <table>
            <tr><td>Associado</td><td><b>${associado.nome}</b> · ${codigo}</td></tr>
            <tr><td>CPF</td><td>${associado.cpf ?? "—"}</td></tr>
            <tr><td>Endereço</td><td>${associado.endereco ?? "—"} — ${associado.cidade ?? ""}/${associado.estado ?? ""}</td></tr>
            <tr><td>Plano</td><td>${associado.planos?.nome ?? "—"}</td></tr>
            <tr><td>Competência</td><td style="text-transform:capitalize">${competenciaLabel(m.competencia)}</td></tr>
            <tr><td>Vencimento</td><td><b>${fmtDate(m.vencimento)}</b></td></tr>
          </table>
          <div class="ident">${ident}</div>
          <div class="ass">
            <div class="linha"></div>
            <div class="small">Assinatura do recebedor</div>
          </div>
        </div>
      </div>
    `;
  }).join("");
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Carnês — ${associado.nome}</title>
    <style>
      *{box-sizing:border-box}
      body{font-family:Georgia,serif;color:#111;margin:0;padding:0}
      .carne{display:grid;grid-template-columns:1fr 2.2fr;gap:0;border:1px solid #333;margin:8px;height:240px;page-break-inside:avoid}
      .canhoto{border-right:2px dashed #333;padding:10px 12px;background:#f8f7f2}
      .ficha{padding:10px 14px}
      .brand{font-size:14px;color:#1e3a5f;font-weight:bold;letter-spacing:2px;text-transform:uppercase}
      .small{font-size:10px;color:#666}
      table{width:100%;border-collapse:collapse;font-size:11px;margin-top:6px}
      td{padding:3px 4px;border-bottom:1px dotted #ccc;vertical-align:top}
      td:first-child{color:#666;width:90px}
      .head{display:flex;justify-content:space-between;align-items:flex-start}
      .valor{font-size:22px;font-weight:bold;color:#1e3a5f;background:#f5f3ec;padding:6px 12px;border-radius:6px}
      .ident{margin-top:8px;font-family:monospace;font-size:13px;letter-spacing:2px;background:#1e3a5f;color:#fff;padding:6px 10px;text-align:center;border-radius:4px}
      .ass{margin-top:12px;text-align:center}
      .linha{border-top:1px solid #111;width:70%;margin:24px auto 2px}
      @media print{ body{padding:0} .carne{margin:6px} }
    </style></head><body>
    ${cards}
    <script>window.onload=()=>{window.print();}</script>
    </body></html>`);
  w.document.close();
}
