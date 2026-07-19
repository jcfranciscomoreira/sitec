# Melhorias de responsividade mobile

Escopo apenas de frontend/apresentação — sem mexer em queries, RLS, migrations ou lógica de negócio.

## 1. Skeletons e estados de loading/erro

Criar componentes reutilizáveis:
- `src/components/ui/skeleton-card.tsx` — card KPI em esqueleto (título curto + valor grande).
- `src/components/ui/skeleton-table.tsx` — linhas de tabela com N colunas configuráveis.
- `src/components/ui/error-state.tsx` — bloco com ícone, mensagem e botão "Tentar novamente".
- `src/components/ui/empty-state.tsx` — bloco vazio amigável.

Aplicar em:
- `dashboard.tsx`: substituir `isLoading ? "—"` por skeleton nos cards KPI, cards de filial e no diálogo de detalhes (skeleton-table). Tratar `isError` mostrando `ErrorState`.
- `contas.tsx`: skeleton-table durante loading; ErrorState no `error`; EmptyState quando lista vazia.
- `recebimento.tsx`: skeleton nas listagens (parcelas listadas, sessões, cobradores) + ErrorState.
- `relatorios.tsx`: skeleton-table na área de resultados + ErrorState.

## 2. Cabeçalho e navegação mobile

`AppShell.tsx`:
- Mobile: manter menu hambúrguer, mas mover título/subtítulo para uma linha só e truncar.
- Ações do header (ex.: `UserMenu`, botões extras que cada página passa via prop) — agrupar em um `DropdownMenu` (ícone `MoreVertical`) no mobile. Ação primária de cada página (ex.: "Novo") continua visível como botão ícone.
- Adicionar prop `actions?: ReactNode` e `primaryAction?: { icon, label, onClick }` para padronizar.

Adaptar páginas que hoje passam vários botões no topo (`associados.tsx`, `contas.tsx`, `recebimento.tsx`, `relatorios.tsx`, `usuarios.tsx`) para consumir esse padrão.

## 3. Paginação e busca responsiva

- `associados.tsx` e `associados-lista.tsx`: adicionar `<Input>` de busca (nome/CPF/código) `w-full sm:w-72`, com debounce 300ms. Paginação client-side de 20 itens/página com controles `Anterior / Página X de Y / Próxima` em `flex-col sm:flex-row`.
- `relatorios.tsx`: mesma busca + paginação de 25 itens por página nos resultados.

Manter estado da busca em `useState` local; não migrar para URL para não alterar comportamento existente.

## 4. Formulários responsivos (sem zoom iOS/Android)

- Garantir em `styles.css` que já existe `font-size: 16px` em inputs no mobile (já implementado em turno anterior; verificar).
- Padronizar em todos os `Dialog`/`Sheet` de formulários:
  - Inputs, selects e textareas com `w-full`, altura `h-11` no mobile (`sm:h-10`).
  - Botões primários `w-full sm:w-auto`, secundários idem.
  - `DialogContent` com `w-[95vw] max-w-... max-h-[90dvh] overflow-y-auto` (usar `dvh` para lidar com barra de URL do mobile).
  - Padding interno `p-4 sm:p-6`.
- Adicionar utilitário `.form-input-mobile` em `styles.css` se necessário para consolidar.

Aplicar em diálogos das telas: associados, dependentes, planos, contas, centros-custo, cobradores, filiais, usuários.

## 5. Tabelas compactas com colunas ocultáveis

Criar `src/components/ui/responsive-table.tsx`:
- Recebe `columns: { key, label, hideOnMobile?: boolean, priority?: number }[]` e `rows`.
- No mobile (`< sm`): esconde colunas com `hideOnMobile: true`; usa fonte menor (`text-xs`) e padding reduzido; wrapper com `overflow-x-auto` para rolagem horizontal apenas se necessário; container com altura máxima e `overflow-y-auto` para não cortar em telas pequenas.
- No desktop: comportamento normal.
- Botão opcional "Mostrar mais colunas" no mobile que revela colunas escondidas (toggle local).

Aplicar seletivamente:
- `associados.tsx`, `associados-lista.tsx`: esconder CPF, email e telefone no mobile.
- `contas.tsx`: esconder centro de custo e categoria no mobile.
- `recebimento.tsx` (listagens): esconder colunas secundárias.
- `relatorios.tsx`: aplicar em cada tabela de resultado.

Não migrar todas as tabelas de uma vez — só as citadas para manter mudança focada.

## Fora de escopo

- Nenhuma mudança de dados, permissões, ou visual além da adaptação mobile.
- Não alterar rotas, URLs ou fluxos de negócio.

## Detalhes técnicos

- Componentes novos usam apenas Tailwind + shadcn existentes; sem novas dependências.
- Skeletons usam `<Skeleton>` do shadcn (`@/components/ui/skeleton`) — verificar se está instalado, senão criar arquivo simples com `animate-pulse bg-muted rounded`.
- Debounce da busca com `setTimeout` + `useEffect` (evitar adicionar biblioteca).
- Paginação: `useMemo` fatiando o array filtrado.
- ResponsiveTable expõe `renderCell(row, key)` para células customizadas (ex.: botões de ação).

## Verificação

Após aplicar, rodar Playwright em 390×844 nas rotas `/dashboard`, `/associados`, `/associados-lista`, `/contas`, `/recebimento`, `/relatorios`, `/usuarios` e conferir:
- Skeletons aparecem no primeiro load.
- Header não estoura, ações secundárias em menu.
- Busca e paginação funcionam sem overflow.
- Nenhum input causa zoom no iOS (font-size ≥ 16px).
- Tabelas mostram colunas essenciais sem corte vertical.
