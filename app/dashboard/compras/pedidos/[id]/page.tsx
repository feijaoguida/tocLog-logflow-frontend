'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Printer, RotateCw } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { PurchaseRequestTimeline } from '@/components/dashboard/widgets/PurchaseRequestTimeline'
import { EventTimeline } from '@/components/dashboard/widgets/EventTimeline'
import { QuotationsList } from '@/components/dashboard/widgets/QuotationsList'
import { QuotationForm } from '@/components/dashboard/widgets/QuotationForm'
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
  LOW: 'BAIXA',
  NORMAL: 'NORMAL',
  HIGH: 'ALTA',
  URGENT: 'URGENTE',
}

function getStatusBadgeStyle(status: string) {
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

function getPriorityBadgeStyle(priority: string) {
  switch (priority) {
    case 'URGENT':
      return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60'
    case 'HIGH':
      return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900/60'
    case 'NORMAL':
    case 'LOW':
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-800'
  }
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
      <div className="app-page space-y-6">
        <div className="flex min-h-[320px] items-center justify-center">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (!request) {
    return null
  }

  return (
    <div className="app-page space-y-6">
      {/* 1. Cabeçalho Padronizado */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Pedido #{request.code}
            </h1>
            <span
              className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${getStatusBadgeStyle(
                request.status,
              )}`}
            >
              {STATUS_LABELS[request.status] || request.status}
            </span>
            {request.priority && (
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.2 text-[10px] font-bold tracking-wider ${getPriorityBadgeStyle(
                  request.priority,
                )}`}
              >
                {PRIORITY_LABELS[request.priority] || request.priority}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Aberto em {format(new Date(request.createdAt), 'dd/MM/yyyy HH:mm')} por{' '}
            <strong className="text-foreground">{request.requester?.user?.name || 'Solicitante'}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm" className="h-9 gap-1.5 font-medium">
            <Link
              href={`/dashboard/compras/pedidos/${request.id}/print?autoprint=1`}
              target="_blank"
            >
              <Printer className="size-4" />
              <span>Imprimir</span>
            </Link>
          </Button>

          <Button asChild variant="outline" size="sm" className="h-9 gap-1.5 font-medium">
            <Link href="/dashboard/compras/pedidos">
              <ArrowLeft className="size-4" />
              <span>Voltar</span>
            </Link>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            onClick={() => {
              void fetchDetails()
              void fetchQuotations()
            }}
          >
            <RotateCw className="size-4" />
            <span>Atualizar</span>
          </Button>
        </div>
      </section>

      {/* 2. Andamento do Pedido (Timeline) */}
      <Card className="app-section-card p-5">
        <div className="space-y-1 mb-4">
          <h2 className="text-base font-semibold text-foreground">
            Andamento da solicitação
          </h2>
          <p className="text-xs text-muted-foreground">
            Jornada passo a passo desde a abertura até a conclusão do processo.
          </p>
        </div>
        <PurchaseRequestTimeline
          status={request.status}
          createdAt={request.createdAt}
          approvalDate={request.approvalDate}
          rejectedDate={request.events?.[request.events.length - 1]?.createdAt}
        />
      </Card>

      {/* 3. Grid de Conteúdo */}
      <div className="grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
        <div className="space-y-6">
          {/* Itens Solicitados */}
          <Card className="app-section-card p-5">
            <div className="space-y-1 mb-4">
              <h2 className="text-base font-semibold text-foreground">
                Itens solicitados ({request.items.length})
              </h2>
              <p className="text-xs text-muted-foreground">
                Especificação dos materiais ou serviços requeridos.
              </p>
            </div>

            <div className="space-y-2.5">
              {request.items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border bg-muted/20 p-3.5 flex flex-wrap items-start justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <p className="font-semibold text-foreground text-sm">
                      {item.product?.name || item.description || 'Item sem descrição'}
                    </p>
                    {item.observation && (
                      <p className="text-xs text-muted-foreground">{item.observation}</p>
                    )}
                  </div>
                  <span className="inline-flex items-center rounded-full bg-background border px-2.5 py-0.5 text-xs font-bold text-foreground">
                    {Number(item.quantity)} {item.unit?.symbol || 'un'}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Justificativa e Observações */}
          <Card className="app-section-card p-5">
            <div className="space-y-1 mb-4">
              <h2 className="text-base font-semibold text-foreground">
                Justificativa e contexto
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 text-sm">
              <div className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Justificativa
                </span>
                <p className="text-foreground leading-relaxed">{request.justification}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Observações adicionais
                </span>
                <p className="text-muted-foreground leading-relaxed">
                  {request.observation || 'Nenhuma observação informada.'}
                </p>
              </div>
            </div>
          </Card>

          {/* Cotações vinculadas */}
          {isQuotationEnabled && (
            <QuotationsList
              quotations={quotations as any[]}
              requestId={request.id}
              isRequestApproved={
                request.status !== 'PENDING' &&
                request.status !== 'REJECTED' &&
                request.status !== 'DRAFT'
              }
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
          )}
        </div>

        {/* Coluna Lateral: Resumo e Trilha de Eventos */}
        <div className="space-y-6">
          <Card className="app-section-card p-5 space-y-4 text-sm">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-foreground">
                Resumo operacional
              </h2>
            </div>

            <div className="space-y-3 divide-y">
              <div className="flex items-center justify-between pt-2">
                <span className="text-muted-foreground">Departamento</span>
                <span className="font-medium text-foreground">
                  {request.department?.name || 'Não informado'}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-muted-foreground">Prioridade</span>
                <span className="font-medium text-foreground">
                  {PRIORITY_LABELS[request.priority || 'NORMAL'] || 'Normal'}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-muted-foreground">Valor estimado</span>
                <span className="font-semibold text-foreground">
                  {request.estimatedTotal
                    ? Number(request.estimatedTotal).toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })
                    : 'Não informado'}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-muted-foreground">Data desejada</span>
                <span className="font-medium text-foreground">
                  {request.desiredDate
                    ? format(new Date(request.desiredDate), 'dd/MM/yyyy')
                    : 'Não informada'}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-muted-foreground">Total de itens</span>
                <span className="font-medium text-foreground">{request.items.length}</span>
              </div>
            </div>

            {request.approvedBy?.user?.name && (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-800 dark:text-emerald-300">
                <p className="font-semibold">Aprovado por:</p>
                <p className="mt-0.5">{request.approvedBy.user.name}</p>
              </div>
            )}

            {request.status === 'REJECTED' && request.rejectionReason && (
              <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-800 dark:text-rose-300">
                <p className="font-semibold">Motivo da reprovação:</p>
                <p className="mt-0.5">{request.rejectionReason}</p>
              </div>
            )}
          </Card>

          {/* Trilha de Eventos */}
          <Card className="app-section-card p-5">
            <div className="space-y-1 mb-4">
              <h2 className="text-base font-semibold text-foreground">
                Auditoria e histórico
              </h2>
              <p className="text-xs text-muted-foreground">
                Registro imutável dos eventos do pedido.
              </p>
            </div>
            <EventTimeline events={request.events} />
          </Card>
        </div>
      </div>

      {/* Formulário de Cotação Modal */}
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

      {/* ConfirmDialog Reutilizável */}
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
