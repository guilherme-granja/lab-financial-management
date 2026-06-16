import { useState, useEffect } from 'react'
import { format, addMonths, parseISO } from 'date-fns'
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
  tag_id: string
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
  tag_id: '',
}

interface PayFormState {
  paid_at: string
  paid_amount: string
}

export default function Transactions() {
  const [searchParams] = useSearchParams()

  const [filters, setFilters] = useState<TransactionFilters>({
    period: CURRENT_MONTH,
    periodType: 'monthly',
    type: 'all',
    categoryId: 'all',
    status: 'all',
    account_id: null,
    tagId: 'all',
  })

  useEffect(() => {
    const accountId = searchParams.get('account_id')
    const type = searchParams.get('type')
    const month = searchParams.get('month')

    if (accountId || type || month) {
      setFilters((f) => ({
        ...f,
        ...(accountId ? { account_id: accountId } : {}),
        ...(type ? { type: type as TransactionType | 'all' } : {}),
        ...(month ? { period: month } : {}),
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
    updateTransactionPayment,
    deleteTransaction,
  } = useTransactions(filters)
  const { categories, categoryTree } = useCategories()
  const { accounts } = useAccounts()
  const { tags } = useTags()

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
      tag_id: tx.tag_id ?? '',
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
      tag_id: form.tag_id || null,
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

  function navigatePeriod(delta: number) {
    const current = parseISO(`${filters.period}-01`)
    const next = addMonths(current, delta)
    setFilters((f) => ({ ...f, period: format(next, 'yyyy-MM'), periodType: 'monthly' }))
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label className="text-slate-400 text-xs">Período</Label>
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
            <SelectTrigger className="bg-[#1a1d27] border-[#2d3148] text-slate-200 w-40">
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
              <TableHead className="text-slate-400">Tag</TableHead>
              <TableHead className="text-slate-400">Tipo</TableHead>
              <TableHead className="text-slate-400">Status</TableHead>
              <TableHead className="text-slate-400 text-right">Valor</TableHead>
              <TableHead className="text-slate-400 w-28" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-slate-500 py-8">
                  Carregando...
                </TableCell>
              </TableRow>
            )}
            {!loading && transactions.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-slate-500 py-8">
                  Nenhuma transação encontrada
                </TableCell>
              </TableRow>
            )}
            {transactions.map((tx) => {
              const toAccount = tx.type === 'transfer' && tx.to_account_id
                ? (accounts.find((a) => a.id === tx.to_account_id) ?? null)
                : null
              return (
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
                  ) : toAccount ? (
                    <span className="text-slate-500 text-xs">
                      → {toAccount.icon} {toAccount.name}
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
                <TableCell className="text-slate-300">
                  {tx.tags ? (
                    <Badge variant="outline" className="bg-[#2d3148] text-slate-300 border-[#2d3148]">
                      {tx.tags.name}
                    </Badge>
                  ) : '—'}
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
              )
            })}
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
                      tag_id: '',
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
                    {categoryTree
                      .filter((p) => p.type === form.type || p.type === 'both')
                      .map((parent) => (
                        <SelectGroup key={parent.id}>
                          {(parent.subcategories?.length ?? 0) > 0 ? (
                            <>
                              <SelectLabel className="text-slate-500 text-xs px-2 py-1">
                                {parent.icon} {parent.name}
                              </SelectLabel>
                              {parent.subcategories!
                                .filter((s) => s.type === form.type || s.type === 'both')
                                .map((sub) => (
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
            )}

            {form.type !== 'transfer' && (
              <div className="space-y-1">
                <Label className="text-slate-400 text-xs">Tag</Label>
                <Select
                  value={form.tag_id}
                  onValueChange={(v) => setForm((f) => ({ ...f, tag_id: v }))}
                >
                  <SelectTrigger className="bg-[#0f1117] border-[#2d3148]">
                    <SelectValue placeholder="Sem tag" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1d27] border-[#2d3148]">
                    <SelectItem value="">Sem tag</SelectItem>
                    {tags.map((tag) => (
                      <SelectItem key={tag.id} value={tag.id}>
                        {tag.name}
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
