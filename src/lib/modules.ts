import {
  LayoutDashboard, Users, FileText, Wallet, HandCoins,
  Building2, Receipt, Layers, MapPin, BarChart3, Shield,
} from "lucide-react";

export type AppModuleTab = { key: string; label: string };

export type AppModule = {
  key: string;
  label: string;
  group: string;
  url: string;
  icon: any;
  tabs?: AppModuleTab[];
};

/**
 * Registro central de módulos do sistema.
 *
 * ⚠️ Para adicionar um novo módulo ao sistema, basta incluir uma entrada aqui.
 * Ele aparecerá automaticamente:
 *   - No menu lateral (AppShell)
 *   - Nas permissões por perfil (usuarios → Permissões de acesso)
 *   - Nas permissões individuais por usuário
 */
export const MODULES: AppModule[] = [
  { group: "Associados", key: "dashboard", label: "Painel", url: "/dashboard", icon: LayoutDashboard },
  { group: "Associados", key: "associados", label: "Associados", url: "/associados", icon: Users },
  { group: "Associados", key: "planos", label: "Planos", url: "/planos", icon: FileText },
  { group: "Associados", key: "financeiro", label: "Mensalidades", url: "/financeiro", icon: Wallet },
  { group: "Associados", key: "recebimento", label: "Recebimento", url: "/recebimento", icon: HandCoins, tabs: [
    { key: "mobile", label: "Recebimento mobile" },
    { key: "conciliar", label: "Conciliação (supervisor)" },
    { key: "baixa", label: "Baixa por agente" },
    { key: "historico", label: "Histórico de baixas" },
    { key: "carne", label: "Gerar carnês em massa" },
    { key: "cobradores", label: "Cadastro de cobradores" },
  ] },
  { group: "Gestão Financeira", key: "empresa-financeiro", label: "Painel Financeiro", url: "/empresa-financeiro", icon: Building2 },
  { group: "Gestão Financeira", key: "contas", label: "Contas a Pagar/Receber", url: "/contas", icon: Receipt },
  { group: "Gestão Financeira", key: "centros-custo", label: "Centros de Custo", url: "/centros-custo", icon: Layers },
  { group: "Vendas", key: "vendas", label: "Mapa de Vendas", url: "/vendas", icon: MapPin },
  { group: "Vendas", key: "vendas-relatorio", label: "Relatório de Vendas", url: "/vendas-relatorio", icon: BarChart3 },
  { group: "Administração", key: "usuarios", label: "Usuários", url: "/usuarios", icon: Shield },
];

export const MODULE_GROUPS: string[] = Array.from(new Set(MODULES.map((m) => m.group)));
