# SPEC — Refactor Fase 2: recurrence_groups

**Data:** 2026-06-18
**Arquivos afetados:**
- `supabase/migrations/20260618110000_fase2_recurrence_groups.sql`
- `src/types/index.ts`
- `src/hooks/useTransactions.ts`
- `src/pages/Transactions.tsx`

**Não tocar em:**
- `src/hooks/useDashboard.ts`
- `src/hooks/useReports.ts`
- `src/hooks/useAccounts.ts`
- `src/hooks/useTags.ts`
- `src/hooks/useDuplicateCheck.ts`
- `src/hooks/useGoals.ts`
- Qualquer arquivo de configuração

**Modelo:** Sonnet 4.6 High

**Pré-requisito:** Fase 1 commitada e deployada (`git log` deve conter o commit da Fase 1). Executar `git pull` no início da sessão.

---

## Contexto

Cada transação recorrente carrega individualmente colunas `recurrence`, `installments`, `installment_index` e `recurrence_group_id`. Com 344 das 429 transações recorrentes divididas em 19 grupos, os metadados do grupo se repetem em cada linha membro (grupos `fixed` têm 24 cópias cada). Esta fase cria a tabela `recurrence_groups` como entidade própria, migra os 19 grupos existentes para ela, transforma `recurrence_group_id` em FK real e remove as colunas redundantes de `transactions`.

---

## Task 1 — Migration

**Arquivo:** `supabase/migrations/20260618110000_fase2_recurrence_groups.sql`
> Review: não

Criar o arquivo abaixo e aplicar com `npx supabase db push` antes de continuar.

```sql
-- =============================================================
-- FASE 2: Tabela recurrence_groups
-- =============================================================

CREATE TABLE recurrence_groups (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recurrence_type     text NOT NULL CHECK (recurrence_type IN ('installment', 'fixed')),
  total_installments  integer NOT NULL CHECK (total_installments > 0),
  description_template text,
  starts_at           date NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE recurrence_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth only" ON recurrence_groups FOR ALL USING (auth.uid() IS NOT NULL);

-- Migrar os 19 grupos existentes a partir dos dados em transactions.
-- Para cada grupo distinto, pega o valor do membro com installment_index = 1
-- (ou MIN se não houver índice 1) para reconstruir os metadados.
INSERT INTO recurrence_groups (id, recurrence_type, total_installments, description_template, starts_at)
SELECT
  recurrence_group_id                                         AS id,
  recurrence                                                  AS recurrence_type,
  COALESCE(MAX(installments), 1)                              AS total_installments,
  -- Remove sufixo " (N/M)" da description para obter o template limpo
  regexp_replace(
    (ARRAY_AGG(description ORDER BY installment_index ASC NULLS LAST))[1],
    ' \(\d+/\d+\)$', ''
  )                                                           AS description_template,
  MIN(date)                                                   AS starts_at
FROM transactions
WHERE recurrence_group_id IS NOT NULL
  AND recurrence != 'none'
GROUP BY recurrence_group_id, recurrence;

-- Transformar recurrence_group_id em FK real para recurrence_groups
-- (era uuid livre sem constraint)
ALTER TABLE transactions
  ADD CONSTRAINT transactions_recurrence_group_id_fkey
  FOREIGN KEY (recurrence_group_id) REFERENCES recurrence_groups(id) ON DELETE CASCADE;

-- Índice para busca por grupo
CREATE INDEX idx_transactions_recurrence_group_id ON transactions(recurrence_group_id)
  WHERE recurrence_group_id IS NOT NULL;

-- NOTA: as colunas redundantes (recurrence, installments, installment_index)
-- são mantidas em transactions nesta fase para compatibilidade com o app atual.
-- installment_index continua necessário para renderização do badge "X/N".
-- `recurrence` e `installments` serão deprecados mas não dropados nesta spec
-- — remoção na Fase 3 ou em spec dedicada após validação.
```

---

## Task 2 — Tipos TypeScript

**Arquivo:** `src/types/index.ts`
> Review: não

Adicionar interface `RecurrenceGroup` após as interfaces da Fase 1. Não alterar nenhuma interface existente.

```ts
export interface RecurrenceGroup {
  id: string
  recurrence_type: RecurrenceType
  total_installments: number
  description_template: string | null
  starts_at: string
  created_at: string
}
```

Adicionar campo `recurrence_group` (objeto join) na interface `Transaction`, após `recurrence_group_id`:

```ts
// Adicionar em Transaction (após recurrence_group_id):
recurrence_group?: RecurrenceGroup
```

---

## Task 3 — Hook useTransactions: join com recurrence_groups

**Arquivo:** `src/hooks/useTransactions.ts`
> Review: sim

**3a — SELECT_FIELDS:** Incluir `recurrence_groups(*)` no join existente.

```ts
const SELECT_FIELDS =
  '*, categories(*), accounts!account_id(*), to_accounts:accounts!to_account_id(*), tags(*), transaction_tags(*, tags(*)), recurrence_groups(*)'
```

**3b — createTransaction (branch `installment`):** Antes de inserir as N parcelas, criar o grupo em `recurrence_groups` e usar o `id` retornado como `groupId`. Substituir `crypto.randomUUID()` pela PK retornada do INSERT.

```ts
// Substituir: const groupId = crypto.randomUUID()
// Por:
const { data: groupData, error: groupErr } = await supabase
  .from('recurrence_groups')
  .insert({
    recurrence_type: 'installment',
    total_installments: n,
    description_template: payload.description,
    starts_at: payload.date,
  })
  .select('id')
  .single()
if (groupErr) throw new Error(groupErr.message)
const groupId = groupData.id
```

**3c — createTransaction (branch `fixed`):** Mesma substituição para o grupo `fixed`.

```ts
const { data: groupData, error: groupErr } = await supabase
  .from('recurrence_groups')
  .insert({
    recurrence_type: 'fixed',
    total_installments: n,
    description_template: payload.description,
    starts_at: payload.date,
  })
  .select('id')
  .single()
if (groupErr) throw new Error(groupErr.message)
const groupId = groupData.id
```

**3d — deleteTransactionGroup:** Deletar o grupo em `recurrence_groups` após deletar as transações. A FK `ON DELETE CASCADE` já cuida das transações ao deletar o grupo — simplificar a função:

```ts
async function deleteTransactionGroup(groupId: string): Promise<void> {
  // CASCADE apaga as transactions automaticamente
  await supabase.from('recurrence_groups').delete().eq('id', groupId)
  await fetch()
}
```

**3e — deleteTransactionGroupUnpaid:** Mantém o comportamento atual (deleta transações individuais não pagas). Não precisa tocar no grupo em si, pois o grupo continua representando a série completa.

Restrição: não alterar a lógica de filtro, paginação, `sumQuery`, nem nenhuma outra função do hook.

---

## Task 4 — Transactions.tsx: badge de recorrência via recurrence_group

**Arquivo:** `src/pages/Transactions.tsx`
> Review: sim

**4a — Função `recurrenceBadge`:** Ajustar para usar `tx.recurrence_group` quando disponível, com fallback para os campos legados `tx.recurrence` e `tx.installments`.

```ts
function recurrenceBadge(tx: Transaction) {
  const group = tx.recurrence_group
  if (group) {
    return group.recurrence_type === 'fixed'
      ? 'Fixo'
      : tx.installment_index && group.total_installments
      ? `${tx.installment_index}/${group.total_installments}`
      : null
  }
  // fallback legado
  if (!tx.recurrence || tx.recurrence === 'none') return null
  return tx.recurrence === 'fixed'
    ? 'Fixo'
    : tx.installment_index && tx.installments
    ? `${tx.installment_index}/${tx.installments}`
    : null
}
```

**4b — Modal de criação/edição:** Nenhuma mudança de UI — o formulário continua com os campos `recurrence` e `installments` no `FormState`. O hook cuida de criar o grupo ao salvar.

Restrição: não alterar qualquer outra lógica de formulário, filtros ou paginação.

---

## Checklist

- [ ] `git pull` executado no início da sessão (Fase 1 deve estar no histórico)
- [ ] Task 1 concluída e `npx supabase db push` aplicado com sucesso
- [ ] Verificar: `SELECT COUNT(*) FROM recurrence_groups` = 19
- [ ] Verificar: `SELECT COUNT(*) FROM transactions WHERE recurrence_group_id IS NOT NULL AND type_id IS NULL` = 0
- [ ] Task 2 concluída
- [ ] Task 3 concluída
- [ ] Task 4 concluída
- [ ] `tsc --noEmit` — zero erros
- [ ] Testar: criar transação parcelada → grupo criado em `recurrence_groups`
- [ ] Testar: badge "X/N" renderiza corretamente nas transações existentes
- [ ] Testar: excluir grupo → todas as parcelas removidas via CASCADE
- [ ] `git commit -m "feat: refactor fase 2 — recurrence_groups como entidade própria"`
- [ ] `git push origin main && npm run deploy`
