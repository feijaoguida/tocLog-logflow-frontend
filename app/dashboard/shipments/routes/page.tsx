'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  MoreHorizontal,
  Package2,
  PackageCheck,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Truck,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

import { MenuFunctionHeader } from '@/components/layout/menu-function-header'
import { WorkspaceStateCard } from '@/components/layout/workspace-state-card'
import { useAuth } from '@/context/auth-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { FilterPopover } from '@/components/ui/filter-popover'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'

type AssignmentRecord = {
  id: string
  vehicleResourceType: string
  vehicleResourceId: string
  driverResourceType: string
  driverResourceId: string
  notes?: string | null
  blockingIssues?: string[] | null
  warnings?: string[] | null
  createdAt?: string
}

type ShipmentRecord = {
  id: string
  code: string
  status: string
  clientName?: string | null
  recipientName?: string | null
  recipientDocument?: string | null
  fiscalDocumentType?: string | null
  fiscalDocumentNumber?: string | null
  fiscalDocumentKey?: string | null
  routeId?: string | null
  volumes?: Array<{ id: string; status: string; code?: string }>
  occurrences?: Array<{
    id: string
    occurrenceType: string
    description: string
    severity?: string | null
  }>
}

type RouteRecord = {
  id: string
  code: string
  status: string
  originLabel?: string | null
  destinationLabel?: string | null
  assignments?: AssignmentRecord[]
  shipments?: ShipmentRecord[]
  notes?: string | null
  createdAt?: string
}

type StopRecord = {
  id: string
  sequence: number
  label: string
  status: string
  plannedAt?: string | null
  notes?: string | null
}

type RouteDetail = RouteRecord & {
  shipments: ShipmentRecord[]
  assignments: AssignmentRecord[]
  stops: StopRecord[]
}

type InternalVehicleOption = {
  id: string
  plate: string
  model?: string | null
  status: string
}

type ExternalDriverOption = {
  id: string
  nome: string
  documento: string
  status: string
  cnhExpiresAt?: string | null
  rntrcCode?: string | null
  rntrcStatus?: string | null
  rntrcExpiresAt?: string | null
}

type ExternalVehicleOption = {
  id: string
  placa: string
  tipo: string
  status: string
  documentExpiresAt?: string | null
  driverId?: string | null
  driver?: {
    id: string
    nome: string
  } | null
}

type AssignmentResources = {
  internalVehicles: InternalVehicleOption[]
  externalDrivers: ExternalDriverOption[]
  externalVehicles: ExternalVehicleOption[]
}

const EMPTY_RESOURCES: AssignmentResources = {
  internalVehicles: [],
  externalDrivers: [],
  externalVehicles: [],
}

function statusBadgeVariant(status: string): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (status) {
    case 'COMPLETED':
      return 'default'
    case 'DISPATCHED':
    case 'IN_PROGRESS':
      return 'secondary'
    case 'CANCELLED':
    case 'FAILED':
      return 'destructive'
    default:
      return 'outline'
  }
}

function statusLabel(status: string) {
  switch (status) {
    case 'DRAFT':
      return 'Em planejamento'
    case 'READY':
      return 'Pronta'
    case 'DISPATCHED':
      return 'Despachada'
    case 'IN_PROGRESS':
      return 'Em rota'
    case 'COMPLETED':
      return 'Concluída'
    case 'CANCELLED':
      return 'Cancelada'
    default:
      return status
  }
}

export default function RoutesPage() {
  const { hasPermission } = useAuth()
  const canViewRoutes = hasPermission('shipments.routes.view')
  const canCreateRoutes = hasPermission('shipments.routes.create')
  const canAssignRoutes = hasPermission('shipments.routes.assign')
  const canOverrideRoutes = hasPermission('shipments.routes.override')

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Data
  const [routes, setRoutes] = useState<RouteRecord[]>([])
  const [shipments, setShipments] = useState<ShipmentRecord[]>([])
  const [assignmentResources, setAssignmentResources] = useState<AssignmentResources>(EMPTY_RESOURCES)

  // Filters & Pagination
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [page, setPage] = useState(1)
  const pageSize = 10

  // Modals & Selected items
  const [selectedRoute, setSelectedRoute] = useState<RouteDetail | null>(null)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [attachModalOpen, setAttachModalOpen] = useState(false)
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)

  // Form states: Nova Rota
  const [newCode, setNewCode] = useState('')
  const [newOrigin, setNewOrigin] = useState('')
  const [newDestination, setNewDestination] = useState('')
  const [savingRoute, setSavingRoute] = useState(false)

  // Form states: Alocação
  const [allocVehicleType, setAllocVehicleType] = useState<'INTERNAL_VEHICLE' | 'EXTERNAL_VEHICLE'>('INTERNAL_VEHICLE')
  const [allocVehicleId, setAllocVehicleId] = useState('')
  const [allocDriverType, setAllocDriverType] = useState<'INTERNAL_DRIVER' | 'EXTERNAL_DRIVER'>('EXTERNAL_DRIVER')
  const [allocDriverId, setAllocDriverId] = useState('')
  const [allocNotes, setAllocNotes] = useState('')
  const [assigning, setAssigning] = useState(false)

  // Form states: Vincular Carga
  const [shipmentIdToAttach, setShipmentIdToAttach] = useState('')
  const [attaching, setAttaching] = useState(false)

  // Form states: Despacho
  const [allowDivergentCargoOverride, setAllowDivergentCargoOverride] = useState(false)
  const [allowResourceOverride, setAllowResourceOverride] = useState(false)
  const [overrideReason, setOverrideReason] = useState('')
  const [dispatching, setDispatching] = useState(false)

  async function loadInitialData(showLoading = true) {
    if (showLoading) setLoading(true)
    else setRefreshing(true)
    setLoadError(null)

    try {
      const [routesRes, shipmentsRes, resourcesRes] = await Promise.all([
        api.get<RouteRecord[]>('/shipments/routes'),
        api.get<ShipmentRecord[]>('/shipments'),
        api.get<AssignmentResources>('/shipments/routes/resources').catch(() => ({ data: EMPTY_RESOURCES })),
      ])
      setRoutes(routesRes.data || [])
      setShipments(shipmentsRes.data || [])
      setAssignmentResources(resourcesRes.data || EMPTY_RESOURCES)
    } catch (error) {
      setLoadError(getApiErrorMessage(error, 'Não foi possível carregar os dados de rotas.'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (canViewRoutes) {
      void loadInitialData(true)
    } else {
      setLoading(false)
    }
  }, [canViewRoutes])

  async function fetchRouteDetail(routeId: string) {
    try {
      const { data } = await api.get<RouteDetail>(`/shipments/routes/${routeId}`)
      setSelectedRoute(data)
      return data
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível carregar detalhes da rota.'))
      return null
    }
  }

  // KPIs
  const summary = useMemo(() => {
    const total = routes.length
    const dispatched = routes.filter((r) => ['DISPATCHED', 'IN_PROGRESS'].includes(r.status)).length
    const readyShipments = shipments.filter((s) => s.status === 'READY_TO_ROUTE').length
    const withBlocks = routes.filter((r) =>
      r.assignments?.some((a) => (a.blockingIssues?.length ?? 0) > 0),
    ).length
    return { total, dispatched, readyShipments, withBlocks }
  }, [routes, shipments])

  // Filtered Routes
  const filteredRoutes = useMemo(() => {
    return routes.filter((route) => {
      const matchesSearch =
        !searchTerm.trim() ||
        route.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (route.originLabel && route.originLabel.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (route.destinationLabel && route.destinationLabel.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchesStatus = statusFilter === 'ALL' || route.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [routes, searchTerm, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredRoutes.length / pageSize))
  const paginatedRoutes = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredRoutes.slice(start, start + pageSize)
  }, [filteredRoutes, page, pageSize])

  const activeFilterCount = (searchTerm.trim() ? 1 : 0) + (statusFilter !== 'ALL' ? 1 : 0)

  // Handle Nova Rota
  async function handleCreateRoute() {
    if (!newCode.trim()) {
      toast.error('Informe o código da rota.')
      return
    }

    setSavingRoute(true)
    try {
      const { data } = await api.post<RouteRecord>('/shipments/routes', {
        code: newCode.trim(),
        originLabel: newOrigin.trim() || undefined,
        destinationLabel: newDestination.trim() || undefined,
      })
      toast.success(`Rota ${data.code} criada com sucesso!`)
      setNewCode('')
      setNewOrigin('')
      setNewDestination('')
      setCreateModalOpen(false)
      await loadInitialData(false)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Erro ao criar rota.'))
    } finally {
      setSavingRoute(false)
    }
  }

  // Handle Alocação
  async function handleOpenAssign(route: RouteRecord) {
    const detail = await fetchRouteDetail(route.id)
    if (!detail) return
    const lastAssign = detail.assignments?.[detail.assignments.length - 1]
    if (lastAssign) {
      setAllocVehicleType(lastAssign.vehicleResourceType as any)
      setAllocVehicleId(lastAssign.vehicleResourceId)
      setAllocDriverType(lastAssign.driverResourceType as any)
      setAllocDriverId(lastAssign.driverResourceId)
      setAllocNotes(lastAssign.notes || '')
    } else {
      setAllocVehicleType('INTERNAL_VEHICLE')
      setAllocVehicleId(assignmentResources.internalVehicles[0]?.id || '')
      setAllocDriverType('EXTERNAL_DRIVER')
      setAllocDriverId(assignmentResources.externalDrivers[0]?.id || '')
      setAllocNotes('')
    }
    setAssignModalOpen(true)
  }

  async function handleSaveAssignment() {
    if (!selectedRoute) return
    if (!allocVehicleId || !allocDriverId) {
      toast.error('Selecione o veículo e o motorista para a rota.')
      return
    }

    setAssigning(true)
    try {
      await api.post(`/shipments/routes/${selectedRoute.id}/assignments`, {
        vehicleResourceType: allocVehicleType,
        vehicleResourceId: allocVehicleId,
        driverResourceType: allocDriverType,
        driverResourceId: allocDriverId,
        notes: allocNotes.trim() || undefined,
      })
      toast.success('Recursos alocados com sucesso.')
      setAssignModalOpen(false)
      await loadInitialData(false)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Erro ao alocar recursos.'))
    } finally {
      setAssigning(false)
    }
  }

  // Handle Vincular Cargas
  async function handleOpenAttach(route: RouteRecord) {
    await fetchRouteDetail(route.id)
    setShipmentIdToAttach('')
    setAttachModalOpen(true)
  }

  async function handleAttachShipment() {
    if (!selectedRoute || !shipmentIdToAttach) {
      toast.error('Selecione uma carga para vincular.')
      return
    }

    setAttaching(true)
    try {
      await api.post(`/shipments/routes/${selectedRoute.id}/shipments`, {
        shipmentId: shipmentIdToAttach,
      })
      toast.success('Carga vinculada com sucesso.')
      setShipmentIdToAttach('')
      await fetchRouteDetail(selectedRoute.id)
      await loadInitialData(false)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Erro ao vincular carga.'))
    } finally {
      setAttaching(false)
    }
  }

  // Handle Despacho
  async function handleOpenDispatch(route: RouteRecord) {
    const detail = await fetchRouteDetail(route.id)
    if (!detail) return
    setAllowDivergentCargoOverride(false)
    setAllowResourceOverride(false)
    setOverrideReason('')
    setDispatchModalOpen(true)
  }

  async function handleDispatchRoute() {
    if (!selectedRoute) return

    if ((allowDivergentCargoOverride || allowResourceOverride) && !overrideReason.trim()) {
      toast.error('Informe a justificativa obrigatória para liberar o despacho com exceção/override.')
      return
    }

    setDispatching(true)
    try {
      await api.post(`/shipments/routes/${selectedRoute.id}/dispatch`, {
        allowDivergentCargoOverride: allowDivergentCargoOverride || undefined,
        allowResourceOverride: allowResourceOverride || undefined,
        overrideReason: overrideReason.trim() || undefined,
      })
      toast.success(`Rota ${selectedRoute.code} despachada com sucesso!`)
      setDispatchModalOpen(false)
      await loadInitialData(false)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Erro ao despachar rota.'))
    } finally {
      setDispatching(false)
    }
  }

  // Handle Ver Detalhes
  async function handleOpenDetail(route: RouteRecord) {
    await fetchRouteDetail(route.id)
    setDetailModalOpen(true)
  }

  // Auxiliary labels for display
  function resolveVehicleLabel(resourceType?: string, resourceId?: string) {
    if (!resourceId) return 'Não alocado'
    if (resourceType === 'INTERNAL_VEHICLE') {
      const v = assignmentResources.internalVehicles.find((i) => i.id === resourceId)
      return v ? `${v.plate} (${v.model || 'Interno'})` : resourceId
    }
    const ev = assignmentResources.externalVehicles.find((i) => i.id === resourceId)
    return ev ? `${ev.placa} (${ev.tipo})` : resourceId
  }

  function resolveDriverLabel(resourceType?: string, resourceId?: string) {
    if (!resourceId) return 'Não alocado'
    const d = assignmentResources.externalDrivers.find((i) => i.id === resourceId)
    return d ? `${d.nome} (${d.status})` : resourceId
  }

  // Eligible shipments to attach
  const eligibleShipments = useMemo(() => {
    return shipments.filter(
      (s) => (!s.routeId || s.routeId === selectedRoute?.id) && !['DRAFT', 'CANCELLED', 'DELIVERED'].includes(s.status),
    )
  }, [shipments, selectedRoute])

  // Despacho readiness checks
  const dispatchChecks = useMemo(() => {
    if (!selectedRoute) return null
    const assignments = selectedRoute.assignments || []
    const latestAssign = assignments[assignments.length - 1]
    const blockingIssues = latestAssign?.blockingIssues || []
    const warnings = latestAssign?.warnings || []
    const shipmentsList = selectedRoute.shipments || []

    const hasActiveMaintenance = blockingIssues.some((issue) =>
      issue.toLowerCase().includes('manutenção em andamento'),
    )

    const divergentShipments = shipmentsList.filter((s) => ['DIVERGENT', 'DAMAGED'].includes(s.status))

    const pendingConference = shipmentsList.filter(
      (s) => !s.volumes || s.volumes.length === 0 || s.volumes.some((v) => v.status === 'PENDING'),
    )

    const missingFiscal = shipmentsList.filter(
      (s) => !s.fiscalDocumentType || !s.fiscalDocumentNumber || !s.fiscalDocumentKey,
    )

    const canDispatchWithoutOverride =
      blockingIssues.length === 0 &&
      divergentShipments.length === 0 &&
      pendingConference.length === 0 &&
      missingFiscal.length === 0 &&
      shipmentsList.length > 0 &&
      assignments.length > 0

    return {
      hasAssignments: assignments.length > 0,
      hasShipments: shipmentsList.length > 0,
      blockingIssues,
      warnings,
      hasActiveMaintenance,
      divergentShipments,
      pendingConference,
      missingFiscal,
      canDispatchWithoutOverride,
    }
  }, [selectedRoute])

  return (
    <div className="app-page">
      <MenuFunctionHeader
        title="Cargas e Rotas > Rotas"
        description="Gestão operacional de rotas de entrega, disponibilidade de veículos/motoristas em tempo real e despacho auditável."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadInitialData(false)}
              disabled={loading || refreshing}
              className="gap-1.5"
            >
              <RefreshCw className={`size-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Atualizando...' : 'Atualizar'}</span>
            </Button>
            {canCreateRoutes && (
              <Button size="sm" onClick={() => setCreateModalOpen(true)} className="gap-1.5">
                <Plus className="size-4" />
                <span>Nova Rota</span>
              </Button>
            )}
          </div>
        }
      />

      {!canViewRoutes ? (
        <WorkspaceStateCard title="Acesso restrito">
          <p>Você não possui permissão para visualizar o painel de rotas.</p>
        </WorkspaceStateCard>
      ) : (
        <>
          {loadError && (
            <WorkspaceStateCard title="Falha ao carregar dados" tone="danger">
              <p>{loadError}</p>
            </WorkspaceStateCard>
          )}

          {/* 4 KPIs responsivos padrão TocLog (U2) */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="app-section-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription>Total de Rotas</CardDescription>
                <Truck className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <CardTitle className="text-3xl font-bold">{summary.total}</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Rotas cadastradas no tenant</p>
              </CardContent>
            </Card>

            <Card className="app-section-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription>Em Trânsito / Despachadas</CardDescription>
                <CheckCircle2 className="size-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <CardTitle className="text-3xl font-bold text-emerald-600">{summary.dispatched}</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Viagens ativas na malha</p>
              </CardContent>
            </Card>

            <Card className="app-section-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription>Cargas Prontas</CardDescription>
                <PackageCheck className="size-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <CardTitle className="text-3xl font-bold text-blue-600">{summary.readyShipments}</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Aguardando inclusão em rota</p>
              </CardContent>
            </Card>

            <Card className="app-section-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription>Com Bloqueio / Restrição</CardDescription>
                <AlertTriangle className="size-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <CardTitle className="text-3xl font-bold text-amber-600">{summary.withBlocks}</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Exigem intervenção ou override</p>
              </CardContent>
            </Card>
          </div>

          {/* Barra de Filtros Flutuantes TocLog (U3) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-xl border border-border">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código, origem ou destino..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setPage(1)
                }}
                className="pl-9"
              />
              {searchTerm && (
                <button
                  onClick={() => {
                    setSearchTerm('')
                    setPage(1)
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <FilterPopover
                activeCount={activeFilterCount}
                onClear={() => {
                  setSearchTerm('')
                  setStatusFilter('ALL')
                  setPage(1)
                }}
                title="Filtros de Rotas"
              >
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Status da Rota</Label>
                    <Select
                      value={statusFilter}
                      onValueChange={(val) => {
                        setStatusFilter(val)
                        setPage(1)
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Todos os status</SelectItem>
                        <SelectItem value="DRAFT">Em planejamento (DRAFT)</SelectItem>
                        <SelectItem value="READY">Pronta (READY)</SelectItem>
                        <SelectItem value="DISPATCHED">Despachada (DISPATCHED)</SelectItem>
                        <SelectItem value="IN_PROGRESS">Em trânsito (IN_PROGRESS)</SelectItem>
                        <SelectItem value="COMPLETED">Concluída (COMPLETED)</SelectItem>
                        <SelectItem value="CANCELLED">Cancelada (CANCELLED)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </FilterPopover>

              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('')
                    setStatusFilter('ALL')
                    setPage(1)
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Limpar ({activeFilterCount})
                </Button>
              )}
            </div>
          </div>

          {/* Tabela completa em largura inteira padrão TocLog (U1 & U4) */}
          <Card className="app-section-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold">Listagem Operacional de Rotas</CardTitle>
              <CardDescription>
                Exibindo {paginatedRoutes.length} de {filteredRoutes.length} rotas encontradas.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 sm:p-6 sm:pt-0">
              <div className="rounded-xl border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[140px]">Código</TableHead>
                      <TableHead>Origem / Destino</TableHead>
                      <TableHead className="w-[140px]">Status</TableHead>
                      <TableHead>Alocação de Recursos</TableHead>
                      <TableHead className="w-[120px]">Cargas / Paradas</TableHead>
                      <TableHead className="text-right w-[110px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={6}>
                            <Skeleton className="h-8 w-full rounded-md" />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : paginatedRoutes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-28 text-center text-muted-foreground">
                          Nenhuma rota encontrada para os critérios selecionados.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedRoutes.map((route) => {
                        const lastAssign = route.assignments?.[route.assignments.length - 1]
                        const hasBlocks = (lastAssign?.blockingIssues?.length ?? 0) > 0
                        const hasWarnings = (lastAssign?.warnings?.length ?? 0) > 0
                        const isDispatched = ['DISPATCHED', 'IN_PROGRESS', 'COMPLETED'].includes(route.status)

                        return (
                          <TableRow key={route.id} className="hover:bg-muted/30 transition-colors">
                            <TableCell className="font-semibold text-foreground">
                              {route.code}
                            </TableCell>

                            <TableCell>
                              <div className="text-sm">
                                <span className="font-medium text-foreground">{route.originLabel || 'Base Operacional'}</span>
                                <span className="text-muted-foreground mx-1.5">→</span>
                                <span className="font-medium text-foreground">{route.destinationLabel || 'Destino Geral'}</span>
                              </div>
                            </TableCell>

                            <TableCell>
                              <Badge variant={statusBadgeVariant(route.status)}>
                                {statusLabel(route.status)}
                              </Badge>
                            </TableCell>

                            <TableCell>
                              {lastAssign ? (
                                <div className="space-y-1 text-xs">
                                  <div className="flex items-center gap-1.5 text-foreground font-medium">
                                    <Truck className="size-3.5 text-muted-foreground shrink-0" />
                                    <span>{resolveVehicleLabel(lastAssign.vehicleResourceType, lastAssign.vehicleResourceId)}</span>
                                  </div>
                                  <div className="text-muted-foreground pl-5">
                                    Condutor: {resolveDriverLabel(lastAssign.driverResourceType, lastAssign.driverResourceId)}
                                  </div>
                                  {hasBlocks && (
                                    <Badge variant="destructive" className="text-[10px] py-0 px-1.5 gap-1 mt-0.5">
                                      <ShieldAlert className="size-2.5" />
                                      {lastAssign.blockingIssues?.length} restrição(ões)
                                    </Badge>
                                  )}
                                  {!hasBlocks && hasWarnings && (
                                    <Badge variant="secondary" className="text-[10px] py-0 px-1.5 gap-1 mt-0.5 text-amber-700 bg-amber-50">
                                      <AlertTriangle className="size-2.5" />
                                      {lastAssign.warnings?.length} alerta(s)
                                    </Badge>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground italic">Sem alocação</span>
                              )}
                            </TableCell>

                            <TableCell>
                              <div className="text-xs font-medium text-foreground">
                                {route.shipments?.length || 0} carga(s)
                              </div>
                            </TableCell>

                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="size-8">
                                    <MoreHorizontal className="size-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem onClick={() => handleOpenDetail(route)}>
                                    <FileText className="size-4 mr-2" />
                                    <span>Ver detalhes</span>
                                  </DropdownMenuItem>

                                  {!isDispatched && canAssignRoutes && (
                                    <>
                                      <DropdownMenuItem onClick={() => handleOpenAssign(route)}>
                                        <Truck className="size-4 mr-2" />
                                        <span>Alocar recursos</span>
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleOpenAttach(route)}>
                                        <Package2 className="size-4 mr-2" />
                                        <span>Vincular cargas</span>
                                      </DropdownMenuItem>
                                    </>
                                  )}

                                  {!isDispatched && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={() => handleOpenDispatch(route)}
                                        className="text-primary font-medium focus:text-primary"
                                      >
                                        <CheckCircle2 className="size-4 mr-2 text-primary" />
                                        <span>Despachar rota</span>
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Paginação Real TocLog (U7) */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2 py-4 border-t mt-4">
                <div className="text-xs text-muted-foreground">
                  Página {page} de {totalPages} ({filteredRoutes.length} registros no total)
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="h-8 gap-1 text-xs"
                  >
                    <ChevronLeft className="size-3.5" />
                    <span>Anterior</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="h-8 gap-1 text-xs"
                  >
                    <span>Próxima</span>
                    <ChevronRight className="size-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* --- MODAL 1: NOVA ROTA (U6) --- */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Criar Nova Rota</DialogTitle>
            <DialogDescription>
              Cadastre o código identificador e os polos da rota de entrega.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Código da Rota *</Label>
              <Input
                placeholder="Ex: ROT-SP-GOI-001"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Ponto de Origem</Label>
              <Input
                placeholder="Ex: CD Central - São Paulo/SP"
                value={newOrigin}
                onChange={(e) => setNewOrigin(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Ponto de Destino</Label>
              <Input
                placeholder="Ex: Goiânia/GO"
                value={newDestination}
                onChange={(e) => setNewDestination(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateRoute} disabled={savingRoute}>
              {savingRoute ? 'Criando...' : 'Criar Rota'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- MODAL 2: ALOCAR RECURSOS (U6) --- */}
      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Alocar Recursos na Rota {selectedRoute?.code}</DialogTitle>
            <DialogDescription>
              Selecione o veículo (próprio ou terceiro) e o motorista condutor.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Origem do Veículo</Label>
              <Select
                value={allocVehicleType}
                onValueChange={(val: any) => {
                  setAllocVehicleType(val)
                  setAllocVehicleId(
                    val === 'INTERNAL_VEHICLE'
                      ? assignmentResources.internalVehicles[0]?.id || ''
                      : assignmentResources.externalVehicles[0]?.id || '',
                  )
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INTERNAL_VEHICLE">Frota Própria (Veículo Interno)</SelectItem>
                  <SelectItem value="EXTERNAL_VEHICLE">Frota Terceirizada (Veículo Parceiro)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Veículo</Label>
              <Select value={allocVehicleId} onValueChange={setAllocVehicleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o veículo" />
                </SelectTrigger>
                <SelectContent>
                  {allocVehicleType === 'INTERNAL_VEHICLE' ? (
                    assignmentResources.internalVehicles.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.plate} • {v.model || 'Geral'} ({v.status})
                      </SelectItem>
                    ))
                  ) : (
                    assignmentResources.externalVehicles.map((ev) => (
                      <SelectItem key={ev.id} value={ev.id}>
                        {ev.placa} • {ev.tipo} ({ev.status}) {ev.driver?.nome ? `• ${ev.driver.nome}` : ''}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Motorista Condutor</Label>
              <Select value={allocDriverId} onValueChange={setAllocDriverId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o condutor" />
                </SelectTrigger>
                <SelectContent>
                  {assignmentResources.externalDrivers.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.nome} • Doc: {d.documento} ({d.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Observações da Alocação</Label>
              <Textarea
                placeholder="Ex: Instruções de carregamento, horários acordados..."
                value={allocNotes}
                onChange={(e) => setAllocNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveAssignment} disabled={assigning}>
              {assigning ? 'Gravando...' : 'Salvar Alocação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- MODAL 3: VINCULAR CARGAS (U6) --- */}
      <Dialog open={attachModalOpen} onOpenChange={setAttachModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Vincular Cargas à Rota {selectedRoute?.code}</DialogTitle>
            <DialogDescription>
              Selecione cargas recebidas/conferidas para serem transportadas nesta viagem.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Cargas Disponíveis</Label>
              <Select value={shipmentIdToAttach} onValueChange={setShipmentIdToAttach}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a carga para adicionar" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleShipments.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.code} • Dest: {s.recipientName || 'N/I'} • Vol: {s.volumes?.length || 0} ({s.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border rounded-lg p-3 bg-muted/20">
              <h4 className="text-xs font-semibold mb-2">Cargas já vinculadas nesta rota ({selectedRoute?.shipments?.length || 0}):</h4>
              {selectedRoute?.shipments && selectedRoute.shipments.length > 0 ? (
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {selectedRoute.shipments.map((s) => (
                    <div key={s.id} className="flex items-center justify-between text-xs bg-background p-2 rounded border">
                      <span className="font-semibold text-foreground">{s.code}</span>
                      <span className="text-muted-foreground">{s.recipientName || 'Sem destinatário'}</span>
                      <Badge variant="outline" className="text-[10px]">{s.status}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">Nenhuma carga vinculada ainda.</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAttachModalOpen(false)}>
              Fechar
            </Button>
            <Button onClick={handleAttachShipment} disabled={attaching || !shipmentIdToAttach}>
              {attaching ? 'Vinculando...' : 'Vincular Carga'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- MODAL 4: DESPACHAR ROTA COM AUDITORIA E OVERRIDE (U6, AC-01, AC-02, AC-03, D02) --- */}
      <Dialog open={dispatchModalOpen} onOpenChange={setDispatchModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Autorização de Despacho — Rota {selectedRoute?.code}</DialogTitle>
            <DialogDescription>
              Revisão de prontidão operacional de cargas, conferência e disponibilidade de frota.
            </DialogDescription>
          </DialogHeader>

          {dispatchChecks && (
            <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-1">
              {/* Alerta de Manutenção em Andamento (IN_PROGRESS) - AC-02 */}
              {dispatchChecks.hasActiveMaintenance && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3.5 text-red-900">
                  <div className="flex items-center gap-2 font-semibold text-sm">
                    <ShieldAlert className="size-4 text-red-600 shrink-0" />
                    <span>Bloqueio Crítico: Manutenção Ativa</span>
                  </div>
                  <p className="text-xs text-red-700 mt-1">
                    O veículo alocado está com manutenção em andamento (IN_PROGRESS). A regra de negócio proíbe o despacho e impede liberação por override até a conclusão dos reparos na oficina.
                  </p>
                </div>
              )}

              {/* Alerta de Bloqueios de Alocação / Blacklist / Concorrência */}
              {!dispatchChecks.hasActiveMaintenance && dispatchChecks.blockingIssues.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-amber-900">
                  <div className="flex items-center gap-2 font-semibold text-sm">
                    <AlertTriangle className="size-4 text-amber-600 shrink-0" />
                    <span>Restrições de Disponibilidade Identificadas</span>
                  </div>
                  <ul className="list-disc pl-5 mt-1.5 space-y-1 text-xs text-amber-800">
                    {dispatchChecks.blockingIssues.map((issue, idx) => (
                      <li key={idx}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Alerta de Cargas Divergentes / Avariadas */}
              {dispatchChecks.divergentShipments.length > 0 && (
                <div className="rounded-lg border border-orange-200 bg-orange-50 p-3.5 text-orange-900">
                  <div className="flex items-center gap-2 font-semibold text-sm">
                    <AlertTriangle className="size-4 text-orange-600 shrink-0" />
                    <span>Cargas com Divergência ou Avaria</span>
                  </div>
                  <p className="text-xs text-orange-800 mt-1">
                    {dispatchChecks.divergentShipments.length} carga(s) foram marcadas com avaria ou divergência física na conferência: {dispatchChecks.divergentShipments.map((s) => s.code).join(', ')}.
                  </p>
                </div>
              )}

              {/* Pendências não liberáveis por override */}
              {(dispatchChecks.pendingConference.length > 0 || dispatchChecks.missingFiscal.length > 0) && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3.5 text-red-900 text-xs">
                  <div className="flex items-center gap-2 font-semibold text-sm">
                    <ShieldAlert className="size-4 text-red-600 shrink-0" />
                    <span>Pendências Fiscais / Conferência Obrigatórias</span>
                  </div>
                  {dispatchChecks.missingFiscal.length > 0 && (
                    <p className="mt-1">
                      Cargas sem dados fiscais: {dispatchChecks.missingFiscal.map((s) => s.code).join(', ')}.
                    </p>
                  )}
                  {dispatchChecks.pendingConference.length > 0 && (
                    <p className="mt-1">
                      Cargas com volumes pendentes de conferência: {dispatchChecks.pendingConference.map((s) => s.code).join(', ')}.
                    </p>
                  )}
                </div>
              )}

              {/* Prontidão Normal */}
              {dispatchChecks.canDispatchWithoutOverride && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3.5 text-emerald-900 text-xs">
                  <div className="flex items-center gap-2 font-semibold text-sm">
                    <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                    <span>Rota Pronta para Saída</span>
                  </div>
                  <p className="mt-1 text-emerald-800">
                    Todos os volumes conferidos, dados fiscais completos e veículo/condutor disponíveis sem bloqueios ativos.
                  </p>
                </div>
              )}

              {/* Seção de Exceção / Override Justificado (D02, AC-02) */}
              {(dispatchChecks.divergentShipments.length > 0 ||
                (!dispatchChecks.hasActiveMaintenance && dispatchChecks.blockingIssues.length > 0)) && (
                <div className="border border-border rounded-lg p-3.5 space-y-3 bg-muted/20">
                  <h4 className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                    <ShieldAlert className="size-3.5 text-primary" />
                    <span>Autorização de Exceção (Override Justificado)</span>
                  </h4>

                  {!canOverrideRoutes ? (
                    <p className="text-xs text-destructive italic">
                      Seu perfil não possui a permissão `shipments.routes.override` para liberar saídas com restrições.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {dispatchChecks.divergentShipments.length > 0 && (
                        <div className="flex items-start gap-2">
                          <Checkbox
                            id="checkDivergent"
                            checked={allowDivergentCargoOverride}
                            onCheckedChange={(checked) => setAllowDivergentCargoOverride(Boolean(checked))}
                          />
                          <Label htmlFor="checkDivergent" className="text-xs cursor-pointer">
                            Autorizar saída de cargas divergentes/avariadas sob responsabilidade operacional
                          </Label>
                        </div>
                      )}

                      {dispatchChecks.blockingIssues.length > 0 && !dispatchChecks.hasActiveMaintenance && (
                        <div className="flex items-start gap-2">
                          <Checkbox
                            id="checkResource"
                            checked={allowResourceOverride}
                            onCheckedChange={(checked) => setAllowResourceOverride(Boolean(checked))}
                          />
                          <Label htmlFor="checkResource" className="text-xs cursor-pointer">
                            Autorizar override de disponibilidade do recurso (sem remover o bloqueio original)
                          </Label>
                        </div>
                      )}

                      {(allowDivergentCargoOverride || allowResourceOverride) && (
                        <div className="space-y-1.5 pt-1">
                          <Label className="text-xs font-semibold">Justificativa Formal do Override *</Label>
                          <Textarea
                            placeholder="Descreva detalhadamente a autorização do gestor para auditoria na timeline..."
                            value={overrideReason}
                            onChange={(e) => setOverrideReason(e.target.value)}
                            rows={2}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDispatchModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleDispatchRoute}
              disabled={
                dispatching ||
                !dispatchChecks ||
                dispatchChecks.hasActiveMaintenance ||
                dispatchChecks.pendingConference.length > 0 ||
                dispatchChecks.missingFiscal.length > 0 ||
                (!dispatchChecks.canDispatchWithoutOverride &&
                  !(allowDivergentCargoOverride || allowResourceOverride)) ||
                ((allowDivergentCargoOverride || allowResourceOverride) && !overrideReason.trim())
              }
            >
              {dispatching ? 'Despachando...' : 'Confirmar Despacho'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- MODAL 5: DETALHES DA ROTA (U6) --- */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes Operacionais — {selectedRoute?.code}</DialogTitle>
            <DialogDescription>
              Origem: {selectedRoute?.originLabel || 'Base'} • Destino: {selectedRoute?.destinationLabel || 'Geral'}
            </DialogDescription>
          </DialogHeader>

          {selectedRoute && (
            <div className="space-y-4 py-2 max-h-[65vh] overflow-y-auto pr-1 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-muted/20 rounded-lg border">
                <div>
                  <span className="text-muted-foreground">Status Atual:</span>
                  <div className="mt-0.5 font-semibold text-foreground">
                    <Badge variant={statusBadgeVariant(selectedRoute.status)}>{statusLabel(selectedRoute.status)}</Badge>
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Total de Cargas:</span>
                  <div className="mt-0.5 font-semibold text-foreground">
                    {selectedRoute.shipments?.length || 0} carga(s) vinculada(s)
                  </div>
                </div>
              </div>

              {/* Alocações */}
              <div>
                <h4 className="font-semibold text-sm mb-2 text-foreground">Histórico de Alocações</h4>
                {selectedRoute.assignments && selectedRoute.assignments.length > 0 ? (
                  <div className="space-y-2">
                    {selectedRoute.assignments.map((assign, i) => (
                      <div key={assign.id || i} className="p-3 border rounded-lg bg-card space-y-1">
                        <div className="flex justify-between font-medium">
                          <span>Veículo: {resolveVehicleLabel(assign.vehicleResourceType, assign.vehicleResourceId)}</span>
                          <span className="text-muted-foreground">Condutor: {resolveDriverLabel(assign.driverResourceType, assign.driverResourceId)}</span>
                        </div>
                        {assign.notes && <p className="text-muted-foreground italic">Nota: {assign.notes}</p>}
                        {assign.blockingIssues && assign.blockingIssues.length > 0 && (
                          <div className="text-destructive mt-1">
                            Bloqueios: {assign.blockingIssues.join(' | ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground italic">Nenhuma alocação registrada.</p>
                )}
              </div>

              {/* Cargas */}
              <div>
                <h4 className="font-semibold text-sm mb-2 text-foreground">Cargas na Rota</h4>
                {selectedRoute.shipments && selectedRoute.shipments.length > 0 ? (
                  <div className="space-y-1.5">
                    {selectedRoute.shipments.map((s) => (
                      <div key={s.id} className="flex items-center justify-between p-2.5 border rounded-lg bg-card">
                        <div>
                          <span className="font-semibold text-foreground">{s.code}</span>
                          <span className="text-muted-foreground ml-2">Dest: {s.recipientName || 'N/I'}</span>
                        </div>
                        <Badge variant="outline">{s.status}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground italic">Nenhuma carga nesta rota.</p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailModalOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
