import { useState } from 'react'
import { format } from 'date-fns'
import { useTransactions, TransactionFilters } from '@/hooks/useTransactions'
import { useCategories } from '@/hooks/useCategories'
import { Transaction, TransactionType } from '@/types'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'

const CURRENT_MONTH = format(new Date(), 'yyyy-MM')

interface FormState {
  amount: string
  type: TransactionType
  category_id: string
  description: string
  date: string
}

const EMPTY_FORM: FormState = {
  amount: '',
  type: 'expense',
  category_id: '',
  description: '',
  date: format(new Date(), 'yyyy-MM-dd'),
}

export default function Transactions() {
  const [filters, setFilters] = useState<TransactionFilters>({
    period: CURRENT_MONTH,
    periodType: 'monthly',
    type: 'all',
    categoryId: 'all',
  })

  const { transactions, totalPages, page, setPage, loading, createTransaction, updateTransaction, deleteTransaction } =
    useTransactions(filters)
  const { categories } = useCategories()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
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
      description: tx.description ?? '',
      date: tx.date,
    })
    setEditingId(tx.id)
    setFormError(null)
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.amount || isNaN(Number(form.amount))) {
      setFormError('Informe um valor válido')
      return
    }
    if (!form.date) {
      setFormError('Informe a data')
      return
    }

    setSaving(true)
    setFormError(null)

    const payload = {
      amount: parseFloat(form.amount),
      type: form.type,
      category_id: form.category_id || null,
      description: form.description || null,
      date: form.date,
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

  const availableCategories = categories.filter(
    (c) => c.type === form.type || c.type === 'both'
  )

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
            <SelectTrigger className="bg-[#1a1d27] border-[#2d3148] text-slate-200 w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1d27] border-[#2d3148]">
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="income">Receita</SelectItem>
              <SelectItem value="expense">Despesa</SelectItem>
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
              <TableHead className="text-slate-400">Categoria</TableHead>
              <TableHead className="text-slate-400">Tipo</TableHead>
              <TableHead className="text-slate-400 text-right">Valor</TableHead>
              <TableHead className="text-slate-400 w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                  Carregando...
                </TableCell>
              </TableRow>
            )}
            {!loading && transactions.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                  Nenhuma transação encontrada
                </TableCell>
              </TableRow>
            )}
            {transactions.map((tx) => (
              <TableRow key={tx.id} className="border-[#2d3148] hover:bg-[#2d3148]/30">
                <TableCell className="text-slate-300">{formatDate(tx.date)}</TableCell>
                <TableCell className="text-slate-300">{tx.description ?? '—'}</TableCell>
                <TableCell className="text-slate-300">
                  {tx.categories ? `${tx.categories.icon} ${tx.categories.name}` : '—'}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={
                      tx.type === 'income'
                        ? 'bg-green-950 text-green-400 border-green-800'
                        : 'bg-red-950 text-red-400 border-red-800'
                    }
                  >
                    {tx.type === 'income' ? 'Receita' : 'Despesa'}
                  </Badge>
                </TableCell>
                <TableCell className={`text-right font-medium ${tx.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                  {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 justify-end">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-200" onClick={() => openEdit(tx)}>
                      <Pencil size={14} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-400" onClick={() => setDeleteId(tx.id)}>
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
        <DialogContent className="bg-[#1a1d27] border-[#2d3148] text-slate-200">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar transação' : 'Nova transação'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {formError && (
              <p className="text-red-400 text-sm">{formError}</p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-slate-400 text-xs">Tipo</Label>
                <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as TransactionType, category_id: '' }))}>
                  <SelectTrigger className="bg-[#0f1117] border-[#2d3148]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1d27] border-[#2d3148]">
                    <SelectItem value="income">Receita</SelectItem>
                    <SelectItem value="expense">Despesa</SelectItem>
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
              <Label className="text-slate-400 text-xs">Categoria</Label>
              <Select value={form.category_id} onValueChange={(v) => setForm((f) => ({ ...f, category_id: v }))}>
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

            <div className="space-y-1">
              <Label className="text-slate-400 text-xs">Descrição</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="bg-[#0f1117] border-[#2d3148]"
                placeholder="Opcional"
              />
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
