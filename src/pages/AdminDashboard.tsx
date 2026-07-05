import { useNavigate } from 'react-router-dom'
import { useAdminUsers } from '@/hooks/useAdminUsers'
import { useActivityLog } from '@/hooks/useActivityLog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate } from '@/lib/formatters'

const ACTION_BADGE: Record<string, string> = {
  login: 'bg-indigo-950 text-indigo-400 border-indigo-800',
  transaction_created: 'bg-slate-800 text-slate-300 border-slate-700',
  transaction_updated: 'bg-slate-800 text-slate-300 border-slate-700',
  transaction_deleted: 'bg-slate-800 text-slate-300 border-slate-700',
  user_created: 'bg-green-950 text-green-400 border-green-800',
  user_activated: 'bg-green-950 text-green-400 border-green-800',
  user_deactivated: 'bg-red-950 text-red-400 border-red-800',
  user_migrated: 'bg-green-950 text-green-400 border-green-800',
  admin_viewed_credentials: 'bg-orange-950 text-orange-400 border-orange-800',
}

function ActionBadge({ action }: { action: string }) {
  return (
    <Badge className={ACTION_BADGE[action] ?? 'bg-slate-800 text-slate-300 border-slate-700'}>
      {action}
    </Badge>
  )
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { users, loading: usersLoading, error: usersError } = useAdminUsers()
  const { entries, loading: logLoading, error: logError } = useActivityLog({ page: 1 })

  const totalUsers = users.length
  const activeUsers = users.filter((u) => u.is_active).length
  const adminUsers = users.filter((u) => u.is_admin).length
  const notMigrated = users.filter((u) => u.migrated === false).length

  const recentEntries = entries.slice(0, 10)

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
        <h3 className="text-slate-200 font-semibold text-base">Atividade recente</h3>

        {logLoading && <p className="text-slate-500 text-sm">Carregando...</p>}
        {logError && <p className="text-red-400 text-sm">{logError}</p>}

        {!logLoading && !logError && recentEntries.length === 0 && (
          <p className="text-slate-500 text-sm">Nenhuma atividade registrada.</p>
        )}

        {!logLoading && !logError && recentEntries.length > 0 && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-[#2d3148]">
                  <TableHead className="text-slate-400">Usuário</TableHead>
                  <TableHead className="text-slate-400">Ação</TableHead>
                  <TableHead className="text-slate-400">Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentEntries.map((entry) => (
                  <TableRow key={entry.id} className="border-[#2d3148] hover:bg-[#1a1d27]">
                    <TableCell>
                      <div className="text-slate-200">{entry.user_name ?? '—'}</div>
                      <div className="text-slate-500 text-xs">{entry.user_email ?? '—'}</div>
                    </TableCell>
                    <TableCell>
                      <ActionBadge action={entry.action} />
                    </TableCell>
                    <TableCell className="text-slate-400">{formatDate(entry.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex justify-end pt-2">
              <Button
                variant="ghost"
                className="text-indigo-400 hover:text-indigo-300"
                onClick={() => navigate('/admin/activity')}
              >
                Ver todos →
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
