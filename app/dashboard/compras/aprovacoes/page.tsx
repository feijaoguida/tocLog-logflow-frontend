'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Loader2, MessageSquareWarning, Search, XCircle } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { TablePagination } from '@/components/ui/table-pagination'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'

type PurchaseRequest = {
  id: string
  code: number
  status: string
  justification: string
  createdAt: string
  estimatedTotal?: number | string | null
  requester: { user: { name: string } }
  department?: { name?: string | null }
  items: Array<{
    id?: string
    product?: { name?: string | null }
    description?: string | null
    quantity: number
  }>
}

export default function ApprovalsPage() {
  const [requests, setRequests] = useState<PurchaseRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const [approveConfirm, setApproveConfirm] = useState<{
    open: boolean
    requestId: string | null
    requestNumber: number | null
  }>({
    open: false,
    requestId: null,
    requestNumber: null,
  })

  const fetchPending = async () => {
    try {
      setLoading(true)
      const { data } = await api.get<PurchaseRequest[]>('/purchase-requests/pending')
      setRequests(data)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível carregar as aprovações.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPending()
  }, [])

  const executeApprove = async () => {
    if (!approveConfirm.requestId) return

    try {
      await api.patch(`/purchase-requests/${approveConfirm.requestId}/approve`)
      toast.success('Pedido aprovado com sucesso.')
      setApproveConfirm({ open: false, requestId: null, requestNumber: null })
      await fetchPending()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível aprovar o pedido.'))
    }
  }

  const handleReject = async () => {
    if (!rejectId || !reason.trim()) {
      return
    }

    setActionLoading(true)

    try {
      await api.patch(`/purchase-requests/${rejectId}/reject`, {
        reason: reason.trim(),
      })
      toast.success('Pedido reprovado com sucesso.')
      setRejectId(null)
      setReason('')
      await fetchPending()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível reprovar o pedido.'))
    } finally {
      setActionLoading(false)
    }
  }

  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      const haystack = [
        request.justification,
        request.requester.user.name,
        request.department?.name ?? '',
        String(request.code),
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(searchTerm.toLowerCase())
    })
  }, [requests, searchTerm])

  const paginatedRequests = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredRequests.slice(start, start + pageSize)
  }, [filteredRequests, page, pageSize])

  const metrics = useMemo(() => {
    const totalEstimated = requests.reduce((total, request) => {
      return total + Number(request.estimatedTotal || 0)
    }, 0)

    return {
      count: requests.length,
      totalEstimated,
    }
  }, [requests])

  return (
    <div className="app-page">
      <section className="app-page-header">
        <div className="space-y-3">
          <div className="app-badge-row">
            <span className="app-badge">Módulo de Compras</span>
            <span className="app-badge app-badge-warning">Fila de Decisão</span>
          </div>
          <div className="space-y-1">
            <h1 className="page-title">Aprovações de compras</h1>
            <p className="page-description">
              Revise as solicitações do seu escopo, confirme a necessidade do pedido e libere o fluxo para a área de cotação.
            </p>
          </div>
        </div>
      </section>

      <section className="app-kpi-grid">
        <Card className="app-kpi-card">
          <CardContent className="space-y-2 p-0">
            <p className="kpi-label">Pendentes de aprovação</p>
            <p className="kpi-value">{metrics.count}</p>
            <p className="text-xs text-muted-foreground">pedidos aguardando sua análise</p>
          </CardContent>
        </Card>
        <Card className="app-kpi-card">
          <CardContent className="space-y-2 p-0">
            <p className="kpi-label">Volume total estimado</p>
            <p className="kpi-value">
              R${' '}
              {metrics.totalEstimated.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
              })}
            </p>
            <p className="text-xs text-muted-foreground">soma das solicitações em fila</p>
          </CardContent>
        </Card>
      </section>

      <Card className="app-section-card">
        <CardContent className="space-y-4 p-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por solicitante, justificativa..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setPage(1)
                }}
              />
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[240px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pedido / Solicitante</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead>Itens solicitados</TableHead>
                    <TableHead>Estimativa</TableHead>
                    <TableHead>Data de abertura</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                        Nenhum pedido pendente de aprovação.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="align-top">
                          <div className="space-y-1">
                            <p className="font-medium text-foreground">Pedido #{request.code}</p>
                            <p className="text-sm text-muted-foreground">{request.justification}</p>
                            <p className="text-xs text-muted-foreground">
                              Por: {request.requester.user.name}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{request.department?.name || 'Não informado'}</TableCell>
                        <TableCell className="align-top">
                          <div className="space-y-1 text-sm text-foreground">
                            {request.items.slice(0, 2).map((item, index) => (
                              <p key={item.id ?? index} className="text-xs text-muted-foreground">
                                • {Number(item.quantity)}x{' '}
                                {item.product?.name || item.description || 'Item sem descrição'}
                              </p>
                            ))}
                            {request.items.length > 2 ? (
                              <p className="text-xs font-medium text-muted-foreground">
                                +{request.items.length - 2} outro(s) item(ns)
                              </p>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          {request.estimatedTotal
                            ? `R$ ${Number(request.estimatedTotal).toLocaleString('pt-BR', {
                                minimumFractionDigits: 2,
                              })}`
                            : 'Não informado'}
                        </TableCell>
                        <TableCell>{format(new Date(request.createdAt), 'dd/MM/yyyy')}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button asChild variant="outline" size="sm">
                              <Link href={`/dashboard/compras/pedidos/${request.id}`}>Detalhes</Link>
                            </Button>
                            <Button
                              size="sm"
                              className="gap-2"
                              onClick={() =>
                                setApproveConfirm({
                                  open: true,
                                  requestId: request.id,
                                  requestNumber: request.code,
                                })
                              }
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Aprovar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-2 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                              onClick={() => setRejectId(request.id)}
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Reprovar
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              <TablePagination
                page={page}
                pageSize={pageSize}
                totalItems={filteredRequests.length}
                onPageChange={setPage}
                onPageSizeChange={(newSize) => {
                  setPageSize(newSize)
                  setPage(1)
                }}
              />
            </>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={approveConfirm.open}
        onOpenChange={(open) =>
          setApproveConfirm((prev) => ({ ...prev, open }))
        }
        title="Aprovar Pedido de Compra"
        description={`Deseja aprovar a solicitação #${approveConfirm.requestNumber}? Ela seguirá para a etapa de cotações com fornecedores.`}
        confirmText="Confirmar Aprovação"
        onConfirm={executeApprove}
      />

      <Dialog open={Boolean(rejectId)} onOpenChange={(open) => !open && setRejectId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reprovar pedido</DialogTitle>
            <DialogDescription>
              O motivo informado será registrado na trilha do pedido e compartilhado com o solicitante.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <div className="flex items-start gap-2">
                <MessageSquareWarning className="mt-0.5 h-4 w-4 shrink-0" />
                <p>Use um motivo claro para facilitar o retrabalho do solicitante.</p>
              </div>
            </div>
            <Textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Explique por que este pedido não pode seguir neste momento..."
              className="min-h-[120px]"
            />
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectId(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={actionLoading || !reason.trim()}>
              {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirmar reprovação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
