'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Printer } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { PurchaseRequestTimeline } from '@/components/dashboard/widgets/PurchaseRequestTimeline'
import { EventTimeline } from '@/components/dashboard/widgets/EventTimeline'
import { QuotationsList } from '@/components/dashboard/widgets/QuotationsList'
import { QuotationForm } from '@/components/dashboard/widgets/QuotationForm'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'

type PurchaseRequestEvent = {
  id: string
  action: string
  description?: string | null
  createdAt: string
  metadata?: Record<string, unknown> | null
}

type PurchaseRequestDetail = {
  id: string
  code: number
  status: string
  justification: string
  observation?: string | null
  createdAt: string
  approvalDate?: string | null
  rejectionReason?: string | null
  estimatedTotal?: number | string | null
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' | null
  desiredDate?: string | null
  requester?: { user?: { name?: string | null } | null } | null
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
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Rascunho',
  PENDING: 'Aguardando aprovação',
  APPROVED: 'Aprovado',
  REJECTED: 'Reprovado',
  IN_QUOTATION: 'Em cotação',
  ORDERED: 'Ordem gerada',
}

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Baixa',
  NORMAL: 'Normal',
  HIGH: 'Alta',
  URGENT: 'Urgente',
}

export default function RequestDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const requestId = params.id as string

  const [request, setRequest] = useState<PurchaseRequestDetail | null>(null)
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [loading, setLoading] = useState(true)
  const [isQuoteFormOpen, setIsQuoteFormOpen] = useState(false)
  const [editingQuote, setEditingQuote] = useState<any>(null)

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    title: string
    description?: string
    confirmText?: string
    variant?: 'default' | 'destructive'
    action?: () => Promise<void>
  }>({
    open: false,
    title: '',
  })

  const fetchDetails = async () => {
    try {
      const { data } = await api.get<PurchaseRequestDetail>(`/purchase-requests/${requestId}`)
      setRequest(data)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível carregar o pedido.'))
      router.push('/dashboard/compras/pedidos')
    } finally {
      setLoading(false)
    }
  }

  const fetchQuotations = async () => {
    try {
      const { data } = await api.get(`/quotations/request/${requestId}`)
      setQuotations(data)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível carregar as cotações.'))
    }
  }

  useEffect(() => {
    if (!requestId) return
    void fetchDetails()
    void fetchQuotations()
  }, [requestId])

  const handleSetWinner = (quoteId: string) => {
    setConfirmDialog({
      open: true,
      title: 'Confirmar Cotação Vencedora',
      description: 'Deseja definir esta cotação como vencedora? Isso encerrará o processo de cotação para as demais propostas.',
      confirmText: 'Definir Vencedor',
      action: async () => {
        try {
          await api.patch(`/quotations/${quoteId}/win`)
          toast.success('Cotação aprovada com sucesso.')
          await fetchQuotations()
          await fetchDetails()
        } catch (error) {
          toast.error(getApiErrorMessage(error, 'Não foi possível definir a cotação vencedora.'))
        }
      },
    })
  }

  const handleGenerateOrder = (quoteId: string) => {
    setConfirmDialog({
      open: true,
      title: 'Gerar Ordem de Compra',
      description: 'Deseja emitir a Ordem de Compra oficial com base nesta cotação vencedora?',
      confirmText: 'Gerar Ordem',
      action: async () => {
        try {
          await api.post(`/purchase-orders/generate/${quoteId}`)
          toast.success('Ordem de compra gerada com sucesso.')
          router.push('/dashboard/compras/ordens')
        } catch (error) {
          toast.error(getApiErrorMessage(error, 'Não foi possível gerar a ordem de compra.'))
        }
      },
    })
  }

  const isQuotationEnabled = useMemo(() => {
    if (!request) return false
    return ['APPROVED', 'IN_QUOTATION', 'ORDERED'].includes(request.status)
  }, [request])

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!request) {
    return null
  }

  return (
    <div className="app-page">
      <section className="app-page-header">
        <div className="space-y-3">
          <div className="app-badge-row">
            <span className="app-badge">Modulo de Compras</span>
            <span className="app-badge app-badge-info">Auditoria Integrada</span>
          </div>
          <div className="space-y-1">
            <h1 className="page-title">Requisicao #{request.code}</h1>
            <p className="page-description">
              Solicitacao aberta em {format(new Date(request.createdAt), 'dd/MM/yyyy HH:mm')} por{' '}
              {request.requester?.user?.name || 'Solicitante'}.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Badge
            variant={
              request.status === 'APPROVED' || request.status === 'ORDERED'
                ? 'default'
                : request.status === 'REJECTED'
                  ? 'destructive'
                  : 'secondary'
            }
          >
            {STATUS_LABELS[request.status] || request.status}
          </Badge>
          <Button asChild variant="outline" className="gap-2">
            <Link href={`/dashboard/compras/pedidos/${request.id}/print?autoprint=1`} target="_blank">
              <Printer className="h-4 w-4" />
              Imprimir
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link href="/dashboard/compras/pedidos">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Link>
          </Button>
        </div>
      </section>

      <Card className="app-section-card">
        <CardContent className="space-y-6 p-0">
          <div className="space-y-1">
            <h2 className="section-title">Andamento do pedido</h2>
            <p className="text-sm text-muted-foreground">
              Acompanhe a etapa atual e a jornada passo a passo do fluxo desde a submissão.
            </p>
          </div>
          <PurchaseRequestTimeline
            status={request.status}
            createdAt={request.createdAt}
            approvalDate={request.approvalDate}
            rejectedDate={request.events?.[request.events.length - 1]?.createdAt}
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
        <div className="space-y-6">
          <Card className="app-section-card">
            <CardHeader className="px-0 pt-0">
              <CardTitle>Itens solicitados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 px-0 pb-0">
              {request.items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-[20px] border border-border/60 bg-muted/20 px-4 py-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">
                        {item.product?.name || item.description || 'Item sem descricao'}
                      </p>
                      {item.observation ? (
                        <p className="mt-1 text-sm text-muted-foreground">{item.observation}</p>
                      ) : null}
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      {Number(item.quantity)} {item.unit?.symbol || 'unid'}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="app-section-card">
            <CardHeader className="px-0 pt-0">
              <CardTitle>Detalhes e contexto</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5 px-0 pb-0 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Justificativa</p>
                <p className="text-sm text-muted-foreground">{request.justification}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Observacoes gerais</p>
                <p className="text-sm text-muted-foreground">
                  {request.observation || 'Nenhuma observacao adicional informada.'}
                </p>
              </div>
            </CardContent>
          </Card>

          {isQuotationEnabled ? (
            <QuotationsList
              quotations={quotations as any[]}
              requestId={request.id}
              isRequestApproved={request.status !== 'PENDING' && request.status !== 'REJECTED' && request.status !== 'DRAFT'}
              onAddClick={() => {
                setEditingQuote(null)
                setIsQuoteFormOpen(true)
              }}
              onEditClick={(quote) => {
                setEditingQuote(quote)
                setIsQuoteFormOpen(true)
              }}
              onSetWinner={handleSetWinner}
              onGenerateOrder={handleGenerateOrder}
            />
          ) : null}
        </div>

        <div className="space-y-6">
          <Card className="app-section-card">
            <CardHeader className="px-0 pt-0">
              <CardTitle>Resumo operacional</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 px-0 pb-0 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Departamento</span>
                <span className="font-medium text-foreground">
                  {request.department?.name || 'Nao informado'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Prioridade</span>
                <span className="font-medium text-foreground">
                  {PRIORITY_LABELS[request.priority || 'NORMAL'] || 'Normal'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Valor estimado</span>
                <span className="font-medium text-foreground">
                  {request.estimatedTotal
                    ? `R$ ${Number(request.estimatedTotal).toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                      })}`
                    : 'Nao informado'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Data desejada</span>
                <span className="font-medium text-foreground">
                  {request.desiredDate
                    ? format(new Date(request.desiredDate), 'dd/MM/yyyy')
                    : 'Nao informada'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Itens cadastrados</span>
                <span className="font-medium text-foreground">{request.items.length}</span>
              </div>

              {request.approvedBy?.user?.name ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700">
                  <p className="text-sm font-medium">Aprovado por</p>
                  <p className="mt-1 text-sm">{request.approvedBy.user.name}</p>
                </div>
              ) : null}

              {request.status === 'REJECTED' && request.rejectionReason ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
                  <p className="text-sm font-medium">Motivo da reprovacao</p>
                  <p className="mt-1 text-sm">{request.rejectionReason}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="app-section-card">
            <CardHeader className="px-0 pt-0">
              <CardTitle>Trilha de eventos e auditoria</CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <EventTimeline events={request.events} />
            </CardContent>
          </Card>
        </div>
      </div>

      <QuotationForm
        open={isQuoteFormOpen}
        onOpenChange={setIsQuoteFormOpen}
        requestId={request.id}
        requestItems={request.items as any[]}
        quotationId={editingQuote?.id}
        onSuccess={() => {
          void fetchQuotations()
          void fetchDetails()
        }}
      />

      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog((s) => ({ ...s, open }))}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmText={confirmDialog.confirmText}
        variant={confirmDialog.variant}
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
