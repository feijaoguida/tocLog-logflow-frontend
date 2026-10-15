'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Building, DollarSign, Truck, Calendar, ShieldCheck, Ban } from 'lucide-react'
import { api } from '@/lib/api'
import { toast } from 'sonner'

interface QuotationFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  requestId: string
  requestItems: any[]
  quotationId?: string // If editing
  onSuccess: () => void
}

export function QuotationForm({
  open,
  onOpenChange,
  requestId,
  requestItems,
  quotationId,
  onSuccess,
}: QuotationFormProps) {
  const [loading, setLoading] = useState(false)
  const [initLoading, setInitLoading] = useState(false)

  // Header Fields
  const [supplierId, setSupplierId] = useState('')
  const [paymentTerms, setPaymentTerms] = useState('')
  const [freightCost, setFreightCost] = useState<number | string>(0)
  const [validityDate, setValidityDate] = useState('')

  // Items
  const [quoteItems, setQuoteItems] = useState<any[]>([])

  // Suppliers Catalog
  const [suppliers, setSuppliers] = useState<any[]>([])

  useEffect(() => {
    if (open) {
      fetchSuppliers()
      if (quotationId) loadQuotation()
      else initNew()
    }
  }, [open, quotationId])

  const fetchSuppliers = async () => {
    try {
      const { data } = await api.get('/suppliers')
      setSuppliers(data)
    } catch {}
  }

  const initNew = () => {
    setSupplierId('')
    setPaymentTerms('')
    setFreightCost(0)
    setValidityDate('')
    setQuoteItems(
      requestItems.map((ri) => ({
        requestItemId: ri.id,
        description: ri.product?.name || ri.description,
        quantity: Number(ri.quantity || 1),
        unitSymbol: ri.unit?.symbol || 'un',
        price: 0,
        discount: 0,
        brand: '',
        deliveryTime: '',
        isUnavailable: false,
      })),
    )
  }

  const loadQuotation = async () => {
    setInitLoading(true)
    try {
      const { data } = await api.get(`/quotations/${quotationId}`)
      setSupplierId(data.supplierId)
      setPaymentTerms(data.paymentTerms || '')
      setFreightCost(Number(data.freightCost || 0))
      setValidityDate(data.validityDate ? data.validityDate.split('T')[0] : '')

      setQuoteItems(
        data.items.map((qi: any) => ({
          id: qi.id,
          requestItemId: qi.requestItemId,
          description: qi.requestItem?.product?.name || qi.requestItem?.description,
          quantity: Number(qi.requestItem?.quantity || 1),
          unitSymbol: qi.requestItem?.unit?.symbol || 'un',
          price: Number(qi.price || 0),
          discount: Number(qi.discount || 0),
          brand: qi.brand || '',
          deliveryTime: qi.deliveryTime || '',
          isUnavailable: qi.status === 'DENIED',
        })),
      )
    } catch {
      toast.error('Erro ao carregar dados da cotação.')
    } finally {
      setInitLoading(false)
    }
  }

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...quoteItems]
    newItems[index] = { ...newItems[index], [field]: value }
    setQuoteItems(newItems)
  }

  const toggleUnavailable = (index: number) => {
    const newItems = [...quoteItems]
    const current = !!newItems[index].isUnavailable
    newItems[index] = {
      ...newItems[index],
      isUnavailable: !current,
      price: !current ? 0 : newItems[index].price,
    }
    setQuoteItems(newItems)
  }

  // Cálculos dinâmicos de totais
  const { itemsSubtotal, totalQuotation } = useMemo(() => {
    const subtotal = quoteItems.reduce((acc, it) => {
      if (it.isUnavailable) return acc
      const line = Number(it.price || 0) * Number(it.quantity || 1) - Number(it.discount || 0)
      return acc + (line > 0 ? line : 0)
    }, 0)
    const freight = Number(freightCost || 0)
    return {
      itemsSubtotal: subtotal,
      totalQuotation: subtotal + freight,
    }
  }, [quoteItems, freightCost])

  const handleSubmit = async () => {
    if (!supplierId) return toast.error('Selecione um fornecedor para registrar a cotação.')

    setLoading(true)
    try {
      let qId = quotationId

      if (!qId) {
        const { data } = await api.post('/quotations', { requestId, supplierId })
        qId = data.id
      }

      const payload: any = {
        freightCost: Number(freightCost || 0),
        paymentTerms,
        validityDate: validityDate ? new Date(validityDate).toISOString() : undefined,
        items: [],
      }

      if (!quotationId && qId) {
        // Obter os IDs de itens criados
        const { data: newQuote } = await api.get(`/quotations/${qId}`)
        payload.items = newQuote.items.map((nqi: any) => {
          const formItem = quoteItems.find((fi) => fi.requestItemId === nqi.requestItemId)
          return {
            id: nqi.id,
            price: formItem?.isUnavailable ? 0 : Number(formItem?.price || 0),
            discount: Number(formItem?.discount || 0),
            brand: formItem?.brand || '',
            deliveryTime: formItem?.deliveryTime || '',
            status: formItem?.isUnavailable ? 'DENIED' : 'PENDING',
            denialReason: formItem?.isUnavailable ? 'Não atende / Indisponível' : undefined,
          }
        })
      } else {
        payload.items = quoteItems.map((qi) => ({
          id: qi.id,
          price: qi.isUnavailable ? 0 : Number(qi.price || 0),
          discount: Number(qi.discount || 0),
          brand: qi.brand || '',
          deliveryTime: qi.deliveryTime || '',
          status: qi.isUnavailable ? 'DENIED' : 'PENDING',
          denialReason: qi.isUnavailable ? 'Não atende / Indisponível' : undefined,
        }))
      }

      await api.patch(`/quotations/${qId}`, payload)
      toast.success('Cotação salva com sucesso!')
      onSuccess()
      onOpenChange(false)
    } catch (e) {
      console.error(e)
      toast.error('Erro ao salvar proposta de cotação.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-6xl max-h-[92vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Building className="size-5 text-primary" />
            {quotationId ? 'Editar Proposta de Cotação' : 'Nova Cotação de Fornecedor'}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Informe as condições comerciais, frete e valores unitários cotados pelo parceiro.
          </p>
        </DialogHeader>

        {initLoading ? (
          <div className="h-48 flex items-center justify-center">
            <Loader2 className="animate-spin size-8 text-primary" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-6 pr-2 py-3">
            {/* Bloco 1: Condições Comerciais Gerais */}
            <div className="rounded-xl border bg-muted/20 p-4 space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Truck className="size-4" />
                <span>Dados Comerciais do Fornecedor</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2 space-y-1.5">
                  <Label className="text-xs font-semibold">Fornecedor Participante *</Label>
                  <Select
                    value={supplierId}
                    onValueChange={setSupplierId}
                    disabled={!!quotationId}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Selecione o fornecedor..." />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.length === 0 && (
                        <SelectItem value="none" disabled>
                          Nenhum fornecedor cadastrado
                        </SelectItem>
                      )}
                      {suppliers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} ({s.cnpj})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Frete da Proposta (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={freightCost}
                    onChange={(e) => setFreightCost(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Condições de Pagamento</Label>
                  <Input
                    placeholder="Ex: 30 dias boleto"
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Validade da Proposta</Label>
                  <Input
                    type="date"
                    value={validityDate}
                    onChange={(e) => setValidityDate(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Bloco 2: Tabela Dinâmica de Itens */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Itens Requeridos ({quoteItems.length})
                </span>
                <span className="text-xs text-muted-foreground">
                  Marque &quot;Indisponível&quot; se o parceiro não comercializar o item
                </span>
              </div>

              <div className="border rounded-xl overflow-hidden shadow-xs bg-card">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="w-10 text-center">#</TableHead>
                      <TableHead>Descrição do Item</TableHead>
                      <TableHead className="w-24 text-center">Demanda</TableHead>
                      <TableHead className="w-36">Marca / Modelo</TableHead>
                      <TableHead className="w-32">Preço Unit. (R$)</TableHead>
                      <TableHead className="w-24">Desc. (R$)</TableHead>
                      <TableHead className="w-28">Prazo (Dias)</TableHead>
                      <TableHead className="w-28 text-center">Disponível?</TableHead>
                      <TableHead className="w-32 text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quoteItems.map((item, idx) => {
                      const totalLine = item.isUnavailable
                        ? 0
                        : item.price * item.quantity - item.discount

                      return (
                        <TableRow
                          key={idx}
                          className={`transition-colors ${
                            item.isUnavailable ? 'bg-muted/30 opacity-70' : 'hover:bg-muted/10'
                          }`}
                        >
                          <TableCell className="text-center font-bold text-xs text-muted-foreground">
                            {idx + 1}
                          </TableCell>
                          <TableCell className="font-medium text-sm">
                            <p className={item.isUnavailable ? 'line-through text-muted-foreground' : 'text-foreground'}>
                              {item.description}
                            </p>
                          </TableCell>
                          <TableCell className="text-center font-bold text-xs">
                            {item.quantity} {item.unitSymbol}
                          </TableCell>
                          <TableCell>
                            <Input
                              className="h-8 text-xs"
                              placeholder="Marca"
                              value={item.brand}
                              disabled={item.isUnavailable}
                              onChange={(e) => updateItem(idx, 'brand', e.target.value)}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              className="h-8 text-xs font-semibold"
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              value={item.isUnavailable ? '' : item.price}
                              disabled={item.isUnavailable}
                              onChange={(e) =>
                                updateItem(idx, 'price', parseFloat(e.target.value) || 0)
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              className="h-8 text-xs"
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              value={item.isUnavailable ? '' : item.discount}
                              disabled={item.isUnavailable}
                              onChange={(e) =>
                                updateItem(idx, 'discount', parseFloat(e.target.value) || 0)
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              className="h-8 text-xs"
                              placeholder="Ex: 5"
                              value={item.deliveryTime}
                              disabled={item.isUnavailable}
                              onChange={(e) => updateItem(idx, 'deliveryTime', e.target.value)}
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              type="button"
                              variant={item.isUnavailable ? 'destructive' : 'outline'}
                              size="sm"
                              className="h-7 text-[11px] px-2 font-medium"
                              onClick={() => toggleUnavailable(idx)}
                            >
                              {item.isUnavailable ? 'Indisponível' : 'Atende'}
                            </Button>
                          </TableCell>
                          <TableCell className="text-right font-bold text-sm font-mono text-emerald-600 dark:text-emerald-400">
                            {item.isUnavailable ? (
                              <span className="text-xs text-muted-foreground font-normal">--</span>
                            ) : (
                              `R$ ${(totalLine > 0 ? totalLine : 0).toFixed(2)}`
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Bloco 3: Resumo Financeiro da Proposta */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border bg-muted/10">
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>
                  Subtotal Itens:{' '}
                  <strong className="text-foreground font-mono">
                    R$ {itemsSubtotal.toFixed(2)}
                  </strong>
                </span>
                <span>•</span>
                <span>
                  Frete:{' '}
                  <strong className="text-foreground font-mono">
                    R$ {Number(freightCost || 0).toFixed(2)}
                  </strong>
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Total Geral da Proposta:
                </span>
                <span className="text-xl font-black text-foreground font-mono">
                  R$ {totalQuotation.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="border-t pt-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Cotação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
