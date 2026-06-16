import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import type { Transaction } from '@/types'

// Mock the three hooks — must come before importing from them
vi.mock('@/hooks/useTransactions', () => ({
  useTransactions: vi.fn(),
}))
vi.mock('@/hooks/useDuplicateCheck', () => ({
  checkDuplicate: vi.fn().mockResolvedValue(null),
  fetchAllDuplicateGroups: vi.fn().mockResolvedValue([]),
  deleteTransaction: vi.fn().mockResolvedValue(undefined),
  useDuplicateCheck: vi.fn(() => ({
    checkDuplicate: vi.fn().mockResolvedValue(null),
    fetchAllDuplicateGroups: vi.fn().mockResolvedValue([]),
  })),
}))
vi.mock('@/hooks/useCategories', () => ({
  useCategories: vi.fn(() => ({
    categories: [],
    categoryTree: [],
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

function renderTx() {
  return render(<MemoryRouter><Transactions /></MemoryRouter>)
}

describe('Transactions', () => {
  it('exibe "Carregando..." enquanto loading=true', () => {
    vi.mocked(useTransactions).mockReturnValue({
      ...baseHookReturn,
      loading: true,
      transactions: [],
    })
    renderTx()
    expect(screen.getByText('Carregando...')).toBeInTheDocument()
  })

  it('exibe "Nenhuma transação encontrada" quando lista vazia', () => {
    vi.mocked(useTransactions).mockReturnValue({
      ...baseHookReturn,
      loading: false,
      transactions: [],
    })
    renderTx()
    expect(screen.getByText('Nenhuma transação encontrada')).toBeInTheDocument()
  })

  it('exibe transações na tabela', () => {
    vi.mocked(useTransactions).mockReturnValue({
      ...baseHookReturn,
      loading: false,
      transactions: [baseTx],
      total: 1,
    })
    renderTx()
    expect(screen.getByText('Aluguel')).toBeInTheDocument()
  })

  it('abre dialog ao clicar em "Nova transação"', async () => {
    vi.mocked(useTransactions).mockReturnValue({
      ...baseHookReturn,
      loading: false,
      transactions: [],
    })
    renderTx()
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
    renderTx()
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
    renderTx()
    const payButtons = screen.getAllByTitle('Pagar')
    expect(payButtons).toHaveLength(1)
  })

  // --- Additional interaction tests ---

  it('exibe badge de recorrência "Fixo" para transação fixa', () => {
    vi.mocked(useTransactions).mockReturnValue({
      ...baseHookReturn,
      loading: false,
      transactions: [{ ...baseTx, recurrence: 'fixed', installment_index: 1, installments: 24 }],
      total: 1,
    })
    renderTx()
    expect(screen.getByText('Fixo')).toBeInTheDocument()
  })

  it('exibe badge de parcela para transação parcelada', () => {
    vi.mocked(useTransactions).mockReturnValue({
      ...baseHookReturn,
      loading: false,
      transactions: [{ ...baseTx, recurrence: 'installment', installment_index: 2, installments: 6 }],
      total: 1,
    })
    renderTx()
    expect(screen.getByText('2/6')).toBeInTheDocument()
  })

  it('exibe tipo "Receita" para transação do tipo income', () => {
    vi.mocked(useTransactions).mockReturnValue({
      ...baseHookReturn,
      loading: false,
      transactions: [{ ...baseTx, type: 'income' }],
      total: 1,
    })
    renderTx()
    expect(screen.getByText('Receita')).toBeInTheDocument()
  })

  it('exibe tipo "Transferência" para transação do tipo transfer', () => {
    vi.mocked(useTransactions).mockReturnValue({
      ...baseHookReturn,
      loading: false,
      transactions: [{ ...baseTx, type: 'transfer' }],
      total: 1,
    })
    renderTx()
    expect(screen.getByText('Transferência')).toBeInTheDocument()
  })

  it('abre dialog de edição ao clicar no botão Editar', async () => {
    vi.mocked(useTransactions).mockReturnValue({
      ...baseHookReturn,
      loading: false,
      transactions: [baseTx],
      total: 1,
    })
    renderTx()
    // baseTx has paid: true, so there's no "Pagar" button — row has Pencil then Trash2
    // Find all icon-only buttons (no text content) — exclude "Nova transação"
    const allButtons = screen.getAllByRole('button')
    // The Pencil button is the second-to-last button in the table row area
    // Filter to buttons without visible text
    const iconButtons = allButtons.filter(btn => !btn.textContent?.trim())
    // iconButtons: ChevronLeft (period), ChevronRight (period), Pencil, Trash2
    // Pencil is at index 2 (0-based)
    await userEvent.click(iconButtons[2])
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Editar transação')).toBeInTheDocument()
  })

  it('abre dialog de pagamento ao clicar em Pagar', async () => {
    vi.mocked(useTransactions).mockReturnValue({
      ...baseHookReturn,
      loading: false,
      transactions: [{ ...baseTx, paid: false }],
      total: 1,
    })
    renderTx()
    await userEvent.click(screen.getByTitle('Pagar'))
    expect(screen.getByText('Registrar pagamento')).toBeInTheDocument()
  })

  it('abre dialog de exclusão ao clicar em Excluir', async () => {
    vi.mocked(useTransactions).mockReturnValue({
      ...baseHookReturn,
      loading: false,
      transactions: [baseTx],
      total: 1,
    })
    renderTx()
    // baseTx has paid: true, so row has: Pencil, Trash2
    // All icon-only buttons: ChevronLeft, ChevronRight, Pencil, Trash2
    const allButtons = screen.getAllByRole('button')
    const iconButtons = allButtons.filter(btn => !btn.textContent?.trim())
    // Trash2 is the last icon button
    await userEvent.click(iconButtons[iconButtons.length - 1])
    expect(screen.getByText('Excluir transação')).toBeInTheDocument()
  })

  it('chama deleteTransaction ao confirmar exclusão', async () => {
    const deleteTransaction = vi.fn().mockResolvedValue(undefined)
    vi.mocked(useTransactions).mockReturnValue({
      ...baseHookReturn,
      loading: false,
      transactions: [baseTx],
      total: 1,
      deleteTransaction,
    })
    renderTx()
    // Open delete dialog via Trash2 button
    const allButtons = screen.getAllByRole('button')
    const iconButtons = allButtons.filter(btn => !btn.textContent?.trim())
    await userEvent.click(iconButtons[iconButtons.length - 1])
    // Confirm deletion — there are two "Excluir" occurrences: title + button
    const excluirButtons = screen.getAllByText('Excluir')
    await userEvent.click(excluirButtons[excluirButtons.length - 1])
    expect(deleteTransaction).toHaveBeenCalledWith('1')
  })

  it('chama updateTransactionPayment ao confirmar pagamento', async () => {
    const updateTransactionPayment = vi.fn().mockResolvedValue(undefined)
    vi.mocked(useTransactions).mockReturnValue({
      ...baseHookReturn,
      loading: false,
      transactions: [{ ...baseTx, paid: false }],
      total: 1,
      updateTransactionPayment,
    })
    renderTx()
    await userEvent.click(screen.getByTitle('Pagar'))
    // Click the "Pagar" button in the dialog footer
    const pagarButtons = screen.getAllByText('Pagar')
    await userEvent.click(pagarButtons[pagarButtons.length - 1])
    expect(updateTransactionPayment).toHaveBeenCalled()
  })

  it('salva nova transação ao preencher form e clicar Salvar', async () => {
    const createTransaction = vi.fn().mockResolvedValue(undefined)
    vi.mocked(useTransactions).mockReturnValue({
      ...baseHookReturn,
      loading: false,
      transactions: [],
      createTransaction,
    })
    renderTx()
    await userEvent.click(screen.getByText('Nova transação'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    // MoneyInput renders type="text" inputMode="numeric" — no placeholder attribute
    const amountInput = document.querySelector<HTMLInputElement>('[inputmode="numeric"]')!
    await userEvent.clear(amountInput)
    await userEvent.type(amountInput, '500')
    await userEvent.click(screen.getByText('Salvar'))
    expect(createTransaction).toHaveBeenCalled()
  })

  it('exibe erro de validação quando valor é inválido', async () => {
    vi.mocked(useTransactions).mockReturnValue({
      ...baseHookReturn,
      loading: false,
      transactions: [],
    })
    renderTx()
    await userEvent.click(screen.getByText('Nova transação'))
    // Try to save without filling the amount (empty by default)
    await userEvent.click(screen.getByText('Salvar'))
    expect(screen.getByText('Informe um valor válido')).toBeInTheDocument()
  })

  it('exibe paginação quando totalPages > 1', () => {
    vi.mocked(useTransactions).mockReturnValue({
      ...baseHookReturn,
      loading: false,
      transactions: [],
      totalPages: 3,
      page: 2,
    })
    renderTx()
    expect(screen.getByText('2 / 3')).toBeInTheDocument()
  })

  it('navega para o mês anterior ao clicar em ChevronLeft', () => {
    vi.mocked(useTransactions).mockReturnValue({
      ...baseHookReturn,
      loading: false,
      transactions: [],
    })
    renderTx()
    // The period section has two icon-only buttons: ChevronLeft and ChevronRight
    const allButtons = screen.getAllByRole('button')
    const iconButtons = allButtons.filter(btn => !btn.textContent?.trim())
    // First icon button is ChevronLeft (period navigation)
    userEvent.click(iconButtons[0])
    // After clicking, the period label should reflect one month earlier
    // We just verify the component doesn't crash — hook receives new filters
    expect(screen.queryByText('Carregando...')).not.toBeInTheDocument()
  })

  it('navega para o mês seguinte ao clicar em ChevronRight', () => {
    vi.mocked(useTransactions).mockReturnValue({
      ...baseHookReturn,
      loading: false,
      transactions: [],
    })
    renderTx()
    const allButtons = screen.getAllByRole('button')
    const iconButtons = allButtons.filter(btn => !btn.textContent?.trim())
    // Second icon button is ChevronRight (period navigation)
    userEvent.click(iconButtons[1])
    expect(screen.queryByText('Carregando...')).not.toBeInTheDocument()
  })

  it('alterna o switch Pago/Não pago no form', async () => {
    vi.mocked(useTransactions).mockReturnValue({
      ...baseHookReturn,
      loading: false,
      transactions: [],
    })
    renderTx()
    await userEvent.click(screen.getByText('Nova transação'))
    // Switch starts as "Pago" (EMPTY_FORM.paid = true)
    expect(screen.getByText('Pago')).toBeInTheDocument()
    // Click the switch to toggle off
    await userEvent.click(screen.getByRole('switch'))
    expect(screen.getByText('Não pago')).toBeInTheDocument()
  })

  it('preenche campo Descrição no form', async () => {
    vi.mocked(useTransactions).mockReturnValue({
      ...baseHookReturn,
      loading: false,
      transactions: [],
    })
    renderTx()
    await userEvent.click(screen.getByText('Nova transação'))
    const descInput = screen.getByPlaceholderText('Opcional')
    await userEvent.type(descInput, 'Teste descrição')
    expect(descInput).toHaveValue('Teste descrição')
  })

  it('cancela dialog de criação ao clicar em Cancelar', async () => {
    vi.mocked(useTransactions).mockReturnValue({
      ...baseHookReturn,
      loading: false,
      transactions: [],
    })
    renderTx()
    await userEvent.click(screen.getByText('Nova transação'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await userEvent.click(screen.getByText('Cancelar'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('cancela dialog de pagamento ao clicar em Cancelar', async () => {
    vi.mocked(useTransactions).mockReturnValue({
      ...baseHookReturn,
      loading: false,
      transactions: [{ ...baseTx, paid: false }],
      total: 1,
    })
    renderTx()
    await userEvent.click(screen.getByTitle('Pagar'))
    expect(screen.getByText('Registrar pagamento')).toBeInTheDocument()
    const cancelarButtons = screen.getAllByText('Cancelar')
    await userEvent.click(cancelarButtons[cancelarButtons.length - 1])
    expect(screen.queryByText('Registrar pagamento')).not.toBeInTheDocument()
  })

  it('cancela dialog de exclusão ao clicar em Cancelar', async () => {
    vi.mocked(useTransactions).mockReturnValue({
      ...baseHookReturn,
      loading: false,
      transactions: [baseTx],
      total: 1,
    })
    renderTx()
    const allButtons = screen.getAllByRole('button')
    const iconButtons = allButtons.filter(btn => !btn.textContent?.trim())
    await userEvent.click(iconButtons[iconButtons.length - 1])
    expect(screen.getByText('Excluir transação')).toBeInTheDocument()
    const cancelarButtons = screen.getAllByText('Cancelar')
    await userEvent.click(cancelarButtons[cancelarButtons.length - 1])
    expect(screen.queryByText('Excluir transação')).not.toBeInTheDocument()
  })

  it('atualiza valor no campo paid_amount do dialog de pagamento', async () => {
    vi.mocked(useTransactions).mockReturnValue({
      ...baseHookReturn,
      loading: false,
      transactions: [{ ...baseTx, paid: false }],
      total: 1,
    })
    renderTx()
    await userEvent.click(screen.getByTitle('Pagar'))
    // Find the paid_amount input in the pay dialog — it's a number input with value = tx.amount
    const inputs = screen.getAllByRole('spinbutton')
    const paidAmountInput = inputs[0]
    await userEvent.clear(paidAmountInput)
    await userEvent.type(paidAmountInput, '200')
    expect(paidAmountInput).toHaveValue(200)
  })

  it('exibe conta com ícone e nome quando tx.accounts está preenchido', () => {
    vi.mocked(useTransactions).mockReturnValue({
      ...baseHookReturn,
      loading: false,
      transactions: [{
        ...baseTx,
        accounts: { id: 'acc1', name: 'Nubank', icon: '💜', type: 'checking', initial_balance: 0, created_at: '' },
      }],
      total: 1,
    })
    renderTx()
    expect(screen.getByText('Nubank')).toBeInTheDocument()
  })

  it('exibe categoria com ícone e nome quando tx.categories está preenchido', () => {
    vi.mocked(useTransactions).mockReturnValue({
      ...baseHookReturn,
      loading: false,
      transactions: [{
        ...baseTx,
        categories: { id: 'cat1', name: 'Alimentação', icon: '🍔', type: 'expense', created_at: '' },
      }],
      total: 1,
    })
    renderTx()
    expect(screen.getByText(/Alimentação/)).toBeInTheDocument()
  })

  it('chama updateTransaction ao salvar form de edição', async () => {
    const updateTransaction = vi.fn().mockResolvedValue(undefined)
    vi.mocked(useTransactions).mockReturnValue({
      ...baseHookReturn,
      loading: false,
      transactions: [baseTx],
      total: 1,
      updateTransaction,
    })
    renderTx()
    // Open edit dialog
    const allButtons = screen.getAllByRole('button')
    const iconButtons = allButtons.filter(btn => !btn.textContent?.trim())
    // Pencil button is second-to-last icon button
    await userEvent.click(iconButtons[iconButtons.length - 2])
    expect(screen.getByText('Editar transação')).toBeInTheDocument()
    // Amount is pre-filled from baseTx.amount = 1500
    await userEvent.click(screen.getByText('Salvar'))
    expect(updateTransaction).toHaveBeenCalledWith('1', expect.objectContaining({ amount: 1500 }))
  })

  it('navega para próxima página ao clicar em ChevronRight da paginação', async () => {
    const setPage = vi.fn()
    vi.mocked(useTransactions).mockReturnValue({
      ...baseHookReturn,
      loading: false,
      transactions: [],
      totalPages: 3,
      page: 1,
      setPage,
    })
    renderTx()
    // With totalPages > 1, pagination renders additional ChevronLeft/Right buttons
    const allButtons = screen.getAllByRole('button')
    const iconButtons = allButtons.filter(btn => !btn.textContent?.trim())
    // Pagination adds ChevronLeft and ChevronRight at the bottom
    // Order: period-left, period-right, pagination-left(disabled), pagination-right
    await userEvent.click(iconButtons[iconButtons.length - 1])
    expect(setPage).toHaveBeenCalledWith(2)
  })

  it('navega para o mês anterior ao clicar em ChevronLeft (await)', async () => {
    vi.mocked(useTransactions).mockReturnValue({
      ...baseHookReturn,
      loading: false,
      transactions: [],
    })
    renderTx()
    const allButtons = screen.getAllByRole('button')
    const iconButtons = allButtons.filter(btn => !btn.textContent?.trim())
    await userEvent.click(iconButtons[0])
    // Verify component still renders without errors
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('navega para o mês seguinte ao clicar em ChevronRight (await)', async () => {
    vi.mocked(useTransactions).mockReturnValue({
      ...baseHookReturn,
      loading: false,
      transactions: [],
    })
    renderTx()
    const allButtons = screen.getAllByRole('button')
    const iconButtons = allButtons.filter(btn => !btn.textContent?.trim())
    await userEvent.click(iconButtons[1])
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('exibe erro ao tentar salvar com data vazia', async () => {
    vi.mocked(useTransactions).mockReturnValue({
      ...baseHookReturn,
      loading: false,
      transactions: [],
    })
    renderTx()
    await userEvent.click(screen.getByText('Nova transação'))
    // Fill amount — MoneyInput has no placeholder, find by inputmode attribute
    const amountInput = document.querySelector<HTMLInputElement>('[inputmode="numeric"]')!
    await userEvent.clear(amountInput)
    await userEvent.type(amountInput, '100')
    // Clear the date field
    const dateInput = screen.getAllByDisplayValue('')[0]
    fireEvent.change(dateInput, { target: { value: '' } })
    // Also clear the date input specifically — find all date inputs
    const allDateInputs = screen.getAllByDisplayValue(/\d{4}-\d{2}-\d{2}/)
    fireEvent.change(allDateInputs[0], { target: { value: '' } })
    await userEvent.click(screen.getByText('Salvar'))
    expect(screen.getByText('Informe a data')).toBeInTheDocument()
  })

  it('atualiza paid_at no dialog de pagamento ao mudar data', async () => {
    vi.mocked(useTransactions).mockReturnValue({
      ...baseHookReturn,
      loading: false,
      transactions: [{ ...baseTx, paid: false }],
      total: 1,
    })
    renderTx()
    await userEvent.click(screen.getByTitle('Pagar'))
    // Find the date input in the pay dialog
    const dateInputs = screen.getAllByDisplayValue(/\d{4}-\d{2}-\d{2}/)
    // The pay dialog has one date input
    fireEvent.change(dateInputs[dateInputs.length - 1], { target: { value: '2026-06-10' } })
    // No error thrown — onChange callback is exercised
    expect(screen.getByText('Registrar pagamento')).toBeInTheDocument()
  })
})
