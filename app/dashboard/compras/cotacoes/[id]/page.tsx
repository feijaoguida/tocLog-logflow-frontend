'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  Check,
  CheckCircle2,
  DollarSign,
  FileSpreadsheet,
  FileText,
  Loader2,
  Plus,
  RotateCw,
  ShoppingCart,
  ThumbsDown,
  TrendingDown,
  Trophy,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'

interface RequestItem {
  id: string
  quantity: number
  description: string
  estimatedPrice?: number | null
  product?: { name: string }
  unit: { symbol: string }
}

interface QuotationItem {
  id: string
  price: number
  deliveryTime?: string
  paymentConditions?: string
  status?: string
  denialReason?: string | null
  requestItem: RequestItem
}

interface Quotation {
  id: string
  supplier: { id: string; name: string }
  status: string
  totalValue: number
  denialReason?: string | null
  items: QuotationItem[]
}

interface PurchaseRequest {
  id: string
  code: number
  justification: string
  status: string
  items: RequestItem[]
}

const QUOTATION_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Em preenchimento',
  WON: 'Vencedora',
  LOST: 'Não selecionada',
  CANCELLED: 'Cancelada',
}

function getQuotationBadgeStyle(status: string) {
  switch (status) {
    case 'WON':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60'
    case 'PENDING':
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60'
    case 'CANCELLED':
      return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60'
    case 'LOST':
    default:
      return 'bg-muted text-muted-foreground border-border'
  }
}

export default function QuotationDetailPage() {
  const params = useParams()
  const router = useRouter()
  const requestId = params.id as string

  const [request, setRequest] = useState<PurchaseRequest | null>(null)
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Modais
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [selectedSupplierId, setSelectedSupplierId] = useState('')
  const [createLoading, setCreateLoading] = useState(false)

  // Edit Values State
  const [editingQuote, setEditingQuote] = useState<Quotation | null>(null)
  const [editItems, setEditItems] = useState<
    { id: string; price: number; deliveryTime: string; paymentConditions: string }[]
  >([])
  const [savingQuote, setSavingQuote] = useState(false)

  // Confirm dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    title: string
    description?: string
    confirmText?: string
    variant?: 'default' | 'destructive'
    action?: () => Promise<void>
  }>({ open: false, title: '' })

  // Modal de Negativa de Cotação
  const [isDenyModalOpen, setIsDenyModalOpen] = useState(false)
  const [selectedQuoteForDeny, setSelectedQuoteForDeny] = useState<Quotation | null>(null)
  const [denyType, setDenyType] = useState<'TOTAL' | 'PARTIAL'>('TOTAL')
  const [selectedItemIdsToDeny, setSelectedItemIdsToDeny] = useState<string[]>([])
  const [denyReason, setDenyReason] = useState('')
  const [returnItemToRequester, setReturnItemToRequester] = useState(true)
  const [denyLoading, setDenyLoading] = useState(false)

  // Modal de Gerar Ordem de Compra com Lançamento
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false)
  const [selectedQuoteForOrder, setSelectedQuoteForOrder] = useState<Quotation | null>(null)
  const [entryNumber, setEntryNumber] = useState('')
  const [orderLoading, setOrderLoading] = useState(false)

  const fetchData = async () => {
    try {
      setLoading(true)
      const [reqRes, quotesRes, supRes] = await Promise.all([
        api.get(`/purchase-requests/${requestId}`),
        api.get(`/quotations/request/${requestId}`),
        api.get('/suppliers'),
      ])
      setRequest(reqRes.data)
      setQuotations(quotesRes.data)
      setSuppliers(supRes.data)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Erro ao carregar dados da cotação.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (requestId) void fetchData()
  }, [requestId])

  const handleCreateQuotation = async () => {
    if (!selectedSupplierId) return toast.error('Selecione um fornecedor.')
    setCreateLoading(true)
    try {
      await api.post('/quotations', {
        requestId,
        supplierId: selectedSupplierId,
      })
      toast.success('Cotação com fornecedor iniciada.')
      setIsAddOpen(false)
      setSelectedSupplierId('')
      await fetchData()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Erro ao criar cotação.'))
    } finally {
      setCreateLoading(false)
    }
  }

  const openEditModal = (quote: Quotation) => {
    setEditingQuote(quote)
    setEditItems(
      quote.items.map((i) => ({
        id: i.id,
        price: i.price,
        deliveryTime: i.deliveryTime || '',
        paymentConditions: i.paymentConditions || '',
      })),
    )
    setIsEditOpen(true)
  }

  const handleSaveValues = async () => {
    if (!editingQuote) return
    setSavingQuote(true)
    try {
      await api.patch(`/quotations/${editingQuote.id}`, {
        items: editItems.map((i) => ({
          id: i.id,
          price: Number(i.price),
          deliveryTime: i.deliveryTime,
          paymentConditions: i.paymentConditions,
        })),
      })
      toast.success('Valores e condições salvos.')
      setIsEditOpen(false)
      await fetchData()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Erro ao salvar valores.'))
    } finally {
      setSavingQuote(false)
    }
  }

  const updateEditItem = (index: number, field: string, value: any) => {
    const newItems = [...editItems]
    newItems[index] = { ...newItems[index], [field]: value }
    setEditItems(newItems)
  }

  const handleWin = (id: string) => {
    setConfirmDialog({
      open: true,
      title: 'Homologar Cotação Vencedora',
      description:
        'Deseja definir esta cotação como VENCEDORA? Isso homologará a proposta para emissão de ordem de compra.',
      confirmText: 'Definir Vencedora',
      action: async () => {
        try {
          await api.patch(`/quotations/${id}/win`)
          toast.success('Cotação homologada como vencedora.')
          await fetchData()
        } catch (error) {
          toast.error(getApiErrorMessage(error, 'Erro ao definir vencedor.'))
        }
      },
    })
  }

  const openDenyModal = (quote: Quotation) => {
    setSelectedQuoteForDeny(quote)
    setDenyType('TOTAL')
    setSelectedItemIdsToDeny([])
    setDenyReason('')
    setReturnItemToRequester(true)
    setIsDenyModalOpen(true)
  }

  const handleConfirmDeny = async () => {
    if (!selectedQuoteForDeny) return
    if (!denyReason.trim()) {
      toast.error('Informe a justificativa da recusa.')
      return
    }

    if (denyType === 'PARTIAL' && selectedItemIdsToDeny.length === 0) {
      toast.error('Selecione pelo menos um item para negar.')
      return
    }

    setDenyLoading(true)
    try {
      if (denyType === 'TOTAL') {
        await api.post(`/quotations/${selectedQuoteForDeny.id}/deny`, {
          reason: denyReason.trim(),
          returnItemToRequester,
        })
        toast.success('Cotação negada com sucesso e solicitante notificado por e-mail.')
      } else {
        await Promise.all(
          selectedItemIdsToDeny.map((itemId) =>
            api.post(`/quotations/${selectedQuoteForDeny.id}/items/${itemId}/deny`, {
              reason: denyReason.trim(),
              action: returnItemToRequester
                ? 'RETURN_TO_REQUESTER'
                : 'CONTINUE_WITH_REMAINING',
              returnItemToRequester,
            }),
          ),
        )
        toast.success(
          `${selectedItemIdsToDeny.length} ${selectedItemIdsToDeny.length === 1 ? 'item negado' : 'itens negados'} com sucesso.`,
        )
      }

      setIsDenyModalOpen(false)
      await fetchData()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível processar a negativa da cotação.'))
    } finally {
      setDenyLoading(false)
    }
  }

  const openGenerateOrderModal = (quote: Quotation) => {
    setSelectedQuoteForOrder(quote)
    setEntryNumber('')
    setIsOrderModalOpen(true)
  }

  const handleConfirmGenerateOrder = async () => {
    if (!selectedQuoteForOrder) return
    setOrderLoading(true)
    try {
      await api.post(`/purchase-orders/generate/${selectedQuoteForOrder.id}`, {
        entryNumber: entryNumber.trim() || undefined,
      })
      toast.success('Ordem de Compra oficial emitida com sucesso.')
      setIsOrderModalOpen(false)
      router.push('/dashboard/compras/ordens')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Erro ao gerar ordem de compra.'))
    } finally {
      setOrderLoading(false)
    }
  }

  const handleCancelQuotation = (quoteId: string) => {
    setConfirmDialog({
      open: true,
      title: 'Cancelar Cotação',
      description: 'Deseja cancelar esta proposta de fornecedor? Ela não poderá mais ser homologada.',
      confirmText: 'Cancelar Proposta',
      variant: 'destructive',
      action: async () => {
        try {
          await api.delete(`/quotations/${quoteId}`)
          toast.success('Cotação cancelada com sucesso.')
          await fetchData()
        } catch (error) {
          toast.error(getApiErrorMessage(error, 'Não foi possível cancelar a cotação.'))
        }
      },
    })
  }

  const winner = useMemo(() => quotations.find((q) => q.status === 'WON'), [quotations])

  const stats = useMemo(() => {
    const validQuotes = quotations.filter((q) => Number(q.totalValue) > 0 && q.status !== 'CANCELLED')
    const lowest = validQuotes.length > 0 ? Math.min(...validQuotes.map((q) => Number(q.totalValue))) : 0

    return {
      total: quotations.length,
      lowestPrice: lowest,
      hasWinner: Boolean(winner),
    }
  }, [quotations, winner])

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
    return (
      <div className="app-page space-y-6">
        <Card className="app-section-card p-8 text-center space-y-4">
          <p className="text-foreground font-semibold">Requisição de compra não encontrada.</p>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/compras/cotacoes">Voltar para a fila</Link>
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="app-page space-y-6">
      {/* 1. Cabeçalho Padronizado */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Mapa de Cotação: Pedido #{request.code}
            </h1>
            <span className="inline-flex items-center rounded-md border border-sky-200 bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300">
              {request.status === 'ORDERED' ? 'Ordem Gerada' : 'Em Cotação'}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{request.justification}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {request.status !== 'ORDERED' && (
            <Button
              onClick={() => setIsAddOpen(true)}
              size="sm"
              className="h-9 gap-1.5 font-semibold"
            >
              <Plus className="size-4" />
              <span>Adicionar fornecedor</span>
            </Button>
          )}

          <Button asChild variant="outline" size="sm" className="h-9 gap-1.5 font-medium">
            <Link href="/dashboard/compras/cotacoes">
              <ArrowLeft className="size-4" />
              <span>Voltar</span>
            </Link>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            onClick={() => void fetchData()}
          >
            <RotateCw className="size-4" />
            <span>Atualizar</span>
          </Button>
        </div>
      </section>

      {/* 2. Cards de Indicadores (KPIs em 4 colunas) */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Card 1: Fornecedores cotados */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Fornecedores cotados
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {stats.total}
            </span>
            <FileSpreadsheet className="size-5 text-muted-foreground/60" />
          </CardContent>
        </Card>

        {/* Card 2: Menor preço */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Menor proposta
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {stats.lowestPrice > 0
                ? stats.lowestPrice.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })
                : '-'}
            </span>
            <TrendingDown className="size-5 text-emerald-600/70" />
          </CardContent>
        </Card>

        {/* Card 3: Itens no pacote */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Itens da requisição
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {request.items.length}
            </span>
          </CardContent>
        </Card>

        {/* Card 4: Status da Homologação */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Homologação
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2 flex items-baseline gap-2">
            {stats.hasWinner ? (
              <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                Vencedor definido
              </span>
            ) : (
              <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                Pendente de decisão
              </span>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Proposta Vencedora em Destaque */}
      {winner && (
        <Card className="app-section-card border-emerald-500/40 bg-emerald-500/5 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Trophy className="size-5 text-emerald-600 dark:text-emerald-400" />
                <h2 className="text-base font-bold text-foreground">
                  Proposta Homologada: {winner.supplier.name}
                </h2>
              </div>
              <p className="text-xs text-muted-foreground">
                Valor Total Homologado:{' '}
                <strong className="text-foreground text-sm">
                  {Number(winner.totalValue).toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </strong>
              </p>
            </div>

            {request.status !== 'ORDERED' && (
              <Button
                size="sm"
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                onClick={() => openGenerateOrderModal(winner)}
              >
                <ShoppingCart className="size-4" />
                <span>Gerar Ordem de Compra</span>
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Grid de Propostas dos Fornecedores */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {quotations.map((quote) => {
          const isWinner = quote.status === 'WON'
          const isCancelled = quote.status === 'CANCELLED'

          return (
            <Card
              key={quote.id}
              className={`app-section-card p-5 transition-all ${
                isWinner
                  ? 'border-emerald-500 shadow-xs'
                  : isCancelled
                    ? 'opacity-60 border-dashed'
                    : ''
              }`}
            >
              <div className="flex items-start justify-between gap-3 border-b pb-3 mb-3">
                <div className="space-y-1">
                  <p className="font-semibold text-foreground text-base">
                    {quote.supplier.name}
                  </p>
                  <div>
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${getQuotationBadgeStyle(
                        quote.status,
                      )}`}
                    >
                      {QUOTATION_STATUS_LABELS[quote.status] || quote.status}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xl font-bold tracking-tight text-foreground">
                    {Number(quote.totalValue || 0).toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </span>
                </div>
              </div>

              {/* Itens e Valores da Cotação com Destaques Orçamentários */}
              <div className="space-y-2 text-xs">
                {quote.items.map((qi) => {
                  const estimated = Number(qi.requestItem.estimatedPrice || 0)
                  const price = Number(qi.price || 0)
                  const isOverBudget = estimated > 0 && price > estimated
                  const isDenied = qi.status === 'DENIED' || quote.status === 'CANCELLED'

                  return (
                    <div
                      key={qi.id}
                      className={`flex flex-col gap-1 py-2 border-b border-border/40 text-xs ${
                        isDenied ? 'opacity-60' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`truncate pr-2 font-medium ${isDenied ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                          {qi.requestItem.quantity}x{' '}
                          {qi.requestItem.product?.name || qi.requestItem.description}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`font-semibold whitespace-nowrap font-mono ${
                              isOverBudget && !isDenied
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-foreground'
                            }`}
                          >
                            {price > 0
                              ? `R$ ${price.toFixed(2)}/un`
                              : 'Não precificado'}
                          </span>
                        </div>
                      </div>

                      {/* Destaque de Orçamento e Status de Negativa */}
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                        {estimated > 0 ? (
                          <span>Estimado prévio: R$ {estimated.toFixed(2)}</span>
                        ) : (
                          <span>Sem prévia</span>
                        )}

                        {isDenied ? (
                          <span className="inline-flex items-center rounded bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 dark:text-rose-400 border border-rose-500/20">
                            Negado {qi.denialReason ? `(${qi.denialReason})` : ''}
                          </span>
                        ) : isOverBudget ? (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400 border border-amber-500/20">
                            <AlertTriangle className="size-3" />
                            Acima do orçado (+R$ {(price - estimated).toFixed(2)})
                          </span>
                        ) : price > 0 ? (
                          <span className="inline-flex items-center rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                            ✓ Dentro do orçado
                          </span>
                        ) : null}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Ações da Cotação */}
              <div className="flex items-center justify-between pt-4 mt-2 border-t gap-2 flex-wrap">
                {quote.status === 'PENDING' && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-2.5 text-xs font-semibold gap-1"
                      onClick={() => openEditModal(quote)}
                    >
                      <DollarSign className="size-3.5" />
                      <span>Preços</span>
                    </Button>

                    <Button
                      size="sm"
                      className="h-8 px-2.5 text-xs font-semibold gap-1"
                      onClick={() => handleWin(quote.id)}
                      disabled={Number(quote.totalValue) === 0}
                    >
                      <Trophy className="size-3.5" />
                      <span>Homologar</span>
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 text-xs font-medium text-amber-700 hover:text-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 gap-1"
                      onClick={() => openDenyModal(quote)}
                      title="Negar cotação total ou por itens específicos"
                    >
                      <ThumbsDown className="size-3.5" />
                      <span>Negar</span>
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      onClick={() => handleCancelQuotation(quote.id)}
                    >
                      <Ban className="size-3.5 mr-1" />
                      <span>Cancelar</span>
                    </Button>
                  </div>
                )}

                {isWinner && request.status !== 'ORDERED' && (
                  <Button
                    size="sm"
                    className="h-8 px-3 text-xs font-semibold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => openGenerateOrderModal(quote)}
                  >
                    <ShoppingCart className="size-3.5" />
                    <span>Emitir Ordem</span>
                  </Button>
                )}
              </div>
            </Card>
          )
        })}

        {quotations.length === 0 && (
          <div className="col-span-full p-12 text-center text-sm text-muted-foreground rounded-lg border border-dashed bg-muted/10">
            Nenhuma cotação com fornecedor foi iniciada para esta solicitação. Clique em &quot;Adicionar fornecedor&quot; acima para começar.
          </div>
        )}
      </div>

      {/* Modal Adicionar Fornecedor */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Iniciar Cotação com Fornecedor</DialogTitle>
          </DialogHeader>
          <div className="py-3 space-y-3">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Selecione o Fornecedor Parceiro
            </Label>
            <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Selecione um fornecedor..." />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="gap-2 pt-2 border-t">
            <Button variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleCreateQuotation} disabled={createLoading}>
              {createLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
              <span>Adicionar</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Inserir Valores e Condições */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Preços e Condições: {editingQuote?.supplier.name}
            </DialogTitle>
          </DialogHeader>
          <div className="py-3 space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {editItems.map((item, idx) => {
              const originalItem = editingQuote?.items.find((i) => i.id === item.id)
              const prodName =
                originalItem?.requestItem.product?.name ||
                originalItem?.requestItem.description
              const qty = originalItem?.requestItem.quantity

              return (
                <div
                  key={item.id}
                  className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end border-b pb-3"
                >
                  <div className="md:col-span-5">
                    <Label className="text-xs font-semibold text-foreground">
                      {qty}x {prodName}
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Preço Unit. (R$)"
                      value={item.price}
                      onChange={(e) => updateEditItem(idx, 'price', e.target.value)}
                      className="h-9 text-sm mt-1"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <Label className="text-xs text-muted-foreground">Prazo de entrega</Label>
                    <Input
                      placeholder="Ex: 5 dias"
                      value={item.deliveryTime}
                      onChange={(e) => updateEditItem(idx, 'deliveryTime', e.target.value)}
                      className="h-9 text-sm mt-1"
                    />
                  </div>
                  <div className="md:col-span-4">
                    <Label className="text-xs text-muted-foreground">Condição de pagamento</Label>
                    <Input
                      placeholder="Ex: 30 dias boleto"
                      value={item.paymentConditions}
                      onChange={(e) => updateEditItem(idx, 'paymentConditions', e.target.value)}
                      className="h-9 text-sm mt-1"
                    />
                  </div>
                </div>
              )
            })}
          </div>
          <DialogFooter className="gap-2 pt-2 border-t">
            <Button variant="outline" size="sm" onClick={() => setIsEditOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSaveValues} disabled={savingQuote}>
              {savingQuote && <Loader2 className="mr-2 size-4 animate-spin" />}
              <span>Salvar Proposta</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Negar Cotação (Total ou Parcial) */}
      <Dialog open={isDenyModalOpen} onOpenChange={setIsDenyModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
              <Ban className="size-4" />
              <span>Negar Proposta: {selectedQuoteForDeny?.supplier.name}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="field-stack">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Tipo de Negativa
              </Label>
              <Select
                value={denyType}
                onValueChange={(val) => setDenyType(val as 'TOTAL' | 'PARTIAL')}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Selecione o tipo..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TOTAL">Negar Cotação Completa</SelectItem>
                  <SelectItem value="PARTIAL">Negar Itens Específicos (Parcial)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Seleção de itens se for parcial */}
            {denyType === 'PARTIAL' && selectedQuoteForDeny && (
              <div className="space-y-2 rounded-lg border bg-muted/20 p-3 max-h-[180px] overflow-y-auto">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  Selecione os itens a serem rejeitados:
                </span>
                {selectedQuoteForDeny.items.map((it) => {
                  const isChecked = selectedItemIdsToDeny.includes(it.id)
                  return (
                    <label
                      key={it.id}
                      className="flex items-center gap-2.5 p-1.5 rounded hover:bg-muted/40 cursor-pointer text-xs"
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedItemIdsToDeny((prev) => [...prev, it.id])
                          } else {
                            setSelectedItemIdsToDeny((prev) => prev.filter((id) => id !== it.id))
                          }
                        }}
                      />
                      <span className="font-medium text-foreground truncate">
                        {it.requestItem.quantity}x {it.requestItem.product?.name || it.requestItem.description}
                      </span>
                      <span className="font-mono text-muted-foreground ml-auto">
                        R$ {Number(it.price || 0).toFixed(2)}
                      </span>
                    </label>
                  )
                })}
              </div>
            )}

            <div className="field-stack">
              <Label htmlFor="deny-reason" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Motivo da Recusa / Justificativa *
              </Label>
              <Textarea
                id="deny-reason"
                value={denyReason}
                onChange={(e) => setDenyReason(e.target.value)}
                placeholder="Explique o motivo técnico ou comercial da recusa (será registrado na auditoria e enviado por e-mail)..."
                className="min-h-[85px] text-sm"
              />
            </div>

            <div className="flex items-start gap-2 pt-1">
              <Checkbox
                id="return-requester"
                checked={returnItemToRequester}
                onCheckedChange={(c) => setReturnItemToRequester(Boolean(c))}
                className="mt-0.5"
              />
              <label
                htmlFor="return-requester"
                className="text-xs text-muted-foreground cursor-pointer leading-relaxed"
              >
                Devolver item ao solicitante (cancelar no pedido original caso não haja continuidade).
              </label>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDenyModalOpen(false)}
              disabled={denyLoading}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleConfirmDeny}
              disabled={denyLoading}
              className="font-semibold"
            >
              {denyLoading ? (
                <>
                  <Loader2 className="mr-2 size-3.5 animate-spin" />
                  Processando...
                </>
              ) : (
                'Confirmar Negativa'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Gerar Ordem de Compra com Número de Lançamento */}
      <Dialog open={isOrderModalOpen} onOpenChange={setIsOrderModalOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="size-4 text-emerald-600" />
              <span>Emitir Ordem de Compra</span>
            </DialogTitle>
          </DialogHeader>

          {selectedQuoteForOrder && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg border bg-muted/20 p-3 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fornecedor Vencedor:</span>
                  <strong className="text-foreground">{selectedQuoteForOrder.supplier.name}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor Total da Proposta:</span>
                  <strong className="text-emerald-600 font-mono text-sm">
                    {Number(selectedQuoteForOrder.totalValue || 0).toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </strong>
                </div>
              </div>

              <div className="field-stack">
                <Label htmlFor="order-entry-number" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Número de Lançamento Contábil / ERP (Opcional)
                </Label>
                <Input
                  id="order-entry-number"
                  value={entryNumber}
                  onChange={(e) => setEntryNumber(e.target.value)}
                  placeholder="Ex: LANÇ-2026-0042 ou NF-5520"
                  className="h-9 text-sm font-mono"
                />
                <p className="text-[11px] text-muted-foreground">
                  Identificador contábil gravado na Ordem de Compra para conciliação financeira e compras futuras.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsOrderModalOpen(false)}
              disabled={orderLoading}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              onClick={handleConfirmGenerateOrder}
              disabled={orderLoading}
            >
              {orderLoading ? (
                <>
                  <Loader2 className="mr-2 size-3.5 animate-spin" />
                  Emitindo...
                </>
              ) : (
                'Confirmar e Emitir Ordem'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
