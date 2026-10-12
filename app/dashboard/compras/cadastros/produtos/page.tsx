'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  History,
  Calendar,
  AlertCircle,
  Loader2,
  Package,
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
import { FilterPopover } from '@/components/ui/filter-popover'
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

interface PriceHistoryItem {
  id: string
  position: number
  price: number
  orderNumber: string | null
  purchaseDate: string
}

interface Product {
  id: string
  name: string
  description: string | null
  category: Category
  unit: Unit
  priceHistories?: PriceHistoryItem[]
  suggestedEstimatedPrice?: number | null
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

  // Delete dialog produto
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Modal Histórico de Preços
  const [isPriceHistoryOpen, setIsPriceHistoryOpen] = useState(false)
  const [selectedProductForHistory, setSelectedProductForHistory] = useState<Product | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)

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

      setProducts(prodRes.data || [])
      setCategories(catRes.data || [])
      setUnits(unitRes.data || [])
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
    setCategoryId(p.category?.id || '')
    setUnitId(p.unit?.id || '')
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

  const openPriceHistory = async (product: Product) => {
    setSelectedProductForHistory(product)
    setIsPriceHistoryOpen(true)
    try {
      setHistoryLoading(true)
      const res = await api.get(`/products/${product.id}/price-history`)
      if (res.data) {
        setSelectedProductForHistory((prev) =>
          prev ? { ...prev, priceHistories: res.data } : null,
        )
      }
    } catch {
      // Mantém os dados locais se falhar
    } finally {
      setHistoryLoading(false)
    }
  }

  // Filtragem
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()))
      const matchesCategory =
        categoryFilter === 'ALL' || (p.category && p.category.id === categoryFilter)
      return matchesSearch && matchesCategory
    })
  }, [products, searchTerm, categoryFilter])

  // Paginação
  const totalPages = Math.ceil(filteredProducts.length / pageSize) || 1
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredProducts.slice(start, start + pageSize)
  }, [filteredProducts, currentPage])

  // Contadores para os filtros
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    products.forEach((p) => {
      if (p.category?.id) {
        counts[p.category.id] = (counts[p.category.id] || 0) + 1
      }
    })
    return counts
  }, [products])

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Catálogo de Produtos
            </h1>
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              {filteredProducts.length} {filteredProducts.length === 1 ? 'produto' : 'produtos'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Cadastro de itens de compras com histórico circular dos 3 últimos preços de compra (Posições 1, 2 e 3).
          </p>
        </div>

        <Button
          size="sm"
          className="h-8 gap-1.5 font-semibold"
          onClick={() => {
            resetForm()
            setIsProductOpen(true)
          }}
        >
          <Plus className="size-3.5" />
          <span>Novo Produto</span>
        </Button>
      </div>

      {/* Barra de Filtros e Busca */}
      <Card className="app-section-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou especificação..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
              className="h-9 pl-9 text-xs"
            />
          </div>

          <div className="w-56">
            <Select
              value={categoryFilter}
              onValueChange={(val) => {
                setCategoryFilter(val)
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Todas as categorias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas as categorias ({products.length})</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} ({categoryCounts[c.id] || 0})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground"
            onClick={fetchData}
            title="Atualizar lista"
          >
            <RotateCw className="size-3.5" />
          </Button>
        </div>
      </Card>

      {/* Tabela de Produtos */}
      <Card className="app-section-card overflow-hidden">
        {loading ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : paginatedProducts.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Package className="mx-auto size-10 text-muted-foreground/60" />
            <h3 className="text-sm font-semibold text-foreground">Nenhum produto encontrado</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Cadastre produtos para compor as requisições de compras e acompanhar a evolução dos preços.
            </p>
            <Button
              size="sm"
              className="mt-2"
              onClick={() => {
                resetForm()
                setIsProductOpen(true)
              }}
            >
              Cadastrar Primeiro Produto
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Produto / Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="w-[100px]">Unidade</TableHead>
                <TableHead className="w-[220px]">Último Preço / Histórico</TableHead>
                <TableHead className="w-[100px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedProducts.map((p) => {
                const historyCount = p.priceHistories?.length || 0

                return (
                  <TableRow key={p.id} className="hover:bg-muted/40 transition-colors">
                    {/* Nome e Descrição */}
                    <TableCell>
                      <div className="space-y-0.5">
                        <span className="font-semibold text-foreground text-xs block">
                          {p.name}
                        </span>
                        {p.description && (
                          <span className="text-[11px] text-muted-foreground line-clamp-1">
                            {p.description}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Categoria */}
                    <TableCell>
                      <span className="inline-flex items-center gap-1 rounded bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground">
                        <Tag className="size-3" />
                        {p.category?.name || 'Geral'}
                      </span>
                    </TableCell>

                    {/* Unidade */}
                    <TableCell>
                      <span className="inline-flex items-center rounded-md bg-primary/10 border border-primary/20 px-2 py-0.5 text-xs font-mono font-bold text-primary">
                        {p.unit?.symbol || 'UN'}
                      </span>
                    </TableCell>

                    {/* Último Preço / Histórico Circular */}
                    <TableCell>
                      <div className="space-y-1">
                        {p.suggestedEstimatedPrice != null ? (
                          <span className="font-semibold text-foreground text-xs font-mono block">
                            R${' '}
                            {Number(p.suggestedEstimatedPrice).toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground italic block">
                            Sem compra registrada
                          </span>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-1.5 text-[11px] text-primary hover:text-primary-strong gap-1 -ml-1 font-semibold"
                          onClick={() => openPriceHistory(p)}
                        >
                          <History className="size-3 text-primary" />
                          <span>
                            {historyCount > 0
                              ? `3 Preços (${historyCount} reg.)`
                              : 'Consultar 3 Preços'}
                          </span>
                        </Button>
                      </div>
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
                          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
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
                )
              })}
            </TableBody>
          </Table>
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t p-4 text-xs text-muted-foreground">
            <span>
              Mostrando {Math.min((currentPage - 1) * pageSize + 1, filteredProducts.length)} a{' '}
              {Math.min(currentPage * pageSize, filteredProducts.length)} de{' '}
              {filteredProducts.length} produtos
            </span>

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

      {/* Modal Criar/Editar Produto */}
      <Dialog open={isProductOpen} onOpenChange={setIsProductOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <form onSubmit={handleSaveProduct}>
            <DialogHeader>
              <DialogTitle>
                {editingId ? 'Editar Produto' : 'Cadastrar Novo Produto'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4 text-xs">
              <div className="space-y-1.5">
                <Label htmlFor="prodName" className="text-xs font-semibold">
                  Nome do Produto *
                </Label>
                <Input
                  id="prodName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Cadeira Ergonômica NR17, Toner HP 105A"
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Categoria *</Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Selecione" />
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
                  <Label className="text-xs font-semibold">Unidade de Medida *</Label>
                  <Select value={unitId} onValueChange={setUnitId}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map((u) => (
                        <SelectItem key={u.id} value={u.id} className="text-xs">
                          {u.name} ({u.symbol})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prodDesc" className="text-xs font-semibold">
                  Especificação Técnica / Observação
                </Label>
                <Input
                  id="prodDesc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detalhes, marca recomendada, voltagem ou dimensões"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsProductOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={formLoading}>
                {formLoading ? <Loader2 className="size-3.5 animate-spin" /> : 'Salvar Produto'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Histórico dos 3 Preços */}
      <Dialog open={isPriceHistoryOpen} onOpenChange={setIsPriceHistoryOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <History className="size-4 text-primary" />
              <span>Histórico de Compras · 3 Preços</span>
            </DialogTitle>
          </DialogHeader>

          {selectedProductForHistory && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg border bg-muted/20 p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-foreground">
                    {selectedProductForHistory.name}
                  </span>
                  <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                    {selectedProductForHistory.unit?.symbol || 'UN'}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground block">
                  Categoria: {selectedProductForHistory.category?.name || 'Geral'}
                </span>
              </div>

              {/* Slots Posicionais P1, P2, P3 */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Buffer Circular (Ordem FIFO)
                  </span>
                  {historyLoading && <Loader2 className="size-3 animate-spin text-primary" />}
                </div>

                {[1, 2, 3].map((pos) => {
                  const entry = selectedProductForHistory.priceHistories?.find(
                    (p) => p.position === pos,
                  )
                  const slotLabel =
                    pos === 1
                      ? 'P1 - Última Compra (Preço Sugerido)'
                      : pos === 2
                      ? 'P2 - Penúltima Compra'
                      : 'P3 - Antepenúltima Compra'
                  const badgeColor =
                    pos === 1
                      ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30'
                      : pos === 2
                      ? 'bg-blue-500/15 text-blue-700 border-blue-500/30'
                      : 'bg-muted text-muted-foreground border-border'

                  return (
                    <div
                      key={pos}
                      className="flex items-center justify-between rounded-lg border bg-card p-3 shadow-2xs"
                    >
                      <div className="space-y-1">
                        <span
                          className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold border ${badgeColor}`}
                        >
                          {slotLabel}
                        </span>
                        {entry ? (
                          <div className="flex items-center gap-3 text-xs text-muted-foreground pt-0.5">
                            <span className="flex items-center gap-1">
                              <Calendar className="size-3" />
                              {new Date(entry.purchaseDate).toLocaleDateString('pt-BR')}
                            </span>
                            {entry.orderNumber && (
                              <span className="font-mono font-medium text-foreground">
                                OC #{entry.orderNumber}
                              </span>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">
                            Slot vago (nenhuma compra anterior registrada)
                          </p>
                        )}
                      </div>

                      <div className="text-right">
                        {entry ? (
                          <span className="font-mono text-sm font-bold text-foreground">
                            R${' '}
                            {Number(entry.price).toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground/60">--</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="rounded border border-border/60 bg-muted/10 p-2.5 text-[11px] text-muted-foreground flex items-start gap-2">
                <AlertCircle className="size-3.5 text-primary mt-0.5 shrink-0" />
                <span>
                  A cada nova Ordem de Compra confirmada pelo comprador, o sistema rotaciona os valores automaticamente: o preço atual se torna P1 e o P3 mais antigo é descartado.
                </span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsPriceHistoryOpen(false)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de Exclusão */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Excluir Produto"
        description="Tem certeza que deseja excluir este produto do catálogo? O histórico de compras também será removido."
        onConfirm={handleDeleteProduct}
        loading={deleteLoading}
        confirmText="Excluir Produto"
        variant="destructive"
      />
    </div>
  )
}
