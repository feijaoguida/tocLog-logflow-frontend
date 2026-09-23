import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/helpdesk',
  workers: 1,
  timeout: 60_000,
  outputDir: '/tmp/hd26-playwright-results',
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:48991',
    launchOptions: { executablePath: process.env.CHROME_BIN },
    serviceWorkers: 'block',
  },
  webServer: {
    command: 'node node_modules/next/dist/bin/next dev --webpack --hostname 127.0.0.1 --port 48991',
    wait: { stdout: /Ready in/ },
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_API_URL: 'http://127.0.0.1:48991/__hd26_api',
      NEXT_TELEMETRY_DISABLED: '1',
    },
  },
})
