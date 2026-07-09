import { useState } from 'react'
import { useAdminUsers } from '@/hooks/useAdminUsers'
import { useActivityLog } from '@/hooks/useActivityLog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatDateTime } from '@/lib/formatters'

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

const ACTION_OPTIONS: { value: string; label: string }[] = [
  { value: 'login', label: 'Login' },
  { value: 'transaction_created', label: 'Transação criada' },
  { value: 'transaction_updated', label: 'Transação atualizada' },
  { value: 'transaction_deleted', label: 'Transação deletada' },
  { value: 'user_created', label: 'Usuário criado' },
  { value: 'user_activated', label: 'Usuário ativado' },
  { value: 'user_deactivated', label: 'Usuário desativado' },
  { value: 'user_migrated', label: 'Usuário migrado' },
  { value: 'admin_viewed_credentials', label: 'Credenciais visualizadas' },
]

function ActionBadge({ action }: { action: string }) {
  return (
    <Badge className={ACTION_BADGE[action] ?? 'bg-slate-800 text-slate-300 border-slate-700'}>
      {action}
    </Badge>
  )
}

function parseUserAgent(ua: string): string {
  if (ua.includes('Edg/')) return 'Edge'
  if (ua.includes('OPR/') || ua.includes('Opera')) return 'Opera'
  if (ua.includes('Chrome/') && !ua.includes('Chromium')) return 'Chrome'
  if (ua.includes('Firefox/')) return 'Firefox'
  if (ua.includes('Safari/') && !ua.includes('Chrome')) return 'Safari'
  if (ua.includes('Chromium/')) return 'Chromium'
  return 'Navegador desconhecido'
}

function renderDetails(action: string, metadata: Record<string, unknown> | null): string {
  if (!metadata) return '—'
  switch (action) {
    case 'login': {
      const parts: string[] = []
      if (metadata.ip) parts.push(`IP: ${metadata.ip as string}`)
      if (metadata.city || metadata.country) {
        const geo = [metadata.city, metadata.country].filter(Boolean).join(', ')
        parts.push(geo)
      }
      if (metadata.user_agent) {
        const ua = metadata.user_agent as string
        const browser = parseUserAgent(ua)
        parts.push(browser)
      }
      return parts.length > 0 ? parts.join(' · ') : '—'
    }
    case 'transaction_created':
    case 'transaction_updated':
    case 'transaction_deleted': {
      const amount = metadata.amount as number | undefined
      const type = metadata.type as string | undefined
      if (amount != null && type) {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount) + ' · ' + type
      }
      return '—'
    }
    case 'user_created': {
      const email = metadata.email as string | undefined
      return email ?? '—'
    }
    default:
      return '—'
  }
}

export default function AdminActivity() {
  const { users } = useAdminUsers()
  const [userId, setUserId] = useState<string>('all')
  const [action, setAction] = useState<string>('all')
  const [page, setPage] = useState(1)

  const { entries, totalPages, loading, error } = useActivityLog({
    userId: userId === 'all' ? undefined : userId,
    action: action === 'all' ? undefined : action,
    page,
  })

  function handleUserChange(value: string) {
    setUserId(value)
    setPage(1)
  }

  function handleActionChange(value: string) {
    setAction(value)
    setPage(1)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={userId} onValueChange={handleUserChange}>
          <SelectTrigger className="w-[220px] bg-[#1a1d27] border-[#2d3148] text-slate-200">
            <SelectValue placeholder="Usuário" />
          </SelectTrigger>
          <SelectContent className="bg-[#1a1d27] border-[#2d3148] text-slate-200">
            <SelectItem value="all">Todos os usuários</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={action} onValueChange={handleActionChange}>
          <SelectTrigger className="w-[220px] bg-[#1a1d27] border-[#2d3148] text-slate-200">
            <SelectValue placeholder="Ação" />
          </SelectTrigger>
          <SelectContent className="bg-[#1a1d27] border-[#2d3148] text-slate-200">
            <SelectItem value="all">Todas as ações</SelectItem>
            {ACTION_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading && <p className="text-slate-500 text-sm">Carregando...</p>}
      {error && <p className="text-red-400 text-sm">{error}</p>}

      {!loading && !error && entries.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-slate-400 text-sm">Nenhuma atividade encontrada.</p>
        </div>
      )}

      {!loading && !error && entries.length > 0 && (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-[#2d3148]">
                <TableHead className="text-slate-400">Usuário</TableHead>
                <TableHead className="text-slate-400">Ação</TableHead>
                <TableHead className="text-slate-400">Detalhes</TableHead>
                <TableHead className="text-slate-400">Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id} className="border-[#2d3148] hover:bg-[#1a1d27]">
                  <TableCell>
                    <div className="text-slate-200">{entry.user_name ?? '—'}</div>
                    <div className="text-slate-500 text-xs">{entry.user_email ?? '—'}</div>
                  </TableCell>
                  <TableCell>
                    <ActionBadge action={entry.action} />
                  </TableCell>
                  <TableCell className="text-slate-300">
                    {renderDetails(entry.action, entry.metadata)}
                  </TableCell>
                  <TableCell>
                    <div className="text-slate-200">{formatDateTime(entry.created_at)}</div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="text-slate-400"
          >
            <ChevronLeft size={16} />
          </Button>
          <span className="text-slate-400 text-sm">Página {page} de {totalPages}</span>
          <Button
            variant="ghost"
            size="icon"
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
            className="text-slate-400"
          >
            <ChevronRight size={16} />
          </Button>
        </div>
      )}
    </div>
  )
}
