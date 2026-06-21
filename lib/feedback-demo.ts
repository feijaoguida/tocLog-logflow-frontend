export type FeedbackStatus = 'OPEN' | 'IN_REVIEW' | 'ANSWERED' | 'CLOSED'
export type FeedbackType = 'EMPLOYEE_TO_COMPANY' | 'COMPANY_TO_EMPLOYEE' | 'ONE_TO_ONE'

export type FeedbackRecord = {
  id: string
  title: string
  description: string
  status: FeedbackStatus
  type: FeedbackType
  category: 'SUGGESTION' | 'COMPLAINT' | 'PRAISE' | 'IMPROVEMENT_IDEA' | 'REPORT'
  createdAt: string
  authorLabel: string
  targetLabel?: string
  isAnonymous: boolean
  visibleToHr: boolean
  requiresReadConfirmation?: boolean
}

export type SurveyRecord = {
  id: string
  title: string
  type: 'SATISFACTION' | 'NPS'
  status: 'ACTIVE' | 'INACTIVE'
  responseRate: number
  averageScore?: number
}

export const demoFeedbacks: FeedbackRecord[] = [
  {
    id: 'fb-company-001',
    title: 'Sugestao para reajuste do fluxo de atestados',
    description:
      'Fluxo enviado para empresa com anonimato ativo e triagem do RH para reduzir retrabalho entre filial e matriz.',
    status: 'IN_REVIEW',
    type: 'EMPLOYEE_TO_COMPANY',
    category: 'SUGGESTION',
    createdAt: '2026-06-19T10:15:00.000Z',
    authorLabel: 'Colaborador anonimo',
    isAnonymous: true,
    visibleToHr: true,
  },
  {
    id: 'fb-company-002',
    title: 'Reconhecimento por resultado do fechamento mensal',
    description:
      'Feedback corporativo enviado pelo RH ao colaborador com confirmacao obrigatoria de leitura.',
    status: 'ANSWERED',
    type: 'COMPANY_TO_EMPLOYEE',
    category: 'PRAISE',
    createdAt: '2026-06-18T14:00:00.000Z',
    authorLabel: 'RH Corporativo',
    targetLabel: 'Ana Paula',
    isAnonymous: false,
    visibleToHr: true,
    requiresReadConfirmation: true,
  },
  {
    id: 'fb-peer-001',
    title: 'Alinhamento sobre cobertura de turno',
    description:
      'Feedback 1 para 1 privado entre colaboradores da mesma empresa. Nao aparece para RH neste caso.',
    status: 'OPEN',
    type: 'ONE_TO_ONE',
    category: 'IMPROVEMENT_IDEA',
    createdAt: '2026-06-20T08:40:00.000Z',
    authorLabel: 'Carlos Eduardo',
    targetLabel: 'Marina Souza',
    isAnonymous: false,
    visibleToHr: false,
  },
  {
    id: 'fb-peer-002',
    title: 'Denuncia sobre abordagem inadequada em rota',
    description:
      'Caso reportado como denuncia, com visibilidade ampliada para RH e trilha de auditoria preservada.',
    status: 'IN_REVIEW',
    type: 'ONE_TO_ONE',
    category: 'REPORT',
    createdAt: '2026-06-20T07:10:00.000Z',
    authorLabel: 'Colaborador identificado internamente',
    targetLabel: 'Destinatario reservado',
    isAnonymous: false,
    visibleToHr: true,
  },
]

export const demoSurveys: SurveyRecord[] = [
  {
    id: 'survey-sat-001',
    title: 'Pulso semanal de satisfacao do colaborador',
    type: 'SATISFACTION',
    status: 'ACTIVE',
    responseRate: 72,
    averageScore: 3.2,
  },
  {
    id: 'survey-nps-001',
    title: 'NPS da experiencia de onboarding',
    type: 'NPS',
    status: 'ACTIVE',
    responseRate: 64,
    averageScore: 8.1,
  },
]

export function adaptDemoFeedbacks() {
  return demoFeedbacks.map((feedback) => ({
    id: feedback.id,
    title: feedback.title,
    description: feedback.description,
    status: feedback.status,
    type: feedback.type,
    category: feedback.category,
    createdAt: feedback.createdAt,
    updatedAt: feedback.createdAt,
    createdById: feedback.id,
    createdByDisplayName: feedback.authorLabel,
    isAnonymous: feedback.isAnonymous,
    isVisibleToHR: feedback.visibleToHr,
    requiresReadConfirmation: Boolean(feedback.requiresReadConfirmation),
    targetEmployee: feedback.targetLabel
      ? {
          id: `${feedback.id}-target`,
          user: {
            name: feedback.targetLabel,
          },
        }
      : null,
  }))
}
