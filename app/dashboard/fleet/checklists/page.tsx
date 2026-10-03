'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  FileCheck,
  Plus,
  RotateCw,
  Search,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Eye,
  Play,
} from 'lucide-react'
import { toast } from 'sonner'

import { WorkspaceStateCard } from '@/components/layout/workspace-state-card'
import { useAuth } from '@/context/auth-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { FilterPopover } from '@/components/ui/filter-popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'
import type { Checklist } from '@/types/fleet'

type ChecklistRecord = Checklist & {
  vehicle: { id: string; plate: string; model: string }
  driver?: { user?: { name?: string | null } | null } | null
}

const TYPE_LABEL: Record<string, string> = {
  DELIVERY: 'Saída / Entrega',
  RECEIVEMENT: 'Retorno / Recebimento',
  MAINTENANCE_EXIT: 'Saída p/ manutenção',
  PERIODIC: 'Periódico',
  CORRECTIVE: 'Corretivo',
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  FINISHED: {
    label: 'Concluído',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60',
  },
  OPEN: {
    label: 'Em aberto',
    className: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900/60',
  },
}

export default function ChecklistsPage() {
  const { hasPermission } = useAuth()
  const canViewChecklists = hasPermission('fleet.checklists.view')
  const canExecuteChecklists = hasPermission('fleet.checklists.execute')

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [checklists, setChecklists] = useState<ChecklistRecord[]>([])

  // Filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [typeFilter, setTypeFilter] = useState('ALL')

  // Paginação
  const [page, setPage] = useState(1)
  const pageSize = 10

  useEffect(() => {
    if (!canViewChecklists) {
      setLoading(false)
      return
    }

    void loadChecklists()
  }, [canViewChecklists])

  async function loadChecklists(showLoadingState = true) {
    if (showLoadingState) {
      setLoading(true)
    } else {
      setRefreshing(true)
    }

    try {
      setLoadError(null)
      const { data } = await api.get<ChecklistRecord[]>('/fleet/checklists')
      setChecklists(data || [])
    } catch (error) {
      const message = getApiErrorMessage(error, 'Não foi possível carregar os checklists da frota.')
      setLoadError(message)
      setChecklists([])
      toast.error(message)
    } finally {
      if (showLoadingState) {
        setLoading(false)
      } else {
        setRefreshing(false)
      }
    }
  }

  // Filtragem
  const filteredChecklists = useMemo(() => {
    return checklists.filter((item) => {
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim()
        const matchPlate = item.vehicle?.plate?.toLowerCase().includes(query)
        const matchModel = item.vehicle?.model?.toLowerCase().includes(query)
        const matchDriver = item.driver?.user?.name?.toLowerCase().includes(query)
        if (!matchPlate && !matchModel && !matchDriver) return false
      }
      if (statusFilter !== 'ALL' && item.status !== statusFilter) {
        return false
      }
      if (typeFilter !== 'ALL' && item.type !== typeFilter) {
        return false
      }
      return true
    })
  }, [checklists, searchTerm, statusFilter, typeFilter])

  // Contagem de filtros ativos
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (searchTerm.trim()) count++
    if (statusFilter !== 'ALL') count++
    if (typeFilter !== 'ALL') count++
    return count
  }, [searchTerm, statusFilter, typeFilter])

  // Paginação
  const totalCount = filteredChecklists.length
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const paginatedChecklists = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredChecklists.slice(start, start + pageSize)
  }, [filteredChecklists, page, pageSize])

  // Ajusta página se filtro alterar quantidade
  useEffect(() => {
    if (page > totalPages) {
      setPage(1)
    }
  }, [page, totalPages])

  // Métricas para 4 KPIs
  const finishedCount = useMemo(() => checklists.filter((item) => item.status === 'FINISHED').length, [checklists])
  const openCount = useMemo(() => checklists.filter((item) => item.status === 'OPEN').length, [checklists])
  const deliveryCount = useMemo(() => checklists.filter((item) => item.type === 'DELIVERY').length, [checklists])
  const receivementCount = useMemo(() => checklists.filter((item) => item.type === 'RECEIVEMENT').length, [checklists])

  return (
    <div className="app-page space-y-6 p-4 md:p-6">
      {/* 1. Header padrão TocLog */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Checklists Operacionais
          </h1>
          <p className="text-sm text-muted-foreground">
            Histórico e execução de inspeções veiculares na saída, retorno e trânsito da frota.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canExecuteChecklists && (
            <Button asChild size="sm" className="h-9 gap-1.5 font-semibold">
              <Link href="/dashboard/fleet/checklists/new">
                <Plus className="size-4" />
                <span>+ Novo checklist</span>
              </Link>
            </Button>
          )}

          <FilterPopover
            activeCount={activeFilterCount}
            onClear={() => {
              setSearchTerm('')
              setStatusFilter('ALL')
              setTypeFilter('ALL')
              setPage(1)
            }}
            onApply={() => setPage(1)}
          >
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Busca
                </Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Placa, modelo ou motorista..."
                    className="h-9 pl-9 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Status
                </Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos os status</SelectItem>
                    <SelectItem value="OPEN">Em aberto</SelectItem>
                    <SelectItem value="FINISHED">Concluídos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Tipo de Inspeção
                </Label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Todos os tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos os tipos</SelectItem>
                    <SelectItem value="DELIVERY">Saída / Entrega</SelectItem>
                    <SelectItem value="RECEIVEMENT">Retorno / Recebimento</SelectItem>
                    <SelectItem value="MAINTENANCE_EXIT">Saída p/ Manutenção</SelectItem>
                    <SelectItem value="PERIODIC">Periódico</SelectItem>
                    <SelectItem value="CORRECTIVE">Corretivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </FilterPopover>

          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            onClick={() => void loadChecklists(false)}
            disabled={loading || refreshing}
          >
            <RotateCw className={`size-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </Button>

          <Button asChild variant="outline" size="sm" className="h-9">
            <Link href="/dashboard/fleet">Veículos</Link>
          </Button>
        </div>
      </section>

      {!canViewChecklists ? (
        <WorkspaceStateCard title="Acesso restrito">
          <p>Este perfil não pode visualizar o histórico de checklists da frota.</p>
        </WorkspaceStateCard>
      ) : (
        <>
          {loadError && (
            <WorkspaceStateCard
              title="Falha de leitura"
              tone="danger"
              actions={
                <Button variant="outline" onClick={() => void loadChecklists(false)} disabled={refreshing}>
                  {refreshing ? 'Atualizando...' : 'Tentar novamente'}
                </Button>
              }
            >
              <p>{loadError}</p>
            </WorkspaceStateCard>
          )}

          {/* 2. KPI Summary Cards em 4 colunas */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Card className="app-section-card p-4 transition-all hover:shadow-xs">
              <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Total de Inspeções
              </CardDescription>
              <CardTitle className="mt-1 text-3xl font-bold tracking-tight text-foreground">
                {checklists.length}
              </CardTitle>
              <div className="mt-1 text-xs text-muted-foreground">
                Registro histórico da frota
              </div>
            </Card>

            <Card className="app-section-card p-4 transition-all hover:shadow-xs">
              <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Concluídos
              </CardDescription>
              <CardTitle className="mt-1 text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                {finishedCount}
              </CardTitle>
              <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <CheckCircle2 className="size-3.5 text-emerald-500" />
                <span>Inspeções validadas</span>
              </div>
            </Card>

            <Card className="app-section-card p-4 transition-all hover:shadow-xs">
              <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Em Aberto
              </CardDescription>
              <CardTitle className="mt-1 text-3xl font-bold tracking-tight text-sky-600 dark:text-sky-400">
                {openCount}
              </CardTitle>
              <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="size-3.5 text-sky-500" />
                <span>Aguardando submissão</span>
              </div>
            </Card>

            <Card className="app-section-card p-4 transition-all hover:shadow-xs">
              <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Saídas vs Retornos
              </CardDescription>
              <CardTitle className="mt-1 text-3xl font-bold tracking-tight text-foreground">
                {deliveryCount} / {receivementCount}
              </CardTitle>
              <div className="mt-1 text-xs text-muted-foreground">
                {deliveryCount} saídas • {receivementCount} retornos
              </div>
            </Card>
          </div>

          {/* 3. Tabela Responsiva Sem Scroll Horizontal */}
          <Card className="app-section-card">
            <CardHeader className="gap-4 pb-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative w-full max-w-sm">
                  <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value)
                      setPage(1)
                    }}
                    placeholder="Buscar placa, modelo, condutor..."
                    className="h-9 pl-9 text-sm"
                  />
                </div>
                {activeFilterCount > 0 && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{activeFilterCount} filtro(s) ativo(s)</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => {
                        setSearchTerm('')
                        setStatusFilter('ALL')
                        setTypeFilter('ALL')
                        setPage(1)
                      }}
                    >
                      Limpar
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent>
              <div className="rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">Placa</TableHead>
                      <TableHead>Veículo / Modelo</TableHead>
                      <TableHead>Tipo de Inspeção</TableHead>
                      <TableHead>Responsável</TableHead>
                      <TableHead>Data de Início</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, index) => (
                        <TableRow key={index}>
                          <TableCell colSpan={7}>
                            <Skeleton className="h-9 w-full rounded-md" />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : paginatedChecklists.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-28 text-center text-muted-foreground">
                          Nenhum checklist encontrado com os filtros selecionados.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedChecklists.map((checklist) => {
                        const badgeInfo = STATUS_BADGE[checklist.status] || {
                          label: checklist.status,
                          className: 'bg-muted text-muted-foreground',
                        }

                        return (
                          <TableRow key={checklist.id}>
                            <TableCell className="font-semibold tracking-wide">
                              {checklist.vehicle.plate}
                            </TableCell>

                            <TableCell>
                              <div className="font-medium">{checklist.vehicle.model}</div>
                            </TableCell>

                            <TableCell>
                              <span className="text-sm font-medium">
                                {TYPE_LABEL[checklist.type] || checklist.type}
                              </span>
                            </TableCell>

                            <TableCell className="text-sm text-muted-foreground">
                              {checklist.driver?.user?.name || 'Não atribuído'}
                            </TableCell>

                            <TableCell>
                              <div className="text-sm">
                                {new Date(checklist.startedAt).toLocaleDateString('pt-BR')}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(checklist.startedAt).toLocaleTimeString('pt-BR', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </div>
                            </TableCell>

                            <TableCell>
                              <Badge className={`w-fit ${badgeInfo.className}`}>
                                {badgeInfo.label}
                              </Badge>
                            </TableCell>

                            <TableCell className="text-right">
                              {checklist.status === 'OPEN' && canExecuteChecklists ? (
                                <Button asChild size="sm" variant="default" className="h-8 gap-1">
                                  <Link href={`/dashboard/fleet/checklists/new?vehicleId=${checklist.vehicle.id}`}>
                                    <Play className="size-3.5" />
                                    <span>Continuar</span>
                                  </Link>
                                </Button>
                              ) : (
                                <Button asChild size="sm" variant="ghost" className="h-8 gap-1">
                                  <Link href={`/dashboard/fleet/${checklist.vehicle.id}`}>
                                    <Eye className="size-3.5" />
                                    <span>Veículo</span>
                                  </Link>
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* 4. Rodapé com Paginação Real */}
              <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                <div>
                  Exibindo {paginatedChecklists.length} de {totalCount} checklists
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Anterior
                  </Button>
                  <span className="text-xs">
                    Página {page} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
