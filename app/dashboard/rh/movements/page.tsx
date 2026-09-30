'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle2,
  DollarSign,
  History,
  Loader2,
  RotateCw,
  Search,
  Store,
  UserCheck,
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
import { FilterPopover } from '@/components/ui/filter-popover'
import { TablePagination } from '@/components/ui/table-pagination'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'

type MovementRecord = {
  id: string
  type: string
  prevValue?: string | null
  newValue?: string | null
  reason?: string | null
  createdAt: string
  employee?: {
    id: string
    user?: {
      name?: string
      email?: string
    }
  }
  author?: {
    id: string
    user?: {
      name?: string
    }
  }
}

const MOVEMENT_META: Record<
  string,
  { label: string; icon: typeof History; tone: string }
> = {
  SALARY: {
    label: 'Salário',
    icon: DollarSign,
    tone: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60',
  },
  DEPARTMENT: {
    label: 'Departamento',
    icon: Building2,
    tone: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/60',
  },
  BRANCH: {
    label: 'Filial',
    icon: Store,
    tone: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900/60',
  },
  ROLE: {
    label: 'Cargo / Função',
    icon: UserCheck,
    tone: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900/60',
  },
  MANAGER: {
    label: 'Gestor',
    icon: Users,
    tone: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60',
  },
  STATUS: {
    label: 'Status',
    icon: CheckCircle2,
    tone: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-800',
  },
  VACATION_REQUEST: {
    label: 'Solicitação de Férias',
    icon: Calendar,
    tone: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-900/60',
  },
  VACATION_UPDATE: {
    label: 'Edição de Férias',
    icon: Calendar,
    tone: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900/60',
  },
  VACATION_MANAGER_APPROVAL: {
    label: 'Aprovação Gestão',
    icon: CheckCircle2,
    tone: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60',
  },
  VACATION_MANAGER_REJECTION: {
    label: 'Reprovação Gestão',
    icon: History,
    tone: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60',
  },
  VACATION_HR_CONFIRMATION: {
    label: 'Confirmação RH',
    icon: CheckCircle2,
    tone: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-900/60',
  },
  VACATION_HR_REJECTION: {
    label: 'Reprovação RH',
    icon: History,
    tone: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60',
  },
  VACATION_HR_CANCELLATION: {
    label: 'Cancelamento RH',
    icon: History,
    tone: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900/60',
  },
  VACATION_DELETE: {
    label: 'Remoção de Férias',
    icon: History,
    tone: 'bg-stone-100 text-stone-700 border-stone-200 dark:bg-stone-900/40 dark:text-stone-300 dark:border-stone-800',
  },
}

function getMovementMeta(type: string) {
  return (
    MOVEMENT_META[type] || {
      label: type,
      icon: History,
      tone: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-800',
    }
  )
}

function getInitials(name?: string | null) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function EmployeeMovementsPage() {
  const [movements, setMovements] = useState<MovementRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const fetchMovements = async () => {
    try {
      setLoading(true)
      const { data } = await api.get('/movements')
      setMovements(data)
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, 'Não foi possível carregar as movimentações do colaborador.'),
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchMovements()
  }, [])

  const availableTypes = useMemo(
    () => Array.from(new Set(movements.map((movement) => movement.type))).sort(),
    [movements],
  )

  const filteredMovements = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    return movements.filter((movement) => {
      const employeeName = movement.employee?.user?.name?.toLowerCase() || ''
      const authorName = movement.author?.user?.name?.toLowerCase() || ''
      const reason = movement.reason?.toLowerCase() || ''
      const prevValue = movement.prevValue?.toLowerCase() || ''
      const newValue = movement.newValue?.toLowerCase() || ''

      const matchesSearch =
        normalizedSearch.length === 0 ||
        employeeName.includes(normalizedSearch) ||
        authorName.includes(normalizedSearch) ||
        reason.includes(normalizedSearch) ||
        prevValue.includes(normalizedSearch) ||
        newValue.includes(normalizedSearch)

      const matchesType = typeFilter === 'all' || movement.type === typeFilter

      return matchesSearch && matchesType
    })
  }, [movements, searchTerm, typeFilter])

  const paginatedMovements = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredMovements.slice(start, start + pageSize)
  }, [filteredMovements, currentPage, pageSize])

  const summary = useMemo(() => {
    const vacationEvents = movements.filter((m) => m.type.startsWith('VACATION_')).length
    const salaryEvents = movements.filter((m) => m.type === 'SALARY').length
    const structuralEvents = movements.filter(
      (m) => m.type === 'DEPARTMENT' || m.type === 'ROLE' || m.type === 'BRANCH' || m.type === 'MANAGER',
    ).length

    return {
      total: movements.length,
      vacationEvents,
      salaryEvents,
      structuralEvents,
    }
  }, [movements])

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (searchTerm.trim()) count += 1
    if (typeFilter !== 'all') count += 1
    return count
  }, [searchTerm, typeFilter])

  const handleClearFilters = () => {
    setSearchTerm('')
    setTypeFilter('all')
    setCurrentPage(1)
  }

  return (
    <div className="app-page space-y-6">
      {/* 1. Cabeçalho Padronizado */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Movimentação do Colaborador
          </h1>
          <p className="text-sm text-muted-foreground">
            Ledger único de transferências, alterações salariais, cargos, gestores e histórico de auditoria.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
                  placeholder="Colaborador, autor, motivo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') setCurrentPage(1)
                  }}
                />
              </div>
            </div>

            <div className="field-stack">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Tipo de movimentação
              </span>
              <Select
                value={typeFilter}
                onValueChange={(val) => {
                  setTypeFilter(val)
                  setCurrentPage(1)
                }}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  {availableTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {getMovementMeta(type).label}
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
            onClick={() => void fetchMovements()}
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
              Total Registrado
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {summary.total}
            </span>
            <History className="size-5 text-muted-foreground/60" />
          </CardContent>
        </Card>

        {/* Férias */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Eventos de Férias
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-teal-600 dark:text-teal-400">
              {summary.vacationEvents}
            </span>
            <Calendar className="size-5 text-teal-500/60" />
          </CardContent>
        </Card>

        {/* Salários */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Ajustes Salariais
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {summary.salaryEvents}
            </span>
            <DollarSign className="size-5 text-emerald-500/60" />
          </CardContent>
        </Card>

        {/* Cargo e Estrutura */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Cargo & Estrutura
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {summary.structuralEvents}
            </span>
            <Building2 className="size-5 text-muted-foreground/60" />
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
                  <TableHead className="w-[150px] font-semibold text-foreground text-xs uppercase tracking-wider pl-6">
                    Data / Hora
                  </TableHead>
                  <TableHead className="min-w-[220px] font-semibold text-foreground text-xs uppercase tracking-wider">
                    Colaborador
                  </TableHead>
                  <TableHead className="min-w-[180px] font-semibold text-foreground text-xs uppercase tracking-wider">
                    Tipo de Evento
                  </TableHead>
                  <TableHead className="min-w-[240px] font-semibold text-foreground text-xs uppercase tracking-wider">
                    Origem ➔ Destino
                  </TableHead>
                  <TableHead className="min-w-[200px] font-semibold text-foreground text-xs uppercase tracking-wider pr-6">
                    Justificativa / Motivo
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedMovements.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      Nenhuma movimentação encontrada para os filtros selecionados.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedMovements.map((movement) => {
                    const meta = getMovementMeta(movement.type)
                    const employeeName = movement.employee?.user?.name || 'Colaborador'
                    const authorName = movement.author?.user?.name || 'Sistema'
                    const createdAt = new Date(movement.createdAt)

                    return (
                      <TableRow
                        key={movement.id}
                        className="border-b border-border/60 hover:bg-muted/40 transition-colors"
                      >
                        <TableCell className="pl-6 text-xs text-muted-foreground whitespace-nowrap">
                          <span className="font-semibold text-foreground block">
                            {createdAt.toLocaleDateString('pt-BR')}
                          </span>
                          <span>
                            {createdAt.toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <span className="flex size-7 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground shrink-0">
                              {getInitials(employeeName)}
                            </span>
                            <div>
                              <span className="font-semibold text-sm text-foreground block">
                                {employeeName}
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                Por: {authorName}
                              </span>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${meta.tone}`}
                          >
                            {meta.label}
                          </span>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-muted-foreground max-w-[120px] truncate" title={movement.prevValue || 'Não informado'}>
                              {movement.prevValue || 'Não informado'}
                            </span>
                            <ArrowRight className="size-3 text-muted-foreground/60 shrink-0" />
                            <span className="font-semibold text-foreground max-w-[120px] truncate" title={movement.newValue || 'Não informado'}>
                              {movement.newValue || 'Não informado'}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="pr-6">
                          <p className="text-xs text-muted-foreground line-clamp-2 max-w-[280px]">
                            {movement.reason || 'Sem justificativa registrada.'}
                          </p>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>

            <div className="border-t border-border/70 px-4">
              <TablePagination
                page={currentPage}
                pageSize={pageSize}
                totalItems={filteredMovements.length}
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
