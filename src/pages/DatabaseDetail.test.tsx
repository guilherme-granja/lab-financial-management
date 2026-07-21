import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import DatabaseDetail from './DatabaseDetail'
import { useDatabases } from '@/hooks/useDatabases'

vi.mock('@/hooks/useDatabases')

const DB = {
  user_id: 'u1',
  full_name: 'Fulano',
  project_ref: 'u1ref',
  supabase_url: 'https://u1.supabase.co',
  supabase_anon_key: 'anon-key',
  status: 'active' as const,
  paused_at: null,
  health: 'healthy' as const,
  last_checked_at: '2026-07-21T10:00:00.000Z',
}

const ping = vi.fn()
const deactivate = vi.fn()
const reactivate = vi.fn()

function mockUseDatabases(databases: typeof DB[]) {
  vi.mocked(useDatabases).mockReturnValue({
    databases,
    loading: false,
    error: null,
    ping,
    pingAll: vi.fn(),
    deactivate,
    reactivate,
    refresh: vi.fn(),
  })
}

function renderDetail(userId: string) {
  return render(
    <MemoryRouter initialEntries={[`/admin/databases/${userId}`]}>
      <Routes>
        <Route path="/admin/databases/:userId" element={<DatabaseDetail />} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('DatabaseDetail', () => {
  it('renderiza nome, project_ref e status pra userId válido', () => {
    mockUseDatabases([DB])
    renderDetail('u1')
    expect(screen.getByText('Fulano')).toBeInTheDocument()
    expect(screen.getByText('u1ref')).toBeInTheDocument()
    expect(screen.getByText('Healthy')).toBeInTheDocument()
  })

  it('mostra "Usuário não encontrado" pra userId inexistente', () => {
    mockUseDatabases([DB])
    renderDetail('nope')
    expect(screen.getByText('Usuário não encontrado.')).toBeInTheDocument()
  })

  it('botão Atualizar chama ping(userId)', async () => {
    mockUseDatabases([DB])
    renderDetail('u1')
    await userEvent.click(screen.getByText('Atualizar'))
    expect(ping).toHaveBeenCalledWith('u1')
  })

  it('botão Desativar abre dialog de confirmação sem chamar deactivate direto', async () => {
    mockUseDatabases([DB])
    renderDetail('u1')
    await userEvent.click(screen.getByText('Desativar'))
    expect(deactivate).not.toHaveBeenCalled()
    expect(screen.getByText(/ficará indisponível/)).toBeInTheDocument()
  })
})
