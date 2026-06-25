'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, Clock3, LifeBuoy, ShieldCheck, TimerReset } from 'lucide-react'
import { toast } from 'sonner'

import { MenuFunctionHeader } from '@/components/layout/menu-function-header'
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
  }
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

function getStatusVariant(status: string) {
  if (status === 'RESOLVED' || status === 'CLOSED') return 'success'
  if (status === 'CANCELLED') return 'destructive'
  if (
    status === 'WAITING_APPROVAL' ||
    status === 'WAITING_USER' ||
    status === 'WAITING_THIRD_PARTY'
  ) {
    return 'secondary'
  }
  return 'default'
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
    <div className="app-page">
      <MenuFunctionHeader
        title="Helpdesk > Dashboard"
        description="Resumo inicial da operação do helpdesk por fila, backlog e risco de SLA. Esta visão ajuda a liderança a localizar gargalos e pendências."
        actions={
          <Button variant="outline" onClick={() => void fetchSummary()}>
            Atualizar métricas
          </Button>
        }
      >
        <p className="max-w-3xl text-sm text-muted-foreground">
          Painel inicial focado em volume, filas mais carregadas, aprovações pendentes e
          chamados com risco operacional.
        </p>
      </MenuFunctionHeader>

      {loading ? (
        <div className="app-page text-sm text-muted-foreground">Carregando métricas...</div>
      ) : !summary ? (
        <div className="app-page text-sm text-muted-foreground">Nenhuma métrica disponível.</div>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card className="app-section-card">
              <CardHeader className="p-0">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <LifeBuoy className="h-4 w-4" />
                  Chamados visíveis
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 pt-3 text-3xl font-semibold">
                {summary.totals.totalVisible}
              </CardContent>
            </Card>
            <Card className="app-section-card">
              <CardHeader className="p-0">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <TimerReset className="h-4 w-4" />
                  Ativos
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 pt-3 text-3xl font-semibold">
                {summary.totals.active}
              </CardContent>
            </Card>
            <Card className="app-section-card">
              <CardHeader className="p-0">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Clock3 className="h-4 w-4" />
                  SLA vencido
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 pt-3 text-3xl font-semibold">
                {summary.totals.overdueResolution}
              </CardContent>
            </Card>
            <Card className="app-section-card">
              <CardHeader className="p-0">
                <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <ShieldCheck className="h-4 w-4" />
                  Minhas aprovações
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 pt-3 text-3xl font-semibold">
                {summary.totals.pendingMyApprovals}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <Card className="app-section-card">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="text-xl">Filas com maior carga</CardTitle>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                {summary.queues.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma fila visível para o seu escopo.
                  </p>
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fila</TableHead>
                          <TableHead>Departamento</TableHead>
                          <TableHead>Ativos</TableHead>
                          <TableHead>Sem resp.</TableHead>
                          <TableHead>Aprovação</TableHead>
                          <TableHead>SLA vencido</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {summary.queues.map((queue) => (
                          <TableRow key={queue.queueId}>
                            <TableCell className="font-medium">{queue.queueName}</TableCell>
                            <TableCell>{queue.departmentName || 'Não informado'}</TableCell>
                            <TableCell>{queue.active}</TableCell>
                            <TableCell>{queue.unassigned}</TableCell>
                            <TableCell>{queue.waitingApproval}</TableCell>
                            <TableCell>{queue.overdueResolution}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="app-section-card">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="text-xl">Distribuição por status</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 px-0 pb-0">
                {topStatuses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum chamado contabilizado ainda.
                  </p>
                ) : (
                  topStatuses.map(([status, count]) => (
                    <div
                      key={status}
                      className="flex items-center justify-between rounded-2xl border border-border bg-muted/20 px-4 py-3"
                    >
                      <Badge variant={getStatusVariant(status) as any}>
                        {STATUS_LABELS[status] || status}
                      </Badge>
                      <span className="text-lg font-semibold">{count}</span>
                    </div>
                  ))
                )}

                <div className="grid gap-3 pt-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border bg-muted/20 p-4">
                    <p className="text-sm text-muted-foreground">1ª resposta vencida</p>
                    <p className="mt-2 text-2xl font-semibold">
                      {summary.totals.overdueFirstResponse}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-muted/20 p-4">
                    <p className="text-sm text-muted-foreground">Sem responsável</p>
                    <p className="mt-2 text-2xl font-semibold">
                      {summary.totals.unassigned}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="app-section-card space-y-4">
            <div>
              <h2 className="section-title">Alertas operacionais</h2>
              <p className="text-sm text-muted-foreground">
                Prioridades imediatas para a equipe atuar em SLA, aprovação e triagem.
              </p>
            </div>

            {summary.alerts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center text-sm text-muted-foreground">
                Nenhum alerta operacional crítico no momento.
              </div>
            ) : (
              <div className="grid gap-3">
                {summary.alerts.map((alert) => (
                  <div
                    key={`${alert.type}-${alert.ticketId}`}
                    className="flex flex-col gap-3 rounded-2xl border border-border bg-muted/20 px-4 py-4 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant={
                            alert.type === 'overdue-resolution' ||
                            alert.type === 'overdue-first-response'
                              ? 'destructive'
                              : 'secondary'
                          }
                        >
                          {alert.type === 'overdue-resolution'
                            ? 'SLA resolução'
                            : alert.type === 'overdue-first-response'
                              ? '1ª resposta'
                              : alert.type === 'waiting-approval'
                                ? 'Aprovação'
                                : 'Sem responsável'}
                        </Badge>
                        <span className="text-sm font-semibold">{alert.title}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{alert.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {alert.queueName || 'Sem fila'} · prioridade {alert.priority}
                      </p>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/dashboard/helpdesk/${alert.ticketId}`}>Abrir chamado</Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="app-section-card space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="section-title">Chamados que exigem atenção</h2>
                <p className="text-sm text-muted-foreground">
                  Últimos itens atualizados dentro do seu escopo visível.
                </p>
              </div>
              <Button asChild variant="outline">
                <Link href="/dashboard/helpdesk/queue">Abrir fila operacional</Link>
              </Button>
            </div>

            {summary.recentTickets.length === 0 ? (
              <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-muted/20 px-6 text-center">
                <AlertTriangle className="h-10 w-10 text-muted-foreground/60" />
                <div className="space-y-1">
                  <p className="text-lg font-semibold">Sem chamados recentes</p>
                  <p className="text-sm text-muted-foreground">
                    Quando a operação começar a movimentar tickets, eles aparecerão aqui.
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Chamado</TableHead>
                      <TableHead>Fila</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Responsável</TableHead>
                      <TableHead>Atualizado</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.recentTickets.map((ticket) => (
                      <TableRow key={ticket.id}>
                        <TableCell className="font-medium">#{ticket.code}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{ticket.subject}</div>
                            <div className="text-xs text-muted-foreground">
                              {ticket.serviceCatalogItem?.name || 'Fluxo legado'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{ticket.queue?.name || 'Sem fila'}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(ticket.status) as any}>
                            {STATUS_LABELS[ticket.status] || ticket.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{ticket.assignee?.name || 'Não atribuído'}</TableCell>
                        <TableCell>
                          {new Date(ticket.updatedAt).toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/dashboard/helpdesk/${ticket.id}`}>Detalhe</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
