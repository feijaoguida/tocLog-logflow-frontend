import { expect, test } from '@playwright/test'

test.describe('IA26-T11: Criar administração de IA no padrão TocLog', () => {
  test('AC-02: Tela de conexões exibe chaves como mascaradas e campo de chave em edição é write-only', async ({
    page,
  }) => {
    // Mock conexões existentes
    await page.route('**/ai/connections', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          json: [
            {
              id: 'conn-1',
              provider: 'OPENAI',
              model: 'gpt-4o-mini',
              encryptedApiKey: 'encrypted_payload_hex',
              isActive: true,
              isDefault: true,
              totalCalls: 42,
              failedCalls: 0,
              createdAt: '2026-10-01T10:00:00.000Z',
              updatedAt: '2026-10-02T12:00:00.000Z',
            },
          ],
        })
      }
    })

    await page.goto('/dashboard/settings/ai/connections')

    // Verificar que a chave mascarada é exibida na tabela
    const maskedText = page.locator('text=••••••••••••••••')
    await expect(maskedText).toBeVisible()

    // Clicar em editar conexão
    const editBtn = page.locator('button[title="Editar Conexão"]').first()
    await editBtn.click()

    // Verificar que o campo de API Key está vazio e possui placeholder write-only
    const apiKeyInput = page.locator('input[type="password"]')
    await expect(apiKeyInput).toBeVisible()
    await expect(apiKeyInput).toHaveValue('')
    await expect(apiKeyInput).toHaveAttribute(
      'placeholder',
      'Deixe em branco para manter a chave atual',
    )
  })

  test('AC-01: Configurações gerais salvam cotas, retenção e roteamento padrão', async ({
    page,
  }) => {
    let putPayload: any = null

    await page.route('**/ai/settings', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          json: {
            enabled: true,
            defaultProvider: 'OPENAI',
            monthlyBudgetUsd: 150.0,
            dailyTokenLimit: 500000,
            retentionDays: 90,
            allowModuleProcurement: true,
            allowModuleHelpdesk: true,
            allowModuleGeneral: true,
          },
        })
      } else if (route.request().method() === 'PUT') {
        putPayload = route.request().postDataJSON()
        await route.fulfill({
          status: 200,
          json: {
            ...putPayload,
            updatedAt: new Date().toISOString(),
          },
        })
      }
    })

    await page.goto('/dashboard/settings/ai')

    // Verificar campos preenchidos
    await expect(page.locator('input[type="number"]').first()).toHaveValue('150')

    // Salvar
    const saveBtn = page.locator('button:has-text("Salvar Alterações")')
    await saveBtn.click()

    // Validar mensagem de sucesso
    await expect(
      page.locator('text=Configurações de inteligência artificial atualizadas com sucesso.'),
    ).toBeVisible()
  })

  test('AC-03 & AC-04: Layout responsivo das configurações sem rolagem horizontal em 1366px e 390px', async ({
    page,
  }) => {
    await page.route('**/ai/assistants', async (route) => {
      await route.fulfill({ status: 200, json: [] })
    })

    // Teste em desktop 1366px
    await page.setViewportSize({ width: 1366, height: 768 })
    await page.goto('/dashboard/settings/ai/assistants')
    let scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    let clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1)

    // Teste em mobile 390px
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/dashboard/settings/ai/assistants')
    scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1)
  })
})
