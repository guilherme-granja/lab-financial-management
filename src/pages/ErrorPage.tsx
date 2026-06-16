import { useRouteError, useNavigate } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function ErrorPage() {
  const error = useRouteError() as { message?: string; statusText?: string }
  const navigate = useNavigate()
  const message = error?.message || error?.statusText || 'Erro desconhecido'

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0f1117] gap-6 px-4">
      <AlertTriangle className="text-red-400" size={48} />
      <div className="text-center space-y-2">
        <h1 className="text-slate-100 text-2xl font-semibold">Algo deu errado</h1>
        <p className="text-slate-400">Ocorreu um erro inesperado na aplicação.</p>
      </div>
      <pre className="text-xs text-slate-500 bg-[#1a1d27] rounded p-3 max-h-32 overflow-y-auto w-full max-w-md">
        {message}
      </pre>
      <div className="flex gap-3">
        <Button variant="ghost" className="text-slate-400" onClick={() => navigate(-1)}>
          Voltar
        </Button>
        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => navigate('/')}>
          Ir para o Dashboard
        </Button>
      </div>
    </div>
  )
}
