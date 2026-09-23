import { expect, test, type Page, type Browser } from '@playwright/test'

type Actor = { token: string; user: { id: string; name: string; employeeId?: string; permissions: string[] } }
type Fixture = { legacyTicketId: string; baseUrl: string; actors: Record<string, Actor>; queueId: string; targetQueueId: string; categoryId: string; serviceId: string; approvalServiceId: string }
const fixture: Fixture | null = process.env.HD26_OPERATION_FIXTURE ? JSON.parse(process.env.HD26_OPERATION_FIXTURE) : null
test.skip(!fixture, 'Use the isolated backend operation runner')
test.setTimeout(90000)
const extraPages: Page[] = []
test.afterEach(async ({ page }) => {
  for (const current of [page, ...extraPages.splice(0)]) {
    await current.unrouteAll({ behavior: 'ignoreErrors' })
    if (current !== page) await current.context().close()
  }
})

async function login(page: Page, persona: string, options: { failUpload?: boolean } = {}) {
  if (!fixture || !/^http:\/\/127\.0\.0\.1:\d+$/.test(fixture.baseUrl)) throw new Error('Local isolated API required')
  const actor = fixture.actors[persona]
  const calls: { path: string; method: string; authorization?: string; search: string }[] = []
  let failUpload = options.failUpload
  await page.context().addCookies([{ name: 'token', value: actor.token, url: 'http://127.0.0.1:48991' }])
  await page.addInitScript(actor => { localStorage.setItem('token', actor.token); localStorage.setItem('user', JSON.stringify(actor.user)) }, actor)
  await page.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.origin !== 'http://127.0.0.1:48991' || url.pathname.startsWith('/api/')) { await route.abort('blockedbyclient'); return }
    if (!url.pathname.startsWith('/__hd26_api/')) { await route.continue(); return }
    const path = url.pathname.slice('/__hd26_api'.length)
    calls.push({ path, method: route.request().method(), authorization: route.request().headers().authorization, search: url.search })
    if (path === '/uploads/helpdesk' && failUpload) { failUpload = false; await route.fulfill({ status: 503, json: { message: 'Synthetic upload failure' } }); return }
    if (path.startsWith('/helpdesk/') || path === '/uploads/helpdesk') {
      const response = await route.fetch({ url: fixture!.baseUrl + path + url.search })
      await route.fulfill({ response }); return
    }
    await route.fulfill({ json: path === '/auth/profile' ? actor.user : [] })
  })
  return calls
}

async function actorPage(browser: Browser, persona: string, path: string) {
  const page = await browser.newPage()
  extraPages.push(page)
  await login(page, persona); await page.goto(path)
  return page
}

async function api(page: Page, persona: string, path: string, data?: object, method = data ? 'POST' : 'GET') {
  return page.request.fetch(fixture!.baseUrl + path, { method, headers: { Authorization: `Bearer ${fixture!.actors[persona].token}` }, data })
}

async function create(page: Page, subject: string, required = false) {
  const response = await api(page, 'requester', '/helpdesk/tickets', { subject, description: 'Synthetic browser scenario', serviceCatalogItemId: required ? fixture!.approvalServiceId : fixture!.serviceId })
  expect(response.status()).toBe(201)
  return response.json() as Promise<{ id: string; version: number }>
}

async function action(page: Page, name: string, endpoint: string, expected = 201) {
  const response = page.waitForResponse(r => r.url().endsWith(endpoint) && r.request().method() === 'POST')
  await page.getByRole('button', { name, exact: true }).click()
  expect((await response).status()).toBe(expected)
}

test('opening, upload retry, authenticated download, assignment, waits, resolution and reopening', async ({ page, browser }) => {
  const calls = await login(page, 'requester', { failUpload: true })
  await page.goto('/dashboard/helpdesk/new')
  await page.getByRole('button', { name: /T17 direct service/ }).click()
  await page.getByLabel('Assunto', { exact: true }).fill('T17 full operation')
  await page.getByLabel('Descrição detalhada').fill('Browser creation with attachment retry')
  await page.getByLabel('Anexo opcional').setInputFiles({ name: 'proof.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\nSynthetic\n%%EOF') })
  await page.getByRole('button', { name: 'Abrir chamado', exact: true }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Chamado criado; o anexo falhou' })).toBeVisible()
  await page.getByRole('button', { name: 'Reenviar anexo', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'T17 full operation', exact: true })).toBeVisible()
  const id = page.url().split('/').pop()!
  expect(calls.filter(c => c.path === '/helpdesk/tickets' && c.method === 'POST')).toHaveLength(1)
  await expect(page.getByRole('button', { name: 'Assumir chamado', exact: true })).toHaveCount(0)
  await expect(page.getByText('Registrar como nota interna visível apenas para a operação')).toHaveCount(0)
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'proof.pdf', exact: true }).click()
  expect((await download).suggestedFilename()).toBe('proof.pdf')
  const fileCall = calls.find(c => c.path.endsWith('/content'))!
  expect(fileCall.authorization).toBe(`Bearer ${fixture!.actors.requester.token}`)
  expect(fileCall.search).toBe('')
  const manager = await actorPage(browser, 'manager', `/dashboard/helpdesk/${id}`)
  await manager.getByLabel('Responsável elegível').selectOption(fixture!.actors.agent.user.employeeId!)
  await action(manager, 'Atribuir responsável', `/tickets/${id}/assign`)
  const agent = await actorPage(browser, 'agent', `/dashboard/helpdesk/${id}`)
  await agent.getByLabel('Motivo ou resumo público').fill('Waiting on external supplier')
  await action(agent, 'Aguardar terceiro', `/tickets/${id}/wait`)
  await expect(agent.getByText('Aguardando terceiro', { exact: true })).toBeVisible()
  await action(agent, 'Retomar atendimento', `/tickets/${id}/resume`)
  await agent.getByLabel('Motivo ou resumo público').fill('Please provide more details')
  await action(agent, 'Aguardar usuário', `/tickets/${id}/wait`)
  await expect(agent.getByText('Aguardando usuário', { exact: true })).toBeVisible()
  await page.reload()
  await page.getByPlaceholder('Digite uma atualização, dúvida ou resposta para o atendimento...').fill('Details from requester')
  await action(page, 'Responder', `/tickets/${id}/messages`)
  await expect(page.getByText('Em atendimento', { exact: true })).toBeVisible()
  await agent.reload()
  await agent.getByLabel('Motivo ou resumo público').fill('Service restored and verified')
  await action(agent, 'Marcar como resolvido', `/tickets/${id}/resolve`)
  await expect(agent.getByText('Resolvido', { exact: true })).toBeVisible()
  await page.reload()
  await action(page, 'Fechar chamado', `/tickets/${id}/close`)
  await expect(page.getByText('Fechado', { exact: true })).toBeVisible()
  await page.getByLabel('Motivo ou resumo público').fill('Issue returned')
  await action(page, 'Reabrir chamado', `/tickets/${id}/reopen`)
  await expect(page.getByText('Reaberto', { exact: true })).toBeVisible()
})

test('opening approval, cancellation decision and administrative substitution', async ({ page, browser }) => {
  await login(page, 'requester')
  const settings = await api(page, 'admin', '/helpdesk/settings', { cancelRequiresApproval: true }, 'PATCH')
  expect(settings.status()).toBe(200)
  const ticket = await create(page, 'T17 approval flow', true)
  await page.goto(`/dashboard/helpdesk/${ticket.id}`)
  await expect(page.getByText('Aguardando aprovação', { exact: true })).toBeVisible()
  const approver = await actorPage(browser, 'approver', '/dashboard/helpdesk/approvals')
  const row = approver.getByRole('region', { name: 'Solicitação T17 approval flow' })
  await row.getByRole('button', { name: 'Aprovar solicitação' }).click()
  await expect(row.getByText('Aprovada', { exact: false }).first()).toBeVisible()
  await approver.goto(`/dashboard/helpdesk/${ticket.id}`)
  await expect(approver.getByRole('heading', { name: 'T17 approval flow', exact: true })).toBeVisible()
  await expect(approver.getByRole('button', { name: 'Assumir chamado' })).toHaveCount(0)
  await expect(approver.getByRole('button', { name: 'Marcar como resolvido' })).toHaveCount(0)
  await page.reload()
  await page.getByLabel('Motivo ou resumo público').fill('No longer needed')
  await action(page, 'Solicitar cancelamento', `/tickets/${ticket.id}/cancel`)
  const manager = await actorPage(browser, 'manager', '/dashboard/helpdesk/approvals')
  await manager.getByRole('region', { name: 'Solicitação T17 approval flow' }).getByRole('button', { name: 'Aprovar solicitação' }).click()
  await page.reload()
  await expect(page.getByText('Cancelado', { exact: true })).toBeVisible()
  expect((await api(page, 'admin', '/helpdesk/settings', { openingApprovalMode: 'REQUESTER_MANAGER', fallbackApproverUserId: null }, 'PATCH')).status()).toBe(200)
  const exception = await create(page, 'T17 exception flow', true)
  const admin = await actorPage(browser, 'admin', '/dashboard/helpdesk/approvals')
  await admin.getByRole('button', { name: 'Pendências administrativas' }).click()
  await admin.getByLabel('Substituto elegível').selectOption(fixture!.actors.admin.user.id)
  await admin.getByLabel('Motivo da decisão ou substituição').fill('Assign administrative exception')
  await admin.getByRole('region', { name: 'Solicitação T17 exception flow' }).getByRole('button', { name: 'Indicar substituto' }).click()
  await expect(admin.getByRole('region', { name: 'Solicitação T17 exception flow' })).toHaveCount(0)
  await admin.getByRole('button', { name: 'Minhas solicitações e histórico' }).click()
  await admin.getByRole('region', { name: 'Solicitação T17 exception flow' }).getByRole('button', { name: 'Aprovar solicitação' }).click()
  await page.goto(`/dashboard/helpdesk/${exception.id}`)
  await expect(page.getByText('Aguardando atendimento', { exact: true })).toBeVisible()
})

test('stale version preserves draft; successful transfer does not reread an inaccessible ticket', async ({ page }) => {
  const calls = await login(page, 'agent')
  const ticket = await create(page, 'T17 conflict and transfer')
  await page.goto(`/dashboard/helpdesk/${ticket.id}`)
  await page.getByPlaceholder('Digite uma atualização, dúvida ou resposta para o atendimento...').fill('Preserved draft')
  expect((await api(page, 'agent', `/helpdesk/tickets/${ticket.id}/pickup`, { expectedVersion: ticket.version })).status()).toBe(201)
  await action(page, 'Assumir chamado', `/tickets/${ticket.id}/pickup`, 409)
  await expect(page.getByRole('alert').filter({ hasText: 'rascunho foi preservado' }).first()).toBeVisible()
  await expect(page.getByPlaceholder('Digite uma atualização, dúvida ou resposta para o atendimento...')).toHaveValue('Preserved draft')
  await page.locator('#transfer-queue').click()
  await page.getByRole('option', { name: 'T17 target', exact: true }).click()
  await page.getByLabel('Observação da transferência').fill('Correct destination')
  const before = calls.filter(c => c.path === `/helpdesk/tickets/${ticket.id}`).length
  await action(page, 'Transferir chamado', `/tickets/${ticket.id}/transfer`)
  await expect(page).toHaveURL(/\/helpdesk\/queue$/)
  expect(calls.filter(c => c.path === `/helpdesk/tickets/${ticket.id}`)).toHaveLength(before)
})

test('superseded cancellation conflicts; double action is serialized and revoked permission removes pickup', async ({ page, browser }) => {
  await login(page, 'requester')
  expect((await api(page, 'admin', '/helpdesk/settings', { cancelRequiresApproval: true }, 'PATCH')).status()).toBe(200)
  const ticket = await create(page, 'T17 superseded cancellation')
  const pickup = await api(page, 'agent', `/helpdesk/tickets/${ticket.id}/pickup`, { expectedVersion: ticket.version })
  expect(pickup.status()).toBe(201)
  await page.goto(`/dashboard/helpdesk/${ticket.id}`)
  await page.getByLabel('Motivo ou resumo público').fill('Cancel while under service')
  await action(page, 'Solicitar cancelamento', `/tickets/${ticket.id}/cancel`)
  const manager = await actorPage(browser, 'manager', '/dashboard/helpdesk/approvals')
  const row = manager.getByRole('region', { name: 'Solicitação T17 superseded cancellation' })
  await expect(row.getByRole('button', { name: 'Aprovar solicitação' })).toBeVisible()
  const current = await (await api(page, 'agent', `/helpdesk/tickets/${ticket.id}`)).json()
  expect((await api(page, 'agent', `/helpdesk/tickets/${ticket.id}/resolve`, { expectedVersion: current.version, reason: 'Completed first' })).status()).toBe(201)
  await row.getByRole('button', { name: 'Aprovar solicitação' }).click()
  await expect(manager.getByRole('alert').filter({ hasText: 'atualizada ou superada' })).toBeVisible()
  const next = await create(page, 'T17 double action')
  const agent = await actorPage(browser, 'agent', `/dashboard/helpdesk/${next.id}`)
  const calls: string[] = []
  agent.on('request', request => { if (request.method() === 'POST') calls.push(new URL(request.url()).pathname) })
  await agent.getByRole('button', { name: 'Assumir chamado' }).evaluate((button: HTMLButtonElement) => { button.click(); button.click() })
  await expect(agent.getByText('Em atendimento', { exact: true })).toBeVisible()
  expect(calls.filter(path => path.endsWith('/pickup'))).toHaveLength(1)
  const revoked = await create(page, 'T17 revoked permission')
  await agent.goto(`/dashboard/helpdesk/${revoked.id}`)
  await expect(agent.getByRole('button', { name: 'Assumir chamado' })).toBeVisible()
  expect((await api(page, 'admin', '/__hd26/revoke-agent', {})).status()).toBe(200)
  await action(agent, 'Assumir chamado', `/tickets/${revoked.id}/pickup`, 403)
  await expect(agent.getByRole('button', { name: 'Assumir chamado' })).toHaveCount(0)
})


test('T20 legacy attachment uses authenticated download without exposing public URL', async ({ page }) => {
  const calls = await login(page, 'requester')
  await page.goto(`/dashboard/helpdesk/${fixture!.legacyTicketId}`)
  await expect(page.getByRole('heading', { name: 'T20 legacy browser', exact: true })).toBeVisible()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'legacy.pdf', exact: true }).click()
  expect((await download).suggestedFilename()).toBe('legacy.pdf')
  expect(calls.filter(c => c.path.startsWith('/files/'))).toHaveLength(0)
  expect(calls.find(c => c.path.endsWith('/content'))?.authorization).toBe(`Bearer ${fixture!.actors.requester.token}`)
  const detail = await api(page, 'requester', `/helpdesk/tickets/${fixture!.legacyTicketId}`, undefined, 'GET')
  const ticket = await detail.json()
  expect(ticket.policyVersion).toBe('LEGACY')
  expect(ticket.resolutionDueDate).toBe('2026-01-02T00:00:00.000Z')
})
