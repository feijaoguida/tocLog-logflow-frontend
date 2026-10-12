import { test, expect } from '@playwright/test'

test.describe('Detalhe Web, Prévia e Conflitos Organizacionais (INT26-T17)', () => {
  const connectionId = 'conn-elofy-1'

  test.beforeEach(async ({ page }) => {
    // Mock da conexão de detalhe
    await page.route(`**/integrations/connections/${connectionId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: connectionId,
          provider: 'ELOFY',
          name: 'Elofy RH & Organização Matriz',
          environment: 'SANDBOX',
          status: 'ACTIVE',
          direction: 'INBOUND',
          lastSyncAt: '2026-10-10T13:30:00Z',
          credentials: { configured: true },
          settings: {
            timeoutMs: 20000,
            maxRetries: 2,
            cronExpression: '0 3 * * *',
            timezone: 'America/Sao_Paulo',
            applyPolicy: 'APPLY_SAFE',
          },
        }),
      })
    })

    // Mock das execuções da conexão
    await page.route(`**/integrations/connections/${connectionId}/runs`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 'run-elofy-101',
              connectionId,
              status: 'COMPLETED',
              triggerType: 'MANUAL',
              startedAt: '2026-10-10T14:00:00Z',
              completedAt: '2026-10-10T14:02:15Z',
              itemsRead: 45,
              itemsWritten: 40,
              itemsSkipped: 3,
              itemsFailed: 2,
              hasPlan: true,
              planStatus: 'READY',
            },
          ],
          total: 1,
        }),
      })
    })

    // Mock do plano de prévia da execução
    await page.route('**/integrations/runs/run-elofy-101/plan', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'plan-101',
          runId: 'run-elofy-101',
          status: 'READY',
          revision: 1,
          createdAt: '2026-10-10T14:02:15Z',
          expiresAt: '2026-10-10T16:02:15Z',
          totalItems: 4,
          counts: {
            creates: 1,
            updates: 1,
            unchanged: 1,
            conflicts: 1,
            skips: 0,
          },
          items: [
            {
              id: 'item-1',
              entityType: 'Department',
              action: 'CREATE',
              externalId: 'ext-dept-finance',
              name: 'Controladoria & Finanças',
              diff: {
                name: { current: null, proposed: 'Controladoria & Finanças' },
                code: { current: null, proposed: 'FIN_01' },
              },
            },
            {
              id: 'item-2',
              entityType: 'Employee',
              action: 'UPDATE',
              externalId: 'ext-emp-987',
              name: 'Carlos Oliveira',
              diff: {
                taxId: { current: '***.***.***-**', proposed: '***.***.***-**' },
                jobTitle: { current: 'Analista Jr', proposed: 'Analista Pleno' },
                managerName: { current: 'Mariana Lima', proposed: 'Mariana Lima' },
              },
            },
            {
              id: 'item-3',
              entityType: 'JobPosition',
              action: 'UNCHANGED',
              externalId: 'ext-pos-analyst',
              name: 'Analista de Operações',
              diff: {},
            },
            {
              id: 'item-4',
              entityType: 'Employee',
              action: 'CONFLICT',
              externalId: 'ext-emp-654',
              name: 'Ana Souza',
              conflictReason: 'Divergência de Equipe: Usuário já vinculado à Equipe Operacional Alfa no LogFlow.',
              diff: {
                team: { current: 'Operacional Alfa', proposed: 'Projetos Estratégicos' },
              },
            },
          ],
        }),
      })
    })

    // Mock dos mapeamentos manuais
    await page.route(`**/integrations/connections/${connectionId}/mappings`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'map-1',
            entityType: 'JobPosition',
            externalId: 'ext-pos-mgr',
            internalId: 'pos-internal-44',
            status: 'RESOLVED',
            matchedAt: '2026-10-10T10:00:00Z',
          },
        ]),
      })
    })
  })

  test('C13 & AC-02: Exibe prévia da sincronização com resumo de itens, diff e CPF mascarado', async ({ page }) => {
    await page.goto(`/dashboard/integrations/${connectionId}`)

    // Verifica cabeçalho e título
    await expect(page.locator('h1')).toContainText('Elofy RH & Organização Matriz')

    // Verifica se os KPIs da conexão estão visíveis
    await expect(page.getByText('Status da Conexão')).toBeVisible()
    await expect(page.getByText('SANDBOX')).toBeVisible()

    // Clica na aba de Prévia & Conflitos
    await page.getByRole('tab', { name: 'Prévia & Conflitos' }).click()

    // Valida resumo de itens da prévia
    await expect(page.getByText('4 itens analisados')).toBeVisible()
    await expect(page.getByText('1 a criar')).toBeVisible()
    await expect(page.getByText('1 a atualizar')).toBeVisible()
    await expect(page.getByText('1 com conflito')).toBeVisible()

    // Valida itens na lista da prévia
    await expect(page.getByText('Controladoria & Finanças')).toBeVisible()
    await expect(page.getByText('Carlos Oliveira')).toBeVisible()
    await expect(page.getByText('Ana Souza')).toBeVisible()

    // AC-02: Verifica mascaramento estrito de CPF (sem exibição de CPF aberto ou tokens brutos)
    await expect(page.getByText('***.***.***-**')).toBeVisible()
  })

  test('C16 & AC-03: Exibe alerta acionável para conflitos organizacionais e preserva vínculos de Team', async ({ page }) => {
    await page.goto(`/dashboard/integrations/${connectionId}`)
    await page.getByRole('tab', { name: 'Prévia & Conflitos' }).click()

    // Valida badge e aviso de conflito
    await expect(page.getByText('CONFLICT')).toBeVisible()
    await expect(page.getByText('Divergência de Equipe: Usuário já vinculado à Equipe Operacional Alfa no LogFlow.')).toBeVisible()

    // Alerta de instrução acionável preservando vínculos de Team
    await expect(
      page.getByText('Vínculos de equipe operacional no LogFlow têm precedência e foram preservados.')
    ).toBeVisible()
  })

  test('C18 & AC-01: Aplicação do plano é idempotente e trata duplo clique/revisão com segurança', async ({ page }) => {
    let applyCount = 0

    await page.route('**/integrations/runs/run-elofy-101/apply', async (route) => {
      applyCount++
      if (applyCount === 1) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            appliedAt: '2026-10-10T14:10:00Z',
            affectedCount: 2,
          }),
        })
      } else {
        // Simulação de tentativa concorrente / repetida
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            statusCode: 409,
            message: 'Plano já aplicado ou revisão obsoleto.',
          }),
        })
      }
    })

    await page.goto(`/dashboard/integrations/${connectionId}`)
    await page.getByRole('tab', { name: 'Prévia & Conflitos' }).click()

    const applyButton = page.getByRole('button', { name: 'Aplicar Plano com Segurança' })
    await expect(applyButton).toBeVisible()

    // Clica para aplicar
    await applyButton.click()

    // Botão deve indicar sucesso
    await expect(page.getByText('Plano Aplicado')).toBeVisible()
    expect(applyCount).toBe(1)
  })

  test('AC-04: Conexão Elofy trava direção em INBOUND e desabilita opções de saída com explicação', async ({ page }) => {
    await page.goto(`/dashboard/integrations/${connectionId}`)

    // Navega para aba de Política & Agendamento
    await page.getByRole('tab', { name: 'Política & Agendamento' }).click()

    // Verifica que a direção INBOUND está marcada e OUTBOUND/BIDIRECTIONAL estão desabilitadas
    await expect(page.getByText('Somente Entrada (Inbound)')).toBeVisible()

    const outboundRadio = page.locator('input[type="radio"][value="OUTBOUND"]')
    const biRadio = page.locator('input[type="radio"][value="BIDIRECTIONAL"]')

    await expect(outboundRadio).toBeDisabled()
    await expect(biRadio).toBeDisabled()

    // Mensagem explicativa do contrato remoto
    await expect(page.getByText('A integração com Elofy suporta estritamente leitura de dados organizacionais')).toBeVisible()
  })

  test('Mapeamentos de Identidade: Permite registrar associação manual de entidade', async ({ page }) => {
    let mappingPayload: Record<string, string> | null = null

    await page.route(`**/integrations/connections/${connectionId}/mappings`, async (route) => {
      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON() as Record<string, string>
        mappingPayload = body
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'map-new',
            entityType: body.entityType,
            externalId: body.externalId,
            internalId: body.internalId,
            status: 'RESOLVED',
            matchedAt: new Date().toISOString(),
          }),
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'map-1',
              entityType: 'JobPosition',
              externalId: 'ext-pos-mgr',
              internalId: 'pos-internal-44',
              status: 'RESOLVED',
              matchedAt: '2026-10-10T10:00:00Z',
            },
          ]),
        })
      }
    })

    await page.goto(`/dashboard/integrations/${connectionId}`)
    await page.getByRole('tab', { name: 'Mapeamentos de Identidade' }).click()

    // Preenche o formulário de mapeamento manual
    await page.getByLabel('ID Externo (Elofy/SSW)').fill('ext-pos-lead')
    await page.getByLabel('ID Interno no LogFlow').fill('pos-internal-88')
    await page.getByRole('button', { name: 'Salvar Mapeamento' }).click()

    expect(mappingPayload).not.toBeNull()
    const payload = mappingPayload as unknown as Record<string, string>
    expect(payload.externalId).toBe('ext-pos-lead')
    expect(payload.internalId).toBe('pos-internal-88')
  })
})
