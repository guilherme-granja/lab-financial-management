import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Pencil, Copy } from 'lucide-react'
import { useTransaction } from '@/hooks/useTransaction'
import type { TransactionType } from '@/types'
import { formatCurrency, formatDateTime } from '@/lib/formatters'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

function typeColor(type: TransactionType) {
  if (type === 'income') return 'bg-green-950 text-green-400 border-green-800'
  if (type === 'expense') return 'bg-red-950 text-red-400 border-red-800'
  return 'bg-blue-950 text-blue-400 border-blue-800'
}

function typeLabel(type: TransactionType) {
  if (type === 'income') return 'Receita'
  if (type === 'expense') return 'Despesa'
  return 'Transferência'
}

function amountColor(type: TransactionType) {
  if (type === 'income') return 'text-green-500'
  if (type === 'expense') return 'text-red-500'
  return 'text-blue-400'
}

function amountPrefix(type: TransactionType) {
  if (type === 'income') return '+'
  if (type === 'expense') return '-'
  return ''
}

function recurrenceLabel(recurrence: string) {
  if (recurrence === 'fixed') return 'Fixo mensal'
  if (recurrence === 'installment') return 'Parcelado'
  return null
}

export default function TransactionDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { transaction, loading, error } = useTransaction(id)

  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        onClick={() => navigate('/transactions')}
        className="text-slate-400 hover:text-slate-200 gap-1.5 -ml-2"
      >
        <ArrowLeft size={16} />
        Voltar
      </Button>

      {loading && (
        <p className="text-slate-500 text-sm">Carregando...</p>
      )}

      {!loading && error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}

      {!loading && !error && !transaction && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-slate-400 text-sm">Transação não encontrada.</p>
        </div>
      )}

      {!loading && !error && transaction && (
        <>
          <div className="bg-[#1a1d27] border border-[#2d3148] rounded-xl p-5 flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={typeColor(transaction.type)}>
                  {typeLabel(transaction.type)}
                </Badge>
                <Badge
                  variant="outline"
                  className={
                    transaction.payment || transaction.paid
                      ? 'bg-green-950 text-green-400 border-green-800'
                      : 'bg-yellow-950 text-yellow-400 border-yellow-800'
                  }
                >
                  {transaction.payment || transaction.paid ? 'Pago' : 'Pendente'}
                </Badge>
              </div>
              <p className={`text-2xl font-bold tabular-nums ${amountColor(transaction.type)}`}>
                {amountPrefix(transaction.type)}{formatCurrency(transaction.amount)}
              </p>
              <p className="text-slate-300 text-sm">
                {transaction.description || (transaction.categories?.name ?? '—')}
              </p>
            </div>
            <Button
              onClick={() => navigate(`/transactions?edit=${transaction.id}`)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shrink-0"
            >
              <Pencil size={14} />
              Editar
            </Button>
          </div>

          <div className="bg-[#1a1d27] border border-[#2d3148] rounded-xl p-5 space-y-3">
            <h2 className="text-slate-200 text-sm font-semibold">Informações Gerais</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Conta de Origem</dt>
                <dd className="text-slate-300">
                  {transaction.accounts ? `${transaction.accounts.icon} ${transaction.accounts.name}` : '—'}
                </dd>
              </div>
              {transaction.type === 'transfer' ? (
                <div className="flex items-center justify-between">
                  <dt className="text-slate-500">Conta de Destino</dt>
                  <dd className="text-slate-300">
                    {transaction.to_accounts ? `${transaction.to_accounts.icon} ${transaction.to_accounts.name}` : '—'}
                  </dd>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <dt className="text-slate-500">Categoria</dt>
                  <dd className="text-slate-300">
                    {transaction.categories ? `${transaction.categories.icon} ${transaction.categories.name}` : '—'}
                  </dd>
                </div>
              )}
              {transaction.recurrence !== 'none' && (
                <div className="flex items-center justify-between">
                  <dt className="text-slate-500">Recorrência</dt>
                  <dd className="text-slate-300">{recurrenceLabel(transaction.recurrence)}</dd>
                </div>
              )}
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Descrição</dt>
                <dd className="text-slate-300">{transaction.description || '—'}</dd>
              </div>
            </dl>
          </div>

          <div className="bg-[#1a1d27] border border-[#2d3148] rounded-xl p-5 space-y-3">
            <h2 className="text-slate-200 text-sm font-semibold">Metadados</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Efetivado em</dt>
                <dd className="text-slate-300">
                  {transaction.paid_at ? formatDateTime(transaction.paid_at) : '—'}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Data da Transação</dt>
                <dd className="text-slate-300">{formatDateTime(transaction.created_at)}</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-slate-500">ID da Transação</dt>
                <dd className="flex items-center gap-1.5">
                  <span className="text-slate-300 font-mono text-xs">{transaction.id}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-slate-400 hover:text-slate-200"
                    onClick={() => navigator.clipboard.writeText(transaction.id)}
                  >
                    <Copy size={12} />
                  </Button>
                </dd>
              </div>
            </dl>
          </div>
        </>
      )}
    </div>
  )
}
