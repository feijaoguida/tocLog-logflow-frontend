/**
 * Módulos oficiais e catálogo de aliases canônicos do TocLog.
 * Padronizado em português alinhado aos módulos do sistema.
 */
export const AI_MODULES = {
  GERAL: 'GERAL',
  COMPRAS: 'COMPRAS',
  HELPDESK: 'HELPDESK',
  RH: 'RH',
  FROTAS: 'FROTAS',
  PORTARIA: 'PORTARIA',
} as const;

export type AiModule = (typeof AI_MODULES)[keyof typeof AI_MODULES];

export interface AiModuleOption {
  value: AiModule;
  label: string;
  description: string;
}

export const AI_MODULE_OPTIONS: AiModuleOption[] = [
  {
    value: 'GERAL',
    label: 'Geral / Sistema',
    description: 'Normas gerais, políticas da empresa e procedimentos globais',
  },
  {
    value: 'COMPRAS',
    label: 'Compras e Suprimentos',
    description: 'Ordens de compra, cotações, requisições e fornecedores',
  },
  {
    value: 'HELPDESK',
    label: 'Helpdesk e Chamados',
    description: 'Suporte de TI, chamados operacionais e filas de atendimento',
  },
  {
    value: 'RH',
    label: 'Recursos Humanos',
    description: 'Políticas de RH, admissão, benefícios e férias',
  },
  {
    value: 'FROTAS',
    label: 'Gestão de Frotas',
    description: 'Veículos, manutenções, abastecimento e pneus',
  },
  {
    value: 'PORTARIA',
    label: 'Portaria e Acesso',
    description: 'Controle de entrada e saída, crachás e visitantes',
  },
];

export const AI_MODULE_ALIASES: Record<string, AiModule> = {
  // Compras
  COMPRAS: 'COMPRAS',
  PROCUREMENT: 'COMPRAS',
  PURCHASES: 'COMPRAS',
  SUPRIMENTOS: 'COMPRAS',

  // Helpdesk
  HELPDESK: 'HELPDESK',
  TI: 'HELPDESK',
  SUPPORT: 'HELPDESK',
  SUPORTE: 'HELPDESK',

  // RH
  RH: 'RH',
  HR: 'RH',
  RECURSOS_HUMANOS: 'RH',

  // Frotas
  FROTAS: 'FROTAS',
  FLEET: 'FROTAS',

  // Portaria
  PORTARIA: 'PORTARIA',
  ACCESS_CONTROL: 'PORTARIA',
  PORTARIA_E_CONTROLE_DE_ACESSO: 'PORTARIA',

  // Geral
  GERAL: 'GERAL',
  GENERAL: 'GERAL',
  SISTEMA: 'GERAL',
};

export function resolveAiModule(moduleOrAlias?: string | null): AiModule | null {
  if (!moduleOrAlias) return null;
  const normalized = moduleOrAlias
    .trim()
    .toUpperCase()
    .replace(/[-\s]/g, '_');
  return AI_MODULE_ALIASES[normalized] || null;
}

export function getModuleLabel(moduleKey?: string | null): string {
  const resolved = resolveAiModule(moduleKey);
  const found = AI_MODULE_OPTIONS.find((opt) => opt.value === resolved);
  return found ? found.label : (moduleKey || 'Geral');
}
