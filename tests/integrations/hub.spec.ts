import { test, expect } from '@playwright/test'

test.describe('Hub Web Multi-Sistema (INT26-T16 - TocLog Standard)', () => {
  test.beforeEach(async ({ page }) => {
    // Intercepta as chamadas de API para mock local determinístico
    await page.route('**/integrations/connections', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'conn-ssw-1',
            provider: 'SSW',
            name: 'SSW Logística Principal',
            environment: 'PRODUCTION',
            status: 'ACTIVE',
            lastSyncAt: '2026-10-10T12:00:00Z',
            credentials: { configured: true },
            settings: { timeoutMs: 15000, maxRetries: 3 },
          },
          {
            id: 'conn-elofy-1',
            provider: 'ELOFY',
            name: 'Elofy RH & Organização Matriz',
            environment: 'SANDBOX',
            status: 'ACTIVE',
            lastSyncAt: '2026-10-10T13:30:00Z',
            credentials: { configured: true },
            settings: { timeoutMs: 20000, maxRetries: 2 },
          },
        ]),
      })
    })

    await page.route('**/integrations/providers', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            code: 'ELOFY',
            name: 'Elofy',
            description: 'Gestão Organizacional e Pessoas',
            transportMode: 'HTTP_REST',
            capabilities: {
              directions: ['INBOUND'],
              resources: ['company', 'teams', 'positions', 'users'],
              canSchedule: true,
            },
          },
          {
            code: 'SSW',
            name: 'SSW',
            description: 'Logística e Operações de Rastreio',
            transportMode: 'SIMULATED',
            capabilities: {
              directions: ['OUTBOUND', 'INBOUND'],
              resources: ['notfis', 'tracking', 'occurrences'],
              canSchedule: false,
            },
          },
        ]),
      })
    })

    await page.route('**/integrations/runs', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'run-101',
            provider: 'ELOFY',
            mode: 'PREVIEW',
            status: 'PREVIEW_READY',
            createdAt: '2026-10-10T14:00:00Z',
            itemCounts: { total: 45, applied: 0, conflicts: 2, skipped: 1 },
          },
        ]),
      })
    })

    await page.route('**/integrations/events', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    })

    await page.route('**/integrations/logs', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    })
  })

  test('AC-01: Sem scroll horizontal em resoluções 1366px, 1440px e mobile 390px', async ({
    page,
  }) => {
    // 1. Testa resolução desktop 1366x768
    await page.setViewportSize({ width: 1366, height: 768 })
    await page.goto('/dashboard/integrations')

    await expect(page.getByRole('heading', { name: 'Hub de Integrações' })).toBeVisible()

    const hasHorizontalScrollDesktop1366 = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })
    expect(hasHorizontalScrollDesktop1366).toBe(false)

    // 2. Testa resolução desktop 1440x900
    await page.setViewportSize({ width: 1440, height: 900 })
    const hasHorizontalScrollDesktop1440 = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })
    expect(hasHorizontalScrollDesktop1440).toBe(false)

    // 3. Testa resolução mobile 390x844
    await page.setViewportSize({ width: 390, height: 844 })
    const hasHorizontalScrollMobile = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })
    expect(hasHorizontalScrollMobile).toBe(false)
  })

  test('AC-02: Ausência de form lateral fixo ou card fixo de filtros; KPIs corretos', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 768 })
    await page.goto('/dashboard/integrations')

    // Verifica os 4 KPIs TocLog
    await expect(page.getByText('Total Conexões')).toBeVisible()
    await expect(page.getByText('Conexões Ativas')).toBeVisible()
    await expect(page.getByText('Rotinas & Execuções')).toBeVisible()
    await expect(page.getByText('Taxa de Sucesso')).toBeVisible()

    // Confirma que não há coluna lateral ocupando metade da tela
    const formLateral = page.locator('aside, .w-80, .w-96')
    await expect(formLateral).toHaveCount(0)

    // Botão de filtro flutuante presente
    await expect(page.getByRole('button', { name: /Filtro/i })).toBeVisible()
  })

  test('AC-03 & C18: Selecionar Elofy oculta campos EDI; SSW oculta senha Elofy', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 768 })
    await page.goto('/dashboard/integrations')

    // Abre o modal de nova conexão
    await page.getByRole('button', { name: 'Nova Conexão' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    // 1. Provedor Elofy selecionado por padrão
    await expect(page.getByLabel('API Token (Bearer)')).toBeVisible()
    // Campos EDI não devem existir
    await expect(page.getByLabel('Código EDI')).toHaveCount(0)
    await expect(page.getByLabel('CNPJ EDI')).toHaveCount(0)

    // 2. Troca para SSW
    await page.getByLabel('Provedor de Integração').click()
    await page.getByRole('option', { name: /SSW/ }).click()

    // Campos EDI devem aparecer agora
    await expect(page.getByLabel('Código EDI')).toBeVisible()
    await expect(page.getByLabel('CNPJ EDI')).toBeVisible()

    // Campos de senha e token Elofy não devem mais ser exibidos
    await expect(page.getByLabel('API Token (Bearer)')).toHaveCount(0)
    await expect(page.getByLabel('URL Base Customizada')).toHaveCount(0)
  })
})
