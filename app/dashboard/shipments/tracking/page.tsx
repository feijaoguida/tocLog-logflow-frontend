'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { toast } from 'sonner'
import { Clock3, MapPin, Route as RouteIcon, Truck, AlertTriangle, Package2 } from 'lucide-react'

import { MenuFunctionHeader } from '@/components/layout/menu-function-header'
import { WorkspaceDetailState } from '@/components/layout/workspace-detail-state'
import { WorkspaceEmptyState } from '@/components/layout/workspace-empty-state'
import { WorkspaceStateCard } from '@/components/layout/workspace-state-card'
import { useAuth } from '@/context/auth-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'

const ShipmentsLiveMap = dynamic(() => import('@/components/map/shipments-live-map'), {
  ssr: false,
  loading: () => <div className="flex h-full w-full items-center justify-center bg-muted/20">Carregando mapa...</div>,
})

type TrackingRoute = {
  id: string
  code: string
  status: string
  originLabel?: string | null
  destinationLabel?: string | null
  assignments?: Array<{
    id: string
    vehicleResourceType: string
    driverResourceType: string
  }>
  shipments?: Array<{
    id: string
    code: string
    status: string
    clientName?: string | null
    recipientName?: string | null
  }>
  stops?: Array<{
    id: string
    sequence: number
    label: string
    status: string
  }>
  tasks?: Array<{
    id: string
    taskType: string
    status: string
  }>
  locationPings?: Array<{
    id: string
    latitude: number
    longitude: number
    capturedAt: string
  }>
}

type RouteDetail = {
  id: string
  code: string
  status: string
  originLabel?: string | null
  destinationLabel?: string | null
  assignments?: Array<{
    id: string
    vehicleResourceType: string
    driverResourceType: string
  }>
  shipments?: Array<{
    id: string
    code: string
    status: string
    clientName?: string | null
    recipientName?: string | null
    fiscalDocumentKey?: string | null
    sourceReference?: string | null
    volumes?: Array<{ id: string }>
    occurrences?: Array<{
      id: string
      occurrenceType: string
      severity?: string | null
      description: string
      createdAt: string
    }>
  }>
  tasks?: Array<{
    id: string
    taskType: string
    status: string
    startedAt?: string | null
    completedAt?: string | null
    failedAt?: string | null
    failureReason?: string | null
    shipment?: {
      code: string
      clientName?: string | null
      recipientName?: string | null
      status: string
    } | null
    stop?: {
      label: string
      sequence: number
      status: string
    } | null
    proofOfDelivery?: {
      receiverName?: string | null
      receiverDocument?: string | null
      deliveredAt?: string | null
      attachments?: Array<{
        id: string
        fileUrl: string
      }>
    } | null
  }>
  locationPings?: Array<{
    id: string
    latitude: number
    longitude: number
    capturedAt: string
  }>
}

type ShipmentProviderTracking = {
  shipment: {
    id: string
    code: string
    status: string
    recipientName?: string | null
    fiscalDocumentKey?: string | null
    sourceReference?: string | null
  }
  providerOperation: string
  tracking: {
    provider?: string | null
    providerStatus?: string | null
    providerMessage?: string | null
    protocol?: string | null
    processedAt?: string | null
  }
  trackingSnapshot?: {
    danfeKey?: string | null
    currentStage?: string | null
    currentLocation?: string | null
    estimatedDeliveryAt?: string | null
    lastEventAt?: string | null
    trackingEvents?: Array<{
      code: string
      status: string
      description: string
      occurredAt: string
      location?: string | null
    }>
  } | null
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return 'Não informado'
  }

  return new Date(value).toLocaleString('pt-BR')
}

function getShipmentTrackingReadinessHint(shipment: NonNullable<RouteDetail['shipments']>[number]) {
  if (shipment.fiscalDocumentKey?.trim()) {
    return null
  }

  if (shipment.sourceReference?.trim()) {
    return `A consulta SSW fica indisponível até a carga ${shipment.code} receber a chave fiscal vinculada à referência ${shipment.sourceReference}.`
  }

  return `A consulta SSW fica indisponível até a carga ${shipment.code} receber a chave fiscal no cadastro de cargas.`
}

export default function ShipmentsTrackingPage() {
  const { hasPermission } = useAuth()
  const [loading, setLoading] = useState(true)
  const [refreshingRoutes, setRefreshingRoutes] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [routes, setRoutes] = useState<TrackingRoute[]>([])
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [routeDetail, setRouteDetail] = useState<RouteDetail | null>(null)
  const [trackingLookupLoadingId, setTrackingLookupLoadingId] = useState<string | null>(null)
  const [providerTrackingByShipmentId, setProviderTrackingByShipmentId] = useState<Record<string, ShipmentProviderTracking>>({})
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const canViewRoutes = hasPermission('shipments.routes.view')

  useEffect(() => {
    if (!canViewRoutes) {
      setLoading(false)
      return
    }

    void loadRoutes()
  }, [canViewRoutes])

  useEffect(() => {
    if (!selectedRouteId && routes.length > 0) {
      setSelectedRouteId(routes[0].id)
    }
  }, [routes, selectedRouteId])

  useEffect(() => {
    if (selectedRouteId) {
      void loadRouteDetail(selectedRouteId)
    } else {
      setRouteDetail(null)
    }
  }, [selectedRouteId])

  async function loadRoutes(showLoadingState = true) {
    if (showLoadingState) {
      setLoading(true)
    } else {
      setRefreshingRoutes(true)
    }

    try {
      setLoadError(null)
      const { data } = await api.get<TrackingRoute[]>('/shipments/routes/tracking')
      setRoutes(data)
      setSelectedRouteId((current) =>
        current && data.some((route) => route.id === current)
          ? current
          : data[0]?.id ?? null,
      )
    } catch (error) {
      const message = getApiErrorMessage(error, 'Não foi possível carregar o rastreamento das rotas.')
      setLoadError(message)
      if (showLoadingState) {
        setRoutes([])
        setSelectedRouteId(null)
      }
      toast.error(message)
    } finally {
      if (showLoadingState) {
        setLoading(false)
      } else {
        setRefreshingRoutes(false)
      }
    }
  }

  async function loadRouteDetail(routeId: string) {
    setDetailLoading(true)
    try {
      setDetailError(null)
      const { data } = await api.get<RouteDetail>(`/shipments/routes/${routeId}`)
      setRouteDetail(data)
    } catch (error) {
      const message = getApiErrorMessage(error, 'Não foi possível carregar o detalhe operacional da rota.')
      setDetailError(message)
      setRouteDetail(null)
      toast.error(message)
    } finally {
      setDetailLoading(false)
    }
  }

  async function handleLookupProviderTracking(shipmentId: string) {
    const shipment = routeDetail?.shipments?.find((item) => item.id === shipmentId);

    if (!shipment?.fiscalDocumentKey?.trim()) {
      toast.error('A carga precisa ter chave fiscal para consultar tracking na SSW.');
      return;
    }

    setTrackingLookupLoadingId(shipmentId)
    try {
      const { data } = await api.get<ShipmentProviderTracking>(`/shipments/${shipmentId}/provider-tracking`)
      setProviderTrackingByShipmentId((current) => ({
        ...current,
        [shipmentId]: data,
      }))
      toast.success(`Tracking SSW atualizado para a carga ${data.shipment.code}.`)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível consultar o tracking da carga na SSW.'))
    } finally {
      setTrackingLookupLoadingId(null)
    }
  }

  const filteredRoutes = routes.filter((route) => {
    const matchesStatus = statusFilter === 'ALL' || route.status === statusFilter
    const haystack = `${route.code} ${route.originLabel || ''} ${route.destinationLabel || ''}`.toLowerCase()
    const matchesSearch = search.trim().length === 0 || haystack.includes(search.trim().toLowerCase())
    return matchesStatus && matchesSearch
  })

  const timeline = routeDetail
    ? [
        ...(routeDetail.locationPings || []).map((ping) => ({
          id: `ping-${ping.id}`,
          at: ping.capturedAt,
          title: 'Ping de localização',
          detail: `${ping.latitude.toFixed(4)}, ${ping.longitude.toFixed(4)}`,
          tone: 'default' as const,
        })),
        ...(routeDetail.tasks || []).flatMap((task) => {
          const items: Array<{
            id: string
            at: string
            title: string
            detail: string
            tone: 'default' | 'success' | 'warning' | 'danger'
          }> = []

          if (task.proofOfDelivery?.deliveredAt) {
            items.push({
              id: `task-complete-${task.id}`,
              at: task.proofOfDelivery.deliveredAt,
              title: 'Tarefa concluída',
              detail: `${task.taskType} • ${task.shipment?.code || 'Sem carga'}`,
              tone: 'success',
            })
          }

          if (task.failedAt && task.failureReason) {
            items.push({
              id: `task-failure-${task.id}`,
              at: task.failedAt,
              title: 'Falha operacional',
              detail: task.failureReason,
              tone: 'danger',
            })
          }

          return items
        }),
        ...(routeDetail.shipments || []).flatMap((shipment) =>
          (shipment.occurrences || []).map((occurrence) => ({
            id: `occ-${occurrence.id}`,
            at: occurrence.createdAt,
            title: `Ocorrência ${occurrence.occurrenceType}`,
            detail: `${shipment.code} • ${occurrence.description}`,
            tone:
              occurrence.severity === 'HIGH'
                ? ('danger' as const)
                : occurrence.severity === 'INFO'
                  ? ('default' as const)
                  : ('warning' as const),
          })),
        ),
      ].sort((left, right) => new Date(right.at).getTime() - new Date(left.at).getTime())
    : []

  return (
    <div className="app-page">
      <MenuFunctionHeader
        title="Cargas e Rotas > Rastreamento"
        description="Acompanhamento operacional das rotas em andamento, com último ping de localização, tarefas e contexto de execução."
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="rounded-full px-4 py-2">Tracking nativo</Badge>
            <Button variant="outline" size="sm" onClick={() => void loadRoutes(false)} disabled={loading || refreshingRoutes}>
              {refreshingRoutes ? 'Atualizando...' : 'Atualizar leitura'}
            </Button>
          </div>
        }
      />

      {!canViewRoutes ? (
        <WorkspaceStateCard title="Acesso restrito">
          <p>Este perfil não pode visualizar o rastreamento operacional das rotas.</p>
        </WorkspaceStateCard>
      ) : (
        <>
      {loadError ? (
        <WorkspaceStateCard
          title="Falha de leitura"
          tone="danger"
          actions={
            <Button variant="outline" onClick={() => void loadRoutes(false)} disabled={refreshingRoutes}>
              {refreshingRoutes ? 'Atualizando...' : 'Tentar novamente'}
            </Button>
          }
        >
          <p>{loadError}</p>
        </WorkspaceStateCard>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <Card className="app-section-card min-h-[70vh]">
          <CardHeader>
            <CardTitle className="text-xl">Rotas em andamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              <div className="field-stack">
                <Label htmlFor="route-search">Buscar rota</Label>
                <Input
                  id="route-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Código, origem ou destino"
                />
              </div>
              <div className="field-stack">
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos</SelectItem>
                    <SelectItem value="LOADING">LOADING</SelectItem>
                    <SelectItem value="LOADED">LOADED</SelectItem>
                    <SelectItem value="DISPATCHED">DISPATCHED</SelectItem>
                    <SelectItem value="IN_PROGRESS">IN_PROGRESS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {loading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-28 w-full rounded-2xl" />
              ))
            ) : filteredRoutes.length === 0 ? (
              <WorkspaceEmptyState className="p-6">
                Nenhuma rota encontrada para os filtros aplicados.
              </WorkspaceEmptyState>
            ) : (
              filteredRoutes.map((route) => {
                const latestPing = route.locationPings?.[0]
                return (
                  <button
                    key={route.id}
                    type="button"
                    onClick={() => setSelectedRouteId(route.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      selectedRouteId === route.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{route.code}</p>
                        <p className="text-sm text-muted-foreground">
                          {route.originLabel || 'Origem não informada'} {'>'} {route.destinationLabel || 'Destino não informado'}
                        </p>
                      </div>
                      <Badge variant={route.status === 'IN_PROGRESS' ? 'default' : 'secondary'}>
                        {route.status}
                      </Badge>
                    </div>

                    <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4" />
                        {route.assignments?.length || 0} alocação(ões)
                      </div>
                      <div className="flex items-center gap-2">
                        <RouteIcon className="h-4 w-4" />
                        {route.tasks?.length || 0} tarefa(s) • {route.shipments?.length || 0} carga(s)
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {latestPing
                          ? `${latestPing.latitude.toFixed(4)}, ${latestPing.longitude.toFixed(4)}`
                          : 'Sem ping de localização'}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock3 className="h-4 w-4" />
                        {latestPing
                          ? `Último ping em ${new Date(latestPing.capturedAt).toLocaleString()}`
                          : 'Nenhum ping enviado'}
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card className="app-section-card min-h-[34vh] overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <CardTitle className="text-xl">Mapa operacional</CardTitle>
              {selectedRouteId ? (
                <Button variant="outline" size="sm" onClick={() => void loadRouteDetail(selectedRouteId)} disabled={detailLoading}>
                  {detailLoading ? 'Atualizando...' : 'Atualizar detalhe'}
                </Button>
              ) : null}
            </CardHeader>
            <CardContent className="h-[34vh]">
              {loading ? (
                <Skeleton className="h-full w-full rounded-2xl" />
              ) : (
                <ShipmentsLiveMap routes={selectedRouteId ? filteredRoutes.filter((route) => route.id === selectedRouteId) : filteredRoutes} />
              )}
            </CardContent>
          </Card>

          <Card className="app-section-card min-h-[34vh]">
            <CardHeader>
              <CardTitle className="text-xl">Drill-down operacional</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {detailLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-20 w-full rounded-2xl" />
                  <Skeleton className="h-24 w-full rounded-2xl" />
                  <Skeleton className="h-24 w-full rounded-2xl" />
                </div>
              ) : detailError ? (
                <WorkspaceDetailState
                  kind="error"
                  title="Falha ao carregar o detalhe operacional."
                  description={detailError}
                  actionLabel={selectedRouteId ? 'Tentar novamente' : undefined}
                  onAction={selectedRouteId ? () => void loadRouteDetail(selectedRouteId) : undefined}
                  actionDisabled={detailLoading}
                />
              ) : !routeDetail ? (
                <WorkspaceDetailState
                  kind="empty"
                  description="Selecione uma rota para ver tarefas, ocorrências e último contexto da execução."
                />
              ) : (
                <>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Cargas</p>
                      <p className="mt-2 text-2xl font-semibold tracking-tight">{routeDetail.shipments?.length || 0}</p>
                    </div>
                    <div className="rounded-2xl border p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Tarefas</p>
                      <p className="mt-2 text-2xl font-semibold tracking-tight">{routeDetail.tasks?.length || 0}</p>
                    </div>
                    <div className="rounded-2xl border p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Pings recentes</p>
                      <p className="mt-2 text-2xl font-semibold tracking-tight">{routeDetail.locationPings?.length || 0}</p>
                    </div>
                  </div>

                  <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                    <div className="space-y-4">
                      <div className="rounded-2xl border p-4">
                        <div className="flex items-center gap-2">
                          <RouteIcon className="h-4 w-4 text-muted-foreground" />
                          <p className="font-medium">Tarefas e paradas</p>
                        </div>
                        <div className="mt-4 space-y-3">
                          {routeDetail.tasks?.length ? (
                            routeDetail.tasks.map((task) => (
                              <div key={task.id} className="rounded-xl border bg-background p-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="font-medium">
                                      {task.stop?.sequence ? `Parada ${task.stop.sequence} • ` : ''}
                                      {task.stop?.label || 'Parada não informada'}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      {task.taskType} • {task.shipment?.code || 'Sem carga'}
                                    </p>
                                  </div>
                                  <Badge variant={task.status === 'FAILED' ? 'destructive' : task.status === 'COMPLETED' ? 'default' : 'secondary'}>
                                    {task.status}
                                  </Badge>
                                </div>
                                {task.failureReason ? (
                                  <div className="mt-2 rounded-xl border border-amber-500/20 bg-amber-50/70 px-3 py-3 text-sm text-amber-700">
                                    <p className="font-medium">Falha operacional</p>
                                    <p className="mt-1">{task.failureReason}</p>
                                    <p className="mt-1 text-xs text-amber-700/80">
                                      Registrada em {formatDateTime(task.failedAt)}
                                    </p>
                                  </div>
                                ) : null}
                                {task.completedAt || task.proofOfDelivery?.deliveredAt ? (
                                  <div className="mt-2 rounded-xl border border-emerald-500/20 bg-emerald-50/70 px-3 py-3 text-sm text-emerald-700">
                                    <p className="font-medium">Tarefa concluída</p>
                                    {task.proofOfDelivery?.receiverName ? (
                                      <p className="mt-1">
                                        Recebedor: {task.proofOfDelivery.receiverName}
                                      </p>
                                    ) : (
                                      <p className="mt-1">
                                        {task.taskType === 'PICKUP'
                                          ? 'Coleta finalizada sem recebedor informado.'
                                          : 'Tarefa concluída sem identificação do recebedor no detalhe atual.'}
                                      </p>
                                    )}
                                    <p className="mt-1 text-xs text-emerald-700/80">
                                      Concluída em {formatDateTime(task.proofOfDelivery?.deliveredAt || task.completedAt)}
                                    </p>
                                  </div>
                                ) : null}
                                {!task.failureReason && !task.proofOfDelivery?.receiverName && task.startedAt ? (
                                  <p className="mt-2 text-xs text-muted-foreground">
                                    Iniciada em {formatDateTime(task.startedAt)}
                                  </p>
                                ) : null}
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-muted-foreground">Nenhuma tarefa detalhada para esta rota.</p>
                          )}
                        </div>
                      </div>

                      <div className="rounded-2xl border p-4">
                        <div className="flex items-center gap-2">
                          <Package2 className="h-4 w-4 text-muted-foreground" />
                          <p className="font-medium">Cargas e ocorrências</p>
                        </div>
                        <div className="mt-4 space-y-3">
                          {routeDetail.shipments?.length ? (
                            routeDetail.shipments.map((shipment) => {
                              const canLookupProviderTracking = Boolean(shipment.fiscalDocumentKey?.trim())
                              const trackingReadinessHint = getShipmentTrackingReadinessHint(shipment)

                              return (
                                <div key={shipment.id} className="rounded-xl border bg-background p-3">
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <p className="font-medium">{shipment.code}</p>
                                      <p className="text-sm text-muted-foreground">
                                        {shipment.recipientName || shipment.clientName || 'Destinatário não informado'}
                                      </p>
                                      <p className="mt-1 text-xs text-muted-foreground">
                                        Chave fiscal: {shipment.fiscalDocumentKey || 'Não informada'}
                                      </p>
                                    </div>
                                    <Badge variant={shipment.status === 'DIVERGENT' || shipment.status === 'DAMAGED' ? 'destructive' : shipment.status === 'DELIVERED' ? 'default' : 'secondary'}>
                                      {shipment.status}
                                    </Badge>
                                  </div>
                                  <div className="mt-3 flex justify-end">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleLookupProviderTracking(shipment.id)}
                                      disabled={!canLookupProviderTracking || trackingLookupLoadingId === shipment.id}
                                    >
                                      {trackingLookupLoadingId === shipment.id ? 'Consultando SSW...' : 'Consultar tracking SSW'}
                                    </Button>
                                  </div>
                                  {trackingReadinessHint ? (
                                    <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-50/70 px-3 py-3 text-sm text-amber-700">
                                      <p className="font-medium">Lookup SSW indisponível</p>
                                      <p className="mt-1">{trackingReadinessHint}</p>
                                      <p className="mt-1 text-xs text-amber-700/80">
                                        Ajuste a chave fiscal em `Cargas` antes de concluir que a integração falhou.
                                      </p>
                                    </div>
                                  ) : null}
                                  {providerTrackingByShipmentId[shipment.id] ? (
                                    <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <Badge variant="outline">
                                          {providerTrackingByShipmentId[shipment.id].tracking.providerStatus || 'Sem status'}
                                        </Badge>
                                        <span className="text-xs font-mono text-muted-foreground">
                                          {providerTrackingByShipmentId[shipment.id].tracking.protocol || 'Sem protocolo'}
                                        </span>
                                      </div>
                                      <p className="mt-2 text-xs text-muted-foreground">
                                        Último retorno processado em{' '}
                                        {formatDateTime(
                                          providerTrackingByShipmentId[shipment.id].tracking.processedAt,
                                        )}
                                      </p>
                                      <p className="mt-2 text-sm text-foreground">
                                        {providerTrackingByShipmentId[shipment.id].tracking.providerMessage || 'Sem mensagem retornada pelo provider.'}
                                      </p>
                                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                                        <div className="rounded-lg border bg-background p-3 text-sm">
                                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Estágio atual</p>
                                          <p className="mt-2 font-medium">
                                            {providerTrackingByShipmentId[shipment.id].trackingSnapshot?.currentStage || 'Não informado'}
                                          </p>
                                        </div>
                                        <div className="rounded-lg border bg-background p-3 text-sm">
                                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Local atual</p>
                                          <p className="mt-2 font-medium">
                                            {providerTrackingByShipmentId[shipment.id].trackingSnapshot?.currentLocation || 'Não informado'}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                                        <div className="rounded-lg border bg-background p-3 text-sm">
                                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Último evento</p>
                                          <p className="mt-2 font-medium">
                                            {providerTrackingByShipmentId[shipment.id].trackingSnapshot?.lastEventAt
                                              ? new Date(providerTrackingByShipmentId[shipment.id].trackingSnapshot!.lastEventAt!).toLocaleString('pt-BR')
                                              : 'Não informado'}
                                          </p>
                                        </div>
                                        <div className="rounded-lg border bg-background p-3 text-sm">
                                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Previsão</p>
                                          <p className="mt-2 font-medium">
                                            {providerTrackingByShipmentId[shipment.id].trackingSnapshot?.estimatedDeliveryAt
                                              ? new Date(providerTrackingByShipmentId[shipment.id].trackingSnapshot!.estimatedDeliveryAt!).toLocaleString('pt-BR')
                                              : 'Não informada'}
                                          </p>
                                        </div>
                                      </div>
                                      {providerTrackingByShipmentId[shipment.id].trackingSnapshot?.trackingEvents?.length ? (
                                        <div className="mt-3 space-y-2">
                                          {providerTrackingByShipmentId[shipment.id].trackingSnapshot!.trackingEvents!.map((event) => (
                                            <div key={`${shipment.id}-${event.code}-${event.occurredAt}`} className="rounded-lg border bg-background p-2 text-sm">
                                              <div className="flex items-center justify-between gap-2">
                                                <span className="font-medium">{event.code}</span>
                                                <Badge variant="secondary">{event.status}</Badge>
                                              </div>
                                              <p className="mt-1 text-muted-foreground">{event.description}</p>
                                              <p className="mt-1 text-xs text-muted-foreground">
                                                {new Date(event.occurredAt).toLocaleString('pt-BR')}
                                                {event.location ? ` • ${event.location}` : ''}
                                              </p>
                                            </div>
                                          ))}
                                        </div>
                                      ) : null}
                                    </div>
                                  ) : null}
                                  {shipment.occurrences?.length ? (
                                    <div className="mt-3 space-y-2">
                                      {shipment.occurrences.slice(0, 3).map((occurrence: NonNullable<typeof shipment.occurrences>[number]) => (
                                        <div key={occurrence.id} className="rounded-lg border border-dashed p-2 text-sm">
                                          <div className="flex items-center gap-2 text-muted-foreground">
                                            <AlertTriangle className="h-4 w-4" />
                                            {occurrence.occurrenceType} • {occurrence.severity || 'INFO'}
                                          </div>
                                          <p className="mt-1">{occurrence.description}</p>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="mt-3 text-sm text-muted-foreground">Sem ocorrências registradas.</p>
                                  )}
                                </div>
                              )
                            })
                          ) : (
                            <p className="text-sm text-muted-foreground">Nenhuma carga vinculada a esta rota.</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border p-4">
                      <div className="flex items-center gap-2">
                        <Clock3 className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium">Timeline da rota</p>
                      </div>
                      <div className="mt-4 space-y-3">
                        {timeline.length ? (
                          timeline.map((item) => (
                            <div key={item.id} className="rounded-xl border bg-background p-3 text-sm">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="font-medium">{item.title}</p>
                                  <p className="text-muted-foreground">{item.detail}</p>
                                </div>
                                <Badge
                                  variant={
                                    item.tone === 'danger'
                                      ? 'destructive'
                                      : item.tone === 'success'
                                        ? 'default'
                                        : 'secondary'
                                  }
                                >
                                  {new Date(item.at).toLocaleString()}
                                </Badge>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">Nenhum evento operacional recente para esta rota.</p>
                        )}
                      </div>
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
