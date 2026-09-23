import { expect, test, type Page } from '@playwright/test'

type Actor = { token: string; user: { id: string; name: string; employeeId?: string; permissions: string[] } }
type Fixture = { baseUrl: string; actors: Record<string, Actor> }
const fixture: Fixture | null = process.env.HD26_METRICS_FIXTURE ? JSON.parse(process.env.HD26_METRICS_FIXTURE) : null
test.skip(!fixture, 'Requires isolated T19 runner')
test.afterEach(async ({ page }, info) => { if (info.status !== info.expectedStatus) await info.attach('page', { body: await page.content(), contentType: 'text/html' }); await page.unrouteAll({ behavior: 'ignoreErrors' }) })
async function login(page: Page, persona: string) {
  if (!fixture || !/^http:\/\/127\.0\.0\.1:\d+$/.test(fixture.baseUrl)) throw new Error('Isolated API required')
  const actor = fixture.actors[persona]
  const calls: string[] = []
  await page.context().addCookies([{ name: 'token', value: actor.token, url: 'http://127.0.0.1:48991' }])
  await page.addInitScript(actor => { localStorage.setItem('token', actor.token); localStorage.setItem('user', JSON.stringify(actor.user)) }, actor)
  await page.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.origin !== 'http://127.0.0.1:48991' || url.pathname.startsWith('/api/')) { await route.abort('blockedbyclient'); return }
    if (!url.pathname.startsWith('/__hd26_api/')) { await route.continue(); return }
    const path = url.pathname.slice('/__hd26_api'.length); calls.push(path)
    if (path.startsWith('/helpdesk/') || path === '/dashboard/data') {
      const response = await route.fetch({ url: fixture!.baseUrl + path + url.search }); await route.fulfill({ response }); return
    }
    if (path === '/dashboard/views') {
      await route.fulfill({ json: [{ id: 't19-view', name: 'T19', configuration: [
        { i: 'HD_MY_TICKETS-1', x: 0, y: 0, w: 3, h: 3 },
        { i: 'HD_RECENT_ALL-1', x: 3, y: 0, w: 4, h: 5 },
      ] }] }); return
    }
    await route.fulfill({ json: path === '/auth/profile' ? actor.user : [] })
  })
  return calls
}

test('admin personal list never displays third-party tickets', async ({ page }) => {
  const calls = await login(page, 'admin'); await page.goto('/dashboard/helpdesk')
  await expect(page.getByText('Nenhum chamado encontrado', { exact: true })).toBeVisible()
  await expect(page.getByText('T19 paused browser', { exact: true })).toHaveCount(0)
  expect(calls).toContain('/helpdesk/tickets/my'); expect(calls).not.toContain('/helpdesk/tickets')
})

test('personal list shows cancellation and assignment indicators', async ({ page }) => {
  await login(page, 'requester')
  const loaded = page.waitForResponse(r => r.url().endsWith('/helpdesk/tickets/my'))
  await page.goto('/dashboard/helpdesk')
  const response = await loaded
  expect(response.status()).toBe(200)
  const data = await response.json()
  expect(data.find((t: { subject: string }) => t.subject === 'T19 paused browser')).toMatchObject({ indicators: { waitingCancellationApproval: true, approvalNeedsAssignment: true } })
  const row = page.getByRole('row').filter({ hasText: 'T19 paused browser' })
  await expect(row.getByText('Cancelamento pendente', { exact: true })).toBeVisible()
  await expect(row.getByText('Aprovação sem responsável', { exact: true })).toBeVisible()
})

test('metrics renders paused clocks separately from violations and pending cancellation', async ({ page }) => {
  await login(page, 'admin'); await page.goto('/dashboard/helpdesk/metrics')
  const section = page.getByRole('region', { name: 'Estados de SLA e aprovações' })
  await expect(section.getByText('SLA pausado', { exact: true }).locator('..')).toHaveText('SLA pausado1')
  await expect(section.getByText('Cancelamento pendente', { exact: true }).locator('..')).toHaveText('Cancelamento pendente1')
  await expect(page.getByText('SLA resolução violado', { exact: true }).first().locator('../..')).toContainText('0')
  await expect(page.getByText(/com SLA de resolução vencido/)).toHaveCount(0)
})

test('requester cannot load restricted metrics', async ({ page }) => {
  await login(page, 'requester')
  const denied = page.waitForResponse(r => r.url().includes('/helpdesk/metrics/summary'))
  await page.goto('/dashboard/helpdesk/metrics')
  expect((await denied).status()).toBe(403)
  await expect(page.getByText('Nenhuma métrica disponível.', { exact: true })).toBeVisible()
})

test('dashboard widgets render personal count and real ticket subject', async ({ page }) => {
  await login(page, 'agent'); await page.goto('/dashboard')
  await expect(page.getByText('Chamados próprios ativos', { exact: true })).toBeVisible()
  await expect(page.getByText('T19 paused browser', { exact: true })).toBeVisible()
  await expect(page.getByText('Chamado sem título', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Chamados próprios ativos', { exact: true }).locator('..')).toContainText('0')
})


test('queue uses backend indicators for paused clocks and cancellation', async ({ page }) => {
  await login(page, 'agent'); await page.goto('/dashboard/helpdesk/queue')
  const row = page.getByRole('row').filter({ hasText: 'T19 paused browser' })
  await expect(row.getByText('Cancelamento pendente', { exact: true })).toBeVisible()
  await expect(row.getByText('Aprovação sem responsável', { exact: true })).toBeVisible()
  await expect(row.getByText(/Ciclo 1 — Pausado/)).toBeVisible()
  await expect(row.getByText('Vencido', { exact: true })).toHaveCount(0)
})
