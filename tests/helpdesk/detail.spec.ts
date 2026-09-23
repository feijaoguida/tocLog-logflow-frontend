import { expect, test, type Page } from '@playwright/test'

test.afterEach(async ({ page }) => { await page.unrouteAll({ behavior: 'ignoreErrors' }) })

const ticket = (id: string) => ({
  id, code: id.endsWith('a') ? 1 : 2, subject: `Chamado ${id}`, description: 'Sintético',
  status: 'OPEN', priority: 'MEDIUM', createdAt: '2026-09-18T12:00:00Z',
  version: 0, allowedActions: ['pickup', 'reply', 'attach'],
  queue: { id: 'queue-a', name: 'Fila sintética' },
  requester: { id: 'employee-a', user: { name: 'Solicitante' } },
  messages: [], attachments: [], approvals: [],
})

async function fixture(page: Page, metricsPermission = false) {
  const calls: { path: string; method: string }[] = []
  const failures = new Map<string, number | 'network'>()
  const user = {
    id: 'user-a', employeeId: 'employee-a', name: 'Pessoa sintética',
    email: 'hd26@example.invalid', role: 'SUPPORT_AGENT', accessType: 'EMPLOYEE',
    permissions: ['helpdesk.ticket.view.own', 'helpdesk.queue.view', 'helpdesk.ticket.pickup',
      ...(metricsPermission ? ['helpdesk.dashboard.view'] : [])],
  }
  await page.context().addCookies([{ name: 'token', value: 'synthetic', url: 'http://127.0.0.1:48991' }])
  await page.addInitScript((user) => {
    localStorage.setItem('token', 'synthetic')
    localStorage.setItem('user', JSON.stringify(user))
  }, user)
  await page.route('**/*', async route => {
    const url = new URL(route.request().url())
    // Deny external requests AND the production rewrite, before any network access.
    if (url.origin !== 'http://127.0.0.1:48991' || url.pathname.startsWith('/api/')) {
      await route.abort('blockedbyclient'); return
    }
    if (!url.pathname.startsWith('/__hd26_api/')) { await route.continue(); return }
    const path = url.pathname.slice('/__hd26_api'.length)
    const method = route.request().method()
    calls.push({ path, method })
    const failure = failures.get(path)
    if (failure === 'network') { await route.abort('failed'); return }
    if (failure) { await route.fulfill({ status: failure, json: { message: 'Falha simulada' } }); return }
    let body: unknown = []
    if (path === '/auth/profile') body = user
    else if (path === '/helpdesk/context') body = { capabilities: { myTickets: true, queues: true, dashboard: metricsPermission } }
    else if (path === '/helpdesk/tickets' || path === '/helpdesk/tickets/my' || path === '/helpdesk/queue/tickets') body = [ticket('ticket-a'), ticket('ticket-b')]
    else if (path === '/helpdesk/queues') body = [{ id: 'queue-a', name: 'Fila sintética' }]
    else if (path === '/helpdesk/action-reasons') body = { closeReasons: [], transferReasons: [] }
    else if (path === '/uploads/helpdesk') body = { uploadId: 'upload-synthetic', url: '/synthetic-file' }
    else if (method === 'POST') body = { id: 'message-a' }
    else if (path.startsWith('/helpdesk/tickets/')) {
      const id = path.split('/').pop()!
      if (!['ticket-a', 'ticket-b'].includes(id)) {
        await route.fulfill({ status: 404, json: { message: 'Chamado nao encontrado.' } }); return
      }
      body = ticket(id)
    }
    await route.fulfill({ json: body })
  })
  return { calls, failures }
}

test('botão, troca entre dois tickets, recarga, mensagens, anexos e ações usam o ID selecionado', async ({ page }) => {
  const { calls } = await fixture(page)
  for (const id of ['ticket-a', 'ticket-b']) {
    await page.goto('/dashboard/helpdesk')
    await page.getByRole('row').filter({ hasText: `Chamado ${id}` }).getByRole('button', { name: 'Ver detalhes' }).click()
    await expect(page.getByRole('heading', { name: `Chamado ${id}`, exact: true })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('heading', { name: `Chamado ${id}`, exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Assumir chamado' }).click()
    await expect.poll(() => calls.some(c => c.path === `/helpdesk/tickets/${id}/pickup`)).toBe(true)
    await page.getByPlaceholder('Digite uma atualização, dúvida ou resposta para o atendimento...').fill('Mensagem sintética')
    await page.locator('#message-attachment').setInputFiles({ name: 'teste.txt', mimeType: 'text/plain', buffer: Buffer.from('fixture') })
    await page.getByRole('button', { name: 'Responder', exact: true }).click()
    await expect.poll(() => calls.some(c => c.path === `/helpdesk/tickets/${id}/attachments`)).toBe(true)
  }
  expect(calls.some(c => c.path.includes('undefined'))).toBe(false)
})

test('link direto, 404 e 403 permanecem na rota sem loop', async ({ page }) => {
  const { failures } = await fixture(page)
  await page.goto('/dashboard/helpdesk/missing')
  await expect(page.getByRole('alert', { name: 'Erro do chamado' })).toContainText('Chamado não encontrado.')
  await expect(page).toHaveURL(/\/helpdesk\/missing$/)
  failures.set('/helpdesk/tickets/ticket-a', 403)
  await page.goto('/dashboard/helpdesk/ticket-a')
  await expect(page.getByRole('alert', { name: 'Erro do chamado' })).toContainText('Você não tem permissão')
  await expect(page).toHaveURL(/\/helpdesk\/ticket-a$/)
})

test('falha de rede pode ser repetida sem perder a rota', async ({ page }) => {
  const { failures } = await fixture(page)
  failures.set('/helpdesk/tickets/ticket-a', 'network')
  await page.goto('/dashboard/helpdesk/ticket-a')
  await expect(page.getByRole('alert', { name: 'Erro do chamado' })).toBeVisible()
  failures.delete('/helpdesk/tickets/ticket-a')
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(page.getByRole('heading', { name: 'Chamado ticket-a', exact: true })).toBeVisible()
})

test('atendente sem dashboard.view carrega tickets sem consultar métricas', async ({ page }) => {
  const { calls } = await fixture(page)
  await page.goto('/dashboard/helpdesk/queue')
  await expect(page.getByRole('row').filter({ hasText: 'Chamado ticket-a' })).toBeVisible()
  expect(calls.filter(c => c.path === '/helpdesk/metrics/summary')).toHaveLength(0)
  await expect(page.getByText('SLA vencido', { exact: true })).toHaveCount(0)
})

test('403 das métricas e falha de filas não impedem listagem 200', async ({ page }) => {
  const { failures, calls } = await fixture(page, true)
  failures.set('/helpdesk/metrics/summary', 403)
  failures.set('/helpdesk/queues', 500)
  await page.goto('/dashboard/helpdesk/queue')
  await expect(page.getByRole('row').filter({ hasText: 'Chamado ticket-b' })).toBeVisible()
  await expect.poll(() => calls.some(c => c.path === '/helpdesk/metrics/summary')).toBe(true)
  await page.getByRole('button', { name: 'Atualizar', exact: true }).click()
  await expect(page.getByRole('row').filter({ hasText: 'Chamado ticket-a' })).toBeVisible()
})

test('dados opcionais não impedem detalhe; ID inválido não consulta API', async ({ page }) => {
  const { failures, calls } = await fixture(page)
  failures.set('/helpdesk/queues', 403)
  failures.set('/helpdesk/action-reasons', 500)
  await page.goto('/dashboard/helpdesk/ticket-b')
  await expect(page.getByRole('heading', { name: 'Chamado ticket-b', exact: true })).toBeVisible()
  await page.goto('/dashboard/helpdesk/undefined')
  await expect(page.getByRole('alert', { name: 'Erro do chamado' })).toHaveText('Identificador de chamado inválido.')
  expect(calls.some(c => c.path.includes('undefined'))).toBe(false)
})
