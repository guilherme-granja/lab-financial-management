import { test, expect } from '@playwright/test'

const USER_EMAIL = 'playwright@lfm.local'
const USER_PASSWORD = process.env.PLAYWRIGHT_USER_PASSWORD ?? ''

test.describe('Fluxo de usuário normal', () => {
  test.skip(!USER_PASSWORD, 'PLAYWRIGHT_USER_PASSWORD não configurada')

  test.beforeEach(async ({ page }) => {
    await page.goto('login')
    await page.getByPlaceholder('seu@email.com').fill(USER_EMAIL)
    await page.getByPlaceholder('••••••••').fill(USER_PASSWORD)
    await page.getByRole('button', { name: /entrar/i }).click()
    await expect(page).toHaveURL(/\/$/)
  })

  test('usuário vê o dashboard após login', async ({ page }) => {
    await expect(page.getByText(/dashboard/i)).toBeVisible()
  })

  test('usuário não vê link de Usuários na sidebar', async ({ page }) => {
    await expect(page.getByRole('link', { name: /^usuários$/i })).not.toBeVisible()
  })

  test('usuário não consegue acessar /admin/users', async ({ page }) => {
    await page.goto('admin/users')
    await expect(page).not.toHaveURL(/\/admin\/users/)
  })

  test('usuário cria e deleta uma transação', async ({ page }) => {
    await page.getByRole('link', { name: /transações/i }).click()
    await expect(page).toHaveURL(/\/transactions/)

    await page.getByRole('button', { name: /nova transação/i }).click()
    await page.getByPlaceholder('Opcional').fill('Teste E2E')

    const valorField = page.locator('div.space-y-1', { has: page.getByText('Valor (R$)', { exact: true }) })
    await valorField.locator('input').click()
    await valorField.locator('input').pressSequentially('9999')

    await page.getByRole('button', { name: /^salvar$/i }).click()

    const row = page.getByRole('row', { name: /Teste E2E/ })
    await expect(row).toBeVisible()

    await row.getByRole('button').last().click()
    await page.getByRole('button', { name: /^excluir$/i }).click()
    await expect(page.getByRole('row', { name: /Teste E2E/ })).not.toBeVisible()
  })
})
