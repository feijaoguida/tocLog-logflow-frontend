'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import {
  ArrowRight,
  FileBarChart2,
  FileClock,
  Plus,
  Receipt,
  RotateCw,
  ShoppingCart,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAuth } from '@/context/auth-context'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'
import { AiContextualChatDialog } from '@/components/ai/ai-contextual-chat-dialog'

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
  PARTIALLY_RECEIVED: 'Recebimento parcial',
  CONFIRMED: 'Recebida',
  CLOSED: 'Encerrada',
  CANCELLED: 'Cancelada',
}

function getRequestStatusBadgeStyle(status: string) {
  switch (status) {
    case 'PENDING':
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60'
    case 'APPROVED':
    case 'ORDERED':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60'
    case 'IN_QUOTATION':
      return 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900/60'
    case 'REJECTED':
      return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60'
    case 'DRAFT':
    default:
      return 'bg-muted text-muted-foreground border-border'
  }
}

function getOrderStatusBadgeStyle(status: string) {
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

export default function ProcurementDashboardPage() {
  const { hasPermission } = useAuth()
  const [summary, setSummary] = useState<ProcurementSummary | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchSummary = async () => {
    setLoading(true)
    try {
      const { data } = await api.get<ProcurementSummary>('/dashboard/procurement/summary')
      setSummary(data)
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, 'Não foi possível carregar o dashboard de compras.'),
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
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
        label: 'Pendentes de aprovação',
        value: summary.requestStatusCounts.PENDING || 0,
      },
      {
        label: 'Em cotação',
        value:
          summary.requestStatusCounts.IN_QUOTATION || summary.requestStatusCounts.QUOTING || 0,
      },
      {
        label: 'Com ordem de compra',
        value: summary.requestStatusCounts.ORDERED || 0,
      },
    ]
  }, [summary])

  if (loading && !summary) {
    return (
      <div className="app-page space-y-6">
        <div className="py-20 text-center text-sm text-muted-foreground">
          Carregando dashboard de compras...
        </div>
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="app-page space-y-6">
        <Card className="app-section-card p-8 text-center space-y-4">
          <p className="text-base font-medium text-foreground">
            Não foi possível carregar o resumo de compras.
          </p>
          <Button onClick={() => void fetchSummary()}>Tentar novamente</Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="app-page space-y-6">
      {/* 1. Cabeçalho Padronizado */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Dashboard de Compras
          </h1>
          <p className="text-sm text-muted-foreground">
            Acompanhe solicitações, cotações, ordens e pendências operacionais do fluxo de suprimentos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm" className="h-9 gap-1.5 font-semibold">
            <Link href="/dashboard/compras/pedidos/new">
              <Plus className="size-4" />
              <span>Novo pedido</span>
            </Link>
          </Button>

          <AiContextualChatDialog module="compras" title="Assistente de Compras" />

          <Button asChild variant="outline" size="sm" className="h-9 gap-1.5">
            <Link href="/dashboard/compras/pedidos">
              <span>Pedidos</span>
            </Link>
          </Button>

          <Button asChild variant="outline" size="sm" className="h-9 gap-1.5">
            <Link href="/dashboard/compras/cotacoes">
              <span>Cotações</span>
            </Link>
          </Button>

          <Button asChild variant="outline" size="sm" className="h-9 gap-1.5">
            <Link href="/dashboard/compras/ordens">
              <span>Ordens</span>
            </Link>
          </Button>

          {hasPermission('procurement.settings.manage') && (
            <Button asChild variant="outline" size="sm" className="h-9 gap-1.5">
              <Link href="/dashboard/compras/configuracoes">
                <span>Configurações</span>
              </Link>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            onClick={() => void fetchSummary()}
            disabled={loading}
          >
            <RotateCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </Button>
        </div>
      </section>

      {/* 2. Cards de Indicadores Operacionais (KPIs) */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Card 1: Minhas solicitações */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Minhas solicitações
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {summary.kpis.myRequests}
            </span>
            <Receipt className="size-5 text-muted-foreground/60" />
          </CardContent>
        </Card>

        {/* Card 2: Pendências de aprovação com Tag âmbar */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Pendências
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2 flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-foreground">
                {summary.kpis.pendingApprovals}
              </span>
              {summary.kpis.pendingApprovals > 0 && (
                <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                  Ação necessária
                </span>
              )}
            </div>
            <FileClock className="size-5 text-muted-foreground/60" />
          </CardContent>
        </Card>

        {/* Card 3: Em cotação */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Em cotação
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {summary.kpis.requestsInQuotation}
            </span>
            <FileBarChart2 className="size-5 text-muted-foreground/60" />
          </CardContent>
        </Card>

        {/* Card 4: Ordens recebidas / Fechadas */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Ordens confirmadas
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {summary.kpis.confirmedOrdersTotal.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
            </span>
            <ShoppingCart className="size-5 text-muted-foreground/60" />
          </CardContent>
        </Card>
      </section>

      {/* Grid de Pipeline e Requisições Recentes */}
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.35fr]">
        {/* Distribuição das solicitações */}
        <Card className="app-section-card p-5">
          <div className="space-y-1 mb-4">
            <h2 className="text-base font-semibold text-foreground">
              Distribuição das solicitações
            </h2>
            <p className="text-xs text-muted-foreground">
              Visão rápida do pipeline atual de requisições no módulo.
            </p>
          </div>
          <div className="space-y-2.5">
            {requestDistribution.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-lg border px-3.5 py-2.5 transition-colors hover:bg-muted/30"
              >
                <span className="text-sm text-muted-foreground">{item.label}</span>
                <span className="text-sm font-semibold text-foreground">{item.value}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Requisições recentes */}
        <Card className="app-section-card overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Requisições recentes
              </h2>
              <p className="text-xs text-muted-foreground">
                Últimas solicitações registradas no sistema.
              </p>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-xs font-medium gap-1 text-muted-foreground hover:text-foreground">
              <Link href="/dashboard/compras/pedidos">
                <span>Ver todos</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>

          {summary.recentRequests.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Nenhuma requisição recente encontrada.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[80px] text-xs font-semibold uppercase tracking-wider">
                      ID
                    </TableHead>
                    <TableHead className="min-w-[200px] text-xs font-semibold uppercase tracking-wider">
                      Pedido / Justificativa
                    </TableHead>
                    <TableHead className="min-w-[150px] text-xs font-semibold uppercase tracking-wider">
                      Solicitante
                    </TableHead>
                    <TableHead className="w-[120px] text-xs font-semibold uppercase tracking-wider">
                      Status
                    </TableHead>
                    <TableHead className="w-[120px] text-right text-xs font-semibold uppercase tracking-wider">
                      Valor
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.recentRequests.map((request) => (
                    <TableRow key={request.id} className="transition-colors">
                      <TableCell className="font-semibold text-muted-foreground text-sm">
                        #{request.code}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <Link
                            href={`/dashboard/compras/pedidos/${request.id}`}
                            className="font-medium text-foreground text-sm hover:underline line-clamp-1"
                          >
                            {request.justification}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(request.createdAt), 'dd/MM/yyyy')}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium text-foreground">
                            {request.requesterName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {request.departmentName || 'Sem departamento'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${getRequestStatusBadgeStyle(
                            request.status,
                          )}`}
                        >
                          {REQUEST_STATUS_LABELS[request.status] || request.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium text-sm">
                        {request.estimatedTotal
                          ? Number(request.estimatedTotal).toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            })
                          : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>

      {/* Ordens Recentes */}
      <Card className="app-section-card overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Ordens de compra recentes
            </h2>
            <p className="text-xs text-muted-foreground">
              Acompanhe as últimas ordens emitidas e o status de recebimento.
            </p>
          </div>
          <Button asChild variant="ghost" size="sm" className="text-xs font-medium gap-1 text-muted-foreground hover:text-foreground">
            <Link href="/dashboard/compras/ordens">
              <span>Ver todas as ordens</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>

        {summary.recentOrders.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Nenhuma ordem de compra recente emitida.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[100px] text-xs font-semibold uppercase tracking-wider">
                    Ordem
                  </TableHead>
                  <TableHead className="min-w-[180px] text-xs font-semibold uppercase tracking-wider">
                    Fornecedor
                  </TableHead>
                  <TableHead className="w-[100px] text-xs font-semibold uppercase tracking-wider">
                    Origem
                  </TableHead>
                  <TableHead className="w-[110px] text-xs font-semibold uppercase tracking-wider">
                    Emissão
                  </TableHead>
                  <TableHead className="w-[140px] text-xs font-semibold uppercase tracking-wider">
                    Status
                  </TableHead>
                  <TableHead className="w-[130px] text-right text-xs font-semibold uppercase tracking-wider">
                    Total
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.recentOrders.map((order) => (
                  <TableRow key={order.id} className="transition-colors">
                    <TableCell className="font-semibold text-foreground text-sm">
                      OC #{order.number}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {order.supplierName}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      Pedido #{order.requestCode}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(order.issueDate || order.createdAt), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${getOrderStatusBadgeStyle(
                          order.status,
                        )}`}
                      >
                        {ORDER_STATUS_LABELS[order.status] || order.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium text-sm">
                      {Number(order.totalValue).toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  )
}
