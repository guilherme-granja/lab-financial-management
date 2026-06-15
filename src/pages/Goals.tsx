import { useState } from 'react'
import { format } from 'date-fns'
import { useGoals } from '@/hooks/useGoals'
import { useCategories } from '@/hooks/useCategories'
import { GoalWithProgress, PeriodType } from '@/types'
import { formatCurrency } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Plus, Pencil, Trash2 } from 'lucide-react'

interface FormState {
  category_id: string
  amount: string
  period_type: PeriodType
  period_start: string
}

const EMPTY_FORM: FormState = {
  category_id: '',
  amount: '',
  period_type: 'monthly',
  period_start: format(new Date(), 'yyyy-MM'),
}

function progressColor(progress: number): string {
  if (progress >= 100) return 'bg-red-500'
  if (progress >= 80) return 'bg-yellow-500'
  return 'bg-indigo-500'
}

export default function Goals() {
  const { goals, loading, createGoal, updateGoal, deleteGoal } = useGoals()
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

  function openEdit(goal: GoalWithProgress) {
    setForm({
      category_id: goal.category_id,
      amount: String(goal.amount),
      period_type: goal.period_type,
      period_start: goal.period_start,
    })
    setEditingId(goal.id)
    setFormError(null)
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.category_id) {
      setFormError('Selecione uma categoria')
      return
    }
    if (!form.amount || isNaN(Number(form.amount))) {
      setFormError('Informe um valor válido')
      return
    }
    if (!form.period_start) {
      setFormError('Informe o período')
      return
    }

    setSaving(true)
    setFormError(null)

    const payload = {
      category_id: form.category_id,
      amount: parseFloat(form.amount),
      period_type: form.period_type,
      period_start: form.period_start,
    }

    try {
      if (editingId) {
        await updateGoal(editingId, payload)
      } else {
        await createGoal(payload)
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
      await deleteGoal(deleteId)
    } finally {
      setDeleteId(null)
    }
  }

  if (loading) return <div className="text-slate-400 text-sm">Carregando...</div>

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
          <Plus size={16} />
          Nova meta
        </Button>
      </div>

      <div className="space-y-3">
        {goals.length === 0 && (
          <div className="text-center text-slate-500 py-12">Nenhuma meta cadastrada</div>
        )}

        {goals.map((goal) => {
          const cat = goal.categories
          const pct = Math.min(goal.progress, 100)

          return (
            <Card key={goal.id} className="bg-[#1a1d27] border-[#2d3148]">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0"
                      style={{
                        backgroundColor: (cat?.color ?? '#6366f1') + '33',
                        border: `1px solid ${(cat?.color ?? '#6366f1')}44`,
                      }}
                    >
                      {cat?.icon ?? '🎯'}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-slate-200 font-medium text-sm truncate">
                          {cat?.name ?? 'Categoria'}
                        </p>
                        {goal.progress >= 100 && (
                          <Badge variant="outline" className="bg-red-950 text-red-400 border-red-800 text-xs">
                            Excedido
                          </Badge>
                        )}
                        {goal.progress >= 80 && goal.progress < 100 && (
                          <Badge variant="outline" className="bg-yellow-950 text-yellow-400 border-yellow-800 text-xs">
                            Atenção
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <div className="h-2 w-full bg-[#2d3148] rounded-full overflow-hidden">
                          <div
                            className={cn('h-full rounded-full transition-all', progressColor(goal.progress))}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-slate-500">
                          <span>{formatCurrency(goal.actual)} gastos</span>
                          <span>
                            {goal.progress.toFixed(0)}% de {formatCurrency(goal.amount)}
                          </span>
                        </div>
                      </div>

                      <p className="text-slate-500 text-xs mt-1">
                        {goal.period_type === 'monthly' ? 'Mensal' : 'Anual'} · {goal.period_start}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-slate-400 hover:text-slate-200"
                      onClick={() => openEdit(goal)}
                    >
                      <Pencil size={13} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-slate-400 hover:text-red-400"
                      onClick={() => setDeleteId(goal.id)}
                    >
                      <Trash2 size={13} />
                    </Button>
                  </div>
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
            <DialogTitle>{editingId ? 'Editar meta' : 'Nova meta'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {formError && <p className="text-red-400 text-sm">{formError}</p>}

            <div className="space-y-1">
              <Label className="text-slate-400 text-xs">Categoria</Label>
              <Select value={form.category_id} onValueChange={(v) => setForm((f) => ({ ...f, category_id: v }))}>
                <SelectTrigger className="bg-[#0f1117] border-[#2d3148]">
                  <SelectValue placeholder="Selecionar categoria" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1d27] border-[#2d3148]">
                  {categories
                    .filter((c) => c.type === 'expense' || c.type === 'both')
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.icon} {c.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-slate-400 text-xs">Valor limite (R$)</Label>
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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-slate-400 text-xs">Tipo de período</Label>
                <Select value={form.period_type} onValueChange={(v) => setForm((f) => ({ ...f, period_type: v as PeriodType }))}>
                  <SelectTrigger className="bg-[#0f1117] border-[#2d3148]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1d27] border-[#2d3148]">
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="yearly">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-slate-400 text-xs">Início do período</Label>
                <Input
                  type="month"
                  value={form.period_start}
                  onChange={(e) => setForm((f) => ({ ...f, period_start: e.target.value }))}
                  className="bg-[#0f1117] border-[#2d3148]"
                />
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

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="bg-[#1a1d27] border-[#2d3148] text-slate-200">
          <DialogHeader>
            <DialogTitle>Excluir meta</DialogTitle>
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
