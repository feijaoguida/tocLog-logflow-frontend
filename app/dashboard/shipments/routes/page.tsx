'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, Truck } from 'lucide-react'
import { toast } from 'sonner'

import { MenuFunctionHeader } from '@/components/layout/menu-function-header'
import { WorkspaceDetailState } from '@/components/layout/workspace-detail-state'
import { WorkspaceInlineAlert } from '@/components/layout/workspace-inline-alert'
import { WorkspaceStateCard } from '@/components/layout/workspace-state-card'
import { useAuth } from '@/context/auth-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
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
  volumes?: Array<{ id: string; status: string }>
  occurrences?: Array<{ id: string; occurrenceType: string; description: string; severity?: string | null }>
}

type RouteRecord = {
  id: string
  code: string
  status: string
  originLabel?: string | null
  destinationLabel?: string | null
  assignments?: AssignmentRecord[]
  shipments?: ShipmentRecord[]
}

type StopRecord = {
  id: string
  sequence: number
  label: string
  status: string
  plannedAt?: string | null
  windowStart?: string | null
  windowEnd?: string | null
  notes?: string | null
  tasks?: Array<{ id: string }>
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

type RouteAssignmentResources = {
  internalVehicles: InternalVehicleOption[]
  externalDrivers: ExternalDriverOption[]
  externalVehicles: ExternalVehicleOption[]
}

const EMPTY_ASSIGNMENT_RESOURCES: RouteAssignmentResources = {
  internalVehicles: [],
  externalDrivers: [],
  externalVehicles: [],
}

const SHIPMENT_STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Rascunho',
  RECEIVED: 'Recebida',
  CONFERRED: 'Conferida',
  DIVERGENT: 'Divergente',
  DAMAGED: 'Avariada',
  READY_TO_ROUTE: 'Pronta para rota',
  ALLOCATED: 'Alocada',
  LOADED: 'Carregada',
  IN_TRANSIT: 'Em trânsito',
  PARTIALLY_DELIVERED: 'Entrega parcial',
  DELIVERED: 'Entregue',
  RETURNED: 'Retornada',
  CANCELLED: 'Cancelada',
}

function statusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'FAILED' || status === 'CANCELLED' || status === 'DAMAGED') {
    return 'destructive'
  }

  if (status === 'DISPATCHED' || status === 'IN_PROGRESS' || status === 'DELIVERED') {
    return 'default'
  }

  return 'secondary'
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return 'Nao informado'
  }

  return new Date(value).toLocaleString('pt-BR')
}

function formatPromisedWindow(start?: string | null, end?: string | null) {
  if (start && end) {
    return `${new Date(start).toLocaleString('pt-BR')} ate ${new Date(end).toLocaleString('pt-BR')}`
  }

  if (start) {
    return `A partir de ${new Date(start).toLocaleString('pt-BR')}`
  }

  if (end) {
    return `Ate ${new Date(end).toLocaleString('pt-BR')}`
  }

  return 'Sem janela prometida registrada'
}

function getShipmentDispatchIssues(shipment: ShipmentRecord) {
  const issues: string[] = []
  const volumes = shipment.volumes ?? []

  if (!shipment.recipientName?.trim()) {
    issues.push('Destinatário não informado')
  }

  if (!shipment.recipientDocument?.trim()) {
    issues.push('Documento do destinatário ausente')
  }

  if (!shipment.fiscalDocumentType?.trim()) {
    issues.push('Tipo fiscal ausente')
  }

  if (!shipment.fiscalDocumentNumber?.trim()) {
    issues.push('Número fiscal ausente')
  }

  if (!shipment.fiscalDocumentKey?.trim()) {
    issues.push('Chave fiscal ausente')
  }

  if (volumes.length === 0) {
    issues.push('Sem volumes cadastrados')
  } else if (volumes.some((volume) => volume.status === 'PENDING')) {
    issues.push('Ainda existem volumes pendentes de conferência')
  }

  if (shipment.status === 'DIVERGENT') {
    issues.push('Carga em divergência')
  }

  if (shipment.status === 'DAMAGED') {
    issues.push('Carga avariada')
  }

  return issues
}

function getShipmentOverrideExceptions(shipment: ShipmentRecord) {
  const exceptions: string[] = []

  if (shipment.status === 'DIVERGENT') {
    exceptions.push('Carga em divergência')
  }

  if (shipment.status === 'DAMAGED') {
    exceptions.push('Carga avariada')
  }

  return exceptions
}

export default function ShipmentRoutesPage() {
  const { hasPermission } = useAuth()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [routesLoadError, setRoutesLoadError] = useState<string | null>(null)
  const [shipmentsLoadError, setShipmentsLoadError] = useState<string | null>(null)
  const [resourceLoadError, setResourceLoadError] = useState<string | null>(null)
  const [resourceRefreshing, setResourceRefreshing] = useState(false)
  const [routeDetailLoading, setRouteDetailLoading] = useState(false)
  const [routeDetailError, setRouteDetailError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [attaching, setAttaching] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [dispatching, setDispatching] = useState(false)
  const [routes, setRoutes] = useState<RouteRecord[]>([])
  const [shipments, setShipments] = useState<ShipmentRecord[]>([])
  const [assignmentResources, setAssignmentResources] = useState<RouteAssignmentResources>(EMPTY_ASSIGNMENT_RESOURCES)
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null)
  const [selectedRoute, setSelectedRoute] = useState<RouteDetail | null>(null)
  const [selectedShipmentId, setSelectedShipmentId] = useState('')
  const [assignmentVehicleType, setAssignmentVehicleType] = useState<'INTERNAL_VEHICLE' | 'EXTERNAL_VEHICLE'>('INTERNAL_VEHICLE')
  const [assignmentVehicleId, setAssignmentVehicleId] = useState('')
  const [assignmentDriverId, setAssignmentDriverId] = useState('')
  const [assignmentNotes, setAssignmentNotes] = useState('')
  const [allowOverride, setAllowOverride] = useState(false)
  const [overrideReason, setOverrideReason] = useState('')
  const [code, setCode] = useState('')
  const [originLabel, setOriginLabel] = useState('')
  const [destinationLabel, setDestinationLabel] = useState('')
  const canViewRoutes = hasPermission('shipments.routes.view')
  const canCreateRoutes = hasPermission('shipments.routes.create')
  const canAssignRoutes = hasPermission('shipments.routes.assign')

  useEffect(() => {
    if (!canViewRoutes) {
      setRoutes([])
      setShipments([])
      setAssignmentResources(EMPTY_ASSIGNMENT_RESOURCES)
      setSelectedRouteId(null)
      setSelectedRoute(null)
      setResourceLoadError(null)
      setLoading(false)
      return
    }

    void loadInitialData()
  }, [canAssignRoutes, canViewRoutes])

  useEffect(() => {
    if (!selectedRouteId) {
      setSelectedRoute(null)
      return
    }

    void loadRouteDetail(selectedRouteId)
  }, [selectedRouteId])

  async function loadInitialData(showLoadingState = true) {
    if (showLoadingState) {
      setLoading(true)
    } else {
      setRefreshing(true)
    }

    try {
      setLoadError(null)
      const [routesResponse, shipmentsResponse] = await Promise.allSettled([
        api.get<RouteRecord[]>('/shipments/routes'),
        api.get<ShipmentRecord[]>('/shipments'),
      ])

      const partialFailures: string[] = []

      if (routesResponse.status === 'fulfilled') {
        const nextRoutes = routesResponse.value.data
        setRoutes(nextRoutes)
        setRoutesLoadError(null)
        setSelectedRouteId((current) =>
          current && nextRoutes.some((route) => route.id === current)
            ? current
            : nextRoutes[0]?.id ?? null,
        )
      } else {
        const message = getApiErrorMessage(routesResponse.reason, 'Não foi possível carregar as rotas.')
        setRoutesLoadError(message)
        partialFailures.push('rotas')
      }

      if (shipmentsResponse.status === 'fulfilled') {
        setShipments(shipmentsResponse.value.data)
        setShipmentsLoadError(null)
      } else {
        const message = getApiErrorMessage(
          shipmentsResponse.reason,
          'Não foi possível carregar as cargas elegíveis.',
        )
        setShipmentsLoadError(message)
        partialFailures.push('cargas')
      }

      if (partialFailures.length === 2) {
        const message = 'Não foi possível carregar as rotas nem as cargas elegíveis do workspace.'
        setLoadError(message)
        if (showLoadingState) {
          setSelectedRouteId(null)
          setSelectedRoute(null)
        }
        toast.error(message)
        return
      }

      if (partialFailures.length > 0) {
        toast.error(
          `Leitura parcial concluída. Revise o bloco de ${partialFailures.join(', ')} antes de seguir na workspace de rotas.`,
        )
      }

      if (canAssignRoutes) {
        await loadAssignmentResources({ showToast: !showLoadingState })
      } else {
        setAssignmentResources(EMPTY_ASSIGNMENT_RESOURCES)
        setResourceLoadError(null)
      }
    } finally {
      if (showLoadingState) {
        setLoading(false)
      } else {
        setRefreshing(false)
      }
    }
  }

  async function loadAssignmentResources(options?: { showToast?: boolean }) {
    if (!canAssignRoutes) {
      setAssignmentResources(EMPTY_ASSIGNMENT_RESOURCES)
      setResourceLoadError(null)
      return EMPTY_ASSIGNMENT_RESOURCES
    }

    const { showToast = true } = options ?? {}

    setResourceRefreshing(true)
    try {
      setResourceLoadError(null)
      const { data } = await api.get<RouteAssignmentResources>('/shipments/routes/resources')
      setAssignmentResources(data)
      return data
    } catch (error) {
      const message = getApiErrorMessage(
        error,
        'Não foi possível carregar o catálogo de recursos para alocação da rota.',
      )
      setResourceLoadError(message)
      if (showToast) {
        toast.error(message)
      }
      return null
    } finally {
      setResourceRefreshing(false)
    }
  }

  async function loadRouteDetail(routeId: string) {
    setRouteDetailLoading(true)
    try {
      setRouteDetailError(null)
      const { data } = await api.get<RouteDetail>(`/shipments/routes/${routeId}`)
      setSelectedRoute(data)
    } catch (error) {
      const message = getApiErrorMessage(error, 'Não foi possível carregar o detalhe da rota.')
      setRouteDetailError(message)
      setSelectedRoute(null)
      toast.error(message)
    } finally {
      setRouteDetailLoading(false)
    }
  }

  async function refreshWorkspace(routeId?: string | null) {
    setLoadError(null)

    const [routesResponse, shipmentsResponse] = await Promise.allSettled([
      api.get<RouteRecord[]>('/shipments/routes'),
      api.get<ShipmentRecord[]>('/shipments'),
    ])

    const partialFailures: string[] = []
    let nextRoutes = routes

    if (routesResponse.status === 'fulfilled') {
      nextRoutes = routesResponse.value.data
      setRoutes(nextRoutes)
      setRoutesLoadError(null)
    } else {
      setRoutesLoadError(getApiErrorMessage(routesResponse.reason, 'Não foi possível atualizar as rotas.'))
      partialFailures.push('rotas')
    }

    if (shipmentsResponse.status === 'fulfilled') {
      setShipments(shipmentsResponse.value.data)
      setShipmentsLoadError(null)
    } else {
      setShipmentsLoadError(
        getApiErrorMessage(shipmentsResponse.reason, 'Não foi possível atualizar as cargas elegíveis.'),
      )
      partialFailures.push('cargas')
    }

    if (partialFailures.length === 2) {
      const message = 'Não foi possível atualizar as rotas nem as cargas elegíveis do workspace.'
      setLoadError(message)
      throw new Error(message)
    }

    if (canAssignRoutes) {
      await loadAssignmentResources({ showToast: false })
    } else {
      setAssignmentResources(EMPTY_ASSIGNMENT_RESOURCES)
      setResourceLoadError(null)
    }

    const nextRouteId =
      routeId && nextRoutes.some((route) => route.id === routeId)
        ? routeId
        : nextRoutes[0]?.id ?? null

    setSelectedRouteId(nextRouteId)

    if (nextRouteId) {
      const { data } = await api.get<RouteDetail>(`/shipments/routes/${nextRouteId}`)
      setSelectedRoute(data)
    } else {
      setSelectedRoute(null)
    }

    if (partialFailures.length > 0) {
      toast.error(
        `Atualização parcial concluída. Revise o bloco de ${partialFailures.join(', ')} antes de seguir.`,
      )
    }
  }

  async function handleAssignRoute() {
    if (!selectedRouteId) {
      toast.error('Selecione uma rota antes de registrar a alocação.')
      return
    }

    if (!assignmentVehicleId || !assignmentDriverId) {
      toast.error('Selecione veículo e motorista para registrar a alocação.')
      return
    }

    setAssigning(true)
    try {
      await api.post(`/shipments/routes/${selectedRouteId}/assignments`, {
        vehicleResourceType: assignmentVehicleType,
        vehicleResourceId: assignmentVehicleId,
        driverResourceType: 'EXTERNAL_DRIVER',
        driverResourceId: assignmentDriverId,
        notes: assignmentNotes.trim() || undefined,
      })
      toast.success('Alocação registrada na rota.')
      setAssignmentVehicleId('')
      setAssignmentDriverId('')
      setAssignmentNotes('')
      await refreshWorkspace(selectedRouteId)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível registrar a alocação da rota.'))
    } finally {
      setAssigning(false)
    }
  }

  async function handleCreateRoute() {
    if (!code.trim()) {
      toast.error('Informe o código da rota antes de salvar.')
      return
    }

    setSaving(true)
    try {
      const { data } = await api.post<RouteRecord>('/shipments/routes', {
        code: code.trim(),
        originLabel: originLabel.trim() || undefined,
        destinationLabel: destinationLabel.trim() || undefined,
      })
      toast.success('Rota criada com sucesso.')
      setCode('')
      setOriginLabel('')
      setDestinationLabel('')
      await refreshWorkspace(data.id)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível criar a rota.'))
    } finally {
      setSaving(false)
    }
  }

  async function handleAttachShipment() {
    if (!selectedRouteId || !selectedShipmentId) {
      toast.error('Selecione uma rota e uma carga para vincular.')
      return
    }

    setAttaching(true)
    try {
      await api.post(`/shipments/routes/${selectedRouteId}/shipments`, {
        shipmentId: selectedShipmentId,
      })
      toast.success('Carga vinculada à rota.')
      setSelectedShipmentId('')
      await refreshWorkspace(selectedRouteId)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível vincular a carga à rota.'))
    } finally {
      setAttaching(false)
    }
  }

  async function handleDispatchRoute() {
    if (!selectedRouteId) {
      toast.error('Selecione uma rota antes de despachar.')
      return
    }

    if (allowOverride && !overrideReason.trim()) {
      toast.error('Informe a justificativa da exceção antes de despachar a rota.')
      return
    }

    setDispatching(true)
    try {
      await api.post(`/shipments/routes/${selectedRouteId}/dispatch`, {
        allowDivergentCargoOverride: allowOverride || undefined,
        overrideReason: overrideReason.trim() || undefined,
      })
      toast.success('Rota despachada com sucesso.')
      setAllowOverride(false)
      setOverrideReason('')
      await refreshWorkspace(selectedRouteId)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível despachar a rota.'))
    } finally {
      setDispatching(false)
    }
  }

  const routeAssignments = selectedRoute?.assignments ?? []
  const routeShipments = selectedRoute?.shipments ?? []
  const routeStops = selectedRoute?.stops ?? []
  const routeBlockingIssues = routeAssignments.flatMap((assignment) => assignment.blockingIssues ?? [])
  const routeWarnings = routeAssignments.flatMap((assignment) => assignment.warnings ?? [])
  const overrideEligibleShipments = routeShipments
    .map((shipment) => ({
      code: shipment.code,
      exceptions: getShipmentOverrideExceptions(shipment),
    }))
    .filter((shipment) => shipment.exceptions.length > 0)
  const hasOverrideCandidates = overrideEligibleShipments.length > 0
  const nonOverrideShipmentIssues = routeShipments.flatMap((shipment) =>
    getShipmentDispatchIssues(shipment).filter(
      (issue) => !['Carga em divergência', 'Carga avariada'].includes(issue),
    ),
  )
  const vehicleOptions =
    assignmentVehicleType === 'INTERNAL_VEHICLE'
      ? assignmentResources.internalVehicles.map((vehicle) => ({
          id: vehicle.id,
          label: `${vehicle.plate} • ${vehicle.model || 'Veículo interno'} • ${vehicle.status}`,
        }))
      : assignmentResources.externalVehicles.map((vehicle) => ({
          id: vehicle.id,
          label: `${vehicle.placa} • ${vehicle.tipo} • ${vehicle.status}${vehicle.driver?.nome ? ` • ${vehicle.driver.nome}` : ''}`,
        }))
  const driverOptions = assignmentResources.externalDrivers.map((driver) => ({
    id: driver.id,
    label: `${driver.nome} • ${driver.status} • ${driver.documento}`,
  }))
  const eligibleShipments = shipments.filter((shipment) => {
    if (shipment.routeId && shipment.routeId !== selectedRouteId) {
      return false
    }

    return !['DRAFT', 'CANCELLED', 'DELIVERED'].includes(shipment.status)
  })
  const selectedShipmentForAttachment =
    eligibleShipments.find((shipment) => shipment.id === selectedShipmentId) ?? null

  const summary = {
    totalRoutes: routes.length,
    dispatchedRoutes: routes.filter((route) => ['DISPATCHED', 'IN_PROGRESS'].includes(route.status)).length,
    readyShipments: shipments.filter((shipment) => shipment.status === 'READY_TO_ROUTE').length,
  }
  const hasPartialLoadIssue = !loadError && Boolean(routesLoadError || shipmentsLoadError)

  useEffect(() => {
    if (!hasOverrideCandidates && allowOverride) {
      setAllowOverride(false)
      setOverrideReason('')
    }
  }, [allowOverride, hasOverrideCandidates])

  function resolveAssignmentVehicleLabel(assignment: AssignmentRecord) {
    if (assignment.vehicleResourceType === 'INTERNAL_VEHICLE') {
      const vehicle = assignmentResources.internalVehicles.find(
        (option) => option.id === assignment.vehicleResourceId,
      )
      return vehicle ? `${vehicle.plate} • ${vehicle.model || 'Veículo interno'}` : assignment.vehicleResourceId
    }

    const vehicle = assignmentResources.externalVehicles.find(
      (option) => option.id === assignment.vehicleResourceId,
    )
    return vehicle ? `${vehicle.placa} • ${vehicle.tipo}` : assignment.vehicleResourceId
  }

  function resolveAssignmentDriverLabel(assignment: AssignmentRecord) {
    const driver = assignmentResources.externalDrivers.find(
      (option) => option.id === assignment.driverResourceId,
    )
    return driver ? `${driver.nome} • ${driver.status}` : assignment.driverResourceId
  }

  return (
    <div className="app-page">
      <MenuFunctionHeader
        title="Cargas e Rotas > Rotas"
        description="Montagem operacional da rota, com leitura de bloqueios de alocação, vínculo real das cargas e despacho auditável."
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="rounded-full px-4 py-2">
              {canViewRoutes && !canCreateRoutes && !canAssignRoutes ? 'Modo leitura' : 'Despacho com validação'}
            </Badge>
            <Button variant="outline" size="sm" onClick={() => void loadInitialData(false)} disabled={loading || refreshing}>
              {refreshing ? 'Atualizando...' : 'Atualizar leitura'}
            </Button>
          </div>
        }
      />

      {!canViewRoutes ? (
        <WorkspaceStateCard title="Acesso restrito">
          <p>Este perfil não possui permissão para visualizar o workspace de rotas em `shipments`.</p>
        </WorkspaceStateCard>
      ) : null}

      {!canViewRoutes ? null : (
        <>
      {canViewRoutes && !canCreateRoutes && !canAssignRoutes ? (
        <WorkspaceStateCard title="Modo leitura" tone="warning">
          <p>
            Este perfil pode revisar rotas, cargas vinculadas, bloqueios, alertas e paradas já
            registradas, mas não pode criar rota, alocar recursos, vincular carga nem despachar.
          </p>
          <p>
            Use a workspace como trilha operacional de leitura e acione um perfil com gestão
            quando a operação precisar montar ou liberar uma saída nova.
          </p>
        </WorkspaceStateCard>
      ) : null}

      {loadError ? (
        <WorkspaceStateCard
          title="Falha de leitura"
          tone="danger"
          actions={
            <Button variant="outline" onClick={() => void loadInitialData(false)} disabled={refreshing}>
              {refreshing ? 'Atualizando...' : 'Tentar novamente'}
            </Button>
          }
        >
          <p>{loadError}</p>
        </WorkspaceStateCard>
      ) : null}

      {hasPartialLoadIssue ? (
        <WorkspaceStateCard title="Leitura parcial" tone="warning">
          <p>
            A workspace conseguiu aproveitar parte dos dados já carregados, mas um dos blocos
            principais falhou nesta atualização.
          </p>
          <p>
            Revise os avisos de `Rotas operacionais` e `Vincular carga conferida` antes de concluir
            que toda a operação está indisponível.
          </p>
        </WorkspaceStateCard>
      ) : null}


      <div className="grid gap-4 md:grid-cols-3">
        <Card className="app-section-card">
          <CardHeader>
            <CardDescription>Total de rotas</CardDescription>
            <CardTitle className="text-3xl">{summary.totalRoutes}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="app-section-card">
          <CardHeader>
            <CardDescription>Rotas em despacho/execução</CardDescription>
            <CardTitle className="text-3xl">{summary.dispatchedRoutes}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="app-section-card">
          <CardHeader>
            <CardDescription>Cargas prontas para rota</CardDescription>
            <CardTitle className="text-3xl">{summary.readyShipments}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.95fr)]">
        <Card className="app-section-card">
          <CardHeader>
            <CardTitle className="text-xl">Rotas operacionais</CardTitle>
            <CardDescription>
              Selecione uma rota para revisar bloqueios, cargas já vinculadas e autorizar o despacho.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {routesLoadError ? (
              <WorkspaceInlineAlert
                className="mb-4"
                title="Falha ao atualizar rotas"
                description={routesLoadError}
                hint="A última lista válida foi preservada para não interromper a revisão da workspace."
              />
            ) : null}
            <div className="rounded-2xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Destino</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Alocações</TableHead>
                    <TableHead>Cargas</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 4 }).map((_, index) => (
                      <TableRow key={index}>
                        <TableCell colSpan={7}>
                          <Skeleton className="h-8 w-full rounded-xl" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : routes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                        Nenhuma rota criada neste tenant.
                      </TableCell>
                    </TableRow>
                  ) : (
                    routes.map((route) => (
                      <TableRow key={route.id} data-state={route.id === selectedRouteId ? 'selected' : undefined}>
                        <TableCell className="font-medium">{route.code}</TableCell>
                        <TableCell>{route.originLabel || 'Não informado'}</TableCell>
                        <TableCell>{route.destinationLabel || 'Não informado'}</TableCell>
                        <TableCell>
                          <Badge variant={statusBadgeVariant(route.status)}>{route.status}</Badge>
                        </TableCell>
                        <TableCell>{route.assignments?.length || 0}</TableCell>
                        <TableCell>{route.shipments?.length || 0}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant={route.id === selectedRouteId ? 'default' : 'outline'}
                            onClick={() => setSelectedRouteId(route.id)}
                          >
                            {route.id === selectedRouteId ? 'Selecionada' : 'Abrir'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {canCreateRoutes ? (
            <Card className="app-section-card">
              <CardHeader>
                <CardTitle className="text-xl">Nova rota</CardTitle>
                <CardDescription>Abra a rota base antes de vincular as cargas conferidas.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="field-stack">
                  <Label htmlFor="route-code">Código</Label>
                  <Input
                    id="route-code"
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    placeholder="ROUTE-0001"
                  />
                </div>

                <div className="field-stack">
                  <Label htmlFor="route-origin">Origem</Label>
                  <Input
                    id="route-origin"
                    value={originLabel}
                    onChange={(event) => setOriginLabel(event.target.value)}
                    placeholder="CD Matriz"
                  />
                </div>

                <div className="field-stack">
                  <Label htmlFor="route-destination">Destino</Label>
                  <Input
                    id="route-destination"
                    value={destinationLabel}
                    onChange={(event) => setDestinationLabel(event.target.value)}
                    placeholder="Campinas e região"
                  />
                </div>

                <Button onClick={handleCreateRoute} disabled={saving} className="w-full">
                  {saving ? 'Salvando...' : 'Criar rota'}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="app-section-card">
              <CardHeader>
                <CardTitle className="text-xl">Acesso de visualização</CardTitle>
                <CardDescription>
                  Este perfil pode revisar rotas, bloqueios, cargas e trilha operacional, mas não criar novas rotas.
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          <Card className="app-section-card">
            <CardHeader>
              <CardTitle className="text-xl">Despacho e vínculo</CardTitle>
              <CardDescription>
                A alocação de motorista/veículo continua sendo lida das regras já registradas para a rota.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {routeDetailLoading ? (
                <Skeleton className="h-72 w-full rounded-2xl" />
              ) : routeDetailError ? (
                <WorkspaceDetailState
                  kind="error"
                  title="Falha ao carregar o detalhe da rota."
                  description={routeDetailError}
                  actionLabel={selectedRouteId ? 'Tentar novamente' : undefined}
                  onAction={selectedRouteId ? () => void loadRouteDetail(selectedRouteId) : undefined}
                />
              ) : !selectedRoute ? (
                <WorkspaceDetailState
                  kind="empty"
                  description="Selecione uma rota para liberar o vínculo de cargas e o despacho."
                />
              ) : (
                <>
                  <div className="rounded-2xl border bg-muted/20 p-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <Truck className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{selectedRoute.code}</p>
                        <p className="text-xs text-muted-foreground">
                          {selectedRoute.originLabel || 'Origem pendente'} {'>'} {selectedRoute.destinationLabel || 'Destino pendente'}
                        </p>
                      </div>
                      <Badge variant={statusBadgeVariant(selectedRoute.status)} className="ml-auto">
                        {selectedRoute.status}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-3 rounded-2xl border p-4">
                    <div>
                      <p className="text-sm font-medium">Leitura das alocações atuais</p>
                      <p className="text-xs text-muted-foreground">
                        O despacho bloqueia enquanto existir pendência validada no vínculo de motorista ou veículo.
                      </p>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-2xl border p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Alocações registradas
                        </p>
                        <p className="mt-2 text-2xl font-semibold">{routeAssignments.length}</p>
                      </div>
                      <div className="rounded-2xl border p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Bloqueios ativos
                        </p>
                        <p className="mt-2 text-2xl font-semibold">{routeBlockingIssues.length}</p>
                      </div>
                    </div>

                    {routeBlockingIssues.length > 0 ? (
                      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-3 text-sm">
                        <div className="mb-2 flex items-center gap-2 font-medium text-destructive">
                          <AlertTriangle className="h-4 w-4" />
                          Bloqueios de alocação
                        </div>
                        <ul className="space-y-1 text-muted-foreground">
                          {routeBlockingIssues.map((issue, index) => (
                            <li key={`${issue}-${index}`}>• {issue}</li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-emerald-700">
                        Nenhum bloqueio de alocação ativo para esta rota.
                      </div>
                    )}

                    {routeWarnings.length > 0 ? (
                      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
                        <div className="mb-2 flex items-center gap-2 font-medium text-amber-700">
                          <AlertTriangle className="h-4 w-4" />
                          Alertas operacionais
                        </div>
                        <ul className="space-y-1 text-muted-foreground">
                          {routeWarnings.map((warning, index) => (
                            <li key={`${warning}-${index}`}>• {warning}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {routeAssignments.length > 0 ? (
                      <div className="space-y-3">
                        {routeAssignments.map((assignment) => (
                          <div key={assignment.id} className="rounded-2xl border bg-muted/20 p-3 text-sm">
                            <div className="grid gap-3 md:grid-cols-2">
                              <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                  Veículo alocado
                                </p>
                                <p className="mt-1 font-medium">{resolveAssignmentVehicleLabel(assignment)}</p>
                              </div>
                              <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                  Motorista alocado
                                </p>
                                <p className="mt-1 font-medium">{resolveAssignmentDriverLabel(assignment)}</p>
                              </div>
                            </div>
                            {assignment.notes ? (
                              <p className="mt-3 text-xs text-muted-foreground">{assignment.notes}</p>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  {canAssignRoutes ? (
                    <div className="space-y-3 rounded-2xl border p-4">
                      <div>
                        <p className="text-sm font-medium">Registrar alocação</p>
                        <p className="text-xs text-muted-foreground">
                          Use este bloco para vincular motorista parceiro e veículo da operação antes do despacho.
                        </p>
                      </div>

                      {resourceLoadError ? (
                        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
                          <p className="font-medium text-amber-700">Catálogo de recursos indisponível</p>
                          <p className="mt-1 text-muted-foreground">{resourceLoadError}</p>
                          <div className="mt-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => void loadAssignmentResources()}
                              disabled={resourceRefreshing}
                            >
                              {resourceRefreshing ? 'Atualizando catálogo...' : 'Tentar carregar catálogo'}
                            </Button>
                          </div>
                        </div>
                      ) : null}

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="field-stack">
                          <Label htmlFor="assignment-vehicle-type">Tipo de veículo</Label>
                          <Select
                            value={assignmentVehicleType}
                            onValueChange={(value: 'INTERNAL_VEHICLE' | 'EXTERNAL_VEHICLE') => {
                              setAssignmentVehicleType(value)
                              setAssignmentVehicleId('')
                            }}
                          >
                            <SelectTrigger id="assignment-vehicle-type">
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="INTERNAL_VEHICLE">Veículo interno</SelectItem>
                              <SelectItem value="EXTERNAL_VEHICLE">Veículo parceiro</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="field-stack">
                          <Label htmlFor="assignment-driver">Motorista parceiro</Label>
                          <Select value={assignmentDriverId} onValueChange={setAssignmentDriverId}>
                            <SelectTrigger id="assignment-driver" disabled={resourceRefreshing}>
                              <SelectValue placeholder="Selecione o motorista" />
                            </SelectTrigger>
                            <SelectContent>
                              {driverOptions.length === 0 ? (
                                <SelectItem value="__empty-driver" disabled>
                                  Nenhum motorista disponível
                                </SelectItem>
                              ) : (
                                driverOptions.map((driver) => (
                                  <SelectItem key={driver.id} value={driver.id}>
                                    {driver.label}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="field-stack">
                        <Label htmlFor="assignment-vehicle">Veículo da alocação</Label>
                        <Select value={assignmentVehicleId} onValueChange={setAssignmentVehicleId}>
                          <SelectTrigger id="assignment-vehicle" disabled={resourceRefreshing}>
                            <SelectValue placeholder="Selecione o veículo" />
                          </SelectTrigger>
                          <SelectContent>
                            {vehicleOptions.length === 0 ? (
                              <SelectItem value="__empty-vehicle" disabled>
                                Nenhum veículo disponível
                              </SelectItem>
                            ) : (
                              vehicleOptions.map((vehicle) => (
                                <SelectItem key={vehicle.id} value={vehicle.id}>
                                  {vehicle.label}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="field-stack">
                        <Label htmlFor="assignment-notes">Observações da alocação</Label>
                        <Textarea
                          id="assignment-notes"
                          value={assignmentNotes}
                          onChange={(event) => setAssignmentNotes(event.target.value)}
                          placeholder="Ex.: motorista alinhado para janela da tarde, veículo liberado após checklist."
                        />
                      </div>

                      <Button
                        onClick={handleAssignRoute}
                        disabled={assigning || resourceRefreshing || !assignmentVehicleId || !assignmentDriverId}
                        variant="outline"
                        className="w-full"
                      >
                        {assigning ? 'Registrando alocação...' : 'Registrar alocação da rota'}
                      </Button>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
                      Este perfil pode revisar as alocações existentes, mas não registrar novos vínculos ou despachar a rota.
                    </div>
                  )}

                  <div className="space-y-3 rounded-2xl border p-4">
                    <div>
                      <p className="text-sm font-medium">Vincular carga conferida</p>
                      <p className="text-xs text-muted-foreground">
                        Só aparecem cargas compatíveis com a operação, já recebidas ou conferidas.
                      </p>
                    </div>

                    {shipmentsLoadError ? (
                      <WorkspaceInlineAlert
                        title="Falha ao atualizar cargas elegíveis"
                        description={shipmentsLoadError}
                        hint="A última lista válida de cargas foi preservada enquanto a nova leitura não conclui."
                      />
                    ) : null}

                    <div className="field-stack">
                      <Label htmlFor="shipment-link">Carga disponível</Label>
                      <Select value={selectedShipmentId} onValueChange={setSelectedShipmentId}>
                        <SelectTrigger id="shipment-link">
                          <SelectValue placeholder="Selecione uma carga" />
                        </SelectTrigger>
                        <SelectContent>
                          {eligibleShipments.length === 0 ? (
                            <SelectItem value="__empty" disabled>
                              Nenhuma carga disponível
                            </SelectItem>
                          ) : (
                            eligibleShipments.map((shipment) => (
                              <SelectItem key={shipment.id} value={shipment.id}>
                                {shipment.code} • {SHIPMENT_STATUS_LABEL[shipment.status] || shipment.status}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedShipmentForAttachment ? (
                      <div className="rounded-2xl border p-4">
                        <div className="flex flex-wrap items-start gap-3">
                          <div className="space-y-1">
                            <p className="text-sm font-medium">{selectedShipmentForAttachment.code}</p>
                            <p className="text-xs text-muted-foreground">
                              {selectedShipmentForAttachment.clientName || 'Cliente não informado'}
                              {' • '}
                              {selectedShipmentForAttachment.recipientName || 'Destinatário não informado'}
                            </p>
                          </div>
                          <Badge
                            variant={
                              getShipmentDispatchIssues(selectedShipmentForAttachment).length === 0
                                ? 'success'
                                : 'warning'
                            }
                            className="ml-auto"
                          >
                            {getShipmentDispatchIssues(selectedShipmentForAttachment).length === 0
                              ? 'Pronta para despacho'
                              : `${getShipmentDispatchIssues(selectedShipmentForAttachment).length} pendência(s) antes da saída`}
                          </Badge>
                        </div>

                        <div className="mt-3 grid gap-3 md:grid-cols-3">
                          <div className="rounded-2xl border p-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                              Status atual
                            </p>
                            <p className="mt-2 text-sm font-semibold">
                              {SHIPMENT_STATUS_LABEL[selectedShipmentForAttachment.status] ||
                                selectedShipmentForAttachment.status}
                            </p>
                          </div>
                          <div className="rounded-2xl border p-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                              Volumes
                            </p>
                            <p className="mt-2 text-sm font-semibold">
                              {selectedShipmentForAttachment.volumes?.length ?? 0}
                            </p>
                          </div>
                          <div className="rounded-2xl border p-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                              Ocorrências
                            </p>
                            <p className="mt-2 text-sm font-semibold">
                              {selectedShipmentForAttachment.occurrences?.length ?? 0}
                            </p>
                          </div>
                        </div>

                        {getShipmentDispatchIssues(selectedShipmentForAttachment).length > 0 ? (
                          <div className="mt-3 rounded-2xl border border-amber-500/30 bg-amber-50/60 p-3 text-sm text-muted-foreground">
                            <p className="font-medium text-foreground">
                              Atenção antes do despacho
                            </p>
                            <ul className="mt-2 space-y-1">
                              {getShipmentDispatchIssues(selectedShipmentForAttachment).map((issue) => (
                                <li key={issue}>• {issue}</li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <div className="mt-3 rounded-2xl border border-emerald-500/30 bg-emerald-50/60 p-3 text-sm text-emerald-800">
                            Esta carga já saiu da conferência com base documental e volumetria coerentes para seguir no despacho da rota.
                          </div>
                        )}
                      </div>
                    ) : null}

                    {canAssignRoutes ? (
                      <Button
                        onClick={handleAttachShipment}
                        disabled={attaching || !selectedShipmentId}
                        variant="outline"
                        className="w-full"
                      >
                        {attaching ? 'Vinculando...' : 'Vincular carga à rota'}
                      </Button>
                    ) : (
                      <div className="rounded-2xl border border-dashed p-3 text-sm text-muted-foreground">
                        O vínculo de cargas está indisponível neste perfil porque exige permissão de alocação.
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 rounded-2xl border p-4">
                    <div>
                      <p className="text-sm font-medium">Cargas atualmente na rota</p>
                      <p className="text-xs text-muted-foreground">
                        Divergências e avarias aparecem aqui antes da liberação do despacho.
                      </p>
                    </div>

                    <div className="space-y-3">
                      {routeShipments.length === 0 ? (
                        <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
                          Nenhuma carga vinculada ainda.
                        </div>
                      ) : (
                        routeShipments.map((shipment) => {
                          const volumes = shipment.volumes ?? []
                          const pendingVolumes = volumes.filter((volume) => volume.status === 'PENDING').length
                          const occurrences = shipment.occurrences ?? []
                          const dispatchIssues = getShipmentDispatchIssues(shipment)

                          return (
                            <div key={shipment.id} className="rounded-2xl border p-4">
                              <div className="flex flex-wrap items-start gap-3">
                                <div className="space-y-1">
                                  <p className="text-sm font-medium">{shipment.code}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {shipment.clientName || 'Cliente não informado'} • {shipment.recipientName || 'Destinatário não informado'}
                                  </p>
                                </div>
                                <Badge variant={statusBadgeVariant(shipment.status)} className="ml-auto">
                                  {SHIPMENT_STATUS_LABEL[shipment.status] || shipment.status}
                                </Badge>
                              </div>

                              <div className="mt-3">
                                <Badge variant={dispatchIssues.length === 0 ? 'success' : 'warning'}>
                                  {dispatchIssues.length === 0
                                    ? 'Pronta para despacho'
                                    : `${dispatchIssues.length} pendência(s) antes da saída`}
                                </Badge>
                              </div>

                              <div className="mt-3 grid gap-3 md:grid-cols-3">
                                <div className="rounded-2xl border p-3">
                                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                    Volumes
                                  </p>
                                  <p className="mt-2 text-lg font-semibold">{volumes.length}</p>
                                </div>
                                <div className="rounded-2xl border p-3">
                                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                    Pendentes
                                  </p>
                                  <p className="mt-2 text-lg font-semibold">{pendingVolumes}</p>
                                </div>
                                <div className="rounded-2xl border p-3">
                                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                    Ocorrências
                                  </p>
                                  <p className="mt-2 text-lg font-semibold">{occurrences.length}</p>
                                </div>
                              </div>

                              {dispatchIssues.length > 0 ? (
                                <div className="mt-3 rounded-2xl border border-amber-500/30 bg-amber-50/60 p-3 text-xs text-muted-foreground">
                                  <p className="font-medium text-foreground">Pendências que podem travar o despacho</p>
                                  <ul className="mt-2 space-y-1">
                                    {dispatchIssues.map((issue) => (
                                      <li key={issue}>• {issue}</li>
                                    ))}
                                  </ul>
                                </div>
                              ) : null}

                              {occurrences.length > 0 ? (
                                <div className="mt-3 space-y-2">
                                  {occurrences.slice(0, 2).map((occurrence) => (
                                    <div key={occurrence.id} className="rounded-2xl border bg-muted/20 p-3 text-xs">
                                      <p className="font-medium">
                                        {occurrence.occurrenceType}
                                        {occurrence.severity ? ` • ${occurrence.severity}` : ''}
                                      </p>
                                      <p className="mt-1 text-muted-foreground">{occurrence.description}</p>
                                    </div>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>

                  <div className="space-y-3 rounded-2xl border p-4">
                    <div>
                      <p className="text-sm font-medium">Paradas e janelas da rota</p>
                      <p className="text-xs text-muted-foreground">
                        Use esta leitura para enxergar novas tentativas, horário prometido ao cliente e ordem operacional das paradas.
                      </p>
                    </div>

                    <div className="space-y-3">
                      {routeStops.length === 0 ? (
                        <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
                          Nenhuma parada cadastrada ainda.
                        </div>
                      ) : (
                        routeStops.map((stop) => (
                          <div key={stop.id} className="rounded-2xl border p-4">
                            <div className="flex flex-wrap items-start gap-3">
                              <div className="space-y-1">
                                <p className="text-sm font-medium">
                                  Parada {stop.sequence} • {stop.label}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {stop.tasks?.length || 0} tarefa(s) vinculada(s)
                                </p>
                              </div>
                              <Badge variant={statusBadgeVariant(stop.status)} className="ml-auto">
                                {stop.status}
                              </Badge>
                            </div>

                            <div className="mt-3 grid gap-3 md:grid-cols-3">
                              <div className="rounded-2xl border p-3">
                                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                  Tentativa planejada
                                </p>
                                <p className="mt-2 text-sm font-semibold">{formatDateTime(stop.plannedAt)}</p>
                              </div>
                              <div className="rounded-2xl border p-3 md:col-span-2">
                                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                  Janela prometida
                                </p>
                                <p className="mt-2 text-sm font-semibold">
                                  {formatPromisedWindow(stop.windowStart, stop.windowEnd)}
                                </p>
                              </div>
                            </div>

                            {stop.notes ? (
                              <div className="mt-3 rounded-2xl border bg-muted/20 p-3 text-xs text-muted-foreground">
                                {stop.notes}
                              </div>
                            ) : null}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="space-y-4 rounded-2xl border p-4">
                    <div>
                      <p className="text-sm font-medium">Despachar rota</p>
                      <p className="text-xs text-muted-foreground">
                        A rota só sai quando todas as políticas de alocação e conferência estiverem atendidas.
                      </p>
                    </div>

                    {canAssignRoutes ? (
                      <>
                        <div className="flex items-start gap-3 rounded-2xl border p-3">
                          <Checkbox
                            id="allow-override"
                            checked={allowOverride}
                            onCheckedChange={(checked) => setAllowOverride(checked === true)}
                            disabled={!hasOverrideCandidates}
                          />
                          <div className="space-y-1">
                            <Label htmlFor="allow-override">Permitir despacho com exceção operacional</Label>
                            <p className="text-xs text-muted-foreground">
                              Use apenas quando houver carga divergente ou avariada e a empresa exigir justificativa.
                            </p>
                          </div>
                        </div>

                        {hasOverrideCandidates ? (
                          <div className="rounded-2xl border border-amber-500/30 bg-amber-50/60 p-3 text-sm text-muted-foreground">
                            <p className="font-medium text-foreground">
                              Exceções que podem seguir com autorização manual
                            </p>
                            <ul className="mt-2 space-y-1">
                              {overrideEligibleShipments.map((shipment) => (
                                <li key={shipment.code}>
                                  • {shipment.code}: {shipment.exceptions.join(' e ')}
                                </li>
                              ))}
                            </ul>
                            <p className="mt-2 text-xs">
                              A justificativa cobre apenas divergência ou avaria. Documentação, volumes pendentes e bloqueios de alocação continuam impeditivos.
                            </p>
                          </div>
                        ) : (
                          <div className="rounded-2xl border border-dashed p-3 text-sm text-muted-foreground">
                            A autorização manual só fica disponível quando a rota tiver pelo menos uma carga divergente ou avariada.
                          </div>
                        )}

                        {nonOverrideShipmentIssues.length > 0 || routeBlockingIssues.length > 0 ? (
                          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-muted-foreground">
                            <p className="font-medium text-foreground">
                              Bloqueios que não são liberados por exceção
                            </p>
                            <ul className="mt-2 space-y-1">
                              {[...routeBlockingIssues, ...nonOverrideShipmentIssues].map((issue, index) => (
                                <li key={`${issue}-${index}`}>• {issue}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}

                        <div className="field-stack">
                          <Label htmlFor="override-reason">Justificativa da exceção</Label>
                          <Textarea
                            id="override-reason"
                            value={overrideReason}
                            onChange={(event) => setOverrideReason(event.target.value)}
                            placeholder="Explique por que a rota precisa seguir mesmo com a exceção registrada."
                            disabled={!allowOverride}
                          />
                        </div>

                        <Button onClick={handleDispatchRoute} disabled={dispatching} className="w-full">
                          {dispatching ? 'Despachando...' : 'Despachar rota'}
                        </Button>
                      </>
                    ) : (
                      <div className="rounded-2xl border border-dashed p-3 text-sm text-muted-foreground">
                        Este perfil não pode despachar a rota nem autorizar exceções operacionais.
                      </div>
                    )}

                    <div className="rounded-2xl border bg-muted/20 p-3 text-xs text-muted-foreground">
                      <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
                        <CheckCircle2 className="h-4 w-4" />
                        Regras checadas no despacho
                      </div>
                      <ul className="space-y-1">
                        <li>• exige alocação válida sem bloqueios operacionais</li>
                        <li>• exige pelo menos uma carga vinculada</li>
                        <li>• pode bloquear volumes pendentes de conferência</li>
                        <li>• exige justificativa para divergência/avaria quando a política da empresa pedir aprovação</li>
                      </ul>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
        </>
      )}
    </div>
  )
}
