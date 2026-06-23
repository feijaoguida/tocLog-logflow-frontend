'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import { ArrowLeft, Loader2, Printer } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'

type PurchaseRequestEvent = {
  id: string
  action: string
  description?: string | null
  createdAt: string
}

type PurchaseRequestDetail = {
  id: string
  code: number
  status: string
  justification: string
  observation?: string | null
  createdAt: string
  approvalDate?: string | null
  rejectedAt?: string | null
  rejectionReason?: string | null
  estimatedTotal?: number | string | null
  requester?: {
    user?: { name?: string | null; email?: string | null } | null
    branch?: { name?: string | null } | null
  } | null
  department?: { name?: string | null } | null
  approvedBy?: { user?: { name?: string | null } | null } | null
  items: Array<{
    id: string
    quantity: number | string
    observation?: string | null
    description?: string | null
    product?: { name?: string | null } | null
    unit?: { symbol?: string | null } | null
  }>
  events?: PurchaseRequestEvent[]
}

type Quotation = {
  id: string
  status: string
  totalValue?: number | string | null
  paymentTerms?: string | null
  validityDate?: string | null
  freightCost?: number | string | null
  supplier?: { name?: string | null; cnpj?: string | null } | null
  purchaseOrder?: {
    id: string
    number?: number | null
    status: string
    totalValue?: number | string | null
    issueDate?: string | null
  } | null
}

const REQUEST_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Rascunho',
  PENDING: 'Aguardando aprovação',
  APPROVED: 'Aprovado',
  REJECTED: 'Reprovado',
  IN_QUOTATION: 'Em cotação',
  ORDERED: 'Ordem gerada',
}

const QUOTE_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Em análise',
  WON: 'Vencedora',
  LOST: 'Não selecionada',
}

const ORDER_STATUS_LABELS: Record<string, string> = {
  OPEN: 'Em aberto',
  SENT: 'Enviada',
  PARTIALLY_RECEIVED: 'Recebimento parcial',
  CONFIRMED: 'Recebida',
  CLOSED: 'Encerrada',
  CANCELLED: 'Cancelada',
}

export default function PurchaseRequestPrintPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const requestId = params.id as string
  const autoPrint = searchParams.get('autoprint') === '1'

  const [request, setRequest] = useState<PurchaseRequestDetail | null>(null)
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [loading, setLoading] = useState(true)
  const hasPrintedRef = useRef(false)

  useEffect(() => {
    if (!requestId) return

    const loadData = async () => {
      try {
        const [requestResponse, quotationResponse] = await Promise.all([
          api.get<PurchaseRequestDetail>(`/purchase-requests/${requestId}`),
          api.get<Quotation[]>(`/quotations/request/${requestId}`),
        ])

        setRequest(requestResponse.data)
        setQuotations(quotationResponse.data)
      } catch (error) {
        toast.error(getApiErrorMessage(error, 'Nao foi possivel carregar o documento para impressao.'))
      } finally {
        setLoading(false)
      }
    }

    void loadData()
  }, [requestId])

  useEffect(() => {
    if (!autoPrint || loading || !request || hasPrintedRef.current) return

    hasPrintedRef.current = true
    const timer = window.setTimeout(() => {
      window.print()
    }, 300)

    return () => window.clearTimeout(timer)
  }, [autoPrint, loading, request])

  const winningQuotation = useMemo(
    () => quotations.find((quotation) => quotation.status === 'WON') || null,
    [quotations],
  )

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!request) {
    return (
      <div className="app-page">
        <Card className="app-section-card">
          <CardContent className="flex min-h-[240px] flex-col items-center justify-center gap-4 p-0 text-center">
            <p className="text-base font-medium text-foreground">Pedido não encontrado para impressão.</p>
            <Button asChild variant="outline">
              <Link href="/dashboard/compras/pedidos">Voltar para pedidos</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="app-page print:p-0">
      <section className="app-page-header print:hidden">
        <div className="space-y-2">
          <p className="app-kicker">Compras</p>
          <h1 className="app-title">Impressão do pedido #{request.code}</h1>
          <p className="app-subtitle">
            Documento pronto para impressão ou salvamento em PDF, incluindo itens, aprovação,
            cotações e ordem gerada.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" className="gap-2" asChild>
            <Link href={`/dashboard/compras/pedidos/${request.id}`}>
              <ArrowLeft className="h-4 w-4" />
              Voltar ao pedido
            </Link>
          </Button>
          <Button className="gap-2" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Imprimir / Salvar PDF
          </Button>
        </div>
      </section>

      <div className="mx-auto w-full max-w-5xl space-y-6 print:max-w-none print:space-y-4">
        <section className="rounded-[28px] border border-border/70 bg-card px-6 py-6 print:rounded-none print:border-0 print:px-0 print:py-0">
          <div className="flex flex-wrap items-start justify-between gap-6 border-b border-border/70 pb-6">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                Documento de compra
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                Pedido #{request.code}
              </h1>
              <p className="max-w-2xl text-sm text-muted-foreground">{request.justification}</p>
            </div>
            <div className="grid gap-3 text-sm">
              <div className="flex items-center justify-between gap-6">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium text-foreground">
                  {REQUEST_STATUS_LABELS[request.status] || request.status}
                </span>
              </div>
              <div className="flex items-center justify-between gap-6">
                <span className="text-muted-foreground">Criado em</span>
                <span className="font-medium text-foreground">
                  {format(new Date(request.createdAt), 'dd/MM/yyyy HH:mm')}
                </span>
              </div>
              {request.approvalDate ? (
                <div className="flex items-center justify-between gap-6">
                  <span className="text-muted-foreground">Aprovado em</span>
                  <span className="font-medium text-foreground">
                    {format(new Date(request.approvalDate), 'dd/MM/yyyy HH:mm')}
                  </span>
                </div>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 pt-6 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[20px] border border-border/70 bg-muted/10 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Solicitante
              </p>
              <p className="mt-2 font-medium text-foreground">
                {request.requester?.user?.name || 'Não informado'}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {request.requester?.user?.email || 'Sem e-mail disponível'}
              </p>
            </div>

            <div className="rounded-[20px] border border-border/70 bg-muted/10 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Departamento
              </p>
              <p className="mt-2 font-medium text-foreground">
                {request.department?.name || 'Não informado'}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {request.requester?.branch?.name || 'Filial não informada'}
              </p>
            </div>

            <div className="rounded-[20px] border border-border/70 bg-muted/10 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Aprovador
              </p>
              <p className="mt-2 font-medium text-foreground">
                {request.approvedBy?.user?.name || 'Pendente / não informado'}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {request.approvalDate
                  ? `Aprovado em ${format(new Date(request.approvalDate), 'dd/MM/yyyy')}`
                  : 'Sem registro de aprovação'}
              </p>
            </div>

            <div className="rounded-[20px] border border-border/70 bg-muted/10 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Valor estimado
              </p>
              <p className="mt-2 font-medium text-foreground">
                {request.estimatedTotal
                  ? `R$ ${Number(request.estimatedTotal).toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                    })}`
                  : 'Não informado'}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {request.items.length} item(ns) no pedido
              </p>
            </div>
          </div>
        </section>

        <Card className="app-section-card print:rounded-none print:border print:border-border/60">
          <CardHeader className="px-0 pt-0">
            <CardTitle>Itens do pedido</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="overflow-hidden rounded-[24px] border border-border/70">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Quantidade</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead>Observação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {request.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium text-foreground">
                        {item.product?.name || item.description || 'Item sem descrição'}
                      </TableCell>
                      <TableCell>{Number(item.quantity)}</TableCell>
                      <TableCell>{item.unit?.symbol || 'unid'}</TableCell>
                      <TableCell>{item.observation || 'Sem observações adicionais'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="app-section-card print:rounded-none print:border print:border-border/60">
          <CardHeader className="px-0 pt-0">
            <CardTitle>Resumo de cotações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-0 pb-0">
            {quotations.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma cotação registrada para este pedido até o momento.
              </p>
            ) : (
              <div className="overflow-hidden rounded-[24px] border border-border/70">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Pagamento</TableHead>
                      <TableHead>Validade</TableHead>
                      <TableHead>Ordem gerada</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quotations.map((quotation) => (
                      <TableRow key={quotation.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium text-foreground">
                              {quotation.supplier?.name || 'Fornecedor não informado'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {quotation.supplier?.cnpj || 'Sem CNPJ'}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{QUOTE_STATUS_LABELS[quotation.status] || quotation.status}</TableCell>
                        <TableCell>
                          {quotation.totalValue
                            ? `R$ ${Number(quotation.totalValue).toLocaleString('pt-BR', {
                                minimumFractionDigits: 2,
                              })}`
                            : 'Não preenchido'}
                        </TableCell>
                        <TableCell>{quotation.paymentTerms || 'Não informado'}</TableCell>
                        <TableCell>
                          {quotation.validityDate
                            ? format(new Date(quotation.validityDate), 'dd/MM/yyyy')
                            : 'Não informado'}
                        </TableCell>
                        <TableCell>
                          {quotation.purchaseOrder?.number
                            ? `OC #${quotation.purchaseOrder.number}`
                            : quotation.purchaseOrder?.id
                              ? `OC ${quotation.purchaseOrder.id.slice(0, 8)}`
                              : 'Ainda não gerada'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {winningQuotation ? (
              <div className="rounded-[20px] border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-700">
                <p className="font-medium">Cotação vencedora</p>
                <p className="mt-1">
                  {winningQuotation.supplier?.name || 'Fornecedor não informado'} selecionado por{' '}
                  {winningQuotation.totalValue
                    ? `R$ ${Number(winningQuotation.totalValue).toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                      })}`
                    : 'valor ainda não preenchido'}
                  .
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="app-section-card print:rounded-none print:border print:border-border/60">
          <CardHeader className="px-0 pt-0">
            <CardTitle>Ordem de compra vinculada</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {winningQuotation?.purchaseOrder ? (
              <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-[20px] border border-border/70 bg-muted/10 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Número
                  </p>
                  <p className="mt-2 font-medium text-foreground">
                    OC #{winningQuotation.purchaseOrder.number || winningQuotation.purchaseOrder.id.slice(0, 8)}
                  </p>
                </div>
                <div className="rounded-[20px] border border-border/70 bg-muted/10 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Status
                  </p>
                  <p className="mt-2 font-medium text-foreground">
                    {ORDER_STATUS_LABELS[winningQuotation.purchaseOrder.status] ||
                      winningQuotation.purchaseOrder.status}
                  </p>
                </div>
                <div className="rounded-[20px] border border-border/70 bg-muted/10 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Emitida em
                  </p>
                  <p className="mt-2 font-medium text-foreground">
                    {winningQuotation.purchaseOrder.issueDate
                      ? format(new Date(winningQuotation.purchaseOrder.issueDate), 'dd/MM/yyyy')
                      : 'Não informado'}
                  </p>
                </div>
                <div className="rounded-[20px] border border-border/70 bg-muted/10 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Valor
                  </p>
                  <p className="mt-2 font-medium text-foreground">
                    {winningQuotation.purchaseOrder.totalValue
                      ? `R$ ${Number(winningQuotation.purchaseOrder.totalValue).toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                        })}`
                      : 'Não informado'}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Este pedido ainda não possui ordem de compra vinculada.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="app-section-card print:rounded-none print:border print:border-border/60">
          <CardHeader className="px-0 pt-0">
            <CardTitle>Trilha auditável</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-0 pb-0">
            {(request.events || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum evento auditável registrado para este pedido.
              </p>
            ) : (
              request.events?.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start justify-between gap-3 rounded-[18px] border border-border/60 bg-muted/10 px-4 py-3"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      {event.description || event.action}
                    </p>
                    <p className="text-xs text-muted-foreground">{event.action}</p>
                  </div>
                  <span className="whitespace-nowrap text-xs text-muted-foreground">
                    {format(new Date(event.createdAt), 'dd/MM/yyyy HH:mm')}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
