/**
 * Utilitário de leitura e extração de contexto visual da tela ativa no frontend TocLog.
 * Permite ao Agente Pessoal IA saber exatamente qual tela e quais botões de ação estão visíveis.
 */

export interface ScreenSnapshot {
  pathname: string;
  module: string;
  title: string;
  description?: string;
  primaryActions: string[];
  screenDetails?: string;
}

// Mapeamento canônico de rotas para títulos amigáveis de tela
const ROUTE_NAME_MAP: Record<string, { title: string; module: string; defaultActions: string[] }> = {
  '/dashboard/compras/pedidos': {
    title: 'Meus Pedidos de Compra',
    module: 'COMPRAS',
    defaultActions: ['Novo pedido', 'Filtro', 'Buscar'],
  },
  '/dashboard/compras/pedidos/new': {
    title: 'Cadastro de Novo Pedido de Compra',
    module: 'COMPRAS',
    defaultActions: ['Salvar rascunho', 'Enviar para aprovação', 'Adicionar item', 'Cancelar'],
  },
  '/dashboard/compras/cotacoes': {
    title: 'Cotações de Compras',
    module: 'COMPRAS',
    defaultActions: ['Nova cotação', 'Comparar propostas', 'Filtro'],
  },
  '/dashboard/compras/ordens': {
    title: 'Ordens de Compra',
    module: 'COMPRAS',
    defaultActions: ['Nova ordem de compra', 'Exportar relatório'],
  },
  '/dashboard/compras/aprovacoes': {
    title: 'Aprovações de Compras',
    module: 'COMPRAS',
    defaultActions: ['Aprovar selecionados', 'Reprovar', 'Filtro por alçada'],
  },
  '/dashboard/compras/cadastros/fornecedores': {
    title: 'Cadastro de Fornecedores',
    module: 'COMPRAS',
    defaultActions: ['Novo fornecedor', 'Buscar', 'Filtro'],
  },
  '/dashboard/compras/cadastros/produtos': {
    title: 'Catálogo de Produtos e Materiais',
    module: 'COMPRAS',
    defaultActions: ['Novo produto', 'Importar planilha', 'Buscar'],
  },
  '/dashboard/helpdesk': {
    title: 'Central de Chamados (Helpdesk)',
    module: 'HELPDESK',
    defaultActions: ['Novo chamado', 'Filtro de chamados', 'Buscar'],
  },
  '/dashboard/helpdesk/new': {
    title: 'Abertura de Chamado',
    module: 'HELPDESK',
    defaultActions: ['Enviar chamado', 'Anexar arquivo', 'Cancelar'],
  },
  '/dashboard/rh/employees': {
    title: 'Gestão de Colaboradores',
    module: 'RH',
    defaultActions: ['Novo colaborador', 'Exportar listagem', 'Filtro'],
  },
  '/dashboard/rh/employees/new': {
    title: 'Cadastro de Colaborador',
    module: 'RH',
    defaultActions: ['Salvar cadastro', 'Cancelar'],
  },
  '/dashboard/fleet': {
    title: 'Controle de Frotas e Veículos',
    module: 'FROTAS',
    defaultActions: ['Novo veículo', 'Checklist', 'Plano de manutenção'],
  },
  '/dashboard/portaria': {
    title: 'Controle de Acesso e Portaria',
    module: 'PORTARIA',
    defaultActions: ['Registrar entrada', 'Registrar saída', 'Ocorrência'],
  },
};

/**
 * Lê em tempo real a tela do navegador e retorna informações contextuais e botões.
 */
export function getScreenSnapshot(detailed: boolean = false): ScreenSnapshot {
  if (typeof window === 'undefined') {
    return {
      pathname: '',
      module: 'GERAL',
      title: 'Sistema TocLog',
      primaryActions: [],
    };
  }

  const pathname = window.location.pathname;

  // 1. Identificar módulo
  let detectedModule = 'GERAL';
  if (pathname.includes('/compras')) detectedModule = 'COMPRAS';
  else if (pathname.includes('/helpdesk')) detectedModule = 'HELPDESK';
  else if (pathname.includes('/rh')) detectedModule = 'RH';
  else if (pathname.includes('/fleet') || pathname.includes('/frotas')) detectedModule = 'FROTAS';
  else if (pathname.includes('/portaria')) detectedModule = 'PORTARIA';

  // 2. Tentar ler título a partir do DOM (h1 ou h2 do conteúdo principal)
  let screenTitle = '';
  const h1El = document.querySelector('main h1, .app-page h1, [role="main"] h1, h1');
  if (h1El && h1El.textContent?.trim()) {
    screenTitle = h1El.textContent.trim().replace(/\s+/g, ' ');
  }

  // Se não encontrou h1, consultar a tabela de rotas ou document.title
  if (!screenTitle || screenTitle.toLowerCase() === 'toclog') {
    const routeConfig = ROUTE_NAME_MAP[pathname];
    if (routeConfig) {
      screenTitle = routeConfig.title;
      detectedModule = routeConfig.module;
    } else {
      screenTitle = document.title ? document.title.split('-')[0].trim() : 'Painel de Controle';
    }
  }

  // 3. Descrição / subtítulo da tela
  let screenDescription = '';
  const descEl = document.querySelector('main h1 + p, .app-page h1 + p, [role="main"] h1 + p');
  if (descEl && descEl.textContent?.trim()) {
    screenDescription = descEl.textContent.trim().replace(/\s+/g, ' ');
  }

  // 4. Botões de ação visíveis na página
  const actionsSet = new Set<string>();

  // Primeiro incluir padrões da rota conhecida se aplicável
  if (ROUTE_NAME_MAP[pathname]?.defaultActions) {
    ROUTE_NAME_MAP[pathname].defaultActions.forEach((a) => actionsSet.add(a));
  }

  // Escanear botões visíveis no DOM (ignorando o chat do agente e do chat interno)
  try {
    const actionElements = document.querySelectorAll(
      'main button, main a[role="button"], .app-page button, .app-page a[role="button"]'
    );

    actionElements.forEach((el) => {
      // Ignorar elementos ocultos ou dentro de widgets flutuantes
      if ((el as HTMLElement).offsetParent === null) return;
      if (el.closest('[data-ai-widget="true"]') || el.closest('[data-chat-widget="true"]')) return;

      const text = el.textContent?.trim().replace(/\s+/g, ' ') || '';
      // Filtrar textos genéricos ou de paginação
      if (
        text &&
        text.length >= 2 &&
        text.length <= 35 &&
        !['<', '>', 'anterior', 'próximo', '1', '2', '3'].includes(text.toLowerCase())
      ) {
        actionsSet.add(text);
      }
    });
  } catch {
    // Fallback silencioso caso ocorra restrição de DOM
  }

  const primaryActions = Array.from(actionsSet).slice(0, 8);

  // 5. Leitura detalhada sob demanda (quando o usuário pedir para ler a tela)
  let screenDetails: string | undefined = undefined;
  if (detailed) {
    const detailsLines: string[] = [];

    // Tentar ler colunas de tabelas visíveis
    const ths = Array.from(document.querySelectorAll('main th, .app-page th'))
      .map((th) => th.textContent?.trim())
      .filter(Boolean) as string[];

    if (ths.length > 0) {
      detailsLines.push(`• Colunas da Tabela: ${Array.from(new Set(ths)).join(', ')}`);
      const trCount = document.querySelectorAll('main tbody tr, .app-page tbody tr').length;
      if (trCount > 0) {
        detailsLines.push(`• Total de registros visíveis na página: ${trCount}`);
      }
    }

    // Tentar ler cartões de métricas / contadores rápidos (ex: "Total: 12", "Rascunhos: 3")
    const statCards = Array.from(
      document.querySelectorAll('main [class*="card"] h3, main [class*="card"] .text-2xl, .app-page .text-2xl')
    )
      .map((el) => el.textContent?.trim())
      .filter(Boolean);

    if (statCards.length > 0) {
      detailsLines.push(`• Métricas/Contadores da tela: ${statCards.slice(0, 6).join(' | ')}`);
    }

    if (detailsLines.length > 0) {
      screenDetails = detailsLines.join('\n');
    }
  }

  return {
    pathname,
    module: detectedModule,
    title: screenTitle,
    description: screenDescription || undefined,
    primaryActions,
    screenDetails,
  };
}
