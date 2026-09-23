import { expect, test, type Page } from '@playwright/test'

type Actor = { token: string; user: { id: string; name: string; permissions: string[]; accessType: string; employeeId?: string } }
type Fixture = { baseUrl: string; actors: Record<string, Actor>; queueId: string; departmentId: string }
const raw = process.env.HD26_GOVERNANCE_FIXTURE
const fixture: Fixture | null = raw ? JSON.parse(raw) : null
test.skip(!fixture, 'Run through the isolated backend browser runner')

test.afterEach(async ({ page }) => {
  // Routes still pending during teardown have no remaining assertions.
  await page.unrouteAll({ behavior: 'ignoreErrors' })
})

async function reload(page: Page) {
  // Let the real API requests triggered by a save finish before navigating.
  await page.waitForLoadState('networkidle')
  await page.reload()
  await page.waitForLoadState('networkidle')
}

async function login(page: Page, persona: string) {
  if (!fixture || !/^http:\/\/127\.0\.0\.1:\d+$/.test(fixture.baseUrl)) throw new Error('Isolated local API required')
  const actor = fixture.actors[persona]
  const calls: string[] = []
  await page.context().addCookies([{ name: 'token', value: actor.token, url: 'http://127.0.0.1:48991' }])
  await page.addInitScript(actor => { localStorage.setItem('token', actor.token); localStorage.setItem('user', JSON.stringify(actor.user)) }, actor)
  await page.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.origin !== 'http://127.0.0.1:48991' || url.pathname.startsWith('/api/')) { await route.abort('blockedbyclient'); return }
    if (!url.pathname.startsWith('/__hd26_api/')) { await route.continue(); return }
    const path = url.pathname.slice('/__hd26_api'.length); calls.push(path)
    if (path.startsWith('/helpdesk/')) {
      const response = await route.fetch({ url: fixture!.baseUrl + path + url.search })
      await route.fulfill({ response }); return
    }
    await route.fulfill({ json: path === '/auth/profile' ? actor.user : [] })
  })
  await page.goto('/dashboard/helpdesk/configuracoes')
  return calls
}

async function choose(page: Page, id: string, label: string) {
  await page.locator(`#${id}`).click()
  await page.getByRole('option', { name: label, exact: true }).click()
}

test('admin without Employee saves all governance and category/service inheritance in the real API', async ({ page }) => {
  await login(page, 'admin')
  await page.getByLabel('Alcance do atendimento', { exact: true }).selectOption('ALL_QUEUES')
  await page.getByLabel('Aprovação de abertura', { exact: true }).selectOption('QUEUE_ALL')
  await page.getByLabel('Primeira resposta', { exact: true }).selectOption('ASSIGNMENT')
  await page.getByLabel('SLA na reabertura', { exact: true }).selectOption('NEW_RESOLUTION_CYCLE')
  await page.getByLabel('Iniciar SLA após aprovação', { exact: true }).uncheck()
  await page.getByLabel('Pausar aguardando usuário', { exact: true }).uncheck()
  await page.getByLabel('Pausar aguardando terceiro', { exact: true }).check()
  await page.getByLabel('Exigir aprovação para cancelamento', { exact: true }).check()
  await expect(page.locator('#fallback-approver option', { hasText: 'T16 admin' })).toHaveCount(1)
  await page.getByLabel('Responsável por exceções de aprovação').selectOption(fixture!.actors.admin.user.id)
  const saved = page.waitForResponse(r => r.url().endsWith('/helpdesk/settings') && r.request().method() === 'PATCH')
  await page.getByRole('button', { name: 'Salvar configurações', exact: true }).click()
  expect((await saved).status()).toBe(200)
  await reload(page)
  await expect(page.getByLabel('Alcance do atendimento', { exact: true })).toHaveValue('ALL_QUEUES')
  await expect(page.getByLabel('Aprovação de abertura', { exact: true })).toHaveValue('QUEUE_ALL')
  await expect(page.getByLabel('Primeira resposta', { exact: true })).toHaveValue('ASSIGNMENT')
  await expect(page.getByLabel('SLA na reabertura', { exact: true })).toHaveValue('NEW_RESOLUTION_CYCLE')
  await expect(page.getByLabel('Iniciar SLA após aprovação', { exact: true })).not.toBeChecked()
  await expect(page.getByLabel('Pausar aguardando usuário', { exact: true })).not.toBeChecked()
  await expect(page.getByLabel('Pausar aguardando terceiro', { exact: true })).toBeChecked()
  await expect(page.getByLabel('Exigir aprovação para cancelamento', { exact: true })).toBeChecked()
  await expect(page.getByLabel('Responsável por exceções de aprovação')).toHaveValue(fixture!.actors.admin.user.id)
  await page.getByRole('tab', { name: 'Catálogo', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Criar serviço', exact: true })).toBeDisabled()
  await page.getByLabel('Nome da categoria', { exact: true }).fill('T16 category')
  await page.getByLabel('Primeira resposta (horas)', { exact: true }).fill('4')
  await page.getByLabel('Resolução (horas)', { exact: true }).fill('8')
  await page.getByRole('button', { name: 'Salvar categoria', exact: true }).click()
  await expect(page.getByText('T16 category — 4h / 8h — Ativa', { exact: true })).toBeVisible()
  await page.locator('#catalog-name').fill('T16 service')
  await choose(page, 'catalog-department', 'T16 department')
  await choose(page, 'catalog-category', 'T16 category')
  await page.locator('#service-response').fill('2')
  await page.locator('#service-resolve').fill('12')
  const created = page.waitForResponse(r => r.url().endsWith('/helpdesk/catalog') && r.request().method() === 'POST')
  await page.getByRole('button', { name: 'Criar serviço', exact: true }).click()
  expect((await created).status()).toBe(201)
  await reload(page); await page.getByRole('tab', { name: 'Catálogo', exact: true }).click()
  const row = page.locator('div.flex.items-start').filter({ hasText: 'T16 service' })
  await row.getByRole('button', { name: 'Editar', exact: true }).click()
  await expect(page.locator('#service-response')).toHaveValue('2')
  await expect(page.locator('#service-resolve')).toHaveValue('12')
  await page.locator('#service-response').fill('')
  const patched = page.waitForResponse(r => r.url().includes('/helpdesk/catalog/') && r.request().method() === 'PATCH')
  await page.getByRole('button', { name: 'Salvar serviço', exact: true }).click()
  expect((await patched).status()).toBe(200)
  await reload(page); await page.getByRole('tab', { name: 'Catálogo', exact: true }).click()
  await row.getByRole('button', { name: 'Editar', exact: true }).click()
  await expect(page.locator('#service-response')).toHaveValue('')
  await expect(page.locator('#service-resolve')).toHaveValue('12')
  await page.getByRole('tab', { name: 'Filas', exact: true }).click()
  await page.getByLabel('Fila sob sua gestão').selectOption(fixture!.queueId)
  await expect(page.getByText('T16 candidate', { exact: true })).toBeVisible()
  await expect(page.getByText('T16 foreign', { exact: true })).toHaveCount(0)
  const candidate = page.getByText('T16 candidate', { exact: true }).locator('..').locator('..')
  await candidate.getByRole('button', { name: 'Adicionar membro', exact: true }).click()
  const member = page.getByText('T16 candidate — Ativo', { exact: true }).locator('..')
  await expect(member.getByLabel('Aprovador', { exact: true })).toBeDisabled()
  await expect(member.getByLabel('Gestor delegado', { exact: true })).toBeVisible()
  await expect(page.getByText('Preparar auto-atribuição', { exact: true })).toHaveCount(0)
})

for (const persona of ['head', 'delegate']) {
  test(`${persona} manages only its queue without global settings or delegate nomination`, async ({ page }) => {
    const calls = await login(page, persona)
    await expect(page.getByText('Gestão de membros e filas', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Salvar fila', exact: true })).toBeEnabled()
    await expect(page.getByLabel('Fila sob sua gestão').locator('option')).toHaveCount(1)
    await expect(page.getByRole('tab', { name: 'Configurações', exact: true })).toHaveCount(0)
    await expect(page.getByLabel('Gestor delegado', { exact: true })).toHaveCount(0)
    await expect(page.getByText('T16 foreign', { exact: true })).toHaveCount(0)
    await page.getByLabel('Nome da fila', { exact: true }).fill(`T16 queue ${persona}`)
    const saved = page.waitForResponse(r => r.url().endsWith(`/helpdesk/queues/${fixture!.queueId}`) && r.request().method() === 'PATCH')
    await page.getByRole('button', { name: 'Salvar fila', exact: true }).click()
    expect((await saved).status()).toBe(200)
    await reload(page)
    await expect(page.getByRole('button', { name: 'Salvar fila', exact: true })).toBeEnabled()
    await expect(page.getByLabel('Nome da fila', { exact: true })).toHaveValue(`T16 queue ${persona}`)
    expect(calls).not.toContain('/helpdesk/admin/overview')
  })
}

test('ordinary user has no administration and does not request global data', async ({ page }) => {
  const calls = await login(page, 'ordinary')
  await expect(page.getByRole('alert').filter({ hasText: 'Você não tem permissão para administrar' })).toBeVisible()
  expect(calls).not.toContain('/helpdesk/admin/overview')
  await expect(page.getByRole('button', { name: 'Salvar configurações', exact: true })).toHaveCount(0)
})
