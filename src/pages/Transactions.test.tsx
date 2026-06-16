import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import type { Transaction } from '@/types'

// Mock the three hooks — must come before importing from them
vi.mock('@/hooks/useTransactions', () => ({
  useTransactions: vi.fn(),
}))
vi.mock('@/hooks/useCategories', () => ({
  useCategories: vi.fn(() => ({
    categories: [],
    loading: false,
    error: null,
    refresh: vi.fn(),
    createCategory: vi.fn(),
    updateCategory: vi.fn(),
    deleteCategory: vi.fn(),
  })),
}))
vi.mock('@/hooks/useAccounts', () => ({
  useAccounts: vi.fn(() => ({
    accounts: [],
    loading: false,
    error: null,
    refresh: vi.fn(),
    createAccount: vi.fn(),
    updateAccount: vi.fn(),
    deleteAccount: vi.fn(),
    getAccountBalance: vi.fn(),
    getAccountTransactionCount: vi.fn(),
  })),
}))

import { useTransactions } from '@/hooks/useTransactions'
import Transactions from './Transactions'

const baseTx: Transaction = {
  id: '1',
  description: 'Aluguel',
  amount: 1500,
  type: 'expense',
  date: '2026-06-01',
  paid: true,
  category_id: null,
  account_id: null,
  to_account_id: null,
  created_at: '',
  recurrence: 'none',
  installments: null,
  installment_index: null,
  recurrence_group_id: null,
  paid_at: null,
  paid_amount: null,
  categories: undefined,
  accounts: undefined,
  to_accounts: undefined,
}

let baseHookReturn: {
  total: number
  totalPages: number
  page: number
  setPage: ReturnType<typeof vi.fn>
  error: null
  refresh: ReturnType<typeof vi.fn>
  createTransaction: ReturnType<typeof vi.fn>
  updateTransaction: ReturnType<typeof vi.fn>
  updateTransactionPayment: ReturnType<typeof vi.fn>
  deleteTransaction: ReturnType<typeof vi.fn>
}

beforeEach(() => {
  vi.clearAllMocks()
  baseHookReturn = {
    total: 0,
    totalPages: 1,
    page: 1,
    setPage: vi.fn(),
    error: null,
    refresh: vi.fn(),
    createTransaction: vi.fn(),
    updateTransaction: vi.fn(),
    updateTransactionPayment: vi.fn(),
    deleteTransaction: vi.fn(),
  }
})

describe('Transactions', () => {
  it('exibe "Carregando..." enquanto loading=true', () => {
    vi.mocked(useTransactions).mockReturnValue({
      ...baseHookReturn,
      loading: true,
      transactions: [],
    })
    render(<Transactions />)
    expect(screen.getByText('Carregando...')).toBeInTheDocument()
  })

  it('exibe "Nenhuma transação encontrada" quando lista vazia', () => {
    vi.mocked(useTransactions).mockReturnValue({
      ...baseHookReturn,
      loading: false,
      transactions: [],
    })
    render(<Transactions />)
    expect(screen.getByText('Nenhuma transação encontrada')).toBeInTheDocument()
  })

  it('exibe transações na tabela', () => {
    vi.mocked(useTransactions).mockReturnValue({
      ...baseHookReturn,
      loading: false,
      transactions: [baseTx],
      total: 1,
    })
    render(<Transactions />)
    expect(screen.getByText('Aluguel')).toBeInTheDocument()
  })

  it('abre dialog ao clicar em "Nova transação"', async () => {
    vi.mocked(useTransactions).mockReturnValue({
      ...baseHookReturn,
      loading: false,
      transactions: [],
    })
    render(<Transactions />)
    await userEvent.click(screen.getByText('Nova transação'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('exibe badge "Pendente" para transação não paga', () => {
    vi.mocked(useTransactions).mockReturnValue({
      ...baseHookReturn,
      loading: false,
      transactions: [{ ...baseTx, paid: false }],
      total: 1,
    })
    render(<Transactions />)
    expect(screen.getByText('Pendente')).toBeInTheDocument()
  })

  it('exibe botão de pagamento apenas para transações não pagas', () => {
    vi.mocked(useTransactions).mockReturnValue({
      ...baseHookReturn,
      loading: false,
      transactions: [
        { ...baseTx, id: '1', paid: false },
        { ...baseTx, id: '2', paid: true },
      ],
      total: 2,
    })
    render(<Transactions />)
    const payButtons = screen.getAllByTitle('Pagar')
    expect(payButtons).toHaveLength(1)
  })
})
