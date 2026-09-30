'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Package,
  Pencil,
  Plus,
  RotateCw,
  Ruler,
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
import { FilterPopover } from '@/components/ui/filter-popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'

interface Category {
  id: string
  name: string
}

interface Unit {
  id: string
  name: string
  symbol: string
}

interface Product {
  id: string
  name: string
  description: string | null
  category: Category
  unit: Unit
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('ALL')

  // Modal Produto
  const [isProductOpen, setIsProductOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formLoading, setFormLoading] = useState(false)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [unitId, setUnitId] = useState('')

  // Delete dialog
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Paginação
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  const fetchData = async () => {
    try {
      setLoading(true)
      const [prodRes, catRes, unitRes] = await Promise.all([
        api.get('/products'),
        api.get('/products/categories/all'),
        api.get('/products/units/all'),
      ])

      setProducts(prodRes.data)
      setCategories(catRes.data)
      setUnits(unitRes.data)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Erro ao carregar catálogo de produtos.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchData()
  }, [])

  const resetForm = () => {
    setName('')
    setDescription('')
    setCategoryId('')
    setUnitId('')
    setEditingId(null)
  }

  const handleEdit = (p: Product) => {
    setEditingId(p.id)
    setName(p.name)
    setDescription(p.description || '')
    setCategoryId(p.category.id)
    setUnitId(p.unit.id)
    setIsProductOpen(true)
  }

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Informe o nome do produto.')
      return
    }
    if (!categoryId) {
      toast.error('Selecione uma categoria.')
      return
    }
    if (!unitId) {
      toast.error('Selecione uma unidade de medida.')
      return
    }

    setFormLoading(true)
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        categoryId,
        unitId,
      }

      if (editingId) {
        await api.patch(`/products/${editingId}`, payload)
        toast.success('Produto atualizado com sucesso.')
      } else {
        await api.post('/products', payload)
        toast.success('Produto cadastrado com sucesso.')
      }

      setIsProductOpen(false)
      resetForm()
      await fetchData()
    } catch (e) {
      toast.error(getApiErrorMessage(e, 'Erro ao salvar produto.'))
    } finally {
      setFormLoading(false)
    }
  }

  const handleDeleteProduct = async () => {
    if (!deleteProductId) return
    setDeleteLoading(true)
    try {
      await api.delete(`/products/${deleteProductId}`)
      toast.success('Produto excluído com sucesso.')
      setIsDeleteDialogOpen(false)
      setDeleteProductId(null)
      await fetchData()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Erro ao excluir produto.'))
    } finally {
      setDeleteLoading(false)
    }
  }

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (searchTerm.trim()) count++
    if (categoryFilter !== 'ALL') count++
    return count
  }, [searchTerm, categoryFilter])

  function handleClearFilters() {
    setSearchTerm('')
    setCategoryFilter('ALL')
    setCurrentPage(1)
  }

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase()
        const matchName = p.name.toLowerCase().includes(q)
        const matchDesc = (p.description || '').toLowerCase().includes(q)
        const matchCat = p.category?.name.toLowerCase().includes(q)
        if (!matchName && !matchDesc && !matchCat) return false
      }

      if (categoryFilter !== 'ALL' && p.category?.id !== categoryFilter) {
        return false
      }

      return true
    })
  }, [products, searchTerm, categoryFilter])

  const totalPages = Math.ceil(filteredProducts.length / pageSize) || 1

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredProducts.slice(start, start + pageSize)
  }, [filteredProducts, currentPage, pageSize])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1)
    }
  }, [totalPages, currentPage])

  const stats = useMemo(() => {
    return {
      totalProducts: products.length,
      totalCategories: categories.length,
      totalUnits: units.length,
      withDescription: products.filter((p) => Boolean(p.description)).length,
    }
  }, [products, categories, units])

  return (
    <div className="app-page space-y-6">
      {/* 1. Cabeçalho Padronizado */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Catálogo de Produtos
          </h1>
          <p className="text-sm text-muted-foreground">
            Gerencie o cadastro mestre de itens, categorias e unidades de medida para compras.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => {
              resetForm()
              setIsProductOpen(true)
            }}
            size="sm"
            className="h-9 gap-1.5 font-semibold"
          >
            <Plus className="size-4" />
            <span>Novo produto</span>
          </Button>

          {/* Filtro Flutuante */}
          <FilterPopover
            activeCount={activeFilterCount}
            onClear={handleClearFilters}
            onApply={() => setCurrentPage(1)}
          >
            <div className="field-stack">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Palavra-chave
              </span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  className="pl-9 h-9 text-sm"
                  placeholder="Nome do produto ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setCurrentPage(1)
                    }
                  }}
                />
              </div>
            </div>

            <div className="field-stack">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Categoria
              </span>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Todas as categorias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas as categorias</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </FilterPopover>

          {/* Atualização */}
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            onClick={() => void fetchData()}
            disabled={loading}
          >
            <RotateCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </Button>
        </div>
      </section>

      {/* 2. Cards de Indicadores (KPIs em 4 colunas) */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Card 1: Total Produtos */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total de produtos
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {stats.totalProducts}
            </span>
            <Package className="size-5 text-muted-foreground/60" />
          </CardContent>
        </Card>

        {/* Card 2: Categorias */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Categorias ativas
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {stats.totalCategories}
            </span>
            <Tag className="size-5 text-muted-foreground/60" />
          </CardContent>
        </Card>

        {/* Card 3: Unidades */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Unidades de medida
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {stats.totalUnits}
            </span>
            <Ruler className="size-5 text-muted-foreground/60" />
          </CardContent>
        </Card>

        {/* Card 4: Descrições completas */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Itens detalhados
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {stats.withDescription}
            </span>
            <span className="text-xs text-muted-foreground">com especificação</span>
          </CardContent>
        </Card>
      </section>

      {/* 3. Navegação por Abas do Catálogo */}
      <Tabs defaultValue="products" className="space-y-4">
        <TabsList className="bg-muted/60 p-1">
          <TabsTrigger value="products" className="text-xs font-medium">
            Produtos ({products.length})
          </TabsTrigger>
          <TabsTrigger value="categories" className="text-xs font-medium">
            Categorias ({categories.length})
          </TabsTrigger>
          <TabsTrigger value="units" className="text-xs font-medium">
            Unidades de Medida ({units.length})
          </TabsTrigger>
        </TabsList>

        {/* Aba 1: Produtos */}
        <TabsContent value="products">
          <Card className="app-section-card overflow-hidden">
            {loading ? (
              <div className="py-16 text-center text-sm text-muted-foreground">
                Carregando catálogo de produtos...
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 p-8 text-center">
                <Package className="size-12 text-muted-foreground/50" />
                <div className="space-y-1">
                  <p className="font-semibold text-foreground">Nenhum produto encontrado</p>
                  <p className="text-sm text-muted-foreground">
                    {activeFilterCount > 0
                      ? 'Nenhum resultado corresponde aos filtros aplicados.'
                      : 'Cadastre os primeiros produtos para facilitar a seleção nos pedidos de compra.'}
                  </p>
                </div>
                {activeFilterCount > 0 ? (
                  <Button variant="outline" size="sm" onClick={handleClearFilters} className="mt-2">
                    Limpar filtros
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      resetForm()
                      setIsProductOpen(true)
                    }}
                    size="sm"
                    className="mt-2"
                  >
                    <Plus className="size-4 mr-1.5" />
                    Novo produto
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="min-w-[260px] text-xs font-semibold uppercase tracking-wider">
                        Produto / Descrição
                      </TableHead>
                      <TableHead className="w-[180px] text-xs font-semibold uppercase tracking-wider">
                        Categoria
                      </TableHead>
                      <TableHead className="w-[120px] text-xs font-semibold uppercase tracking-wider">
                        Unidade
                      </TableHead>
                      <TableHead className="w-[120px] text-right text-xs font-semibold uppercase tracking-wider">
                        Ações
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedProducts.map((p) => (
                      <TableRow key={p.id} className="transition-colors">
                        {/* Produto / Descrição */}
                        <TableCell>
                          <div className="space-y-0.5">
                            <p className="font-semibold text-foreground text-sm">
                              {p.name}
                            </p>
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {p.description || 'Sem especificações adicionais'}
                            </p>
                          </div>
                        </TableCell>

                        {/* Categoria */}
                        <TableCell>
                          <span className="inline-flex items-center rounded-md border border-border/80 bg-muted/30 px-2 py-0.5 text-xs font-medium text-foreground">
                            {p.category?.name || 'Geral'}
                          </span>
                        </TableCell>

                        {/* Unidade */}
                        <TableCell>
                          <span className="inline-flex items-center rounded-full border border-border/70 bg-background px-2.5 py-0.5 text-xs font-bold font-mono">
                            {p.unit?.symbol || '-'}
                          </span>
                        </TableCell>

                        {/* Ações */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-muted-foreground hover:text-foreground"
                              title="Editar produto"
                              onClick={() => handleEdit(p)}
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                              title="Excluir produto"
                              onClick={() => {
                                setDeleteProductId(p.id)
                                setIsDeleteDialogOpen(true)
                              }}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Paginação Integrada */}
            {!loading && filteredProducts.length > 0 && (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-6 py-4 border-t bg-muted/10 text-xs text-muted-foreground">
                <div>
                  Exibindo <span className="font-semibold text-foreground">{paginatedProducts.length}</span> de{' '}
                  <span className="font-semibold text-foreground">{filteredProducts.length}</span> registros
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon-sm"
                    className="size-8"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="size-4" />
                  </Button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                    <Button
                      key={pageNum}
                      variant={pageNum === currentPage ? 'default' : 'outline'}
                      size="icon-sm"
                      className={`size-8 font-medium ${pageNum === currentPage ? 'pointer-events-none' : ''}`}
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  ))}

                  <Button
                    variant="outline"
                    size="icon-sm"
                    className="size-8"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Aba 2: Categorias */}
        <TabsContent value="categories">
          <Card className="app-section-card p-5 space-y-4">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-foreground">
                Categorias de Compras
              </h2>
              <p className="text-xs text-muted-foreground">
                Categorias cadastradas para classificar insumos e organizar compras.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {categories.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-lg border bg-muted/20 px-3.5 py-2.5"
                >
                  <div className="flex items-center gap-2">
                    <Tag className="size-3.5 text-primary" />
                    <span className="text-sm font-medium text-foreground">{c.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* Aba 3: Unidades */}
        <TabsContent value="units">
          <Card className="app-section-card p-5 space-y-4">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-foreground">
                Unidades de Medida
              </h2>
              <p className="text-xs text-muted-foreground">
                Padrões métricos e de contagem para requisições e cotações.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {units.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between rounded-lg border bg-muted/20 px-3.5 py-2.5"
                >
                  <span className="text-sm font-medium text-foreground">{u.name}</span>
                  <span className="rounded-full bg-background border px-2 py-0.5 text-xs font-mono font-bold text-muted-foreground">
                    {u.symbol}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal Centralizado de Cadastro/Edição de Produto */}
      <Dialog open={isProductOpen} onOpenChange={setIsProductOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Editar Produto' : 'Novo Produto'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveProduct} className="space-y-4 pt-2">
            <div className="field-stack">
              <Label htmlFor="product-name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Nome do Produto *
              </Label>
              <Input
                id="product-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Cadeira Ergonômica NR-17"
                required
                className="h-9 text-sm"
              />
            </div>

            <div className="field-stack">
              <Label htmlFor="product-desc" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Descrição / Especificação Técnica
              </Label>
              <Input
                id="product-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Regulagem de altura, braços 3D, cor preta"
                className="h-9 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="field-stack">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Categoria *
                </Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="field-stack">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Unidade *
                </Label>
                <Select value={unitId} onValueChange={setUnitId}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.symbol} - {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsProductOpen(false)}
                disabled={formLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={formLoading}>
                {formLoading ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar produto'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ConfirmDialog de Exclusão */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Excluir Produto"
        description="Tem certeza que deseja excluir este produto do catálogo? Caso haja requisições vinculadas, a integridade histórica será preservada."
        confirmText="Confirmar exclusão"
        variant="destructive"
        loading={deleteLoading}
        onConfirm={handleDeleteProduct}
      />
    </div>
  )
}
