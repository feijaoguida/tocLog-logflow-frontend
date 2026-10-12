import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outputDir = path.resolve(__dirname, '../help/images');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const mockAdminUser = {
  id: 'admin-preview-user',
  name: 'Administrador TocLog',
  email: 'admin@toclog.com.br',
  role: { name: 'Administrador' },
  accessType: 'COMPANY_ADMIN',
  companyId: 'company-default-1',
  permissions: ['*'],
  isOnboardingOnly: false,
};

async function captureCompras() {
  console.log('Iniciando captura de screenshots das telas de Compras via Playwright...');

  const browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 850 },
    deviceScaleFactor: 1,
  });

  // Injeta cookie e sessão de administrador autenticado
  await context.addCookies([
    { name: 'token', value: 'preview-token-admin-help', domain: 'localhost', path: '/' },
  ]);

  await context.addInitScript((user) => {
    localStorage.setItem('token', 'preview-token-admin-help');
    localStorage.setItem('user', JSON.stringify(user));
  }, mockAdminUser);

  // Intercepta rotas de autenticação
  await context.route('**/auth/profile', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockAdminUser),
    });
  });

  const page = await context.newPage();

  const targets = [
    {
      url: 'http://localhost:3000/dashboard/compras',
      filename: 'compras-dashboard.png',
      title: 'Dashboard de Compras',
    },
    {
      url: 'http://localhost:3000/dashboard/compras/pedidos',
      filename: 'compras-pedidos-listagem.png',
      title: 'Listagem de Pedidos',
    },
    {
      url: 'http://localhost:3000/dashboard/compras/pedidos/novo',
      filename: 'compras-pedidos-formulario.png',
      title: 'Wizard de Novo Pedido (3 Etapas)',
    },
    {
      url: 'http://localhost:3000/dashboard/compras/cotacoes',
      filename: 'compras-cotacoes-listagem.png',
      title: 'Fila de Cotações',
    },
    {
      url: 'http://localhost:3000/dashboard/compras/ordens',
      filename: 'compras-ordens.png',
      title: 'Ordens de Compra e Lançamento',
    },
    {
      url: 'http://localhost:3000/dashboard/compras/configuracoes',
      filename: 'compras-configuracoes.png',
      title: 'Configurações de Compras e Orçamento',
      action: async (p) => {
        // Tenta alternar para a aba de Gestão Orçamentária se visível
        try {
          const budgetTab = p.locator('button:has-text("Gestão Orçamentária"), [role="tab"]:has-text("Orçamento")');
          if (await budgetTab.count() > 0) {
            await budgetTab.first().click();
            await p.waitForTimeout(600);
          }
        } catch {
          // segue normalmente
        }
      },
    },
    {
      url: 'http://localhost:3000/dashboard/compras/cadastros/produtos',
      filename: 'produtos-listagem.png',
      title: 'Catálogo de Produtos e Histórico de Preços',
    },
  ];

  for (const target of targets) {
    const outPath = path.join(outputDir, target.filename);
    console.log(`Capturando [${target.title}]: ${target.url} -> ${target.filename}`);

    try {
      await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2500);

      if (target.action) {
        await target.action(page);
      }

      await page.screenshot({
        path: outPath,
        fullPage: false,
      });
      console.log(`✓ Salvo com sucesso: ${target.filename}`);
    } catch (err) {
      console.error(`✕ Erro ao capturar ${target.title}: ${err.message}`);
    }
  }

  await browser.close();
  console.log(`\nCaptura concluída com sucesso! Imagens em: ${outputDir}`);
}

captureCompras().catch((err) => {
  console.error('Falha geral no script de captura:', err);
  process.exit(1);
});
