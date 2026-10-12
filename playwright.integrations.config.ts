import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/integrations',
  workers: 1,
  timeout: 60_000,
  outputDir: '/tmp/int26-playwright-results',
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:48992',
    launchOptions: { executablePath: process.env.CHROME_BIN },
    serviceWorkers: 'block',
  },
})
