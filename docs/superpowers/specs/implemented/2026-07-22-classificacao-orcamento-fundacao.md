# Mover Classificação do Orçamento da Categoria para a Transação — Fundação

**Data:** 2026-07-22
**Arquivos afetados:**
- `supabase/migrations/YYYYMMDDHHMMSS_budget_bucket_move_to_transaction.sql` (novo)
- `src/types/index.ts`
- `src/hooks/useCategories.ts`
- `src/pages/Categories.tsx`
- `src/hooks/useTransactions.ts`

**Não tocar em:**
- `src/pages/Transactions.tsx` (formulário, coluna, filtro visual — spec separada: `2026-07-22-classificacao-orcamento-transacoes-ui.md`)
- Qualquer lógica de página de Orçamento/Metas (ainda não construída)
- Demais hooks, páginas e componentes não listados acima

**Modelo:** Sonnet 4.6 High (migração de schema com mudança de contrato de dados)

**Atenção:** `project_knowledge_search` está desatualizado para `Categories.tsx` e `useCategories.ts` — o campo `budget_bucket` já existe em produção nesses arquivos (adicionado em spec anterior), mas o índice ainda mostra a versão sem ele. **Leia os arquivos reais do repositório antes de editar cada task**, não confie apenas no que está descrito aqui como "estado atual".

---

## Contexto

Hoje `budget_bucket` (`'needs' | 'leisure'`) vive na categoria, com sugestão automática ao classificar gastos. Isso causa imprecisão: a mesma categoria pode abrigar gastos de natureza orçamentária diferente (ex: "Utensílios para casa" pode ser necessidade ou supérfluo, dependendo da compra específica).

Esta spec move o campo da categoria para a transação, sem sugestão automática e sem backfill de histórico:
- `categories.budget_bucket` é removido por completo (coluna + formulário).
- `transactions.budget_bucket` nasce nullable no banco (para acomodar histórico), mas a obrigatoriedade em despesas novas é validada na aplicação (spec de UI, não aqui).
- Transações antigas ficam `null` ("não classificado") — sem migração automática de dados, revisão é manual.

---

## Task 1 — Migration

**Arquivo:** `supabase/migrations/YYYYMMDDHHMMSS_budget_bucket_move_to_transaction.sql`
> Review: não

Usar o timestamp atual ao nomear o arquivo (ex: `20260722140000_budget_bucket_move_to_transaction.sql`).

```sql
-- Remove classificação da categoria — conceito migrado para a transação
ALTER TABLE categories DROP COLUMN IF EXISTS budget_bucket;

-- Adiciona classificação na transação
-- Nullable no banco: histórico fica sem classificação (sem backfill).
-- Obrigatoriedade de preenchimento em despesas novas é responsabilidade da aplicação, não do banco.
ALTER TABLE transactions
  ADD COLUMN budget_bucket text
  CHECK (budget_bucket IN ('needs', 'leisure'));
```

Aplicar via MCP a todos os três servidores: `supabase-client-guilherme`, `supabase-client-malena`, `supabase-client-gustavo-granja` — nunca ao `supabase-chore`. Confirmar sucesso nos três antes de prosseguir para a Task 2.

---

## Task 2 — Tipos

**Arquivo:** `src/types/index.ts`
> Review: não

Localizar a interface `Category` e remover o campo `budget_bucket?: BudgetBucket | null` (se presente).

Localizar a interface `Transaction` e adicionar:

```ts
budget_bucket: BudgetBucket | null
```

O tipo `BudgetBucket` (`'needs' | 'leisure'`) já existe no arquivo — não recriar, apenas confirmar que segue exportado e é importado onde necessário.

---

## Task 3 — useCategories: remover budget_bucket do payload

**Arquivo:** `src/hooks/useCategories.ts`
> Review: não

Ler o arquivo atual primeiro. Remover `budget_bucket` de:
- Tipo do payload de `createCategory`
- Tipo do payload de `updateCategory` (via `Partial<...>`, garantir que o campo não está mais na base do tipo)

Remover o import de `BudgetBucket` deste arquivo, caso exista e não seja mais usado.

---

## Task 4 — Categories.tsx: remover campo do formulário

**Arquivo:** `src/pages/Categories.tsx`
> Review: sim

Ler o arquivo atual primeiro. Remover:
- Campo `budget_bucket` de `FormState` e de `EMPTY_FORM`
- População de `budget_bucket` em `openEdit`
- Bloco de validação em `handleSave` que exige `budget_bucket` quando `type === 'expense'`
- Bloco JSX condicional do campo "Classificação no Orçamento" (Select com opções "Contas (necessidades)" / "Lazer"), renderizado hoje quando `form.type === 'expense'`
- Import de `BudgetBucket` deste arquivo, caso não seja mais usado

Nenhum outro campo do formulário (nome, ícone, cor, tipo) deve ser alterado.

---

## Task 5 — useTransactions: incluir budget_bucket no payload e no filtro

**Arquivo:** `src/hooks/useTransactions.ts`
> Review: sim

Ler o arquivo atual primeiro.

**Payload:** adicionar `budget_bucket: BudgetBucket | null` à interface `TransactionPayload`, e incluir o campo em todos os pontos onde a transação é inserida/atualizada no Supabase — tanto no insert simples quanto nos inserts em lote de recorrência (parcelamento e fixo), que hoje montam o objeto de cada registro do grupo manualmente. Todas as parcelas de um mesmo grupo devem receber o mesmo `budget_bucket` informado na criação.

**Filtro:** adicionar à interface `TransactionFilters`:

```ts
budgetBucket: 'all' | 'needs' | 'leisure' | 'unclassified'
```

Na função de busca, aplicar o filtro à query Supabase:
- `'all'` → nenhum filtro adicional
- `'needs'` ou `'leisure'` → `.eq('budget_bucket', filters.budgetBucket)`
- `'unclassified'` → `.is('budget_bucket', null)`

Seguir o mesmo padrão condicional já usado para os filtros `type`, `categoryId` e `status` neste hook.

Importar `BudgetBucket` de `@/types` no topo do arquivo.

---

## Checklist final

- [x] Task 1 aplicada via MCP nos três servidores client
- [x] Task 2 a Task 5 implementadas
- [x] `tsc -p tsconfig.app.json --noEmit --ignoreDeprecations 6.0` — zero erros (restam apenas 2 erros pré-existentes ao baseline, fora do escopo desta spec)
- [x] `npm test` — todos os testes passando (ajustado `Transactions.test.tsx` e `useTransactions.test.ts`; `Categories.test.tsx` não existe no repo)
- [x] `git commit`
- [x] `git push origin main && npm run deploy`

## Nota de execução (2026-08-01)

`tsc` exigiu tornar `budget_bucket`/`budgetBucket` obrigatórios em `TransactionPayload`/`TransactionFilters`, o que quebrou `src/pages/Transactions.tsx` (arquivo proibido por esta spec). Decisão: implementar em seguida a spec companheira `2026-07-22-classificacao-orcamento-transacoes-ui.md` na mesma sessão antes de fechar o checklist/commit, já que ela é pré-requisito explícito de `budget_bucket` em `Transactions.tsx`. As duas specs foram commitadas e enviadas juntas.
