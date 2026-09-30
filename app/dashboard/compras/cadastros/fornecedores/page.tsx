'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Mail,
  Pencil,
  Phone,
  Plus,
  RotateCw,
  Search,
  Trash2,
  Truck,
  Users,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'

interface Supplier {
  id: string
  name: string
  cnpj: string
  email: string | null
  phone: string | null
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Modal Form
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formLoading, setFormLoading] = useState(false)

  const [name, setName] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')

  // Delete dialog
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Paginação
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  const fetchSuppliers = async () => {
    try {
      setLoading(true)
      const { data } = await api.get('/suppliers')
      setSuppliers(data)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Erro ao carregar fornecedores.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchSuppliers()
  }, [])

  const resetForm = () => {
    setName('')
    setCnpj('')
    setEmail('')
    setPhone('')
    setEditingId(null)
  }

  const handleEdit = (s: Supplier) => {
    setEditingId(s.id)
    setName(s.name)
    setCnpj(s.cnpj)
    setEmail(s.email || '')
    setPhone(s.phone || '')
    setIsFormOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Informe a razão social ou nome do fornecedor.')
      return
    }

    setFormLoading(true)
    try {
      const payload = {
        name: name.trim(),
        cnpj: cnpj.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
      }

      if (editingId) {
        await api.patch(`/suppliers/${editingId}`, payload)
        toast.success('Fornecedor atualizado com sucesso.')
      } else {
        await api.post('/suppliers', payload)
        toast.success('Fornecedor cadastrado com sucesso.')
      }

      setIsFormOpen(false)
      resetForm()
      await fetchSuppliers()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Erro ao salvar fornecedor.'))
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleteLoading(true)
    try {
      await api.delete(`/suppliers/${deleteId}`)
      toast.success('Fornecedor excluído com sucesso.')
      setIsDeleteDialogOpen(false)
      setDeleteId(null)
      await fetchSuppliers()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Erro ao excluir fornecedor.'))
    } finally {
      setDeleteLoading(false)
    }
  }

  const activeFilterCount = useMemo(() => {
    return searchTerm.trim() ? 1 : 0
  }, [searchTerm])

  function handleClearFilters() {
    setSearchTerm('')
    setCurrentPage(1)
  }

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      if (!searchTerm.trim()) return true
      const q = searchTerm.toLowerCase()
      const matchName = s.name.toLowerCase().includes(q)
      const matchCnpj = s.cnpj.toLowerCase().includes(q)
      const matchEmail = (s.email || '').toLowerCase().includes(q)
      const matchPhone = (s.phone || '').toLowerCase().includes(q)
      return matchName || matchCnpj || matchEmail || matchPhone
    })
  }, [suppliers, searchTerm])

  const totalPages = Math.ceil(filteredSuppliers.length / pageSize) || 1

  const paginatedSuppliers = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredSuppliers.slice(start, start + pageSize)
  }, [filteredSuppliers, currentPage, pageSize])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1)
    }
  }, [totalPages, currentPage])

  const stats = useMemo(() => {
    return {
      total: suppliers.length,
      withEmail: suppliers.filter((s) => Boolean(s.email)).length,
      withPhone: suppliers.filter((s) => Boolean(s.phone)).length,
      completeContact: suppliers.filter((s) => Boolean(s.email) && Boolean(s.phone)).length,
    }
  }, [suppliers])

  return (
    <div className="app-page space-y-6">
      {/* 1. Cabeçalho Padronizado */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Fornecedores
          </h1>
          <p className="text-sm text-muted-foreground">
            Gerencie a base de parceiros comerciais, contatos diretos e dados fiscais.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => {
              resetForm()
              setIsFormOpen(true)
            }}
            size="sm"
            className="h-9 gap-1.5 font-semibold"
          >
            <Plus className="size-4" />
            <span>Novo fornecedor</span>
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
                  placeholder="Nome, CNPJ, e-mail..."
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
          </FilterPopover>

          {/* Atualização */}
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            onClick={() => void fetchSuppliers()}
            disabled={loading}
          >
            <RotateCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </Button>
        </div>
      </section>

      {/* 2. Cards de Resumo (KPIs em 4 colunas) */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Card 1: Total */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total cadastrado
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {stats.total}
            </span>
            <Truck className="size-5 text-muted-foreground/60" />
          </CardContent>
        </Card>

        {/* Card 2: Com E-mail */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Com e-mail
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {stats.withEmail}
            </span>
            <Mail className="size-5 text-muted-foreground/60" />
          </CardContent>
        </Card>

        {/* Card 3: Com Telefone */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Com telefone
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {stats.withPhone}
            </span>
            <Phone className="size-5 text-muted-foreground/60" />
          </CardContent>
        </Card>

        {/* Card 4: Contato Completo */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Contato completo
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {stats.completeContact}
            </span>
            <Users className="size-5 text-muted-foreground/60" />
          </CardContent>
        </Card>
      </section>

      {/* 3. Tabela Responsiva Sem Scroll Horizontal */}
      <Card className="app-section-card overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            Carregando fornecedores...
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 p-8 text-center">
            <Truck className="size-12 text-muted-foreground/50" />
            <div className="space-y-1">
              <p className="font-semibold text-foreground">Nenhum fornecedor encontrado</p>
              <p className="text-sm text-muted-foreground">
                {activeFilterCount > 0
                  ? 'Nenhum resultado corresponde à busca.'
                  : 'Cadastre seus fornecedores para utilizá-los no fluxo de cotações e compras.'}
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
                  setIsFormOpen(true)
                }}
                size="sm"
                className="mt-2"
              >
                <Plus className="size-4 mr-1.5" />
                Novo fornecedor
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="min-w-[240px] text-xs font-semibold uppercase tracking-wider">
                    Fornecedor / Razão Social
                  </TableHead>
                  <TableHead className="w-[180px] text-xs font-semibold uppercase tracking-wider">
                    CNPJ / Documento
                  </TableHead>
                  <TableHead className="min-w-[220px] text-xs font-semibold uppercase tracking-wider">
                    Contato
                  </TableHead>
                  <TableHead className="w-[120px] text-right text-xs font-semibold uppercase tracking-wider">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedSuppliers.map((s) => (
                  <TableRow key={s.id} className="transition-colors">
                    {/* Fornecedor */}
                    <TableCell>
                      <div className="space-y-0.5">
                        <p className="font-semibold text-foreground text-sm">
                          {s.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Parceiro comercial
                        </p>
                      </div>
                    </TableCell>

                    {/* CNPJ */}
                    <TableCell>
                      <span className="font-mono text-xs bg-muted/60 px-2 py-1 rounded border text-foreground">
                        {s.cnpj || 'Não informado'}
                      </span>
                    </TableCell>

                    {/* Contato */}
                    <TableCell>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        {s.email && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="size-3.5 text-muted-foreground/70 shrink-0" />
                            <span className="truncate">{s.email}</span>
                          </div>
                        )}
                        {s.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="size-3.5 text-muted-foreground/70 shrink-0" />
                            <span>{s.phone}</span>
                          </div>
                        )}
                        {!s.email && !s.phone && (
                          <span className="italic">Sem contato informado</span>
                        )}
                      </div>
                    </TableCell>

                    {/* Ações */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-muted-foreground hover:text-foreground"
                          title="Editar fornecedor"
                          onClick={() => handleEdit(s)}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                          title="Excluir fornecedor"
                          onClick={() => {
                            setDeleteId(s.id)
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

        {/* 4. Rodapé com Paginação Integrada */}
        {!loading && filteredSuppliers.length > 0 && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-6 py-4 border-t bg-muted/10 text-xs text-muted-foreground">
            <div>
              Exibindo <span className="font-semibold text-foreground">{paginatedSuppliers.length}</span> de{' '}
              <span className="font-semibold text-foreground">{filteredSuppliers.length}</span> registros
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

      {/* Modal Centralizado de Cadastro/Edição */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Editar Fornecedor' : 'Novo Fornecedor'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="field-stack">
              <Label htmlFor="supplier-name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Razão Social / Nome Fantasia *
              </Label>
              <Input
                id="supplier-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Comercial de Alimentos Ltda"
                required
                className="h-9 text-sm"
              />
            </div>

            <div className="field-stack">
              <Label htmlFor="supplier-cnpj" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                CNPJ / CPF
              </Label>
              <Input
                id="supplier-cnpj"
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                placeholder="00.000.000/0000-00"
                className="h-9 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="field-stack">
                <Label htmlFor="supplier-email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  E-mail
                </Label>
                <Input
                  id="supplier-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contato@empresa.com"
                  className="h-9 text-sm"
                />
              </div>

              <div className="field-stack">
                <Label htmlFor="supplier-phone" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Telefone
                </Label>
                <Input
                  id="supplier-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="h-9 text-sm"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsFormOpen(false)}
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
                  'Salvar fornecedor'
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
        title="Excluir Fornecedor"
        description="Tem certeza que deseja remover este fornecedor da base? Essa ação não poderá ser desfeita caso não haja vínculos ativos."
        confirmText="Confirmar exclusão"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}
