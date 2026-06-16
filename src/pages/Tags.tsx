import { useState } from 'react'
import { useTags } from '@/hooks/useTags'
import type { Tag } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Trash2 } from 'lucide-react'

export default function Tags() {
  const { tags, loading, error, createTag, deleteTag } = useTags()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [tagToDelete, setTagToDelete] = useState<Tag | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  function openCreate() {
    setName('')
    setFormError(null)
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!name.trim()) {
      setFormError('Informe o nome da tag')
      return
    }

    setSaving(true)
    setFormError(null)

    try {
      await createTag(name.trim())
      setDialogOpen(false)
    } catch (e) {
      setFormError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!tagToDelete) return
    setDeleting(true)
    setDeleteError(null)

    try {
      await deleteTag(tagToDelete.id)
      setTagToDelete(null)
    } catch (e) {
      setDeleteError((e as Error).message)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <div className="text-slate-400 text-sm">Carregando...</div>

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={openCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white">
          Nova tag
        </Button>
      </div>

      {error && (
        <p className="text-red-400 text-sm bg-red-950/40 border border-red-800 rounded-lg px-4 py-2">
          {error}
        </p>
      )}

      <Card className="bg-[#1a1d27] border-[#2d3148] rounded-xl">
        <CardContent className="p-0">
          {tags.length === 0 ? (
            <div className="text-center text-slate-500 py-12">Nenhuma tag cadastrada</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2d3148]">
                  <th className="text-left text-slate-400 font-medium px-4 py-3">Nome</th>
                  <th className="text-right text-slate-400 font-medium px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {tags.map((tag) => (
                  <tr key={tag.id} className="border-b border-[#2d3148] last:border-0">
                    <td className="px-4 py-3 text-slate-200">{tag.name}</td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-slate-400 hover:text-red-400"
                        onClick={() => setTagToDelete(tag)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[#1a1d27] border-[#2d3148] text-slate-200">
          <DialogHeader>
            <DialogTitle>Nova tag</DialogTitle>
            <DialogDescription className="sr-only">
              Preencha o nome para criar uma nova tag.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {formError && <p className="text-red-400 text-sm">{formError}</p>}

            <div className="space-y-1">
              <Label className="text-slate-400 text-xs">Nome</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-[#0f1117] border-[#2d3148]"
                placeholder="Ex: urgente"
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
      <Dialog open={!!tagToDelete} onOpenChange={() => setTagToDelete(null)}>
        <DialogContent className="bg-[#1a1d27] border-[#2d3148] text-slate-200">
          <DialogHeader>
            <DialogTitle>Excluir tag</DialogTitle>
            <DialogDescription className="sr-only">
              Confirme a exclusão permanente desta tag.
            </DialogDescription>
          </DialogHeader>
          <p className="text-slate-400 text-sm">Essa ação não pode ser desfeita.</p>
          {deleteError && <p className="text-red-400 text-sm">{deleteError}</p>}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTagToDelete(null)} disabled={deleting} className="text-slate-400">
              Cancelar
            </Button>
            <Button onClick={handleDelete} disabled={deleting} className="bg-red-700 hover:bg-red-800 text-white">
              {deleting ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
