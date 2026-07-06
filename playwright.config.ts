import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4173/lab-financial-management/',
    trace: 'on-first-retry',
    navigationTimeout: 15000,
    actionTimeout: 10000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4173/lab-financial-management/',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
