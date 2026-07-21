import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ArrowLeft, Copy, Check, RefreshCw, PowerOff, Play } from 'lucide-react'
import { useDatabases } from '@/hooks/useDatabases'
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

const PLACEHOLDER_CARDS = [
  'Compute',
  'Database Size',
  'File Storage',
  'Egress',
  'Monthly Active Users',
  'Last Migration',
  'Last Backup',
]

function StatusBadge({ health }: { health: 'unknown' | 'checking' | 'healthy' | 'unhealthy' }) {
  const label = {
    unknown: 'Nunca verificado',
    checking: 'Verificando...',
    healthy: 'Healthy',
    unhealthy: 'Unhealthy',
  }[health]

  const className = {
    unknown: 'bg-slate-800 text-slate-400 border-slate-700',
    checking: 'bg-amber-950 text-amber-400 border-amber-800',
    healthy: 'bg-green-950 text-green-400 border-green-800',
    unhealthy: 'bg-red-950 text-red-400 border-red-800',
  }[health]

  return <Badge className={className}>{label}</Badge>
}

export default function DatabaseDetail() {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const { databases, ping, deactivate, reactivate } = useDatabases()
  const [copied, setCopied] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const db = databases.find((d) => d.user_id === userId)

  async function copy() {
    if (!db) return
    await navigator.clipboard.writeText(db.project_ref)
    setCopied(true)
    setTimeout(() => setCopied(false), 1000)
  }

  async function handleConfirm() {
    if (!db) return
    setSaving(true)
    setFormError(null)
    try {
      if (db.status === 'active') {
        await deactivate(db.user_id)
      } else {
        await reactivate(db.user_id)
      }
      setConfirmOpen(false)
    } catch (e) {
      setFormError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        onClick={() => navigate('/admin/databases')}
        className="text-slate-400 hover:text-slate-200 gap-1.5 -ml-2"
      >
        <ArrowLeft size={16} />
        Voltar pra Databases
      </Button>

      {!db && (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <p className="text-slate-400 text-sm">Usuário não encontrado.</p>
          <Button variant="ghost" onClick={() => navigate('/admin/databases')} className="text-indigo-400 hover:text-indigo-300">
            Voltar pra Databases
          </Button>
        </div>
      )}

      {db && (
        <>
          <div className="bg-[#1a1d27] border border-[#2d3148] rounded-xl p-5 flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-2">
              <h2 className="text-slate-200 font-semibold text-lg">{db.full_name}</h2>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-300 font-mono text-xs">{db.project_ref}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-slate-200" onClick={copy}>
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                </Button>
              </div>
              {db.last_checked_at && (
                <p className="text-slate-500 text-xs">
                  Última verificação: há {formatDistanceToNow(new Date(db.last_checked_at), { locale: ptBR })}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => ping(db.user_id)}
                disabled={db.health === 'checking'}
                className="gap-2 border-[#2d3148] text-slate-300"
              >
                <RefreshCw size={16} className={db.health === 'checking' ? 'animate-spin' : ''} />
                Atualizar
              </Button>
              {db.status === 'active' ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setFormError(null)
                    setConfirmOpen(true)
                  }}
                  className="gap-2 border-[#2d3148] text-slate-400 hover:text-red-400"
                >
                  <PowerOff size={16} />
                  Desativar
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => {
                    setFormError(null)
                    setConfirmOpen(true)
                  }}
                  className="gap-2 border-[#2d3148] text-slate-400 hover:text-green-400"
                >
                  <Play size={16} />
                  Reativar
                </Button>
              )}
            </div>
          </div>

          <div className="bg-[#1a1d27] border border-[#2d3148] rounded-xl p-5 space-y-2">
            <h3 className="text-slate-200 text-sm font-semibold">Status</h3>
            <StatusBadge health={db.health} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {PLACEHOLDER_CARDS.map((title) => (
              <div key={title} className="bg-[#1a1d27] border border-[#2d3148] rounded-xl p-5 space-y-2">
                <h3 className="text-slate-400 text-xs font-medium">{title}</h3>
                <div className="h-6 w-24 rounded bg-slate-800 animate-pulse" />
              </div>
            ))}
          </div>
        </>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="bg-[#1a1d27] border-[#2d3148] text-slate-200">
          <DialogHeader>
            <DialogTitle>{db?.status === 'active' ? 'Desativar banco de dados' : 'Reativar banco de dados'}</DialogTitle>
            <DialogDescription className="sr-only">
              Confirme a {db?.status === 'active' ? 'desativação' : 'reativação'} do banco de dados.
            </DialogDescription>
          </DialogHeader>

          {formError && <p className="text-red-400 text-sm">{formError}</p>}

          <p className="text-slate-400 text-sm">
            {db?.status === 'active'
              ? `O acesso ao Lab Finanças ficará indisponível para ${db?.full_name} até que o banco seja reativado.`
              : `O acesso ao Lab Finanças será restabelecido para ${db?.full_name}.`}
          </p>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)} className="text-slate-400">
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={saving}
              className={
                db?.status === 'active'
                  ? 'bg-red-700 hover:bg-red-800 text-white'
                  : 'bg-green-700 hover:bg-green-800 text-white'
              }
            >
              {saving ? 'Salvando...' : db?.status === 'active' ? 'Desativar' : 'Reativar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
