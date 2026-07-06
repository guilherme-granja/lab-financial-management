import { test, expect } from '@playwright/test'

test.describe('Guards de autenticação', () => {
  test('usuário não autenticado é redirecionado de / para /login', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login/)
  })

  test('usuário não autenticado é redirecionado de /transactions para /login', async ({ page }) => {
    await page.goto('transactions')
    await expect(page).toHaveURL(/\/login/)
  })

  test('usuário não autenticado é redirecionado de /admin/users para /login', async ({ page }) => {
    await page.goto('admin/users')
    await expect(page).toHaveURL(/\/login/)
  })

  test('página de login renderiza sem erro', async ({ page }) => {
    await page.goto('login')
    await expect(page.getByRole('button', { name: /entrar/i })).toBeVisible()
    await expect(page.getByPlaceholder('seu@email.com')).toBeVisible()
    await expect(page.getByPlaceholder('••••••••')).toBeVisible()
  })
})
