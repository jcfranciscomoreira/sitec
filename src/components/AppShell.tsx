import { Link, useRouterState } from "@tanstack/react-router";
import { Settings, Cross } from "lucide-react";
import { useConfiguracoes } from "@/hooks/use-configuracoes";
import { usePermissions } from "@/hooks/use-permissions";
import { MODULES, MODULE_GROUPS } from "@/lib/modules";
import type { ReactNode } from "react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger,
  SidebarHeader, SidebarFooter,
} from "@/components/ui/sidebar";
import { UserMenu } from "@/components/UserMenu";

const groups = MODULE_GROUPS.map((label) => ({
  label,
  items: MODULES.filter((m) => m.group === label).map((m) => ({
    title: m.label, url: m.url, icon: m.icon, module: m.key,
  })),
}));

function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { config } = useConfiguracoes();
  const { can, loading: permsLoading } = usePermissions();

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
        {groups.map((g) => {
          const items = permsLoading ? g.items : g.items.filter((i) => can(i.module));
          if (items.length === 0) return null;
          return (
            <SidebarGroup key={g.label}>
              <SidebarGroupLabel>{g.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item) => (
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
          );
        })}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname.startsWith("/configuracoes")}>
              <Link to="/configuracoes" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span>Configurações</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
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
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-16 items-center gap-2 border-b border-border bg-card/80 px-3 backdrop-blur sm:gap-3 sm:px-4 lg:px-8">
            <SidebarTrigger />
            <div className="min-w-0 flex-1">
              <h1 className="truncate font-serif text-base font-semibold leading-tight text-foreground sm:text-xl">{title}</h1>
              {subtitle && <p className="line-clamp-1 text-[10px] text-muted-foreground sm:text-xs sm:line-clamp-none">{subtitle}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-2">{actions}</div>
            <UserMenu />
          </header>
          <main className="flex-1 p-3 sm:p-4 lg:p-8">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
