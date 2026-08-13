import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";

const TITLE = "Planos e preços — Nuvem Planos";
const DESC = "Escolha o plano ideal para a sua administradora de planos funerários: Essencial, Profissional ou Completo, com implantação e suporte.";

export const Route = createFileRoute("/planos-precos")({
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
  component: PrecosPage,
});

const PLANS = [
  {
    name: "Essencial",
    price: "R$ 349",
    note: "por mês",
    desc: "Para administradoras que estão organizando a carteira.",
    items: ["Associados e dependentes", "Planos e contratos", "Mensalidades e carnês", "Relatórios básicos", "Até 3 usuários"],
    featured: false,
  },
  {
    name: "Profissional",
    price: "R$ 649",
    note: "por mês",
    desc: "Cobrança automatizada e equipe em campo.",
    items: ["Tudo do Essencial", "Boletos e PIX com baixa automática", "Recebimento mobile e conciliação", "Caixa de balcão", "Mapa de vendas e CRM", "Até 10 usuários"],
    featured: true,
  },
  {
    name: "Completo",
    price: "Sob consulta",
    note: "multi-filial",
    desc: "Operação completa, incluindo serviço funerário.",
    items: ["Tudo do Profissional", "Serviço funerário, OS e estoque", "Gestão por filiais", "Backup automático e auditoria", "Usuários ilimitados", "Suporte prioritário"],
    featured: false,
  },
];

function PrecosPage() {
  return (
    <SiteLayout>
      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Planos</p>
        <h1 className="mt-3 font-serif text-3xl font-semibold text-foreground sm:text-5xl">Preços simples e previsíveis</h1>
        <p className="mt-4 max-w-2xl text-base text-muted-foreground">
          Sem taxa por associado ativo. Implantação, migração de dados e treinamento incluídos em todos os planos.
        </p>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {PLANS.map((p) => (
            <article
              key={p.name}
              className={`flex flex-col rounded-xl border bg-card p-7 ${p.featured ? "border-primary shadow-elevated" : "border-border shadow-soft"}`}
            >
              {p.featured && (
                <span className="mb-3 w-fit rounded-full bg-gold px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-gold-foreground">
                  Mais escolhido
                </span>
              )}
              <h2 className="font-serif text-xl font-semibold text-foreground">{p.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{p.desc}</p>
              <div className="mt-5 flex items-baseline gap-2">
                <span className="font-serif text-3xl font-semibold text-foreground">{p.price}</span>
                <span className="text-sm text-muted-foreground">{p.note}</span>
              </div>
              <ul className="mt-6 flex-1 space-y-3">
                {p.items.map((i) => (
                  <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    <span>{i}</span>
                  </li>
                ))}
              </ul>
              <Button asChild className="mt-7" variant={p.featured ? "default" : "outline"}>
                <Link to="/contato">Solicitar proposta</Link>
              </Button>
            </article>
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}
