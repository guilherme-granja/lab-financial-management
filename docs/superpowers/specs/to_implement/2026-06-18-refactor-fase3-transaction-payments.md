# SPEC — Refactor Fase 3: transaction_payments

**Data:** 2026-06-18
**Arquivos afetados:**
- `supabase/migrations/20260618120000_fase3_transaction_payments.sql`
- `src/types/index.ts`
- `src/hooks/useTransactions.ts`
- `src/pages/Transactions.tsx`

**Não tocar em:**
- `src/hooks/useDashboard.ts` — continua lendo `paid boolean` via cache; nenhuma mudança
- `src/hooks/useReports.ts` — idem
- `src/hooks/useAccounts.ts` — `getAccountBalance` usa `.eq('paid', true)`; nenhuma mudança
- `src/hooks/useTags.ts`
- `src/hooks/useDuplicateCheck.ts`
- `src/hooks/useGoals.ts`
- Qualquer arquivo de configuração

**Modelo:** Sonnet 4.6 High

**Pré-requisito:** Fases 1 e 2 commitadas e deployadas. Executar `git pull` no início da sessão.

---

## Contexto

As colunas `paid_at date` e `paid_amount numeric` em `transactions` são nulas em 333 das 429 linhas (78%). O evento de efetivação ("Efetivar") é um fato distinto da transação planejada. Esta fase cria a tabela `transaction_payments` para representar esse evento, migra os 96 registros com `paid_at IS NOT NULL`, e mantém a coluna `paid boolean` em `transactions` como cache para não quebrar nenhuma query de filtro existente. Um trigger mantém `paid` sincronizado automaticamente com a existência de um registro em `transaction_payments`.

---

## Task 1 — Migration

**Arquivo:** `supabase/migrations/20260618120000_fase3_transaction_payments.sql`
> Review: não

Criar o arquivo abaixo e aplicar com `npx supabase db push` antes de continuar.

```sql
-- =============================================================
-- FASE 3: Tabela transaction_payments
-- =============================================================

CREATE TABLE transaction_payments (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL UNIQUE REFERENCES transactions(id) ON DELETE CASCADE,
  paid_at        date NOT NULL,
  paid_amount    numeric(12,2) NOT NULL CHECK (paid_amount > 0),
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE transaction_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth only" ON transaction_payments FOR ALL USING (auth.uid() IS NOT NULL);

CREATE INDEX idx_transaction_payments_transaction_id ON transaction_payments(transaction_id);

-- Migrar os 96 registros com paid_at preenchido
INSERT INTO transaction_payments (transaction_id, paid_at, paid_amount)
SELECT id, paid_at, paid_amount
FROM transactions
WHERE paid_at IS NOT NULL
  AND paid_amount IS NOT NULL;

-- Trigger para manter `paid` boolean sincronizado automaticamente
CREATE OR REPLACE FUNCTION sync_transaction_paid()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE transactions SET paid = true WHERE id = NEW.transaction_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE transactions SET paid = false WHERE id = OLD.transaction_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_sync_transaction_paid
AFTER INSERT OR DELETE ON transaction_payments
FOR EACH ROW EXECUTE FUNCTION sync_transaction_paid();

-- Verificação de sanidade: paid deve ser true onde há payment
-- (os 96 registros já devem ter paid=true; trigger cuida do futuro)
UPDATE transactions t
SET paid = true
WHERE EXISTS (
  SELECT 1 FROM transaction_payments tp WHERE tp.transaction_id = t.id
)
AND paid = false;

-- NOTA: colunas `paid_at` e `paid_amount` são mantidas em transactions
-- para rollback de emergência. Não dropar nesta fase.
-- A coluna `paid boolean` é mantida permanentemente como cache de filtro.
```

---

## Task 2 — Tipos TypeScript

**Arquivo:** `src/types/index.ts`
> Review: não

Adicionar interface `TransactionPayment` após as interfaces da Fase 2. Não alterar nenhuma interface existente.

```ts
export interface TransactionPayment {
  id: string
  transaction_id: string
  paid_at: string
  paid_amount: number
  notes: string | null
  created_at: string
}
```

Adicionar campo `payment` na interface `Transaction`, após `paid_amount`:

```ts
// Adicionar em Transaction (após paid_amount):
payment?: TransactionPayment
```

---

## Task 3 — Hook useTransactions: SELECT e funções de efetivação

**Arquivo:** `src/hooks/useTransactions.ts`
> Review: sim

**3a — SELECT_FIELDS:** Incluir `transaction_payments(*)` no join.

```ts
const SELECT_FIELDS =
  '*, categories(*), accounts!account_id(*), to_accounts:accounts!to_account_id(*), tags(*), transaction_tags(*, tags(*)), recurrence_groups(*), transaction_payments(*)'
```

**3b — updateTransactionPayment:** Refatorar para inserir em `transaction_payments` em vez de fazer UPDATE em `transactions`. O trigger cuida de setar `paid = true` automaticamente.

```ts
async function updateTransactionPayment(
  id: string,
  paid_at: string,
  paid_amount: number,
): Promise<void> {
  // Upsert: se já existe um payment (re-efetivação), atualiza; senão insere
  const { error: err } = await supabase
    .from('transaction_payments')
    .upsert({ transaction_id: id, paid_at, paid_amount }, { onConflict: 'transaction_id' })
  if (err) throw new Error(err.message)
  // Atualiza também paid_at/paid_amount legados para compatibilidade de rollback
  await supabase.from('transactions').update({ paid_at, paid_amount }).eq('id', id)
  await fetch()
}
```

**3c — deleteTransaction:** Não precisa mudar — o `ON DELETE CASCADE` em `transaction_payments` remove o payment junto com a transação.

**3d — Função nova `unefetivate` (desfazer efetivação):** Adicionar ao hook para permitir reverter uma efetivação futura. Não expor na UI nesta spec — apenas disponibilizar no hook.

```ts
async function unefetivateTransaction(id: string): Promise<void> {
  await supabase.from('transaction_payments').delete().eq('transaction_id', id)
  // Limpa campos legados
  await supabase
    .from('transactions')
    .update({ paid_at: null, paid_amount: null })
    .eq('id', id)
  await fetch()
}
```

Adicionar `unefetivateTransaction` ao objeto retornado pelo hook.

**3e — createTransaction:** Ao criar transação com `paid = true`, inserir em `transaction_payments` após o INSERT principal (somente para transações não-recorrentes e para a parcela atual de recorrentes). A lógica é: se `isPaid` (determinado como hoje), inserir payment.

Para o branch `installment` e `fixed`, o payment deve ser criado apenas para as parcelas onde `isPaid = true` (data = mês atual). Usar `Promise.all` com os IDs retornados pelo insert em batch:

```ts
// Após o INSERT batch de recorrentes, ao final de cada branch:
const paidRecords = records
  .map((r, i) => ({ r, id: insertedIds[i] }))
  .filter(({ r }) => r.paid)

if (paidRecords.length > 0) {
  await supabase.from('transaction_payments').insert(
    paidRecords.map(({ r, id }) => ({
      transaction_id: id,
      paid_at: r.paid_at,
      paid_amount: r.paid_amount,
    }))
  )
}
```

> Nota: o INSERT batch precisa retornar IDs via `.select('id')`. Ajustar os dois INSERTs de batch para usar `.select('id')` e capturar os IDs correspondentes a cada posição do array.

Para transação simples (branch final): se `payload.paid`, inserir em `transaction_payments` após capturar o `id`.

Restrição: não alterar `TransactionPayload` — `paid`, `paid_at` e `paid_amount` permanecem no payload para compatibilidade com o formulário existente.

---

## Task 4 — Transactions.tsx: modal de efetivação via payment

**Arquivo:** `src/pages/Transactions.tsx`
> Review: sim

**4a — Preencher payForm ao abrir modal:** Ao abrir o modal de efetivação (botão "Efetivar"), popular `payForm` a partir de `tx.payment` se existir, mantendo os campos legados como fallback:

```ts
// Na função que abre o modal de efetivação (procurar pela linha ~198):
paid_at: tx.payment?.paid_at ?? format(new Date(), 'yyyy-MM-dd'),
paid_amount: String(tx.payment?.paid_amount ?? tx.amount),
```

**4b — `handlePay`:** Sem mudança de chamada — continua chamando `updateTransactionPayment(id, paid_at, paid_amount)`. O hook já cuida de inserir em `transaction_payments`.

**4c — Coluna Status:** Ajustar para ler `tx.payment` como fonte de verdade quando disponível, mantendo `tx.paid` como fallback:

```ts
// Na renderização da coluna status (linha ~920):
{(tx.payment || tx.paid) ? (
  // badge "Pago" — se tx.payment existir, mostrar tx.payment.paid_at
  // senão mostrar tx.paid_at legado
) : (
  // badge "Pendente"
)}
```

Usar `tx.payment?.paid_at ?? tx.paid_at` onde a data de efetivação é exibida.

Restrição: não alterar filtros, paginação, lógica de recorrência, tags, nem qualquer seção não relacionada ao fluxo de efetivação.

---

## Checklist

- [ ] `git pull` executado (Fases 1 e 2 devem estar no histórico)
- [ ] Task 1 concluída e `npx supabase db push` aplicado com sucesso
- [ ] Verificar: `SELECT COUNT(*) FROM transaction_payments` = 96
- [ ] Verificar: `SELECT COUNT(*) FROM transactions WHERE paid = true AND NOT EXISTS (SELECT 1 FROM transaction_payments tp WHERE tp.transaction_id = transactions.id)` = 0
- [ ] Task 2 concluída
- [ ] Task 3 concluída
- [ ] Task 4 concluída
- [ ] `tsc --noEmit` — zero erros
- [ ] Testar: efetivar transação pendente → `transaction_payments` recebe 1 linha, `paid` vira `true`
- [ ] Testar: transações já pagas exibem data de `payment.paid_at`
- [ ] Testar: criar transação parcelada com paid=true → payment criado apenas para parcela atual
- [ ] `git commit -m "feat: refactor fase 3 — transaction_payments como entidade de efetivação"`
- [ ] `git push origin main && npm run deploy`
