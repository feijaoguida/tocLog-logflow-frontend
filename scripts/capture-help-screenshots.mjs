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

const targets = [
  { url: 'http://localhost:3000/dashboard', filename: 'dashboard-visao-geral.png', title: 'Dashboard Geral' },
  { url: 'http://localhost:3000/dashboard/users', filename: 'usuarios-listagem.png', title: 'Usuários' },
  { url: 'http://localhost:3000/dashboard/fleet', filename: 'fleet-catalog.png', title: 'Catálogo Geral de Frotas' },
  { url: 'http://localhost:3000/dashboard/portaria', filename: 'portaria.png', title: 'Portaria e Controle de Acesso' },
  { url: 'http://localhost:3000/dashboard/settings/ai', filename: 'ai-settings.png', title: 'Configurações de IA' },
  { url: 'http://localhost:3000/dashboard/settings/ai/assistants', filename: 'ai-assistants.png', title: 'Assistentes de IA' },
  { url: 'http://localhost:3000/dashboard/settings/ai/knowledge', filename: 'ai-knowledge.png', title: 'Base de Conhecimento' },
  { url: 'http://localhost:3000/dashboard/settings/error-logs', filename: 'error-logs.png', title: 'Logs de Erro' },
  { url: 'http://localhost:3000/dashboard/settings/email', filename: 'email-settings.png', title: 'Servidor de E-mail' },
];

async function capture() {
  console.log('Iniciando captura de screenshots das telas do sistema via Playwright...');
  
  const browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
  });

  // Injeta sessão de administrador autenticado
  await context.addInitScript((user) => {
    localStorage.setItem('token', 'preview-token-admin-help');
    localStorage.setItem('user', JSON.stringify(user));
  }, mockAdminUser);

  // Intercepta rotas de autenticação para garantir estado logado
  await context.route('**/auth/profile', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockAdminUser),
    });
  });

  const page = await context.newPage();

  for (const target of targets) {
    const outPath = path.join(outputDir, target.filename);
    console.log(`Capturando [${target.title}]: ${target.url} -> ${target.filename}`);

    try {
      await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      // Aguarda estabilização visual da interface
      await page.waitForTimeout(2500);

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
  console.log(`\nCaptura concluída! Imagens armazenadas em: ${outputDir}`);
}

capture().catch((err) => {
  console.error('Falha geral no script de captura:', err);
  process.exit(1);
});
