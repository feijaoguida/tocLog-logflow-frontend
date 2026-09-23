import { Badge } from '@/components/ui/badge'

export type TicketIndicators = {
  active: boolean
  unassigned: boolean
  waitingOpeningApproval: boolean
  waitingCancellationApproval: boolean
  approvalNeedsAssignment: boolean
  slaState: string
  overdueFirstResponse: boolean
  overdueResolution: boolean
  historicalResolutionViolation: boolean
}

export function TicketIndicatorsView({ indicators }: { indicators?: TicketIndicators }) {
  if (!indicators) return null
  return <div className="flex flex-wrap gap-1 pt-1" aria-label="Pendências do chamado">
    {indicators.waitingOpeningApproval && <Badge variant="secondary">Abertura pendente</Badge>}
    {indicators.waitingCancellationApproval && <Badge variant="secondary">Cancelamento pendente</Badge>}
    {indicators.approvalNeedsAssignment && <Badge variant="secondary">Aprovação sem responsável</Badge>}
    {indicators.unassigned && <Badge variant="secondary">Atendimento sem responsável</Badge>}
    {indicators.historicalResolutionViolation && <Badge variant="destructive">Violação em ciclo anterior</Badge>}
  </div>
}
