'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  ExternalLink,
  FileText,
  Loader2,
  Package,
  PackagePlus,
  Pencil,
  Phone,
  Plus,
  Send,
  ShieldCheck,
  ShoppingCart,
  Trash2,
  Zap,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/context/auth-context'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'

type Product = {
  id: string
  name: string
  categoryId?: string
  category?: { id: string; name: string }
  unit: { id: string; symbol: string; name: string }
  suggestedEstimatedPrice?: number | null
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

type DepartmentOption = {
  id: string
  name: string
  branchId?: string | null
  branch?: { id: string; name: string } | null
  headManagerId?: string | null
  headManager?: { id: string; name: string } | null
}

type BudgetEvent = {
  id: string
  name: string
  budgetAmount: number
  spentAmount: number
  tolerancePercentage: number
  categoryId: string
  branchId?: string | null
  departmentId?: string | null
  category: { id: string; name: string }
}

type ProcurementSettings = {
  budgetEnabled: boolean
  budgetLevel: 'COMPANY' | 'BRANCH' | 'DEPARTMENT'
  allowFreeTextItems: boolean
  notifyOnQuotationDenied: boolean
}

type RequestItem = {
  id?: string
  productId?: string
  productName?: string
  categoryId?: string
  description?: string
  quantity: number
  unitId?: string
  unitSymbol?: string
  estimatedPrice?: number
  supplierLink?: string
  contactPhone?: string
  contactWhatsapp?: string
  observation?: string
}

type PurchaseRequestPayload = {
  id: string
  requestingDepartmentId?: string | null
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
    estimatedPrice?: number | string | null
    supplierLink?: string | null
    contactPhone?: string | null
    contactWhatsapp?: string | null
    observation?: string | null
    product?: { id: string; name: string; categoryId?: string; unit?: { id: string; symbol: string } }
    unit?: { id: string; symbol: string }
  }>
}

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Baixa', badge: 'bg-muted text-muted-foreground' },
  { value: 'NORMAL', label: 'Normal', badge: 'bg-blue-500/10 text-blue-700 border-blue-500/20' },
  { value: 'HIGH', label: 'Alta', badge: 'bg-amber-500/10 text-amber-700 border-amber-500/20' },
  { value: 'URGENT', label: 'Urgente', badge: 'bg-rose-500/10 text-rose-700 border-rose-500/20' },
] as const

type PurchaseRequestFormProps = {
  mode: 'create' | 'edit'
  requestId?: string
}

export function PurchaseRequestForm({ mode, requestId }: PurchaseRequestFormProps) {
  const router = useRouter()
  const { user } = useAuth()

  // Stepper state (1: Dados Gerais, 2: Itens & Orçamento, 3: Relatório de Conferência)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1)

  const [loading, setLoading] = useState(true)
  const [submitLoading, setSubmitLoading] = useState(false)

  // Metadados carregados
  const [products, setProducts] = useState<Product[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [departments, setDepartments] = useState<DepartmentOption[]>([])
  const [budgetEvents, setBudgetEvents] = useState<BudgetEvent[]>([])
  const [settings, setSettings] = useState<ProcurementSettings>({
    budgetEnabled: true,
    budgetLevel: 'BRANCH',
    allowFreeTextItems: false,
    notifyOnQuotationDenied: true,
  })

  // Dados do Formulário - Etapa 1
  const [requestingDepartmentId, setRequestingDepartmentId] = useState<string>('')
  const [justification, setJustification] = useState('')
  const [priority, setPriority] = useState<(typeof PRIORITY_OPTIONS)[number]['value']>('NORMAL')
  const [desiredDate, setDesiredDate] = useState('')
  const [observation, setObservation] = useState('')

  // Dados do Formulário - Etapa 2
  const [items, setItems] = useState<RequestItem[]>([])
  const [currentItem, setCurrentItem] = useState<RequestItem>({ quantity: 1 })
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  // Cadastro Rápido de Produto
  const [isQuickProdOpen, setIsQuickProdOpen] = useState(false)
  const [quickProductTargetIndex, setQuickProductTargetIndex] = useState<number | null>(null)
  const [qpName, setQpName] = useState('')
  const [qpCategory, setQpCategory] = useState('')
  const [qpUnit, setQpUnit] = useState('')
  const [qpLoading, setQpLoading] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const requestsPromise = requestId
          ? api.get<PurchaseRequestPayload>(`/purchase-requests/${requestId}`)
          : Promise.resolve(null)

        const [
          requestResponse,
          productsResponse,
          unitsResponse,
          categoriesResponse,
          departmentsResponse,
          budgetEventsResponse,
          settingsResponse,
        ] = await Promise.all([
          requestsPromise,
          api.get<Product[]>('/products'),
          api.get<Unit[]>('/products/units/all'),
          api.get<Category[]>('/products/categories/all'),
          api.get<DepartmentOption[]>('/departments').catch(() => ({ data: [] })),
          api.get<BudgetEvent[]>('/procurement-budget/events').catch(() => ({ data: [] })),
          api.get<ProcurementSettings>('/procurement-settings').catch(() => ({
            data: {
              budgetEnabled: true,
              budgetLevel: 'BRANCH' as const,
              allowFreeTextItems: false,
              notifyOnQuotationDenied: true,
            },
          })),
        ])

        setProducts(productsResponse.data)
        setUnits(unitsResponse.data)
        setCategories(categoriesResponse.data)
        setDepartments(departmentsResponse.data)
        setBudgetEvents(budgetEventsResponse.data)
        setSettings(settingsResponse.data)

        if (requestResponse?.data) {
          const req = requestResponse.data
          setRequestingDepartmentId(req.requestingDepartmentId || '')
          setJustification(req.justification || '')
          setObservation(req.observation || '')
          setPriority(req.priority || 'NORMAL')
          setDesiredDate(req.desiredDate ? String(req.desiredDate).slice(0, 10) : '')
          setItems(
            req.items.length > 0
              ? req.items.map((item) => ({
                  id: item.id,
                  productId: item.productId ?? undefined,
                  description: item.description ?? undefined,
                  quantity: Number(item.quantity),
                  unitId: item.unitId ?? undefined,
                  estimatedPrice: item.estimatedPrice ? Number(item.estimatedPrice) : undefined,
                  supplierLink: item.supplierLink ?? undefined,
                  contactPhone: item.contactPhone ?? undefined,
                  contactWhatsapp: item.contactWhatsapp ?? undefined,
                  observation: item.observation ?? undefined,
                  productName: item.product?.name,
                  categoryId: item.product?.categoryId,
                  unitSymbol: item.unit?.symbol || item.product?.unit?.symbol,
                }))
              : [],
          )
        } else {
          // Preencher departamento solicitante padrão caso o usuário pertença a um
          if (departmentsResponse.data.length > 0) {
            setRequestingDepartmentId(departmentsResponse.data[0].id)
          }
        }
      } catch (error) {
        toast.error(getApiErrorMessage(error, 'Não foi possível carregar os dados para o pedido.'))
        router.push('/dashboard/compras/pedidos')
      } finally {
        setLoading(false)
      }
    }

    void loadData()
  }, [requestId, router])

  const selectedDepartment = useMemo(() => {
    return departments.find((d) => d.id === requestingDepartmentId) || null
  }, [departments, requestingDepartmentId])

  // Checa se o usuário atual é gestor do departamento selecionado (habilita badge de auto-aprovação)
  const isManagerOfSelectedDepartment = useMemo(() => {
    if (!selectedDepartment || !user) return false
    return (
      (user.employeeId && selectedDepartment.headManagerId === user.employeeId) ||
      (selectedDepartment.headManager?.id && selectedDepartment.headManager.id === user.id)
    )
  }, [selectedDepartment, user])

  // Helper para localizar o evento orçamentário aplicável a um item
  const getBudgetCargo = (item: RequestItem) => {
    if (!settings.budgetEnabled) return null

    // Identificar a categoria do produto
    let catId = item.categoryId
    if (!catId && item.productId) {
      const prod = products.find((p) => p.id === item.productId)
      catId = prod?.categoryId || prod?.category?.id
    }
    if (!catId) return null

    // Encontrar evento orçamentário considerando escopo
    const matched = budgetEvents.find((evt) => {
      if (evt.categoryId !== catId) return false
      if (evt.departmentId && requestingDepartmentId) {
        return evt.departmentId === requestingDepartmentId
      }
      if (evt.branchId && selectedDepartment?.branchId) {
        return evt.branchId === selectedDepartment.branchId
      }
      return !evt.departmentId && !evt.branchId // escopo global
    })

    return matched || null
  }

  // Valida um item individual contra o teto com tolerância
  const validateItemBudget = (item: RequestItem) => {
    if (!settings.budgetEnabled) return { ok: true }
    const budgetEvent = getBudgetCargo(item)
    if (!budgetEvent) return { ok: true }

    const itemTotal = (item.estimatedPrice || 0) * (item.quantity || 1)
    const available = Number(budgetEvent.budgetAmount) - Number(budgetEvent.spentAmount)
    const tol = Number(budgetEvent.tolerancePercentage || 0)
    const maxAllowed = available * (1 + tol / 100)

    if (itemTotal > maxAllowed) {
      return {
        ok: false,
        eventName: budgetEvent.name,
        available,
        tol,
        maxAllowed,
        itemTotal,
      }
    }

    return {
      ok: true,
      eventName: budgetEvent.name,
      available,
      tol,
      maxAllowed,
      itemTotal,
    }
  }

  const updateCurrentItem = (
    field: keyof RequestItem,
    value: string | number | undefined,
  ) => {
    setCurrentItem((current) => {
      const next = { ...current, [field]: value }

      if (field === 'productId') {
        const product = products.find((entry) => entry.id === value)

        if (product) {
          next.productId = product.id
          next.productName = product.name
          next.unitSymbol = product.unit.symbol
          next.unitId = product.unit.id
          next.categoryId = product.categoryId || product.category?.id

          // Sugere automaticamente o preço estimado da posição 1
          if (product.suggestedEstimatedPrice) {
            next.estimatedPrice = Number(product.suggestedEstimatedPrice)
          }

          if (product.id !== 'custom') {
            next.description = undefined
          }
        } else if (value === 'custom') {
          next.productId = undefined
          next.productName = undefined
          next.unitSymbol = undefined
          next.categoryId = undefined
        }
      }

      return next
    })
  }

  const handleSaveItem = () => {
    if (!currentItem.productId && !currentItem.description?.trim()) {
      toast.error('Selecione um produto do catálogo ou informe uma descrição.')
      return
    }

    if (!settings.allowFreeTextItems && !currentItem.productId) {
      toast.error(
        'As diretrizes corporativas exigem a seleção de um produto cadastrado no catálogo mestre.',
      )
      return
    }

    if (!currentItem.quantity || currentItem.quantity <= 0) {
      toast.error('A quantidade deve ser maior que zero.')
      return
    }

    const budgetCheck = validateItemBudget(currentItem)
    if (!budgetCheck.ok) {
      toast.error(
        `Bloqueio de Orçamento! O valor estimado (R$ ${budgetCheck.itemTotal?.toFixed(2)}) ultrapassa o limite disponível com tolerância de +${budgetCheck.tol}% (R$ ${budgetCheck.maxAllowed?.toFixed(2)}).`,
      )
      return
    }

    if (editingIndex !== null) {
      setItems((current) => {
        const next = [...current]
        next[editingIndex] = { ...currentItem }
        return next
      })
      toast.success('Item atualizado com sucesso.')
      setEditingIndex(null)
    } else {
      setItems((current) => [...current, { ...currentItem }])
      toast.success('Item adicionado à lista do pedido.')
    }

    // Resetar formulário do card
    setCurrentItem({ quantity: 1 })
  }

  const handleEditItem = (index: number) => {
    setCurrentItem({ ...items[index] })
    setEditingIndex(index)
    toast.info(`Editando item ${index + 1}`)
  }

  const handleCancelEdit = () => {
    setEditingIndex(null)
    setCurrentItem({ quantity: 1 })
  }

  const handleRemoveItem = (index: number) => {
    setItems((current) => current.filter((_, currentIndex) => currentIndex !== index))
    if (editingIndex === index) {
      handleCancelEdit()
    } else if (editingIndex !== null && editingIndex > index) {
      setEditingIndex(editingIndex - 1)
    }
    toast.success('Item removido do pedido.')
  }

  const handleOpenQuickProduct = () => {
    setIsQuickProdOpen(true)
  }

  const handleQuickProduct = async () => {
    if (!qpName || !qpCategory || !qpUnit) {
      toast.error('Preencha os campos obrigatórios do produto rápido.')
      return
    }

    setQpLoading(true)
    try {
      const createResponse = await api.post('/products', {
        name: qpName.trim(),
        description: 'Cadastro rápido via pedido de compra',
        categoryId: qpCategory,
        unitId: qpUnit,
      })

      const [productDetails, productsResponse] = await Promise.all([
        api.get<Product>(`/products/${createResponse.data.id}`),
        api.get<Product[]>('/products'),
      ])

      setProducts(productsResponse.data)

      // Seleciona diretamente no card do item atual
      setCurrentItem((current) => ({
        ...current,
        productId: productDetails.data.id,
        productName: productDetails.data.name,
        unitId: productDetails.data.unit.id,
        unitSymbol: productDetails.data.unit.symbol,
        categoryId: productDetails.data.categoryId || productDetails.data.category?.id,
        description: undefined,
        estimatedPrice: productDetails.data.suggestedEstimatedPrice
          ? Number(productDetails.data.suggestedEstimatedPrice)
          : current.estimatedPrice,
      }))

      toast.success('Produto cadastrado e selecionado no card.')
      setIsQuickProdOpen(false)
      setQpName('')
      setQpCategory('')
      setQpUnit('')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível cadastrar o produto.'))
    } finally {
      setQpLoading(false)
    }
  }

  // Total Geral Estimado
  const totalCalculated = useMemo(() => {
    return items.reduce((acc, item) => {
      const p = Number(item.estimatedPrice || 0)
      const q = Number(item.quantity || 0)
      return acc + p * q
    }, 0)
  }, [items])

  // Validação da Etapa 1
  const validateStep1 = () => {
    if (!justification.trim()) {
      toast.error('Informe a justificativa do pedido.')
      return false
    }
    if (!requestingDepartmentId) {
      toast.error('Selecione o departamento solicitante.')
      return false
    }
    return true
  }

  // Validação da Etapa 2
  const validateStep2 = () => {
    if (items.length === 0) {
      if (currentItem.productId || currentItem.description?.trim()) {
        toast.error(
          'Você preencheu os campos do item. Clique no botão "Adicionar Item" dentro do card para incluí-lo na lista antes de prosseguir.',
        )
      } else {
        toast.error('Adicione pelo menos um item ao pedido.')
      }
      return false
    }

    for (let i = 0; i < items.length; i++) {
      const it = items[i]
      if (!it.productId && !it.description?.trim()) {
        toast.error(`Item ${i + 1}: Selecione um produto ou informe uma descrição.`)
        return false
      }

      if (!settings.allowFreeTextItems && !it.productId) {
        toast.error(
          `Item ${i + 1}: As diretrizes corporativas exigem a seleção de um produto cadastrado no catálogo mestre.`,
        )
        return false
      }

      if (!it.quantity || it.quantity <= 0) {
        toast.error(`Item ${i + 1}: A quantidade deve ser maior que zero.`)
        return false
      }

      // Validação de tolerância orçamentária
      const budgetCheck = validateItemBudget(it)
      if (!budgetCheck.ok) {
        toast.error(
          `Item ${i + 1}: Bloqueio de Orçamento! O valor estimado (R$ ${budgetCheck.itemTotal?.toFixed(2)}) ultrapassa o limite disponível com tolerância de +${budgetCheck.tol}% (R$ ${budgetCheck.maxAllowed?.toFixed(2)}).`,
        )
        return false
      }
    }

    return true
  }

  // Submissão Final do Pedido (Etapa 3)
  const handleSubmit = async () => {
    if (!validateStep1() || !validateStep2()) {
      return
    }

    setSubmitLoading(true)
    try {
      const payload = {
        departmentId: requestingDepartmentId || undefined,
        requestingDepartmentId: requestingDepartmentId || undefined,
        justification: justification.trim(),
        observation: observation.trim() || undefined,
        estimatedTotal: totalCalculated > 0 ? totalCalculated : undefined,
        priority,
        desiredDate: desiredDate || undefined,
        items: items.map((item) => {
          const price = item.estimatedPrice ? Number(item.estimatedPrice) : undefined
          return {
            productId: item.productId,
            description: item.productId ? undefined : item.description?.trim(),
            quantity: Number(item.quantity),
            unitId: item.unitId,
            estimatedPrice: price,
            estimatedUnitPrice: price,
            supplierLink: item.supplierLink?.trim() || undefined,
            contactPhone: item.contactPhone?.trim() || undefined,
            contactWhatsapp: item.contactWhatsapp?.trim() || undefined,
            observation: item.observation?.trim() || undefined,
          }
        }),
      }

      if (mode === 'edit' && requestId) {
        await api.patch(`/purchase-requests/${requestId}`, payload)
        toast.success('Pedido de compra atualizado com sucesso.')
      } else {
        const res = await api.post('/purchase-requests', payload)
        if (res.data?.status === 'APPROVED' || res.data?.isAutoApproved) {
          toast.success('Pedido emitido e APROVADO AUTOMATICAMENTE pelo gestor do departamento!')
        } else {
          toast.success('Pedido de compra emitido com sucesso e enviado para aprovação.')
        }
      }

      router.push('/dashboard/compras/pedidos')
      router.refresh()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível emitir o pedido de compra.'))
    } finally {
      setSubmitLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[360px] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Carregando formulário e saldos orçamentários...</span>
      </div>
    )
  }

  return (
    <div className="app-page space-y-6">
      {/* 1. Cabeçalho Padronizado */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <Link href="/dashboard/compras/pedidos" className="hover:text-foreground transition-colors">
              Compras
            </Link>
            <ChevronRight className="size-3 text-muted-foreground/60" />
            <span className="text-foreground font-medium">
              {mode === 'edit' ? 'Editar pedido' : 'Novo pedido'}
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {mode === 'edit' ? 'Editar Pedido de Compra' : 'Novo Pedido de Compra'}
          </h1>
          <p className="text-sm text-muted-foreground">
            Wizard inteligente em 3 etapas com validação de governança orçamentária e espelho de conferência.
          </p>
        </div>

        <Button asChild variant="outline" size="sm" className="h-9 gap-1.5 font-medium">
          <Link href="/dashboard/compras/pedidos">
            <ArrowLeft className="size-4" />
            <span>Voltar para listagem</span>
          </Link>
        </Button>
      </section>

      {/* 2. Stepper do Wizard */}
      <div className="rounded-xl border bg-card p-4 shadow-2xs">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Etapa 1 */}
          <button
            type="button"
            onClick={() => setCurrentStep(1)}
            className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
              currentStep === 1
                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                : currentStep > 1
                  ? 'border-emerald-500/40 bg-emerald-500/5 hover:bg-muted/40'
                  : 'border-border bg-muted/10 opacity-70'
            }`}
          >
            <div
              className={`size-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                currentStep === 1
                  ? 'bg-primary text-primary-foreground'
                  : currentStep > 1
                    ? 'bg-emerald-600 text-white'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              {currentStep > 1 ? <Check className="size-4" /> : '1'}
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider block text-muted-foreground">
                Etapa 1
              </span>
              <span className="text-sm font-semibold text-foreground">
                Dados Gerais & Solicitante
              </span>
            </div>
          </button>

          {/* Etapa 2 */}
          <button
            type="button"
            onClick={() => {
              if (validateStep1()) setCurrentStep(2)
            }}
            className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
              currentStep === 2
                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                : currentStep > 2
                  ? 'border-emerald-500/40 bg-emerald-500/5 hover:bg-muted/40'
                  : 'border-border bg-muted/10 opacity-70'
            }`}
          >
            <div
              className={`size-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                currentStep === 2
                  ? 'bg-primary text-primary-foreground'
                  : currentStep > 2
                    ? 'bg-emerald-600 text-white'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              {currentStep > 2 ? <Check className="size-4" /> : '2'}
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider block text-muted-foreground">
                Etapa 2
              </span>
              <span className="text-sm font-semibold text-foreground">
                Itens & Orçamento
              </span>
            </div>
          </button>

          {/* Etapa 3 */}
          <button
            type="button"
            onClick={() => {
              if (validateStep1() && validateStep2()) setCurrentStep(3)
            }}
            className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
              currentStep === 3
                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                : 'border-border bg-muted/10 opacity-70'
            }`}
          >
            <div
              className={`size-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                currentStep === 3
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              3
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider block text-muted-foreground">
                Etapa 3
              </span>
              <span className="text-sm font-semibold text-foreground">
                Conferência & Emissão
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* 3. Conteúdo da Etapa Ativa */}
      {currentStep === 1 && (
        <Card className="app-section-card p-6 space-y-6">
          <div className="border-b pb-4">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <FileText className="size-5 text-primary" />
              <span>Passo 1: Identificação e Contexto do Pedido</span>
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Defina o departamento de origem, a finalidade da solicitação e os parâmetros de prazo.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {/* Departamento Solicitante */}
            <div className="field-stack md:col-span-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Departamento Solicitante (Centro de Custo) *
              </Label>
              <Select value={requestingDepartmentId} onValueChange={setRequestingDepartmentId}>
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue placeholder="Selecione o departamento solicitante..." />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name} {dept.branch?.name ? `(${dept.branch.name})` : ''}
                      {dept.headManager?.name ? ` · Gestor: ${dept.headManager.name}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Destaque de Auto-Aprovação se for o gestor */}
              {isManagerOfSelectedDepartment ? (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-800 dark:text-emerald-300 mt-1">
                  <Zap className="size-4 shrink-0 text-emerald-600" />
                  <span>
                    <strong>Auto-Aprovação Habilitada:</strong> Você é o gestor responsável por este departamento. Ao emitir, o pedido receberá status <strong>APROVADO</strong> automaticamente.
                  </span>
                </div>
              ) : selectedDepartment ? (
                <p className="text-xs text-muted-foreground mt-1">
                  Filial: {selectedDepartment.branch?.name || 'Geral'} · Gestor:{' '}
                  {selectedDepartment.headManager?.name || 'Não atribuído'}
                </p>
              ) : null}
            </div>

            {/* Justificativa */}
            <div className="field-stack md:col-span-2">
              <Label htmlFor="req-justification" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Justificativa da Necessidade *
              </Label>
              <Textarea
                id="req-justification"
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="Explique a motivação operacional da compra, finalidade do uso e urgência..."
                className="min-h-[90px] text-sm"
                required
              />
            </div>

            {/* Prioridade */}
            <div className="field-stack">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Nível de Prioridade
              </Label>
              <Select value={priority} onValueChange={(val) => setPriority(val as typeof priority)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Selecione a prioridade..." />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Data Desejada */}
            <div className="field-stack">
              <Label htmlFor="req-desired-date" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Data Desejada de Entrega
              </Label>
              <Input
                id="req-desired-date"
                type="date"
                value={desiredDate}
                onChange={(e) => setDesiredDate(e.target.value)}
                className="h-9 text-sm"
              />
            </div>

            {/* Observações Gerais */}
            <div className="field-stack md:col-span-2">
              <Label htmlFor="req-obs" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Observações Adicionais para Compras (Opcional)
              </Label>
              <Input
                id="req-obs"
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                placeholder="Ex: Entregar na recepção matriz, horário das 09h às 16h..."
                className="h-9 text-sm"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/compras/pedidos">Cancelar</Link>
            </Button>
            <Button
              size="sm"
              className="gap-1.5 font-semibold"
              onClick={() => {
                if (validateStep1()) setCurrentStep(2)
              }}
            >
              <span>Próximo: Itens & Orçamento</span>
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </Card>
      )}

      {currentStep === 2 && (
        <Card className="app-section-card p-6 space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <ShoppingCart className="size-5 text-primary" />
                <span>Passo 2: Itens Requisitados & Saldo Orçamentário</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Preencha os dados do item no card abaixo, adicione à lista e acompanhe a conferência orçamentária.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs font-medium"
                onClick={handleOpenQuickProduct}
              >
                <PackagePlus className="size-3.5" />
                <span>Cadastro Rápido de Produto</span>
              </Button>
            </div>
          </div>

          {/* Card de Preenchimento / Edição do Item */}
          {(() => {
            const budgetCheck = validateItemBudget(currentItem)
            const selectedProd = products.find((p) => p.id === currentItem.productId)
            const itemTotal = (currentItem.estimatedPrice || 0) * (currentItem.quantity || 1)
            const itemTitle = selectedProd?.name
              ? `ITEM - ${selectedProd.name}`
              : currentItem.description?.trim()
                ? `ITEM - ${currentItem.description}`
                : 'ITEM'

            return (
              <div
                className={`rounded-xl border p-5 space-y-4 transition-all shadow-sm ${
                  !budgetCheck.ok
                    ? 'border-rose-500/60 bg-rose-500/5 ring-1 ring-rose-500/40'
                    : editingIndex !== null
                      ? 'border-amber-500/60 bg-amber-500/5 ring-1 ring-amber-500/40'
                      : 'border-border bg-card'
                }`}
              >
                {/* Cabeçalho do Card */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm bg-muted/60 px-2.5 py-1 rounded text-foreground border">
                      {itemTitle}
                    </span>
                    {editingIndex !== null && (
                      <span className="text-[11px] font-semibold bg-amber-500/20 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                        Modo Edição (Item #{editingIndex + 1})
                      </span>
                    )}
                    {selectedProd?.suggestedEstimatedPrice && (
                      <span className="text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-medium">
                        Preço Sugerido P1: R${' '}
                        {selectedProd.suggestedEstimatedPrice.toFixed(2)}
                      </span>
                    )}
                  </div>

                  {editingIndex !== null && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-muted-foreground hover:text-foreground"
                      onClick={handleCancelEdit}
                    >
                      Cancelar Edição
                    </Button>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-12">
                  {/* Produto */}
                  <div className="field-stack md:col-span-6">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Produto Homologado {settings.allowFreeTextItems ? '(ou Outro)' : '*'}
                    </Label>
                    <Select
                      value={currentItem.productId ?? (settings.allowFreeTextItems ? 'custom' : '')}
                      onValueChange={(val) =>
                        updateCurrentItem('productId', val === 'custom' ? undefined : val)
                      }
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Selecione um produto do catálogo..." />
                      </SelectTrigger>
                      <SelectContent>
                        {settings.allowFreeTextItems && (
                          <SelectItem value="custom">Outro (Descrição Livre)</SelectItem>
                        )}
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} ({p.unit?.symbol})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Quantidade */}
                  <div className="field-stack md:col-span-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Quantidade *
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      value={currentItem.quantity ?? 1}
                      onChange={(e) =>
                        updateCurrentItem('quantity', Number(e.target.value || '1'))
                      }
                      className="h-9 text-sm font-mono"
                    />
                  </div>

                  {/* Preço Unitário Estimado */}
                  <div className="field-stack md:col-span-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Unitário Est. (R$)
                    </Label>
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={currentItem.estimatedPrice ?? ''}
                      onChange={(e) =>
                        updateCurrentItem('estimatedPrice', Number(e.target.value || '0'))
                      }
                      placeholder="0,00"
                      className="h-9 text-sm font-mono"
                    />
                  </div>

                  {/* Total Estimado */}
                  <div className="field-stack md:col-span-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Total Est.
                    </Label>
                    <div className="h-9 flex items-center px-3 rounded-md bg-muted/40 border font-mono font-bold text-sm text-foreground">
                      R$ {itemTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                {/* Se produto não selecionado e texto livre permitido */}
                {!currentItem.productId && settings.allowFreeTextItems && (
                  <div className="field-stack">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Descrição Livre do Item *
                    </Label>
                    <Input
                      value={currentItem.description ?? ''}
                      onChange={(e) => updateCurrentItem('description', e.target.value)}
                      placeholder="Descreva detalhadamente o item e especificações técnicas..."
                      className="h-9 text-sm"
                    />
                  </div>
                )}

                {/* Links e Contatos de Fornecedor */}
                <div className="grid gap-3 md:grid-cols-3 pt-1">
                  <div className="field-stack">
                    <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <ExternalLink className="size-3" />
                      <span>Link de Referência / E-Commerce</span>
                    </Label>
                    <Input
                      value={currentItem.supplierLink ?? ''}
                      onChange={(e) => updateCurrentItem('supplierLink', e.target.value)}
                      placeholder="https://..."
                      className="h-8 text-xs font-mono"
                    />
                  </div>

                  <div className="field-stack">
                    <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <Phone className="size-3" />
                      <span>Telefone do Fornecedor</span>
                    </Label>
                    <Input
                      value={currentItem.contactPhone ?? ''}
                      onChange={(e) => updateCurrentItem('contactPhone', e.target.value)}
                      placeholder="(00) 0000-0000"
                      className="h-8 text-xs font-mono"
                    />
                  </div>

                  <div className="field-stack">
                    <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <span>WhatsApp do Fornecedor</span>
                    </Label>
                    <Input
                      value={currentItem.contactWhatsapp ?? ''}
                      onChange={(e) => updateCurrentItem('contactWhatsapp', e.target.value)}
                      placeholder="(00) 00000-0000"
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Card Reativo de Trava Orçamentária */}
                {settings.budgetEnabled && (
                  <div className="pt-1">
                    {!budgetCheck.ok ? (
                      <div className="flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-800 dark:text-rose-300">
                        <AlertCircle className="size-4 shrink-0 text-rose-600 mt-0.5" />
                        <div className="space-y-0.5">
                          <span className="font-bold">
                            Bloqueio de Orçamento ({budgetCheck.eventName})
                          </span>
                          <p>
                            O valor estimado de R$ {budgetCheck.itemTotal?.toFixed(2)} excede o limite disponível de R$ {budgetCheck.available?.toFixed(2)} mesmo com a tolerância de +{budgetCheck.tol}% (Teto máx: R$ {budgetCheck.maxAllowed?.toFixed(2)}). Ajuste a quantidade ou consulte a gerência.
                          </p>
                        </div>
                      </div>
                    ) : budgetCheck.eventName ? (
                      <div className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5 text-xs text-emerald-800 dark:text-emerald-300">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="size-3.5 text-emerald-600" />
                          <span>
                            Orçamento: <strong>{budgetCheck.eventName}</strong>
                          </span>
                        </div>
                        <span>
                          Saldo disponível: R$ {budgetCheck.available?.toFixed(2)} (+{budgetCheck.tol}% tol.)
                        </span>
                      </div>
                    ) : null}
                  </div>
                )}

                {/* Botão de Adicionar / Salvar Item DENTRO do Card */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t">
                  <div className="text-xs text-muted-foreground">
                    {currentItem.productId ? (
                      <span>Produto selecionado. Clique ao lado para incluir na lista do pedido.</span>
                    ) : (
                      <span>Selecione um produto do catálogo acima.</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    {editingIndex !== null && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleCancelEdit}
                        className="h-9 text-xs"
                      >
                        Cancelar
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      className="h-9 gap-1.5 text-xs font-semibold"
                      onClick={handleSaveItem}
                    >
                      {editingIndex !== null ? (
                        <>
                          <Check className="size-3.5" />
                          <span>Salvar Alterações</span>
                        </>
                      ) : (
                        <>
                          <Plus className="size-3.5" />
                          <span>Adicionar Item</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Listagem de Itens Adicionados Logo Abaixo do Card */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-foreground">
                  Itens Adicionados ao Pedido
                </h3>
                <span className="inline-flex items-center justify-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                  {items.length} {items.length === 1 ? 'item' : 'itens'}
                </span>
              </div>
            </div>

            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/10 p-8 text-center">
                <ShoppingCart className="size-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm font-semibold text-foreground">
                  Nenhum item adicionado ainda
                </p>
                <p className="text-xs text-muted-foreground max-w-sm mt-0.5">
                  Preencha os dados no card acima e clique em <strong>Adicionar Item</strong> para incluí-lo na lista do pedido.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b bg-muted/40 font-semibold text-muted-foreground">
                      <tr>
                        <th className="py-2.5 px-3 w-12 text-center">#</th>
                        <th className="py-2.5 px-3">Produto / Descrição</th>
                        <th className="py-2.5 px-3 text-center">Qtd</th>
                        <th className="py-2.5 px-3 text-right">Unitário Est.</th>
                        <th className="py-2.5 px-3 text-right">Total Est.</th>
                        <th className="py-2.5 px-3">Orçamento</th>
                        <th className="py-2.5 px-3 w-28 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {items.map((it, idx) => {
                        const budgetCheck = validateItemBudget(it)
                        const itTotal = (it.estimatedPrice || 0) * (it.quantity || 1)
                        const isBeingEdited = editingIndex === idx

                        return (
                          <tr
                            key={it.id ?? `item-list-${idx}`}
                            className={`transition-colors hover:bg-muted/30 ${
                              isBeingEdited ? 'bg-amber-500/10' : ''
                            }`}
                          >
                            <td className="py-2.5 px-3 text-center font-semibold text-muted-foreground">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-semibold text-foreground text-sm">
                                {it.productName ||
                                  products.find((p) => p.id === it.productId)?.name ||
                                  it.description ||
                                  'Item sem nome'}
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-[11px] text-muted-foreground">
                                {it.unitSymbol && (
                                  <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[10px]">
                                    Un: {it.unitSymbol}
                                  </span>
                                )}
                                {it.supplierLink && (
                                  <a
                                    href={it.supplierLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-primary hover:underline flex items-center gap-0.5"
                                  >
                                    <ExternalLink className="size-3" />
                                    <span>Link</span>
                                  </a>
                                )}
                                {it.contactPhone && (
                                  <span>Tel: {it.contactPhone}</span>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-semibold">
                              {it.quantity}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono">
                              R$ {(it.estimatedPrice || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-foreground">
                              R$ {itTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-3">
                              {settings.budgetEnabled ? (
                                !budgetCheck.ok ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] text-rose-600 dark:text-rose-400 font-semibold">
                                    <AlertCircle className="size-3" />
                                    <span>Excede Teto</span>
                                  </span>
                                ) : budgetCheck.eventName ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle2 className="size-3" />
                                    <span>{budgetCheck.eventName}</span>
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground text-[11px]">—</span>
                                )
                              ) : (
                                <span className="text-muted-foreground text-[11px]">Livre</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  className="size-7 text-muted-foreground hover:text-foreground"
                                  onClick={() => handleEditItem(idx)}
                                  title="Editar este item"
                                >
                                  <Pencil className="size-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  className="size-7 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                  onClick={() => handleRemoveItem(idx)}
                                  title="Excluir este item"
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCurrentStep(1)}
              className="gap-1.5"
            >
              <ArrowLeft className="size-4" />
              <span>Voltar: Dados Gerais</span>
            </Button>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="text-[11px] text-muted-foreground uppercase block">
                  Total Estimado do Pedido
                </span>
                <span className="font-mono font-bold text-base text-foreground">
                  R$ {totalCalculated.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <Button
                size="sm"
                className="gap-1.5 font-semibold"
                onClick={() => {
                  if (validateStep2()) setCurrentStep(3)
                }}
              >
                <span>Próximo: Conferência</span>
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {currentStep === 3 && (
        <Card className="app-section-card p-6 space-y-6">
          <div className="border-b pb-4">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <ClipboardCheck className="size-5 text-emerald-600" />
              <span>Passo 3: Relatório de Conferência e Emissão do Pedido</span>
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Revise o espelho executivo de compras antes de confirmar a emissão no sistema.
            </p>
          </div>

          {/* Espelho do Pedido */}
          <div className="rounded-xl border bg-muted/15 p-5 space-y-5">
            {/* Bloco 1: Cabeçalho do Pedido */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-b pb-4 text-xs">
              <div>
                <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                  Departamento Solicitante
                </span>
                <span className="font-semibold text-foreground text-sm">
                  {selectedDepartment?.name || 'Não informado'}
                </span>
                {selectedDepartment?.branch?.name && (
                  <span className="text-muted-foreground block text-[11px]">
                    Filial: {selectedDepartment.branch.name}
                  </span>
                )}
              </div>

              <div>
                <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                  Prioridade
                </span>
                <span className="font-semibold text-foreground text-sm">
                  {PRIORITY_OPTIONS.find((p) => p.value === priority)?.label || priority}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                  Data Desejada
                </span>
                <span className="font-semibold text-foreground text-sm">
                  {desiredDate ? new Date(desiredDate + 'T00:00:00').toLocaleDateString('pt-BR') : 'Não definida'}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                  Total Geral Estimado
                </span>
                <span className="font-mono font-bold text-foreground text-base text-emerald-600 dark:text-emerald-400">
                  R$ {totalCalculated.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Justificativa */}
            <div className="text-xs space-y-1">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                Justificativa Operacional
              </span>
              <p className="rounded-md border bg-background p-3 text-foreground leading-relaxed">
                {justification}
              </p>
            </div>

            {/* Bloco 2: Tabela de Itens Espelhados */}
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                Itens Requisitados ({items.length})
              </span>

              <div className="overflow-x-auto rounded-lg border bg-background">
                <table className="w-full text-left text-xs">
                  <thead className="border-b bg-muted/30 text-muted-foreground">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold uppercase">#</th>
                      <th className="py-2.5 px-3 font-semibold uppercase">Produto / Especificação</th>
                      <th className="py-2.5 px-3 font-semibold uppercase text-center">Qtd</th>
                      <th className="py-2.5 px-3 font-semibold uppercase text-right">Unit. Est.</th>
                      <th className="py-2.5 px-3 font-semibold uppercase text-right">Total Est.</th>
                      <th className="py-2.5 px-3 font-semibold uppercase">Referências / Contatos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {items.map((item, idx) => {
                      const totalItem = (item.estimatedPrice || 0) * item.quantity

                      return (
                        <tr key={idx} className="hover:bg-muted/10">
                          <td className="py-2.5 px-3 font-mono font-bold text-muted-foreground">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-semibold text-foreground block">
                              {item.productName || item.description || 'Item não especificado'}
                            </span>
                            {item.observation && (
                              <span className="text-[11px] text-muted-foreground block">
                                Obs: {item.observation}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-semibold">
                            {item.quantity} {item.unitSymbol || 'UN'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono">
                            {item.estimatedPrice
                              ? `R$ ${item.estimatedPrice.toFixed(2)}`
                              : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold">
                            R$ {totalItem.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex flex-wrap gap-2 text-[11px]">
                              {item.supplierLink && (
                                <a
                                  href={item.supplierLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-primary hover:underline"
                                >
                                  <ExternalLink className="size-3" />
                                  <span>Site</span>
                                </a>
                              )}
                              {item.contactPhone && (
                                <span className="font-mono text-muted-foreground">
                                  Tel: {item.contactPhone}
                                </span>
                              )}
                              {item.contactWhatsapp && (
                                <span className="font-mono text-muted-foreground">
                                  Whats: {item.contactWhatsapp}
                                </span>
                              )}
                              {!item.supplierLink && !item.contactPhone && !item.contactWhatsapp && (
                                <span className="text-muted-foreground italic">-</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bloco 3: Aviso de Governança & Rota de Aprovação */}
            {isManagerOfSelectedDepartment ? (
              <div className="flex items-start gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-900 dark:text-emerald-200">
                <Zap className="size-5 shrink-0 text-emerald-600 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold text-sm block">
                    Auto-Aprovação Ativa (Gestor Responsável)
                  </span>
                  <p className="leading-relaxed">
                    Identificamos que você é o gestor responsável por este departamento. Ao emitir este pedido, ele será <strong>auto-aprovado imediatamente</strong> e liberado diretamente para o setor de compras iniciar as cotações.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 rounded-lg border border-blue-500/20 bg-blue-500/5 p-4 text-xs text-blue-900 dark:text-blue-200">
                <ShieldCheck className="size-5 shrink-0 text-blue-600 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold text-sm block">
                    Fluxo de Governança & Aprovação
                  </span>
                  <p className="leading-relaxed">
                    Este pedido será submetido e encaminhado para a fila de aprovação do gestor de compras / departamento.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Ações de Emissão */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCurrentStep(2)}
              className="gap-1.5"
            >
              <ArrowLeft className="size-4" />
              <span>Voltar para Edição de Itens</span>
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleSubmit}
              disabled={submitLoading}
              className="gap-2 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground h-9 px-4"
            >
              {submitLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Emitindo Pedido...</span>
                </>
              ) : (
                <>
                  <Send className="size-4" />
                  <span>Emitir Pedido de Compra</span>
                </>
              )}
            </Button>
          </div>
        </Card>
      )}

      {/* Modal Centralizado de Cadastro Rápido de Produto */}
      <Dialog open={isQuickProdOpen} onOpenChange={setIsQuickProdOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Cadastro Rápido de Produto</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="field-stack">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Nome do Produto *
              </Label>
              <Input
                value={qpName}
                onChange={(event) => setQpName(event.target.value)}
                placeholder="Ex: Teclado Mecânico ABNT2"
                className="h-9 text-sm"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="field-stack">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Categoria *
                </Label>
                <Select value={qpCategory} onValueChange={setQpCategory}>
                  <SelectTrigger className="h-9 text-sm">
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
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Unidade *
                </Label>
                <Select value={qpUnit} onValueChange={setQpUnit}>
                  <SelectTrigger className="h-9 text-sm">
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

          <DialogFooter className="gap-2 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsQuickProdOpen(false)}
              disabled={qpLoading}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleQuickProduct}
              disabled={qpLoading}
            >
              {qpLoading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Cadastrar produto'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
