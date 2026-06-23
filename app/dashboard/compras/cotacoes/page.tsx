'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { ArrowRight, FileStack, Loader2, ReceiptText } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'

type PurchaseRequest = {
  id: string
  code: number
  status: string
  justification: string
  createdAt: string
  department?: { name?: string | null } | null
  requester?: { user?: { name?: string | null } | null } | null
}

const STATUS_LABELS: Record<string, string> = {
  APPROVED: 'Aguardando cotação',
  IN_QUOTATION: 'Em cotação',
  ORDERED: 'Ordem gerada',
}

export default function QuotationsIndexPage() {
  const [requests, setRequests] = useState<PurchaseRequest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const { data } = await api.get<PurchaseRequest[]>('/purchase-requests/buyer/pending')
        setRequests(data)
      } catch (error) {
        toast.error(
          getApiErrorMessage(error, 'Nao foi possivel carregar a fila de cotacoes.'),
        )
      } finally {
        setLoading(false)
      }
    }

    void fetchRequests()
  }, [])

  const stats = useMemo(() => {
    const awaiting = requests.filter((request) => request.status === 'APPROVED').length
    const quoting = requests.filter((request) => request.status === 'IN_QUOTATION').length
    const ordered = requests.filter((request) => request.status === 'ORDERED').length

    return {
      total: requests.length,
      awaiting,
      quoting,
      ordered,
    }
  }, [requests])

  return (
    <div className="app-page">
      <section className="app-page-header">
        <div className="space-y-2">
          <p className="app-kicker">Compras</p>
          <h1 className="app-title">Cotações</h1>
          <p className="app-subtitle">
            Organize a fila de requisições aprovadas, abra fornecedores e acompanhe os
            processos já em cotação.
          </p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.95fr_0.95fr_1.1fr]">
        <Card className="app-section-card">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-base">Fila total</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-3xl font-semibold tracking-tight">{stats.total}</p>
                <p className="text-sm text-muted-foreground">requisições com tratamento de compras</p>
              </div>
              <FileStack className="h-5 w-5 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="app-section-card">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-base">Em andamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-0 pb-0 text-sm">
            <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-muted/20 px-4 py-3">
              <span className="text-muted-foreground">Aguardando abertura</span>
              <span className="font-semibold text-foreground">{stats.awaiting}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-muted/20 px-4 py-3">
              <span className="text-muted-foreground">Em cotação</span>
              <span className="font-semibold text-foreground">{stats.quoting}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="app-section-card">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-base">Resultado atual</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-0 pb-0 text-sm text-muted-foreground">
            <p>
              {stats.ordered} requisições já viraram ordem de compra. Priorize as aprovações
              pendentes e os processos ainda sem fornecedor aberto.
            </p>
            <Button asChild variant="outline" className="gap-2">
              <Link href="/dashboard/compras/ordens">
                Revisar ordens de compra
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <Card className="app-section-card">
        <CardHeader className="flex flex-col gap-2 px-0 pt-0 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <CardTitle>Fila operacional de cotações</CardTitle>
            <p className="text-sm text-muted-foreground">
              Entre no processo para abrir fornecedores, comparar propostas e escolher o vencedor.
            </p>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {loading ? (
            <div className="flex min-h-[240px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : requests.length === 0 ? (
            <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-[24px] border border-dashed border-border/70 bg-muted/10 px-6 text-center">
              <ReceiptText className="h-8 w-8 text-muted-foreground" />
              <div className="space-y-1">
                <p className="font-medium text-foreground">Nenhuma requisição aguardando cotação</p>
                <p className="text-sm text-muted-foreground">
                  Quando um pedido for aprovado e seguir para compras, ele aparecerá aqui.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-[24px] border border-border/70">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Solicitante</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Entrada</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">Pedido #{request.code}</p>
                          <p className="max-w-[420px] truncate text-sm text-muted-foreground">
                            {request.justification}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{request.requester?.user?.name || 'Não informado'}</TableCell>
                      <TableCell>{request.department?.name || 'Não informado'}</TableCell>
                      <TableCell>
                        <Badge variant={request.status === 'APPROVED' ? 'outline' : 'secondary'}>
                          {STATUS_LABELS[request.status] || request.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{format(new Date(request.createdAt), 'dd/MM/yyyy')}</TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm" className="gap-2">
                          <Link href={`/dashboard/compras/cotacoes/${request.id}`}>
                            Abrir processo
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
