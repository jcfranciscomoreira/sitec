## Objetivo
Ativar a aba **O.S.** com a lista real, gerar automaticamente **Contas a Receber** ao salvar OS com itens e criar um **módulo de Estoque** que abate automaticamente quando a OS é concluída.

## 1. Aba "O.S." — listagem
Em `src/routes/_authenticated/servico-funerario.tsx`, substituir o placeholder da aba `os` por uma tabela responsiva com:
- Nº OS, Data, Falecido, Agente Responsável, Status (badge colorido), Valor total, Ações (abrir OSDialog, imprimir).
- Filtros: status (Aberta/Em Execução/Concluída/Cancelada) e busca por nome/nº.
- Fonte: `servicos_funerarios` + join com `servico_financeiro` para o valor.

## 2. Contas a Receber automáticas
No `OSDialog.tsx`, ao salvar a OS com `os_materiais`/checklist e valor total > 0:
- Upsert em `servico_financeiro` (já existe) com o total calculado.
- Upsert de UMA linha em `contas_financeiras`:
  - `tipo = 'entrada'`, `categoria = 'Serviço Funerário'`
  - `descricao = 'OS #<num> - <falecido>'`
  - `valor = total`, `vencimento = os_data` (ou hoje)
  - `status = 'pendente'`, `fornecedor_cliente = responsavel_nome`
  - `filial_id` do serviço
- Chave de idempotência: nova coluna `servico_id uuid` em `contas_financeiras` (com UNIQUE) para upsert e evitar duplicação em re-salvamentos.
- Se OS for cancelada, marcar a conta como `cancelado`.
- Regra: **não gera** para tipo `Plano` (já coberto pela mensalidade). Gera para Particular/Convênio/Prefeitura.

## 3. Módulo Estoque (tabela separada)
Nova tabela `public.estoque_itens`:
- `nome`, `unidade`, `quantidade` (numeric), `estoque_minimo`, `produto_id` (fk opcional → `servicos_produtos`), `ativo`, `filial_id`, timestamps.
- RLS: leitura/escrita para staff (padrão do módulo funerário).
- GRANTs para `authenticated` e `service_role`.

Nova tabela `public.estoque_movimentos` (auditoria):
- `item_id`, `tipo` ('entrada'|'saida'|'ajuste'), `quantidade`, `servico_id` (opcional), `observacao`, `created_by`, `created_at`.

Nova aba **Estoque** em Serviço Funerário com:
- Lista de itens (nome, quantidade, mínimo, badge "abaixo do mínimo").
- CRUD do item, entrada manual, ajuste, vínculo opcional com produto do catálogo.
- Histórico de movimentos por item.

## 4. Baixa automática ao concluir OS
No `OSDialog.tsx`, quando o status muda para **Concluída**:
- Para cada item do checklist vinculado a `produto_id` que exista em `estoque_itens` (via `produto_id`):
  - Inserir movimento `saida` com quantidade do checklist.
  - Decrementar `estoque_itens.quantidade`.
- Idempotência: gravar `servico_id` no movimento e checar se já existe movimento de saída para aquele `(servico_id, item_id)` antes de debitar (evita dupla baixa se reabrir e concluir de novo).
- Toast avisando itens sem estoque suficiente (não bloqueia, permite negativo com aviso — comportamento operacional comum).

## 5. Módulos e permissões
- Adicionar aba `estoque` em `SERVICO_FUNERARIO_MODULE` (`src/lib/servico-funerario-module.ts`).
- Permissão herdada do módulo `servico-funerario` (sem novo módulo raiz).

## Detalhes técnicos
- Migrations: uma para `estoque_itens` + `estoque_movimentos` + policies + grants; outra pequena para adicionar `servico_id uuid UNIQUE` em `contas_financeiras`.
- Server functions novas em `src/lib/estoque.functions.ts` (list/upsert/movimentar) usando `requireSupabaseAuth`.
- Lógica de contas + baixa de estoque encapsulada em helpers chamados pelo `OSDialog` após o save principal.
- Sem alterações de UI fora do módulo Serviço Funerário e da tabela `contas_financeiras`.
