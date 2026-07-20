import { Cross, ClipboardList, Package, Truck, Calendar, MapPin, Search } from "lucide-react";

export const SERVICO_FUNERARIO_MODULE = {
  group: "Serviços",
  key: "servico-funerario",
  label: "Serviço Funerário",
  url: "/servico-funerario",
  icon: Cross,
  tabs: [
    { key: "dashboard", label: "Dashboard" },
    { key: "cadastro", label: "Cadastro" },
    { key: "ordens", label: "Ordens de Serviço" },
    { key: "checklist", label: "Checklist" },
    { key: "equipe", label: "Equipe" },
    { key: "veiculos", label: "Veículos" },
    { key: "velorio", label: "Velório/Sepultamento" },
    { key: "financeiro", label: "Financeiro Particular" },
    { key: "relatorios", label: "Relatórios" },
  ]
};
