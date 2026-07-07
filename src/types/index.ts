export type CategoryType = 'income' | 'expense' | 'both'
export type TransactionType = 'income' | 'expense' | 'transfer'
export type PeriodType = 'monthly' | 'yearly'
export type AccountType = 'checking' | 'savings' | 'cash' | 'credit' | 'investment' | 'other'
export type RecurrenceType = 'none' | 'installment' | 'fixed'

export interface Category {
  id: string
  name: string
  color: string
  icon: string
  type: CategoryType
  parent_id: string | null
  created_at: string
  subcategories?: Category[]
  budget_bucket?: BudgetBucket | null
}

export interface Account {
  id: string
  name: string
  type: AccountType
  color: string
  icon: string
  include_in_dashboard: boolean
  initial_balance: number
  created_at: string
}

export interface Tag {
  id: string
  name: string
  created_at: string
}

export interface RecurrenceGroup {
  id: string
  recurrence_type: RecurrenceType
  total_installments: number
  description_template: string | null
  starts_at: string
  created_at: string
}

export interface TransactionPayment {
  id: string
  transaction_id: string
  paid_at: string
  paid_amount: number
  notes: string | null
  created_at: string
}

export interface Transaction {
  id: string
  amount: number
  type: TransactionType
  category_id: string | null
  account_id: string | null
  to_account_id: string | null
  description: string | null
  date: string
  created_at: string
  recurrence: RecurrenceType
  installments: number | null
  installment_index: number | null
  recurrence_group_id: string | null
  recurrence_group?: RecurrenceGroup
  paid: boolean
  paid_at: string | null
  paid_amount: number | null
  payment?: TransactionPayment
  categories?: Category
  accounts?: Account
  to_accounts?: Account
  tag_id: string | null
  tags?: Tag
  type_id: string | null
  transaction_tags?: TransactionTag[]
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

export interface TransactionTypeRow {
  id: string
  slug: string
  label: string
  icon: string
  affects_balance: boolean
  created_at: string
}

export interface TransactionTag {
  transaction_id: string
  tag_id: string
  created_at: string
  tags?: Tag
}

export type BudgetBucket = 'needs' | 'leisure'
export type BudgetPreset = '50_30_20' | '60_30_10' | '70_20_10' | 'custom'

export interface MonthlyBudget {
  id: string
  month: string          // 'YYYY-MM'
  preset: BudgetPreset | null
  needs_pct: number
  leisure_pct: number
  savings_pct: number
  created_at: string
}
