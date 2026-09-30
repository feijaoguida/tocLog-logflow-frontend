'use client'

import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import {
  Archive,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  RotateCw,
  Search,
  Send,
  ShoppingBag,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'

type PurchaseOrderAction =
  | 'SENT'
  | 'PARTIALLY_RECEIVED'
  | 'CONFIRMED'
  | 'CLOSED'
  | 'CANCELLED'

type PurchaseOrder = {
  id: string
  number?: number | null
  totalValue: number | string
  receivedAmount?: number | string | null
  status: string
  issueDate?: string | null
  receivedAt?: string | null
  closedAt?: string | null
  createdAt: string
  cancellationReason?: string | null
  supplier?: { name?: string | null } | null
  quotation?: {
    request?: {
      code?: number | null
      priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' | null
      desiredDate?: string | null
    } | null
  } | null
}

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Em aberto',
  SENT: 'Enviada',
  PARTIALLY_RECEIVED: 'Recebimento parcial',
  CONFIRMED: 'Recebida',
  CLOSED: 'Encerrada',
  CANCELLED: 'Cancelada',
}

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'Todos os status' },
  { value: 'OPEN', label: 'Em aberto' },
  { value: 'SENT', label: 'Enviada' },
  { value: 'PARTIALLY_RECEIVED', label: 'Recebimento parcial' },
  { value: 'CONFIRMED', label: 'Recebida' },
  { value: 'CLOSED', label: 'Encerrada' },
  { value: 'CANCELLED', label: 'Cancelada' },
]

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'BAIXA',
  NORMAL: 'NORMAL',
  HIGH: 'ALTA',
  URGENT: 'URGENTE',
}

const PRIORITY_OPTIONS = [
  { value: 'ALL', label: 'Todas as prioridades' },
  { value: 'URGENT', label: 'Urgente' },
  { value: 'HIGH', label: 'Alta' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'LOW', label: 'Baixa' },
]

function getStatusBadgeStyle(status: string) {
  switch (status) {
    case 'CONFIRMED':
    case 'CLOSED':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60'
    case 'SENT':
    case 'PARTIALLY_RECEIVED':
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60'
    case 'OPEN':
      return 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900/60'
    case 'CANCELLED':
      return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60'
    default:
      return 'bg-muted text-muted-foreground border-border'
  }
}

function getPriorityBadgeStyle(priority: string) {
  switch (priority) {
    case 'URGENT':
      return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60'
    case 'HIGH':
      return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900/60'
    case 'NORMAL':
    case 'LOW':
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-800'
  }
}

function formatCurrency(value?: number | string | null) {
  return Number(value || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
  })
}

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [actionOrder, setActionOrder] = useState<PurchaseOrder | null>(null)
  const [actionType, setActionType] = useState<PurchaseOrderAction | null>(null)
  const [receivedAmount, setReceivedAmount] = useState('')
  const [observation, setObservation] = useState('')
  const [cancellationReason, setCancellationReason] = useState('')

  // Filtros
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [priorityFilter, setPriorityFilter] = useState('ALL')

  // Paginação
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const { data } = await api.get<PurchaseOrder[]>('/purchase-orders')
      setOrders(data)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível carregar as ordens de compra.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchOrders()
  }, [])

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (search.trim()) count++
    if (statusFilter !== 'ALL') count++
    if (priorityFilter !== 'ALL') count++
    return count
  }, [search, statusFilter, priorityFilter])

  function handleClearFilters() {
    setSearch('')
    setStatusFilter('ALL')
    setPriorityFilter('ALL')
    setCurrentPage(1)
  }

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (search.trim()) {
        const q = search.toLowerCase()
        const matchNumber = (order.number ? String(order.number) : '').includes(q)
        const matchSupplier = (order.supplier?.name || '').toLowerCase().includes(q)
        const matchRequest = (order.quotation?.request?.code ? String(order.quotation.request.code) : '').includes(q)
        if (!matchNumber && !matchSupplier && !matchRequest) {
          return false
        }
      }

      if (statusFilter !== 'ALL' && order.status !== statusFilter) {
        return false
      }

      if (priorityFilter !== 'ALL') {
        const p = order.quotation?.request?.priority || 'NORMAL'
        if (p !== priorityFilter) return false
      }

      return true
    })
  }, [orders, search, statusFilter, priorityFilter])

  const totalPages = Math.ceil(filteredOrders.length / pageSize) || 1

  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredOrders.slice(start, start + pageSize)
  }, [filteredOrders, currentPage, pageSize])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1)
    }
  }, [totalPages, currentPage])

  const stats = useMemo(() => {
    const totalValue = orders.reduce((sum, order) => sum + Number(order.totalValue || 0), 0)
    const receivedValue = orders.reduce(
      (sum, order) => sum + Number(order.receivedAmount || 0),
      0,
    )
    const openOrders = orders.filter((order) => ['OPEN', 'SENT'].includes(order.status)).length

    return {
      total: orders.length,
      openAndSent: openOrders,
      partiallyReceived: orders.filter((order) => order.status === 'PARTIALLY_RECEIVED').length,
      confirmedAndClosed: orders.filter((order) =>
        ['CONFIRMED', 'CLOSED'].includes(order.status),
      ).length,
      totalValue,
      receivedValue,
    }
  }, [orders])

  const remainingAmount = useMemo(() => {
    if (!actionOrder) return 0

    return Math.max(
      Number(actionOrder.totalValue || 0) - Number(actionOrder.receivedAmount || 0),
      0,
    )
  }, [actionOrder])

  const resetActionState = () => {
    setActionOrder(null)
    setActionType(null)
    setReceivedAmount('')
    setObservation('')
    setCancellationReason('')
  }

  const openAction = (order: PurchaseOrder, action: PurchaseOrderAction) => {
    setActionOrder(order)
    setActionType(action)
    setObservation('')
    setCancellationReason(order.cancellationReason || '')

    if (action === 'CONFIRMED') {
      const remaining = Math.max(
        Number(order.totalValue || 0) - Number(order.receivedAmount || 0),
        0,
      )
      setReceivedAmount(remaining > 0 ? remaining.toFixed(2) : '')
    } else {
      setReceivedAmount('')
    }
  }

  const submitAction = async () => {
    if (!actionOrder || !actionType) return

    if (
      ['PARTIALLY_RECEIVED', 'CONFIRMED'].includes(actionType) &&
      (!receivedAmount || Number(receivedAmount) <= 0)
    ) {
      toast.error('Informe um valor de recebimento maior que zero.')
      return
    }

    if (actionType === 'CANCELLED' && !cancellationReason.trim()) {
      toast.error('Informe o motivo do cancelamento da ordem.')
      return
    }

    try {
      setUpdatingId(actionOrder.id)

      await api.patch(`/purchase-orders/${actionOrder.id}/status`, {
        status: actionType,
        receivedAmount:
          actionType === 'PARTIALLY_RECEIVED' || actionType === 'CONFIRMED'
            ? Number(receivedAmount)
            : undefined,
        observation: observation.trim() || undefined,
        cancellationReason:
          actionType === 'CANCELLED' ? cancellationReason.trim() || undefined : undefined,
      })

      toast.success('Status da ordem atualizado com sucesso.')
      resetActionState()
      await fetchOrders()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível atualizar o status da ordem.'))
    } finally {
      setUpdatingId(null)
    }
  }

  const actionTitle =
    actionType === 'SENT'
      ? 'Enviar ordem ao fornecedor'
      : actionType === 'PARTIALLY_RECEIVED'
        ? 'Registrar recebimento parcial'
        : actionType === 'CONFIRMED'
          ? 'Confirmar recebimento total'
          : actionType === 'CLOSED'
            ? 'Encerrar ordem'
            : 'Cancelar ordem de compra'

  return (
    <div className="app-page space-y-6">
      {/* 1. Cabeçalho Padronizado */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Ordens de Compra
          </h1>
          <p className="text-sm text-muted-foreground">
            Acompanhe ordens emitidas, envie ao fornecedor, registre recebimentos parciais e conclua entregas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Menu Flutuante de Filtro */}
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
                  placeholder="Fornecedor, número OC, pedido..."
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
                <Select value={statusFilter} onValueChange={setStatusFilter}>
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
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Todas" />
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
          </FilterPopover>

          {/* Atualização */}
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            onClick={() => void fetchOrders()}
            disabled={loading}
          >
            <RotateCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </Button>
        </div>
      </section>

      {/* 2. Cards de Indicadores (KPIs em 4 colunas) */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Card 1: Total */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total de ordens
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {stats.total}
            </span>
            <span className="text-xs text-muted-foreground font-medium">
              R$ {stats.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </CardContent>
        </Card>

        {/* Card 2: Em aberto / Enviadas com Tag âmbar */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Em aberto / Enviadas
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {stats.openAndSent}
            </span>
            {stats.openAndSent > 0 && (
              <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                Acompanhar entrega
              </span>
            )}
          </CardContent>
        </Card>

        {/* Card 3: Recebimento parcial */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Recebimento parcial
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {stats.partiallyReceived}
            </span>
          </CardContent>
        </Card>

        {/* Card 4: Concluídas / Encerradas */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Recebidas / Encerradas
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {stats.confirmedAndClosed}
            </span>
            <span className="text-xs text-muted-foreground font-medium">
              R$ {stats.receivedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </CardContent>
        </Card>
      </section>

      {/* 3. Tabela Responsiva Sem Scroll Horizontal */}
      <Card className="app-section-card overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            Carregando ordens de compra...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 p-8 text-center">
            <ShoppingBag className="size-12 text-muted-foreground/50" />
            <div className="space-y-1">
              <p className="font-semibold text-foreground">Nenhuma ordem de compra encontrada</p>
              <p className="text-sm text-muted-foreground">
                {activeFilterCount > 0
                  ? 'Nenhum resultado corresponde aos filtros aplicados.'
                  : 'Assim que uma cotação for homologada e gerada como ordem, ela aparecerá aqui.'}
              </p>
            </div>
            {activeFilterCount > 0 && (
              <Button variant="outline" size="sm" onClick={handleClearFilters} className="mt-2">
                Limpar filtros
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[120px] text-xs font-semibold uppercase tracking-wider">
                    Ordem
                  </TableHead>
                  <TableHead className="min-w-[200px] text-xs font-semibold uppercase tracking-wider">
                    Fornecedor / Origem
                  </TableHead>
                  <TableHead className="w-[130px] text-xs font-semibold uppercase tracking-wider">
                    Emissão
                  </TableHead>
                  <TableHead className="w-[170px] text-xs font-semibold uppercase tracking-wider">
                    Financeiro
                  </TableHead>
                  <TableHead className="w-[160px] text-xs font-semibold uppercase tracking-wider">
                    Status
                  </TableHead>
                  <TableHead className="w-[200px] text-right text-xs font-semibold uppercase tracking-wider">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedOrders.map((order) => {
                  const isUpdating = updatingId === order.id
                  const priority = order.quotation?.request?.priority || 'NORMAL'
                  const desiredDate = order.quotation?.request?.desiredDate

                  return (
                    <TableRow key={order.id} className="transition-colors">
                      {/* Ordem & Prioridade */}
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-semibold text-foreground text-sm">
                            OC #{order.number || order.id.slice(0, 8)}
                          </p>
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.2 text-[10px] font-bold tracking-wider ${getPriorityBadgeStyle(
                              priority,
                            )}`}
                          >
                            {PRIORITY_LABELS[priority] || priority}
                          </span>
                        </div>
                      </TableCell>

                      {/* Fornecedor / Origem */}
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="font-medium text-foreground text-sm">
                            {order.supplier?.name || 'Fornecedor não informado'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {order.quotation?.request?.code
                              ? `Pedido origem #${order.quotation.request.code}`
                              : 'Sem pedido vinculado'}
                          </p>
                        </div>
                      </TableCell>

                      {/* Emissão / Previsão */}
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="text-sm text-foreground">
                            {format(new Date(order.issueDate || order.createdAt), 'dd/MM/yyyy')}
                          </p>
                          {desiredDate && (
                            <p className="text-xs text-muted-foreground">
                              Necessidade: {format(new Date(desiredDate), 'dd/MM/yyyy')}
                            </p>
                          )}
                        </div>
                      </TableCell>

                      {/* Financeiro */}
                      <TableCell>
                        <div className="space-y-0.5 text-xs">
                          <p className="font-medium text-foreground text-sm">
                            R$ {formatCurrency(order.totalValue)}
                          </p>
                          <p className="text-muted-foreground">
                            Recebido: R$ {formatCurrency(order.receivedAmount)}
                          </p>
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${getStatusBadgeStyle(
                            order.status,
                          )}`}
                        >
                          {STATUS_LABELS[order.status] || order.status}
                        </span>
                      </TableCell>

                      {/* Ações Compactas */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {order.status === 'OPEN' && (
                            <Button
                              size="sm"
                              className="h-8 px-2.5 text-xs font-semibold gap-1"
                              disabled={isUpdating}
                              onClick={() => openAction(order, 'SENT')}
                            >
                              {isUpdating ? (
                                <Loader2 className="size-3 animate-spin" />
                              ) : (
                                <Send className="size-3" />
                              )}
                              <span>Enviar</span>
                            </Button>
                          )}

                          {['SENT', 'PARTIALLY_RECEIVED'].includes(order.status) && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-2.5 text-xs font-semibold"
                              disabled={isUpdating}
                              onClick={() => openAction(order, 'PARTIALLY_RECEIVED')}
                            >
                              <span>Parcial</span>
                            </Button>
                          )}

                          {['SENT', 'PARTIALLY_RECEIVED'].includes(order.status) && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-2.5 text-xs font-semibold border-emerald-500/40 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/30 gap-1"
                              disabled={isUpdating}
                              onClick={() => openAction(order, 'CONFIRMED')}
                            >
                              <CheckCircle2 className="size-3" />
                              <span>Total</span>
                            </Button>
                          )}

                          {order.status === 'CONFIRMED' && (
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-8 px-2.5 text-xs font-semibold gap-1"
                              disabled={isUpdating}
                              onClick={() => openAction(order, 'CLOSED')}
                            >
                              <Archive className="size-3" />
                              <span>Encerrar</span>
                            </Button>
                          )}

                          {['OPEN', 'SENT'].includes(order.status) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                              disabled={isUpdating}
                              onClick={() => openAction(order, 'CANCELLED')}
                            >
                              <XCircle className="size-3 mr-1" />
                              <span>Cancelar</span>
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

        {/* 4. Rodapé com Paginação Integrada */}
        {!loading && filteredOrders.length > 0 && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-6 py-4 border-t bg-muted/10 text-xs text-muted-foreground">
            <div>
              Exibindo <span className="font-semibold text-foreground">{paginatedOrders.length}</span> de{' '}
              <span className="font-semibold text-foreground">{filteredOrders.length}</span> registros
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
                  className={`size-8 font-medium ${pageNum === currentPage ? 'pointer-events-none' : ''}`}
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

      {/* Modal Centralizado de Ação */}
      <Dialog
        open={Boolean(actionOrder && actionType)}
        onOpenChange={(open) => {
          if (!open) resetActionState()
        }}
      >
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{actionTitle}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {actionOrder && (
              <div className="rounded-lg border bg-muted/30 p-3 text-xs space-y-1">
                <p className="font-semibold text-foreground text-sm">
                  OC #{actionOrder.number || actionOrder.id.slice(0, 8)}
                </p>
                <p className="text-muted-foreground">
                  Fornecedor: <strong className="text-foreground">{actionOrder.supplier?.name}</strong>
                </p>
                <p className="text-muted-foreground">
                  Total: <strong>R$ {formatCurrency(actionOrder.totalValue)}</strong> · Recebido até agora:{' '}
                  <strong>R$ {formatCurrency(actionOrder.receivedAmount)}</strong>
                </p>
              </div>
            )}

            {(actionType === 'PARTIALLY_RECEIVED' || actionType === 'CONFIRMED') && (
              <div className="field-stack">
                <Label htmlFor="purchase-order-received-amount" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Valor recebido nesta etapa (R$)
                </Label>
                <Input
                  id="purchase-order-received-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  className="h-9 text-sm"
                  value={receivedAmount}
                  onChange={(event) => setReceivedAmount(event.target.value)}
                  placeholder={remainingAmount ? remainingAmount.toFixed(2) : '0,00'}
                />
                <p className="text-xs text-muted-foreground">
                  Valor restante da ordem: R$ {remainingAmount.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>
            )}

            {actionType === 'CANCELLED' && (
              <div className="field-stack">
                <Label htmlFor="purchase-order-cancellation-reason" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Motivo do cancelamento
                </Label>
                <Textarea
                  id="purchase-order-cancellation-reason"
                  value={cancellationReason}
                  onChange={(event) => setCancellationReason(event.target.value)}
                  placeholder="Explique detalhadamente o motivo pelo qual a ordem está sendo cancelada..."
                  className="min-h-[100px] text-sm"
                />
              </div>
            )}

            <div className="field-stack">
              <Label htmlFor="purchase-order-observation" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Observação operacional
              </Label>
              <Textarea
                id="purchase-order-observation"
                value={observation}
                onChange={(event) => setObservation(event.target.value)}
                placeholder="Opcional: anotações sobre notas fiscais, entrega ou conferência..."
                className="min-h-[90px] text-sm"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2 border-t">
            <Button variant="outline" size="sm" onClick={resetActionState}>
              Voltar
            </Button>
            <Button size="sm" onClick={() => void submitAction()} disabled={updatingId === actionOrder?.id}>
              {updatingId === actionOrder?.id ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Salvando
                </>
              ) : (
                'Confirmar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
