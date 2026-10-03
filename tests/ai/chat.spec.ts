import { expect, test } from '@playwright/test'

test.describe('IA26-T10: Chat geral e contextual no padrão TocLog', () => {
  test('AC-01: Abertura de tela ou dialog não envia automaticamente dados para execução externa', async ({
    page,
  }) => {
    let messagePostCalls = 0
    let runCalls = 0

    await page.route('**/ai/conversations/*/messages', async (route) => {
      messagePostCalls++
      await route.fulfill({
        status: 202,
        json: {
          message: { id: 'msg-1', role: 'USER', content: 'Teste' },
          run: { id: 'run-1', status: 'QUEUED' },
        },
      })
    })

    await page.route('**/ai/runs/*', async (route) => {
      runCalls++
      await route.fulfill({
        status: 200,
        json: { id: 'run-1', status: 'COMPLETED' },
      })
    })

    await page.route('**/ai/conversations', async (route) => {
      await route.fulfill({ status: 200, json: [] })
    })

    await page.route('**/ai/assistants', async (route) => {
      await route.fulfill({
        status: 200,
        json: [{ id: 'asst-1', name: 'Assistente Geral' }],
      })
    })

    // Navegar para a página de IA
    await page.goto('/dashboard/ai')

    // Verificar que mensagens automáticas NÃO foram disparadas ao carregar a página
    expect(messagePostCalls).toBe(0)
    expect(runCalls).toBe(0)

    // O compositor deve estar pronto e desabilitado apenas durante envio
    const textarea = page.locator('textarea')
    await expect(textarea).toBeVisible()
    await expect(textarea).toBeEmpty()
  })

  test('AC-04: Layout responsivo sem rolagem horizontal principal em 1366px e 390px (UI04)', async ({
    page,
  }) => {
    // Teste em desktop 1366px
    await page.setViewportSize({ width: 1366, height: 768 })
    await page.goto('/dashboard/ai')

    const scrollWidthDesktop = await page.evaluate(
      () => document.documentElement.scrollWidth,
    )
    const clientWidthDesktop = await page.evaluate(
      () => document.documentElement.clientWidth,
    )
    expect(scrollWidthDesktop).toBeLessThanOrEqual(clientWidthDesktop + 1)

    // Teste em mobile 390px
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/dashboard/ai')

    const scrollWidthMobile = await page.evaluate(
      () => document.documentElement.scrollWidth,
    )
    const clientWidthMobile = await page.evaluate(
      () => document.documentElement.clientWidth,
    )
    expect(scrollWidthMobile).toBeLessThanOrEqual(clientWidthMobile + 1)
  })
})
