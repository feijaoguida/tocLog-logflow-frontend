'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Loader2,
  PackagePlus,
  Plus,
  Save,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'

type Product = {
  id: string
  name: string
  unit: { id: string; symbol: string }
}

type Category = {
  id: string
  name: string
}

type Unit = {
  id: string
  symbol: string
  name: string
}

type RequestItem = {
  id?: string
  productId?: string
  description?: string
  quantity: number
  unitId?: string
  observation?: string
  productName?: string
  unitSymbol?: string
}

type PurchaseRequestPayload = {
  id: string
  justification: string
  observation?: string | null
  estimatedTotal?: number | string | null
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' | null
  desiredDate?: string | null
  items: Array<{
    id: string
    productId?: string | null
    description?: string | null
    quantity: number | string
    unitId?: string | null
    observation?: string | null
    product?: { name: string }
    unit?: { symbol: string }
  }>
}

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Baixa' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'HIGH', label: 'Alta' },
  { value: 'URGENT', label: 'Urgente' },
] as const

type PurchaseRequestFormProps = {
  mode: 'create' | 'edit'
  requestId?: string
}

export function PurchaseRequestForm({
  mode,
  requestId,
}: PurchaseRequestFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [justification, setJustification] = useState('')
  const [observation, setObservation] = useState('')
  const [estimatedTotal, setEstimatedTotal] = useState('')
  const [priority, setPriority] = useState<(typeof PRIORITY_OPTIONS)[number]['value']>('NORMAL')
  const [desiredDate, setDesiredDate] = useState('')
  const [items, setItems] = useState<RequestItem[]>([{ quantity: 1 }])

  const [isQuickProdOpen, setIsQuickProdOpen] = useState(false)
  const [quickProductTargetIndex, setQuickProductTargetIndex] = useState<number | null>(null)
  const [qpName, setQpName] = useState('')
  const [qpCategory, setQpCategory] = useState('')
  const [qpUnit, setQpUnit] = useState('')
  const [qpLoading, setQpLoading] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      try {
        const requestsPromise = requestId
          ? api.get<PurchaseRequestPayload>(`/purchase-requests/${requestId}`)
          : Promise.resolve(null)
        const [requestResponse, productsResponse, unitsResponse, categoriesResponse] =
          await Promise.all([
            requestsPromise,
            api.get<Product[]>('/products'),
            api.get<Unit[]>('/products/units/all'),
            api.get<Category[]>('/products/categories/all'),
          ])

        setProducts(productsResponse.data)
        setUnits(unitsResponse.data)
        setCategories(categoriesResponse.data)

        if (requestResponse?.data) {
          setJustification(requestResponse.data.justification ?? '')
          setObservation(requestResponse.data.observation ?? '')
          setEstimatedTotal(
            requestResponse.data.estimatedTotal
              ? String(requestResponse.data.estimatedTotal)
              : '',
          )
          setPriority(requestResponse.data.priority ?? 'NORMAL')
          setDesiredDate(
            requestResponse.data.desiredDate
              ? String(requestResponse.data.desiredDate).slice(0, 10)
              : '',
          )
          setItems(
            requestResponse.data.items.length > 0
              ? requestResponse.data.items.map((item) => ({
                  id: item.id,
                  productId: item.productId ?? undefined,
                  description: item.description ?? undefined,
                  quantity: Number(item.quantity),
                  unitId: item.unitId ?? undefined,
                  observation: item.observation ?? undefined,
                  productName: item.product?.name,
                  unitSymbol: item.unit?.symbol,
                }))
              : [{ quantity: 1 }],
          )
        }
      } catch (error) {
        toast.error(
          getApiErrorMessage(error, 'Nao foi possivel carregar o formulario do pedido.'),
        )
        router.push('/dashboard/compras/pedidos')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [requestId, router])

  const updateItem = (
    index: number,
    field: keyof RequestItem,
    value: string | number | undefined,
  ) => {
    setItems((current) => {
      const next = [...current]
      next[index] = { ...next[index], [field]: value }

      if (field === 'productId') {
        const product = products.find((entry) => entry.id === value)

        if (product) {
          next[index].productId = product.id
          next[index].productName = product.name
          next[index].unitSymbol = product.unit.symbol
          next[index].unitId = product.unit.id
          if (product.id !== 'custom') {
            next[index].description = undefined
          }
        } else if (value === 'custom') {
          next[index].productId = undefined
          next[index].productName = undefined
          next[index].unitSymbol = undefined
        }
      }

      return next
    })
  }

  const handleAddItem = () => {
    setItems((current) => [...current, { quantity: 1 }])
  }

  const handleRemoveItem = (index: number) => {
    setItems((current) => current.filter((_, currentIndex) => currentIndex !== index))
  }

  const handleOpenQuickProduct = (index?: number) => {
    setQuickProductTargetIndex(index ?? (items.length > 0 ? items.length - 1 : null))
    setIsQuickProdOpen(true)
  }

  const handleQuickProduct = async () => {
    if (!qpName || !qpCategory || !qpUnit) {
      toast.error('Preencha todos os campos do produto rapido.')
      return
    }

    setQpLoading(true)

    try {
      const createResponse = await api.post('/products', {
        name: qpName,
        description: 'Cadastro rapido via pedido de compra',
        categoryId: qpCategory,
        unitId: qpUnit,
      })

      const productDetails = await api.get<Product>(`/products/${createResponse.data.id}`)
      const productsResponse = await api.get<Product[]>('/products')
      setProducts(productsResponse.data)

      const targetIndex =
        quickProductTargetIndex !== null
          ? quickProductTargetIndex
          : items.length > 0
            ? items.length - 1
            : 0

      setItems((current) => {
        const next = [...current]
        if (!next[targetIndex]) {
          next[targetIndex] = { quantity: 1 }
        }
        next[targetIndex] = {
          ...next[targetIndex],
          productId: productDetails.data.id,
          productName: productDetails.data.name,
          unitId: productDetails.data.unit.id,
          unitSymbol: productDetails.data.unit.symbol,
          description: undefined,
        }
        return next
      })

      toast.success('Produto cadastrado e selecionado no item.')
      setIsQuickProdOpen(false)
      setQpName('')
      setQpCategory('')
      setQpUnit('')
      setQuickProductTargetIndex(null)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Nao foi possivel criar o produto.'))
    } finally {
      setQpLoading(false)
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!justification.trim()) {
      toast.error('Informe a justificativa do pedido.')
      return
    }

    if (items.length === 0) {
      toast.error('Adicione pelo menos um item.')
      return
    }

    const hasInvalidItem = items.some((item) => {
      const hasProduct = Boolean(item.productId)
      const hasDescription = Boolean(item.description?.trim())
      return !hasProduct && !hasDescription
    })

    if (hasInvalidItem) {
      toast.error('Cada item precisa ter um produto ou uma descricao.')
      return
    }

    setSubmitLoading(true)

    try {
      const payload = {
        justification: justification.trim(),
        observation: observation.trim() || undefined,
        estimatedTotal: estimatedTotal ? Number(estimatedTotal) : undefined,
        priority,
        desiredDate: desiredDate || undefined,
        items: items.map((item) => ({
          productId: item.productId,
          description: item.productId ? undefined : item.description?.trim(),
          quantity: Number(item.quantity),
          unitId: item.unitId,
          observation: item.observation?.trim() || undefined,
        })),
      }

      if (mode === 'edit' && requestId) {
        await api.patch(`/purchase-requests/${requestId}`, payload)
        toast.success('Rascunho atualizado com sucesso.')
      } else {
        await api.post('/purchase-requests', payload)
        toast.success('Pedido criado como rascunho.')
      }

      router.push('/dashboard/compras/pedidos')
      router.refresh()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Nao foi possivel salvar o pedido.'))
    } finally {
      setSubmitLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="app-page">
      <section className="app-page-header">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/dashboard/compras/pedidos" className="transition hover:text-foreground">
              Compras
            </Link>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-primary">
              {mode === 'edit' ? 'Editar pedido' : 'Novo pedido'}
            </span>
          </div>
          <div className="space-y-2">
            <p className="app-kicker">Compras</p>
            <h1 className="app-title">
              {mode === 'edit' ? 'Editar Pedido de Compra' : 'Novo Pedido de Compra'}
            </h1>
            <p className="app-subtitle">
              Registre a necessidade de compra com clareza, descreva os itens e mantenha o
              rascunho pronto para envio ao aprovador do departamento.
            </p>
          </div>
        </div>
        <Button asChild variant="outline" className="gap-2">
          <Link href="/dashboard/compras/pedidos">
            <ArrowLeft className="h-4 w-4" />
            Voltar para a listagem
          </Link>
        </Button>
      </section>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="app-section-card">
          <CardContent className="space-y-6 p-0">
            <div className="space-y-1">
              <h2 className="section-title">Dados gerais</h2>
              <p className="text-sm text-muted-foreground">
                Use a justificativa para contextualizar a necessidade e ajude o aprovador a
                entender o impacto operacional.
              </p>
            </div>

            <div className="app-form-grid">
              <div className="field-stack md:col-span-2">
                <Label htmlFor="purchase-request-justification">Justificativa *</Label>
                <Input
                  id="purchase-request-justification"
                  value={justification}
                  onChange={(event) => setJustification(event.target.value)}
                  placeholder="Ex: reposicao de estoque do escritorio central"
                />
              </div>

              <div className="field-stack">
                <Label htmlFor="purchase-request-priority">Prioridade</Label>
                <Select value={priority} onValueChange={(value) => setPriority(value as typeof priority)}>
                  <SelectTrigger id="purchase-request-priority">
                    <SelectValue placeholder="Selecione a prioridade" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="field-stack">
                <Label htmlFor="purchase-request-estimated-total">Valor estimado</Label>
                <Input
                  id="purchase-request-estimated-total"
                  type="number"
                  min="0"
                  step="0.01"
                  value={estimatedTotal}
                  onChange={(event) => setEstimatedTotal(event.target.value)}
                  placeholder="0,00"
                />
              </div>

              <div className="field-stack">
                <Label htmlFor="purchase-request-desired-date">Data desejada</Label>
                <Input
                  id="purchase-request-desired-date"
                  type="date"
                  value={desiredDate}
                  onChange={(event) => setDesiredDate(event.target.value)}
                />
              </div>

              <div className="field-stack md:col-span-3">
                <Label htmlFor="purchase-request-observation">Observacoes gerais</Label>
                <Textarea
                  id="purchase-request-observation"
                  value={observation}
                  onChange={(event) => setObservation(event.target.value)}
                  placeholder="Contexto adicional, prazo esperado, condicoes ou observacoes do solicitante."
                  className="min-h-[110px]"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="app-section-card">
          <CardContent className="space-y-6 p-0">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <h2 className="section-title">Itens do pedido</h2>
                <p className="text-sm text-muted-foreground">
                  Cadastre os itens com quantidade, unidade e observacoes relevantes para a compra.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="secondary" className="gap-2" onClick={() => handleOpenQuickProduct()}>
                  <PackagePlus className="h-4 w-4" />
                  Cadastro rapido de produto
                </Button>
                <Button type="button" className="gap-2" onClick={handleAddItem}>
                  <Plus className="h-4 w-4" />
                  Adicionar item
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={item.id ?? `item-${index}`} className="rounded-[24px] border border-border/60 bg-muted/20 p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Item {index + 1}</p>
                      <p className="text-xs text-muted-foreground">
                        Se o produto ainda nao existir no catalogo, use descricao livre ou cadastre-o rapido.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-red-600 hover:bg-red-50 hover:text-red-700"
                      onClick={() => handleRemoveItem(index)}
                      disabled={items.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-[2fr_120px_140px]">
                    <div className="field-stack">
                      <Label>Produto</Label>
                      <Select
                        value={item.productId ?? 'custom'}
                        onValueChange={(value) => updateItem(index, 'productId', value === 'custom' ? undefined : value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um produto..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="custom">Outro ou nao cadastrado</SelectItem>
                          {products.map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="field-stack">
                      <Label>Quantidade</Label>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        value={item.quantity}
                        onChange={(event) =>
                          updateItem(index, 'quantity', Number(event.target.value || '0'))
                        }
                      />
                    </div>

                    <div className="field-stack">
                      <Label>Unidade</Label>
                      <Select
                        value={item.unitId}
                        onValueChange={(value) => updateItem(index, 'unitId', value)}
                        disabled={Boolean(item.productId)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={item.unitSymbol || 'Selecione'} />
                        </SelectTrigger>
                        <SelectContent>
                          {units.map((unit) => (
                            <SelectItem key={unit.id} value={unit.id}>
                              {unit.symbol} - {unit.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {!item.productId ? (
                    <div className="mt-4 field-stack">
                      <Label>Descricao livre *</Label>
                      <Input
                        value={item.description ?? ''}
                        onChange={(event) => updateItem(index, 'description', event.target.value)}
                        placeholder="Descreva o item quando ele ainda nao estiver no catalogo"
                      />
                    </div>
                  ) : null}

                  <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto]">
                    <div className="field-stack">
                      <Label>Observacao do item</Label>
                      <Input
                        value={item.observation ?? ''}
                        onChange={(event) => updateItem(index, 'observation', event.target.value)}
                        placeholder="Ex: cor, tamanho, especificacao tecnica"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="outline"
                        className="gap-2"
                        onClick={() => handleOpenQuickProduct(index)}
                      >
                        <PackagePlus className="h-4 w-4" />
                        Cadastrar e selecionar
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" asChild>
            <Link href="/dashboard/compras/pedidos">Cancelar</Link>
          </Button>
          <Button type="submit" className="gap-2" disabled={submitLoading}>
            {submitLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {mode === 'edit' ? 'Salvar alteracoes' : 'Salvar rascunho'}
          </Button>
        </div>
      </form>

      <Dialog open={isQuickProdOpen} onOpenChange={setIsQuickProdOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cadastro rapido de produto</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="field-stack">
              <Label>Nome do produto</Label>
              <Input value={qpName} onChange={(event) => setQpName(event.target.value)} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="field-stack">
                <Label>Categoria</Label>
                <Select value={qpCategory} onValueChange={setQpCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="field-stack">
                <Label>Unidade</Label>
                <Select value={qpUnit} onValueChange={setQpUnit}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id}>
                        {unit.symbol} - {unit.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setIsQuickProdOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleQuickProduct} disabled={qpLoading}>
              {qpLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Cadastrar produto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
