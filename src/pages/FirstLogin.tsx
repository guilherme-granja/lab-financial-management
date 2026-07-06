import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { choreClient } from '@/lib/chore-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Lock, LockKeyhole, Eye, EyeOff, ArrowRight, CheckCircle2 } from 'lucide-react'

const REQUIREMENTS = [
  { key: 'lower', label: 'Letras minúsculas', regex: /[a-z]/ },
  { key: 'upper', label: 'Letras maiúsculas', regex: /[A-Z]/ },
  { key: 'number', label: 'Números', regex: /[0-9]/ },
  { key: 'special', label: 'Caracteres especiais', regex: /[^A-Za-z0-9]/ },
] as const

export default function FirstLogin() {
  const { clearFirstLogin, signOut } = useAuth()
  const navigate = useNavigate()

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const metRequirements = REQUIREMENTS.reduce<Record<string, boolean>>((acc, req) => {
    acc[req.key] = req.regex.test(newPassword)
    return acc
  }, {})

  const handleSubmit = async () => {
    setFormError(null)

    if (newPassword.length < 8) {
      setFormError('A senha deve ter no mínimo 8 caracteres.')
      return
    }
    if (!Object.values(metRequirements).every(Boolean)) {
      setFormError('A senha não atende a todos os requisitos.')
      return
    }
    if (newPassword !== confirmPassword) {
      setFormError('As senhas não coincidem.')
      return
    }

    setSaving(true)
    const { error } = await choreClient.auth.updateUser({ password: newPassword })
    if (error) {
      setFormError('Não foi possível atualizar a senha. Tente novamente.')
      setSaving(false)
      return
    }

    await clearFirstLogin()
    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#0b0f1a]">
      <main className="w-full max-w-[440px]">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <LockKeyhole size={28} className="text-[#c0c1ff]" />
            <span className="text-white text-2xl font-bold tracking-tight">Lab Finanças</span>
          </div>
        </div>

        <section className="bg-[#131b2e] border border-white/10 rounded-xl p-8 shadow-2xl backdrop-blur-md">
          <header className="mb-6">
            <h1 className="text-xl font-semibold text-white mb-1">Primeiro Acesso</h1>
            <p className="text-sm text-slate-400">
              Por segurança, você deve alterar sua senha no seu primeiro login.
            </p>
          </header>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-slate-400 text-xs font-semibold tracking-widest uppercase">
                Nova senha
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <Input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10 pr-10 bg-[#0b1220] border-white/10 text-slate-200 placeholder:text-slate-600 rounded-lg h-12"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-400 text-xs font-semibold tracking-widest uppercase">
                Confirmar senha
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  placeholder="••••••••"
                  className="pl-10 pr-10 bg-[#0b1220] border-white/10 text-slate-200 placeholder:text-slate-600 rounded-lg h-12"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={saving}
              className="w-full h-12 rounded-lg font-bold gap-2 text-white hover:opacity-90 bg-[#615FFF]"
            >
              {saving ? 'Atualizando...' : <><span>Atualizar Senha</span><ArrowRight size={18} /></>}
            </Button>

            {formError && (
              <div className="bg-red-950 border border-red-800 text-red-400 text-sm rounded-lg px-4 py-3">
                {formError}
              </div>
            )}
          </div>
        </section>

        <section className="mt-6 px-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-4">
            {REQUIREMENTS.map((req) => (
              <div
                key={req.key}
                className={`flex items-center gap-2 text-xs transition-colors ${
                  metRequirements[req.key] ? 'text-[#4edea3]' : 'text-slate-500'
                }`}
              >
                <CheckCircle2 size={16} />
                <span>{req.label}</span>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={signOut}
            className="text-slate-500 hover:text-slate-300 text-sm"
          >
            Sair
          </button>
        </div>

        <footer className="mt-8 text-center">
          <p className="text-xs text-slate-600 tracking-widest uppercase opacity-60">
            Segurança Bancária End-to-End
          </p>
        </footer>
      </main>
    </div>
  )
}
