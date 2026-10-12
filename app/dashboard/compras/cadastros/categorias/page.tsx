'use client'

import { useEffect, useState } from 'react'
import {
  AlertCircle,
  Building2,
  Coins,
  DollarSign,
  Loader2,
  Pencil,
  Plus,
  RotateCw,
  Search,
  Tag,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
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
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'

interface Category {
  id: string
  name: string
}

interface BudgetEventItem {
  id: string
  name: string
  budgetAmount: number
  spentAmount: number
  tolerancePercentage: number
  categoryId: string
  branchId?: string | null
  departmentId?: string | null
  category: { id: string; name: string }
  branch?: { id: string; name: string } | null
  department?: { id: string; name: string } | null
}

interface Branch {
  id: string
  name: string
}

interface Department {
  id: string
  name: string
}

interface Product {
  id: string
  categoryId?: string
  category?: { id: string }
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [budgetEvents, setBudgetEvents] = useState<BudgetEventItem[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Modal Categoria
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [categoryName, setCategoryName] = useState('')
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [categoryLoading, setCategoryLoading] = useState(false)

  // Delete Categoria
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null)
  const [isDeleteCategoryOpen, setIsDeleteCategoryOpen] = useState(false)
  const [deleteCategoryLoading, setDeleteCategoryLoading] = useState(false)

  // Modal Evento Orçamentário
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false)
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null)
  const [budgetFormLoading, setBudgetFormLoading] = useState(false)
  const [budgetCategoryId, setBudgetCategoryId] = useState('')
  const [budgetScopeType, setBudgetScopeType] = useState<'COMPANY' | 'BRANCH' | 'DEPARTMENT'>('BRANCH')
  const [budgetBranchId, setBudgetBranchId] = useState('')
  const [budgetDepartmentId, setBudgetDepartmentId] = useState('')
  const [budgetName, setBudgetName] = useState('')
  const [budgetAmount, setBudgetAmount] = useState('')
  const [budgetTolerance, setBudgetTolerance] = useState('0')

  // Delete Evento Orçamentário
  const [deleteBudgetId, setDeleteBudgetId] = useState<string | null>(null)
  const [isDeleteBudgetOpen, setIsDeleteBudgetOpen] = useState(false)
  const [deleteBudgetLoading, setDeleteBudgetLoading] = useState(false)

  const fetchData = async () => {
    try {
      setLoading(true)
      const [catRes, budgetRes, prodRes, branchRes, deptRes] = await Promise.all([
        api.get('/products/categories/all'),
        api.get('/procurement-budget/events').catch(() => ({ data: [] })),
        api.get('/products').catch(() => ({ data: [] })),
        api.get('/branches').catch(() => ({ data: [] })),
        api.get('/departments').catch(() => ({ data: [] })),
      ])

      setCategories(catRes.data || [])
      setBudgetEvents(budgetRes.data || [])
      setProducts(prodRes.data || [])
      setBranches(branchRes.data || [])
      setDepartments(deptRes.data || [])
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Erro ao carregar categorias.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchData()
  }, [])

  // Handlers Categoria
  const handleOpenCategoryModal = (cat?: Category) => {
    if (cat) {
      setEditingCategoryId(cat.id)
      setCategoryName(cat.name)
    } else {
      setEditingCategoryId(null)
      setCategoryName('')
    }
    setIsCategoryModalOpen(true)
  }

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!categoryName.trim()) {
      toast.error('Informe o nome da categoria.')
      return
    }

    try {
      setCategoryLoading(true)
      if (editingCategoryId) {
        await api.patch(`/products/categories/${editingCategoryId}`, { name: categoryName.trim() })
        toast.success('Categoria atualizada com sucesso.')
      } else {
        await api.post('/products/categories', { name: categoryName.trim() })
        toast.success('Categoria cadastrada com sucesso.')
      }
      setIsCategoryModalOpen(false)
      await fetchData()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Erro ao salvar categoria.'))
    } finally {
      setCategoryLoading(false)
    }
  }

  const handleDeleteCategory = async () => {
    if (!deleteCategoryId) return
    try {
      setDeleteCategoryLoading(true)
      await api.delete(`/products/categories/${deleteCategoryId}`)
      toast.success('Categoria excluída com sucesso.')
      setIsDeleteCategoryOpen(false)
      setDeleteCategoryId(null)
      await fetchData()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível excluir a categoria.'))
    } finally {
      setDeleteCategoryLoading(false)
    }
  }

  // Handlers Evento Orçamentário
  const resetBudgetForm = () => {
    setEditingBudgetId(null)
    setBudgetCategoryId(categories[0]?.id || '')
    setBudgetScopeType('BRANCH')
    setBudgetBranchId(branches[0]?.id || '')
    setBudgetDepartmentId('')
    setBudgetName('')
    setBudgetAmount('')
    setBudgetTolerance('0')
  }

  const handleOpenBudgetModal = (catId?: string, budget?: BudgetEventItem) => {
    if (budget) {
      setEditingBudgetId(budget.id)
      setBudgetCategoryId(budget.categoryId)
      setBudgetName(budget.name)
      setBudgetAmount(String(budget.budgetAmount))
      setBudgetTolerance(String(budget.tolerancePercentage || 0))
      if (budget.departmentId) {
        setBudgetScopeType('DEPARTMENT')
        setBudgetDepartmentId(budget.departmentId)
      } else if (budget.branchId) {
        setBudgetScopeType('BRANCH')
        setBudgetBranchId(budget.branchId)
      } else {
        setBudgetScopeType('COMPANY')
      }
    } else {
      resetBudgetForm()
      if (catId) {
        setBudgetCategoryId(catId)
      }
    }
    setIsBudgetModalOpen(true)
  }

  const handleSaveBudgetEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!budgetCategoryId) {
      toast.error('Selecione uma categoria de produto.')
      return
    }
    if (!budgetName.trim()) {
      toast.error('Informe o nome do evento orçamentário.')
      return
    }
    const amountNum = parseFloat(budgetAmount.replace(',', '.'))
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Informe um valor de orçamento válido maior que zero.')
      return
    }

    try {
      setBudgetFormLoading(true)
      const payload = {
        name: budgetName.trim(),
        categoryId: budgetCategoryId,
        budgetAmount: amountNum,
        tolerancePercentage: parseFloat(budgetTolerance.replace(',', '.')) || 0,
        branchId: budgetScopeType === 'BRANCH' ? budgetBranchId || undefined : undefined,
        departmentId: budgetScopeType === 'DEPARTMENT' ? budgetDepartmentId || undefined : undefined,
      }

      if (editingBudgetId) {
        await api.patch(`/procurement-budget/events/${editingBudgetId}`, payload)
        toast.success('Evento orçamentário atualizado com sucesso.')
      } else {
        await api.post('/procurement-budget/events', payload)
        toast.success('Evento orçamentário criado com sucesso.')
      }

      setIsBudgetModalOpen(false)
      await fetchData()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Erro ao salvar evento orçamentário.'))
    } finally {
      setBudgetFormLoading(false)
    }
  }

  const handleDeleteBudgetEvent = async () => {
    if (!deleteBudgetId) return
    try {
      setDeleteBudgetLoading(true)
      await api.delete(`/procurement-budget/events/${deleteBudgetId}`)
      toast.success('Evento orçamentário removido.')
      setIsDeleteBudgetOpen(false)
      setDeleteBudgetId(null)
      await fetchData()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Erro ao excluir evento orçamentário.'))
    } finally {
      setDeleteBudgetLoading(false)
    }
  }

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Categorias de Produtos
            </h1>
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              {categories.length} {categories.length === 1 ? 'categoria' : 'categorias'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Classificação mercadológica com associação direta a Eventos Orçamentários e tetos com tolerância.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 font-medium"
            onClick={() => handleOpenBudgetModal()}
          >
            <Coins className="size-3.5 text-primary" />
            <span>Novo Evento Orçamentário</span>
          </Button>

          <Button
            size="sm"
            className="h-8 gap-1.5 font-semibold"
            onClick={() => handleOpenCategoryModal()}
          >
            <Plus className="size-3.5" />
            <span>Nova Categoria</span>
          </Button>
        </div>
      </div>

      {/* Barra de Pesquisa */}
      <Card className="app-section-card p-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome da categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 pl-9 text-xs"
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-9 px-2.5 text-xs"
            onClick={fetchData}
            title="Atualizar lista"
          >
            <RotateCw className="size-3.5" />
          </Button>
        </div>
      </Card>

      {/* Grid de Categorias */}
      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : filteredCategories.length === 0 ? (
        <Card className="app-section-card p-12 text-center space-y-3">
          <Tag className="mx-auto size-10 text-muted-foreground/60" />
          <h3 className="text-sm font-semibold text-foreground">Nenhuma categoria encontrada</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Cadastre categorias para organizar os produtos de compras e definir tetos de gastos orçamentários.
          </p>
          <Button
            size="sm"
            className="mt-2"
            onClick={() => handleOpenCategoryModal()}
          >
            Cadastrar Primeira Categoria
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCategories.map((c) => {
            const categoryEvents = budgetEvents.filter((b) => b.categoryId === c.id)
            const categoryProductsCount = products.filter(
              (p) => p.categoryId === c.id || p.category?.id === c.id,
            ).length

            return (
              <div
                key={c.id}
                className="flex flex-col justify-between rounded-lg border bg-card p-4 space-y-4 shadow-2xs hover:border-primary/40 transition-colors"
              >
                <div className="flex items-center justify-between border-b pb-2.5">
                  <div className="flex items-center gap-2">
                    <Tag className="size-4 text-primary" />
                    <span className="text-sm font-semibold text-foreground">{c.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-full border">
                      {categoryProductsCount} {categoryProductsCount === 1 ? 'produto' : 'produtos'}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="size-7 text-muted-foreground hover:text-foreground"
                      onClick={() => handleOpenCategoryModal(c)}
                      title="Editar nome da categoria"
                    >
                      <Pencil className="size-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="size-7 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                      onClick={() => {
                        setDeleteCategoryId(c.id)
                        setIsDeleteCategoryOpen(true)
                      }}
                      title="Excluir categoria"
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                </div>

                {/* Eventos Orçamentários da Categoria */}
                {categoryEvents.length > 0 ? (
                  <div className="space-y-3">
                    {categoryEvents.map((evt) => {
                      const percent =
                        evt.budgetAmount > 0
                          ? Math.min(100, Math.round((evt.spentAmount / evt.budgetAmount) * 100))
                          : 0
                      const balance = evt.budgetAmount - evt.spentAmount

                      return (
                        <div
                          key={evt.id}
                          className="rounded-lg border bg-muted/15 p-3 space-y-2 hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <Coins className="size-3.5 text-amber-600" />
                                <span className="text-xs font-semibold text-foreground">
                                  {evt.name}
                                </span>
                              </div>
                              <span className="text-[11px] text-muted-foreground">
                                {evt.department?.name
                                  ? `Depto: ${evt.department.name}`
                                  : evt.branch?.name
                                  ? `Filial: ${evt.branch.name}`
                                  : 'Empresa (Global)'}
                                {evt.tolerancePercentage > 0 && ` · Tolerância +${evt.tolerancePercentage}%`}
                              </span>
                            </div>

                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="size-6 text-muted-foreground hover:text-foreground"
                                onClick={() => handleOpenBudgetModal(c.id, evt)}
                                title="Editar evento"
                              >
                                <Pencil className="size-2.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="size-6 text-rose-600 hover:text-rose-700"
                                onClick={() => {
                                  setDeleteBudgetId(evt.id)
                                  setIsDeleteBudgetOpen(true)
                                }}
                                title="Remover evento"
                              >
                                <Trash2 className="size-2.5" />
                              </Button>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-muted-foreground">
                                Gasto: R$ {Number(evt.spentAmount).toFixed(2)}
                              </span>
                              <span
                                className={`font-semibold ${
                                  balance < 0 ? 'text-destructive' : 'text-emerald-700'
                                }`}
                              >
                                Saldo: R$ {Number(balance).toFixed(2)}
                              </span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                              <div
                                className={`h-full ${
                                  percent >= 100
                                    ? 'bg-destructive'
                                    : percent >= 80
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500'
                                }`}
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-[10px] text-muted-foreground">
                              <span>Teto Ciclo: R$ {Number(evt.budgetAmount).toFixed(2)}</span>
                              <span>{percent}% utilizado</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-4 border border-dashed rounded-lg bg-muted/10 text-center space-y-1">
                    <AlertCircle className="size-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Sem evento orçamentário configurado
                    </span>
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs text-primary font-semibold"
                      onClick={() => handleOpenBudgetModal(c.id)}
                    >
                      + Configurar Teto Orçamentário
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal de Categoria */}
      <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleSaveCategory}>
            <DialogHeader>
              <DialogTitle>
                {editingCategoryId ? 'Editar Categoria' : 'Nova Categoria'}
              </DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="catName" className="text-xs font-semibold">
                  Nome da Categoria *
                </Label>
                <Input
                  id="catName"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="Ex: TI e Informática, Higiene, Escritório"
                  className="h-9 text-xs"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCategoryModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={categoryLoading}>
                {categoryLoading ? <Loader2 className="size-3.5 animate-spin" /> : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Evento Orçamentário */}
      <Dialog open={isBudgetModalOpen} onOpenChange={setIsBudgetModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleSaveBudgetEvent}>
            <DialogHeader>
              <DialogTitle>
                {editingBudgetId ? 'Editar Evento Orçamentário' : 'Novo Evento Orçamentário'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4 text-xs">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Categoria de Produto *</Label>
                <Select
                  value={budgetCategoryId}
                  onValueChange={setBudgetCategoryId}
                  disabled={!!editingBudgetId}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-xs">
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Nome do Evento Orçamentário *</Label>
                <Input
                  placeholder="Ex: Material Gráfico, Licenças de Software, Descartáveis"
                  value={budgetName}
                  onChange={(e) => setBudgetName(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Escopo de Aplicação *</Label>
                  <Select
                    value={budgetScopeType}
                    onValueChange={(val: any) => setBudgetScopeType(val)}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BRANCH" className="text-xs">
                        Filial Específica
                      </SelectItem>
                      <SelectItem value="DEPARTMENT" className="text-xs">
                        Departamento Específico
                      </SelectItem>
                      <SelectItem value="COMPANY" className="text-xs">
                        Empresa (Global)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {budgetScopeType === 'BRANCH' && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Filial *</Label>
                    <Select value={budgetBranchId} onValueChange={setBudgetBranchId}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Selecione a filial" />
                      </SelectTrigger>
                      <SelectContent>
                        {branches.map((b) => (
                          <SelectItem key={b.id} value={b.id} className="text-xs">
                            {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {budgetScopeType === 'DEPARTMENT' && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Departamento *</Label>
                    <Select value={budgetDepartmentId} onValueChange={setBudgetDepartmentId}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Selecione o departamento" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((d) => (
                          <SelectItem key={d.id} value={d.id} className="text-xs">
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Teto Orçado p/ Ciclo (R$) *</Label>
                  <Input
                    placeholder="0,00"
                    value={budgetAmount}
                    onChange={(e) => setBudgetAmount(e.target.value)}
                    className="h-9 text-xs"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Tolerância Bloqueante (+X%)</Label>
                  <Input
                    placeholder="0"
                    value={budgetTolerance}
                    onChange={(e) => setBudgetTolerance(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsBudgetModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={budgetFormLoading}>
                {budgetFormLoading ? <Loader2 className="size-3.5 animate-spin" /> : 'Salvar Evento'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmação Exclusão Categoria */}
      <ConfirmDialog
        open={isDeleteCategoryOpen}
        onOpenChange={setIsDeleteCategoryOpen}
        title="Excluir Categoria"
        description="Tem certeza que deseja excluir esta categoria? Produtos vinculados podem ficar sem categorização."
        onConfirm={handleDeleteCategory}
        loading={deleteCategoryLoading}
        confirmText="Excluir Categoria"
        variant="destructive"
      />

      {/* Confirmação Exclusão Evento Orçamentário */}
      <ConfirmDialog
        open={isDeleteBudgetOpen}
        onOpenChange={setIsDeleteBudgetOpen}
        title="Remover Evento Orçamentário"
        description="Tem certeza que deseja remover este teto de orçamento da categoria? A conferência de tolerância deixará de ser exigida para os pedidos."
        onConfirm={handleDeleteBudgetEvent}
        loading={deleteBudgetLoading}
        confirmText="Remover Evento"
        variant="destructive"
      />
    </div>
  )
}
