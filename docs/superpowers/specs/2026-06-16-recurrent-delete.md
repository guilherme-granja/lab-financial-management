# SPEC — Exclusão de Transações Recorrentes

**Data:** 2026-06-16
**Arquivos afetados:**
- `src/hooks/useTransactions.ts`
- `src/pages/Transactions.tsx`
- `src/components/ui/radio-group.tsx` (novo — instalar via shadcn)

**Não tocar em:**
- `src/hooks/useAccounts.ts`
- `src/hooks/useCategories.ts`
- `src/pages/Accounts.tsx`
- `src/pages/Categories.tsx`
- `src/pages/Dashboard.tsx`
- `src/pages/Reports.tsx`
- `supabase/migrations/*`

**Modelo:** Sonnet padrão

---

## Contexto

O hook `useTransactions` tem `deleteTransaction(id)` que deleta um único registro. A tabela `transactions` tem `recurrence_group_id` (uuid | null) e `paid` (boolean). Transações recorrentes compartilham o mesmo `recurrence_group_id`. O dialog de exclusão atual (`deleteId` + Dialog simples, linha ~749 de `Transactions.tsx`) não considera grupos. `RadioGroup` do shadcn não está instalado — precisa ser adicionado antes de usar.

---

## Task 1 — Instalar RadioGroup do shadcn

**Arquivo:** `src/components/ui/radio-group.tsx` (gerado automaticamente)
> Review: não

```bash
npx shadcn@latest add radio-group
```

Confirmar que `src/components/ui/radio-group.tsx` foi criado antes de prosseguir.

---

## Task 2 — Hook: novos métodos de delete em grupo

**Arquivo:** `src/hooks/useTransactions.ts`
> Review: não

Manter o método `deleteTransaction(id)` existente sem alteração. Adicionar dois métodos novos:

```ts
async function deleteTransactionGroupUnpaid(
  id: string,
  groupId: string
): Promise<void> {
  await supabase.from('transactions').delete().eq('id', id)
  await supabase
    .from('transactions')
    .delete()
    .eq('recurrence_group_id', groupId)
    .eq('paid', false)
    .neq('id', id)
  await fetchTransactions()
}

async function deleteTransactionGroup(groupId: string): Promise<void> {
  await supabase.from('transactions').delete().eq('recurrence_group_id', groupId)
  await fetchTransactions()
}
```

Verificar o nome exato da função de refetch no hook (pode ser `fetchTransactions`, `fetch` ou `refetch`) e usar o que já existe. Expor os dois métodos no retorno do hook.

---

## Task 3 — Transactions.tsx: Dialog de exclusão recorrente

**Arquivo:** `src/pages/Transactions.tsx`
> Review: sim

O estado `deleteId` atual (linha ~82) controla o dialog de exclusão simples. Manter esse estado e adicionar dois novos:

```ts
const [deleteScope, setDeleteScope] = useState<'only' | 'unpaid' | 'all'>('only')
const [deleteTx, setDeleteTx] = useState<Transaction | null>(null)
```

**Ao clicar em excluir** (linha ~453, `onClick={() => setDeleteId(tx.id)}`), substituir por:

```ts
onClick={() => {
  if (tx.recurrence_group_id) {
    setDeleteTx(tx)
    setDeleteScope('only')
  } else {
    setDeleteId(tx.id)
  }
}}
```

**Handler de confirmação do dialog recorrente:**

```ts
async function handleRecurrentDelete() {
  if (!deleteTx) return
  try {
    if (deleteScope === 'only') {
      await deleteTransaction(deleteTx.id)
    } else if (deleteScope === 'unpaid') {
      await deleteTransactionGroupUnpaid(deleteTx.id, deleteTx.recurrence_group_id!)
    } else {
      await deleteTransactionGroup(deleteTx.recurrence_group_id!)
    }
  } finally {
    setDeleteTx(null)
    setDeleteScope('only')
  }
}
```

**Dialog de exclusão recorrente** (adicionar separado do Dialog existente):

```tsx
<Dialog open={!!deleteTx} onOpenChange={() => setDeleteTx(null)}>
  <DialogContent className="bg-[#1a1d27] border-[#2d3148] text-slate-200">
    <DialogHeader>
      <DialogTitle>Excluir transação recorrente</DialogTitle>
    </DialogHeader>
    <p className="text-slate-400 text-sm">
      Esta transação faz parte de um grupo recorrente. O que deseja excluir?
    </p>
    <RadioGroup
      value={deleteScope}
      onValueChange={(v) => setDeleteScope(v as typeof deleteScope)}
      className="space-y-2"
    >
      {[
        { value: 'only',   label: 'Somente esta transação' },
        { value: 'unpaid', label: 'Esta e as pendentes do grupo (não pagas)' },
        { value: 'all',    label: 'Todas as transações do grupo' },
      ].map(({ value, label }) => (
        <div key={value} className="flex items-center gap-3 p-3 rounded-lg border border-[#2d3148] cursor-pointer hover:border-indigo-600 transition-colors">
          <RadioGroupItem value={value} id={value} className="border-slate-600" />
          <Label htmlFor={value} className="text-slate-200 text-sm cursor-pointer">{label}</Label>
        </div>
      ))}
    </RadioGroup>
    <DialogFooter>
      <Button variant="ghost" onClick={() => setDeleteTx(null)} className="text-slate-400">
        Cancelar
      </Button>
      <Button onClick={handleRecurrentDelete} className="bg-red-700 hover:bg-red-800 text-white">
        Excluir
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

Não reescrever o arquivo inteiro — apenas adicionar os estados, o handler e o Dialog acima.

---

## Checklist

- [ ] Task 1 — `radio-group` instalado via shadcn
- [ ] Task 2 — `deleteTransactionGroupUnpaid` e `deleteTransactionGroup` adicionados ao hook
- [ ] Task 3 — Dialog de exclusão recorrente implementado
- [ ] `tsc --noEmit` — zero erros
- [ ] `git commit -m "feat: recurrent transaction delete with group options"`
- [ ] `git push origin main && npm run deploy`