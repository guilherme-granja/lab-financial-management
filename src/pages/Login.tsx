import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShoppingBag } from 'lucide-react'

export default function Login() {
  const { user, loading: authLoading, authError, signInWithPassword } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && user) {
      navigate('/', { replace: true })
    }
  }, [user, authLoading, navigate])

  const handleSignIn = async () => {
    setLoading(true)
    setError(null)
    const msg = await signInWithPassword(email, password)
    if (msg === 'Invalid login credentials') {
      setError('Email ou senha incorretos')
    } else if (msg === 'Email not confirmed') {
      setError('Email não confirmado. Verifique sua caixa de entrada.')
    } else if (msg) {
      if (import.meta.env.DEV) console.error('[Login] signInWithPassword error:', msg)
      setError('Ocorreu um erro inesperado. Tente novamente.')
    }
    setLoading(false)
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center bg-[#0d0f1a]"
      style={{ background: 'radial-gradient(ellipse at 50% 40%, #12152b 0%, #0d0f1a 70%)' }}
    >
      <div className="flex items-center gap-2 mt-20 mb-12">
        <ShoppingBag size={28} className="text-yellow-400" />
        <span className="text-white text-xl font-semibold">Lab Finanças</span>
      </div>

      <div className="bg-[#161824] rounded-2xl p-10 w-full max-w-lg">
        <h1 className="text-white text-3xl font-bold text-center mb-1">Bem-vindo de volta</h1>
        <p className="text-slate-400 text-sm text-center mb-8">Acesse sua inteligência financeira</p>

        <div className="space-y-1.5 mb-4">
          <label className="text-slate-400 text-xs font-semibold tracking-widest uppercase">Email</label>
          <div className="relative">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSignIn()}
              placeholder="seu@email.com"
              className="pl-10 bg-[#1e2136] border-[#2d3148] text-slate-200 placeholder:text-slate-600 rounded-xl h-12"
            />
          </div>
        </div>

        <div className="space-y-1.5 mb-6">
          <label className="text-slate-400 text-xs font-semibold tracking-widest uppercase">Senha</label>
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <Input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSignIn()}
              placeholder="••••••••"
              className="pl-10 pr-10 bg-[#1e2136] border-[#2d3148] text-slate-200 placeholder:text-slate-600 rounded-xl h-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <Button
          onClick={handleSignIn}
          disabled={loading}
          className="w-full h-12 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-medium text-base gap-2"
        >
          {loading ? 'Entrando...' : <><span>Entrar</span><ArrowRight size={18} /></>}
        </Button>

        {(error || authError) && (
          <div className="mt-4 bg-red-950 border border-red-800 text-red-400 text-sm rounded-xl px-4 py-3">
            {error || authError}
          </div>
        )}
      </div>

      <p className="mt-8 text-slate-600 text-xs tracking-widest uppercase">
        Segurança Bancária End-to-End
      </p>
    </div>
  )
}
