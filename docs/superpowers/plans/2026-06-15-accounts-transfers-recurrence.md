# Accounts, Transfers, Recurrence & Payment Status — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Accounts CRUD, Transfer transactions, installment/fixed recurrence, and paid/unpaid payment status to the financial management app.

**Architecture:** New `accounts` table in Supabase; `transactions` table gains `account_id`, `to_account_id`, recurrence fields, and `paid` fields. New `useAccounts` hook + `Accounts` page. `useTransactions` gains batch insert for recurrence and a `updateTransactionPayment` mutation. Dashboard and Reports filter to `paid = true` and exclude transfers. All UI uses existing shadcn components plus a new `Switch` component.

**Tech Stack:** React 19, Vite 8, TypeScript 6, Supabase JS v2, Tailwind CSS v4, shadcn/ui, date-fns v4, lucide-react v1

---

## File Map

```
supabase/migrations/
  20260615200000_accounts_and_transfers.sql   # NEW — accounts table + transaction columns

src/
  components/ui/
    switch.tsx                                # NEW — simple toggle switch component
  types/
    index.ts                                  # MODIFY — Account, RecurrenceType, updated Transaction
  hooks/
    useAccounts.ts                            # NEW — accounts CRUD + balance calc
    useTransactions.ts                        # MODIFY — new fields, batch create, payment update
  pages/
    Accounts.tsx                              # NEW — accounts grid + create/edit/delete dialogs
    Transactions.tsx                          # MODIFY — account col, status col, recurrence, transfer modal
    Dashboard.tsx                             # MODIFY — filter paid + include_in_dashboard + pending card
    Reports.tsx                               # MODIFY — exclude transfers + paid-only
  router/index.tsx                            # MODIFY — add /accounts route
  components/layout/
    Sidebar.tsx                               # MODIFY — add Contas nav link
```

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260615200000_accounts_and_transfers.sql`

- [ ] **Step 1: Create migration file**

```sql
-- Tabela de contas
CREATE TABLE accounts (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 text NOT NULL,
  type                 text NOT NULL CHECK (type IN ('checking','savings','cash','credit','investment','other')),
  color                text NOT NULL DEFAULT '#6366f1',
  icon                 text NOT NULL DEFAULT '🏦',
  include_in_dashboard boolean NOT NULL DEFAULT true,
  created_at           timestamptz DEFAULT now()
);

-- Vincular transações a contas
ALTER TABLE transactions
  ADD COLUMN account_id    uuid REFERENCES accounts(id) ON DELETE SET NULL,
  ADD COLUMN to_account_id uuid REFERENCES accounts(id) ON DELETE SET NULL;

-- Novo tipo: transfer
ALTER TABLE transactions
  DROP CONSTRAINT transactions_type_check;

ALTER TABLE transactions
  ADD CONSTRAINT transactions_type_check
  CHECK (type IN ('income','expense','transfer'));

-- RLS
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth only" ON accounts FOR ALL USING (auth.uid() IS NOT NULL);

-- Recorrência e pagamento
ALTER TABLE transactions
  ADD COLUMN recurrence        text NOT NULL DEFAULT 'none'
    CHECK (recurrence IN ('none','installment','fixed')),
  ADD COLUMN installments      integer CHECK (installments > 0),
  ADD COLUMN installment_index integer,
  ADD COLUMN recurrence_group_id uuid,
  ADD COLUMN paid              boolean NOT NULL DEFAULT true,
  ADD COLUMN paid_at           date,
  ADD COLUMN paid_amount       numeric(12,2);
```

- [ ] **Step 2: Apply migration**

```bash
cd /home/guilherme-granja/Guilherme/lab-financial-management
npx supabase db push
```

Expected: output contains `Applying migration 20260615200000_accounts_and_transfers.sql` with no errors. **Do not proceed to Task 2 if this fails.**

---

## Task 2: Switch UI Component

**Files:**
- Create: `src/components/ui/switch.tsx`

No shadcn Switch is installed; create a minimal accessible toggle.

- [ ] **Step 1: Create switch.tsx**

```tsx
import * as React from 'react'
import { cn } from '@/lib/utils'

interface SwitchProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  id?: string
  disabled?: boolean
  className?: string
}

export function Switch({ checked, onCheckedChange, id, disabled, className }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      id={id}
      disabled={disabled}
      onClick={() => !disabled && onCheckedChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
        checked ? 'bg-indigo-600' : 'bg-slate-700',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform',
          checked ? 'translate-x-[18px]' : 'translate-x-[3px]'
        )}
      />
    </button>
  )
}
```

---

## Task 3: Update Types

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Replace entire file**

```ts
export type CategoryType = 'income' | 'expense' | 'both'
export type TransactionType = 'income' | 'expense' | 'transfer'
export type PeriodType = 'monthly' | 'yearly'
export type AccountType = 'checking' | 'savings' | 'cash' | 'credit' | 'investment' | 'other'
export type RecurrenceType = 'none' | 'installment' | 'fixed'

export interface Category {
  id: string
  name: string
  color: string
  icon: string
  type: CategoryType
  created_at: string
}

export interface Account {
  id: string
  name: string
  type: AccountType
  color: string
  icon: string
  include_in_dashboard: boolean
  created_at: string
}

export interface Transaction {
  id: string
  amount: number
  type: TransactionType
  category_id: string | null
  account_id: string | null
  to_account_id: string | null
  description: string | null
  date: string
  created_at: string
  recurrence: RecurrenceType
  installments: number | null
  installment_index: number | null
  recurrence_group_id: string | null
  paid: boolean
  paid_at: string | null
  paid_amount: number | null
  categories?: Category
  accounts?: Account
  to_accounts?: Account
}

export interface Goal {
  id: string
  category_id: string
  amount: number
  period_type: PeriodType
  period_start: string
  created_at: string
  categories?: Category
}

export interface GoalWithProgress extends Goal {
  actual: number
  progress: number
}
```

---

## Task 4: useAccounts Hook

**Files:**
- Create: `src/hooks/useAccounts.ts`

- [ ] **Step 1: Create hook file**

```ts
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Account, AccountType } from '@/types'

export interface AccountPayload {
  name: string
  type: AccountType
  color: string
  icon: string
  include_in_dashboard: boolean
}

export function useAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAccounts = useCallback(async () => {
    setLoading(true)
    const { data, error: err } = await supabase
      .from('accounts')
      .select('*')
      .order('name')
    if (err) setError(err.message)
    else setAccounts((data as Account[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  async function createAccount(payload: AccountPayload) {
    const { error: err } = await supabase.from('accounts').insert(payload)
    if (err) throw new Error(err.message)
    await fetchAccounts()
  }

  async function updateAccount(id: string, payload: Partial<AccountPayload>) {
    const { error: err } = await supabase.from('accounts').update(payload).eq('id', id)
    if (err) throw new Error(err.message)
    await fetchAccounts()
  }

  async function deleteAccount(id: string) {
    const { error: err } = await supabase.from('accounts').delete().eq('id', id)
    if (err) throw new Error(err.message)
    await fetchAccounts()
  }

  async function getAccountBalance(id: string): Promise<number> {
    const { data } = await supabase
      .from('transactions')
      .select('amount, type')
      .eq('account_id', id)
      .eq('paid', true)
      .in('type', ['income', 'expense'])
    if (!data) return 0
    const income = data.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
    const expense = data.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
    return income - expense
  }

  return {
    accounts,
    loading,
    error,
    refresh: fetchAccounts,
    createAccount,
    updateAccount,
    deleteAccount,
    getAccountBalance,
  }
}
```

---

## Task 5: Accounts Page

**Files:**
- Create: `src/pages/Accounts.tsx`

- [ ] **Step 1: Create Accounts.tsx**

```tsx
import { useEffect, useState } from 'react'
import { useAccounts } from '@/hooks/useAccounts'
import type { Account, AccountType } from '@/types'
import type { AccountPayload } from '@/hooks/useAccounts'
import { formatCurrency } from '@/lib/formatters'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Plus, Pencil, Trash2 } from 'lucide-react'

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  checking: 'Corrente',
  savings: 'Poupança',
  cash: 'Dinheiro',
  credit: 'Crédito',
  investment: 'Investimento',
  other: 'Outro',
}

const EMPTY_FORM: AccountPayload = {
  name: '',
  type: 'checking',
  color: '#6366f1',
  icon: '🏦',
  include_in_dashboard: true,
}

export default function Accounts() {
  const { accounts, loading, createAccount, updateAccount, deleteAccount, getAccountBalance } = useAccounts()
  const [balances, setBalances] = useState<Record<string, number>>({})

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState<AccountPayload>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (accounts.length === 0) return
    Promise.all(accounts.map((a) => getAccountBalance(a.id).then((b) => ({ id: a.id, balance: b })))).then(
      (results) => {
        const map: Record<string, number> = {}
        for (const r of results) map[r.id] = r.balance
        setBalances(map)
      }
    )
  }, [accounts]) // eslint-disable-line react-hooks/exhaustive-deps

  function openCreate() {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setFormError(null)
    setDialogOpen(true)
  }

  function openEdit(account: Account) {
    setForm({
      name: account.name,
      type: account.type,
      color: account.color,
      icon: account.icon,
      include_in_dashboard: account.include_in_dashboard,
    })
    setEditingId(account.id)
    setFormError(null)
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setFormError('Informe o nome da conta')
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      if (editingId) {
        await updateAccount(editingId, form)
      } else {
        await createAccount(form)
      }
      setDialogOpen(false)
    } catch (e) {
      setFormError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    try {
      await deleteAccount(deleteId)
    } finally {
      setDeleteId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-slate-200 font-semibold text-lg">Contas</h2>
        <Button onClick={openCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
          <Plus size={16} />
          Nova conta
        </Button>
      </div>

      {loading && <p className="text-slate-500 text-sm">Carregando...</p>}

      {!loading && accounts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="text-4xl mb-4">🏦</span>
          <p className="text-slate-400 text-sm">Nenhuma conta cadastrada. Crie sua primeira conta.</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map((account) => {
          const balance = balances[account.id] ?? 0
          return (
            <Card key={account.id} className="bg-[#1a1d27] border-[#2d3148]">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                      style={{ backgroundColor: account.color + '22', border: `1px solid ${account.color}44` }}
                    >
                      {account.icon}
                    </div>
                    <div>
                      <p className="text-slate-200 font-medium text-sm">{account.name}</p>
                      <p className="text-slate-500 text-xs">{ACCOUNT_TYPE_LABELS[account.type]}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-slate-400 hover:text-slate-200"
                      onClick={() => openEdit(account)}
                    >
                      <Pencil size={13} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-slate-400 hover:text-red-400"
                      onClick={() => setDeleteId(account.id)}
                    >
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#2d3148] flex items-center justify-between">
                  <p className={`text-lg font-bold ${balance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {formatCurrency(balance)}
                  </p>
                  {!account.include_in_dashboard && (
                    <Badge variant="outline" className="text-xs border-slate-700 text-slate-500">
                      Não contabiliza
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[#1a1d27] border-[#2d3148] text-slate-200">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar conta' : 'Nova conta'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {formError && <p className="text-red-400 text-sm">{formError}</p>}

            <div className="space-y-1">
              <Label className="text-slate-400 text-xs">Nome</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="bg-[#0f1117] border-[#2d3148]"
                placeholder="Ex: Nubank"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-slate-400 text-xs">Tipo</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as AccountType }))}>
                <SelectTrigger className="bg-[#0f1117] border-[#2d3148]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1d27] border-[#2d3148]">
                  {(Object.entries(ACCOUNT_TYPE_LABELS) as [AccountType, string][]).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-slate-400 text-xs">Ícone (emoji)</Label>
                <Input
                  value={form.icon}
                  onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
                  className="bg-[#0f1117] border-[#2d3148] text-center text-xl"
                  maxLength={4}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-slate-400 text-xs">Cor</Label>
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                  className="w-full h-9 rounded-md border border-[#2d3148] bg-[#0f1117] cursor-pointer p-1"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="include_in_dashboard"
                checked={form.include_in_dashboard}
                onCheckedChange={(v) => setForm((f) => ({ ...f, include_in_dashboard: v }))}
              />
              <Label htmlFor="include_in_dashboard" className="text-slate-300 text-sm cursor-pointer">
                Contabilizar no Dashboard
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="text-slate-400">
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="bg-[#1a1d27] border-[#2d3148] text-slate-200">
          <DialogHeader>
            <DialogTitle>Excluir conta</DialogTitle>
          </DialogHeader>
          <p className="text-slate-400 text-sm">Essa ação não pode ser desfeita. As transações desta conta não serão excluídas.</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteId(null)} className="text-slate-400">
              Cancelar
            </Button>
            <Button onClick={handleDelete} className="bg-red-700 hover:bg-red-800 text-white">
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

---

## Task 6: Router + Sidebar

**Files:**
- Modify: `src/router/index.tsx`
- Modify: `src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Add Accounts route to router/index.tsx**

Add import after line 10 (after `import Goals from '@/pages/Goals'`):
```tsx
import Accounts from '@/pages/Accounts'
```

Add route after `{ path: '/goals', element: <Goals /> }`:
```tsx
{ path: '/accounts', element: <Accounts /> },
```

- [ ] **Step 2: Add Contas link to Sidebar.tsx**

Add `Wallet` to the lucide-react import:
```tsx
import {
  LayoutDashboard,
  ArrowLeftRight,
  Tag,
  BarChart2,
  Target,
  Wallet,
  Menu,
  X,
} from 'lucide-react'
```

Add entry to `navItems` between Transações and Categorias:
```tsx
const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/transactions', label: 'Transações', icon: ArrowLeftRight },
  { to: '/accounts', label: 'Contas', icon: Wallet },
  { to: '/categories', label: 'Categorias', icon: Tag },
  { to: '/reports', label: 'Relatórios', icon: BarChart2 },
  { to: '/goals', label: 'Metas', icon: Target },
]
```

---

## Task 7: Update useTransactions Hook

**Files:**
- Modify: `src/hooks/useTransactions.ts`

- [ ] **Step 1: Replace entire file**

```ts
import { useState, useEffect, useCallback } from 'react'
import { format, addMonths, parseISO } from 'date-fns'
import { supabase } from '@/lib/supabase'
import type { Transaction, TransactionType, RecurrenceType } from '@/types'

export interface TransactionFilters {
  period: string
  periodType: 'monthly' | 'yearly'
  type: TransactionType | 'all'
  categoryId: string
  status: 'all' | 'paid' | 'unpaid'
}

export interface TransactionPayload {
  amount: number
  type: TransactionType
  category_id: string | null
  account_id: string | null
  to_account_id: string | null
  description: string | null
  date: string
  recurrence: RecurrenceType
  installments: number | null
  paid: boolean
  paid_at: string | null
  paid_amount: number | null
}

const PAGE_SIZE = 20

const SELECT_FIELDS =
  '*, categories(*), accounts!account_id(*), to_accounts:accounts!to_account_id(*)'

export function useTransactions(filters: TransactionFilters) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)

    const from = (page - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    const datePattern =
      filters.periodType === 'monthly'
        ? `${filters.period}-%`
        : `${filters.period}%`

    let query = supabase
      .from('transactions')
      .select(SELECT_FIELDS, { count: 'exact' })
      .like('date', datePattern)
      .order('date', { ascending: false })
      .range(from, to)

    if (filters.type !== 'all') {
      query = query.eq('type', filters.type)
    }
    if (filters.categoryId !== 'all') {
      query = query.eq('category_id', filters.categoryId)
    }
    if (filters.status === 'paid') {
      query = query.eq('paid', true)
    } else if (filters.status === 'unpaid') {
      query = query.eq('paid', false)
    }

    const { data, error: err, count } = await query

    if (err) {
      setError(err.message)
    } else {
      setTransactions((data as unknown as Transaction[]) ?? [])
      setTotal(count ?? 0)
    }

    setLoading(false)
  }, [filters, page])

  useEffect(() => {
    fetch()
  }, [fetch])

  useEffect(() => {
    setPage(1)
  }, [filters])

  async function createTransaction(payload: TransactionPayload) {
    if (payload.recurrence === 'installment' && payload.installments && payload.installments > 1) {
      const groupId = crypto.randomUUID()
      const n = payload.installments
      const records = Array.from({ length: n }, (_, i) => {
        const date = format(addMonths(parseISO(payload.date), i), 'yyyy-MM-dd')
        const desc = payload.description
          ? `${payload.description} (${i + 1}/${n})`
          : `(${i + 1}/${n})`
        const isPaid = i === 0 ? payload.paid : false
        return {
          amount: payload.amount,
          type: payload.type,
          category_id: payload.category_id,
          account_id: payload.account_id,
          to_account_id: payload.to_account_id,
          description: desc,
          date,
          recurrence: 'installment' as RecurrenceType,
          installments: n,
          installment_index: i + 1,
          recurrence_group_id: groupId,
          paid: isPaid,
          paid_at: isPaid ? payload.paid_at : null,
          paid_amount: isPaid ? payload.paid_amount : null,
        }
      })
      const { error: err } = await supabase.from('transactions').insert(records)
      if (err) throw new Error(err.message)
      await fetch()
      return
    }

    if (payload.recurrence === 'fixed') {
      const groupId = crypto.randomUUID()
      const n = 24
      const records = Array.from({ length: n }, (_, i) => {
        const date = format(addMonths(parseISO(payload.date), i), 'yyyy-MM-dd')
        const isPaid = i === 0 ? payload.paid : false
        return {
          amount: payload.amount,
          type: payload.type,
          category_id: payload.category_id,
          account_id: payload.account_id,
          to_account_id: payload.to_account_id,
          description: payload.description,
          date,
          recurrence: 'fixed' as RecurrenceType,
          installments: n,
          installment_index: i + 1,
          recurrence_group_id: groupId,
          paid: isPaid,
          paid_at: isPaid ? payload.paid_at : null,
          paid_amount: isPaid ? payload.paid_amount : null,
        }
      })
      const { error: err } = await supabase.from('transactions').insert(records)
      if (err) throw new Error(err.message)
      await fetch()
      return
    }

    const { error: err } = await supabase.from('transactions').insert({
      amount: payload.amount,
      type: payload.type,
      category_id: payload.category_id,
      account_id: payload.account_id,
      to_account_id: payload.to_account_id,
      description: payload.description,
      date: payload.date,
      recurrence: payload.recurrence,
      installments: payload.installments,
      installment_index: null,
      recurrence_group_id: null,
      paid: payload.paid,
      paid_at: payload.paid_at,
      paid_amount: payload.paid_amount,
    })
    if (err) throw new Error(err.message)
    await fetch()
  }

  async function updateTransaction(id: string, payload: Partial<TransactionPayload>) {
    const { error: err } = await supabase.from('transactions').update(payload).eq('id', id)
    if (err) throw new Error(err.message)
    await fetch()
  }

  async function updateTransactionPayment(id: string, paid_at: string, paid_amount: number) {
    const { error: err } = await supabase
      .from('transactions')
      .update({ paid: true, paid_at, paid_amount })
      .eq('id', id)
    if (err) throw new Error(err.message)
    await fetch()
  }

  async function deleteTransaction(id: string) {
    const { error: err } = await supabase.from('transactions').delete().eq('id', id)
    if (err) throw new Error(err.message)
    await fetch()
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return {
    transactions,
    total,
    totalPages,
    page,
    setPage,
    loading,
    error,
    refresh: fetch,
    createTransaction,
    updateTransaction,
    updateTransactionPayment,
    deleteTransaction,
  }
}
```

---

## Task 8: Update Transactions Page

**Files:**
- Modify: `src/pages/Transactions.tsx`

This is a complete rewrite of the page. The new version adds: account_id field, transfer type (hides category, shows to_account_id), recurrence fields, paid/unpaid status, badge columns, Pay button + modal, status filter.

- [ ] **Step 1: Replace entire file**

```tsx
import { useState } from 'react'
import { format } from 'date-fns'
import { useTransactions } from '@/hooks/useTransactions'
import type { TransactionFilters, TransactionPayload } from '@/hooks/useTransactions'
import { useCategories } from '@/hooks/useCategories'
import { useAccounts } from '@/hooks/useAccounts'
import type { Transaction, TransactionType, RecurrenceType } from '@/types'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, CreditCard } from 'lucide-react'

const CURRENT_MONTH = format(new Date(), 'yyyy-MM')

interface FormState {
  amount: string
  type: TransactionType
  category_id: string
  account_id: string
  to_account_id: string
  description: string
  date: string
  recurrence: RecurrenceType
  installments: string
  paid: boolean
  paid_at: string
  paid_amount: string
}

const EMPTY_FORM: FormState = {
  amount: '',
  type: 'expense',
  category_id: '',
  account_id: '',
  to_account_id: '',
  description: '',
  date: format(new Date(), 'yyyy-MM-dd'),
  recurrence: 'none',
  installments: '',
  paid: true,
  paid_at: format(new Date(), 'yyyy-MM-dd'),
  paid_amount: '',
}

interface PayFormState {
  paid_at: string
  paid_amount: string
}

export default function Transactions() {
  const [filters, setFilters] = useState<TransactionFilters>({
    period: CURRENT_MONTH,
    periodType: 'monthly',
    type: 'all',
    categoryId: 'all',
    status: 'all',
  })

  const {
    transactions,
    totalPages,
    page,
    setPage,
    loading,
    createTransaction,
    updateTransaction,
    updateTransactionPayment,
    deleteTransaction,
  } = useTransactions(filters)
  const { categories } = useCategories()
  const { accounts } = useAccounts()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [payingTx, setPayingTx] = useState<Transaction | null>(null)
  const [payForm, setPayForm] = useState<PayFormState>({ paid_at: '', paid_amount: '' })
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  function openCreate() {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setFormError(null)
    setDialogOpen(true)
  }

  function openEdit(tx: Transaction) {
    setForm({
      amount: String(tx.amount),
      type: tx.type,
      category_id: tx.category_id ?? '',
      account_id: tx.account_id ?? '',
      to_account_id: tx.to_account_id ?? '',
      description: tx.description ?? '',
      date: tx.date,
      recurrence: tx.recurrence ?? 'none',
      installments: tx.installments ? String(tx.installments) : '',
      paid: tx.paid ?? true,
      paid_at: tx.paid_at ?? format(new Date(), 'yyyy-MM-dd'),
      paid_amount: tx.paid_amount ? String(tx.paid_amount) : String(tx.amount),
    })
    setEditingId(tx.id)
    setFormError(null)
    setDialogOpen(true)
  }

  function openPay(tx: Transaction) {
    setPayingTx(tx)
    setPayForm({
      paid_at: format(new Date(), 'yyyy-MM-dd'),
      paid_amount: String(tx.amount),
    })
  }

  async function handleSave() {
    const amount = parseFloat(form.amount)
    if (!form.amount || isNaN(amount) || amount <= 0) {
      setFormError('Informe um valor válido')
      return
    }
    if (!form.date) {
      setFormError('Informe a data')
      return
    }
    if (form.type === 'transfer') {
      if (!form.account_id) {
        setFormError('Selecione a conta de origem')
        return
      }
      if (!form.to_account_id) {
        setFormError('Selecione a conta de destino')
        return
      }
      if (form.account_id === form.to_account_id) {
        setFormError('Conta de origem e destino devem ser diferentes')
        return
      }
    }
    if (form.recurrence === 'installment' && (!form.installments || parseInt(form.installments) < 2)) {
      setFormError('Informe o número de parcelas (mínimo 2)')
      return
    }

    setSaving(true)
    setFormError(null)

    const paid_at = form.paid ? form.paid_at || form.date : null
    const paid_amount_val = form.paid ? (parseFloat(form.paid_amount) || amount) : null

    const payload: TransactionPayload = {
      amount,
      type: form.type,
      category_id: form.type === 'transfer' ? null : form.category_id || null,
      account_id: form.account_id || null,
      to_account_id: form.type === 'transfer' ? form.to_account_id || null : null,
      description: form.description || null,
      date: form.date,
      recurrence: form.recurrence,
      installments: form.recurrence !== 'none' ? (form.recurrence === 'installment' ? parseInt(form.installments) : 24) : null,
      paid: form.paid,
      paid_at,
      paid_amount: paid_amount_val,
    }

    try {
      if (editingId) {
        await updateTransaction(editingId, payload)
      } else {
        await createTransaction(payload)
      }
      setDialogOpen(false)
    } catch (e) {
      setFormError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    try {
      await deleteTransaction(deleteId)
    } finally {
      setDeleteId(null)
    }
  }

  async function handlePay() {
    if (!payingTx) return
    const paid_amount = parseFloat(payForm.paid_amount)
    if (isNaN(paid_amount) || paid_amount <= 0) return
    try {
      await updateTransactionPayment(payingTx.id, payForm.paid_at, paid_amount)
    } finally {
      setPayingTx(null)
    }
  }

  const availableCategories = categories.filter(
    (c) => c.type === form.type || c.type === 'both'
  )

  function typeColor(type: TransactionType) {
    if (type === 'income') return 'bg-green-950 text-green-400 border-green-800'
    if (type === 'expense') return 'bg-red-950 text-red-400 border-red-800'
    return 'bg-blue-950 text-blue-400 border-blue-800'
  }

  function typeLabel(type: TransactionType) {
    if (type === 'income') return 'Receita'
    if (type === 'expense') return 'Despesa'
    return 'Transferência'
  }

  function amountColor(type: TransactionType) {
    if (type === 'income') return 'text-green-500'
    if (type === 'expense') return 'text-red-500'
    return 'text-blue-400'
  }

  function amountPrefix(type: TransactionType) {
    if (type === 'income') return '+'
    if (type === 'expense') return '-'
    return ''
  }

  function recurrenceBadge(tx: Transaction) {
    if (!tx.recurrence || tx.recurrence === 'none') return null
    const label =
      tx.recurrence === 'fixed'
        ? 'Fixo'
        : tx.installment_index && tx.installments
        ? `${tx.installment_index}/${tx.installments}`
        : 'Parcelado'
    return (
      <Badge variant="outline" className="text-xs border-slate-600 text-slate-400 ml-1">
        {label}
      </Badge>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label className="text-slate-400 text-xs">Período</Label>
          <Input
            type="month"
            value={filters.period}
            onChange={(e) =>
              setFilters((f) => ({ ...f, period: e.target.value, periodType: 'monthly' }))
            }
            className="bg-[#1a1d27] border-[#2d3148] text-slate-200 w-40"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-slate-400 text-xs">Tipo</Label>
          <Select
            value={filters.type}
            onValueChange={(v) => setFilters((f) => ({ ...f, type: v as TransactionType | 'all' }))}
          >
            <SelectTrigger className="bg-[#1a1d27] border-[#2d3148] text-slate-200 w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1d27] border-[#2d3148]">
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="income">Receita</SelectItem>
              <SelectItem value="expense">Despesa</SelectItem>
              <SelectItem value="transfer">Transferência</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-slate-400 text-xs">Status</Label>
          <Select
            value={filters.status}
            onValueChange={(v) => setFilters((f) => ({ ...f, status: v as 'all' | 'paid' | 'unpaid' }))}
          >
            <SelectTrigger className="bg-[#1a1d27] border-[#2d3148] text-slate-200 w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1d27] border-[#2d3148]">
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="paid">Pagos</SelectItem>
              <SelectItem value="unpaid">Pendentes</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-slate-400 text-xs">Categoria</Label>
          <Select
            value={filters.categoryId}
            onValueChange={(v) => setFilters((f) => ({ ...f, categoryId: v }))}
          >
            <SelectTrigger className="bg-[#1a1d27] border-[#2d3148] text-slate-200 w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1d27] border-[#2d3148]">
              <SelectItem value="all">Todas</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={openCreate} className="ml-auto bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
          <Plus size={16} />
          Nova transação
        </Button>
      </div>

      {/* Table */}
      <div className="bg-[#1a1d27] border border-[#2d3148] rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-[#2d3148] hover:bg-transparent">
              <TableHead className="text-slate-400">Data</TableHead>
              <TableHead className="text-slate-400">Descrição</TableHead>
              <TableHead className="text-slate-400">Conta</TableHead>
              <TableHead className="text-slate-400">Categoria</TableHead>
              <TableHead className="text-slate-400">Tipo</TableHead>
              <TableHead className="text-slate-400">Status</TableHead>
              <TableHead className="text-slate-400 text-right">Valor</TableHead>
              <TableHead className="text-slate-400 w-28" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-slate-500 py-8">
                  Carregando...
                </TableCell>
              </TableRow>
            )}
            {!loading && transactions.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-slate-500 py-8">
                  Nenhuma transação encontrada
                </TableCell>
              </TableRow>
            )}
            {transactions.map((tx) => (
              <TableRow key={tx.id} className="border-[#2d3148] hover:bg-[#2d3148]/30">
                <TableCell className="text-slate-300">{formatDate(tx.date)}</TableCell>
                <TableCell className="text-slate-300">
                  <span>{tx.description ?? '—'}</span>
                  {recurrenceBadge(tx)}
                </TableCell>
                <TableCell className="text-slate-300 text-sm">
                  {tx.accounts ? (
                    <span className="flex items-center gap-1">
                      <span>{tx.accounts.icon}</span>
                      <span>{tx.accounts.name}</span>
                    </span>
                  ) : tx.type === 'transfer' && tx.to_accounts ? (
                    <span className="text-slate-500 text-xs">
                      → {tx.to_accounts.icon} {tx.to_accounts.name}
                    </span>
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell className="text-slate-300">
                  {tx.type === 'transfer'
                    ? '—'
                    : tx.categories
                    ? `${tx.categories.icon} ${tx.categories.name}`
                    : '—'}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={typeColor(tx.type)}>
                    {typeLabel(tx.type)}
                  </Badge>
                </TableCell>
                <TableCell>
                  {tx.paid ? (
                    <Badge variant="outline" className="bg-green-950 text-green-400 border-green-800 text-xs">
                      Pago
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-yellow-950 text-yellow-400 border-yellow-800 text-xs">
                      Pendente
                    </Badge>
                  )}
                </TableCell>
                <TableCell className={`text-right font-medium ${amountColor(tx.type)}`}>
                  {amountPrefix(tx.type)}{formatCurrency(tx.amount)}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 justify-end">
                    {!tx.paid && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-yellow-400 hover:text-yellow-300"
                        title="Pagar"
                        onClick={() => openPay(tx)}
                      >
                        <CreditCard size={14} />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-slate-400 hover:text-slate-200"
                      onClick={() => openEdit(tx)}
                    >
                      <Pencil size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-slate-400 hover:text-red-400"
                      onClick={() => setDeleteId(tx.id)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="text-slate-400"
          >
            <ChevronLeft size={16} />
          </Button>
          <span className="text-slate-400 text-sm">{page} / {totalPages}</span>
          <Button
            variant="ghost"
            size="icon"
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
            className="text-slate-400"
          >
            <ChevronRight size={16} />
          </Button>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[#1a1d27] border-[#2d3148] text-slate-200 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar transação' : 'Nova transação'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {formError && <p className="text-red-400 text-sm">{formError}</p>}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-slate-400 text-xs">Tipo</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      type: v as TransactionType,
                      category_id: '',
                      to_account_id: '',
                    }))
                  }
                >
                  <SelectTrigger className="bg-[#0f1117] border-[#2d3148]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1d27] border-[#2d3148]">
                    <SelectItem value="income">Receita</SelectItem>
                    <SelectItem value="expense">Despesa</SelectItem>
                    <SelectItem value="transfer">Transferência</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-slate-400 text-xs">Valor (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  className="bg-[#0f1117] border-[#2d3148]"
                  placeholder="0,00"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-slate-400 text-xs">Data</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="bg-[#0f1117] border-[#2d3148]"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-slate-400 text-xs">
                {form.type === 'transfer' ? 'Conta de origem' : 'Conta'}
              </Label>
              <Select
                value={form.account_id}
                onValueChange={(v) => setForm((f) => ({ ...f, account_id: v }))}
              >
                <SelectTrigger className="bg-[#0f1117] border-[#2d3148]">
                  <SelectValue placeholder="Selecionar conta" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1d27] border-[#2d3148]">
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.icon} {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {form.type === 'transfer' && (
              <div className="space-y-1">
                <Label className="text-slate-400 text-xs">Conta de destino</Label>
                <Select
                  value={form.to_account_id}
                  onValueChange={(v) => setForm((f) => ({ ...f, to_account_id: v }))}
                >
                  <SelectTrigger className="bg-[#0f1117] border-[#2d3148]">
                    <SelectValue placeholder="Selecionar conta" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1d27] border-[#2d3148]">
                    {accounts
                      .filter((a) => a.id !== form.account_id)
                      .map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.icon} {a.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {form.type !== 'transfer' && (
              <div className="space-y-1">
                <Label className="text-slate-400 text-xs">Categoria</Label>
                <Select
                  value={form.category_id}
                  onValueChange={(v) => setForm((f) => ({ ...f, category_id: v }))}
                >
                  <SelectTrigger className="bg-[#0f1117] border-[#2d3148]">
                    <SelectValue placeholder="Selecionar categoria" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1d27] border-[#2d3148]">
                    {availableCategories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.icon} {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-slate-400 text-xs">Descrição</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="bg-[#0f1117] border-[#2d3148]"
                placeholder="Opcional"
              />
            </div>

            {!editingId && (
              <div className="space-y-1">
                <Label className="text-slate-400 text-xs">Recorrência</Label>
                <Select
                  value={form.recurrence}
                  onValueChange={(v) => setForm((f) => ({ ...f, recurrence: v as RecurrenceType, installments: '' }))}
                >
                  <SelectTrigger className="bg-[#0f1117] border-[#2d3148]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1d27] border-[#2d3148]">
                    <SelectItem value="none">Não se repete</SelectItem>
                    <SelectItem value="installment">Parcelado</SelectItem>
                    <SelectItem value="fixed">Fixo mensal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {!editingId && form.recurrence === 'installment' && (
              <div className="space-y-1">
                <Label className="text-slate-400 text-xs">Número de parcelas</Label>
                <Input
                  type="number"
                  min="2"
                  value={form.installments}
                  onChange={(e) => setForm((f) => ({ ...f, installments: e.target.value }))}
                  className="bg-[#0f1117] border-[#2d3148]"
                  placeholder="Ex: 12"
                />
              </div>
            )}

            <div className="space-y-3 pt-1 border-t border-[#2d3148]">
              <div className="flex items-center gap-3">
                <Switch
                  id="paid"
                  checked={form.paid}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, paid: v }))}
                />
                <Label htmlFor="paid" className="text-slate-300 text-sm cursor-pointer">
                  {form.paid ? 'Pago' : 'Não pago'}
                </Label>
              </div>

              {form.paid && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-slate-400 text-xs">Data do pagamento</Label>
                    <Input
                      type="date"
                      value={form.paid_at}
                      onChange={(e) => setForm((f) => ({ ...f, paid_at: e.target.value }))}
                      className="bg-[#0f1117] border-[#2d3148]"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-slate-400 text-xs">Valor pago (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.paid_amount || form.amount}
                      onChange={(e) => setForm((f) => ({ ...f, paid_amount: e.target.value }))}
                      className="bg-[#0f1117] border-[#2d3148]"
                      placeholder={form.amount || '0,00'}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="text-slate-400">
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pay Dialog */}
      <Dialog open={!!payingTx} onOpenChange={() => setPayingTx(null)}>
        <DialogContent className="bg-[#1a1d27] border-[#2d3148] text-slate-200">
          <DialogHeader>
            <DialogTitle>Registrar pagamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-slate-400 text-xs">Valor pago (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={payForm.paid_amount}
                onChange={(e) => setPayForm((f) => ({ ...f, paid_amount: e.target.value }))}
                className="bg-[#0f1117] border-[#2d3148]"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-slate-400 text-xs">Data do pagamento</Label>
              <Input
                type="date"
                value={payForm.paid_at}
                onChange={(e) => setPayForm((f) => ({ ...f, paid_at: e.target.value }))}
                className="bg-[#0f1117] border-[#2d3148]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPayingTx(null)} className="text-slate-400">
              Cancelar
            </Button>
            <Button onClick={handlePay} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              Pagar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="bg-[#1a1d27] border-[#2d3148] text-slate-200">
          <DialogHeader>
            <DialogTitle>Excluir transação</DialogTitle>
          </DialogHeader>
          <p className="text-slate-400 text-sm">Essa ação não pode ser desfeita.</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteId(null)} className="text-slate-400">
              Cancelar
            </Button>
            <Button onClick={handleDelete} className="bg-red-700 hover:bg-red-800 text-white">
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

---

## Task 9: Update Dashboard

**Files:**
- Modify: `src/pages/Dashboard.tsx`

Changes:
1. Fetch accounts where `include_in_dashboard = true`, build account ID filter.
2. All transaction queries add `eq('paid', true)` and `neq('type', 'transfer')`.
3. Apply account filter: `account_id IS NULL OR account_id IN (dashboardIds)`.
4. Add "A pagar este mês" card with sum of `paid = false` transactions.

- [ ] **Step 1: Replace entire Dashboard.tsx**

```tsx
import { useEffect, useState } from 'react'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'
import type { Transaction, Category } from '@/types'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { BalanceLineChart } from '@/components/charts/BalanceLineChart'
import type { BalanceDataPoint } from '@/components/charts/BalanceLineChart'
import { ExpensePieChart } from '@/components/charts/ExpensePieChart'
import type { PieDataPoint } from '@/components/charts/ExpensePieChart'
import { TrendingUp, TrendingDown, Wallet, Clock } from 'lucide-react'

interface MonthSummary {
  income: number
  expenses: number
  balance: number
  pending: number
}

export default function Dashboard() {
  const [summary, setSummary] = useState<MonthSummary>({ income: 0, expenses: 0, balance: 0, pending: 0 })
  const [lineData, setLineData] = useState<BalanceDataPoint[]>([])
  const [pieData, setPieData] = useState<PieDataPoint[]>([])
  const [recentTx, setRecentTx] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const now = new Date()
      const monthStart = format(startOfMonth(now), 'yyyy-MM-dd')
      const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd')

      // Fetch dashboard accounts for filtering
      const { data: accountsData } = await supabase
        .from('accounts')
        .select('id')
        .eq('include_in_dashboard', true)

      const dashboardIds: string[] = (accountsData ?? []).map((a: { id: string }) => a.id)

      // Helper: build account_id filter string for .or()
      // Include transactions with null account_id (legacy) OR matching dashboard account IDs
      function accountFilter() {
        if (dashboardIds.length === 0) return 'account_id.is.null'
        return `account_id.is.null,account_id.in.(${dashboardIds.join(',')})`
      }

      const [summaryRes, pieRes, recentRes, historyData, pendingRes] = await Promise.all([
        supabase
          .from('transactions')
          .select('amount, type')
          .gte('date', monthStart)
          .lte('date', monthEnd)
          .eq('paid', true)
          .neq('type', 'transfer')
          .or(accountFilter()),

        supabase
          .from('transactions')
          .select('amount, categories(name, color)')
          .eq('type', 'expense')
          .eq('paid', true)
          .gte('date', monthStart)
          .lte('date', monthEnd)
          .or(accountFilter()),

        supabase
          .from('transactions')
          .select('*, categories(*), accounts!account_id(*)')
          .order('date', { ascending: false })
          .limit(5),

        Promise.all(
          Array.from({ length: 6 }, (_, i) => {
            const d = subMonths(now, 5 - i)
            const start = format(startOfMonth(d), 'yyyy-MM-dd')
            const end = format(endOfMonth(d), 'yyyy-MM-dd')
            return supabase
              .from('transactions')
              .select('amount, type')
              .gte('date', start)
              .lte('date', end)
              .eq('paid', true)
              .neq('type', 'transfer')
              .or(accountFilter())
              .then(({ data }) => ({
                month: format(d, 'MMM/yy', { locale: ptBR }),
                data: data ?? [],
              }))
          })
        ),

        // Pending transactions this month
        supabase
          .from('transactions')
          .select('amount')
          .gte('date', monthStart)
          .lte('date', monthEnd)
          .eq('paid', false)
          .neq('type', 'transfer')
          .or(accountFilter()),
      ])

      const txs = summaryRes.data ?? []
      const income = txs.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
      const expenses = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
      const pending = (pendingRes.data ?? []).reduce((s, t) => s + Number(t.amount), 0)
      setSummary({ income, expenses, balance: income - expenses, pending })

      const catMap: Record<string, { name: string; color: string; total: number }> = {}
      for (const tx of pieRes.data ?? []) {
        const cat = tx.categories as unknown as Category | null
        const key = cat?.name ?? 'Sem categoria'
        if (!catMap[key]) catMap[key] = { name: key, color: cat?.color ?? '#6366f1', total: 0 }
        catMap[key].total += Number(tx.amount)
      }
      setPieData(Object.values(catMap).map((c) => ({ name: c.name, value: c.total, color: c.color })))

      setRecentTx((recentRes.data as unknown as Transaction[]) ?? [])

      setLineData(
        historyData.map(({ month, data }) => {
          const inc = data.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
          const exp = data.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
          return { month, balance: inc - exp }
        })
      )

      setLoading(false)
    }

    load()
  }, [])

  if (loading) {
    return <div className="text-slate-400 text-sm">Carregando...</div>
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-[#1a1d27] border-[#2d3148]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-slate-400 text-sm font-medium">Receitas do mês</CardTitle>
            <TrendingUp size={16} className="text-green-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-500">{formatCurrency(summary.income)}</p>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1d27] border-[#2d3148]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-slate-400 text-sm font-medium">Despesas do mês</CardTitle>
            <TrendingDown size={16} className="text-red-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-500">{formatCurrency(summary.expenses)}</p>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1d27] border-[#2d3148]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-slate-400 text-sm font-medium">Saldo do mês</CardTitle>
            <Wallet size={16} className="text-indigo-400" />
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${summary.balance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatCurrency(summary.balance)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1d27] border-[#2d3148]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-slate-400 text-sm font-medium">A pagar este mês</CardTitle>
            <Clock size={16} className="text-yellow-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-500">{formatCurrency(summary.pending)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-[#1a1d27] border-[#2d3148]">
          <CardHeader>
            <CardTitle className="text-slate-200 text-sm font-medium">Saldo — últimos 6 meses</CardTitle>
          </CardHeader>
          <CardContent>
            <BalanceLineChart data={lineData} />
          </CardContent>
        </Card>

        <Card className="bg-[#1a1d27] border-[#2d3148]">
          <CardHeader>
            <CardTitle className="text-slate-200 text-sm font-medium">Despesas por categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <ExpensePieChart data={pieData} />
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="bg-[#1a1d27] border-[#2d3148]">
        <CardHeader>
          <CardTitle className="text-slate-200 text-sm font-medium">Transações recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-[#2d3148] hover:bg-transparent">
                <TableHead className="text-slate-400">Data</TableHead>
                <TableHead className="text-slate-400">Descrição</TableHead>
                <TableHead className="text-slate-400">Categoria</TableHead>
                <TableHead className="text-slate-400">Tipo</TableHead>
                <TableHead className="text-slate-400 text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentTx.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-slate-500 py-8">
                    Nenhuma transação encontrada
                  </TableCell>
                </TableRow>
              )}
              {recentTx.map((tx) => (
                <TableRow key={tx.id} className="border-[#2d3148]">
                  <TableCell className="text-slate-300">{formatDate(tx.date)}</TableCell>
                  <TableCell className="text-slate-300">{tx.description ?? '—'}</TableCell>
                  <TableCell className="text-slate-300">
                    {tx.categories ? (
                      <span className="flex items-center gap-1.5">
                        <span>{tx.categories.icon}</span>
                        {tx.categories.name}
                      </span>
                    ) : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        tx.type === 'income'
                          ? 'bg-green-950 text-green-400 border-green-800'
                          : tx.type === 'transfer'
                          ? 'bg-blue-950 text-blue-400 border-blue-800'
                          : 'bg-red-950 text-red-400 border-red-800'
                      }
                      variant="outline"
                    >
                      {tx.type === 'income' ? 'Receita' : tx.type === 'transfer' ? 'Transferência' : 'Despesa'}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className={`text-right font-medium ${
                      tx.type === 'income'
                        ? 'text-green-500'
                        : tx.type === 'transfer'
                        ? 'text-blue-400'
                        : 'text-red-500'
                    }`}
                  >
                    {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}{formatCurrency(tx.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
```

---

## Task 10: Update Reports

**Files:**
- Modify: `src/pages/Reports.tsx`

Changes: Add `neq('type', 'transfer')` and `eq('paid', true)` to all queries. The `CategoryRow.type` still uses `'income' | 'expense'` (transfers excluded).

- [ ] **Step 1: In `load()`, add filters to the two supabase queries**

In the selected month query (line ~59), after `.lte('date', end)` add:
```ts
.eq('paid', true)
.neq('type', 'transfer')
```

In each of the 6-month history queries (line ~95-100), after `.lte('date', e)` add:
```ts
.eq('paid', true)
.neq('type', 'transfer')
```

Full updated `load` function for reference:
```ts
async function load() {
  setLoading(true)
  const now = new Date()

  const [year, month] = selectedMonth.split('-')
  const start = `${year}-${month}-01`
  const refDate = new Date(Number(year), Number(month) - 1, 1)
  const end = format(endOfMonth(refDate), 'yyyy-MM-dd')

  const { data: txData } = await supabase
    .from('transactions')
    .select('amount, type, category_id, categories(name, icon, color)')
    .gte('date', start)
    .lte('date', end)
    .eq('paid', true)
    .neq('type', 'transfer')

  const txs = txData ?? []

  const catMap: Record<string, CategoryRow> = {}
  for (const tx of txs) {
    const cat = tx.categories as unknown as Category | null
    const key = tx.category_id ?? '__none__'
    if (!catMap[key]) {
      catMap[key] = {
        name: cat?.name ?? 'Sem categoria',
        icon: cat?.icon ?? '❓',
        total: 0,
        percent: 0,
        type: tx.type as 'income' | 'expense',
      }
    }
    catMap[key].total += tx.amount
  }

  const grandTotal = txs.reduce((s, t) => s + t.amount, 0) || 1
  const rows = Object.values(catMap).map((r) => ({
    ...r,
    percent: (r.total / grandTotal) * 100,
  }))
  rows.sort((a, b) => b.total - a.total)
  setCategoryRows(rows)

  const monthsData = await Promise.all(
    Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(now, 5 - i)
      const s = format(startOfMonth(d), 'yyyy-MM-dd')
      const e = format(endOfMonth(d), 'yyyy-MM-dd')
      return supabase
        .from('transactions')
        .select('amount, type')
        .gte('date', s)
        .lte('date', e)
        .eq('paid', true)
        .neq('type', 'transfer')
        .then(({ data }) => ({
          month: format(d, 'MMM/yy', { locale: ptBR }),
          receitas: (data ?? []).filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0),
          despesas: (data ?? []).filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
        }))
    })
  )
  setBarData(monthsData)
  setLoading(false)
}
```

---

## Task 11: TypeScript Check

- [ ] **Step 1: Run tsc**

```bash
cd /home/guilherme-granja/Guilherme/lab-financial-management
npx tsc --noEmit
```

Expected: zero errors, zero warnings. Fix any errors before proceeding.

**Common issues to watch for:**
- `Transaction` type spread — the new fields (`recurrence`, `paid`, `account_id`, etc.) must all be present
- Supabase select with alias returning `unknown` — use `as unknown as Transaction[]` cast where needed
- `crypto.randomUUID()` — available in modern browsers (TypeScript `lib.dom.d.ts` has it since TS 4.7)
- `addMonths` / `parseISO` — already in date-fns v4 dependency

---

## Task 12: Commit, Push, Deploy

- [ ] **Step 1: Stage all changes**

```bash
git add \
  supabase/migrations/20260615200000_accounts_and_transfers.sql \
  src/components/ui/switch.tsx \
  src/types/index.ts \
  src/hooks/useAccounts.ts \
  src/hooks/useTransactions.ts \
  src/pages/Accounts.tsx \
  src/pages/Transactions.tsx \
  src/pages/Dashboard.tsx \
  src/pages/Reports.tsx \
  src/router/index.tsx \
  src/components/layout/Sidebar.tsx
```

- [ ] **Step 2: Commit**

```bash
git commit -m "feat: accounts, transfers, recurrence and payment status"
```

- [ ] **Step 3: Push**

```bash
git push origin main
```

- [ ] **Step 4: Deploy**

```bash
npm run deploy
```

Expected: build completes with no errors, gh-pages publish succeeds.

---

## Self-Review Checklist

**Spec coverage:**

| Spec requirement | Task |
|---|---|
| `accounts` table + RLS | Task 1 |
| `account_id`, `to_account_id` on transactions | Task 1 |
| `transfer` type constraint | Task 1 |
| Recurrence + paid columns | Task 1 |
| Switch component | Task 2 |
| `Account`, `RecurrenceType` types | Task 3 |
| `TransactionType` includes `transfer` | Task 3 |
| `Transaction` with all new fields | Task 3 |
| `useAccounts` with CRUD + `getAccountBalance` | Task 4 |
| Accounts grid page + dialogs | Task 5 |
| `/accounts` route | Task 6 |
| "Contas" sidebar link between Transações and Categorias | Task 6 |
| `useTransactions` with account joins | Task 7 |
| Batch create for installment (N records) | Task 7 |
| Batch create for fixed (24 records) | Task 7 |
| `updateTransactionPayment` | Task 7 |
| Status filter (all/paid/unpaid) | Task 7 + 8 |
| Transfer type in modal (hides category, shows to_account_id) | Task 8 |
| Recurrence field + installments field in modal | Task 8 |
| Paid/unpaid switch in modal | Task 8 |
| paid_at + paid_amount fields when paid = true | Task 8 |
| Account column in table | Task 8 |
| Status column with badges | Task 8 |
| Recurrence badge (X/N or Fixo) | Task 8 |
| Pay button + pay modal | Task 8 |
| Transfer badge in blue | Task 8 |
| Dashboard: paid=true + exclude transfers | Task 9 |
| Dashboard: include_in_dashboard filter | Task 9 |
| Dashboard: "A pagar este mês" card | Task 9 |
| Reports: exclude transfers | Task 10 |
| Reports: paid=true only | Task 10 |

**Type consistency check:**
- `TransactionPayload` in `useTransactions.ts` has all fields used in `Transactions.tsx` ✓
- `AccountPayload` in `useAccounts.ts` matches form fields in `Accounts.tsx` ✓
- `Transaction.accounts` and `Transaction.to_accounts` are `Account | undefined` (optional join) ✓
- `recurrenceBadge()` uses `tx.recurrence`, `tx.installment_index`, `tx.installments` — all in updated `Transaction` type ✓
