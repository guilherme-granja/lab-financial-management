import { test, expect } from '@playwright/test'

const ADMIN_EMAIL = process.env.PLAYWRIGHT_ADMIN_EMAIL ?? 'guilhermegranja.supabase@proton.me'
const ADMIN_PASSWORD = process.env.PLAYWRIGHT_ADMIN_PASSWORD ?? ''

test.describe('Fluxo de admin', () => {
  test.skip(!ADMIN_PASSWORD, 'PLAYWRIGHT_ADMIN_PASSWORD não configurada')

  test.beforeEach(async ({ page }) => {
    await page.goto('login')
    await page.getByPlaceholder('seu@email.com').fill(ADMIN_EMAIL)
    await page.getByPlaceholder('••••••••').fill(ADMIN_PASSWORD)
    await page.getByRole('button', { name: /entrar/i }).click()
    await expect(page).toHaveURL(/\/$/)
  })

  test('admin vê links de admin na sidebar', async ({ page }) => {
    await expect(page.getByRole('link', { name: /^usuários$/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /^atividade$/i })).toBeVisible()
  })

  test('admin acessa /admin e vê cards de métricas', async ({ page }) => {
    await page.goto('admin')
    await expect(page.getByText(/total de usuários/i)).toBeVisible()
  })

  test('admin acessa /admin/users e vê tabela', async ({ page }) => {
    await page.goto('admin/users')
    await expect(page.getByRole('button', { name: /novo usuário/i })).toBeVisible()
  })

  test('modal de criar usuário valida campos obrigatórios', async ({ page }) => {
    await page.goto('admin/users')
    await page.getByRole('button', { name: /novo usuário/i }).click()
    await expect(page.getByText(/nome completo/i)).toBeVisible()
    await expect(page.getByText(/^e-mail$/i)).toBeVisible()
    await expect(page.getByText(/^senha$/i)).toBeVisible()
    // Tentar salvar sem preencher — dialog permanece aberto (botão continua visível)
    await page.getByRole('button', { name: /criar usuário/i }).click()
    await expect(page.getByRole('button', { name: /criar usuário/i })).toBeVisible()
  })

  test('admin acessa /admin/activity e vê tabela de logs', async ({ page }) => {
    await page.goto('admin/activity')
    await expect(page.getByRole('columnheader', { name: /^ação$/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /^usuário$/i })).toBeVisible()
  })
})
