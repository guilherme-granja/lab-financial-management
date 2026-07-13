import { useEffect, useState } from 'react'
import { useProfile } from '@/hooks/useProfile'
import { validatePassword } from '@/lib/password-rules'
import { PasswordRulesHint } from '@/components/auth/password-rules-hint'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { User, KeyRound } from 'lucide-react'

export default function Profile() {
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

  const passwordFormValid =
    currentPassword.length > 0 &&
    newPassword.length > 0 &&
    confirmPassword.length > 0 &&
    newPassword === confirmPassword &&
    validatePassword(newPassword).length === 0

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
    <div className="max-w-4xl space-y-6">
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
              <Input
                value={nameDraft}
                onChange={(e) => {
                  setNameDraft(e.target.value)
                  setNameSuccess(false)
                }}
                className="bg-[#0f1117] border-[#2d3148] text-slate-200"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs">E-mail</Label>
              <Input
                readOnly
                value={email}
                className="bg-slate-900/50 border-[#2d3148] text-slate-400 cursor-not-allowed"
              />
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
              <h2 className="text-slate-200 font-semibold text-base">Alterar Senha</h2>
              <p className="text-slate-500 text-sm">Informe a senha atual para definir uma nova senha.</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs">Senha Atual</Label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value)
                  setPasswordSuccess(false)
                }}
                className="bg-[#0f1117] border-[#2d3148] text-slate-200"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs">Nova Senha</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value)
                  setPasswordSuccess(false)
                }}
                className="bg-[#0f1117] border-[#2d3148] text-slate-200"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs">Confirmar Senha</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value)
                  setPasswordSuccess(false)
                }}
                className="bg-[#0f1117] border-[#2d3148] text-slate-200"
              />
            </div>
          </div>

          <PasswordRulesHint password={newPassword} />

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
  )
}
