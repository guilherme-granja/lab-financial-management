import { useState, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShoppingBag, ShieldCheck } from 'lucide-react'

export default function Login() {
  const { user, loading: authLoading, signInWithEmail, verifyEmailOtp } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const urlError = searchParams.get('error')

  const [step, setStep] = useState<'credentials' | 'otp'>('credentials')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(8).fill(''))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const digitRefs = useRef<(HTMLInputElement | null)[]>(Array(8).fill(null))

  useEffect(() => {
    if (!authLoading && user) {
      navigate('/', { replace: true })
    }
  }, [user, authLoading, navigate])

  useEffect(() => {
    if (step === 'otp') {
      digitRefs.current[0]?.focus()
    }
  }, [step])

  const handleSignIn = async () => {
    setLoading(true)
    setError(null)
    try {
      await signInWithEmail(email, password)
      setStep('otp')
    } catch (err) {
      const msg = (err as Error).message
      if (msg === 'Invalid login credentials') {
        setError('Email ou senha incorretos')
      } else if (msg === 'Email not confirmed') {
        setError('Email não confirmado. Verifique sua caixa de entrada.')
      } else {
        console.error('[Login] signInWithEmail error:', msg)
        setError('Ocorreu um erro inesperado. Tente novamente.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async () => {
    setLoading(true)
    setError(null)
    try {
      await verifyEmailOtp(email, otpDigits.join(''))
    } catch (err) {
      const msg = (err as Error).message
      if (msg === 'Token has expired or is invalid') {
        setError('Código inválido ou expirado. Tente fazer login novamente.')
        setStep('credentials')
        setOtpDigits(Array(8).fill(''))
      } else {
        console.error('[Login] verifyEmailOtp error:', msg)
        setError('Ocorreu um erro inesperado. Tente novamente.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleOtpChange = (i: number, value: string) => {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, 8 - i).split('')
      const next = [...otpDigits]
      digits.forEach((d, offset) => { next[i + offset] = d })
      setOtpDigits(next)
      const lastFilled = Math.min(i + digits.length, 7)
      digitRefs.current[lastFilled]?.focus()
      return
    }
    if (!/^[0-9]?$/.test(value)) return
    const next = [...otpDigits]
    next[i] = value
    setOtpDigits(next)
    if (value !== '') {
      digitRefs.current[i + 1]?.focus()
    }
  }

  const handleOtpKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && otpDigits[i] === '') {
      digitRefs.current[i - 1]?.focus()
    }
    if (e.key === 'Enter' && otpDigits.join('').length === 8) {
      handleVerify()
    }
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

      {urlError === 'unauthorized' && (
        <div className="w-full max-w-lg mx-auto mb-4 bg-red-950 border border-red-800 text-red-400 text-sm rounded-xl px-4 py-3">
          Acesso não autorizado. Use a conta correta.
        </div>
      )}

      {step === 'credentials' && (
        <>
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

            {error && (
              <div className="mt-4 bg-red-950 border border-red-800 text-red-400 text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            {/* GitHub login — desabilitado temporariamente
            <Button onClick={signInWithGithub} ...>Entrar com GitHub</Button>
            */}
          </div>

          <p className="mt-8 text-slate-600 text-xs tracking-widest uppercase">
            Segurança Bancária End-to-End
          </p>
        </>
      )}

      {step === 'otp' && (
        <>
          <div className="w-full max-w-lg mx-auto">
            <h1 className="text-white text-3xl font-bold text-center mb-2">Verifique seu e-mail</h1>
            <p className="text-slate-400 text-sm text-center mb-10">
              Enviamos um código de 8 dígitos para seu e-mail
            </p>

            <div className="flex gap-2 justify-center mb-6">
              {otpDigits.map((digit, i) => (
                <input
                  key={`otp-digit-${i}`}
                  ref={(el) => { digitRefs.current[i] = el }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  className="w-11 h-14 text-center text-white text-xl font-bold
                             bg-[#1e2136] border border-[#2d3148] rounded-xl
                             focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500
                             caret-transparent"
                />
              ))}
            </div>

            <Button
              onClick={handleVerify}
              disabled={loading || otpDigits.join('').length < 8}
              className="w-full h-12 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-medium text-base"
            >
              {loading ? 'Verificando...' : 'Confirmar'}
            </Button>

            {error && (
              <div className="mt-4 bg-red-950 border border-red-800 text-red-400 text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={() => { setStep('credentials'); setError(null); setOtpDigits(Array(8).fill('')) }}
              className="mt-6 w-full text-slate-500 hover:text-slate-300 text-sm text-center"
            >
              Voltar ao login
            </button>

            <div className="mt-6 flex justify-center">
              <div className="w-16 h-16 rounded-full bg-[#1e2136] flex items-center justify-center">
                <Lock size={24} className="text-indigo-400" />
              </div>
            </div>
          </div>

          <p className="mt-8 text-slate-600 text-xs flex items-center gap-1.5 justify-center">
            <ShieldCheck size={13} />
            Ambiente Seguro &amp; Criptografado
          </p>
        </>
      )}
    </div>
  )
}
