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
  parent_id: string | null
}

const EMPTY_FORM: FormState = { name: '', icon: '📦', color: '#6366f1', type: 'expense', parent_id: null }

export default function Categories() {
  const { categoryTree, loading, createCategory, updateCategory, deleteCategory } = useCategories()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  function openCreateGroup() {
    setForm({ ...EMPTY_FORM, parent_id: null })
    setEditingId(null)
    setFormError(null)
    setDialogOpen(true)
  }

  function openCreateSub(parent: Category) {
    setForm({ name: '', icon: '📦', color: parent.color, type: parent.type, parent_id: parent.id })
    setEditingId(null)
    setFormError(null)
    setDialogOpen(true)
  }

  function openEdit(cat: Category) {
    setForm({
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      type: cat.type,
      parent_id: cat.parent_id,
    })
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
        await updateCategory(editingId, {
          name: form.name,
          icon: form.icon,
          color: form.color,
          type: form.type,
          parent_id: form.parent_id,
        })
      } else {
        await createCategory({
          name: form.name,
          icon: form.icon,
          color: form.color,
          type: form.type,
          parent_id: form.parent_id || null,
        })
      }
      setDialogOpen(false)
    } catch (e) {
      setFormError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  function requestDelete(cat: Category, isParent: boolean) {
    if (isParent && (cat.subcategories?.length ?? 0) > 0) {
      setDeleteError('Remova as subcategorias antes de excluir o grupo.')
      setDeleteId(null)
      return
    }
    setDeleteError(null)
    setDeleteId(cat.id)
  }

  async function handleDelete() {
    if (!deleteId) return
    try {
      await deleteCategory(deleteId)
    } finally {
      setDeleteId(null)
    }
  }

  const parentOptions = categoryTree.map((p) => ({ id: p.id, name: p.name, icon: p.icon }))

  if (loading) return <div className="text-slate-400 text-sm">Carregando...</div>

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={openCreateGroup} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
          <Plus size={16} />
          Novo grupo
        </Button>
      </div>

      {deleteError && (
        <p className="text-red-400 text-sm bg-red-950/40 border border-red-800 rounded-lg px-4 py-2">
          {deleteError}
        </p>
      )}

      {categoryTree.length === 0 && (
        <div className="text-center text-slate-500 py-12">Nenhuma categoria cadastrada</div>
      )}

      {categoryTree.map((parent) => (
        <div key={parent.id} className="space-y-2">
          {/* Group header */}
          <div
            className="flex items-center justify-between px-4 py-2 rounded-lg"
            style={{ backgroundColor: parent.color + '1a', borderLeft: `3px solid ${parent.color}` }}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{parent.icon}</span>
              <span className="text-slate-200 font-semibold text-sm">{parent.name}</span>
              <Badge variant="outline" className={`text-xs ${CATEGORY_TYPE_COLORS[parent.type]}`}>
                {CATEGORY_TYPE_LABELS[parent.type]}
              </Badge>
              <span className="text-slate-500 text-xs ml-1">
                {parent.subcategories?.length ?? 0} subcategorias
              </span>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-slate-400 hover:text-slate-200 gap-1"
                onClick={() => openCreateSub(parent)}
              >
                <Plus size={12} />
                Nova subcategoria
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-slate-400 hover:text-slate-200"
                onClick={() => openEdit(parent)}
              >
                <Pencil size={13} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-slate-400 hover:text-red-400"
                onClick={() => requestDelete(parent, true)}
              >
                <Trash2 size={13} />
              </Button>
            </div>
          </div>

          {/* Subcategory cards */}
          {(parent.subcategories?.length ?? 0) > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 pl-4">
              {parent.subcategories!.map((sub) => (
                <Card key={sub.id} className="bg-[#1a1d27] border-[#2d3148]">
                  <CardContent className="p-3 flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-md flex items-center justify-center text-base flex-shrink-0"
                      style={{ backgroundColor: sub.color + '33', border: `1px solid ${sub.color}44` }}
                    >
                      {sub.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-300 text-xs font-medium truncate">{sub.name}</p>
                      <Badge variant="outline" className={`text-xs mt-0.5 ${CATEGORY_TYPE_COLORS[sub.type]}`}>
                        {CATEGORY_TYPE_LABELS[sub.type]}
                      </Badge>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-slate-400 hover:text-slate-200"
                        onClick={() => openEdit(sub)}
                      >
                        <Pencil size={11} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-slate-400 hover:text-red-400"
                        onClick={() => requestDelete(sub, false)}
                      >
                        <Trash2 size={11} />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="pl-4 text-slate-600 text-xs italic">Nenhuma subcategoria</p>
          )}
        </div>
      ))}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[#1a1d27] border-[#2d3148] text-slate-200">
          <DialogHeader>
            <DialogTitle>
              {editingId
                ? 'Editar categoria'
                : form.parent_id
                ? 'Nova subcategoria'
                : 'Novo grupo'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {formError && <p className="text-red-400 text-sm">{formError}</p>}

            <div className="space-y-1">
              <Label className="text-slate-400 text-xs">Grupo pai</Label>
              <Select
                value={form.parent_id ?? 'none'}
                onValueChange={(v) => setForm((f) => ({ ...f, parent_id: v === 'none' ? null : v }))}
              >
                <SelectTrigger className="bg-[#0f1117] border-[#2d3148]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1d27] border-[#2d3148]">
                  <SelectItem value="none">Grupo principal (sem pai)</SelectItem>
                  {parentOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.icon} {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
