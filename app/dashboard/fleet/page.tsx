'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  Car,
  FileText,
  Filter,
  Plus,
  RotateCw,
  Search,
  ShieldAlert,
  Truck,
  AlertTriangle,
  FileCheck,
  Ban,
  CheckCircle2,
} from 'lucide-react'
import { toast } from 'sonner'

import { WorkspaceStateCard } from '@/components/layout/workspace-state-card'
import { useAuth } from '@/context/auth-context'
import { FilterPopover } from '@/components/ui/filter-popover'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'
import { reportError } from '@/lib/error-reporter'

export interface FleetResourceItem {
  id: string
  origin: 'INTERNAL' | 'EXTERNAL'
  plate: string
  brand: string | null
  model: string | null
  year: number | null
  color: string | null
  category: string
  status: string
  currentKm: number
  branchName?: string
  driverName?: string
  partnerStatus?: string
  hasBlocks: boolean
  hasMaintenanceAlerts: boolean
  documentsCount: number
  finesCount: number
  createdAt: string
  updatedAt: string
}

export interface FleetResourcesResponse {
  items: FleetResourceItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  AVAILABLE: {
    label: 'Disponível',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60',
  },
  ATIVO: {
    label: 'Ativo',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60',
  },
  IN_USE: {
    label: 'Em uso',
    className: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900/60',
  },
  MAINTENANCE: {
    label: 'Em manutenção',
    className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60',
  },
  BLOCKED: {
    label: 'Bloqueado',
    className: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60',
  },
  PENDENTE_APROVACAO: {
    label: 'Pendente Aprovação',
    className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60',
  },
  SUSPENSO: {
    label: 'Suspenso',
    className: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60',
  },
}

export default function FleetPage() {
  const { hasPermission } = useAuth()
  const canViewVehicles = hasPermission('fleet.vehicles.view')
  const canManageVehicles = hasPermission('fleet.vehicles.manage')
  const canApproveExternal = hasPermission('external-fleet.vehicles.approve')

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [resources, setResources] = useState<FleetResourceItem[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [originFilter, setOriginFilter] = useState<'ALL' | 'INTERNAL' | 'EXTERNAL'>('ALL')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (searchTerm.trim()) count++
    if (originFilter !== 'ALL') count++
    if (statusFilter !== 'ALL') count++
    return count
  }, [searchTerm, originFilter, statusFilter])

  // Modal de Criação de Veículo Terceiro
  const [openExternalModal, setOpenExternalModal] = useState(false)
  const [submittingExternal, setSubmittingExternal] = useState(false)
  const [newTipo, setNewTipo] = useState('TRUCK')
  const [newPlaca, setNewPlaca] = useState('')
  const [newBrand, setNewBrand] = useState('')
  const [newModel, setNewModel] = useState('')
  const [newYear, setNewYear] = useState(new Date().getFullYear().toString())
  const [newColor, setNewColor] = useState('')
  const [newCapacidade, setNewCapacidade] = useState('15000')

  // Modal de Atualização de KM
  const [openKmModal, setOpenKmModal] = useState(false)
  const [selectedResource, setSelectedResource] = useState<FleetResourceItem | null>(null)
  const [newKmValue, setNewKmValue] = useState('')
  const [submittingKm, setSubmittingKm] = useState(false)

  useEffect(() => {
    if (!canViewVehicles) {
      setLoading(false)
      return
    }

    void loadResources()
  }, [canViewVehicles, originFilter, statusFilter, page])

  async function loadResources(showLoadingState = true) {
    if (showLoadingState) {
      setLoading(true)
    } else {
      setRefreshing(true)
    }

    try {
      setLoadError(null)
      const params = new URLSearchParams()
      if (originFilter !== 'ALL') params.append('origin', originFilter)
      if (statusFilter !== 'ALL') params.append('status', statusFilter)
      if (searchTerm.trim()) params.append('search', searchTerm.trim())
      params.append('page', page.toString())
      params.append('pageSize', '15')

      const { data } = await api.get<FleetResourcesResponse>(`/fleet/resources?${params.toString()}`)
      setResources(data.items || [])
      setTotalPages(data.totalPages || 1)
      setTotalCount(data.total || 0)
    } catch (error) {
      const message = getApiErrorMessage(error, 'Não foi possível carregar o catálogo conjunto da frota.')
      setLoadError(message)
      setResources([])
      toast.error(message)
      reportError(error, {
        module: 'FLEET',
        screen: '/dashboard/fleet',
        action: 'loadResources',
        errorMessage: message,
      })
    } finally {
      if (showLoadingState) {
        setLoading(false)
      } else {
        setRefreshing(false)
      }
    }
  }

  async function handleCreateExternal(e: React.FormEvent) {
    e.preventDefault()
    if (!newPlaca.trim()) {
      toast.error('Informe a placa do veículo.')
      return
    }

    setSubmittingExternal(true)
    try {
      await api.post('/fleet/resources/external', {
        tipo: newTipo,
        placa: newPlaca.trim().toUpperCase(),
        brand: newBrand.trim() || undefined,
        model: newModel.trim() || undefined,
        year: newYear ? parseInt(newYear, 10) : undefined,
        color: newColor.trim() || undefined,
        capacidadePeso: parseFloat(newCapacidade) || 0,
      })

      toast.success(
        canApproveExternal
          ? 'Veículo parceiro cadastrado e aprovado com sucesso!'
          : 'Veículo parceiro cadastrado com status PENDENTE DE APROVAÇÃO.',
      )
      setOpenExternalModal(false)
      setNewPlaca('')
      setNewBrand('')
      setNewModel('')
      setNewColor('')
      void loadResources(false)
    } catch (error) {
      const message = getApiErrorMessage(error, 'Falha ao cadastrar veículo parceiro.')
      toast.error(message)
      reportError(error, {
        module: 'FLEET',
        screen: '/dashboard/fleet',
        action: 'createExternalVehicle',
        errorMessage: message,
        requestPayload: {
          tipo: newTipo,
          placa: newPlaca,
          brand: newBrand,
          model: newModel,
          year: newYear,
        },
      })
    } finally {
      setSubmittingExternal(false)
    }
  }

  async function handleUpdateKm(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedResource) return
    const parsedKm = parseInt(newKmValue, 10)
    if (isNaN(parsedKm) || parsedKm < selectedResource.currentKm) {
      toast.error(`A quilometragem deve ser um número maior ou igual ao odômetro atual (${selectedResource.currentKm} km).`)
      return
    }

    setSubmittingKm(true)
    try {
      await api.patch(`/fleet/resources/${selectedResource.origin}/${selectedResource.id}/km`, {
        km: parsedKm,
      })
      toast.success('Odômetro atualizado com sucesso!')
      setOpenKmModal(false)
      setSelectedResource(null)
      void loadResources(false)
    } catch (error) {
      const message = getApiErrorMessage(error, 'Falha ao atualizar odômetro.')
      toast.error(message)
      reportError(error, {
        module: 'FLEET',
        screen: '/dashboard/fleet',
        action: 'updateKm',
        errorMessage: message,
        requestPayload: {
          resourceId: selectedResource?.id,
          origin: selectedResource?.origin,
          km: parsedKm,
        },
      })
    } finally {
      setSubmittingKm(false)
    }
  }

  // KPIs operacionais
  const internalCount = useMemo(() => resources.filter((r) => r.origin === 'INTERNAL').length, [resources])
  const externalCount = useMemo(() => resources.filter((r) => r.origin === 'EXTERNAL').length, [resources])
  const blockedCount = useMemo(() => resources.filter((r) => r.hasBlocks || r.status === 'BLOCKED' || r.status === 'SUSPENSO').length, [resources])
  const maintenanceCount = useMemo(() => resources.filter((r) => r.hasMaintenanceAlerts || r.status === 'MAINTENANCE').length, [resources])

  return (
    <div className="app-page space-y-6 p-4 md:p-6">
      {/* 1. Page Header padrão TocLog */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Gestão Operacional de Frotas
          </h1>
          <p className="text-sm text-muted-foreground">
            Visão conjunta e integrada de recursos próprios e parceiros (terceiros), documentos e manutenções.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canManageVehicles && (
            <Button
              size="sm"
              className="h-9 gap-1.5 font-semibold"
              onClick={() => setOpenExternalModal(true)}
            >
              <Plus className="size-4" />
              <span>+ Veículo Parceiro</span>
            </Button>
          )}

          <FilterPopover
            activeCount={activeFilterCount}
            onClear={() => {
              setSearchTerm('')
              setOriginFilter('ALL')
              setStatusFilter('ALL')
              setPage(1)
            }}
            onApply={() => {
              setPage(1)
              void loadResources(true)
            }}
          >
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Busca Textual
                </Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Placa, marca, modelo..."
                    className="h-9 pl-9 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Origem do Veículo
                </Label>
                <Select value={originFilter} onValueChange={(val: any) => setOriginFilter(val)}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Selecione a origem" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todas as origens</SelectItem>
                    <SelectItem value="INTERNAL">Frota Própria</SelectItem>
                    <SelectItem value="EXTERNAL">Terceiros / Parceiros</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Status Operacional
                </Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos os status</SelectItem>
                    <SelectItem value="AVAILABLE">Disponível</SelectItem>
                    <SelectItem value="ATIVO">Ativo</SelectItem>
                    <SelectItem value="IN_USE">Em uso</SelectItem>
                    <SelectItem value="MAINTENANCE">Em manutenção</SelectItem>
                    <SelectItem value="BLOCKED">Bloqueado</SelectItem>
                    <SelectItem value="PENDENTE_APROVACAO">Pendente Aprovação</SelectItem>
                    <SelectItem value="SUSPENSO">Suspenso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </FilterPopover>

          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            onClick={() => void loadResources(false)}
            disabled={loading || refreshing}
          >
            <RotateCw className={`size-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </Button>

          <Button asChild variant="outline" size="sm" className="h-9">
            <Link href="/dashboard/fleet/maintenance">Manutenções</Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="h-9">
            <Link href="/dashboard/fleet/checklists">Checklists</Link>
          </Button>
        </div>
      </section>

      {!canViewVehicles ? (
        <WorkspaceStateCard title="Acesso restrito">
          <p>Seu perfil não possui permissão para visualizar o catálogo da frota.</p>
        </WorkspaceStateCard>
      ) : (
        <>
          {loadError && (
            <WorkspaceStateCard
              title="Falha ao carregar catálogo"
              tone="danger"
              actions={
                <Button variant="outline" onClick={() => void loadResources(false)} disabled={refreshing}>
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
                Total de Recursos
              </CardDescription>
              <CardTitle className="mt-1 text-3xl font-bold tracking-tight text-foreground">
                {totalCount}
              </CardTitle>
              <div className="mt-1 flex gap-2 text-xs text-muted-foreground">
                <span>{internalCount} próprios</span> • <span>{externalCount} parceiros</span>
              </div>
            </Card>

            <Card className="app-section-card p-4 transition-all hover:shadow-xs">
              <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Próprios Ativos
              </CardDescription>
              <CardTitle className="mt-1 text-3xl font-bold tracking-tight text-foreground">
                {internalCount}
              </CardTitle>
              <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                <Car className="size-3.5 text-sky-500" />
                <span>Frota interna da empresa</span>
              </div>
            </Card>

            <Card className="app-section-card p-4 transition-all hover:shadow-xs">
              <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Parceiros (Terceiros)
              </CardDescription>
              <CardTitle className="mt-1 text-3xl font-bold tracking-tight text-foreground">
                {externalCount}
              </CardTitle>
              <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                <Truck className="size-3.5 text-emerald-500" />
                <span>Elegíveis para alocação</span>
              </div>
            </Card>

            <Card className="app-section-card p-4 transition-all hover:shadow-xs">
              <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Bloqueios / Atenção
              </CardDescription>
              <CardTitle className="mt-1 text-3xl font-bold tracking-tight text-destructive">
                {blockedCount + maintenanceCount}
              </CardTitle>
              <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="size-3.5 text-amber-500" />
                <span>{blockedCount} bloqueados • {maintenanceCount} em manutenção</span>
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
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && void loadResources(true)}
                    placeholder="Buscar placa, modelo, marca..."
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
                        setOriginFilter('ALL')
                        setStatusFilter('ALL')
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
                      <TableHead>Veículo / Marca</TableHead>
                      <TableHead>Origem / Contexto</TableHead>
                      <TableHead>Odômetro</TableHead>
                      <TableHead>Status Operacional</TableHead>
                      <TableHead>Docs / Multas</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
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
                    ) : resources.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-28 text-center text-muted-foreground">
                          Nenhum veículo encontrado com os filtros selecionados.
                        </TableCell>
                      </TableRow>
                    ) : (
                      resources.map((res) => {
                        const badgeInfo = STATUS_BADGE[res.status] || {
                          label: res.status,
                          className: 'bg-muted text-muted-foreground',
                        }

                        return (
                          <TableRow key={`${res.origin}-${res.id}`}>
                            <TableCell className="font-semibold tracking-wide">
                              {res.plate}
                            </TableCell>

                            <TableCell>
                              <div className="font-medium">
                                {res.brand ? `${res.brand} ` : ''}
                                {res.model || 'Modelo não especificado'}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {res.year ? `${res.year} • ` : ''}
                                {res.color || 'Cor não inf.'} • {res.category}
                              </div>
                            </TableCell>

                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                {res.origin === 'INTERNAL' ? (
                                  <Badge variant="outline" className="text-xs font-normal border-sky-300 text-sky-700 bg-sky-50 dark:bg-sky-950/40 dark:text-sky-300">
                                    Próprio
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs font-normal border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300">
                                    Parceiro
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {res.origin === 'INTERNAL'
                                  ? res.branchName || 'Filial padrão'
                                  : res.driverName ? `Motorista: ${res.driverName}` : 'Sem motorista vinculado'}
                              </div>
                            </TableCell>

                            <TableCell>
                              <div className="text-sm font-medium">
                                {res.currentKm.toLocaleString('pt-BR')} km
                              </div>
                              {canManageVehicles && (
                                <button
                                  onClick={() => {
                                    setSelectedResource(res)
                                    setNewKmValue(res.currentKm.toString())
                                    setOpenKmModal(true)
                                  }}
                                  className="text-[11px] text-primary hover:underline"
                                >
                                  Atualizar KM
                                </button>
                              )}
                            </TableCell>

                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <Badge className={`w-fit ${badgeInfo.className}`}>
                                  {badgeInfo.label}
                                </Badge>
                                {res.hasBlocks && (
                                  <span className="flex items-center gap-1 text-[11px] font-medium text-destructive">
                                    <Ban className="size-3" /> Bloqueio ativo
                                  </span>
                                )}
                                {res.hasMaintenanceAlerts && (
                                  <span className="flex items-center gap-1 text-[11px] font-medium text-amber-600">
                                    <AlertTriangle className="size-3" /> Alerta manutenção
                                  </span>
                                )}
                              </div>
                            </TableCell>

                            <TableCell>
                              <div className="text-xs text-muted-foreground flex flex-col gap-0.5">
                                <span className="flex items-center gap-1">
                                  <FileCheck className="size-3 text-sky-600" /> {res.documentsCount} docs
                                </span>
                                <span className="flex items-center gap-1">
                                  <FileText className="size-3 text-amber-600" /> {res.finesCount} multas
                                </span>
                              </div>
                            </TableCell>

                            <TableCell className="text-right">
                              {res.origin === 'INTERNAL' ? (
                                <Button asChild variant="ghost" size="sm" className="h-8">
                                  <Link href={`/dashboard/fleet/${res.id}`}>Detalhes</Link>
                                </Button>
                              ) : (
                                <Button asChild variant="ghost" size="sm" className="h-8">
                                  <Link href={`/dashboard/fleet/${res.id}?origin=EXTERNAL`}>Detalhes</Link>
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

              {/* 4. Rodapé com Paginação */}
              <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                <div>
                  Exibindo {resources.length} de {totalCount} registros
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

      {/* Modal: Cadastro de Veículo Terceiro / Parceiro */}
      <Dialog open={openExternalModal} onOpenChange={setOpenExternalModal}>
        <DialogContent className="sm:max-w-[480px]">
          <form onSubmit={handleCreateExternal}>
            <DialogHeader>
              <DialogTitle>Novo Veículo Parceiro (Terceiro)</DialogTitle>
              <DialogDescription>
                Cadastre um veículo terceiro para composição da frota parceira.
                {canApproveExternal
                  ? ' O veículo será criado diretamente com status ATIVO.'
                  : ' O veículo iniciará com status PENDENTE DE APROVAÇÃO até validação de documentos.'}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="placa">Placa *</Label>
                  <Input
                    id="placa"
                    placeholder="ABC1D23"
                    maxLength={7}
                    value={newPlaca}
                    onChange={(e) => setNewPlaca(e.target.value.toUpperCase())}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tipo">Tipo de Veículo *</Label>
                  <Select value={newTipo} onValueChange={setNewTipo}>
                    <SelectTrigger id="tipo">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TRUCK">Caminhão Toco / Truck</SelectItem>
                      <SelectItem value="CARRETA">Carreta / Cavalo</SelectItem>
                      <SelectItem value="VAN">Van / Utilitário</SelectItem>
                      <SelectItem value="MOTO">Motocicleta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="brand">Marca</Label>
                  <Input
                    id="brand"
                    placeholder="Ex: Volvo, Scania, VW"
                    value={newBrand}
                    onChange={(e) => setNewBrand(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="model">Modelo</Label>
                  <Input
                    id="model"
                    placeholder="Ex: FH 540, Constellation"
                    value={newModel}
                    onChange={(e) => setNewModel(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="year">Ano</Label>
                  <Input
                    id="year"
                    type="number"
                    value={newYear}
                    onChange={(e) => setNewYear(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="color">Cor</Label>
                  <Input
                    id="color"
                    placeholder="Ex: Branco"
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="capacidade">Capacidade (kg)</Label>
                  <Input
                    id="capacidade"
                    type="number"
                    value={newCapacidade}
                    onChange={(e) => setNewCapacidade(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpenExternalModal(false)}
                disabled={submittingExternal}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={submittingExternal}>
                {submittingExternal ? 'Salvando...' : 'Salvar Veículo'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Atualizar Quilometragem (Odômetro) */}
      <Dialog open={openKmModal} onOpenChange={setOpenKmModal}>
        <DialogContent className="sm:max-w-[400px]">
          <form onSubmit={handleUpdateKm}>
            <DialogHeader>
              <DialogTitle>Atualizar Odômetro</DialogTitle>
              <DialogDescription>
                Veículo: <strong>{selectedResource?.plate}</strong> ({selectedResource?.model || 'Sem modelo'}).
                O valor informado não pode ser menor que o atual ({selectedResource?.currentKm} km).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="kmValue">Nova Quilometragem (KM)</Label>
                <Input
                  id="kmValue"
                  type="number"
                  min={selectedResource?.currentKm || 0}
                  value={newKmValue}
                  onChange={(e) => setNewKmValue(e.target.value)}
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpenKmModal(false)}
                disabled={submittingKm}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={submittingKm}>
                {submittingKm ? 'Atualizando...' : 'Confirmar KM'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
