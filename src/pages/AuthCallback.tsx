import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export default function AuthCallback() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading) {
      if (user) {
        navigate('/', { replace: true })
      } else {
        navigate('/login?error=unauthorized', { replace: true })
      }
    }
  }, [user, loading, navigate])

  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
      <p className="text-slate-400">Autenticando...</p>
    </div>
  )
}
