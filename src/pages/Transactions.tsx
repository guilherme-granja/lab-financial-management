import React, { useState, useEffect } from 'react'
import { format, addMonths, parseISO, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useSearchParams } from 'react-router-dom'
import { useTransactions } from '@/hooks/useTransactions'
import type { TransactionFilters, TransactionPayload } from '@/hooks/useTransactions'
import { useCategories } from '@/hooks/useCategories'
import { useAccounts } from '@/hooks/useAccounts'
import { useTags } from '@/hooks/useTags'
import type { Transaction, TransactionType, RecurrenceType } from '@/types'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, CreditCard, X, AlertTriangle, Columns, Check, ChevronDown } from 'lucide-react'
import { SearchableSelect } from '@/components/ui/searchable-select'
import type { SearchableSelectOption } from '@/components/ui/searchable-select'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import { Popover, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { MoneyInput } from '@/components/ui/money-input'
import { checkDuplicate } from '@/hooks/useDuplicateCheck'
import { useSupabaseClient } from '@/hooks/useDatabase'

const CURRENT_MONTH = format(new Date(), 'yyyy-MM')

// Inline multi-select for tags using Popover + Command pattern
interface TagMultiSelectProps {
  selectedIds: string[]
  onChange: (ids: string[]) => void
  tags: { id: string; name: string; created_at: string }[]
}

function TagMultiSelect({ selectedIds, onChange, tags }: TagMultiSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')

  const filtered = search
    ? tags.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()))
    : tags

  function toggle(id: string) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((tid) => tid !== id))
    } else {
      onChange([...selectedIds, id])
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className="flex h-10 w-full items-center justify-between rounded-md border border-[#2d3148] bg-[#0f1117] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <span className={selectedIds.length === 0 ? 'text-muted-foreground' : 'text-slate-200'}>
            {selectedIds.length === 0
              ? 'Sem tags'
              : selectedIds.length === 1
              ? (tags.find((t) => t.id === selectedIds[0])?.name ?? '1 tag')
              : `${selectedIds.length} tags`}
          </span>
          <span className="flex items-center gap-1.5">
            {selectedIds.length > 0 && (
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] font-bold">
                {selectedIds.length}
              </span>
            )}
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </span>
        </button>
      </PopoverTrigger>
      <PopoverPrimitive.Content
        align="start"
        sideOffset={4}
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="z-50 w-[var(--radix-popover-trigger-width)] p-0 rounded-md border border-[#2d3148] bg-[#0f1117] shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar tag..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>Nenhuma tag encontrada.</CommandEmpty>
            <CommandGroup>
              {filtered.map((tag) => (
                <CommandItem
                  key={tag.id}
                  value={tag.id}
                  onSelect={() => toggle(tag.id)}
                >
                  <span className="flex-1">{tag.name}</span>
                  {selectedIds.includes(tag.id) && (
                    <Check className="h-4 w-4 shrink-0 text-indigo-400" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverPrimitive.Content>
    </Popover>
  )
}

type ColumnKey = 'date' | 'account' | 'category' | 'type' | 'amount' | 'description' | 'tag' | 'status'

const DEFAULT_VISIBLE: Record<ColumnKey, boolean> = {
  date: true,
  account: true,
  category: true,
  type: true,
  amount: true,
  description: false,
  tag: false,
  status: false,
}

const STORAGE_KEY = 'transactions_column_visibility'

function loadColumnVisibility(): Record<ColumnKey, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_VISIBLE
    return { ...DEFAULT_VISIBLE, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_VISIBLE
  }
}

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
  tag_ids: string[]
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
  tag_ids: [],
}

interface PayFormState {
  paid_at: string
  paid_amount: string
}

interface ActiveChip {
  key: string
  label: string
  onRemove: () => void
}

export default function Transactions() {
  const supabase = useSupabaseClient()
  const [searchParams] = useSearchParams()

  const [filters, setFilters] = useState<TransactionFilters>({
    period: CURRENT_MONTH,
    periodType: 'monthly',
    type: 'all',
    categoryId: 'all',
    status: 'all',
    account_id: null,
    tagId: 'all',
    dateFrom: null,
    dateTo: null,
  })

  useEffect(() => {
    const accountId = searchParams.get('account_id')
    const type = searchParams.get('type')
    const month = searchParams.get('month')
    const status = searchParams.get('status')

    if (accountId || type || month || status) {
      setFilters((f) => ({
        ...f,
        ...(accountId ? { account_id: accountId } : {}),
        ...(type ? { type: type as TransactionType | 'all' } : {}),
        ...(month ? { period: month } : {}),
        ...(status ? { status: status as 'all' | 'paid' | 'unpaid' } : {}),
      }))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const {
    transactions,
    totalPages,
    page,
    setPage,
    loading,
    createTransaction,
    updateTransaction,
    updateRecurrenceGroup,
    updateRecurrenceFromHere,
    updateTransactionPayment,
    deleteTransaction,
    deleteTransactionGroupUnpaid,
    deleteTransactionGroup,
    filteredTotal,
  } = useTransactions(filters)
  const { categories, categoryTree } = useCategories()
  const { accounts } = useAccounts()
  const { tags } = useTags()

  const [columnVisibility, setColumnVisibility] = useState<Record<ColumnKey, boolean>>(loadColumnVisibility)
  const [columnPickerOpen, setColumnPickerOpen] = useState(false)
  const [filterPanelOpen, setFilterPanelOpen] = useState(false)

  function toggleColumn(key: ColumnKey) {
    const FIXED: ColumnKey[] = ['date', 'account', 'category', 'type', 'amount']
    if (FIXED.includes(key)) return
    setColumnVisibility((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteScope, setDeleteScope] = useState<'only' | 'unpaid' | 'all'>('only')
  const [deleteTx, setDeleteTx] = useState<Transaction | null>(null)
  const [payingTx, setPayingTx] = useState<Transaction | null>(null)
  const [payForm, setPayForm] = useState<PayFormState>({ paid_at: '', paid_amount: '' })
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [duplicateWarning, setDuplicateWarning] = useState<Transaction | null>(null)

  type RecurrenceScope = 'one' | 'future' | 'all'
  const [scopeDialogOpen, setScopeDialogOpen] = useState(false)
  const [pendingPayload, setPendingPayload] = useState<{
    payload: TransactionPayload
    tx: Transaction
  } | null>(null)

  function openCreate() {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setFormError(null)
    setDuplicateWarning(null)
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
      tag_ids: tx.transaction_tags?.map((tt) => tt.tag_id) ?? [],
    })
    setEditingId(tx.id)
    setFormError(null)
    setDuplicateWarning(null)
    setDialogOpen(true)
  }

  function openPay(tx: Transaction) {
    setPayingTx(tx)
    setPayForm({
      paid_at: tx.date,
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
    if (form.type !== 'transfer' && !form.account_id) {
      setFormError('Selecione uma conta')
      return
    }
    if (form.type !== 'transfer' && !form.category_id) {
      setFormError('Selecione uma categoria')
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

    if (form.description?.trim()) {
      const duplicate = await checkDuplicate(supabase, {
        type: form.type,
        amount,
        date: form.date,
        description: form.description,
        excludeId: editingId ?? undefined,
      })
      if (duplicate && !duplicateWarning) {
        setDuplicateWarning(duplicate)
        return
      }
    }

    setDuplicateWarning(null)
    setSaving(true)
    setFormError(null)

    const paid_at = form.paid ? form.date : null
    const paid_amount_val = form.paid ? amount : null

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
      tag_ids: form.tag_ids,
    }

    try {
      if (editingId) {
        const editingTx = transactions.find((t) => t.id === editingId)
        const isRecurrent =
          editingTx &&
          editingTx.recurrence !== 'none' &&
          editingTx.recurrence_group_id !== null

        if (isRecurrent) {
          setPendingPayload({ payload, tx: editingTx! })
          setSaving(false)
          setDialogOpen(false)
          setScopeDialogOpen(true)
          return
        }

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

  async function handleScopeConfirm(scope: RecurrenceScope) {
    if (!pendingPayload || !editingId) return
    const { payload, tx } = pendingPayload
    setSaving(true)
    try {
      if (scope === 'one') {
        await updateTransaction(editingId, payload)
      } else if (scope === 'future') {
        await updateRecurrenceFromHere(editingId, tx.recurrence_group_id!, tx.date, payload)
      } else {
        await updateRecurrenceGroup(tx.recurrence_group_id!, payload)
      }
      setScopeDialogOpen(false)
      setPendingPayload(null)
    } catch (e) {
      setScopeDialogOpen(false)
      setFormError((e as Error).message)
      setDialogOpen(true)
    } finally {
      setSaving(false)
    }
  }

  function handleScopeCancel() {
    setScopeDialogOpen(false)
    setDialogOpen(true)
  }

  async function handleDelete() {
    if (!deleteId) return
    try {
      await deleteTransaction(deleteId)
    } finally {
      setDeleteId(null)
    }
  }

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

  function navigatePeriod(delta: number) {
    const current = parseISO(`${filters.period}-01`)
    const next = addMonths(current, delta)
    setFilters((f) => ({
      ...f,
      period: format(next, 'yyyy-MM'),
      periodType: 'monthly',
      dateFrom: null,
      dateTo: null,
    }))
  }

  const DEFAULT_FILTERS: TransactionFilters = {
    period: CURRENT_MONTH,
    periodType: 'monthly',
    type: 'all',
    categoryId: 'all',
    status: 'all',
    account_id: null,
    tagId: 'all',
    dateFrom: null,
    dateTo: null,
  }

  function clearFilters() {
    setFilters(DEFAULT_FILTERS)
  }

  function clearSecondaryFilters() {
    setFilters((f) => ({ ...f, status: 'all', categoryId: 'all', account_id: null, tagId: 'all', dateFrom: null, dateTo: null }))
  }

  const hasActiveFilters =
    filters.type !== 'all' ||
    filters.categoryId !== 'all' ||
    filters.status !== 'all' ||
    filters.account_id !== null ||
    filters.tagId !== 'all' ||
    filters.dateFrom !== null ||
    filters.dateTo !== null

  const secondaryFilterCount =
    (filters.status !== 'all' ? 1 : 0) +
    (filters.categoryId !== 'all' ? 1 : 0) +
    (filters.account_id !== null ? 1 : 0) +
    (filters.tagId !== 'all' ? 1 : 0) +
    (filters.dateFrom !== null ? 1 : 0) +
    (filters.dateTo !== null ? 1 : 0)

  const activeChips: ActiveChip[] = []

  if (filters.type !== 'all') {
    const typeLabels: Record<string, string> = {
      income: 'Receita',
      expense: 'Despesa',
      transfer: 'Transferência',
    }
    activeChips.push({
      key: 'type',
      label: `Tipo: ${typeLabels[filters.type]}`,
      onRemove: () => setFilters((f) => ({ ...f, type: 'all' })),
    })
  }

  if (filters.status !== 'all') {
    const statusLabels: Record<string, string> = { paid: 'Pagos', unpaid: 'Pendentes' }
    activeChips.push({
      key: 'status',
      label: `Status: ${statusLabels[filters.status]}`,
      onRemove: () => setFilters((f) => ({ ...f, status: 'all' })),
    })
  }

  if (filters.categoryId !== 'all') {
    const cat = categories.find((c) => c.id === filters.categoryId)
    activeChips.push({
      key: 'category',
      label: `Categoria: ${cat ? `${cat.icon} ${cat.name}` : filters.categoryId}`,
      onRemove: () => setFilters((f) => ({ ...f, categoryId: 'all' })),
    })
  }

  if (filters.account_id !== null) {
    const acc = accounts.find((a) => a.id === filters.account_id)
    activeChips.push({
      key: 'account',
      label: `Conta: ${acc ? `${acc.icon} ${acc.name}` : filters.account_id}`,
      onRemove: () => setFilters((f) => ({ ...f, account_id: null })),
    })
  }

  if (filters.tagId !== 'all') {
    const tag = tags.find((t) => t.id === filters.tagId)
    activeChips.push({
      key: 'tag',
      label: `Tag: ${tag ? tag.name : filters.tagId}`,
      onRemove: () => setFilters((f) => ({ ...f, tagId: 'all' })),
    })
  }

  const periodMin = format(startOfMonth(parseISO(`${filters.period}-01`)), 'yyyy-MM-dd')
  const periodMax = format(endOfMonth(parseISO(`${filters.period}-01`)), 'yyyy-MM-dd')

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div>
        {/* Level 1 — always visible */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Period selector */}
          <div className="flex items-center gap-0.5 bg-[#1a1d27] border border-[#2d3148] rounded-lg h-9 px-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-400 hover:text-slate-200 hover:bg-[#2d3148]"
              onClick={() => navigatePeriod(-1)}
            >
              <ChevronLeft size={14} />
            </Button>
            <span className="text-slate-200 text-sm w-32 text-center capitalize select-none">
              {format(parseISO(`${filters.period}-01`), 'MMMM yyyy', { locale: ptBR })}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-400 hover:text-slate-200 hover:bg-[#2d3148]"
              onClick={() => navigatePeriod(1)}
            >
              <ChevronRight size={14} />
            </Button>
          </div>

          {/* Visual separator */}
          <div className="w-px h-5 bg-[#2d3148]" />

          {/* Type pill buttons */}
          {(
            [
              { value: 'all',      label: 'Todos' },
              { value: 'income',   label: 'Receita' },
              { value: 'expense',  label: 'Despesa' },
              { value: 'transfer', label: 'Transferência' },
            ] as { value: string; label: string }[]
          ).map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilters((f) => ({ ...f, type: value as TransactionType | 'all' }))}
              className={`h-9 px-3 rounded-lg text-sm font-medium border transition-colors ${
                filters.type === value
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'text-slate-400 border-[#2d3148] hover:text-slate-200 hover:border-slate-500 bg-transparent'
              }`}
            >
              {label}
            </button>
          ))}

          {/* Filtros button with badge */}
          <button
            onClick={() => setFilterPanelOpen((v) => !v)}
            className={`relative h-9 px-3 rounded-lg text-sm font-medium border transition-colors gap-1.5 inline-flex items-center ${
              filterPanelOpen
                ? 'bg-[#2d3148] text-slate-200 border-slate-500'
                : 'text-slate-400 border-[#2d3148] hover:text-slate-200 hover:border-slate-500 bg-transparent'
            }`}
          >
            Filtros
            {secondaryFilterCount > 0 && (
              <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] font-bold">
                {secondaryFilterCount}
              </span>
            )}
          </button>

          {/* Column picker */}
          <div className="relative hidden md:block">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setColumnPickerOpen((v) => !v)}
              className="text-slate-400 hover:text-slate-200 gap-1.5 h-9 border border-[#2d3148]"
            >
              <Columns size={14} />
              Colunas
            </Button>

            {columnPickerOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setColumnPickerOpen(false)}
                />
                <div className="absolute right-0 top-10 z-20 bg-[#1a1d27] border border-[#2d3148] rounded-lg shadow-xl p-3 w-52 space-y-1">
                  <p className="text-slate-500 text-xs pb-1 border-b border-[#2d3148]">Exibir colunas</p>
                  {(
                    [
                      { key: 'date',        label: 'Data',      fixed: true  },
                      { key: 'description', label: 'Descrição', fixed: false },
                      { key: 'account',     label: 'Conta',     fixed: true  },
                      { key: 'category',    label: 'Categoria', fixed: true  },
                      { key: 'tag',         label: 'Tag',       fixed: false },
                      { key: 'type',        label: 'Tipo',      fixed: true  },
                      { key: 'status',      label: 'Status',    fixed: false },
                      { key: 'amount',      label: 'Valor',     fixed: true  },
                    ] as { key: ColumnKey; label: string; fixed: boolean }[]
                  ).map(({ key, label, fixed }) => (
                    <label
                      key={key}
                      className={`flex items-center gap-2.5 px-1 py-1 rounded cursor-pointer hover:bg-[#2d3148] transition-colors ${fixed ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={columnVisibility[key]}
                        disabled={fixed}
                        onChange={() => toggleColumn(key)}
                        className="accent-indigo-500 w-3.5 h-3.5"
                      />
                      <span className="text-slate-300 text-sm">{label}</span>
                      {fixed && <span className="ml-auto text-slate-600 text-xs">padrão</span>}
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Nova transação */}
          <Button onClick={openCreate} className="ml-auto bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
            <Plus size={16} />
            Nova transação
          </Button>
        </div>

        {/* Level 2 — secondary filter panel */}
        {filterPanelOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setFilterPanelOpen(false)}
            />
            <div className="relative z-20 mt-2 bg-[#1a1d27] border border-[#2d3148] rounded-xl p-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-slate-400 text-xs">Status</Label>
                  <Select
                    value={filters.status}
                    onValueChange={(v) => setFilters((f) => ({ ...f, status: v as 'all' | 'paid' | 'unpaid' }))}
                  >
                    <SelectTrigger className="bg-[#0f1117] border-[#2d3148] text-slate-200 w-full">
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
                    <SelectTrigger className="bg-[#0f1117] border-[#2d3148] text-slate-200 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1d27] border-[#2d3148] max-h-72 overflow-y-auto">
                      <SelectItem value="all">Todas</SelectItem>
                      {categoryTree.map((parent) => (
                        <SelectGroup key={parent.id}>
                          {(parent.subcategories?.length ?? 0) > 0 ? (
                            <>
                              <SelectLabel className="text-slate-500 text-xs px-2 py-1">
                                {parent.icon} {parent.name}
                              </SelectLabel>
                              {parent.subcategories!.map((sub) => (
                                <SelectItem key={sub.id} value={sub.id} className="pl-6">
                                  {sub.icon} {sub.name}
                                </SelectItem>
                              ))}
                            </>
                          ) : (
                            <SelectItem key={parent.id} value={parent.id}>
                              {parent.icon} {parent.name}
                            </SelectItem>
                          )}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-slate-400 text-xs">Tag</Label>
                  <Select
                    value={filters.tagId}
                    onValueChange={(v) => setFilters((f) => ({ ...f, tagId: v }))}
                  >
                    <SelectTrigger className="bg-[#0f1117] border-[#2d3148] text-slate-200 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1d27] border-[#2d3148]">
                      <SelectItem value="all">Todas as tags</SelectItem>
                      {tags.map((tag) => (
                        <SelectItem key={tag.id} value={tag.id}>
                          {tag.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-slate-400 text-xs">Conta</Label>
                  <Select
                    value={filters.account_id ?? 'all'}
                    onValueChange={(v) =>
                      setFilters((f) => ({ ...f, account_id: v === 'all' ? null : v }))
                    }
                  >
                    <SelectTrigger className="bg-[#0f1117] border-[#2d3148] text-slate-200 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1d27] border-[#2d3148]">
                      <SelectItem value="all">Todas as contas</SelectItem>
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.icon} {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-slate-400 text-xs">Data início</Label>
                  <Input
                    type="date"
                    value={filters.dateFrom ?? ''}
                    min={periodMin}
                    max={filters.dateTo ?? periodMax}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, dateFrom: e.target.value || null }))
                    }
                    className="bg-[#1a1d27] border-[#2d3148] text-slate-200 w-40"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-slate-400 text-xs">Data fim</Label>
                  <Input
                    type="date"
                    value={filters.dateTo ?? ''}
                    min={filters.dateFrom ?? periodMin}
                    max={periodMax}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, dateTo: e.target.value || null }))
                    }
                    className="bg-[#1a1d27] border-[#2d3148] text-slate-200 w-40"
                  />
                </div>
              </div>

              {secondaryFilterCount > 0 && (
                <div className="mt-3 pt-3 border-t border-[#2d3148]">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearSecondaryFilters}
                    className="text-slate-400 hover:text-slate-200 gap-1.5 h-8 text-xs"
                  >
                    <X size={12} />
                    Limpar filtros
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Active Filter Chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-500 text-xs">Filtros ativos:</span>
          {activeChips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs
                         bg-indigo-950 border border-indigo-800 text-indigo-300"
            >
              {chip.label}
              <button
                onClick={chip.onRemove}
                className="text-indigo-400 hover:text-indigo-200 leading-none"
                aria-label={`Remover filtro ${chip.label}`}
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Valor Total */}
      {filteredTotal !== null && (
        <div className="flex items-center justify-between px-4 py-2.5
                        bg-[#1a1d27] border border-[#2d3148] rounded-xl">
          <span className="text-slate-400 text-sm">
            Total de{' '}
            <span className="font-medium text-slate-200">
              {filters.type === 'income' ? 'Receitas' : filters.type === 'expense' ? 'Despesas' : 'Transferências'}
            </span>
            {/* se houver outros filtros ativos além de tipo, acrescentar contexto */}
            {activeChips.length > 1 && ' (filtros aplicados)'}
            {activeChips.length === 1 && ' no período'}
          </span>
          <span
            className={`text-lg font-bold tabular-nums ${
              filters.type === 'income'
                ? 'text-green-400'
                : filters.type === 'expense'
                ? 'text-red-400'
                : 'text-blue-400'
            }`}
          >
            {filters.type === 'income' ? '+' : filters.type === 'expense' ? '−' : ''}
            {formatCurrency(filteredTotal)}
          </span>
        </div>
      )}

      {/* Mobile cards */}
      <div className="flex flex-col gap-2 md:hidden">
        {loading && (
          <div className="text-center text-slate-500 py-8 text-sm">Carregando...</div>
        )}
        {!loading && transactions.length === 0 && (
          <div className="text-center text-slate-500 py-8 text-sm">Nenhuma transação encontrada</div>
        )}
        {transactions.map((tx) => {
          const toAccount = tx.type === 'transfer' && tx.to_account_id
            ? (accounts.find((a) => a.id === tx.to_account_id) ?? null)
            : null
          return (
            <div
              key={tx.id}
              className="bg-[#1a1d27] border border-[#2d3148] rounded-xl px-4 py-3 flex items-center gap-3"
            >
              {/* Ícone da categoria */}
              <div className="text-xl w-8 text-center shrink-0">
                {tx.type === 'transfer' ? '↔' : tx.categories?.icon ?? '•'}
              </div>

              {/* Info principal */}
              <div className="flex-1 min-w-0">
                <div className="text-slate-200 text-sm font-medium truncate">
                  {tx.type === 'transfer'
                    ? `${tx.accounts?.name ?? '—'} → ${toAccount?.name ?? '—'}`
                    : tx.categories?.name ?? tx.description ?? '—'}
                </div>
                <div className="text-slate-500 text-xs mt-0.5 flex items-center gap-1.5">
                  <span>{formatDate(tx.date)}</span>
                  {tx.accounts && (
                    <>
                      <span>·</span>
                      <span>{tx.accounts.icon} {tx.accounts.name}</span>
                    </>
                  )}
                  {!(tx.payment || tx.paid) && tx.type !== 'transfer' && (
                    <>
                      <span>·</span>
                      <span className="text-yellow-500">Pendente</span>
                    </>
                  )}
                </div>
              </div>

              {/* Valor */}
              <div className={`text-sm font-semibold tabular-nums shrink-0 ${amountColor(tx.type)}`}>
                {amountPrefix(tx.type)}{formatCurrency(tx.amount)}
              </div>

              {/* Ações */}
              <div className="flex gap-0.5 shrink-0">
                {!(tx.payment || tx.paid) && tx.type !== 'transfer' && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-yellow-400 hover:text-yellow-300"
                    onClick={() => openPay(tx)}>
                    <CreditCard size={14} />
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-200"
                  onClick={() => openEdit(tx)}>
                  <Pencil size={14} />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-400"
                  onClick={() => {
                    if (tx.recurrence_group_id) {
                      setDeleteTx(tx)
                      setDeleteScope('only')
                    } else {
                      setDeleteId(tx.id)
                    }
                  }}>
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Table */}
      <div className="hidden md:block">
        {(() => {
          const visibleCount = Object.values(columnVisibility).filter(Boolean).length + 1
          return (
            <div className="bg-[#1a1d27] border border-[#2d3148] rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-[#2d3148] hover:bg-transparent">
                    {columnVisibility.date        && <TableHead className="text-slate-400">Data</TableHead>}
                    {columnVisibility.description && <TableHead className="text-slate-400">Descrição</TableHead>}
                    {columnVisibility.account     && <TableHead className="text-slate-400">Conta</TableHead>}
                    {columnVisibility.category    && <TableHead className="text-slate-400">Categoria</TableHead>}
                    {columnVisibility.tag         && <TableHead className="text-slate-400">Tag</TableHead>}
                    {columnVisibility.type        && <TableHead className="text-slate-400">Tipo</TableHead>}
                    {columnVisibility.status      && <TableHead className="text-slate-400">Status</TableHead>}
                    {columnVisibility.amount      && <TableHead className="text-slate-400 text-right">Valor</TableHead>}
                    <TableHead className="text-slate-400 w-28" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && (
                    <TableRow>
                      <TableCell colSpan={visibleCount} className="text-center text-slate-500 py-8">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  )}
                  {!loading && transactions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={visibleCount} className="text-center text-slate-500 py-8">
                        Nenhuma transação encontrada
                      </TableCell>
                    </TableRow>
                  )}
                  {transactions.map((tx) => {
                    const toAccount = tx.type === 'transfer' && tx.to_account_id
                      ? (accounts.find((a) => a.id === tx.to_account_id) ?? null)
                      : null
                    const badge = recurrenceBadge(tx)
                    return (
                      <TableRow key={tx.id} className="border-[#2d3148] hover:bg-[#2d3148]/30">
                        {columnVisibility.date        && <TableCell className="text-slate-300">{formatDate(tx.date)}</TableCell>}
                        {columnVisibility.description && (
                          <TableCell className="text-slate-300">
                            <span>{tx.description ?? '—'}</span>
                            {badge && (
                              <Badge variant="outline" className="text-xs border-slate-600 text-slate-400 ml-1">
                                {badge}
                              </Badge>
                            )}
                          </TableCell>
                        )}
                        {columnVisibility.account && (
                          <TableCell className="text-slate-300 text-sm">
                            {tx.accounts ? (
                              <span className="flex items-center gap-1">
                                <span>{tx.accounts.icon}</span>
                                <span>{tx.accounts.name}</span>
                              </span>
                            ) : toAccount ? (
                              <span className="text-slate-500 text-xs">
                                → {toAccount.icon} {toAccount.name}
                              </span>
                            ) : (
                              '—'
                            )}
                          </TableCell>
                        )}
                        {columnVisibility.category && (
                          <TableCell className="text-slate-300">
                            {tx.type === 'transfer'
                              ? '—'
                              : tx.categories
                              ? `${tx.categories.icon} ${tx.categories.name}`
                              : '—'}
                          </TableCell>
                        )}
                        {columnVisibility.tag && (
                          <TableCell className="text-slate-300">
                            {tx.transaction_tags && tx.transaction_tags.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {tx.transaction_tags.slice(0, 2).map((tt) => (
                                  <Badge key={tt.tag_id} variant="outline" className="bg-[#2d3148] text-slate-300 border-[#2d3148]">
                                    {tt.tags?.name ?? tt.tag_id}
                                  </Badge>
                                ))}
                                {tx.transaction_tags.length > 2 && (
                                  <Badge variant="outline" className="bg-[#2d3148] text-slate-400 border-[#2d3148]">
                                    +{tx.transaction_tags.length - 2}
                                  </Badge>
                                )}
                              </div>
                            ) : '—'}
                          </TableCell>
                        )}
                        {columnVisibility.type && (
                          <TableCell>
                            <Badge variant="outline" className={typeColor(tx.type)}>
                              {typeLabel(tx.type)}
                            </Badge>
                          </TableCell>
                        )}
                        {columnVisibility.status && (
                          <TableCell>
                            {(tx.payment || tx.paid) ? (
                              <Badge variant="outline" className="bg-green-950 text-green-400 border-green-800 text-xs">
                                Pago
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-yellow-950 text-yellow-400 border-yellow-800 text-xs">
                                Pendente
                              </Badge>
                            )}
                          </TableCell>
                        )}
                        {columnVisibility.amount && (
                          <TableCell className={`text-right font-medium ${amountColor(tx.type)}`}>
                            {amountPrefix(tx.type)}{formatCurrency(tx.amount)}
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="flex gap-1 justify-end">
                            {!(tx.payment || tx.paid) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-yellow-400 hover:text-yellow-300"
                                title="Efetivar"
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
                              onClick={() => {
                                if (tx.recurrence_group_id) {
                                  setDeleteTx(tx)
                                  setDeleteScope('only')
                                } else {
                                  setDeleteId(tx.id)
                                }
                              }}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )
        })()}
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
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) setDuplicateWarning(null); setDialogOpen(open) }}>
        <DialogContent className="bg-[#1a1d27] border-[#2d3148] text-slate-200 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar transação' : 'Nova transação'}</DialogTitle>
            <DialogDescription className="sr-only">
              {editingId ? 'Edite os dados da transação selecionada.' : 'Preencha os dados para criar uma nova transação.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {formError && <p className="text-red-400 text-sm">{formError}</p>}

            {duplicateWarning && (
              <div className="flex items-start gap-3 bg-yellow-950/40 border border-yellow-800 rounded-lg p-3">
                <AlertTriangle className="text-yellow-400 mt-0.5 flex-shrink-0" size={16} />
                <div className="space-y-1">
                  <p className="text-yellow-200 text-sm font-medium">Possível transação duplicada</p>
                  <p className="text-yellow-300/80 text-xs">
                    Já existe uma transação com esses dados em{' '}
                    <span className="font-semibold">{formatDate(duplicateWarning.date)}</span>
                    {duplicateWarning.description && ` — "${duplicateWarning.description}"`}
                    {' '}no valor de{' '}
                    <span className="font-semibold">{formatCurrency(duplicateWarning.amount)}</span>.
                  </p>
                  <p className="text-yellow-400/70 text-xs">
                    Clique em <span className="font-semibold">Salvar</span> novamente para confirmar mesmo assim.
                  </p>
                </div>
              </div>
            )}

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
                      tag_ids: [],
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
                <MoneyInput
                  value={parseFloat(form.amount) || 0}
                  onChange={(v) => setForm((f) => ({ ...f, amount: String(v) }))}
                  className="bg-[#0f1117] border-[#2d3148]"
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
                <SearchableSelect
                  value={form.category_id}
                  onValueChange={(v) => setForm((f) => ({ ...f, category_id: v }))}
                  options={categoryTree
                    .filter((p) => p.type === form.type || p.type === 'both')
                    .flatMap((parent) => {
                      const subs = (parent.subcategories ?? []).filter(
                        (s) => s.type === form.type || s.type === 'both'
                      )
                      if (subs.length > 0) {
                        return subs.map((sub): SearchableSelectOption => ({
                          value: sub.id,
                          label: sub.name,
                          display: `${sub.icon} ${sub.name}`,
                          group: `${parent.icon} ${parent.name}`,
                        }))
                      }
                      return [{
                        value: parent.id,
                        label: parent.name,
                        display: `${parent.icon} ${parent.name}`,
                      }]
                    })}
                  placeholder="Selecionar categoria"
                  searchPlaceholder="Buscar categoria..."
                />
              </div>
            )}

            {form.type !== 'transfer' && (
              <div className="space-y-1">
                <Label className="text-slate-400 text-xs">Tags</Label>
                <TagMultiSelect
                  selectedIds={form.tag_ids}
                  onChange={(ids) => setForm((f) => ({ ...f, tag_ids: ids }))}
                  tags={tags}
                />
                {form.tag_ids.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {form.tag_ids.map((id) => {
                      const tag = tags.find((t) => t.id === id)
                      if (!tag) return null
                      return (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-indigo-950 border border-indigo-800 text-indigo-300"
                        >
                          {tag.name}
                          <button
                            type="button"
                            onClick={() => setForm((f) => ({ ...f, tag_ids: f.tag_ids.filter((tid) => tid !== id) }))}
                            className="text-indigo-400 hover:text-indigo-200 leading-none"
                          >
                            <X size={10} />
                          </button>
                        </span>
                      )
                    })}
                  </div>
                )}
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
            <DialogTitle>Efetivar transação</DialogTitle>
            <DialogDescription className="sr-only">
              Informe os dados para efetivar a liquidação desta transação.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-slate-400 text-xs">Valor efetivado (R$)</Label>
              <MoneyInput
                value={parseFloat(payForm.paid_amount) || 0}
                onChange={(v) => setPayForm((f) => ({ ...f, paid_amount: String(v) }))}
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

      {/* Recurrence Scope Dialog */}
      <Dialog open={scopeDialogOpen} onOpenChange={(open) => { if (!open) handleScopeCancel() }}>
        <DialogContent className="bg-[#1a1d27] border-[#2d3148] text-slate-200 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar transação recorrente</DialogTitle>
          </DialogHeader>
          <p className="text-slate-400 text-sm">
            Esta transação faz parte de uma recorrência. O que deseja editar?
          </p>
          <div className="flex flex-col gap-2 py-2">
            <Button
              variant="outline"
              className="justify-start border-[#2d3148] text-slate-200 hover:bg-[#2d3148]"
              disabled={saving}
              onClick={() => handleScopeConfirm('one')}
            >
              Somente esta
            </Button>
            <Button
              variant="outline"
              className="justify-start border-[#2d3148] text-slate-200 hover:bg-[#2d3148]"
              disabled={saving}
              onClick={() => handleScopeConfirm('future')}
            >
              Esta e as futuras pendentes
            </Button>
            <Button
              variant="outline"
              className="justify-start border-[#2d3148] text-slate-200 hover:bg-[#2d3148]"
              disabled={saving}
              onClick={() => handleScopeConfirm('all')}
            >
              Todas
            </Button>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              className="text-slate-400"
              disabled={saving}
              onClick={handleScopeCancel}
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent
          className="bg-[#1a1d27] border-[#2d3148] text-slate-200"
          onEscapeKeyDown={() => setDeleteId(null)}
          onInteractOutside={() => setDeleteId(null)}
        >
          <DialogHeader>
            <DialogTitle>Excluir transação</DialogTitle>
            <DialogDescription className="sr-only">
              Confirme a exclusão permanente desta transação. Esta ação não pode ser desfeita.
            </DialogDescription>
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

      {/* Recurrent Delete Dialog */}
      <Dialog open={!!deleteTx} onOpenChange={() => setDeleteTx(null)}>
        <DialogContent
          className="bg-[#1a1d27] border-[#2d3148] text-slate-200"
          onEscapeKeyDown={() => setDeleteTx(null)}
          onInteractOutside={() => setDeleteTx(null)}
        >
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
    </div>
  )
}
