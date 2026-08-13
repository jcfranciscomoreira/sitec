import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Users, FileText, Wallet, HandCoins, Receipt, MapPin, Layers,
  BarChart3, Shield, Cross, LayoutDashboard, Smartphone,
} from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";

const TITLE = "Recursos — Nuvem Planos";
const DESC = "Associados, dependentes, mensalidades, boletos e PIX, caixa, serviço funerário, CRM, mapa de vendas e relatórios em uma única plataforma.";

export const Route = createFileRoute("/recursos")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RecursosPage,
});

const FEATURES = [
  { icon: Users, title: "Associados e dependentes", text: "Cadastro completo com máscaras, validação de CPF, checagem de duplicidade, carteirinha e contrato personalizados." },
  { icon: FileText, title: "Planos e contratos", text: "Valores, taxa de adesão e contrato padrão editável com prévia e impressão com logotipo da empresa." },
  { icon: Wallet, title: "Mensalidades", text: "Geração por intervalo de meses, baixas, bonificação administrativa, comprovantes e carnês em massa." },
  { icon: Receipt, title: "Boletos e PIX", text: "Emissão com código de barras e QR Code, compensação automática via webhook e cancelamento no banco." },
  { icon: HandCoins, title: "Recebimento e conciliação", text: "Cobrador recebe pelo celular, imprime comprovante e a baixa é efetivada na conciliação com o supervisor." },
  { icon: LayoutDashboard, title: "Caixa de balcão", text: "Abertura e fechamento por operador, recebimento parcial ou excedente, comprovantes e cancelamento com senha admin." },
  { icon: Cross, title: "Serviço funerário", text: "Atendimentos, ordens de serviço com checklist, equipes, veículos, estoque com baixa automática e financeiro próprio." },
  { icon: MapPin, title: "Mapa de vendas", text: "Vendedores mapeiam a cidade pelo celular, registram pontos, associados e planos com geolocalização." },
  { icon: Layers, title: "CRM Kanban", text: "Funil de vendas com colunas configuráveis e leads vinculados aos pontos do mapa." },
  { icon: BarChart3, title: "Relatórios", text: "Associados, mensalidades, inadimplência, aniversariantes, recebimentos e financeiro por filial, com CSV e impressão." },
  { icon: Shield, title: "Usuários e permissões", text: "Perfis de acesso por módulo e por aba, permissões individuais e log de auditoria de todas as ações." },
  { icon: Smartphone, title: "Pronto para o celular", text: "Interface responsiva pensada para uso em campo por cobradores, vendedores e agentes." },
];

function RecursosPage() {
  return (
    <SiteLayout>
      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Recursos</p>
        <h1 className="mt-3 max-w-3xl font-serif text-3xl font-semibold text-foreground sm:text-5xl">
          Tudo que a sua administradora precisa, em um só lugar
        </h1>
        <p className="mt-4 max-w-2xl text-base text-muted-foreground">
          Da captação do associado ao encerramento do atendimento funerário, com controle financeiro completo.
        </p>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <article key={f.title} className="rounded-xl border border-border bg-card p-6 shadow-soft">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                <f.icon className="h-5 w-5" />
              </span>
              <h2 className="mt-4 font-serif text-lg font-semibold text-foreground">{f.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.text}</p>
            </article>
          ))}
        </div>

        <div className="mt-14 flex flex-wrap gap-3">
          <Button asChild size="lg"><Link to="/auth">Acessar o sistema</Link></Button>
          <Button asChild size="lg" variant="outline"><Link to="/contato">Falar com a equipe</Link></Button>
        </div>
      </section>
    </SiteLayout>
  );
}
