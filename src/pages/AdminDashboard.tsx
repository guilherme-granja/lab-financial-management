import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useAdminUsers } from '@/hooks/useAdminUsers'
import { useDatabases } from '@/hooks/useDatabases'
import type { UserDatabase } from '@/hooks/useDatabases'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const HEALTH_BORDER: Record<UserDatabase['health'], string> = {
  unknown: 'border-l-4 border-l-[#2d3148]',
  checking: 'border-l-[5px] border-l-[#fbbf24] shadow-[-6px_0_18px_-6px_#fbbf24]',
  healthy: 'border-l-[5px] border-l-[#22c55e] shadow-[-6px_0_18px_-6px_#22c55e]',
  unhealthy: 'border-l-[5px] border-l-[#ef4444] shadow-[-6px_0_18px_-6px_#ef4444]',
}

const HEALTH_TEXT: Record<UserDatabase['health'], string> = {
  unknown: 'text-slate-500',
  checking: 'text-[#fbbf24]',
  healthy: 'text-[#22c55e]',
  unhealthy: 'text-[#ef4444]',
}

const HEALTH_LABEL: Record<UserDatabase['health'], string> = {
  unknown: 'Nunca verificado',
  checking: 'Verificando...',
  healthy: 'Saudável',
  unhealthy: 'Indisponível',
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { users, loading: usersLoading, error: usersError } = useAdminUsers()
  const { databases, pingAll } = useDatabases()

  const totalUsers = users.length
  const activeUsers = users.filter((u) => u.is_active).length
  const adminUsers = users.filter((u) => u.is_admin).length
  const notMigrated = users.filter((u) => u.migrated === false).length

  useEffect(() => {
    pingAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-[#1a1d27] border-[#2d3148]">
          <CardHeader className="pb-2">
            <CardTitle className="text-slate-400 text-sm font-medium">Total de Usuários</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-100 text-2xl font-semibold">{usersLoading ? '—' : totalUsers}</p>
          </CardContent>
        </Card>
        <Card className="bg-[#1a1d27] border-[#2d3148]">
          <CardHeader className="pb-2">
            <CardTitle className="text-slate-400 text-sm font-medium">Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-100 text-2xl font-semibold">{usersLoading ? '—' : activeUsers}</p>
          </CardContent>
        </Card>
        <Card className="bg-[#1a1d27] border-[#2d3148]">
          <CardHeader className="pb-2">
            <CardTitle className="text-slate-400 text-sm font-medium">Admins</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-100 text-2xl font-semibold">{usersLoading ? '—' : adminUsers}</p>
          </CardContent>
        </Card>
        <Card className="bg-[#1a1d27] border-[#2d3148]">
          <CardHeader className="pb-2">
            <CardTitle className="text-slate-400 text-sm font-medium">Não migrados</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-100 text-2xl font-semibold">{usersLoading ? '—' : notMigrated}</p>
          </CardContent>
        </Card>
      </div>

      {usersError && <p className="text-red-400 text-sm">{usersError}</p>}

      <div className="space-y-2">
        <h3 className="text-slate-200 font-semibold text-base">Databases</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {databases.map((db) => (
            <button
              key={db.user_id}
              onClick={() => navigate(`/admin/databases/${db.user_id}`)}
              className={`text-left bg-[#1a1d27] border border-[#2d3148] ${HEALTH_BORDER[db.health]} rounded-xl p-4 hover:bg-[#20232f] transition-colors`}
            >
              <p className="text-slate-200 text-sm font-medium">{db.full_name}</p>
              <p className="text-slate-500 font-mono text-xs">{db.project_ref}</p>
              <p className="text-slate-500 text-xs mt-2">
                <span className={HEALTH_TEXT[db.health]}>{HEALTH_LABEL[db.health]}</span>
                {db.last_checked_at && db.stale && ' · desatualizado'}
                {db.last_checked_at &&
                  ` · há ${formatDistanceToNow(new Date(db.last_checked_at), { locale: ptBR })}`}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
