# SPEC — Refactor Fase 1: transaction_types e transaction_tags (pivot N:N)

**Data:** 2026-06-18
**Arquivos afetados:**
- `supabase/migrations/20260618100000_fase1_transaction_types_tags_pivot.sql`
- `src/types/index.ts`
- `src/hooks/useTransactions.ts`
- `src/hooks/useTags.ts`
- `src/pages/Transactions.tsx`

**Não tocar em:**
- `src/hooks/useDashboard.ts` — continua filtrando por `type` text; coluna permanece em `transactions`
- `src/hooks/useReports.ts` — idem
- `src/hooks/useAccounts.ts` — idem
- `src/hooks/useDuplicateCheck.ts` — idem
- `src/hooks/useGoals.ts` — idem
- Qualquer arquivo de configuração (vite, tsconfig, tailwind)

**Modelo:** Sonnet 4.6 High

**Pré-requisito:** Nenhum. Esta é a primeira fase do refactor.

---

## Contexto

A tabela `transactions` usa a coluna `type text` com CHECK CONSTRAINT para os valores `'income'|'expense'|'transfer'`. Não há tabela de lookup: labels, ícones e o flag `affects_balance` estão hardcoded no app. A coluna `tag_id uuid` é FK direta para `tags`, limitando cada transação a 1 tag; 277 das 429 transações já usam tags, evidenciando demanda real de multi-tag. Esta fase cria a infraestrutura das duas correções mantendo zero perda de dados e compatibilidade total com o app existente via coluna `type` preservada.

---

## Task 1 — Migration

**Arquivo:** `supabase/migrations/20260618100000_fase1_transaction_types_tags_pivot.sql`
> Review: não

Criar o arquivo abaixo e aplicar com `npx supabase db push` antes de continuar.

```sql
-- =============================================================
-- FASE 1A: Tabela transaction_types
-- =============================================================

CREATE TABLE transaction_types (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text NOT NULL UNIQUE,
  label         text NOT NULL,
  icon          text NOT NULL DEFAULT '💰',
  affects_balance boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE transaction_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth only" ON transaction_types FOR ALL USING (auth.uid() IS NOT NULL);

-- Seed dos 3 tipos existentes
INSERT INTO transaction_types (slug, label, icon, affects_balance) VALUES
  ('income',   'Receita',    '⬆️', true),
  ('expense',  'Despesa',    '⬇️', true),
  ('transfer', 'Transferência', '↔️', false);

-- FK em transactions apontando para transaction_types (nullable durante coexistência)
ALTER TABLE transactions
  ADD COLUMN type_id uuid REFERENCES transaction_types(id) ON DELETE RESTRICT;

-- Preencher type_id a partir do slug existente em `type`
UPDATE transactions t
SET type_id = tt.id
FROM transaction_types tt
WHERE tt.slug = t.type;

-- Índice para queries por type_id
CREATE INDEX idx_transactions_type_id ON transactions(type_id);

-- =============================================================
-- FASE 1B: Tabela transaction_tags (pivot N:N)
-- =============================================================

CREATE TABLE transaction_tags (
  transaction_id uuid NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  tag_id         uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (transaction_id, tag_id)
);

ALTER TABLE transaction_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth only" ON transaction_tags FOR ALL USING (auth.uid() IS NOT NULL);

-- Migrar dados existentes: tag_id direto → pivot
INSERT INTO transaction_tags (transaction_id, tag_id)
SELECT id, tag_id
FROM transactions
WHERE tag_id IS NOT NULL;

-- Índice para lookup inverso (quais transações têm uma tag)
CREATE INDEX idx_transaction_tags_tag_id ON transaction_tags(tag_id);

-- NOTA: as colunas `type` (text) e `tag_id` (uuid) são mantidas em transactions
-- para compatibilidade com o app atual. Serão removidas na Fase 3 ou em spec futura.
-- Não adicionar NOT NULL em type_id nem dropar tag_id aqui.
```

---

## Task 2 — Tipos TypeScript

**Arquivo:** `src/types/index.ts`
> Review: não

Adicionar as duas interfaces novas após as existentes. Não alterar nenhuma interface existente.

```ts
export interface TransactionType {
  id: string
  slug: string
  label: string
  icon: string
  affects_balance: boolean
  created_at: string
}

export interface TransactionTag {
  transaction_id: string
  tag_id: string
  created_at: string
  tags?: Tag
}
```

Adicionar campo `type_id` e `transaction_tags` na interface `Transaction` (após `tag_id`):

```ts
// Adicionar nos campos existentes de Transaction:
type_id: string | null
transaction_tags?: TransactionTag[]
```

---

## Task 3 — Hook useTags: adicionar operações de pivot

**Arquivo:** `src/hooks/useTags.ts`
> Review: sim

Adicionar ao retorno do hook duas funções que operam na tabela `transaction_tags`. Não alterar as funções `createTag` e `deleteTag` já existentes.

```ts
// Adicionar dentro do hook, antes do return:

async function addTagToTransaction(transactionId: string, tagId: string): Promise<void> {
  const { error: err } = await supabase
    .from('transaction_tags')
    .insert({ transaction_id: transactionId, tag_id: tagId })
  if (err) throw new Error(err.message)
}

async function removeTagFromTransaction(transactionId: string, tagId: string): Promise<void> {
  const { error: err } = await supabase
    .from('transaction_tags')
    .delete()
    .eq('transaction_id', transactionId)
    .eq('tag_id', tagId)
  if (err) throw new Error(err.message)
}

async function setTransactionTags(transactionId: string, tagIds: string[]): Promise<void> {
  // Deleta todos os vínculos existentes e reinsere os novos (upsert completo)
  await supabase.from('transaction_tags').delete().eq('transaction_id', transactionId)
  if (tagIds.length === 0) return
  const rows = tagIds.map((tag_id) => ({ transaction_id: transactionId, tag_id }))
  const { error: err } = await supabase.from('transaction_tags').insert(rows)
  if (err) throw new Error(err.message)
}
```

Adicionar as três funções ao objeto retornado pelo hook.

---

## Task 4 — Hook useTransactions: SELECT_FIELDS e tag_id no payload

**Arquivo:** `src/hooks/useTransactions.ts`
> Review: sim

**4a — SELECT_FIELDS:** Incluir `transaction_tags(tags(*))` no join. A coluna `tag_id` original permanece no select via `*` por compatibilidade.

```ts
const SELECT_FIELDS =
  '*, categories(*), accounts!account_id(*), to_accounts:accounts!to_account_id(*), tags(*), transaction_tags(*, tags(*))'
```

**4b — TransactionPayload:** Adicionar campo `tag_ids` (array) ao lado do `tag_id` legado. Ambos coexistem durante a transição.

```ts
// Adicionar em TransactionPayload:
tag_ids: string[]   // novo — lista de tag IDs para a pivot
// manter tag_id: string | null  — legado, usado no filtro de queries
```

**4c — createTransaction e updateTransaction:** Após o `supabase.from('transactions').insert/update`, chamar `setTransactionTags(id, payload.tag_ids)` quando `payload.tag_ids` não for vazio. O `id` do insert deve ser capturado via `.select('id').single()`.

Restrição: não reescrever a lógica de recorrência (installment/fixed); inserir chamada a `setTransactionTags` apenas após o INSERT/UPDATE final de cada branch, usando o `id` retornado.

---

## Task 5 — Transactions.tsx: formulário multi-tag

**Arquivo:** `src/pages/Transactions.tsx`
> Review: sim

Esta task é a maior e deve ser feita por inteiro antes de avançar. Ler o arquivo completo antes de editar.

**5a — FormState:** Substituir `tag_id: string` por `tag_ids: string[]` no estado do formulário e no valor inicial (`tag_ids: []`). Manter o filtro `tagId` no `TransactionFilters` inalterado — ele ainda filtra por `tag_id` na coluna legada.

**5b — Preencher form ao editar:** Ao abrir modal de edição (função que monta o `form` a partir de `tx`), popular `tag_ids` a partir de `tx.transaction_tags?.map(tt => tt.tag_id) ?? []`. Remover a linha que populava `tag_id`.

**5c — Campo de tag no modal:** Substituir o `<Select>` de tag única por um componente de seleção múltipla. Usar o padrão de `SearchableSelect` já existente em `src/components/ui/searchable-select.tsx` como base visual; se não suportar multi-select nativamente, usar checkboxes dentro de um `<Popover>` + `<Command>` (mesmo padrão do SearchableSelect, mas com `checkbox` ao lado de cada item e badge de contagem no trigger). Exibir badges das tags selecionadas abaixo do campo.

**5d — Payload ao salvar:** Passar `tag_ids: form.tag_ids` no `TransactionPayload`. Remover `tag_id` do payload.

**5e — Coluna Tag na tabela:** Ajustar renderização da coluna `tag` para iterar em `tx.transaction_tags` em vez de `tx.tags`. Exibir badges para cada tag. Se houver mais de 2, mostrar "+N".

Restrição: não alterar lógica de filtro, paginação, recorrência, pagamento ou qualquer seção não relacionada a tags.

---

## Checklist

- [ ] Task 1 concluída e `npx supabase db push` aplicado com sucesso
- [ ] Verificar no Supabase: `SELECT COUNT(*) FROM transaction_tags` = 277
- [ ] Verificar: `SELECT COUNT(*) FROM transactions WHERE type_id IS NULL` = 0
- [ ] Task 2 concluída
- [ ] Task 3 concluída
- [ ] Task 4 concluída
- [ ] Task 5 concluída
- [ ] `tsc --noEmit` — zero erros
- [ ] Testar: criar transação com 2 tags → verificar pivot salva 2 linhas
- [ ] Testar: editar transação → tags carregam corretamente
- [ ] `git commit -m "feat: refactor fase 1 — transaction_types e tags pivot N:N"`
- [ ] `git push origin main && npm run deploy`
