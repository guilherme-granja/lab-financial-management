import { test, expect } from '@playwright/test'

const ADMIN_EMAIL = process.env.PLAYWRIGHT_ADMIN_EMAIL ?? 'guilhermegranja.supabase@proton.me'
const ADMIN_PASSWORD = process.env.PLAYWRIGHT_ADMIN_PASSWORD ?? ''
const USER_EMAIL = 'playwright@lfm.local'
const USER_PASSWORD = process.env.PLAYWRIGHT_USER_PASSWORD ?? ''

async function login(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto('/login')
  await page.getByPlaceholder('seu@email.com').fill(email)
  await page.getByPlaceholder('••••••••').fill(password)
  await page.getByRole('button', { name: /entrar/i }).click()
}

test.describe('Login — usuário admin', () => {
  test.skip(!ADMIN_PASSWORD, 'PLAYWRIGHT_ADMIN_PASSWORD não configurada')

  test('admin faz login e vê sidebar com link Usuários', async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD)
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('link', { name: /usuários/i })).toBeVisible()
  })

  test('admin não vê mensagem "conta não configurada"', async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD)
    await expect(page.getByText(/conta.*não.*configurada/i)).not.toBeVisible()
  })

  test('admin acessa /admin/users sem erro', async ({ page }) => {
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD)
    await page.goto('/admin/users')
    await expect(page.getByText(/usuários/i)).toBeVisible()
    await expect(page.getByText(/erro/i)).not.toBeVisible()
  })
})

test.describe('Login — usuário normal (playwright@lfm.local)', () => {
  test.skip(!USER_PASSWORD, 'PLAYWRIGHT_USER_PASSWORD não configurada')

  test('usuário normal não vê link Usuários na sidebar', async ({ page }) => {
    await login(page, USER_EMAIL, USER_PASSWORD)
    await expect(page.getByRole('link', { name: /usuários/i })).not.toBeVisible()
  })

  test('usuário normal não acessa /admin/users (redireciona)', async ({ page }) => {
    await login(page, USER_EMAIL, USER_PASSWORD)
    await page.goto('/admin/users')
    await expect(page).not.toHaveURL(/admin\/users/)
  })
})
