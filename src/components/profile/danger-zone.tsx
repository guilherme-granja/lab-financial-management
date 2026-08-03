import { useState } from 'react'
import { useAccountReset } from '@/hooks/useAccountReset'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AlertTriangle, Check, Loader2, CheckCircle2 } from 'lucide-react'
import type { AccountResetStep } from '@/hooks/useAccountReset'

const PROGRESS_STEPS: { step: AccountResetStep; label: string }[] = [
  { step: 'transactions', label: 'Excluindo transações' },
  { step: 'budgets', label: 'Excluindo orçamentos' },
  { step: 'accounts', label: 'Excluindo contas' },
  { step: 'verifying', label: 'Verificando exclusão' },
]

export function DangerZone() {
  const { step, resetting, summary, remaining, error, resetAccount } = useAccountReset()
  const [open, setOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')

  function closeDialog() {
    if (resetting) return
    setOpen(false)
    setConfirmText('')
  }

  const currentStepIndex = PROGRESS_STEPS.findIndex((s) => s.step === step)

  return (
    <>
      <Card className="bg-[#1a1d27] border-red-900/40">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} className="text-red-400" />
            <div>
              <h2 className="text-slate-200 font-semibold text-base">Zona de risco</h2>
              <p className="text-slate-500 text-sm">
                Apaga permanentemente seus dados financeiros (transações, orçamentos, contas). Categorias e tags não são afetadas.
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            className="border-red-900 text-red-400 hover:bg-red-950/40"
            onClick={() => setOpen(true)}
          >
            Resetar meus dados financeiros
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : closeDialog())}>
        <DialogContent
          className="bg-[#1a1d27] border-[#2d3148] text-slate-200"
          onEscapeKeyDown={(e) => {
            if (resetting) e.preventDefault()
          }}
          onInteractOutside={(e) => {
            if (resetting) e.preventDefault()
          }}
        >
          <DialogHeader>
            <DialogTitle>Resetar meus dados financeiros</DialogTitle>
            <DialogDescription className="sr-only">
              Confirme a exclusão permanente dos seus dados financeiros.
            </DialogDescription>
          </DialogHeader>

          {step === 'idle' && (
            <div className="space-y-4">
              <div className="bg-red-950/40 border border-red-900 text-red-400 text-sm rounded-lg p-3">
                Esta ação é executada diretamente no seu banco de dados e não pode ser desfeita.
              </div>

              <div className="space-y-1">
                <p className="text-slate-300 text-sm font-medium">Será excluído:</p>
                <ul className="text-slate-400 text-sm list-disc list-inside space-y-0.5">
                  <li>Transações (receitas, despesas e transferências — passadas, atuais e futuras)</li>
                  <li>Orçamentos cadastrados</li>
                  <li>Contas cadastradas</li>
                </ul>
              </div>

              <div className="space-y-1">
                <p className="text-slate-300 text-sm font-medium">Não será alterado:</p>
                <ul className="text-slate-400 text-sm list-disc list-inside space-y-0.5">
                  <li>Categorias</li>
                  <li>Tags</li>
                  <li>Login e perfil</li>
                </ul>
              </div>

              <div className="space-y-1">
                <Label className="text-slate-400 text-xs">Para confirmar, digite "deletar" abaixo:</Label>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="bg-[#0f1117] border-[#2d3148]"
                  placeholder="deletar"
                />
              </div>

              <DialogFooter>
                <Button variant="ghost" onClick={closeDialog} className="text-slate-400">
                  Cancelar
                </Button>
                <Button
                  onClick={() => resetAccount()}
                  disabled={confirmText !== 'deletar'}
                  className="bg-red-700 hover:bg-red-800 text-white disabled:opacity-40"
                >
                  Resetar meus dados
                </Button>
              </DialogFooter>
            </div>
          )}

          {(step === 'transactions' || step === 'budgets' || step === 'accounts' || step === 'verifying') && (
            <div className="space-y-3 py-2">
              {PROGRESS_STEPS.map((s, i) => {
                const isDone = i < currentStepIndex
                const isCurrent = i === currentStepIndex
                return (
                  <div key={s.step} className="flex items-center gap-3">
                    {isDone ? (
                      <Check size={16} className="text-green-500 shrink-0" />
                    ) : isCurrent ? (
                      <Loader2 size={16} className="text-indigo-400 animate-spin shrink-0" />
                    ) : (
                      <span className="h-4 w-4 rounded-full border border-[#2d3148] shrink-0" />
                    )}
                    <span className={isCurrent ? 'text-slate-200 text-sm' : 'text-slate-500 text-sm'}>
                      {s.label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {step === 'done' && summary && (
            <div className="space-y-4">
              <div className="flex flex-col items-center text-center gap-2 py-2">
                <CheckCircle2 size={40} className="text-green-500" />
                <p className="text-slate-200 font-semibold">Dados resetados com sucesso</p>
                <p className="text-slate-500 text-sm">A verificação confirmou zero registros restantes.</p>
              </div>

              <div className="bg-[#0f1117] border border-[#2d3148] rounded-lg p-4 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Transações excluídas</span>
                  <span className="text-slate-200">{summary.transactionsDeleted}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Orçamentos excluídos</span>
                  <span className="text-slate-200">{summary.budgetsDeleted}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Contas excluídas</span>
                  <span className="text-slate-200">{summary.accountsDeleted}</span>
                </div>
              </div>

              <DialogFooter>
                <Button
                  onClick={() => {
                    setOpen(false)
                    setConfirmText('')
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Concluído
                </Button>
              </DialogFooter>
            </div>
          )}

          {step === 'partial' && remaining && (
            <div className="space-y-4">
              <div className="flex flex-col items-center text-center gap-2 py-2">
                <AlertTriangle size={40} className="text-amber-500" />
                <p className="text-slate-200 font-semibold">Alguns dados não foram excluídos</p>
                <p className="text-slate-500 text-sm">
                  A verificação encontrou registros restantes. Pode acontecer por instabilidade de rede.
                </p>
              </div>

              <div className="bg-[#0f1117] border border-[#2d3148] rounded-lg p-4 space-y-1 text-sm">
                {remaining.transactions > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Transações restantes</span>
                    <span className="text-slate-200">{remaining.transactions}</span>
                  </div>
                )}
                {remaining.budgets > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Orçamentos restantes</span>
                    <span className="text-slate-200">{remaining.budgets}</span>
                  </div>
                )}
                {remaining.accounts > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Contas restantes</span>
                    <span className="text-slate-200">{remaining.accounts}</span>
                  </div>
                )}
              </div>

              {error && <p className="text-red-400 text-xs">{error}</p>}

              <DialogFooter>
                <Button variant="ghost" onClick={closeDialog} className="text-slate-400">
                  Fechar
                </Button>
                <Button
                  onClick={() => resetAccount()}
                  className="bg-amber-800 hover:bg-amber-900 text-amber-100"
                >
                  Tentar novamente
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
