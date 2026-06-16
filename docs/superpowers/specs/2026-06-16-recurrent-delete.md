# SPEC — Exclusão de Transações Recorrentes

**Data:** 2026-06-16
**Arquivos afetados:**
- `src/hooks/useTransactions.ts`
- `src/pages/Transactions.tsx`

**Não tocar em:**
- `src/hooks/useAccounts.ts`
- `src/hooks/useCategories.ts`
- `src/pages/Accounts.tsx`
- `src/pages/Categories.tsx`
- `src/pages/Dashboard.tsx`
- `src/pages/Reports.tsx`
- `supabase/migrations/*`

---

## Contexto

O hook `useTransactions` tem um método `deleteTransaction(id)` que deleta um único registro. A tabela `transactions` tem os campos `recurrence_group_id` (uuid | null) e `paid` (boolean). Transações recorrentes compartilham o mesmo `recurrence_group_id`. Atualmente, ao excluir qualquer transação, sempre deleta apenas aquela — sem considerar o grupo.

---

## Task 1 — Hook: novos métodos de delete em grupo

**Arquivo:** `src/hooks/useTransactions.ts`

Manter o método `deleteTransaction(id)` existente sem alteração. Adicionar dois métodos novos ao lado:

```ts
// Deleta o registro atual + todos do grupo com paid = false
async function deleteTransactionGroupUnpaid(
  id: string,
  groupId: string
): Promise<void> {
  await supabase
    .from('transactions')
    .delete()
    .eq('id', id)

  await supabase
    .from('transactions')
    .delete()
    .eq('recurrence_group_id', groupId)
    .eq('paid', false)
    .neq('id', id)
}

// Deleta todos os registros do grupo
async function deleteTransactionGroup(groupId: string): Promise<void> {
  await supabase
    .from('transactions')
    .delete()
    .eq('recurrence_group_id', groupId)
}
```

Expor os dois métodos novos no retorno do hook.

---

## Task 2 — Transactions.tsx: Dialog de exclusão recorrente

**Arquivo:** `src/pages/Transactions.tsx`

Substituir a lógica atual de exclusão (que chama `deleteTransaction` diretamente ou via confirmação simples) pela lógica abaixo.

**Ao clicar em excluir uma transação:**

1. Se `transaction.recurrence_group_id === null` → comportamento atual (confirmação simples ou exclusão direta)
2. Se `transaction.recurrence_group_id !== null` → abrir Dialog com radio buttons

**Dialog de exclusão recorrente:**
- Título: "Excluir transação recorrente"
- Subtítulo: "Esta transação faz parte de um grupo recorrente. O que deseja excluir?"
- Radio buttons (usar componente `RadioGroup` do shadcn):
  - `only` → "Somente esta transação" *(padrão selecionado)*
  - `unpaid` → "Esta e as pendentes do grupo (não pagas)"
  - `all` → "Todas as transações do grupo"
- Botão "Cancelar" e botão "Excluir" (variant destructive, vermelho)

**Ao confirmar:**
```ts
if (option === 'only')   deleteTransaction(transaction.id)
if (option === 'unpaid') deleteTransactionGroupUnpaid(transaction.id, transaction.recurrence_group_id)
if (option === 'all')    deleteTransactionGroup(transaction.recurrence_group_id)
```

Não reescrever o arquivo inteiro — apenas substituir o handler de exclusão e adicionar o Dialog novo. O Dialog de exclusão recorrente é separado do Dialog de edição existente.

---

## Checklist

- [ ] Task 1 — `deleteTransactionGroupUnpaid` e `deleteTransactionGroup` adicionados
- [ ] Task 2 — Dialog de exclusão recorrente implementado
- [ ] `tsc --noEmit` — zero erros
- [ ] `git commit -m "feat: recurrent transaction delete with group options"`
- [ ] `git push origin main && npm run deploy`