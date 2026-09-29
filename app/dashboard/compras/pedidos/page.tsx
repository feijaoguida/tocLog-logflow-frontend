'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Edit, Eye, FilePlus2, Loader2, Search, Send } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { TablePagination } from '@/components/ui/table-pagination'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'

type PurchaseRequestItem = {
  id: string
  quantity: number | string
  product?: { name?: string | null } | null
  description?: string | null
}

type PurchaseRequest = {
  id: string
  code: number
  status: string
  justification: string
  observation?: string | null
  createdAt: string
  estimatedTotal?: number | string | null
  items: PurchaseRequestItem[]
}

const STATUS_MAP: Record<string, { label: string; variant: 'secondary' | 'outline' | 'default' | 'destructive' }> = {
  DRAFT: { label: 'Rascunho', variant: 'secondary' },
  PENDING: { label: 'Aguardando aprovação', variant: 'outline' },
  APPROVED: { label: 'Aprovado', variant: 'default' },
  REJECTED: { label: 'Reprovado', variant: 'destructive' },
  IN_QUOTATION: { label: 'Em cotação', variant: 'secondary' },
  ORDERED: { label: 'Ordem gerada', variant: 'default' },
}

export default function PurchaseRequestsPage() {
  const [requests, setRequests] = useState<PurchaseRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    title: string
    description?: string
    confirmText?: string
    action?: () => Promise<void>
  }>({
    open: false,
    title: '',
  })

  const fetchRequests = async () => {
    try {
      setLoading(true)
      const { data } = await api.get<PurchaseRequest[]>('/purchase-requests/my')
      setRequests(data)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível carregar os pedidos.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [])

  const handleSubmitRequest = (id: string) => {
    setConfirmDialog({
      open: true,
      title: 'Enviar Pedido para Aprovação',
      description: 'Deseja submeter esta requisição para aprovação departamental? Uma vez enviada, a edição ficará restrita.',
      confirmText: 'Enviar para Aprovação',
      action: async () => {
        try {
          await api.patch(`/purchase-requests/${id}/submit`)
          toast.success('Pedido enviado para aprovação com sucesso.')
          await fetchRequests()
        } catch (error) {
          toast.error(getApiErrorMessage(error, 'Não foi possível enviar o pedido.'))
        }
      },
    })
  }

  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      const haystack = [request.justification, request.observation ?? '', String(request.code)]
        .join(' ')
        .toLowerCase()
      return haystack.includes(searchTerm.toLowerCase())
    })
  }, [requests, searchTerm])

  const paginatedRequests = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredRequests.slice(start, start + pageSize)
  }, [filteredRequests, page, pageSize])

  const stats = useMemo(() => {
    return {
      total: requests.length,
      drafts: requests.filter((request) => request.status === 'DRAFT').length,
      pending: requests.filter((request) => request.status === 'PENDING').length,
    }
  }, [requests])

  return (
    <div className="app-page">
      <section className="app-page-header">
        <div className="space-y-3">
          <div className="app-badge-row">
            <span className="app-badge">Módulo de Compras</span>
            <span className="app-badge app-badge-info">Solicitações</span>
          </div>
          <div className="space-y-1">
            <h1 className="page-title">Meus pedidos de compra</h1>
            <p className="page-description">
              Crie novas solicitações, envie para aprovação e acompanhe o status dos seus pedidos.
            </p>
          </div>
        </div>

        <Button asChild className="gap-2">
          <Link href="/dashboard/compras/pedidos/novo">
            <FilePlus2 className="h-4 w-4" />
            Novo pedido
          </Link>
        </Button>
      </section>

      <section className="app-kpi-grid">
        <Card className="app-kpi-card">
          <CardContent className="space-y-2 p-0">
            <p className="kpi-label">Total de solicitações</p>
            <p className="kpi-value">{stats.total}</p>
            <p className="text-xs text-muted-foreground">histórico próprio</p>
          </CardContent>
        </Card>
        <Card className="app-kpi-card">
          <CardContent className="space-y-2 p-0">
            <p className="kpi-label">Rascunhos</p>
            <p className="kpi-value">{stats.drafts}</p>
            <p className="text-xs text-muted-foreground">ainda não enviados</p>
          </CardContent>
        </Card>
        <Card className="app-kpi-card">
          <CardContent className="space-y-2 p-0">
            <p className="kpi-label">Em aprovação</p>
            <p className="kpi-value">{stats.pending}</p>
            <p className="text-xs text-muted-foreground">aguardando liderança</p>
          </CardContent>
        </Card>
      </section>

      <Card className="app-section-card">
        <CardContent className="space-y-4 p-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por número, justificativa..."
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
                    <TableHead>Identificação / Justificativa</TableHead>
                    <TableHead>Itens</TableHead>
                    <TableHead>Valor estimado</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                        Nenhum pedido encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedRequests.map((request) => {
                      const statusMeta = STATUS_MAP[request.status] ?? {
                        label: request.status,
                        variant: 'outline' as const,
                      }

                      return (
                        <TableRow key={request.id}>
                          <TableCell className="align-top">
                            <div className="space-y-1">
                              <p className="font-medium text-foreground">Pedido #{request.code}</p>
                              <p className="text-sm text-muted-foreground">
                                {request.justification}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>{request.items.length}</TableCell>
                          <TableCell>
                            {request.estimatedTotal
                              ? `R$ ${Number(request.estimatedTotal).toLocaleString('pt-BR', {
                                  minimumFractionDigits: 2,
                                })}`
                              : 'Não informado'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                          </TableCell>
                          <TableCell>
                            {format(new Date(request.createdAt), 'dd/MM/yyyy HH:mm')}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button asChild variant="outline" size="sm" className="gap-2">
                                <Link href={`/dashboard/compras/pedidos/${request.id}`}>
                                  <Eye className="h-3.5 w-3.5" />
                                  Detalhes
                                </Link>
                              </Button>
                              {request.status === 'DRAFT' ? (
                                <>
                                  <Button asChild variant="outline" size="sm" className="gap-2">
                                    <Link href={`/dashboard/compras/pedidos/${request.id}/edit`}>
                                      <Edit className="h-3.5 w-3.5" />
                                      Editar
                                    </Link>
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    className="gap-2"
                                    onClick={() => handleSubmitRequest(request.id)}
                                  >
                                    <Send className="h-3.5 w-3.5" />
                                    Enviar
                                  </Button>
                                </>
                              ) : null}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
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
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog((s) => ({ ...s, open }))}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmText={confirmDialog.confirmText}
        onConfirm={async () => {
          if (confirmDialog.action) {
            await confirmDialog.action()
          }
          setConfirmDialog((s) => ({ ...s, open: false }))
        }}
      />
    </div>
  )
}
