'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Edit, Eye, Loader2, Plus, Search, Send } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'

type PurchaseRequest = {
  id: string
  code: number
  status: string
  justification: string
  observation?: string | null
  createdAt: string
  estimatedTotal?: number | string | null
  items: Array<{ id: string }>
}

const STATUS_META: Record<
  string,
  { label: string; variant?: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  DRAFT: { label: 'Rascunho', variant: 'secondary' },
  PENDING: { label: 'Aguardando aprovacao', variant: 'outline' },
  APPROVED: { label: 'Aprovado', variant: 'default' },
  REJECTED: { label: 'Reprovado', variant: 'destructive' },
  IN_QUOTATION: { label: 'Em cotacao', variant: 'outline' },
  ORDERED: { label: 'Ordenado', variant: 'outline' },
}

export default function MyRequestsPage() {
  const [requests, setRequests] = useState<PurchaseRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const fetchRequests = async () => {
    try {
      setLoading(true)
      const { data } = await api.get<PurchaseRequest[]>('/purchase-requests/my')
      setRequests(data)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Nao foi possivel carregar os pedidos.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [])

  const handleSubmitRequest = async (id: string) => {
    if (!confirm('Enviar este pedido para aprovacao?')) {
      return
    }

    try {
      await api.patch(`/purchase-requests/${id}/submit`)
      toast.success('Pedido enviado para aprovacao.')
      await fetchRequests()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Nao foi possivel enviar o pedido.'))
    }
  }

  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      const haystack = [request.justification, request.observation ?? '', String(request.code)]
        .join(' ')
        .toLowerCase()
      return haystack.includes(searchTerm.toLowerCase())
    })
  }, [requests, searchTerm])

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
        <div className="space-y-2">
          <p className="app-kicker">Compras</p>
          <h1 className="app-title">Meus Pedidos de Compra</h1>
          <p className="app-subtitle">
            Organize os rascunhos, acompanhe solicitacoes enviadas e entre nos detalhes
            para seguir o andamento do fluxo.
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/dashboard/compras/pedidos/new">
            <Plus className="h-4 w-4" />
            Novo pedido
          </Link>
        </Button>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="app-section-card">
          <CardContent className="p-0">
            <p className="text-sm text-muted-foreground">Pedidos cadastrados</p>
            <p className="mt-3 text-3xl font-semibold text-foreground">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="app-section-card">
          <CardContent className="p-0">
            <p className="text-sm text-muted-foreground">Rascunhos prontos para revisar</p>
            <p className="mt-3 text-3xl font-semibold text-foreground">{stats.drafts}</p>
          </CardContent>
        </Card>
        <Card className="app-section-card">
          <CardContent className="p-0">
            <p className="text-sm text-muted-foreground">Aguardando aprovacao</p>
            <p className="mt-3 text-3xl font-semibold text-foreground">{stats.pending}</p>
          </CardContent>
        </Card>
      </section>

      <Card className="app-section-card">
        <CardHeader className="pb-3">
          <div className="app-toolbar flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Lista de pedidos</CardTitle>
              <p className="text-sm text-muted-foreground">
                Use os rascunhos para revisar itens antes do envio e acompanhe os status nas
                etapas seguintes do processo.
              </p>
            </div>
            <div className="relative w-full md:w-[280px]">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar por codigo ou justificativa..."
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex min-h-[240px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Itens</TableHead>
                  <TableHead>Valor estimado</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                      Nenhum pedido encontrado para o filtro informado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRequests.map((request) => {
                    const statusMeta = STATUS_META[request.status] ?? {
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
                            : 'Nao informado'}
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
          )}
        </CardContent>
      </Card>
    </div>
  )
}
