import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, Users, FileText, Wallet, LogOut, Cross, Building2, Receipt, Layers, HandCoins, MapPin, Shield, Settings, BarChart3 } from "lucide-react";
import { useConfiguracoes } from "@/hooks/use-configuracoes";
import type { ReactNode } from "react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger,
  SidebarHeader, SidebarFooter,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const groups: { label: string; items: { title: string; url: string; icon: any }[] }[] = [
  {
    label: "Associados",
    items: [
      { title: "Painel", url: "/dashboard", icon: LayoutDashboard },
      { title: "Associados", url: "/associados", icon: Users },
      { title: "Planos", url: "/planos", icon: FileText },
      { title: "Mensalidades", url: "/financeiro", icon: Wallet },
      { title: "Recebimento", url: "/recebimento", icon: HandCoins },
    ],
  },
  {
    label: "Gestão Financeira",
    items: [
      { title: "Painel Financeiro", url: "/empresa-financeiro", icon: Building2 },
      { title: "Contas a Pagar/Receber", url: "/contas", icon: Receipt },
      { title: "Centros de Custo", url: "/centros-custo", icon: Layers },
    ],
  },
  {
    label: "Vendas",
    items: [
      { title: "Mapa de Vendas", url: "/vendas", icon: MapPin },
      { title: "Relatório de Vendas", url: "/vendas-relatorio", icon: BarChart3 },
    ],
  },
  {
    label: "Administração",
    items: [
      { title: "Usuários", url: "/usuarios", icon: Shield },
      { title: "Configurações", url: "/configuracoes", icon: Settings },
    ],
  },
];

function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { config } = useConfiguracoes();

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gold text-gold-foreground overflow-hidden">
            {config.logo_url
              ? <img src={config.logo_url} alt="logo" className="h-full w-full object-contain" />
              : <Cross className="h-5 w-5" />}
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="font-serif text-base font-semibold text-sidebar-foreground">{config.nome_sistema}</span>
            {config.subtitulo && (
              <span className="text-[11px] uppercase tracking-wider text-sidebar-foreground/60">{config.subtitulo}</span>
            )}
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((g) => (
          <SidebarGroup key={g.label}>
            <SidebarGroupLabel>{g.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {g.items.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={pathname.startsWith(item.url)}>
                      <Link to={item.url} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <LogOut className="h-4 w-4" />
          <span className="group-data-[collapsible=icon]:hidden">Sair</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

export function AppShell({ title, subtitle, actions, children }: {
  title: string; subtitle?: string; actions?: ReactNode; children: ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-16 items-center gap-3 border-b border-border bg-card/80 px-4 backdrop-blur lg:px-8">
            <SidebarTrigger />
            <div className="flex-1">
              <h1 className="font-serif text-xl font-semibold leading-tight text-foreground">{title}</h1>
              {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            </div>
            <div className="flex items-center gap-2">{actions}</div>
          </header>
          <main className="flex-1 p-4 lg:p-8">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
