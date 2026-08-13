import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, Phone, MapPin } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const TITLE = "Contato — Nuvem Planos";
const DESC = "Fale com a equipe do Nuvem Planos e agende uma demonstração do sistema de gestão de planos funerários.";

export const Route = createFileRoute("/contato")({
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
  component: ContatoPage,
});

function ContatoPage() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [mensagem, setMensagem] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const corpo = `Nome: ${nome}\nEmpresa: ${empresa}\nE-mail: ${email}\n\n${mensagem}`;
    window.location.href = `mailto:contato@nuvemplanos.com.br?subject=${encodeURIComponent(
      "Demonstração — Nuvem Planos",
    )}&body=${encodeURIComponent(corpo)}`;
    toast.success("Abrindo seu e-mail", { description: "Basta enviar a mensagem para nossa equipe." });
  }

  return (
    <SiteLayout>
      <section className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Contato</p>
          <h1 className="mt-3 font-serif text-3xl font-semibold text-foreground sm:text-5xl">Agende uma demonstração</h1>
          <p className="mt-4 max-w-md text-base text-muted-foreground">
            Mostramos o sistema funcionando com o cenário da sua operação: carteira, cobrança, campo e serviço funerário.
          </p>

          <ul className="mt-8 space-y-4 text-sm text-muted-foreground">
            <li className="flex items-center gap-3"><Mail className="h-4 w-4 text-primary" /> contato@nuvemplanos.com.br</li>
            <li className="flex items-center gap-3"><Phone className="h-4 w-4 text-primary" /> (00) 0000-0000</li>
            <li className="flex items-center gap-3"><MapPin className="h-4 w-4 text-primary" /> Atendimento em todo o Brasil</li>
          </ul>
        </div>

        <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-6 shadow-soft sm:p-8">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="empresa">Empresa</Label>
              <Input id="empresa" value={empresa} onChange={(e) => setEmpresa(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="mensagem">Mensagem</Label>
              <Textarea id="mensagem" rows={5} value={mensagem} onChange={(e) => setMensagem(e.target.value)} />
            </div>
            <Button type="submit" size="lg">Enviar mensagem</Button>
          </div>
        </form>
      </section>
    </SiteLayout>
  );
}
