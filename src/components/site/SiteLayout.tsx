import { Link } from "@tanstack/react-router";
import { Cross, Menu } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/", label: "Início" },
  { to: "/recursos", label: "Recursos" },
  { to: "/planos-precos", label: "Planos" },
  { to: "/contato", label: "Contato" },
] as const;

export function SiteLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Cross className="h-5 w-5" />
            </span>
            <span className="font-serif text-lg font-semibold text-foreground">Nuvem Planos</span>
          </Link>

          <nav className="ml-auto hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                activeOptions={{ exact: n.to === "/" }}
                className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                activeProps={{ className: "text-foreground font-medium" }}
              >
                {n.label}
              </Link>
            ))}
            <Button asChild size="sm" className="ml-2">
              <Link to="/auth">Acessar sistema</Link>
            </Button>
          </nav>

          <button
            type="button"
            aria-label="Abrir menu"
            onClick={() => setOpen((v) => !v)}
            className="ml-auto rounded-md p-2 text-foreground md:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        {open && (
          <div className="border-t border-border/60 md:hidden">
            <nav className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 py-3">
              {NAV.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  activeProps={{ className: "text-foreground font-medium" }}
                >
                  {n.label}
                </Link>
              ))}
              <Button asChild size="sm" className="mt-2">
                <Link to="/auth" onClick={() => setOpen(false)}>Acessar sistema</Link>
              </Button>
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border/60 bg-card">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Cross className="h-4 w-4" />
              </span>
              <span className="font-serif text-base font-semibold">Nuvem Planos</span>
            </div>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              Plataforma completa de gestão para administradoras de planos funerários.
            </p>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Navegação</h2>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {NAV.map((n) => (
                <li key={n.to}>
                  <Link to={n.to} className="hover:text-foreground">{n.label}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Acesso</h2>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link to="/auth" className="hover:text-foreground">Entrar no sistema</Link></li>
              <li><Link to="/contato" className="hover:text-foreground">Solicitar demonstração</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Nuvem Planos. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
}
