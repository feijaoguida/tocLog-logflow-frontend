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

  const fetchPending = async () => {
    try {
      setLoading(true)
      const { data } = await api.get<PurchaseRequest[]>('/purchase-requests/pending')
      setRequests(data)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Nao foi possivel carregar as aprovacoes.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPending()
  }, [])

  const handleApprove = async (id: string) => {
    if (!confirm('Aprovar este pedido?')) {
      return
    }

    try {
      await api.patch(`/purchase-requests/${id}/approve`)
      toast.success('Pedido aprovado com sucesso.')
      await fetchPending()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Nao foi possivel aprovar o pedido.'))
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
      toast.error(getApiErrorMessage(error, 'Nao foi possivel reprovar o pedido.'))
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

  const stats = useMemo(
    () => ({
      pending: requests.length,
      totalItems: requests.reduce((total, request) => total + request.items.length, 0),
      highValue: requests.filter((request) => Number(request.estimatedTotal || 0) >= 5000).length,
    }),
    [requests],
  )

  return (
    <div className="app-page">
      <section className="app-page-header">
        <div className="space-y-2">
          <p className="app-kicker">Compras</p>
          <h1 className="app-title">Aprovacoes Pendentes</h1>
          <p className="app-subtitle">
            Revise as solicitacoes do seu escopo, confirme a necessidade do pedido e
            registre o motivo quando a reprovação for necessária.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="app-section-card">
          <CardContent className="p-0">
            <p className="text-sm text-muted-foreground">Pedidos aguardando decisao</p>
            <p className="mt-3 text-3xl font-semibold text-foreground">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card className="app-section-card">
          <CardContent className="p-0">
            <p className="text-sm text-muted-foreground">Itens em analise</p>
            <p className="mt-3 text-3xl font-semibold text-foreground">{stats.totalItems}</p>
          </CardContent>
        </Card>
        <Card className="app-section-card">
          <CardContent className="p-0">
            <p className="text-sm text-muted-foreground">Pedidos acima de R$ 5 mil</p>
            <p className="mt-3 text-3xl font-semibold text-foreground">{stats.highValue}</p>
          </CardContent>
        </Card>
      </section>

      <Card className="app-section-card">
        <CardHeader className="pb-3">
          <div className="app-toolbar flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Fila de aprovacoes</CardTitle>
              <p className="text-sm text-muted-foreground">
                Consulte o solicitante, departamento, valor estimado e itens principais antes
                de concluir a decisao.
              </p>
            </div>
            <div className="relative w-full md:w-[280px]">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar por pedido, solicitante ou departamento..."
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
                  <TableHead>Solicitante</TableHead>
                  <TableHead>Itens</TableHead>
                  <TableHead>Valor estimado</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10">
                      <div className="flex flex-col items-center gap-3 text-center text-muted-foreground">
                        <CheckCircle2 className="h-10 w-10 text-emerald-500/40" />
                        <div>
                          <p className="font-medium text-foreground">Nenhuma aprovacao pendente</p>
                          <p className="text-sm">
                            Quando novas solicitacoes chegarem ao seu escopo, elas aparecerao aqui.
                          </p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="align-top">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">Pedido #{request.code}</span>
                            <Badge variant="outline">Pendente</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{request.justification}</p>
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="space-y-1 text-sm">
                          <p className="font-medium text-foreground">{request.requester.user.name}</p>
                          <p className="text-muted-foreground">{request.department?.name || 'Departamento nao informado'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          {request.items.slice(0, 2).map((item) => (
                            <p key={item.id ?? `${request.id}-${item.description}`}>
                              {item.quantity}x {item.product?.name || item.description || 'Item sem descricao'}
                            </p>
                          ))}
                          {request.items.length > 2 ? (
                            <p>+ {request.items.length - 2} item(ns)</p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        {request.estimatedTotal
                          ? `R$ ${Number(request.estimatedTotal).toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                            })}`
                          : 'Nao informado'}
                      </TableCell>
                      <TableCell>{format(new Date(request.createdAt), 'dd/MM/yyyy')}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/dashboard/compras/pedidos/${request.id}`}>Detalhes</Link>
                          </Button>
                          <Button size="sm" className="gap-2" onClick={() => handleApprove(request.id)}>
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
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(rejectId)} onOpenChange={(open) => !open && setRejectId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reprovar pedido</DialogTitle>
            <DialogDescription>
              O motivo informado sera registrado na trilha do pedido e compartilhado com o solicitante.
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
              placeholder="Explique por que este pedido nao pode seguir neste momento..."
              className="min-h-[120px]"
            />
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectId(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={actionLoading || !reason.trim()}>
              {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirmar reprovacao
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
