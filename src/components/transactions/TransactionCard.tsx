import { Transaction, TransactionType } from '@/types'
import { formatDate, formatCurrency } from '@/lib/formatters'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CreditCard, Pencil, Trash2 } from 'lucide-react'

interface TransactionCardProps {
  tx: Transaction
  toAccountName?: string
  typeColor: (type: TransactionType) => string
  typeLabel: (type: TransactionType) => string
  amountColor: (type: TransactionType) => string
  amountPrefix: (type: TransactionType) => string
  recurrenceBadge: (tx: Transaction) => string | null
  onOpenDetail: (tx: Transaction) => void
  onPay: (tx: Transaction) => void
  onEdit: (tx: Transaction) => void
  onDelete: (tx: Transaction) => void
}

export function TransactionCard({
  tx,
  toAccountName,
  typeColor,
  typeLabel,
  amountColor,
  amountPrefix,
  recurrenceBadge,
  onOpenDetail,
  onPay,
  onEdit,
  onDelete,
}: TransactionCardProps) {
  const paid = tx.payment || tx.paid
  const badge = recurrenceBadge(tx)

  return (
    <div
      className="flex items-center gap-3 bg-[#1a1d27] border border-[#2d3148] rounded-xl p-3 cursor-pointer"
      onClick={() => onOpenDetail(tx)}
    >
      <div className="w-9 h-9 rounded-lg bg-[#242838] flex items-center justify-center text-base flex-shrink-0">
        {tx.type === 'transfer' ? '🔁' : tx.categories?.icon ?? '📦'}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-white text-sm font-semibold truncate">
            {tx.type === 'transfer'
              ? `Transferência${toAccountName ? ' → ' + toAccountName : ''}`
              : tx.categories?.name ?? tx.description ?? '—'}
          </span>
          <Badge variant="outline" className={`${typeColor(tx.type)} text-[10px] px-1.5 py-0 shrink-0`}>
            {typeLabel(tx.type)}
          </Badge>
          {badge && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-slate-600 text-slate-400 shrink-0">
              {badge}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-slate-500 text-xs mt-0.5">
          <span>{formatDate(tx.date)}</span>
          {tx.accounts && (
            <span className="truncate">· {tx.accounts.icon} {tx.accounts.name}</span>
          )}
        </div>
      </div>

      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          {paid ? (
            <Badge variant="outline" className="bg-green-950 text-green-400 border-green-800 text-[10px] px-1.5 py-0">Pago</Badge>
          ) : (
            <Badge variant="outline" className="bg-yellow-950 text-yellow-400 border-yellow-800 text-[10px] px-1.5 py-0">Pendente</Badge>
          )}
          <span className={`text-sm font-semibold ${amountColor(tx.type)}`}>
            {amountPrefix(tx.type)}{formatCurrency(tx.amount)}
          </span>
        </div>
        <div className="flex gap-0.5" onClick={(e) => e.stopPropagation()}>
          {!paid && (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-yellow-400 hover:text-yellow-300" onClick={() => onPay(tx)}>
              <CreditCard size={14} />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-200" onClick={() => onEdit(tx)}>
            <Pencil size={14} />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-400" onClick={() => onDelete(tx)}>
            <Trash2 size={14} />
          </Button>
        </div>
      </div>
    </div>
  )
}
