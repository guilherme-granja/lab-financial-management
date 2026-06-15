import { useState } from 'react'
import { useCategories } from '@/hooks/useCategories'
import type { Category, CategoryType } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Pencil, Trash2 } from 'lucide-react'

const CATEGORY_TYPE_LABELS: Record<CategoryType, string> = {
  income: 'Receita',
  expense: 'Despesa',
  both: 'Ambos',
}

const CATEGORY_TYPE_COLORS: Record<CategoryType, string> = {
  income: 'bg-green-950 text-green-400 border-green-800',
  expense: 'bg-red-950 text-red-400 border-red-800',
  both: 'bg-indigo-950 text-indigo-400 border-indigo-800',
}

interface FormState {
  name: string
  icon: string
  color: string
  type: CategoryType
}

const EMPTY_FORM: FormState = { name: '', icon: '📦', color: '#6366f1', type: 'expense' }

export default function Categories() {
  const { categories, loading, createCategory, updateCategory, deleteCategory } = useCategories()

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

  function openEdit(cat: Category) {
    setForm({ name: cat.name, icon: cat.icon, color: cat.color, type: cat.type })
    setEditingId(cat.id)
    setFormError(null)
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setFormError('Informe o nome da categoria')
      return
    }
    if (!form.icon.trim()) {
      setFormError('Informe um ícone (emoji)')
      return
    }

    setSaving(true)
    setFormError(null)

    try {
      if (editingId) {
        await updateCategory(editingId, form)
      } else {
        await createCategory(form)
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
      await deleteCategory(deleteId)
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
          Nova categoria
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {categories.map((cat) => (
          <Card key={cat.id} className="bg-[#1a1d27] border-[#2d3148]">
            <CardContent className="p-4 flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0"
                style={{ backgroundColor: cat.color + '33', border: `1px solid ${cat.color}44` }}
              >
                {cat.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-slate-200 font-medium text-sm truncate">{cat.name}</p>
                <Badge variant="outline" className={`text-xs mt-1 ${CATEGORY_TYPE_COLORS[cat.type]}`}>
                  {CATEGORY_TYPE_LABELS[cat.type]}
                </Badge>
              </div>
              <div className="flex flex-col gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-slate-400 hover:text-slate-200"
                  onClick={() => openEdit(cat)}
                >
                  <Pencil size={13} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-slate-400 hover:text-red-400"
                  onClick={() => setDeleteId(cat.id)}
                >
                  <Trash2 size={13} />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {categories.length === 0 && (
          <div className="col-span-full text-center text-slate-500 py-12">
            Nenhuma categoria cadastrada
          </div>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[#1a1d27] border-[#2d3148] text-slate-200">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar categoria' : 'Nova categoria'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {formError && <p className="text-red-400 text-sm">{formError}</p>}

            <div className="space-y-1">
              <Label className="text-slate-400 text-xs">Nome</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="bg-[#0f1117] border-[#2d3148]"
                placeholder="Ex: Alimentação"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-slate-400 text-xs">Ícone (emoji)</Label>
                <Input
                  value={form.icon}
                  onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
                  className="bg-[#0f1117] border-[#2d3148] text-xl"
                  placeholder="🍕"
                  maxLength={2}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-slate-400 text-xs">Cor</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.color}
                    onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                    className="h-9 w-9 rounded border-0 cursor-pointer bg-transparent"
                  />
                  <Input
                    value={form.color}
                    onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                    className="bg-[#0f1117] border-[#2d3148] font-mono text-sm"
                    placeholder="#6366f1"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-slate-400 text-xs">Tipo</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as CategoryType }))}>
                <SelectTrigger className="bg-[#0f1117] border-[#2d3148]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1d27] border-[#2d3148]">
                  <SelectItem value="income">Receita</SelectItem>
                  <SelectItem value="expense">Despesa</SelectItem>
                  <SelectItem value="both">Ambos</SelectItem>
                </SelectContent>
              </Select>
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
            <DialogTitle>Excluir categoria</DialogTitle>
          </DialogHeader>
          <p className="text-slate-400 text-sm">
            Essa ação não pode ser desfeita. Transações vinculadas perderão a categoria.
          </p>
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
