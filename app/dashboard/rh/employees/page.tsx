'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  CalendarClock,
  Eye,
  Loader2,
  Pencil,
  Plus,
  RotateCw,
  Search,
  Trash2,
  UserCheck,
  UserX,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { FilterPopover } from '@/components/ui/filter-popover'
import { TablePagination } from '@/components/ui/table-pagination'
import { formatCPF } from '@/components/employee-form'
import { useAuth } from '@/context/auth-context'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'

interface Employee {
  id: string
  cpf: string
  legacyRole: string | null
  status: string
  branchId: string | null
  departmentId: string | null
  directManagerId: string | null
  avatarUrl: string | null
  admissionDate: string | null
  currentSalary: number | null
  user: {
    id: string
    name: string
    email: string
  }
  role?: {
    id: string
    name: string
  } | null
  department?: {
    name: string
  } | null
  branch?: {
    name: string
  } | null
}

function getInitials(name?: string | null) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function getEmployeeStatusBadgeStyle(status: string) {
  switch (status) {
    case 'ACTIVE':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60'
    case 'VACATION':
    case 'AWAY':
    case 'SUSPENDED':
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60'
    case 'INACTIVE':
    default:
      return 'bg-muted text-muted-foreground border-border'
  }
}

function getEmployeeStatusLabel(status: string) {
  switch (status) {
    case 'ACTIVE':
      return 'Ativo'
    case 'VACATION':
      return 'Férias'
    case 'AWAY':
      return 'Afastado'
    case 'SUSPENDED':
      return 'Suspenso'
    case 'INACTIVE':
      return 'Inativo'
    default:
      return status
  }
}

export default function EmployeesPage() {
  const router = useRouter()
  const { hasPermission } = useAuth()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)

  // Filters State
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const canCreate = hasPermission('rh.employees.create')
  const canEdit = hasPermission('rh.employees.edit')
  const canDelete = hasPermission('rh.employees.delete')

  const loadData = async () => {
    try {
      setLoading(true)
      const empRes = await api.get('/employees')
      setEmployees(empRes.data)
    } catch (error) {
      console.error('Erro ao carregar colaboradores:', error)
      toast.error(getApiErrorMessage(error, 'Erro ao carregar funcionários.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este funcionário?')) return
    try {
      await api.delete(`/employees/${id}`)
      toast.success('Funcionário excluído com sucesso.')
      void loadData()
    } catch (e) {
      toast.error(getApiErrorMessage(e, 'Erro ao excluir funcionário.'))
    }
  }

  const handleClearFilters = () => {
    setSearchQuery('')
    setStatusFilter('ALL')
    setCurrentPage(1)
  }

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (searchQuery.trim()) count += 1
    if (statusFilter !== 'ALL') count += 1
    return count
  }, [searchQuery, statusFilter])

  // KPIs
  const stats = useMemo(() => {
    const total = employees.length
    const active = employees.filter((e) => e.status === 'ACTIVE').length
    const onLeave = employees.filter(
      (e) => e.status === 'VACATION' || e.status === 'AWAY' || e.status === 'SUSPENDED',
    ).length
    const inactive = employees.filter((e) => e.status === 'INACTIVE').length
    return { total, active, onLeave, inactive }
  }, [employees])

  // Filtered & Paginated
  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    const cleanCpfQuery = searchQuery.replace(/\D/g, '')

    return employees.filter((e) => {
      const matchesSearch =
        !q ||
        e.user?.name.toLowerCase().includes(q) ||
        e.user?.email?.toLowerCase().includes(q) ||
        (cleanCpfQuery && e.cpf?.includes(cleanCpfQuery)) ||
        e.legacyRole?.toLowerCase().includes(q) ||
        e.role?.name.toLowerCase().includes(q) ||
        e.department?.name?.toLowerCase().includes(q)

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && e.status === 'ACTIVE') ||
        (statusFilter === 'LEAVE' &&
          (e.status === 'VACATION' || e.status === 'AWAY' || e.status === 'SUSPENDED')) ||
        (statusFilter === 'INACTIVE' && e.status === 'INACTIVE')

      return matchesSearch && matchesStatus
    })
  }, [employees, searchQuery, statusFilter])

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
            Funcionários
          </h1>
          <p className="text-sm text-muted-foreground">
            Gerencie a base de colaboradores, cargos, vínculos departamentais e contratos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canCreate && (
            <Button asChild size="sm" className="h-9 gap-1.5 font-semibold">
              <Link href="/dashboard/rh/employees/new">
                <Plus className="size-4" />
                <span>Novo colaborador</span>
              </Link>
            </Button>
          )}

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
                  placeholder="Nome, e-mail, CPF ou cargo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') setCurrentPage(1)
                  }}
                />
              </div>
            </div>

            <div className="field-stack">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Situação / Status
              </span>
              <Select
                value={statusFilter}
                onValueChange={(val) => {
                  setStatusFilter(val)
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Todas as situações" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas as situações</SelectItem>
                  <SelectItem value="ACTIVE">Ativos</SelectItem>
                  <SelectItem value="LEAVE">Em férias / Afastados</SelectItem>
                  <SelectItem value="INACTIVE">Inativos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </FilterPopover>

          {/* Atualização */}
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            onClick={() => void loadData()}
            disabled={loading}
          >
            <RotateCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </Button>
        </div>
      </section>

      {/* 2. Cards de Resumo (KPIs em 4 colunas) */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Total */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Geral
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {stats.total}
            </span>
            <Users className="size-5 text-muted-foreground/60" />
          </CardContent>
        </Card>

        {/* Ativos */}
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
            <UserCheck className="size-5 text-emerald-600 dark:text-emerald-400" />
          </CardContent>
        </Card>

        {/* Férias / Afastados */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Férias / Afastados
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
              {stats.onLeave}
            </span>
            <CalendarClock className="size-5 text-amber-500/60" />
          </CardContent>
        </Card>

        {/* Inativos */}
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
            <UserX className="size-5 text-muted-foreground/60" />
          </CardContent>
        </Card>
      </section>

      {/* 3. Tabela Sem Scroll Horizontal */}
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
                  <TableHead className="min-w-[260px] font-semibold text-foreground text-xs uppercase tracking-wider">
                    Colaborador
                  </TableHead>
                  <TableHead className="min-w-[200px] font-semibold text-foreground text-xs uppercase tracking-wider">
                    Função & Departamento
                  </TableHead>
                  <TableHead className="min-w-[200px] font-semibold text-foreground text-xs uppercase tracking-wider">
                    Contato / E-mail
                  </TableHead>
                  <TableHead className="w-[120px] font-semibold text-foreground text-xs uppercase tracking-wider">
                    Status
                  </TableHead>
                  <TableHead className="w-[110px] font-semibold text-foreground text-xs uppercase tracking-wider text-right pr-6">
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
                      {searchQuery
                        ? 'Nenhum resultado encontrado para a busca.'
                        : 'Nenhum funcionário cadastrado.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginated.map((emp, index) => (
                    <TableRow
                      key={emp.id}
                      className="border-b border-border/60 hover:bg-muted/40 transition-colors"
                    >
                      <TableCell className="font-mono text-xs font-bold text-muted-foreground pl-6">
                        #{(currentPage - 1) * pageSize + index + 1}
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="size-9 border border-border/50">
                            <AvatarImage src={emp.avatarUrl || undefined} />
                            <AvatarFallback className="text-xs font-semibold">
                              {getInitials(emp.user?.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <Link
                              href={`/dashboard/rh/employees/${emp.id}`}
                              className="font-semibold text-sm text-foreground hover:underline transition-all"
                            >
                              {emp.user?.name}
                            </Link>
                            <p className="text-xs text-muted-foreground">
                              {emp.cpf ? formatCPF(emp.cpf) : 'Sem CPF'}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="space-y-0.5">
                          <span className="font-medium text-sm text-foreground block">
                            {emp.role?.name || emp.legacyRole || 'Sem cargo definido'}
                          </span>
                          <span className="text-xs text-muted-foreground block">
                            {emp.department?.name || 'Sem departamento'}{' '}
                            {emp.branch?.name ? `• ${emp.branch.name}` : ''}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="text-sm text-muted-foreground">
                        {emp.user?.email || 'Sem e-mail'}
                      </TableCell>

                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${getEmployeeStatusBadgeStyle(
                            emp.status,
                          )}`}
                        >
                          {getEmployeeStatusLabel(emp.status)}
                        </span>
                      </TableCell>

                      <TableCell className="text-right pr-6">
                        <div className="inline-flex items-center justify-end gap-1">
                          <Button
                            asChild
                            variant="ghost"
                            size="icon-sm"
                            className="size-8 text-muted-foreground hover:text-foreground"
                            title="Ver perfil"
                          >
                            <Link href={`/dashboard/rh/employees/${emp.id}`}>
                              <Eye className="size-4" />
                            </Link>
                          </Button>

                          {canEdit && (
                            <Button
                              asChild
                              variant="ghost"
                              size="icon-sm"
                              className="size-8 text-muted-foreground hover:text-foreground"
                              title="Editar colaborador"
                            >
                              <Link href={`/dashboard/rh/employees/${emp.id}/edit`}>
                                <Pencil className="size-4" />
                              </Link>
                            </Button>
                          )}

                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="size-8 text-destructive/80 hover:text-destructive hover:bg-destructive/10"
                              onClick={() => void handleDelete(emp.id)}
                              title="Excluir colaborador"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          )}
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
