import {
  LayoutDashboard, Users, FileText, Wallet, HandCoins,
  Receipt, Layers, MapPin, BarChart3, Shield, FileBarChart,
  Cross
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
  { group: "Dashboard", key: "dashboard", label: "Painel", url: "/dashboard", icon: LayoutDashboard },
  { group: "Associados", key: "associados", label: "Associados", url: "/associados", icon: Users },
  { group: "Associados", key: "planos", label: "Planos", url: "/planos", icon: FileText },
  { group: "Associados", key: "financeiro", label: "Mensalidades", url: "/financeiro", icon: Wallet, tabs: [
    { key: "mensalidades", label: "Mensalidades" },
    { key: "carne", label: "Gerar carnês em massa" },
  ] },
  { group: "Serviços", key: "servico-funerario", label: "Serviço Funerário", url: "/servico-funerario", icon: Cross, tabs: [
    { key: "dashboard", label: "Dashboard" },
    { key: "atendimentos", label: "Atendimentos" },
    { key: "os", label: "Ordens de Serviço" },
    { key: "equipe", label: "Equipes e Veículos" },
    { key: "financeiro", label: "Financeiro Particular" },
    { key: "relatorios", label: "Relatórios" },
  ] },
  { group: "Associados", key: "recebimento", label: "Recebimento", url: "/recebimento", icon: HandCoins, tabs: [

    { key: "mobile", label: "Recebimento mobile" },
    { key: "conciliar", label: "Conciliação (supervisor)" },
    { key: "baixa", label: "Baixa por agente" },
    { key: "historico", label: "Histórico de baixas" },
    { key: "cobradores", label: "Cadastro de cobradores" },
  ] },
  { group: "Gestão Financeira", key: "contas", label: "Entradas e Saidas", url: "/contas", icon: Receipt },
  { group: "Vendas", key: "vendas", label: "Mapa de Vendas", url: "/vendas", icon: MapPin },
  { group: "Vendas", key: "crm", label: "CRM (Kanban)", url: "/crm", icon: Layers },
  { group: "Vendas", key: "vendas-relatorio", label: "Relatório de Vendas", url: "/vendas-relatorio", icon: BarChart3 },
  { group: "Administração", key: "relatorios", label: "Relatórios", url: "/relatorios", icon: FileBarChart, tabs: [
    { key: "associados", label: "Associados" },
    { key: "mensalidades", label: "Mensalidades" },
    { key: "recebimentos", label: "Recebimentos" },
    { key: "financeiro", label: "Financeiro" },
    { key: "planos", label: "Planos" },
    { key: "aniversariantes", label: "Aniversariantes" },
    { key: "inadimplencia", label: "Inadimplência" },
  ] },
  { group: "Administração", key: "usuarios", label: "Usuários", url: "/usuarios", icon: Shield },
];

export const MODULE_GROUPS: string[] = Array.from(new Set(MODULES.map((m) => m.group)));
