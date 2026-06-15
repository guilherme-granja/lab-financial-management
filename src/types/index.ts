export type CategoryType = 'income' | 'expense' | 'both'
export type TransactionType = 'income' | 'expense'
export type PeriodType = 'monthly' | 'yearly'

export interface Category {
  id: string
  name: string
  color: string
  icon: string
  type: CategoryType
  created_at: string
}

export interface Transaction {
  id: string
  amount: number
  type: TransactionType
  category_id: string | null
  description: string | null
  date: string
  created_at: string
  categories?: Category
}

export interface Goal {
  id: string
  category_id: string
  amount: number
  period_type: PeriodType
  period_start: string
  created_at: string
  categories?: Category
}

export interface GoalWithProgress extends Goal {
  actual: number
  progress: number
}
