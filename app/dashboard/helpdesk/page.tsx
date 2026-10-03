'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  LifeBuoy,
  Plus,
  RotateCw,
  Search,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
import { TicketIndicatorsView, type TicketIndicators } from './indicators'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'
import { AiContextualChatDialog } from '@/components/ai/ai-contextual-chat-dialog'

type HelpdeskTicket = {
  indicators?: TicketIndicators
  id: string
  code: number
  subject: string
  status: string
  priority: string
  createdAt: string
  category?: { name: string } | null
  serviceCatalogItem?: { name: string } | null
  queue?: { name: string } | null
  assignee?: { user?: { name?: string } | null } | null
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

const PRIORITY_OPTIONS = [
  { value: 'ALL', label: 'Todas as prioridades' },
  { value: 'CRITICAL', label: 'Crítica' },
  { value: 'HIGH', label: 'Alta' },
  { value: 'MEDIUM', label: 'Média' },
  { value: 'LOW', label: 'Baixa' },
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

export default function HelpdeskPage() {
  const router = useRouter()
  const { hasPermission } = useAuth()
  const [loading, setLoading] = useState(true)
  const [tickets, setTickets] = useState<HelpdeskTicket[]>([])

  // Filtros
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('ALL')
  const [priority, setPriority] = useState('ALL')
  const [onlyPending, setOnlyPending] = useState(false)


  // Paginação
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  const canCreateTicket = hasPermission('helpdesk.ticket.create')

  useEffect(() => {
    void fetchTickets()
  }, [])

  async function fetchTickets() {
    setLoading(true)
    try {
      const { data } = await api.get('/helpdesk/tickets/my')
      setTickets(data)
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, 'Não foi possível carregar os chamados.'),
      )
    } finally {
      setLoading(false)
    }
  }

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (search.trim()) count++
    if (status !== 'ALL') count++
    if (priority !== 'ALL') count++
    if (onlyPending) count++
    return count
  }, [search, status, priority, onlyPending])

  function handleClearFilters() {
    setSearch('')
    setStatus('ALL')
    setPriority('ALL')
    setOnlyPending(false)
    setCurrentPage(1)
  }

  // Filtragem dos chamados
  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      if (search.trim()) {
        const q = search.toLowerCase()
        const matchSubject = ticket.subject.toLowerCase().includes(q)
        const matchCode = ticket.code.toString().includes(q)
        const matchCategory = ticket.category?.name?.toLowerCase().includes(q)
        const matchService = ticket.serviceCatalogItem?.name?.toLowerCase().includes(q)
        const matchQueue = ticket.queue?.name?.toLowerCase().includes(q)
        if (!matchSubject && !matchCode && !matchCategory && !matchService && !matchQueue) {
          return false
        }
      }
      if (status !== 'ALL' && ticket.status !== status) {
        return false
      }
      if (priority !== 'ALL' && ticket.priority !== priority) {
        return false
      }
      if (onlyPending && (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED')) {
        return false
      }
      return true
    })
  }, [tickets, search, status, priority, onlyPending])

  // Paginação
  const totalPages = Math.ceil(filteredTickets.length / pageSize) || 1
  const paginatedTickets = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredTickets.slice(start, start + pageSize)
  }, [filteredTickets, currentPage, pageSize])

  // Ajusta a página se a filtragem reduzir a quantidade de páginas
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1)
    }
  }, [totalPages, currentPage])

  // Métricas
  const stats = useMemo(() => {
    const openStatuses = new Set([
      'OPEN',
      'NEW',
      'TRIAGE',
      'WAITING_ASSIGNMENT',
      'WAITING_APPROVAL',
      'IN_PROGRESS',
      'WAITING_USER',
      'WAITING_THIRD_PARTY',
      'REOPENED',
    ])

    return {
      total: tickets.length,
      active: tickets.filter((ticket) => openStatuses.has(ticket.status)).length,
      waiting: tickets.filter((ticket) =>
        ['WAITING_USER', 'WAITING_THIRD_PARTY', 'WAITING_APPROVAL'].includes(
          ticket.status,
        ),
      ).length,
      resolved: tickets.filter((ticket) =>
        ['RESOLVED', 'CLOSED'].includes(ticket.status),
      ).length,
    }
  }, [tickets])

  return (
    <div className="app-page space-y-6">
      {/* Topo da Página */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Central de Atendimento
          </h1>
          <p className="text-sm text-muted-foreground">
            Acompanhe seus chamados internos, status de atendimento e trilha de resposta
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canCreateTicket ? (
            <Button onClick={() => router.push('/dashboard/helpdesk/new')} size="sm" className="h-9 gap-1.5 font-semibold">
              <Plus className="size-4" />
              <span>Abrir chamado</span>
            </Button>
          ) : null}

          <AiContextualChatDialog module="helpdesk" title="Assistente de Helpdesk" />

          {/* Botão de Filtro com Popover Flutuante Reutilizável */}
          <FilterPopover
            activeCount={activeFilterCount}
            onClear={handleClearFilters}
            onApply={() => setCurrentPage(1)}
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
                      setCurrentPage(1)
                    }
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
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

              <div className="field-stack">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Prioridade
                </span>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Todas as prioridades" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((opt) => (
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
                  checked={onlyPending}
                  onCheckedChange={(val) => setOnlyPending(Boolean(val))}
                />
                <span>Apenas pendentes</span>
              </label>
            </div>
          </FilterPopover>

          {/* Botão de Atualizar */}
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            onClick={() => void fetchTickets()}
            disabled={loading}
          >
            <RotateCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </Button>
        </div>
      </section>

      {/* Cards de Resumo */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Card 1: Total */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total de chamados
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {stats.total}
            </span>
          </CardContent>
        </Card>

        {/* Card 2: Ativos */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Em atendimento
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {stats.active}
            </span>
          </CardContent>
        </Card>

        {/* Card 3: Aguardando Retorno */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Aguardando ação
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {stats.waiting}
            </span>
            {stats.waiting > 0 && (
              <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                Ação necessária
              </span>
            )}
          </CardContent>
        </Card>

        {/* Card 4: Resolvidos */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Resolvidos / Fechados
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2">
            <span className="text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {stats.resolved}
            </span>
          </CardContent>
        </Card>
      </section>


      {/* Tabela Responsiva de Chamados */}
      <Card className="app-section-card overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            Carregando seus chamados...
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 p-8 text-center">
            <LifeBuoy className="size-12 text-muted-foreground/50" />
            <div className="space-y-1">
              <p className="text-base font-semibold text-foreground">Nenhum chamado encontrado</p>
              <p className="text-xs text-muted-foreground">
                {activeFilterCount > 0
                  ? 'Ajuste os filtros de busca para encontrar o que procura.'
                  : 'Quando você abrir um chamado, ele aparecerá aqui.'}
              </p>
            </div>
            {canCreateTicket && activeFilterCount === 0 ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/dashboard/helpdesk/new')}
                className="mt-2"
              >
                Abrir primeiro chamado
              </Button>
            ) : null}
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
                    Fila / Serviço
                  </TableHead>
                  <TableHead className="min-w-[200px] text-xs font-semibold uppercase tracking-wider">
                    Status / Responsável
                  </TableHead>
                  <TableHead className="w-[120px] text-xs font-semibold uppercase tracking-wider">
                    Prioridade
                  </TableHead>
                  <TableHead className="w-[100px] text-right text-xs font-semibold uppercase tracking-wider">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTickets.map((ticket) => {
                  const assigneeName = ticket.assignee?.user?.name
                  const categoryName =
                    ticket.category?.name || 'Categoria geral'

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

                      {/* Fila / Serviço */}
                      <TableCell>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                            <span className="size-2 rounded-full bg-primary shrink-0" />
                            <span className="truncate">{ticket.queue?.name || 'Sem fila atribuída'}</span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {ticket.serviceCatalogItem?.name || 'Fluxo direto'}
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
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Rodapé com Paginação */}
        {!loading && filteredTickets.length > 0 && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-6 py-4 border-t bg-muted/10 text-xs text-muted-foreground">
            <div>
              Exibindo <span className="font-semibold text-foreground">{paginatedTickets.length}</span> de{' '}
              <span className="font-semibold text-foreground">{filteredTickets.length}</span> chamados
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon-sm"
                className="size-8"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="size-4" />
              </Button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <Button
                  key={pageNum}
                  variant={pageNum === currentPage ? 'default' : 'outline'}
                  size="icon-sm"
                  className={`size-8 font-medium ${
                    pageNum === currentPage ? 'pointer-events-none' : ''
                  }`}
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </Button>
              ))}

              <Button
                variant="outline"
                size="icon-sm"
                className="size-8"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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
