import { useState } from 'react'
import type { MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useDatabases } from '@/hooks/useDatabases'
import type { UserDatabase } from '@/hooks/useDatabases'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { RefreshCw, Copy, Check, PowerOff, Play } from 'lucide-react'

function HealthBadge({
  health,
  lastCheckedAt,
  stale,
}: {
  health: UserDatabase['health']
  lastCheckedAt: string | null
  stale: boolean
}) {
  const label = {
    unknown: 'Nunca verificado',
    checking: 'Verificando...',
    healthy: 'Saudável',
    unhealthy: 'Indisponível',
  }[health]

  const className = {
    unknown: 'bg-slate-800 text-slate-400 border-slate-700',
    checking: 'bg-amber-950 text-amber-400 border-amber-800',
    healthy: 'bg-green-950 text-green-400 border-green-800',
    unhealthy: 'bg-red-950 text-red-400 border-red-800',
  }[health]

  return (
    <div className="space-y-0.5">
      <Badge className={className}>{label}</Badge>
      {lastCheckedAt && stale && (
        <p className="text-slate-500 text-xs">
          desatualizado · última verificação há {formatDistanceToNow(new Date(lastCheckedAt), { locale: ptBR })}
        </p>
      )}
      {lastCheckedAt && !stale && (
        <p className="text-slate-500 text-xs">
          há {formatDistanceToNow(new Date(lastCheckedAt), { locale: ptBR })}
        </p>
      )}
    </div>
  )
}

function ProjectRefCell({ projectRef }: { projectRef: string }) {
  const [copied, setCopied] = useState(false)

  async function copy(e: MouseEvent) {
    e.stopPropagation()
    await navigator.clipboard.writeText(projectRef)
    setCopied(true)
    setTimeout(() => setCopied(false), 1000)
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-slate-300 font-mono text-xs">{projectRef}</span>
      <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-slate-200" onClick={copy}>
        {copied ? <Check size={13} /> : <Copy size={13} />}
      </Button>
    </div>
  )
}

export default function Databases() {
  const navigate = useNavigate()
  const { databases, loading, error, ping, pingAll, deactivate, reactivate } = useDatabases()
  const [confirmTarget, setConfirmTarget] = useState<UserDatabase | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const anyChecking = databases.some((d) => d.health === 'checking')

  function openConfirm(db: UserDatabase) {
    setFormError(null)
    setConfirmTarget(db)
  }

  async function handleConfirm() {
    if (!confirmTarget) return
    setSaving(true)
    setFormError(null)
    try {
      if (confirmTarget.status === 'active') {
        await deactivate(confirmTarget.user_id)
      } else {
        await reactivate(confirmTarget.user_id)
      }
      setConfirmTarget(null)
    } catch (e) {
      setFormError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-slate-200 font-semibold text-lg">Databases</h2>
          <p className="text-slate-500 text-xs mt-1">
            Um ping mantém o banco ativo e evita a pausa automática do plano Free por inatividade.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => pingAll()}
          disabled={anyChecking}
          className="gap-2 border-[#2d3148] text-slate-300"
        >
          <RefreshCw size={16} className={anyChecking ? 'animate-spin' : ''} />
          Ping todos
        </Button>
      </div>

      {loading && <p className="text-slate-500 text-sm">Carregando...</p>}
      {error && <p className="text-red-400 text-sm">{error}</p>}

      {!loading && !error && databases.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-slate-400 text-sm">Nenhum banco de dados encontrado.</p>
        </div>
      )}

      {!loading && !error && databases.length > 0 && (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-[#2d3148]">
                <TableHead className="text-slate-400">Usuário</TableHead>
                <TableHead className="text-slate-400">Referência do Projeto</TableHead>
                <TableHead className="text-slate-400">Ativo</TableHead>
                <TableHead className="text-slate-400">Health Check</TableHead>
                <TableHead className="text-slate-400 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {databases.map((db) => (
                <TableRow
                  key={db.user_id}
                  onClick={() => navigate(`/admin/databases/${db.user_id}`)}
                  className="border-[#2d3148] hover:bg-[#1a1d27] cursor-pointer"
                >
                  <TableCell className="text-slate-200">{db.full_name}</TableCell>
                  <TableCell>
                    <ProjectRefCell projectRef={db.project_ref} />
                  </TableCell>
                  <TableCell>
                    {db.status === 'active' ? (
                      <Badge className="bg-green-950 text-green-400 border-green-800">Ativo</Badge>
                    ) : (
                      <Badge className="bg-amber-950 text-amber-400 border-amber-800">Pausado</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <HealthBadge health={db.health} lastCheckedAt={db.last_checked_at} stale={db.stale} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Ping"
                        disabled={db.health === 'checking'}
                        className="h-7 w-7 text-slate-400 hover:text-slate-200"
                        onClick={(e) => {
                          e.stopPropagation()
                          ping(db.user_id)
                        }}
                      >
                        <RefreshCw size={13} className={db.health === 'checking' ? 'animate-spin' : ''} />
                      </Button>
                      {db.status === 'active' ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Desativar"
                          className="h-7 w-7 text-slate-400 hover:text-red-400"
                          onClick={(e) => {
                            e.stopPropagation()
                            openConfirm(db)
                          }}
                        >
                          <PowerOff size={13} />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Reativar"
                          className="h-7 w-7 text-slate-400 hover:text-green-400"
                          onClick={(e) => {
                            e.stopPropagation()
                            openConfirm(db)
                          }}
                        >
                          <Play size={13} />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!confirmTarget} onOpenChange={(open) => !open && setConfirmTarget(null)}>
        <DialogContent className="bg-[#1a1d27] border-[#2d3148] text-slate-200">
          <DialogHeader>
            <DialogTitle>{confirmTarget?.status === 'active' ? 'Desativar banco de dados' : 'Reativar banco de dados'}</DialogTitle>
            <DialogDescription className="sr-only">
              Confirme a {confirmTarget?.status === 'active' ? 'desativação' : 'reativação'} do banco de dados.
            </DialogDescription>
          </DialogHeader>

          {formError && <p className="text-red-400 text-sm">{formError}</p>}

          <p className="text-slate-400 text-sm">
            {confirmTarget?.status === 'active'
              ? `O acesso ao Lab Finanças ficará indisponível para ${confirmTarget?.full_name} até que o banco seja reativado.`
              : `O acesso ao Lab Finanças será restabelecido para ${confirmTarget?.full_name}.`}
          </p>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmTarget(null)} className="text-slate-400">
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={saving}
              className={
                confirmTarget?.status === 'active'
                  ? 'bg-red-700 hover:bg-red-800 text-white'
                  : 'bg-green-700 hover:bg-green-800 text-white'
              }
            >
              {saving ? 'Salvando...' : confirmTarget?.status === 'active' ? 'Desativar' : 'Reativar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
