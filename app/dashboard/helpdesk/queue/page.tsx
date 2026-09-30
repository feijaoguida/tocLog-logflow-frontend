'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  Inbox,
  RotateCw,
  Search,
  ShieldCheck,
  UserCheck,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { isAxiosError } from 'axios'
import { SlaStatus, type Sla } from '../operations'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { FilterPopover } from '@/components/ui/filter-popover'
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
import { TicketIndicatorsView, type TicketIndicators } from '../indicators'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'

type QueueOption = {
  id: string
  name: string
  department?: { name?: string | null } | null
}

type QueueTicket = {
  indicators?: TicketIndicators
  id: string
  version: number
  allowedActions: string[]
  sla?: Sla | null
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
  category?: { name: string } | null
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
  LOW: 'BAIXA',
  MEDIUM: 'MÉDIA',
  HIGH: 'ALTA',
  CRITICAL: 'CRÍTICA',
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

function getPriorityBadgeStyle(priority: string) {
  switch (priority) {
    case 'CRITICAL':
      return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60'
    case 'HIGH':
      return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900/60'
    case 'MEDIUM':
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60'
    case 'LOW':
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-800'
  }
}

function getInitials(name?: string | null) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function HelpdeskQueuePage() {
  const { hasPermission } = useAuth()
  const [loading, setLoading] = useState(true)
  const [actingTicketId, setActingTicketId] = useState<string | null>(null)
  const [tickets, setTickets] = useState<QueueTicket[]>([])
  const [queues, setQueues] = useState<QueueOption[]>([])
  const [summary, setSummary] = useState<HelpdeskSummary | null>(null)

  // Filtros
  const [search, setSearch] = useState('')
  const [queueId, setQueueId] = useState('all')
  const [status, setStatus] = useState('ALL')
  const [onlyMine, setOnlyMine] = useState(false)
  const [unassignedOnly, setUnassignedOnly] = useState(false)

  // Paginação
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  const canViewMetrics = hasPermission('helpdesk.dashboard.view')
  const canViewQueues = hasPermission('helpdesk.queue.view')
  const actionLock = useRef(false)

  useEffect(() => {
    void loadQueueContext()
  }, [queueId, status, onlyMine, unassignedOnly, canViewMetrics, canViewQueues])

  async function loadQueueContext() {
    setLoading(true)

    try {
      const query = new URLSearchParams()
      if (queueId !== 'all') query.set('queueId', queueId)
      if (status !== 'ALL') query.set('status', status)
      if (search.trim()) query.set('search', search.trim())
      if (onlyMine) query.set('onlyMine', 'true')
      if (unassignedOnly) query.set('unassignedOnly', 'true')

      const ticketsRequest = api
        .get<QueueTicket[]>(`/helpdesk/queue/tickets?${query.toString()}`)
        .then(({ data }) => {
          setTickets(data)
          setCurrentPage(1)
        })
        .finally(() => setLoading(false))

      const queuesRequest = canViewQueues
        ? api
            .get<QueueOption[]>('/helpdesk/queues')
            .then(({ data }) => setQueues(data))
            .catch(() => {})
        : Promise.resolve()

      const metricsRequest = canViewMetrics
        ? api
            .get<HelpdeskSummary>('/helpdesk/metrics/summary')
            .then(({ data }) => setSummary(data))
            .catch(() => setSummary(null))
        : Promise.resolve(setSummary(null))

      await Promise.all([ticketsRequest, queuesRequest, metricsRequest])
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, 'Não foi possível carregar a fila operacional.'),
      )
    } finally {
      setLoading(false)
    }
  }

  function handleClearFilters() {
    setSearch('')
    setQueueId('all')
    setStatus('ALL')
    setOnlyMine(false)
    setUnassignedOnly(false)
  }

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (search.trim()) count++
    if (queueId !== 'all') count++
    if (status !== 'ALL') count++
    if (onlyMine) count++
    if (unassignedOnly) count++
    return count
  }, [search, queueId, status, onlyMine, unassignedOnly])

  async function runAction(
    ticketId: string,
    endpoint: string,
    successMessage: string,
    payload?: Record<string, unknown>,
  ) {
    if (actionLock.current) return
    actionLock.current = true
    setActingTicketId(ticketId)
    try {
      await api.post(endpoint, {
        ...payload,
        expectedVersion: tickets.find((t) => t.id === ticketId)?.version,
      })
      toast.success(successMessage)
      await loadQueueContext()
    } catch (error) {
      toast.error(
        isAxiosError(error) && error.response?.status === 409
          ? 'Chamado atualizado; a lista será recarregada.'
          : getApiErrorMessage(error, 'Não foi possível executar a ação.'),
      )
      if (isAxiosError(error) && [403, 409].includes(error.response?.status ?? 0)) {
        await loadQueueContext()
      }
    } finally {
      actionLock.current = false
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
    const reason = window.prompt('Informe o resumo público da resolução:')
    if (!reason?.trim()) return
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

  // Paginação dos tickets
  const totalPages = Math.ceil(tickets.length / pageSize) || 1
  const paginatedTickets = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return tickets.slice(start, start + pageSize)
  }, [tickets, currentPage, pageSize])

  // Métricas calculadas se o backend summary estiver ausente
  const calculatedUnassigned = useMemo(
    () => tickets.filter((t) => !t.assignee?.user?.name).length,
    [tickets],
  )
  const calculatedOverdue = useMemo(
    () => tickets.filter((t) => t.indicators?.overdueResolution).length,
    [tickets],
  )

  const visibleCount = summary?.totals.totalVisible ?? tickets.length
  const unassignedCount = summary?.totals.unassigned ?? calculatedUnassigned
  const overdueCount = summary?.totals.overdueResolution ?? calculatedOverdue
  const approvalsCount = summary?.totals.pendingMyApprovals ?? 0

  return (
    <div className="app-page space-y-6">
      {/* Topo da Página */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Fila Operacional</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie e priorize os atendimentos do Helpdesk
          </p>
        </div>


        <div className="flex flex-wrap items-center gap-2">
          {/* Botão de Filtro com Popover Flutuante Reutilizável */}
          <FilterPopover
            activeCount={activeFilterCount}
            onClear={handleClearFilters}
            onApply={() => void loadQueueContext()}
            contentClassName="sm:w-[480px]"
          >
            <div className="field-stack">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Palavra-chave
              </span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  className="pl-9 h-9 text-sm"
                  placeholder="Assunto ou descrição..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      void loadQueueContext()
                    }
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="field-stack">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Fila
                </span>
                <Select value={queueId} onValueChange={setQueueId}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Todas as filas" />
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
              </div>

              <div className="field-stack">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Status
                </span>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-4 pt-1">
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <Checkbox
                  checked={onlyMine}
                  onCheckedChange={(val) => setOnlyMine(Boolean(val))}
                />
                <span>Meus</span>
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <Checkbox
                  checked={unassignedOnly}
                  onCheckedChange={(val) => setUnassignedOnly(Boolean(val))}
                />
                <span>Pendentes</span>
              </label>
            </div>
          </FilterPopover>

          {/* Botão de Atualizar */}
          <Button
            size="sm"
            className="h-9 gap-1.5"
            onClick={() => void loadQueueContext()}
            disabled={loading}
          >
            <RotateCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </Button>
        </div>
      </section>

      {/* Cards de Resumo */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Card 1: Visíveis */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Visíveis
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {visibleCount}
            </span>
          </CardContent>
        </Card>

        {/* Card 2: Sem Responsável */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Sem responsável
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {unassignedCount}
            </span>
            {unassignedCount > 0 && (
              <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                Ação necessária
              </span>
            )}
          </CardContent>
        </Card>

        {/* Card 3: SLA Violado */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              SLA violado
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2">
            <span
              className={`text-3xl font-bold tracking-tight ${
                overdueCount > 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {overdueCount}
            </span>
          </CardContent>
        </Card>

        {/* Card 4: Aprovações */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Aprovações
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {approvalsCount}
            </span>
          </CardContent>
        </Card>
      </section>


      {/* Tabela Responsiva de Chamados */}
      <Card className="app-section-card overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            Carregando chamados da fila...
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 p-8 text-center">
            <Inbox className="size-12 text-muted-foreground/50" />
            <div className="space-y-1">
              <p className="text-base font-semibold text-foreground">Nenhum chamado encontrado</p>
              <p className="text-xs text-muted-foreground">
                Ajuste os filtros de busca ou aguarde novos chamados entrarem na fila.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[80px] text-xs font-semibold uppercase tracking-wider">
                    ID
                  </TableHead>
                  <TableHead className="min-w-[240px] text-xs font-semibold uppercase tracking-wider">
                    Chamado / Categoria
                  </TableHead>
                  <TableHead className="min-w-[200px] text-xs font-semibold uppercase tracking-wider">
                    Fila / Solicitante
                  </TableHead>
                  <TableHead className="min-w-[200px] text-xs font-semibold uppercase tracking-wider">
                    Status / Responsável
                  </TableHead>
                  <TableHead className="w-[120px] text-xs font-semibold uppercase tracking-wider">
                    Prioridade
                  </TableHead>
                  <TableHead className="w-[140px] text-right text-xs font-semibold uppercase tracking-wider">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTickets.map((ticket) => {
                  const canPickup = ticket.allowedActions?.includes('pickup')
                  const canApprove = ticket.allowedActions?.includes('approve')
                  const isClosed = ticket.status === 'RESOLVED' || ticket.status === 'CLOSED'
                  const assigneeName = ticket.assignee?.user?.name
                  const categoryName =
                    ticket.category?.name || ticket.serviceCatalogItem?.name || 'Geral'

                  return (
                    <TableRow key={ticket.id} className="transition-colors">
                      {/* ID */}
                      <TableCell className="font-semibold text-muted-foreground text-sm">
                        #{ticket.code}
                      </TableCell>

                      {/* Chamado / Categoria */}
                      <TableCell>
                        <div className="space-y-0.5">
                          <Link
                            href={`/dashboard/helpdesk/${ticket.id}`}
                            className="font-semibold text-foreground text-sm hover:underline line-clamp-1"
                          >
                            {ticket.subject}
                          </Link>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {categoryName}
                          </p>
                        </div>
                      </TableCell>

                      {/* Fila / Solicitante */}
                      <TableCell>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                            <span className="size-2 rounded-full bg-primary shrink-0" />
                            <span className="truncate">{ticket.queue?.name || 'Sem fila'}</span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {ticket.requester?.user?.name || 'Solicitante'}
                          </p>
                        </div>
                      </TableCell>

                      {/* Status / Responsável */}
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

                      {/* Prioridade */}
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold tracking-wider ${getPriorityBadgeStyle(
                            ticket.priority,
                          )}`}
                        >
                          {PRIORITY_LABELS[ticket.priority] || ticket.priority}
                        </span>
                      </TableCell>

                      {/* Ações */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Botão de Ver Detalhe */}
                          <Button
                            asChild
                            variant="ghost"
                            size="icon-sm"
                            className="text-muted-foreground hover:text-foreground"
                            title="Ver detalhe do chamado"
                          >
                            <Link href={`/dashboard/helpdesk/${ticket.id}`}>
                              <Eye className="size-4" />
                            </Link>
                          </Button>

                          {/* Botão Assumir / Fechado / Desabilitado */}
                          {canPickup ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-primary text-primary hover:bg-primary hover:text-primary-foreground font-semibold text-xs px-3 h-8"
                              disabled={actingTicketId !== null}
                              onClick={() =>
                                void runAction(
                                  ticket.id,
                                  `/helpdesk/tickets/${ticket.id}/pickup`,
                                  'Chamado assumido com sucesso.',
                                )
                              }
                            >
                              ASSUMIR
                            </Button>
                          ) : isClosed ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled
                              className="border-border/60 bg-muted/40 text-muted-foreground/60 text-xs px-3 h-8 cursor-not-allowed"
                            >
                              FECHADO
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled
                              className="border-border/60 bg-muted/40 text-muted-foreground/60 text-xs px-3 h-8 cursor-not-allowed"
                            >
                              ASSUMIR
                            </Button>
                          )}

                          {/* Ações adicionais se tiver aprovação pendente */}
                          {canApprove && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={actingTicketId !== null}
                              onClick={() =>
                                void runAction(
                                  ticket.id,
                                  `/helpdesk/tickets/${ticket.id}/approve`,
                                  'Chamado aprovado.',
                                )
                              }
                              className="text-xs px-2 h-8"
                            >
                              <ShieldCheck className="size-3.5 mr-1" />
                              Aprovar
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Rodapé da Tabela: Paginação */}
        {!loading && tickets.length > 0 && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t p-4">
            <span className="text-xs text-muted-foreground">
              Exibindo <strong className="text-foreground">{paginatedTickets.length}</strong> de{' '}
              <strong className="text-foreground">{tickets.length}</strong> chamados
            </span>

            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <Button
                variant="outline"
                size="icon-sm"
                className="h-8 w-8"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              >
                <ChevronLeft className="size-4" />
              </Button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .slice(0, 5)
                .map((page) => (
                  <Button
                    key={page}
                    variant={page === currentPage ? 'default' : 'outline'}
                    size="sm"
                    className="h-8 w-8 p-0 text-xs font-semibold"
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                ))}

              <Button
                variant="outline"
                size="icon-sm"
                className="h-8 w-8"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
