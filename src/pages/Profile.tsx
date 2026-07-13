import { useEffect, useState } from 'react'
import { useProfile } from '@/hooks/useProfile'
import { useAuth } from '@/hooks/useAuth'
import { validatePassword } from '@/lib/password-rules'
import { getInitials } from '@/lib/formatters'
import { PasswordRulesHint } from '@/components/auth/password-rules-hint'
import { PasswordStrengthBar } from '@/components/auth/password-strength-bar'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { User, Mail, Lock, KeyRound } from 'lucide-react'

export default function Profile() {
  const { isAdmin } = useAuth()
  const {
    name,
    email,
    loading,
    error,
    savingName,
    nameError,
    updateName,
    changingPassword,
    passwordError,
    changePassword,
  } = useProfile()

  const [nameDraft, setNameDraft] = useState('')
  const [nameSuccess, setNameSuccess] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  useEffect(() => {
    setNameDraft(name)
  }, [name])

  const handleSaveName = async () => {
    setNameSuccess(false)
    await updateName(nameDraft)
    setNameSuccess(true)
  }

  const passwordsMatch = newPassword.length > 0 && confirmPassword.length > 0 && newPassword === confirmPassword
  const passwordFormValid =
    currentPassword.length > 0 && passwordsMatch && validatePassword(newPassword).length === 0

  const handleChangePassword = async () => {
    setPasswordSuccess(false)
    await changePassword(currentPassword, newPassword)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setPasswordSuccess(true)
  }

  if (loading) {
    return <p className="text-slate-400">Carregando...</p>
  }

  if (error) {
    return <p className="text-red-400">{error}</p>
  }

  return (
    <div className="max-w-5xl grid md:grid-cols-[220px_1fr] gap-6">
      {/* Cartão de resumo */}
      <Card className="bg-[#1a1d27] border-[#2d3148] h-fit">
        <CardContent className="p-6 flex flex-col items-center text-center gap-3">
          <div className="w-20 h-20 rounded-full bg-indigo-600 flex items-center justify-center text-white text-2xl font-semibold">
            {getInitials(name || email)}
          </div>
          <div className="space-y-1 min-w-0 w-full">
            <p className="text-slate-200 font-semibold truncate">{name || 'Sem nome cadastrado'}</p>
            <p className="text-slate-500 text-xs truncate">{email}</p>
          </div>
          <Badge
            variant="outline"
            className={
              isAdmin
                ? 'bg-indigo-950 text-indigo-400 border-indigo-800'
                : 'bg-slate-800/60 text-slate-400 border-[#2d3148]'
            }
          >
            {isAdmin ? 'Administrador' : 'Conta pessoal'}
          </Badge>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card className="bg-[#1a1d27] border-[#2d3148]">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <User size={20} className="text-indigo-400" />
              <div>
                <h2 className="text-slate-200 font-semibold text-base">Informações Pessoais</h2>
                <p className="text-slate-500 text-sm">Seu nome e e-mail de acesso.</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <Label className="text-slate-400 text-xs">Nome</Label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <Input
                    value={nameDraft}
                    onChange={(e) => {
                      setNameDraft(e.target.value)
                      setNameSuccess(false)
                    }}
                    className="pl-10 bg-[#0f1117] border-[#2d3148] text-slate-200"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-slate-400 text-xs">E-mail</Label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <Input
                    readOnly
                    value={email}
                    className="pl-10 bg-slate-900/50 border-[#2d3148] text-slate-400 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {nameError && <p className="text-red-400 text-sm">{nameError}</p>}
            {nameSuccess && !nameError && (
              <p className="text-emerald-400 text-sm">Nome atualizado com sucesso.</p>
            )}

            <div className="flex justify-end">
              <Button onClick={handleSaveName} disabled={savingName || nameDraft.trim().length === 0}>
                {savingName ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1d27] border-[#2d3148]">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <KeyRound size={20} className="text-indigo-400" />
              <div>
                <h2 className="text-slate-200 font-semibold text-base">Segurança</h2>
                <p className="text-slate-500 text-sm">Informe a senha atual para definir uma nova senha.</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs">Senha Atual</Label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value)
                    setPasswordSuccess(false)
                  }}
                  className="pl-10 bg-[#0f1117] border-[#2d3148] text-slate-200"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <Label className="text-slate-400 text-xs">Nova Senha</Label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value)
                      setPasswordSuccess(false)
                    }}
                    className="pl-10 bg-[#0f1117] border-[#2d3148] text-slate-200"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-slate-400 text-xs">Confirmar Senha</Label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value)
                      setPasswordSuccess(false)
                    }}
                    className="pl-10 bg-[#0f1117] border-[#2d3148] text-slate-200"
                  />
                </div>
              </div>
            </div>

            <PasswordStrengthBar password={newPassword} />
            <PasswordRulesHint password={newPassword} />

            {confirmPassword.length > 0 && (
              <p className={`text-xs ${passwordsMatch ? 'text-emerald-400' : 'text-amber-400'}`}>
                {passwordsMatch ? 'As senhas coincidem' : 'As senhas não coincidem'}
              </p>
            )}

            {passwordError && <p className="text-red-400 text-sm">{passwordError}</p>}
            {passwordSuccess && !passwordError && (
              <p className="text-emerald-400 text-sm">Senha alterada com sucesso.</p>
            )}

            <div className="flex justify-end">
              <Button onClick={handleChangePassword} disabled={changingPassword || !passwordFormValid}>
                {changingPassword ? 'Alterando...' : 'Alterar Senha'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
