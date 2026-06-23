'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { ArrowRight, FileBarChart2, FileClock, Receipt, ShoppingCart } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuth } from '@/context/auth-context'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'

type ProcurementSummary = {
  kpis: {
    myRequests: number
    pendingApprovals: number
    requestsInQuotation: number
    approvedRequests: number
    orderedRequests: number
    confirmedOrdersTotal: number
  }
  requestStatusCounts: Record<string, number>
  quotationStatusCounts: Record<string, number>
  orderStatusCounts: Record<string, number>
  recentRequests: Array<{
    id: string
    code: number
    status: string
    justification: string
    createdAt: string
    estimatedTotal?: number | string | null
    requesterName: string
    departmentName?: string | null
  }>
  recentOrders: Array<{
    id: string
    number: number
    status: string
    totalValue: number | string
    createdAt: string
    issueDate?: string | null
    supplierName: string
    requestCode: number
  }>
}

const REQUEST_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Rascunho',
  PENDING: 'Aguardando aprovação',
  APPROVED: 'Aprovado',
  IN_QUOTATION: 'Em cotação',
  ORDERED: 'Ordem gerada',
  REJECTED: 'Reprovado',
}

const ORDER_STATUS_LABELS: Record<string, string> = {
  OPEN: 'Em aberto',
  SENT: 'Enviada',
  CONFIRMED: 'Recebida',
  CANCELLED: 'Cancelada',
}

export default function ProcurementDashboardPage() {
  const { hasPermission } = useAuth()
  const [summary, setSummary] = useState<ProcurementSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const { data } = await api.get<ProcurementSummary>('/dashboard/procurement/summary')
        setSummary(data)
      } catch (error) {
        toast.error(
          getApiErrorMessage(error, 'Nao foi possivel carregar o dashboard de compras.'),
        )
      } finally {
        setLoading(false)
      }
    }

    void fetchSummary()
  }, [])

  const requestDistribution = useMemo(() => {
    if (!summary) return []

    return [
      {
        label: 'Rascunhos',
        value: summary.requestStatusCounts.DRAFT || 0,
      },
      {
        label: 'Pendentes',
        value: summary.requestStatusCounts.PENDING || 0,
      },
      {
        label: 'Em cotação',
        value:
          summary.requestStatusCounts.IN_QUOTATION || summary.requestStatusCounts.QUOTING || 0,
      },
      {
        label: 'Ordenados',
        value: summary.requestStatusCounts.ORDERED || 0,
      },
    ]
  }, [summary])

  if (loading) {
    return (
      <div className="app-page">
        <Card className="app-section-card">
          <CardContent className="flex min-h-[260px] items-center justify-center p-0 text-sm text-muted-foreground">
            Carregando dashboard de compras...
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="app-page">
        <Card className="app-section-card">
          <CardContent className="flex min-h-[260px] flex-col items-center justify-center gap-4 p-0 text-center">
            <p className="text-base font-medium text-foreground">
              Não foi possível carregar o resumo de compras.
            </p>
            <Button onClick={() => window.location.reload()}>Tentar novamente</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="app-page">
      <section className="app-page-header">
        <div className="space-y-2">
          <p className="app-kicker">Compras</p>
          <h1 className="app-title">Dashboard de compras</h1>
          <p className="app-subtitle">
            Acompanhe solicitações, cotações, ordens e pendências operacionais do fluxo de compras.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline" className="gap-2">
            <Link href="/dashboard/compras/pedidos">
              Pedidos
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/dashboard/compras/cotacoes">
              Cotações
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          {hasPermission('procurement.settings.manage') ? (
            <Button asChild variant="outline" className="gap-2">
              <Link href="/dashboard/compras/configuracoes">
                Configurações
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          ) : null}
          <Button asChild className="gap-2">
            <Link href="/dashboard/compras/ordens">
              Ordens
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-4">
        <Card className="app-section-card">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-base">Minhas solicitações</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between gap-3 px-0 pb-0">
            <div>
              <p className="text-3xl font-semibold tracking-tight">{summary.kpis.myRequests}</p>
              <p className="text-sm text-muted-foreground">histórico próprio no módulo</p>
            </div>
            <Receipt className="h-5 w-5 text-primary" />
          </CardContent>
        </Card>

        <Card className="app-section-card">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-base">Pendências</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between gap-3 px-0 pb-0">
            <div>
              <p className="text-3xl font-semibold tracking-tight">
                {summary.kpis.pendingApprovals}
              </p>
              <p className="text-sm text-muted-foreground">pedidos aguardando decisão</p>
            </div>
            <FileClock className="h-5 w-5 text-primary" />
          </CardContent>
        </Card>

        <Card className="app-section-card">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-base">Em cotação</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between gap-3 px-0 pb-0">
            <div>
              <p className="text-3xl font-semibold tracking-tight">
                {summary.kpis.requestsInQuotation}
              </p>
              <p className="text-sm text-muted-foreground">processos em tratamento por compras</p>
            </div>
            <FileBarChart2 className="h-5 w-5 text-primary" />
          </CardContent>
        </Card>

        <Card className="app-section-card">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="text-base">Ordens recebidas</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between gap-3 px-0 pb-0">
            <div>
              <p className="text-2xl font-semibold tracking-tight">
                {summary.kpis.confirmedOrdersTotal.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })}
              </p>
              <p className="text-sm text-muted-foreground">valor acumulado confirmado</p>
            </div>
            <ShoppingCart className="h-5 w-5 text-primary" />
          </CardContent>
        </Card>
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.35fr]">
        <Card className="app-section-card">
          <CardHeader className="px-0 pt-0">
            <CardTitle>Distribuição das solicitações</CardTitle>
            <p className="text-sm text-muted-foreground">
              Visão rápida do pipeline atual de requisições dentro do módulo.
            </p>
          </CardHeader>
          <CardContent className="grid gap-3 px-0 pb-0">
            {requestDistribution.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-[20px] border border-border/60 bg-muted/20 px-4 py-3"
              >
                <span className="text-sm text-muted-foreground">{item.label}</span>
                <span className="font-semibold text-foreground">{item.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="app-section-card">
          <CardHeader className="px-0 pt-0">
            <CardTitle>Requisições recentes</CardTitle>
            <p className="text-sm text-muted-foreground">
              Últimas solicitações registradas no contexto da empresa atual.
            </p>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {summary.recentRequests.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-border/70 bg-muted/10 px-6 py-10 text-center">
                <p className="font-medium text-foreground">Sem requisições recentes</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Quando houver novos pedidos, eles aparecerão neste painel.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-[24px] border border-border/70">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pedido</TableHead>
                      <TableHead>Solicitante</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.recentRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium text-foreground">Pedido #{request.code}</p>
                            <p className="max-w-[320px] truncate text-sm text-muted-foreground">
                              {request.justification}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p>{request.requesterName}</p>
                            <p className="text-xs text-muted-foreground">
                              {request.departmentName || 'Sem departamento'}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={request.status === 'REJECTED' ? 'destructive' : 'outline'}>
                            {REQUEST_STATUS_LABELS[request.status] || request.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {request.estimatedTotal
                            ? `R$ ${Number(request.estimatedTotal).toLocaleString('pt-BR', {
                                minimumFractionDigits: 2,
                              })}`
                            : 'Não informado'}
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

      <Card className="app-section-card">
        <CardHeader className="px-0 pt-0">
          <CardTitle>Ordens recentes</CardTitle>
          <p className="text-sm text-muted-foreground">
            Acompanhe as últimas ordens emitidas e o status operacional de cada uma.
          </p>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {summary.recentOrders.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-border/70 bg-muted/10 px-6 py-10 text-center">
              <p className="font-medium text-foreground">Sem ordens recentes</p>
              <p className="mt-1 text-sm text-muted-foreground">
                As ordens de compra geradas a partir das cotações aparecerão aqui.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-[24px] border border-border/70">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ordem</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Emissão</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.recentOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">OC #{order.number}</p>
                          <p className="text-xs text-muted-foreground">
                            Pedido #{order.requestCode}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{order.supplierName}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            order.status === 'CONFIRMED'
                              ? 'default'
                              : order.status === 'CANCELLED'
                                ? 'destructive'
                                : 'outline'
                          }
                        >
                          {ORDER_STATUS_LABELS[order.status] || order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(order.issueDate || order.createdAt), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell>
                        R$ {Number(order.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
