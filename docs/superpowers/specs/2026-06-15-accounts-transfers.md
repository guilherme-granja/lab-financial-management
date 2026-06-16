# SPEC-2 — Exclusão de Transações Recorrentes

**Data:** 2026-06-16
**Arquivos afetados:** `useTransactions.ts`, `Transactions.tsx`
**Não tocar em:** migrations, types, outros hooks, outras páginas

---

## Contexto

`useTransactions.ts` tem apenas `deleteTransaction(id)` — exclui um único registro.
`Transactions.tsx` já tem um dialog de confirmação de exclusão simples.

Transações recorrentes têm `recurrence_group_id` (uuid que agrupa parcelas do mesmo grupo). Ao excluir uma delas, o usuário precisa escolher o escopo da exclusão.

---

## Task 1 — Adicionar novos métodos de delete em `useTransactions.ts`

**Arquivo:** `src/hooks/useTransactions.ts`

Adicionar as duas funções abaixo. Não remover o `deleteTransaction` existente.

```ts
async function deleteTransactionGroupUnpaid(groupId: string): Promise<void> {
  // Exclui todas do grupo com paid = false
  const { error: err } = await supabase
    .from('transactions')
    .delete()
    .eq('recurrence_group_id', groupId)
    .eq('paid', false)
  if (err) throw new Error(err.message)
  await fetchTransactions()
}

async function deleteTransactionGroup(groupId: string): Promise<void> {
  // Exclui todas do grupo (pagas e não pagas)
  const { error: err } = await supabase
    .from('transactions')
    .delete()
    .eq('recurrence_group_id', groupId)
  if (err) throw new Error(err.message)
  await fetchTransactions()
}
```

Verificar o nome exato da função de refetch dentro do hook (pode ser `fetchTransactions`, `refetch`, `fetch` — usar o que existe).

Incluir `deleteTransactionGroupUnpaid` e `deleteTransactionGroup` no objeto retornado do hook.

---

## Task 2 — Atualizar dialog de exclusão em `Transactions.tsx`

**Arquivo:** `src/pages/Transactions.tsx`

### Adicionar ao destructuring do hook
```ts
const { ..., deleteTransactionGroupUnpaid, deleteTransactionGroup } = useTransactions(...)
```

### Novo estado para controlar a opção selecionada
```ts
const [deleteScope, setDeleteScope] = useState<'single' | 'unpaid' | 'all'>('single')
```

Resetar `deleteScope` para `'single'` sempre que o dialog de exclusão for aberto.

### Lógica do dialog de exclusão

O dialog atual mostra confirmação simples. Modificar para:

**Se a transação a excluir tiver `recurrence_group_id !== null`:**

Exibir título "Excluir transação recorrente" e três opções (radio buttons ou botões de seleção):

- **"Somente esta"** — exclui apenas o registro com o `id` específico
- **"Esta e as não pagas"** — exclui o registro atual + `deleteTransactionGroupUnpaid(groupId)`
- **"Todas do grupo"** — exclui `deleteTransactionGroup(groupId)`

**Se a transação não tiver `recurrence_group_id`:**

Manter o comportamento atual (confirmação simples, `deleteTransaction(id)`).

### Handler de confirmação do delete

```ts
async function handleDelete() {
  if (!deleteId) return
  try {
    const tx = transactions.find((t) => t.id === deleteId)
    const groupId = tx?.recurrence_group_id ?? null

    if (!groupId || deleteScope === 'single') {
      await deleteTransaction(deleteId)
    } else if (deleteScope === 'unpaid') {
      await deleteTransaction(deleteId)                   // exclui esta
      await deleteTransactionGroupUnpaid(groupId)         // exclui não pagas do grupo
    } else {
      await deleteTransactionGroup(groupId)               // exclui todas
    }
  } finally {
    setDeleteId(null)
    setDeleteScope('single')
  }
}
```

### UI do dialog (design livre seguindo padrão do projeto)

Exemplo de estrutura para as opções:
```tsx
<div className="space-y-2">
  {[
    { value: 'single', label: 'Somente esta',       description: 'As outras parcelas continuam.' },
    { value: 'unpaid', label: 'Esta e as não pagas', description: 'Mantém o histórico de parcelas pagas.' },
    { value: 'all',    label: 'Todas do grupo',      description: 'Remove todas, incluindo pagas.' },
  ].map(({ value, label, description }) => (
    <label
      key={value}
      className="flex items-start gap-3 p-3 rounded-lg border border-[#2d3148] cursor-pointer hover:border-indigo-600 transition-colors"
    >
      <input
        type="radio"
        name="deleteScope"
        value={value}
        checked={deleteScope === value}
        onChange={() => setDeleteScope(value as typeof deleteScope)}
        className="mt-0.5 accent-indigo-500"
      />
      <div>
        <p className="text-slate-200 text-sm font-medium">{label}</p>
        <p className="text-slate-500 text-xs">{description}</p>
      </div>
    </label>
  ))}
</div>
```

Botão de confirmar: `variant="destructive"` ou `bg-red-700 hover:bg-red-800`.

---

## Checklist

- [ ] `deleteTransactionGroupUnpaid` e `deleteTransactionGroup` adicionados ao `useTransactions.ts` e no retorno
- [ ] Dialog de exclusão verifica `recurrence_group_id`
- [ ] Se recorrente: exibe as 3 opções (radio)
- [ ] Se não recorrente: comportamento atual inalterado
- [ ] Handler `handleDelete` cobre os 3 cenários
- [ ] `deleteScope` resetado para `'single'` ao abrir o dialog
- [ ] `tsc --noEmit` — zero erros
- [ ] `git commit -m "feat: delete recurrent transactions by scope"`
- [ ] `git push origin main && npm run deploy`