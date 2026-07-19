
# Responsividade mobile do sistema

Objetivo: garantir que todas as telas do sistema funcionem bem em celulares (≤ 640px), sem quebra de layout, scroll horizontal, botões cortados ou tabelas ilegíveis.

## Escopo (apenas frontend/apresentação)

Não altera regras de negócio, queries, RLS, nem estrutura de dados. Só CSS/JSX de apresentação.

## 1. Shell e navegação

- `src/components/AppShell.tsx`: sidebar vira **drawer** em mobile (menu hambúrguer no topo), conteúdo ocupa 100% da largura. Header com título/subtítulo empilha e trunca em telas pequenas.
- `UserMenu` e ações de topo: garantir `shrink-0` e `min-w-0` no bloco de título (padrão do guia de responsive-layout).

## 2. Painel (`dashboard.tsx`)

- Barra de filtros (Início / Fim / Mês): passa de `flex flex-wrap` para grid `grid-cols-2` em mobile, cada input `w-full` em vez de `w-44`/`w-52`.
- Grid de KPIs: mantém `md:grid-cols-2 xl:grid-cols-3`, mas em mobile fica `grid-cols-1` (padrão) com padding reduzido nos cards e valores `text-2xl` em vez de `text-3xl`.
- Cards de filial idem; botão "Ver detalhes" full width (já é).
- `FilialDetalhesDialog`: `DialogContent` com `w-[95vw] max-w-3xl`, `TabsList` com scroll horizontal (`overflow-x-auto`), tabelas envolvidas em wrapper `overflow-x-auto` (já feito em `TabelaSimples`) + font menor em mobile.

## 3. Tabelas / listas

Aplicar padrão consistente às páginas com tabelas grandes:
- `associados.tsx`, `associados-lista.tsx`, `planos.tsx`, `mensalidades` (dialog), `contas.tsx`, `centros-custo.tsx`, `financeiro.tsx`, `recebimento.tsx`, `relatorios.tsx`, `usuarios.tsx`, `vendas-relatorio.tsx`, `empresa-financeiro.tsx`.

Padrão:
- Envolver toda tabela em `<div className="overflow-x-auto -mx-4 px-4">` para permitir scroll horizontal sem quebrar a página.
- Barras de filtro/ação: `flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end`, inputs `w-full sm:w-auto`.
- Botões de ação por linha: agrupar em um único menu (ícone) em mobile via `DropdownMenu`, mantendo botões visíveis em `sm:` para cima. Onde já existem muitos botões (associados, mensalidades) isso é essencial.
- Diálogos (`Dialog`, `Sheet`): usar `w-[95vw] max-w-... max-h-[90vh] overflow-y-auto`.

## 4. Formulários

- Cadastros com grids `md:grid-cols-2` já colapsam para 1 coluna; padronizar campos com `w-full` e labels acima do campo.
- Botões primários dos diálogos: `w-full sm:w-auto` e ordem invertida (primário embaixo em mobile) quando fizer sentido.

## 5. Vendas / CRM / Mapa

- `vendas.tsx`: já é mobile-first, apenas ajustar altura do mapa para `h-[calc(100dvh-var(--header))]` e garantir controles com `touch-manipulation`.
- `crm.tsx` (kanban): em mobile, colunas com `min-w-[85vw] snap-x` e wrapper `overflow-x-auto snap-mandatory` (uma coluna por vez com swipe), em vez de tentar comprimir tudo.

## 6. Impressões / carteirinha / contrato

Sem mudanças — já são HTML dedicados para print.

## 7. Utilitários globais

- `src/styles.css`: já tem `overflow-x: hidden` no body. Adicionar `-webkit-tap-highlight-color: transparent` e classe utilitária `.no-scrollbar` (para faixas horizontais).
- Confirmar viewport meta em `__root.tsx` (`width=device-width, initial-scale=1, viewport-fit=cover`).

## 8. Verificação

Após implementação, rodar Playwright em viewport 390×844 (iPhone) e 360×780 (Android) e capturar screenshots das rotas principais:
`/dashboard`, `/associados`, `/associados-lista`, `/contas`, `/financeiro`, `/recebimento`, `/relatorios`, `/vendas`, `/crm`, `/configuracoes`, `/usuarios`. Ajustar pontos que ainda apresentarem overflow ou botões cortados.

## Fora de escopo

- Nenhuma mudança em queries, migrations, RLS ou lógica de negócio.
- Nenhum redesign visual — apenas adaptação de layout para telas pequenas mantendo o design atual.
