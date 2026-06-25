'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Filter, Inbox, Search, ShieldCheck, UserCheck } from 'lucide-react'
import { toast } from 'sonner'

import { MenuFunctionHeader } from '@/components/layout/menu-function-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAuth } from '@/context/auth-context'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'

type QueueOption = {
  id: string
  name: string
  department?: { name?: string | null } | null
}

type QueueTicket = {
  id: string
  code: number
  subject: string
  status: string
  priority: string
  createdAt: string
  resolutionDueDate?: string | null
  queue?: { id: string; name: string } | null
  requester?: { user?: { name?: string | null } | null } | null
  assignee?: { user?: { name?: string | null } | null } | null
  serviceCatalogItem?: { name: string } | null
}

type HelpdeskSummary = {
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

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',
}

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'Todos os status' },
  { value: 'WAITING_ASSIGNMENT', label: 'Aguardando atendimento' },
  { value: 'IN_PROGRESS', label: 'Em atendimento' },
  { value: 'WAITING_APPROVAL', label: 'Aguardando aprovação' },
  { value: 'WAITING_USER', label: 'Aguardando usuário' },
  { value: 'REOPENED', label: 'Reabertos' },
  { value: 'RESOLVED', label: 'Resolvidos' },
  { value: 'CLOSED', label: 'Fechados' },
]

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

export default function HelpdeskQueuePage() {
  const { hasPermission } = useAuth()
  const [loading, setLoading] = useState(true)
  const [actingTicketId, setActingTicketId] = useState<string | null>(null)
  const [tickets, setTickets] = useState<QueueTicket[]>([])
  const [queues, setQueues] = useState<QueueOption[]>([])
  const [summary, setSummary] = useState<HelpdeskSummary | null>(null)
  const [search, setSearch] = useState('')
  const [queueId, setQueueId] = useState('all')
  const [status, setStatus] = useState('ALL')
  const [onlyMine, setOnlyMine] = useState(false)
  const [unassignedOnly, setUnassignedOnly] = useState(false)

  const canManage = hasPermission('helpdesk.ticket.manage')

  useEffect(() => {
    void loadQueueContext()
  }, [queueId, status, onlyMine, unassignedOnly])

  async function loadQueueContext() {
    setLoading(true)

    try {
      const query = new URLSearchParams()
      if (queueId !== 'all') query.set('queueId', queueId)
      if (status !== 'ALL') query.set('status', status)
      if (search.trim()) query.set('search', search.trim())
      if (onlyMine) query.set('onlyMine', 'true')
      if (unassignedOnly) query.set('unassignedOnly', 'true')

      const [{ data: queueData }, { data: ticketsData }, { data: summaryData }] =
        await Promise.all([
          api.get<QueueOption[]>('/helpdesk/queues'),
          api.get<QueueTicket[]>(`/helpdesk/queue/tickets?${query.toString()}`),
          api.get<HelpdeskSummary>('/helpdesk/metrics/summary'),
        ])

      setQueues(queueData)
      setTickets(ticketsData)
      setSummary(summaryData)
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, 'Não foi possível carregar a fila operacional.'),
      )
    } finally {
      setLoading(false)
    }
  }

  async function runAction(
    ticketId: string,
    endpoint: string,
    successMessage: string,
    payload?: Record<string, unknown>,
  ) {
    setActingTicketId(ticketId)
    try {
      await api.post(endpoint, payload ?? {})
      toast.success(successMessage)
      await loadQueueContext()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível executar a ação.'))
    } finally {
      setActingTicketId(null)
    }
  }

  async function handleReject(ticketId: string) {
    const reason = window.prompt('Informe o motivo da reprovação deste chamado:')
    if (!reason?.trim()) return
    await runAction(ticketId, `/helpdesk/tickets/${ticketId}/reject`, 'Chamado reprovado.', {
      reason,
    })
  }

  async function handleResolve(ticketId: string) {
    const reason = window.prompt('Deseja registrar uma observação de resolução?') ?? ''
    await runAction(ticketId, `/helpdesk/tickets/${ticketId}/resolve`, 'Chamado resolvido.', {
      reason: reason.trim() || undefined,
    })
  }

  async function handleClose(ticketId: string) {
    const reason = window.prompt('Deseja registrar uma observação de fechamento?') ?? ''
    await runAction(ticketId, `/helpdesk/tickets/${ticketId}/close`, 'Chamado fechado.', {
      reason: reason.trim() || undefined,
    })
  }

  const selectedQueueLabel = useMemo(() => {
    if (queueId === 'all') return 'Todas as filas'
    return queues.find((item) => item.id === queueId)?.name || 'Fila selecionada'
  }, [queueId, queues])

  return (
    <div className="app-page">
      <MenuFunctionHeader
        title="Helpdesk > Atendimento"
        description="Fila operacional do atendimento interno. Use esta visão para assumir chamados, acompanhar SLAs e tratar aprovações pendentes."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="rounded-full px-4 py-2">
              {selectedQueueLabel}
            </Badge>
            <Button variant="outline" onClick={() => void loadQueueContext()}>
              Atualizar
            </Button>
          </div>
        }
      >
        <p className="max-w-3xl text-sm text-muted-foreground">
          A visão já respeita as filas acessíveis ao seu perfil e ajuda a priorizar
          chamados sem responsável, SLAs em risco e aprovações travadas.
        </p>
      </MenuFunctionHeader>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="app-section-card">
          <CardHeader className="p-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Visíveis</CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-3 text-3xl font-semibold">
            {summary?.totals.totalVisible ?? 0}
          </CardContent>
        </Card>
        <Card className="app-section-card">
          <CardHeader className="p-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sem responsável</CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-3 text-3xl font-semibold">
            {summary?.totals.unassigned ?? 0}
          </CardContent>
        </Card>
        <Card className="app-section-card">
          <CardHeader className="p-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">SLA vencido</CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-3 text-3xl font-semibold">
            {summary?.totals.overdueResolution ?? 0}
          </CardContent>
        </Card>
        <Card className="app-section-card">
          <CardHeader className="p-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Aprovações pendentes</CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-3 text-3xl font-semibold">
            {summary?.totals.pendingMyApprovals ?? 0}
          </CardContent>
        </Card>
      </section>

      <section className="app-section-card space-y-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-1">
            <h2 className="section-title">Fila operacional</h2>
            <p className="text-sm text-muted-foreground">
              Filtre por fila, status ou responsável para trabalhar por prioridade real.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1.3fr)_200px_220px_auto_auto_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar por assunto, descrição ou código"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    void loadQueueContext()
                  }
                }}
              />
            </div>
            <Select value={queueId} onValueChange={setQueueId}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar fila" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as filas</SelectItem>
                {queues.map((queue) => (
                  <SelectItem key={queue.id} value={queue.id}>
                    {queue.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <label className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 text-sm">
              <Checkbox checked={onlyMine} onCheckedChange={(value) => setOnlyMine(Boolean(value))} />
              Só meus
            </label>
            <label className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 text-sm">
              <Checkbox
                checked={unassignedOnly}
                onCheckedChange={(value) => setUnassignedOnly(Boolean(value))}
              />
              Sem responsável
            </label>
            <Button onClick={() => void loadQueueContext()}>
              <Filter className="mr-2 h-4 w-4" />
              Aplicar
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            Carregando chamados da fila...
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border bg-muted/20 px-6 text-center">
            <Inbox className="h-12 w-12 text-muted-foreground/60" />
            <div className="space-y-1">
              <p className="text-lg font-semibold">Nenhum chamado encontrado</p>
              <p className="text-sm text-muted-foreground">
                Ajuste os filtros ou aguarde novos chamados entrarem na fila.
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
                  <TableHead>Solicitante</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>SLA</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((ticket) => {
                  const canPickup = !ticket.assignee?.user?.name && ticket.status !== 'WAITING_APPROVAL'
                  const canApprove = ticket.status === 'WAITING_APPROVAL'
                  const isResolved = ticket.status === 'RESOLVED'
                  const isOverdue =
                    Boolean(ticket.resolutionDueDate) &&
                    !['RESOLVED', 'CLOSED', 'CANCELLED'].includes(ticket.status) &&
                    new Date(ticket.resolutionDueDate || '').getTime() < Date.now()

                  return (
                    <TableRow
                      key={ticket.id}
                      className={isOverdue ? 'bg-destructive/5' : undefined}
                    >
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
                      <TableCell>{ticket.requester?.user?.name || 'Solicitante'}</TableCell>
                      <TableCell>{ticket.assignee?.user?.name || 'Não atribuído'}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(ticket.status) as any}>
                          {STATUS_LABELS[ticket.status] || ticket.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {PRIORITY_LABELS[ticket.priority] || ticket.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div>
                            {ticket.resolutionDueDate
                              ? new Date(ticket.resolutionDueDate).toLocaleDateString('pt-BR')
                              : 'Sem meta'}
                          </div>
                          {isOverdue ? (
                            <Badge variant="destructive">Vencido</Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/dashboard/helpdesk/${ticket.id}`}>Detalhe</Link>
                          </Button>
                          {canPickup ? (
                            <Button
                              size="sm"
                              disabled={actingTicketId === ticket.id}
                              onClick={() =>
                                void runAction(
                                  ticket.id,
                                  `/helpdesk/tickets/${ticket.id}/pickup`,
                                  'Chamado assumido com sucesso.',
                                )
                              }
                            >
                              <UserCheck className="mr-2 h-4 w-4" />
                              Assumir
                            </Button>
                          ) : null}
                          {canApprove ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={actingTicketId === ticket.id}
                                onClick={() =>
                                  void runAction(
                                    ticket.id,
                                    `/helpdesk/tickets/${ticket.id}/approve`,
                                    'Chamado aprovado.',
                                  )
                                }
                              >
                                <ShieldCheck className="mr-2 h-4 w-4" />
                                Aprovar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={actingTicketId === ticket.id}
                                onClick={() => void handleReject(ticket.id)}
                              >
                                Reprovar
                              </Button>
                            </>
                          ) : null}
                          {!canApprove && !isResolved ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={actingTicketId === ticket.id}
                              onClick={() => void handleResolve(ticket.id)}
                            >
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              Resolver
                            </Button>
                          ) : null}
                          {isResolved || canManage ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={actingTicketId === ticket.id}
                              onClick={() => void handleClose(ticket.id)}
                            >
                              Fechar
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  )
}
