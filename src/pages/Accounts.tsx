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
