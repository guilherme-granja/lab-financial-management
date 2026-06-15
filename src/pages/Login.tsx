import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { GitBranch } from 'lucide-react'

export default function Login() {
  const { user, loading, signInWithGithub } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const error = searchParams.get('error')

  useEffect(() => {
    if (!loading && user) {
      navigate('/', { replace: true })
    }
  }, [user, loading, navigate])

  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
      <div className="bg-[#1a1d27] border border-[#2d3148] rounded-xl p-10 flex flex-col items-center gap-6 w-full max-w-sm">
        <div className="text-center">
          <div className="text-5xl mb-3">💰</div>
          <h1 className="text-white text-2xl font-bold">Lab Finanças</h1>
          <p className="text-slate-400 text-sm mt-1">Controle financeiro pessoal</p>
        </div>

        {error === 'unauthorized' && (
          <div className="w-full bg-red-950 border border-red-800 text-red-400 text-sm rounded-lg px-4 py-3">
            Acesso não autorizado. Use a conta correta.
          </div>
        )}

        <Button
          onClick={signInWithGithub}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
          disabled={loading}
        >
          <GitBranch size={18} />
          Entrar com GitHub
        </Button>
      </div>
    </div>
  )
}
