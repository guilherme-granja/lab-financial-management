import { useState } from 'react'
import { useAdminUsers } from '@/hooks/useAdminUsers'
import type { CreateUserPayload } from '@/hooks/useAdminUsers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { UserPlus, ToggleLeft, ToggleRight, Database, Eye, EyeOff, Copy } from 'lucide-react'

const EMPTY_FORM: CreateUserPayload = {
  name: '',
  email: '',
  password: '',
  supabase_url: '',
  supabase_anon_key: '',
  project_ref: '',
  is_admin: false,
}

export default function AdminUsers() {
  const { users, loading, error, createUser, toggleActive, markMigrated } = useAdminUsers()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<CreateUserPayload>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showAnonKey, setShowAnonKey] = useState(false)

  function openCreate() {
    setForm(EMPTY_FORM)
    setFormError(null)
    setShowPassword(false)
    setShowAnonKey(false)
    setDialogOpen(true)
  }

  function handleUrlChange(url: string) {
    const match = url.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)
    setForm((f) => ({ ...f, supabase_url: url, project_ref: match ? match[1] : '' }))
  }

  async function copyAnonKey() {
    if (form.supabase_anon_key) await navigator.clipboard.writeText(form.supabase_anon_key)
  }

  async function handleSave() {
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      setFormError('Nome, e-mail e senha são obrigatórios')
      return
    }
    if (!form.is_admin && (!form.supabase_url.trim() || !form.supabase_anon_key.trim() || !form.project_ref.trim())) {
      setFormError('Dados do banco Supabase são obrigatórios para usuários não administradores')
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      await createUser(form)
      setDialogOpen(false)
      setForm(EMPTY_FORM)
    } catch (e) {
      setFormError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-slate-200 font-semibold text-lg">Usuários</h2>
        <Button onClick={openCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
          <UserPlus size={16} />
          Novo usuário
        </Button>
      </div>

      {loading && <p className="text-slate-500 text-sm">Carregando...</p>}
      {error && <p className="text-red-400 text-sm">{error}</p>}

      {!loading && !error && users.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-slate-400 text-sm">Nenhum usuário encontrado.</p>
        </div>
      )}

      {!loading && !error && users.length > 0 && (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-[#2d3148]">
                <TableHead className="text-slate-400">Nome</TableHead>
                <TableHead className="text-slate-400">E-mail</TableHead>
                <TableHead className="text-slate-400">Admin</TableHead>
                <TableHead className="text-slate-400">Ativo</TableHead>
                <TableHead className="text-slate-400">Migrado</TableHead>
                <TableHead className="text-slate-400">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id} className="border-[#2d3148] hover:bg-[#1a1d27]">
                  <TableCell className="text-slate-200">{u.name}</TableCell>
                  <TableCell className="text-slate-200">{u.email}</TableCell>
                  <TableCell>
                    {u.is_admin ? (
                      <Badge className="bg-indigo-950 text-indigo-400 border-indigo-800">Admin</Badge>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {u.is_active ? (
                      <Badge className="bg-green-950 text-green-400 border-green-800">Ativo</Badge>
                    ) : (
                      <Badge className="bg-red-950 text-red-400 border-red-800">Inativo</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {u.status === 'paused' ? (
                      <Badge className="bg-yellow-950 text-yellow-400 border-yellow-800">Pausado</Badge>
                    ) : (
                      <>
                        {u.migrated === true && (
                          <Badge className="bg-green-950 text-green-400 border-green-800">Migrado</Badge>
                        )}
                        {u.migrated === false && (
                          <Badge className="bg-yellow-950 text-yellow-400 border-yellow-800">Pendente</Badge>
                        )}
                        {u.migrated === null && <span className="text-slate-500">—</span>}
                      </>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title={u.is_active ? 'Desativar' : 'Ativar'}
                        className={`h-7 w-7 ${u.is_active ? 'text-red-400 hover:text-red-300' : 'text-green-400 hover:text-green-300'}`}
                        onClick={() => toggleActive(u.id, !u.is_active)}
                      >
                        {u.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                      </Button>
                      {u.migrated === false && u.db_id && u.status !== 'paused' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Marcar como migrado"
                          className="h-7 w-7 text-indigo-400 hover:text-indigo-300"
                          onClick={() => markMigrated(u.db_id as string)}
                        >
                          <Database size={18} />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen} modal={false}>
        <DialogContent className="sm:max-w-lg bg-[#1a1d27] border-[#2d3148] text-slate-200">
          <DialogHeader>
            <DialogTitle>Novo usuário</DialogTitle>
            <DialogDescription className="sr-only">
              Preencha os dados para criar um novo usuário.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {formError && <p className="text-red-400 text-sm">{formError}</p>}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-slate-400 text-xs">Nome completo</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="bg-[#0f1117] border-[#2d3148]"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-slate-400 text-xs">E-mail</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="bg-[#0f1117] border-[#2d3148]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-slate-400 text-xs">Senha</Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className="bg-[#0f1117] border-[#2d3148] pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Separator className="bg-[#2d3148]" />
              <p className="text-slate-500 text-xs">Banco de dados Supabase</p>
            </div>

            <div className="space-y-1">
              <Label className="text-slate-400 text-xs">Supabase URL</Label>
              <Input
                value={form.supabase_url}
                onChange={(e) => handleUrlChange(e.target.value)}
                className="bg-[#0f1117] border-[#2d3148]"
                placeholder="https://xxxxx.supabase.co"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-slate-400 text-xs">Anon Key</Label>
              <div className="relative">
                <Input
                  type={showAnonKey ? 'text' : 'password'}
                  value={form.supabase_anon_key}
                  onChange={(e) => setForm((f) => ({ ...f, supabase_anon_key: e.target.value }))}
                  className="bg-[#0f1117] border-[#2d3148] pr-16"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAnonKey((v) => !v)}
                    className="text-slate-500 hover:text-slate-300"
                  >
                    {showAnonKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  <button type="button" onClick={copyAnonKey} className="text-slate-500 hover:text-slate-300">
                    <Copy size={16} />
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-slate-400 text-xs">Referência do projeto</Label>
              <div className="relative">
                <Input
                  readOnly
                  value={form.project_ref}
                  placeholder="Preenchido automaticamente"
                  className="bg-[#0f1117] border-[#2d3148] pr-20 text-slate-400"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 text-xs">
                  automático
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="is_admin"
                checked={form.is_admin}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_admin: v }))}
              />
              <Label htmlFor="is_admin" className="text-slate-300 text-sm cursor-pointer">
                Administrador
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="text-slate-400">
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {saving ? 'Salvando...' : 'Criar usuário'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
