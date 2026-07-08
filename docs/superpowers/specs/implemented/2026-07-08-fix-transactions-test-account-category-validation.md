# Fix: testes unitários de Transactions falhando por validação de account_id/category_id

**Data:** 2026-07-08
**Contexto:** Dois testes em `src/pages/Transactions.test.tsx` falham na CI porque a `handleSave` passou a exigir `account_id` e `category_id` obrigatórios para transações do tipo `income`/`expense`, mas os mocks dos testes não provisionam conta nem categoria — bloqueando o save antes de chamar `createTransaction` ou `updateTransaction`.

---

## Causa raiz

`src/pages/Transactions.tsx`, função `handleSave`, linhas 313-319:

```ts
if (form.type !== 'transfer' && !form.account_id) {
  setFormError('Selecione uma conta')
  return
}
if (form.type !== 'transfer' && !form.category_id) {
  setFormError('Selecione uma categoria')
  return
}
```

Os mocks globais de `useAccounts` e `useCategories` retornam arrays vazios. O form fica sem conta/categoria selecionada, a validacao bloqueia, e `createTransaction`/`updateTransaction` nunca sao chamados.

Identico ao padrao de bugs anteriores com `tag_ids` e campos de contas em testes existentes.

---

## Arquivos a modificar

- `src/test/setup.ts`
- `src/pages/Transactions.test.tsx`

---

## Tarefas

### Task 1: Adicionar polyfills ao setup de testes

**Arquivo:** `src/test/setup.ts`

Acrescentar ao final do arquivo (apos o mock do `chore-client`):

```ts
// Polyfills para componentes Radix UI e cmdk no JSDOM
window.HTMLElement.prototype.hasPointerCapture = vi.fn(() => false)
window.HTMLElement.prototype.scrollIntoView = vi.fn()

// Polyfill para ResizeObserver (exigido pelo cmdk/SearchableSelect)
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = MockResizeObserver
```

**Por que:** O `userEvent.click` em `button[role="combobox"]` do Radix Select dispara eventos de pointer que o JSDOM nao suporta sem `hasPointerCapture`. O `SearchableSelect` usa `cmdk`, que usa `ResizeObserver` internamente. Sem esses polyfills os testes lancam `TypeError` ao abrir selects.

**Verificacao:** `npm test` deve rodar sem `TypeError: target.hasPointerCapture is not a function` nem `ReferenceError: ResizeObserver is not defined`.

---

### Task 2: Importar useCategories e useAccounts no arquivo de teste

**Arquivo:** `src/pages/Transactions.test.tsx`

Localizar o bloco de imports apos os `vi.mock(...)`:

```ts
import { useTransactions } from '@/hooks/useTransactions'
import Transactions from './Transactions'
```

Substituir por:

```ts
import { useTransactions } from '@/hooks/useTransactions'
import { useCategories } from '@/hooks/useCategories'
import { useAccounts } from '@/hooks/useAccounts'
import Transactions from './Transactions'
```

---

### Task 3: Corrigir o teste "salva nova transacao ao preencher form e clicar Salvar"

**Arquivo:** `src/pages/Transactions.test.tsx`

Localizar o teste (buscar por `'salva nova transação ao preencher form e clicar Salvar'`) e substituir o bloco completo:

**Antes:**
```ts
it('salva nova transação ao preencher form e clicar Salvar', async () => {
  const createTransaction = vi.fn().mockResolvedValue(undefined)
  vi.mocked(useTransactions).mockReturnValue({
    ...baseHookReturn,
    loading: false,
    transactions: [],
    createTransaction,
  })
  renderTx()
  await userEvent.click(screen.getByText('Nova transação'))
  expect(screen.getByRole('dialog')).toBeInTheDocument()
  // MoneyInput renders type="text" inputMode="numeric" — no placeholder attribute
  const amountInput = document.querySelector<HTMLInputElement>('[inputmode="numeric"]')!
  await userEvent.clear(amountInput)
  await userEvent.type(amountInput, '500')
  await userEvent.click(screen.getByText('Salvar'))
  expect(createTransaction).toHaveBeenCalled()
})
```

**Depois:**
```ts
it('salva nova transação ao preencher form e clicar Salvar', async () => {
  const createTransaction = vi.fn().mockResolvedValue(undefined)
  vi.mocked(useTransactions).mockReturnValue({
    ...baseHookReturn,
    loading: false,
    transactions: [],
    createTransaction,
  })
  vi.mocked(useAccounts).mockReturnValue({
    accounts: [{ id: 'acc1', name: 'Nubank', icon: '💜', type: 'checking', color: '#8B5CF6', include_in_dashboard: true, initial_balance: 0, created_at: '' }],
    loading: false, error: null, refresh: vi.fn(), createAccount: vi.fn(), updateAccount: vi.fn(),
    deleteAccount: vi.fn(), getAccountBalance: vi.fn(), getAccountTransactionCount: vi.fn(),
  })
  vi.mocked(useCategories).mockReturnValue({
    categories: [{ id: 'cat1', name: 'Alimentação', icon: '🍔', type: 'expense', created_at: '' }],
    categoryTree: [{ id: 'cat1', name: 'Alimentação', icon: '🍔', type: 'expense', created_at: '', subcategories: [] }],
    loading: false, error: null, refresh: vi.fn(), createCategory: vi.fn(), updateCategory: vi.fn(), deleteCategory: vi.fn(),
  })
  renderTx()
  await userEvent.click(screen.getByText('Nova transação'))
  expect(screen.getByRole('dialog')).toBeInTheDocument()
  // MoneyInput renders type="text" inputMode="numeric" — no placeholder attribute
  const amountInput = document.querySelector<HTMLInputElement>('[inputmode="numeric"]')!
  await userEvent.clear(amountInput)
  await userEvent.type(amountInput, '500')
  // Selecionar conta: combobox[1] = "Conta" (combobox[0] = Tipo)
  const comboboxes = screen.getAllByRole('combobox')
  await userEvent.click(comboboxes[1])
  await userEvent.click(screen.getAllByRole('option')[0])
  // Selecionar categoria: combobox[2] = SearchableSelect de Categoria
  const comboboxes2 = screen.getAllByRole('combobox')
  await userEvent.click(comboboxes2[2])
  await userEvent.click(screen.getAllByRole('option')[0])
  await userEvent.click(screen.getByText('Salvar'))
  expect(createTransaction).toHaveBeenCalled()
})
```

**Por que:**
- `comboboxes[1]` e `comboboxes[2]` sao identificados pela ordem no DOM do dialog: `[0]` = Tipo, `[1]` = Conta (Radix Select), `[2]` = Categoria (SearchableSelect/Popover).
- Apos clicar no combobox, o Radix renderiza `[role="option"]` no portal. `getAllByRole('option')[0]` pega a primeira opcao disponivel.
- Os polyfills do Task 1 sao necessarios para que esses clicks funcionem sem `TypeError`.

---

### Task 4: Corrigir o teste "chama updateTransaction ao salvar form de edicao"

**Arquivo:** `src/pages/Transactions.test.tsx`

Localizar o teste (buscar por `'chama updateTransaction ao salvar form de edição'`) e substituir o bloco completo:

**Antes:**
```ts
it('chama updateTransaction ao salvar form de edição', async () => {
  const updateTransaction = vi.fn().mockResolvedValue(undefined)
  vi.mocked(useTransactions).mockReturnValue({
    ...baseHookReturn,
    loading: false,
    transactions: [baseTx],
    total: 1,
    updateTransaction,
  })
  renderTx()
  // Open edit dialog
  const allButtons = screen.getAllByRole('button')
  const iconButtons = allButtons.filter(btn => !btn.textContent?.trim())
  // Pencil button is second-to-last icon button
  await userEvent.click(iconButtons[iconButtons.length - 2])
  expect(screen.getByText('Editar transação')).toBeInTheDocument()
  // Amount is pre-filled from baseTx.amount = 1500
  await userEvent.click(screen.getByText('Salvar'))
  expect(updateTransaction).toHaveBeenCalledWith('1', expect.objectContaining({ amount: 1500 }))
})
```

**Depois:**
```ts
it('chama updateTransaction ao salvar form de edição', async () => {
  const updateTransaction = vi.fn().mockResolvedValue(undefined)
  // Transacao com account_id e category_id preenchidos para bypassar validacao
  const txWithAccount = { ...baseTx, account_id: 'acc1', category_id: 'cat1' }
  vi.mocked(useTransactions).mockReturnValue({
    ...baseHookReturn,
    loading: false,
    transactions: [txWithAccount],
    total: 1,
    updateTransaction,
  })
  vi.mocked(useAccounts).mockReturnValue({
    accounts: [{ id: 'acc1', name: 'Nubank', icon: '💜', type: 'checking', color: '#8B5CF6', include_in_dashboard: true, initial_balance: 0, created_at: '' }],
    loading: false, error: null, refresh: vi.fn(), createAccount: vi.fn(), updateAccount: vi.fn(),
    deleteAccount: vi.fn(), getAccountBalance: vi.fn(), getAccountTransactionCount: vi.fn(),
  })
  vi.mocked(useCategories).mockReturnValue({
    categories: [{ id: 'cat1', name: 'Alimentação', icon: '🍔', type: 'expense', created_at: '' }],
    categoryTree: [{ id: 'cat1', name: 'Alimentação', icon: '🍔', type: 'expense', created_at: '', subcategories: [] }],
    loading: false, error: null, refresh: vi.fn(), createCategory: vi.fn(), updateCategory: vi.fn(), deleteCategory: vi.fn(),
  })
  renderTx()
  // Open edit dialog
  const allButtons = screen.getAllByRole('button')
  const iconButtons = allButtons.filter(btn => !btn.textContent?.trim())
  // Pencil button is second-to-last icon button
  await userEvent.click(iconButtons[iconButtons.length - 2])
  expect(screen.getByText('Editar transação')).toBeInTheDocument()
  // Amount is pre-filled from baseTx.amount = 1500
  // account_id e category_id ja vem preenchidos de txWithAccount — validacao passa sem nova selecao
  await userEvent.click(screen.getByText('Salvar'))
  expect(updateTransaction).toHaveBeenCalledWith('1', expect.objectContaining({ amount: 1500 }))
})
```

**Por que:** `baseTx` tem `account_id: null` e `category_id: null`. `openEdit` usa esses valores para inicializar o form, entao o form abre com campos vazios e a validacao bloqueia. Usando `txWithAccount` com `account_id: 'acc1'` e `category_id: 'cat1'`, o form ja comeca com os campos preenchidos e a validacao passa sem precisar interagir com os selects.

---

### Task 5: Verificar e commitar

- [ ] `npx tsc --noEmit`
- [ ] `npm test`

Resultado esperado: `Tests  95 passed (95)` — os 2 testes que falhavam agora passam, sem regressoes.

- [ ] `git add src/test/setup.ts src/pages/Transactions.test.tsx`
- [ ] `git commit -m "test: fix Transactions tests broken by account_id/category_id validation"`
- [ ] `git push origin main && npm run deploy`

---

## Modelo recomendado

Claude Haiku — edicoes cirurgicas em dois arquivos de teste, sem logica de producao envolvida.
