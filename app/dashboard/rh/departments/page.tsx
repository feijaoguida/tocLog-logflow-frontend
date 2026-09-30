'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Building2,
  FolderTree,
  Loader2,
  Pencil,
  Plus,
  RotateCw,
  Search,
  Trash2,
  UserX,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { FilterPopover } from '@/components/ui/filter-popover'
import { TablePagination } from '@/components/ui/table-pagination'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'

interface Employee {
  id: string
  user: { name: string }
}

interface Branch {
  id: string
  name: string
}

interface Department {
  id: string
  name: string
  description: string | null
  active: boolean
  headManager: {
    id: string
    user: {
      name: string
    }
  } | null
  branch: {
    id: string
    name: string
  }
}

function getInitials(name?: string | null) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)

  // Filters State
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedBranchFilter, setSelectedBranchFilter] = useState('all')
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all')

  // Create/Edit State
  const [isOpen, setIsOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [headManagerId, setHeadManagerId] = useState('')
  const [branchId, setBranchId] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [submitLoading, setSubmitLoading] = useState(false)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const fetchData = async () => {
    try {
      setLoading(true)
      const [empRes, deptRes, branchRes] = await Promise.all([
        api.get('/employees'),
        api.get('/departments'),
        api.get('/branches'),
      ])
      setEmployees(empRes.data)
      setDepartments(deptRes.data)
      setBranches(branchRes.data)
    } catch (e) {
      console.error(e)
      toast.error(getApiErrorMessage(e, 'Erro ao carregar departamentos.'))
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
    setHeadManagerId('')
    setBranchId('')
    setIsActive(true)
    setEditingId(null)
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) resetForm()
  }

  const handleEdit = (dept: Department) => {
    setEditingId(dept.id)
    setName(dept.name)
    setDescription(dept.description || '')
    setHeadManagerId(dept.headManager?.id || '')
    setBranchId(dept.branch?.id || '')
    setIsActive(dept.active)
    setIsOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!headManagerId) {
      toast.error('Gestor é obrigatório.')
      return
    }
    if (!branchId) {
      toast.error('Filial é obrigatória.')
      return
    }

    setSubmitLoading(true)
    try {
      const payload = {
        name,
        description,
        branchId,
        headManagerId,
        active: isActive,
      }

      if (editingId) {
        await api.patch(`/departments/${editingId}`, payload)
        toast.success('Departamento atualizado com sucesso.')
      } else {
        await api.post('/departments', payload)
        toast.success('Departamento criado com sucesso.')
      }

      setIsOpen(false)
      resetForm()
      await fetchData()
    } catch (error) {
      console.error(error)
      toast.error(getApiErrorMessage(error, 'Erro ao salvar departamento.'))
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja inativar este departamento?')) return
    try {
      await api.delete(`/departments/${id}`)
      await fetchData()
      toast.success('Departamento inativado com sucesso.')
    } catch (error) {
      console.error(error)
      toast.error(getApiErrorMessage(error, 'Não foi possível inativar o departamento.'))
    }
  }

  const handleClearFilters = () => {
    setSearchTerm('')
    setSelectedBranchFilter('all')
    setSelectedStatusFilter('all')
    setCurrentPage(1)
  }

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (searchTerm.trim()) count += 1
    if (selectedBranchFilter !== 'all') count += 1
    if (selectedStatusFilter !== 'all') count += 1
    return count
  }, [searchTerm, selectedBranchFilter, selectedStatusFilter])

  // KPIs
  const stats = useMemo(() => {
    const total = departments.length
    const active = departments.filter((d) => d.active).length
    const inactive = departments.filter((d) => !d.active).length
    const unassignedManager = departments.filter((d) => !d.headManager).length
    return { total, active, inactive, unassignedManager }
  }, [departments])

  // Filtering & Pagination
  const filtered = useMemo(() => {
    return departments.filter((d) => {
      const matchesSearch =
        !searchTerm.trim() ||
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.branch?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.headManager?.user.name.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesBranch =
        selectedBranchFilter === 'all' || d.branch?.id === selectedBranchFilter

      const matchesStatus =
        selectedStatusFilter === 'all' ||
        (selectedStatusFilter === 'active' && d.active) ||
        (selectedStatusFilter === 'inactive' && !d.active)

      return matchesSearch && matchesBranch && matchesStatus
    })
  }, [departments, searchTerm, selectedBranchFilter, selectedStatusFilter])

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, currentPage, pageSize])

  return (
    <div className="app-page space-y-6">
      {/* 1. Cabeçalho Padronizado */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Departamentos
          </h1>
          <p className="text-sm text-muted-foreground">
            Organize as áreas da empresa, filiais e gestores responsáveis com encadeamento de aprovação.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => {
              resetForm()
              setIsOpen(true)
            }}
            size="sm"
            className="h-9 gap-1.5 font-semibold"
          >
            <Plus className="size-4" />
            <span>Novo departamento</span>
          </Button>

          {/* Menu Flutuante de Filtro */}
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
                  placeholder="Nome, filial ou gestor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') setCurrentPage(1)
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="field-stack">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Filial
                </span>
                <Select
                  value={selectedBranchFilter}
                  onValueChange={(val) => {
                    setSelectedBranchFilter(val)
                    setCurrentPage(1)
                  }}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Todas as filiais" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as filiais</SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="field-stack">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Status
                </span>
                <Select
                  value={selectedStatusFilter}
                  onValueChange={(val) => {
                    setSelectedStatusFilter(val)
                    setCurrentPage(1)
                  }}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Ativos</SelectItem>
                    <SelectItem value="inactive">Inativos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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

      {/* 2. Cards de Resumo (KPIs em 4 colunas) */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Card Total */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total de Áreas
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {stats.total}
            </span>
            <FolderTree className="size-5 text-muted-foreground/60" />
          </CardContent>
        </Card>

        {/* Card Ativos */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Ativos
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {stats.active}
            </span>
            <Building2 className="size-5 text-emerald-600 dark:text-emerald-400" />
          </CardContent>
        </Card>

        {/* Card Inativos */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Inativos
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-muted-foreground">
              {stats.inactive}
            </span>
            <span className="text-xs text-muted-foreground">Histórico</span>
          </CardContent>
        </Card>

        {/* Card Sem Gestor */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Sem Gestor
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2 flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-foreground">
                {stats.unassignedManager}
              </span>
              {stats.unassignedManager > 0 && (
                <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                  Ação necessária
                </span>
              )}
            </div>
            <UserX className="size-5 text-muted-foreground/60" />
          </CardContent>
        </Card>
      </section>

      {/* 3. Modal de Criação / Edição */}
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Editar Departamento' : 'Criar Departamento'}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados principais do departamento. O gestor é obrigatório para garantir o fluxo correto de aprovações.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 py-2">
            <div className="rounded-lg border border-border bg-card p-5 space-y-4 shadow-xs">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="branch">Filial *</Label>
                  <Select value={branchId} onValueChange={setBranchId}>
                    <SelectTrigger id="branch" className="w-full">
                      <SelectValue placeholder="Selecione a filial" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Recursos Humanos"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="desc">Descrição</Label>
                  <Input
                    id="desc"
                    placeholder="Contexto opcional do departamento"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="manager">Gestor *</Label>
                  <Select value={headManagerId} onValueChange={setHeadManagerId}>
                    <SelectTrigger id="manager" className="w-full">
                      <SelectValue placeholder="Selecione um gestor" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employee.user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {editingId && (
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="active">Status</Label>
                    <div className="flex min-h-10 items-center justify-between rounded-md border border-border bg-background px-3 py-2">
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium">
                          {isActive ? 'Ativo' : 'Inativo'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {isActive
                            ? 'Disponível para novos vínculos e operações.'
                            : 'Mantido apenas para consulta histórica.'}
                        </p>
                      </div>
                      <Switch
                        id="active"
                        checked={isActive}
                        onCheckedChange={setIsActive}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={submitLoading}>
                {submitLoading ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : null}
                {editingId ? 'Salvar alterações' : 'Criar departamento'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 4. Tabela de Departamentos Sem Scroll Horizontal */}
      <Card className="app-section-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/80 hover:bg-transparent">
                  <TableHead className="w-[80px] font-semibold text-foreground text-xs uppercase tracking-wider pl-6">
                    ID
                  </TableHead>
                  <TableHead className="min-w-[240px] font-semibold text-foreground text-xs uppercase tracking-wider">
                    Departamento
                  </TableHead>
                  <TableHead className="min-w-[180px] font-semibold text-foreground text-xs uppercase tracking-wider">
                    Filial
                  </TableHead>
                  <TableHead className="min-w-[200px] font-semibold text-foreground text-xs uppercase tracking-wider">
                    Gestor Responsável
                  </TableHead>
                  <TableHead className="w-[120px] font-semibold text-foreground text-xs uppercase tracking-wider">
                    Status
                  </TableHead>
                  <TableHead className="w-[100px] font-semibold text-foreground text-xs uppercase tracking-wider text-right pr-6">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      Nenhum departamento encontrado para os filtros selecionados.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginated.map((dept, index) => (
                    <TableRow
                      key={dept.id}
                      className="border-b border-border/60 hover:bg-muted/40 transition-colors"
                    >
                      <TableCell className="font-mono text-xs font-bold text-muted-foreground pl-6">
                        #{(currentPage - 1) * pageSize + index + 1}
                      </TableCell>

                      <TableCell className="font-medium text-foreground">
                        <div className="font-semibold text-sm">{dept.name}</div>
                        {dept.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {dept.description}
                          </p>
                        )}
                      </TableCell>

                      <TableCell className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="size-3.5 text-muted-foreground/60" />
                          <span>{dept.branch?.name || '-'}</span>
                        </div>
                      </TableCell>

                      <TableCell>
                        {dept.headManager?.user?.name ? (
                          <div className="flex items-center gap-2">
                            <span className="flex size-6 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                              {getInitials(dept.headManager.user.name)}
                            </span>
                            <span className="text-sm font-medium text-foreground">
                              {dept.headManager.user.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs italic text-muted-foreground">
                            Sem gestor definido
                          </span>
                        )}
                      </TableCell>

                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${
                            dept.active
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60'
                              : 'bg-muted text-muted-foreground border-border'
                          }`}
                        >
                          {dept.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </TableCell>

                      <TableCell className="text-right pr-6">
                        <div className="inline-flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="size-8 text-muted-foreground hover:text-foreground"
                            onClick={() => handleEdit(dept)}
                            title="Editar departamento"
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="size-8 text-destructive/80 hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(dept.id)}
                            disabled={!dept.active}
                            title="Inativar departamento"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            <div className="border-t border-border/70 px-4">
              <TablePagination
                page={currentPage}
                pageSize={pageSize}
                totalItems={filtered.length}
                onPageChange={setCurrentPage}
                onPageSizeChange={(newSize) => {
                  setPageSize(newSize)
                  setCurrentPage(1)
                }}
                pageSizeOptions={[5, 10, 20, 50]}
              />
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
