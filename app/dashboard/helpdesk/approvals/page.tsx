'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { isAxiosError } from 'axios'
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  RotateCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserPlus,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FilterPopover } from '@/components/ui/filter-popover'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'
import type { HelpdeskContext } from '../operations'

type Approval = {
  id: string
  kind: string
  mode: string
  status: string
  version: number
  ticket: { id: string; code: number; subject: string; status: string }
  participants: {
    id: string
    status: string
    approver: { id: string; name: string }
  }[]
  allowedActions: string[]
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  NEEDS_ASSIGNMENT: 'Aguardando substituto',
  APPROVED: 'Aprovada',
  REJECTED: 'Rejeitada',
  SUPERSEDED: 'Superada',
}

const APPROVAL_MODE_LABELS: Record<string, string> = {
  QUEUE_ALL: 'Todos os aprovadores',
  REQUESTER_MANAGER: 'Gestor direto',
  DEFAULT: 'Qualquer aprovador',
}

function getInitials(name?: string | null) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function getStatusBadgeStyle(status: string) {
  switch (status) {
    case 'PENDING':
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60'
    case 'NEEDS_ASSIGNMENT':
      return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60'
    case 'APPROVED':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60'
    case 'REJECTED':
      return 'bg-destructive/10 text-destructive border-destructive/20'
    case 'SUPERSEDED':
    default:
      return 'bg-muted text-muted-foreground border-border'
  }
}

export default function HelpdeskApprovalsPage() {
  const [context, setContext] = useState<HelpdeskContext | null>(null)
  const [administrative, setAdministrative] = useState(false)
  const [items, setItems] = useState<Approval[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Filtros
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [kindFilter, setKindFilter] = useState('ALL')

  // Modais de Decisão
  const [activeItem, setActiveItem] = useState<Approval | null>(null)
  const [dialogAction, setDialogAction] = useState<'approve' | 'reject' | null>(null)
  const [dialogReason, setDialogReason] = useState('')

  // Modal de Substituto
  const [isReassignOpen, setIsReassignOpen] = useState(false)
  const [candidate, setCandidate] = useState('')
  const [candidates, setCandidates] = useState<{ id: string; name: string }[]>([])
  const [candidateCursor, setCandidateCursor] = useState<string | null>(null)
  const [loadingCandidates, setLoadingCandidates] = useState(false)
  const [participant, setParticipant] = useState('')
  const [reassignReason, setReassignReason] = useState('')

  // Paginação interna
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 10

  const lock = useRef(false)

  useEffect(() => {
    let active = true
    api
      .get<HelpdeskContext>('/helpdesk/context')
      .then(({ data }) => {
        if (active) setContext(data)
      })
      .catch((e) => {
        if (active) setError(getApiErrorMessage(e, 'Não foi possível consultar permissões.'))
      })
    return () => {
      active = false
    }
  }, [])

  const permitted = administrative
    ? Boolean(context?.capabilities.settings)
    : Boolean(context?.capabilities.approvals)

  const load = useCallback(
    async (next?: string) => {
      if (!permitted) {
        setItems([])
        setLoading(false)
        return
      }

      if (next) {
        setLoadingMore(true)
      } else {
        setLoading(true)
      }

      try {
        const { data } = await api.get<{ items: Approval[]; nextCursor: string | null }>(
          `/helpdesk/approvals/${administrative ? 'unassigned' : 'my'}`,
          { params: { cursor: next } },
        )
        setItems((current) => (next ? [...current, ...data.items] : data.items))
        setCursor(data.nextCursor)
        setError('')
      } catch (e) {
        setError(getApiErrorMessage(e, 'Não foi possível carregar aprovações.'))
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [administrative, permitted],
  )

  useEffect(() => {
    setItems([])
    setCursor(null)
    setCurrentPage(1)
    void load()
  }, [load])

  useEffect(() => {
    if (!context?.capabilities.settings) return
    api
      .get('/helpdesk/settings/approver-candidates')
      .then(({ data }) => {
        setCandidates(data.items)
        setCandidateCursor(data.nextCursor)
      })
      .catch((e) => setError(getApiErrorMessage(e, 'Não foi possível carregar substitutos.')))
  }, [context?.capabilities.settings])

  async function loadMoreCandidates() {
    if (!candidateCursor || loadingCandidates) return
    setLoadingCandidates(true)
    try {
      const { data } = await api.get('/helpdesk/settings/approver-candidates', {
        params: { cursor: candidateCursor },
      })
      setCandidates((current) => [...current, ...data.items])
      setCandidateCursor(data.nextCursor)
    } catch (e) {
      toast.error(getApiErrorMessage(e, 'Falha ao carregar mais substitutos.'))
    } finally {
      setLoadingCandidates(false)
    }
  }

  async function handleConfirmDecision() {
    if (!activeItem || !dialogAction || lock.current) return
    if (dialogAction === 'reject' && !dialogReason.trim()) {
      toast.error('Informe o motivo da rejeição.')
      return
    }

    lock.current = true
    setBusy(true)
    try {
      await api.post(`/helpdesk/approvals/${activeItem.id}/${dialogAction}`, {
        expectedVersion: activeItem.version,
        reason: dialogReason.trim() || undefined,
      })

      toast.success(
        dialogAction === 'approve'
          ? 'Solicitação aprovada com sucesso.'
          : 'Solicitação rejeitada com sucesso.',
      )
      setDialogAction(null)
      setActiveItem(null)
      setDialogReason('')
      await load()
    } catch (e) {
      const msg =
        isAxiosError(e) && e.response?.status === 409
          ? 'Solicitação atualizada ou superada por outro usuário. Recarregando...'
          : getApiErrorMessage(e, 'Não foi possível registrar a decisão.')
      toast.error(msg)
      if (isAxiosError(e) && [403, 409].includes(e.response?.status ?? 0)) {
        await load().catch(() => setItems([]))
      }
    } finally {
      lock.current = false
      setBusy(false)
    }
  }

  async function handleConfirmReassign() {
    if (!activeItem || lock.current) return
    if (!candidate) {
      toast.error('Selecione um substituto elegível.')
      return
    }
    if (!reassignReason.trim()) {
      toast.error('Informe a justificativa da indicação.')
      return
    }

    lock.current = true
    setBusy(true)
    try {
      await api.post(`/helpdesk/approvals/${activeItem.id}/reassign`, {
        expectedVersion: activeItem.version,
        reason: reassignReason.trim(),
        approverUserId: candidate,
        participantId: participant || undefined,
      })

      toast.success('Substituto indicado com sucesso.')
      setIsReassignOpen(false)
      setActiveItem(null)
      setCandidate('')
      setParticipant('')
      setReassignReason('')
      await load()
    } catch (e) {
      toast.error(getApiErrorMessage(e, 'Não foi possível indicar o substituto.'))
      if (isAxiosError(e) && [403, 409].includes(e.response?.status ?? 0)) {
        await load().catch(() => setItems([]))
      }
    } finally {
      lock.current = false
      setBusy(false)
    }
  }

  // Filtragem e busca
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (search.trim()) {
        const query = search.toLowerCase()
        const matchesSubject = item.ticket.subject.toLowerCase().includes(query)
        const matchesCode = String(item.ticket.code).includes(query)
        if (!matchesSubject && !matchesCode) return false
      }

      if (statusFilter !== 'ALL' && item.status !== statusFilter) {
        return false
      }

      if (kindFilter !== 'ALL' && item.kind !== kindFilter) {
        return false
      }

      return true
    })
  }, [items, search, statusFilter, kindFilter])

  // KPIs
  const kpiStats = useMemo(() => {
    const total = items.length
    const pending = items.filter((i) => i.status === 'PENDING').length
    const needsAssignment = items.filter((i) => i.status === 'NEEDS_ASSIGNMENT').length
    const approved = items.filter((i) => i.status === 'APPROVED').length

    return { total, pending, needsAssignment, approved }
  }, [items])

  // Contagem de filtros ativos
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (search.trim()) count++
    if (statusFilter !== 'ALL') count++
    if (kindFilter !== 'ALL') count++
    return count
  }, [search, statusFilter, kindFilter])

  function handleClearFilters() {
    setSearch('')
    setStatusFilter('ALL')
    setKindFilter('ALL')
    setCurrentPage(1)
  }

  // Paginação
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE))
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredItems.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredItems, currentPage])

  return (
    <div className="app-page space-y-6">
      {/* Page Header */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Aprovações do HelpDesk
          </h1>
          <p className="text-sm text-muted-foreground">
            Decisões formais de abertura e cancelamento com rastreabilidade operacional.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Alternador de Modo: Minhas Aprovações vs Administrativas */}
          {context?.capabilities.settings && (
            <div className="inline-flex rounded-md border border-border p-0.5 bg-muted/20">
              <Button
                variant={!administrative ? 'default' : 'ghost'}
                size="sm"
                className="h-8 text-xs font-semibold"
                onClick={() => setAdministrative(false)}
              >
                Minhas solicitações
              </Button>
              <Button
                variant={administrative ? 'default' : 'ghost'}
                size="sm"
                className="h-8 text-xs font-semibold"
                onClick={() => setAdministrative(true)}
              >
                Pendências administrativas
              </Button>
            </div>
          )}

          {/* Menu Flutuante de Filtro */}
          <FilterPopover
            activeCount={activeFilterCount}
            onClear={handleClearFilters}
            onApply={() => setCurrentPage(1)}
            contentClassName="sm:w-[460px]"
          >
            <div className="field-stack">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Palavra-chave
              </span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  className="pl-9 h-9 text-sm"
                  placeholder="Assunto ou código do chamado..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setCurrentPage(1)
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="field-stack">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Status
                </span>
                <Select
                  value={statusFilter}
                  onValueChange={(val) => {
                    setStatusFilter(val)
                    setCurrentPage(1)
                  }}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos os status</SelectItem>
                    <SelectItem value="PENDING">Pendente</SelectItem>
                    <SelectItem value="NEEDS_ASSIGNMENT">Aguardando substituto</SelectItem>
                    <SelectItem value="APPROVED">Aprovada</SelectItem>
                    <SelectItem value="REJECTED">Rejeitada</SelectItem>
                    <SelectItem value="SUPERSEDED">Superada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="field-stack">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Tipo
                </span>
                <Select
                  value={kindFilter}
                  onValueChange={(val) => {
                    setKindFilter(val)
                    setCurrentPage(1)
                  }}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Todos os tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos os tipos</SelectItem>
                    <SelectItem value="CREATION">Abertura de chamado</SelectItem>
                    <SelectItem value="CANCELLATION">Cancelamento de chamado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </FilterPopover>

          {/* Botão Atualizar */}
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            onClick={() => void load()}
            disabled={loading || busy}
          >
            <RotateCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </Button>
        </div>
      </section>

      {/* Alerta de Erro ou Sem Permissão */}
      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive"
        >
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {context && !permitted && (
        <Card className="app-section-card p-6 text-center text-sm text-muted-foreground">
          Sem permissão para esta visão de aprovações. Selecione uma visão disponível.
        </Card>
      )}

      {/* Cards de Resumo Operacional (KPIs em 4 colunas) */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Total */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Carregado
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {kpiStats.total}
            </span>
          </CardContent>
        </Card>

        {/* Pendentes */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Pendentes de Decisão
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {kpiStats.pending}
            </span>
            {kpiStats.pending > 0 && (
              <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                Pendente
              </span>
            )}
          </CardContent>
        </Card>

        {/* Sem Substituto / Ação Necessária */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Aguardando Substituto
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {kpiStats.needsAssignment}
            </span>
            {kpiStats.needsAssignment > 0 && (
              <span className="rounded-md bg-rose-500/10 px-2 py-0.5 text-xs font-medium text-rose-700 dark:text-rose-400">
                Ação necessária
              </span>
            )}
          </CardContent>
        </Card>

        {/* Aprovadas */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Aprovadas
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2">
            <span className="text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {kpiStats.approved}
            </span>
          </CardContent>
        </Card>
      </section>

      {/* Tabela de Aprovações */}
      <Card className="app-section-card overflow-hidden p-0 shadow-xs">
        {loading ? (
          <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
            <RotateCw className="mr-2 size-5 animate-spin text-primary" />
            Carregando solicitações de aprovação...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 p-12 text-center text-muted-foreground">
            <ShieldCheck className="size-10 text-muted-foreground/50" />
            <p className="text-sm font-medium">Nenhuma solicitação de aprovação encontrada.</p>
            <p className="text-xs text-muted-foreground/80">
              {activeFilterCount > 0
                ? 'Tente ajustar os filtros selecionados.'
                : 'Não há pendências na lista no momento.'}
            </p>
          </div>
        ) : (
          <div className="w-full">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[80px]">ID</TableHead>
                  <TableHead className="min-w-[240px]">Chamado / Tipo</TableHead>
                  <TableHead className="min-w-[180px]">Regra de Aprovação</TableHead>
                  <TableHead className="min-w-[220px]">Status / Aprovadores</TableHead>
                  <TableHead className="w-[180px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.map((item) => {
                  const pendingCount = item.participants.filter((p) => p.status === 'PENDING').length
                  const isCancellation = item.kind === 'CANCELLATION'

                  return (
                    <TableRow key={item.id} className="transition-colors">
                      {/* ID do Chamado */}
                      <TableCell className="font-semibold text-muted-foreground text-sm">
                        #{item.ticket.code}
                      </TableCell>

                      {/* Chamado / Tipo */}
                      <TableCell>
                        <div className="space-y-1">
                          <Link
                            href={`/dashboard/helpdesk/${item.ticket.id}`}
                            className="font-semibold text-foreground text-sm hover:underline line-clamp-1"
                          >
                            {item.ticket.subject}
                          </Link>
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium border ${
                                isCancellation
                                  ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
                                  : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300'
                              }`}
                            >
                              {isCancellation ? 'Cancelamento' : 'Abertura'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {pendingCount > 0
                                ? `${pendingCount} voto(s) pendente(s)`
                                : 'Todos os votos coletados'}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Regra de Aprovação */}
                      <TableCell>
                        <div className="space-y-0.5">
                          <div className="text-sm font-medium text-foreground">
                            {APPROVAL_MODE_LABELS[item.mode] || 'Qualquer aprovador'}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Status do ticket: {item.ticket.status}
                          </p>
                        </div>
                      </TableCell>

                      {/* Status / Aprovadores */}
                      <TableCell>
                        <div className="space-y-1.5">
                          <div>
                            <span
                              className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${getStatusBadgeStyle(
                                item.status,
                              )}`}
                            >
                              {STATUS_LABELS[item.status] || item.status}
                            </span>
                          </div>

                          {/* Mini avatares dos participantes */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            {item.participants.map((p) => {
                              const isApproved = p.status === 'APPROVED'
                              const isRejected = p.status === 'REJECTED'
                              return (
                                <div
                                  key={p.id}
                                  className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/30 px-1.5 py-0.5 text-[11px]"
                                  title={`${p.approver.name}: ${STATUS_LABELS[p.status] || p.status}`}
                                >
                                  <span className="flex size-4 items-center justify-center rounded-full bg-muted text-[9px] font-bold text-muted-foreground">
                                    {getInitials(p.approver.name)}
                                  </span>
                                  <span className="max-w-[80px] truncate text-muted-foreground">
                                    {p.approver.name.split(' ')[0]}
                                  </span>
                                  {isApproved && (
                                    <CheckCircle2 className="size-3 text-emerald-600" />
                                  )}
                                  {isRejected && (
                                    <XCircle className="size-3 text-destructive" />
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </TableCell>

                      {/* Ações */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            asChild
                            variant="ghost"
                            size="icon-sm"
                            className="text-muted-foreground hover:text-foreground"
                            title="Ver detalhes do chamado"
                          >
                            <Link href={`/dashboard/helpdesk/${item.ticket.id}`}>
                              <Eye className="size-4" />
                            </Link>
                          </Button>

                          {/* Botão de Aprovação Direta / Modal */}
                          {item.allowedActions.includes('approve') && (
                            <Button
                              size="sm"
                              className="h-8 px-2.5 text-xs font-semibold gap-1 bg-emerald-600 text-white hover:bg-emerald-700"
                              onClick={() => {
                                setActiveItem(item)
                                setDialogAction('approve')
                                setDialogReason('')
                              }}
                              disabled={busy}
                            >
                              <CheckCircle2 className="size-3.5" />
                              <span>Aprovar</span>
                            </Button>
                          )}

                          {/* Botão de Rejeição */}
                          {item.allowedActions.includes('reject') && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2.5 text-xs font-semibold gap-1 border-destructive/40 text-destructive hover:bg-destructive/10"
                              onClick={() => {
                                setActiveItem(item)
                                setDialogAction('reject')
                                setDialogReason('')
                              }}
                              disabled={busy}
                            >
                              <XCircle className="size-3.5" />
                              <span>Rejeitar</span>
                            </Button>
                          )}

                          {/* Botão de Indicar Substituto */}
                          {administrative &&
                            context?.capabilities.approvals &&
                            item.status === 'NEEDS_ASSIGNMENT' && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 px-2.5 text-xs font-semibold gap-1 border-primary/50 text-primary hover:bg-primary/10"
                                onClick={() => {
                                  setActiveItem(item)
                                  setCandidate('')
                                  const pendingPart = item.participants.find((p) => p.status === 'PENDING')
                                  setParticipant(pendingPart ? pendingPart.id : '')
                                  setReassignReason('')
                                  setIsReassignOpen(true)
                                }}
                                disabled={busy}
                              >
                                <UserPlus className="size-3.5" />
                                <span>Substituto</span>
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

        {/* Rodapé com Paginação */}
        {!loading && filteredItems.length > 0 && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-6 py-4 border-t bg-muted/10 text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <span>
                Exibindo <span className="font-semibold text-foreground">{paginatedItems.length}</span> de{' '}
                <span className="font-semibold text-foreground">{filteredItems.length}</span> solicitações
              </span>

              {cursor && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  disabled={loadingMore || busy}
                  onClick={() => void load(cursor)}
                >
                  <RotateCw className={`size-3 ${loadingMore ? 'animate-spin' : ''}`} />
                  <span>Carregar mais do servidor</span>
                </Button>
              )}
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

      {/* Dialog de Decisão (Aprovar / Rejeitar) */}
      <Dialog
        open={Boolean(activeItem && dialogAction)}
        onOpenChange={(open) => {
          if (!open) {
            setDialogAction(null)
            setActiveItem(null)
            setDialogReason('')
          }
        }}
      >
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {dialogAction === 'approve' ? (
                <>
                  <CheckCircle2 className="size-5 text-emerald-600" />
                  <span>Aprovar Solicitação #{activeItem?.ticket.code}</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="size-5 text-destructive" />
                  <span>Rejeitar Solicitação #{activeItem?.ticket.code}</span>
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {activeItem?.kind === 'CANCELLATION'
                ? 'Solicitação de cancelamento'
                : 'Solicitação de abertura'}{' '}
              para o chamado <strong>{activeItem?.ticket.subject}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="dialog-reason" className="text-xs font-semibold">
                Motivo / Justificativa{' '}
                {dialogAction === 'reject' ? (
                  <span className="text-destructive">*</span>
                ) : (
                  <span className="text-muted-foreground font-normal">(Opcional)</span>
                )}
              </Label>
              <Textarea
                id="dialog-reason"
                rows={3}
                placeholder={
                  dialogAction === 'reject'
                    ? 'Descreva obrigatoriamente a razão da rejeição...'
                    : 'Adicione observações para o solicitante se desejar...'
                }
                value={dialogReason}
                onChange={(e) => setDialogReason(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDialogAction(null)
                setActiveItem(null)
                setDialogReason('')
              }}
              disabled={busy}
            >
              Cancelar
            </Button>
            <Button
              variant={dialogAction === 'approve' ? 'default' : 'destructive'}
              onClick={() => void handleConfirmDecision()}
              disabled={busy || (dialogAction === 'reject' && !dialogReason.trim())}
              className={
                dialogAction === 'approve'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-semibold'
                  : ''
              }
            >
              {busy ? 'Processando...' : dialogAction === 'approve' ? 'Confirmar Aprovação' : 'Confirmar Rejeição'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Indicar Substituto */}
      <Dialog
        open={isReassignOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsReassignOpen(false)
            setActiveItem(null)
            setCandidate('')
            setParticipant('')
            setReassignReason('')
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="size-5 text-primary" />
              <span>Indicar Substituto Elegível</span>
            </DialogTitle>
            <DialogDescription>
              Chamado #{activeItem?.ticket.code}: {activeItem?.ticket.subject}. Indicar um
              substituto não aprova o chamado nem anula votos anteriores.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Participante Pendente */}
            {activeItem && activeItem.participants.filter((p) => p.status === 'PENDING').length > 1 && (
              <div className="space-y-1.5">
                <Label htmlFor="participant-select" className="text-xs font-semibold">
                  Obrigação pendente a substituir
                </Label>
                <Select value={participant} onValueChange={setParticipant}>
                  <SelectTrigger id="participant-select" className="h-9 text-sm">
                    <SelectValue placeholder="Selecione o participante" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeItem.participants
                      .filter((p) => p.status === 'PENDING')
                      .map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.approver.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Substituto */}
            <div className="space-y-1.5">
              <Label htmlFor="candidate-select" className="text-xs font-semibold">
                Substituto Elegível <span className="text-destructive">*</span>
              </Label>
              <Select value={candidate} onValueChange={setCandidate}>
                <SelectTrigger id="candidate-select" className="h-9 text-sm">
                  <SelectValue placeholder="Selecione o substituto" />
                </SelectTrigger>
                <SelectContent>
                  {candidates.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {candidateCursor && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-primary"
                  onClick={() => void loadMoreCandidates()}
                  disabled={loadingCandidates}
                >
                  {loadingCandidates ? 'Carregando...' : '+ Carregar mais substitutos elegíveis'}
                </Button>
              )}
            </div>

            {/* Justificativa */}
            <div className="space-y-1.5">
              <Label htmlFor="reassign-reason" className="text-xs font-semibold">
                Justificativa da Substituição <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="reassign-reason"
                rows={3}
                placeholder="Informe o motivo da alteração de aprovador..."
                value={reassignReason}
                onChange={(e) => setReassignReason(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsReassignOpen(false)
                setActiveItem(null)
                setCandidate('')
                setParticipant('')
                setReassignReason('')
              }}
              disabled={busy}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => void handleConfirmReassign()}
              disabled={busy || !candidate || !reassignReason.trim()}
            >
              {busy ? 'Processando...' : 'Confirmar Indicação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
