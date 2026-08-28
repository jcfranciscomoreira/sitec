import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard, Building2, FileText, DollarSign, Users, Settings2, LogOut, ArrowLeftRight, ServerCog,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const NAV: { to: string; label: string; icon: any; exact?: boolean }[] = [
  { to: "/console", label: "Visão geral", icon: LayoutDashboard, exact: true },
  { to: "/console/empresas", label: "Empresas", icon: Building2 },
  { to: "/console/planos", label: "Planos de acesso", icon: FileText },
  { to: "/console/financeiro", label: "Financeiro", icon: DollarSign },
  { to: "/console/usuarios", label: "Usuários", icon: Users },
  { to: "/console/configuracoes", label: "Plataforma", icon: Settings2 },
] as const;

export function ConsoleShell({ title, subtitle, actions, children }: {
  title: string; subtitle?: string; actions?: ReactNode; children: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function sair() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/console-login", replace: true });
  }

  return (
    <div className="flex min-h-screen w-full bg-muted/40">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex items-center gap-2 border-b border-sidebar-border px-4 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ServerCog className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-serif text-base font-semibold">Console</span>
            <span className="text-[11px] uppercase tracking-wider text-sidebar-foreground/60">Gestão da plataforma</span>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-2">
          {NAV.map((item) => {
            const active = item.exact ? pathname === "/console" || pathname === "/console/" : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to as any}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                  active ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "hover:bg-sidebar-accent/50"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-1 border-t border-sidebar-border p-2">
          <Link to="/dashboard" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-sidebar-accent/50">
            <ArrowLeftRight className="h-4 w-4" /> Ir para o sistema
          </Link>
          <button onClick={sair} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-sidebar-accent/50">
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center gap-3 border-b border-border bg-card/80 px-4 backdrop-blur lg:px-8">
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-serif text-base font-semibold sm:text-xl">{title}</h1>
            {subtitle && <p className="line-clamp-1 text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
          <Button variant="outline" size="sm" className="md:hidden" onClick={sair}>Sair</Button>
        </header>

        <div className="flex gap-1 overflow-x-auto border-b border-border bg-card px-2 py-2 md:hidden">
          {NAV.map((item) => (
            <Link key={item.to} to={item.to as any} className="whitespace-nowrap rounded-md px-3 py-1.5 text-xs hover:bg-accent">
              {item.label}
            </Link>
          ))}
        </div>

        <main className="flex-1 p-3 sm:p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
