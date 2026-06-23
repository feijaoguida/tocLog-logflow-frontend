'use client'

import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import {
  Archive,
  CheckCircle2,
  Loader2,
  Send,
  ShoppingBag,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
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

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Baixa',
  NORMAL: 'Normal',
  HIGH: 'Alta',
  URGENT: 'Urgente',
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

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const { data } = await api.get<PurchaseOrder[]>('/purchase-orders')
      setOrders(data)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Nao foi possivel carregar as ordens de compra.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchOrders()
  }, [])

  const stats = useMemo(() => {
    const totalValue = orders.reduce((sum, order) => sum + Number(order.totalValue || 0), 0)
    const receivedValue = orders.reduce(
      (sum, order) => sum + Number(order.receivedAmount || 0),
      0,
    )

    return {
      total: orders.length,
      open: orders.filter((order) => order.status === 'OPEN').length,
      sent: orders.filter((order) => order.status === 'SENT').length,
      partial: orders.filter((order) => order.status === 'PARTIALLY_RECEIVED').length,
      confirmed: orders.filter((order) => ['CONFIRMED', 'CLOSED'].includes(order.status)).length,
      closed: orders.filter((order) => order.status === 'CLOSED').length,
      cancelled: orders.filter((order) => order.status === 'CANCELLED').length,
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
      toast.error(getApiErrorMessage(error, 'Nao foi possivel atualizar o status da ordem.'))
    } finally {
      setUpdatingId(null)
    }
  }

  const actionTitle =
    actionType === 'SENT'
      ? 'Enviar ordem'
      : actionType === 'PARTIALLY_RECEIVED'
        ? 'Registrar recebimento parcial'
        : actionType === 'CONFIRMED'
          ? 'Confirmar recebimento total'
          : actionType === 'CLOSED'
            ? 'Encerrar ordem'
            : 'Cancelar ordem'

  return (
    <div className="app-page">
      <section className="app-page-header">
        <div className="space-y-2">
          <p className="app-kicker">Compras</p>
          <h1 className="app-title">Ordens de compra</h1>
          <p className="app-subtitle">
            Acompanhe as ordens geradas a partir das cotações vencedoras, trate urgências reais e
            registre envio, recebimento parcial, recebimento total e encerramento com trilha clara.
          </p>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_0.9fr_1.2fr]">
        <Card className="app-section-card">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-base">Volume emitido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 px-0 pb-0">
            <p className="text-3xl font-semibold tracking-tight">{stats.total}</p>
            <p className="text-sm text-muted-foreground">ordens emitidas neste ambiente</p>
            <p className="text-sm font-medium text-foreground">
              R$ {stats.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card className="app-section-card">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-base">Situação operacional</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 px-0 pb-0 text-sm">
            <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-muted/20 px-4 py-3">
              <span className="text-muted-foreground">Em aberto</span>
              <span className="font-semibold text-foreground">{stats.open}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-muted/20 px-4 py-3">
              <span className="text-muted-foreground">Enviadas</span>
              <span className="font-semibold text-foreground">{stats.sent}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-muted/20 px-4 py-3">
              <span className="text-muted-foreground">Parcialmente recebidas</span>
              <span className="font-semibold text-foreground">{stats.partial}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="app-section-card">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-base">Fechamento</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 px-0 pb-0 text-sm">
            <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-muted/20 px-4 py-3">
              <span className="text-muted-foreground">Recebidas ou encerradas</span>
              <span className="font-semibold text-foreground">{stats.confirmed}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-muted/20 px-4 py-3">
              <span className="text-muted-foreground">Encerradas</span>
              <span className="font-semibold text-foreground">{stats.closed}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-muted/20 px-4 py-3">
              <span className="text-muted-foreground">Valor recebido</span>
              <span className="font-semibold text-foreground">
                R$ {stats.receivedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-muted/20 px-4 py-3">
              <span className="text-muted-foreground">Canceladas</span>
              <span className="font-semibold text-foreground">{stats.cancelled}</span>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="app-section-card">
        <CardHeader className="px-0 pt-0">
          <CardTitle>Fila de ordens</CardTitle>
          <p className="text-sm text-muted-foreground">
            Use esta área para enviar ordens ao fornecedor, registrar recebimentos parciais, fechar
            a entrega total e encerrar o processo quando tudo estiver conferido.
          </p>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {loading ? (
            <div className="flex min-h-[240px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : orders.length === 0 ? (
            <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-[24px] border border-dashed border-border/70 bg-muted/10 px-6 text-center">
              <ShoppingBag className="h-8 w-8 text-muted-foreground" />
              <div className="space-y-1">
                <p className="font-medium text-foreground">Nenhuma ordem de compra gerada</p>
                <p className="text-sm text-muted-foreground">
                  Assim que uma cotação vencedora for transformada em ordem, ela aparecerá aqui.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-[24px] border border-border/70">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ordem</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Pedido origem</TableHead>
                    <TableHead>Emissão</TableHead>
                    <TableHead>Financeiro</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => {
                    const isUpdating = updatingId === order.id
                    const priority = order.quotation?.request?.priority || 'NORMAL'
                    const desiredDate = order.quotation?.request?.desiredDate

                    return (
                      <TableRow key={order.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium text-foreground">
                              OC #{order.number || order.id.slice(0, 8)}
                            </p>
                            {priority ? (
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge
                                  variant={priority === 'URGENT' ? 'destructive' : 'outline'}
                                >
                                  {PRIORITY_LABELS[priority] || priority}
                                </Badge>
                                {desiredDate ? (
                                  <span className="text-xs text-muted-foreground">
                                    Necessidade: {format(new Date(desiredDate), 'dd/MM/yyyy')}
                                  </span>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>{order.supplier?.name || 'Nao informado'}</TableCell>
                        <TableCell>
                          {order.quotation?.request?.code
                            ? `Pedido #${order.quotation.request.code}`
                            : 'Nao informado'}
                        </TableCell>
                        <TableCell>
                          {format(new Date(order.issueDate || order.createdAt), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p>
                              Total: R$ {formatCurrency(order.totalValue)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Recebido: R$ {formatCurrency(order.receivedAmount)}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              ['CONFIRMED', 'CLOSED'].includes(order.status)
                                ? 'default'
                                : order.status === 'CANCELLED'
                                  ? 'destructive'
                                  : 'outline'
                            }
                          >
                            {STATUS_LABELS[order.status] || order.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            {order.status === 'OPEN' ? (
                              <Button
                                size="sm"
                                className="gap-2"
                                disabled={isUpdating}
                                onClick={() => openAction(order, 'SENT')}
                              >
                                {isUpdating ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Send className="h-4 w-4" />
                                )}
                                Enviar
                              </Button>
                            ) : null}

                            {['SENT', 'PARTIALLY_RECEIVED'].includes(order.status) ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-2"
                                disabled={isUpdating}
                                onClick={() => openAction(order, 'PARTIALLY_RECEIVED')}
                              >
                                Registrar parcial
                              </Button>
                            ) : null}

                            {['SENT', 'PARTIALLY_RECEIVED'].includes(order.status) ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-2"
                                disabled={isUpdating}
                                onClick={() => openAction(order, 'CONFIRMED')}
                              >
                                {isUpdating ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="h-4 w-4" />
                                )}
                                Receber total
                              </Button>
                            ) : null}

                            {order.status === 'CONFIRMED' ? (
                              <Button
                                size="sm"
                                variant="secondary"
                                className="gap-2"
                                disabled={isUpdating}
                                onClick={() => openAction(order, 'CLOSED')}
                              >
                                <Archive className="h-4 w-4" />
                                Encerrar
                              </Button>
                            ) : null}

                            {['OPEN', 'SENT'].includes(order.status) ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="gap-2 text-destructive hover:text-destructive"
                                disabled={isUpdating}
                                onClick={() => openAction(order, 'CANCELLED')}
                              >
                                {isUpdating ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <XCircle className="h-4 w-4" />
                                )}
                                Cancelar
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
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(actionOrder && actionType)}
        onOpenChange={(open) => {
          if (!open) resetActionState()
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{actionTitle}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {actionOrder ? (
              <div className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-3 text-sm">
                <p className="font-medium text-foreground">
                  OC #{actionOrder.number || actionOrder.id.slice(0, 8)}
                </p>
                <p className="mt-1 text-muted-foreground">
                  Total: R$ {formatCurrency(actionOrder.totalValue)} · Recebido até agora: R${' '}
                  {formatCurrency(actionOrder.receivedAmount)}
                </p>
                {actionOrder.quotation?.request?.desiredDate ? (
                  <p className="mt-1 text-muted-foreground">
                    Data desejada:{' '}
                    {format(new Date(actionOrder.quotation.request.desiredDate), 'dd/MM/yyyy')}
                  </p>
                ) : null}
              </div>
            ) : null}

            {actionType === 'PARTIALLY_RECEIVED' || actionType === 'CONFIRMED' ? (
              <div className="field-stack">
                <Label htmlFor="purchase-order-received-amount">
                  Valor recebido nesta etapa
                </Label>
                <Input
                  id="purchase-order-received-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
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
            ) : null}

            {actionType === 'CANCELLED' ? (
              <div className="field-stack">
                <Label htmlFor="purchase-order-cancellation-reason">
                  Motivo do cancelamento
                </Label>
                <Textarea
                  id="purchase-order-cancellation-reason"
                  value={cancellationReason}
                  onChange={(event) => setCancellationReason(event.target.value)}
                  placeholder="Explique por que a ordem nao sera mais executada."
                  className="min-h-[120px]"
                />
              </div>
            ) : null}

            <div className="field-stack">
              <Label htmlFor="purchase-order-observation">Observação operacional</Label>
              <Textarea
                id="purchase-order-observation"
                value={observation}
                onChange={(event) => setObservation(event.target.value)}
                placeholder="Opcional: detalhe a conferência, a entrega ou o contexto da decisão."
                className="min-h-[110px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetActionState}>
              Voltar
            </Button>
            <Button onClick={() => void submitAction()} disabled={updatingId === actionOrder?.id}>
              {updatingId === actionOrder?.id ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando
                </>
              ) : (
                'Confirmar ação'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
