import { test, expect } from '@playwright/test'

test.describe('Projeções RH e Cargo Separado de Perfil (INT26-T18)', () => {
  test.beforeEach(async ({ page }) => {
    // Mock de lista de funcionários com distinção entre JobPosition e Role
    await page.route('**/employees', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'emp-101',
              cpf: '12345678900',
              status: 'ACTIVE',
              legacyRole: 'ANALISTA_LOG',
              user: {
                id: 'usr-1',
                name: 'Carlos Oliveira',
                email: 'carlos.oliveira@empresa.com.br',
              },
              role: {
                id: 'role-operator',
                name: 'Operador Logístico',
              },
              jobPosition: {
                id: 'pos-sr-analyst',
                name: 'Analista de Operações Sênior',
              },
              department: {
                name: 'Logística Reversa',
              },
              branch: {
                name: 'Matriz SP',
              },
            },
            {
              id: 'emp-102',
              cpf: '98765432100',
              status: 'ACTIVE',
              legacyRole: null,
              user: {
                id: 'usr-2',
                name: 'Mariana Lima',
                email: 'mariana.lima@empresa.com.br',
              },
              role: {
                id: 'role-admin',
                name: 'Administrador RH',
              },
              jobPosition: null, // Sem cargo organizacional vinculado
              department: {
                name: 'Recursos Humanos',
              },
              branch: {
                name: 'Matriz SP',
              },
            },
          ]),
        })
      } else {
        await route.continue()
      }
    })

    // Mock de cargos
    await page.route('**/job-positions', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'pos-sr-analyst', name: 'Analista de Operações Sênior' },
          { id: 'pos-mgr', name: 'Gerente Departamental' },
        ]),
      })
    })

    // Mock de perfis (roles)
    await page.route('**/roles', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'role-operator', name: 'Operador Logístico' },
          { id: 'role-admin', name: 'Administrador RH' },
        ]),
      })
    })

    // Mock de departamentos
    await page.route('**/departments', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'dept-1',
            name: 'Logística Reversa',
            parentId: 'dept-root',
            parent: { id: 'dept-root', name: 'Operações Nacionais' },
            headManager: null, // Pendente de gestor
            branch: { id: 'br-1', name: 'Matriz SP' },
            active: true,
          },
        ]),
      })
    })

    // Mock de filiais
    await page.route('**/branches', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'br-1', name: 'Matriz SP' },
        ]),
      })
    })
  })

  test('AC-01 & C09: Exibe Cargo Organizacional separado de Perfil de Acesso na listagem', async ({ page }) => {
    await page.goto('/dashboard/rh/employees')

    // Funcionário 1: possui JobPosition diferente de Role
    await expect(page.getByText('Carlos Oliveira')).toBeVisible()
    await expect(page.getByText('Analista de Operações Sênior')).toBeVisible()
    await expect(page.getByText('Perfil: Operador Logístico')).toBeVisible()

    // Funcionário 2: jobPosition é null -> exibe 'Não informado', sem fallback para o Role
    await expect(page.getByText('Mariana Lima')).toBeVisible()
    await expect(page.getByText('Não informado')).toBeVisible()
    await expect(page.getByText('Perfil: Administrador RH')).toBeVisible()
  })

  test('AC-01 & C19: Ficha do colaborador apresenta cargo e perfil separadamente e histórico renomeado', async ({ page }) => {
    await page.route('**/employees/emp-101', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'emp-101',
          user: { name: 'Carlos Oliveira', email: 'carlos.oliveira@empresa.com.br' },
          role: { id: 'role-operator', name: 'Operador Logístico' },
          jobPosition: { id: 'pos-sr-analyst', name: 'Analista de Operações Sênior' },
          registration: 'MATR-101',
        }),
      })
    })

    await page.route('**/employees/emp-101/history', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            actionType: 'ROLE',
            date: '2026-10-10T12:00:00Z',
            oldDisplay: 'Visualizador',
            newDisplay: 'Operador Logístico',
          },
        ]),
      })
    })

    await page.goto('/dashboard/rh/employees/emp-101')

    // Valida exibição separada no cabeçalho
    await expect(page.getByRole('heading', { name: 'Carlos Oliveira' })).toBeVisible()
    await expect(page.getByText('Analista de Operações Sênior')).toBeVisible()
    await expect(page.getByText('• Perfil: Operador Logístico')).toBeVisible()

    // Valida histórico de alteração rotulado como perfil
    await expect(page.getByText('Mudança de Perfil de Acesso')).toBeVisible()
  })

  test('Passo 3: Tela de departamentos exibe departamento pai e pendência de gestor responsável', async ({ page }) => {
    await page.goto('/dashboard/rh/departments')

    await expect(page.getByText('Logística Reversa')).toBeVisible()
    // Exibe departamento pai
    await expect(page.getByText('Subordinado a: Operações Nacionais')).toBeVisible()
    // Exibe aviso de gestor pendente
    await expect(page.getByText('Sem gestor definido (Pendente)')).toBeVisible()
  })
})
