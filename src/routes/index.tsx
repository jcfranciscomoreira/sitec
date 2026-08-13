import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Users, Receipt, MapPin, Cross, ShieldCheck, BarChart3 } from "lucide-react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";

const TITLE = "Nuvem Planos — Sistema de gestão para planos funerários";
const DESC = "Gerencie associados, dependentes, planos, mensalidades, boletos e PIX, caixa, serviço funerário e vendas em uma única plataforma na nuvem.";

export const Route = createFileRoute("/")({
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
  component: HomePage,
});

const HIGHLIGHTS = [
  { icon: Users, title: "Carteira organizada", text: "Associados, dependentes e planos com contrato e carteirinha personalizados." },
  { icon: Receipt, title: "Cobrança automática", text: "Boletos e PIX com baixa automática, carnês em massa e comprovantes." },
  { icon: MapPin, title: "Equipe em campo", text: "Recebimento pelo celular, mapa de vendas e CRM em Kanban." },
  { icon: Cross, title: "Serviço funerário", text: "Atendimentos, ordens de serviço, estoque e equipes integrados ao financeiro." },
  { icon: BarChart3, title: "Painel consolidado", text: "Receitas, despesas, inadimplência e resultados por filial e período." },
  { icon: ShieldCheck, title: "Segurança e auditoria", text: "Permissões por módulo, log de atividades e backup automático." },
];

const STATS = [
  { value: "12+", label: "módulos integrados" },
  { value: "100%", label: "acesso pelo navegador" },
  { value: "24/7", label: "dados na nuvem" },
];

function HomePage() {
  return (
    <SiteLayout>
      <section className="border-b border-border/60 bg-gradient-to-br from-primary via-primary to-[oklch(0.32_0.06_250)]">
        <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <span className="inline-flex rounded-full border border-primary-foreground/25 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-foreground/80">
            Gestão de planos funerários
          </span>
          <h1 className="mt-6 max-w-3xl font-serif text-4xl font-semibold leading-tight text-primary-foreground sm:text-6xl">
            A operação da sua administradora, do associado ao atendimento
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-primary-foreground/75 sm:text-lg">
            Cadastro de associados e dependentes, mensalidades, cobrança bancária, caixa, serviço funerário,
            vendas em campo e relatórios — tudo em um sistema único e acessível de qualquer lugar.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-gold text-gold-foreground hover:bg-gold/90">
              <Link to="/contato">Agendar demonstração <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
              <Link to="/auth">Acessar o sistema</Link>
            </Button>
          </div>

          <dl className="mt-14 grid max-w-lg grid-cols-3 gap-6">
            {STATS.map((s) => (
              <div key={s.label}>
                <dt className="sr-only">{s.label}</dt>
                <dd className="font-serif text-3xl font-semibold text-gold">{s.value}</dd>
                <p className="mt-1 text-xs text-primary-foreground/65">{s.label}</p>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <h2 className="max-w-2xl font-serif text-2xl font-semibold text-foreground sm:text-4xl">
          Construído para a rotina de quem administra planos
        </h2>
        <p className="mt-4 max-w-2xl text-base text-muted-foreground">
          Cada módulo foi desenhado a partir da operação real: escritório, campo e velório trabalhando na mesma base de dados.
        </p>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {HIGHLIGHTS.map((h) => (
            <article key={h.title} className="rounded-xl border border-border bg-card p-6 shadow-soft">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                <h.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-serif text-lg font-semibold text-foreground">{h.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{h.text}</p>
            </article>
          ))}
        </div>

        <div className="mt-10">
          <Button asChild variant="outline"><Link to="/recursos">Ver todos os recursos</Link></Button>
        </div>
      </section>

      <section className="border-t border-border/60 bg-secondary/50">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-6 px-4 py-16 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-foreground sm:text-3xl">Pronto para modernizar a gestão?</h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Implantação assistida, migração da sua base atual e treinamento da equipe.
            </p>
          </div>
          <div className="flex gap-3">
            <Button asChild size="lg"><Link to="/contato">Falar com a equipe</Link></Button>
            <Button asChild size="lg" variant="outline"><Link to="/planos-precos">Ver planos</Link></Button>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
