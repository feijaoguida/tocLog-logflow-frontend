'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Clock3,
  Eye,
  Inbox,
  LifeBuoy,
  RotateCw,
  ShieldAlert,
  ShieldCheck,
  TimerReset,
} from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TicketIndicatorsView, type TicketIndicators } from '../indicators'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'

type MetricsSummary = {
  totals: {
    totalVisible: number
    active: number
    waitingApproval: number
    unassigned: number
    overdueFirstResponse: number
    overdueResolution: number
    assignedToMe: number
    pendingMyApprovals: number
    waitingCancellation: number
    approvalNeedsAssignment: number
    historicalResolutionViolations: number
    completedFirstResponse: number
    completedResolution: number
  }
  slaStateCounts: Record<string, number>
  statusCounts: Record<string, number>
  queues: Array<{
    queueId: string
    queueName: string
    departmentName: string | null
    total: number
    active: number
    unassigned: number
    waitingApproval: number
    overdueResolution: number
  }>
  alerts: Array<{
    type: string
    title: string
    description: string
    ticketId: string
    code: number
    queueName: string | null
    priority: string
  }>
  recentTickets: Array<{
    indicators?: TicketIndicators
    id: string
    code: number
    subject: string
    status: string
    priority: string
    updatedAt: string
    resolutionDueDate?: string | null
    queue?: { name: string } | null
    assignee?: { name: string } | null
    requester?: { name: string } | null
    serviceCatalogItem?: { name: string } | null
  }>
}

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Aberto',
  IN_PROGRESS: 'Em atendimento',
  WAITING_USER: 'Aguardando usuário',
  RESOLVED: 'Resolvido',
  CLOSED: 'Fechado',
  REOPENED: 'Reaberto',
  NEW: 'Novo',
  TRIAGE: 'Em triagem',
  WAITING_ASSIGNMENT: 'Aguardando atendimento',
  WAITING_THIRD_PARTY: 'Aguardando terceiro',
  WAITING_APPROVAL: 'Aguardando aprovação',
  CANCELLED: 'Cancelado',
}

function getInitials(name?: string | null) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function getStatusBadgeStyle(status: string) {
  switch (status) {
    case 'WAITING_ASSIGNMENT':
    case 'NEW':
      return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60'
    case 'IN_PROGRESS':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60'
    case 'WAITING_USER':
    case 'WAITING_THIRD_PARTY':
    case 'WAITING_APPROVAL':
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60'
    case 'RESOLVED':
    case 'CLOSED':
      return 'bg-muted text-muted-foreground border-border'
    default:
      return 'bg-secondary text-secondary-foreground border-border'
  }
}

export default function HelpdeskMetricsPage() {
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<MetricsSummary | null>(null)

  useEffect(() => {
    void fetchSummary()
  }, [])

  async function fetchSummary() {
    setLoading(true)
    try {
      const { data } = await api.get<MetricsSummary>('/helpdesk/metrics/summary')
      setSummary(data)
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, 'Não foi possível carregar os indicadores do helpdesk.'),
      )
    } finally {
      setLoading(false)
    }
  }

  const topStatuses = useMemo(() => {
    return Object.entries(summary?.statusCounts ?? {})
      .sort((left, right) => right[1] - left[1])
      .slice(0, 6)
  }, [summary?.statusCounts])

  return (
    <div className="app-page space-y-6">
      {/* Page Header */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Métricas e Indicadores
          </h1>
          <p className="text-sm text-muted-foreground">
            Visão executiva da operação por fila, gargalos de atendimento e riscos de SLA.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm" className="h-9 gap-1.5 font-semibold">
            <Link href="/dashboard/helpdesk/queue">
              <Inbox className="size-4" />
              <span>Ver Fila Operacional</span>
            </Link>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            onClick={() => void fetchSummary()}
            disabled={loading}
          >
            <RotateCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </Button>
        </div>
      </section>

      {loading ? (
        <Card className="app-section-card p-12 text-center text-sm text-muted-foreground">
          <RotateCw className="mx-auto mb-2 size-6 animate-spin text-primary" />
          <span>Carregando métricas operacionais...</span>
        </Card>
      ) : !summary ? (
        <Card className="app-section-card p-12 text-center text-sm text-muted-foreground">
          Nenhuma métrica disponível para o seu escopo no momento.
        </Card>
      ) : (
        <>
          {/* Cards de Resumo Operacional (KPIs em 4 colunas) */}
          <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {/* Card 1: Visíveis */}
            <Card className="app-section-card p-4 transition-all hover:shadow-xs">
              <CardHeader className="p-0">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Chamados Visíveis
                </span>
              </CardHeader>
              <CardContent className="p-0 pt-2">
                <span className="text-3xl font-bold tracking-tight text-foreground">
                  {summary.totals.totalVisible}
                </span>
              </CardContent>
            </Card>

            {/* Card 2: Ativos */}
            <Card className="app-section-card p-4 transition-all hover:shadow-xs">
              <CardHeader className="p-0">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Em Andamento (Ativos)
                </span>
              </CardHeader>
              <CardContent className="p-0 pt-2">
                <span className="text-3xl font-bold tracking-tight text-foreground">
                  {summary.totals.active}
                </span>
              </CardContent>
            </Card>

            {/* Card 3: SLA Violado */}
            <Card className="app-section-card p-4 transition-all hover:shadow-xs">
              <CardHeader className="p-0">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  SLA Resolução Violado
                </span>
              </CardHeader>
              <CardContent className="p-0 pt-2 flex items-baseline gap-2">
                <span
                  className={`text-3xl font-bold tracking-tight ${
                    summary.totals.overdueResolution > 0
                      ? 'text-destructive'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {summary.totals.overdueResolution}
                </span>
                {summary.totals.overdueResolution > 0 && (
                  <span className="rounded-md bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                    Crítico
                  </span>
                )}
              </CardContent>
            </Card>

            {/* Card 4: Minhas Aprovações */}
            <Card className="app-section-card p-4 transition-all hover:shadow-xs">
              <CardHeader className="p-0">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Minhas Aprovações
                </span>
              </CardHeader>
              <CardContent className="p-0 pt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight text-foreground">
                  {summary.totals.pendingMyApprovals}
                </span>
                {summary.totals.pendingMyApprovals > 0 && (
                  <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                    Ação necessária
                  </span>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Grid de Métricas Secundárias / Estados de SLA */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Métricas de SLA, Ciclos e Governança
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {[
                ['SLA em execução', summary.slaStateCounts.ACTIVE ?? 0, 'text-foreground'],
                ['SLA pausado', summary.slaStateCounts.PAUSED ?? 0, 'text-muted-foreground'],
                ['SLA não iniciado', summary.slaStateCounts.NOT_STARTED ?? 0, 'text-muted-foreground'],
                ['1ª resposta cumprida', summary.totals.completedFirstResponse, 'text-emerald-600 dark:text-emerald-400'],
                ['Resolução cumprida', summary.totals.completedResolution, 'text-emerald-600 dark:text-emerald-400'],
                ['Violação ciclo anterior', summary.totals.historicalResolutionViolations, 'text-amber-600 dark:text-amber-400'],
                ['Abertura pendente', summary.totals.waitingApproval, 'text-foreground'],
                ['Cancelamento pendente', summary.totals.waitingCancellation, 'text-foreground'],
                ['Aprovação sem resp.', summary.totals.approvalNeedsAssignment, summary.totals.approvalNeedsAssignment > 0 ? 'text-destructive' : 'text-foreground'],
                ['SLA legado', summary.slaStateCounts.LEGACY ?? 0, 'text-muted-foreground'],
              ].map(([label, count, colorClass]) => (
                <Card key={label as string} className="app-section-card p-3 shadow-2xs">
                  <p className="text-[11px] font-medium text-muted-foreground truncate">
                    {label as string}
                  </p>
                  <p className={`mt-1 text-xl font-bold tracking-tight ${colorClass as string}`}>
                    {count as number}
                  </p>
                </Card>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              * Cumprido indica relógio encerrado dentro da meta; violações permanecem contabilizadas mesmo após pausa.
            </p>
          </section>

          {/* Painel Duplo: Filas com Maior Carga & Distribuição por Status */}
          <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            {/* Tabela de Filas */}
            <Card className="app-section-card overflow-hidden p-0 shadow-xs">
              <CardHeader className="px-6 py-4 border-b">
                <CardTitle className="text-base font-bold">Filas com Maior Carga</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {summary.queues.length === 0 ? (
                  <p className="p-6 text-sm text-muted-foreground">
                    Nenhuma fila visível para o seu escopo.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="min-w-[160px]">Fila</TableHead>
                        <TableHead className="text-center w-[70px]">Ativos</TableHead>
                        <TableHead className="text-center w-[80px]">Sem Resp.</TableHead>
                        <TableHead className="text-center w-[80px]">Aprovação</TableHead>
                        <TableHead className="text-right min-w-[110px]">SLA Violado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summary.queues.map((queue) => (
                        <TableRow key={queue.queueId} className="transition-colors">
                          <TableCell>
                            <div className="font-semibold text-foreground text-sm">
                              {queue.queueName}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {queue.departmentName || 'Geral'}
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {queue.active}
                          </TableCell>
                          <TableCell className="text-center">
                            {queue.unassigned > 0 ? (
                              <span className="inline-flex rounded-md bg-amber-500/10 px-1.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                                {queue.unassigned}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">0</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center text-xs font-medium">
                            {queue.waitingApproval}
                          </TableCell>
                          <TableCell className="text-right">
                            {queue.overdueResolution > 0 ? (
                              <span className="inline-flex rounded-md bg-destructive/10 px-2 py-0.5 text-xs font-bold text-destructive">
                                {queue.overdueResolution}
                              </span>
                            ) : (
                              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                                0
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Distribuição por Status */}
            <Card className="app-section-card p-5 shadow-xs flex flex-col justify-between">
              <div className="space-y-4">
                <CardTitle className="text-base font-bold">Distribuição por Status</CardTitle>

                {topStatuses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum chamado contabilizado ainda.</p>
                ) : (
                  <div className="space-y-2">
                    {topStatuses.map(([status, count]) => (
                      <div
                        key={status}
                        className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-sm"
                      >
                        <span
                          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${getStatusBadgeStyle(
                            status,
                          )}`}
                        >
                          {STATUS_LABELS[status] || status}
                        </span>
                        <span className="font-bold text-foreground">{count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-4 border-t mt-4">
                <div className="rounded-lg border border-border bg-muted/20 p-3">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    1ª Resposta Vencida
                  </p>
                  <p className="mt-1 text-2xl font-bold tracking-tight text-destructive">
                    {summary.totals.overdueFirstResponse}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 p-3">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Sem Responsável
                  </p>
                  <p className="mt-1 text-2xl font-bold tracking-tight text-amber-700 dark:text-amber-400">
                    {summary.totals.unassigned}
                  </p>
                </div>
              </div>
            </Card>
          </section>

          {/* Alertas Operacionais */}
          <section className="space-y-3">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-foreground">
                Alertas Operacionais Imediatos
              </h2>
              <p className="text-xs text-muted-foreground">
                Prioridades imediatas para atuação em SLA, aprovações pendentes ou falta de atribuição.
              </p>
            </div>

            {summary.alerts.length === 0 ? (
              <Card className="app-section-card p-8 text-center text-sm text-muted-foreground">
                <ShieldCheck className="mx-auto mb-2 size-8 text-emerald-600 dark:text-emerald-400" />
                <p className="font-semibold text-foreground">Nenhum alerta operacional crítico</p>
                <p className="text-xs text-muted-foreground">Todos os chamados estão dentro dos parâmetros normais.</p>
              </Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {summary.alerts.map((alert) => (
                  <Card
                    key={`${alert.type}-${alert.ticketId}`}
                    className="app-section-card p-4 flex flex-col justify-between transition-all hover:shadow-xs"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-bold ${
                            alert.type === 'overdue-resolution' || alert.type === 'overdue-first-response'
                              ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
                              : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300'
                          }`}
                        >
                          {alert.type === 'overdue-resolution'
                            ? 'SLA Resolução'
                            : alert.type === 'overdue-first-response'
                            ? '1ª Resposta'
                            : alert.type === 'waiting-approval'
                            ? 'Aprovação'
                            : 'Sem Responsável'}
                        </span>
                        <span className="text-xs font-semibold text-muted-foreground">
                          #{alert.code}
                        </span>
                      </div>

                      <p className="text-sm font-semibold text-foreground line-clamp-1">{alert.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{alert.description}</p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t mt-3">
                      <span className="text-[11px] text-muted-foreground truncate max-w-[160px]">
                        {alert.queueName || 'Sem fila'} · Prio {alert.priority}
                      </span>
                      <Button asChild variant="outline" size="sm" className="h-7 text-xs gap-1">
                        <Link href={`/dashboard/helpdesk/${alert.ticketId}`}>
                          <span>Ver</span>
                          <ArrowRight className="size-3" />
                        </Link>
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* Tabela de Chamados que Exigem Atenção */}
          <section className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-foreground">
                  Chamados que Exigem Atenção
                </h2>
                <p className="text-xs text-muted-foreground">
                  Últimos chamados movimentados que demandam ação ou acompanhamento.
                </p>
              </div>
              <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 font-medium">
                <Link href="/dashboard/helpdesk/queue">
                  <Inbox className="size-4" />
                  <span>Abrir Fila Operacional</span>
                </Link>
              </Button>
            </div>

            <Card className="app-section-card overflow-hidden p-0 shadow-xs">
              {summary.recentTickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 p-12 text-center text-muted-foreground">
                  <AlertTriangle className="size-8 text-muted-foreground/50" />
                  <p className="text-sm font-medium">Sem chamados recentes no seu escopo.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[80px]">ID</TableHead>
                      <TableHead className="min-w-[240px]">Chamado / Catálogo</TableHead>
                      <TableHead className="min-w-[180px]">Fila / Solicitante</TableHead>
                      <TableHead className="min-w-[200px]">Status / Responsável</TableHead>
                      <TableHead className="w-[100px] text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.recentTickets.map((ticket) => {
                      const assigneeName = ticket.assignee?.name

                      return (
                        <TableRow key={ticket.id} className="transition-colors">
                          <TableCell className="font-semibold text-muted-foreground text-sm">
                            #{ticket.code}
                          </TableCell>

                          <TableCell>
                            <div className="space-y-0.5">
                              <Link
                                href={`/dashboard/helpdesk/${ticket.id}`}
                                className="font-semibold text-foreground text-sm hover:underline line-clamp-1"
                              >
                                {ticket.subject}
                              </Link>
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {ticket.serviceCatalogItem?.name || 'Fluxo direto'}
                              </p>
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                                <span className="size-2 rounded-full bg-primary shrink-0" />
                                <span className="truncate">{ticket.queue?.name || 'Sem fila'}</span>
                              </div>
                              <p className="text-xs text-muted-foreground truncate">
                                {ticket.requester?.name || 'Solicitante não identificado'}
                              </p>
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${getStatusBadgeStyle(
                                    ticket.status,
                                  )}`}
                                >
                                  {STATUS_LABELS[ticket.status] || ticket.status}
                                </span>
                                <TicketIndicatorsView indicators={ticket.indicators} />
                              </div>

                              <div className="flex items-center gap-1.5">
                                {assigneeName ? (
                                  <>
                                    <span className="flex size-5 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                                      {getInitials(assigneeName)}
                                    </span>
                                    <span className="text-xs text-muted-foreground truncate">
                                      {assigneeName}
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-xs text-muted-foreground italic">
                                    Atendimento sem responsável
                                  </span>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="text-right">
                            <Button
                              asChild
                              variant="ghost"
                              size="icon-sm"
                              className="text-muted-foreground hover:text-foreground"
                              title="Ver detalhes do chamado"
                            >
                              <Link href={`/dashboard/helpdesk/${ticket.id}`}>
                                <Eye className="size-4" />
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </Card>
          </section>
        </>
      )}
    </div>
  )
}
