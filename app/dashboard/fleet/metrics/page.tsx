'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  AlertCircle,
  Calendar,
  Car,
  ShieldAlert,
  Wrench,
  AlertTriangle,
  Bell,
  Clock,
  ArrowRight,
  RefreshCw,
  Sliders,
  CheckCircle2,
  FileText,
} from 'lucide-react'
import { toast } from 'sonner'

import { WorkspaceStateCard } from '@/components/layout/workspace-state-card'
import { useAuth } from '@/context/auth-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'

type MaintenanceItem = {
  id: string
  type: 'PREVENTIVE' | 'CORRECTIVE'
  description: string
  scheduledDate: string
  vehicle: {
    id: string
    plate: string
    model: string
  }
}

type ActiveBlockItem = {
  id: string
  reason: string
  notes?: string | null
  createdAt: string
  vehicle?: {
    id: string
    plate: string
    model: string
  }
}

type FleetMetricsRecord = {
  total: number
  statusDetails: Partial<Record<'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'BLOCKED', number>>
  activeMaintenances: number
  inProgressMaintenancesCount: number
  overdueMaintenancesCount: number
  overdueMaintenances: MaintenanceItem[]
  upcomingMaintenancesCount: number
  upcomingMaintenances: MaintenanceItem[]
  activeBlocksCount: number
  activeBlocks: ActiveBlockItem[]
  criticalAlertsCount: number
  openAlertsCount: number
  expiredDocumentsCount: number
}

const TYPE_LABEL: Record<'PREVENTIVE' | 'CORRECTIVE', string> = {
  PREVENTIVE: 'Preventiva',
  CORRECTIVE: 'Corretiva',
}

export default function FleetDashboardPage() {
  const { hasPermission } = useAuth()
  const canViewDashboard = hasPermission('fleet.dashboard.view')
  const canViewMaintenance = hasPermission('fleet.maintenance.view')
  const canManageMaintenance = hasPermission('fleet.maintenance.manage')
  const canViewVehicles = hasPermission('fleet.vehicles.view')
  const canViewChecklists = hasPermission('fleet.checklists.view')
  const canManageSettings = hasPermission('fleet.settings.manage')

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [metrics, setMetrics] = useState<FleetMetricsRecord | null>(null)
  const [activeTab, setActiveTab] = useState('overdue')

  useEffect(() => {
    if (!canViewDashboard) {
      setLoading(false)
      return
    }

    void loadMetrics()
  }, [canViewDashboard])

  async function loadMetrics(showLoadingState = true) {
    if (showLoadingState) {
      setLoading(true)
    } else {
      setRefreshing(true)
    }

    try {
      setLoadError(null)
      const { data } = await api.get<FleetMetricsRecord>('/fleet/vehicles/dashboard/metrics')
      setMetrics(data)
    } catch (error) {
      const message = getApiErrorMessage(error, 'Não foi possível carregar os indicadores da frota.')
      setLoadError(message)
      setMetrics(null)
      toast.error(message)
    } finally {
      if (showLoadingState) {
        setLoading(false)
      } else {
        setRefreshing(false)
      }
    }
  }

  const statusDetails = metrics?.statusDetails ?? {}

  return (
    <div className="app-page space-y-6 p-4 md:p-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Indicadores & Gestão de Frotas
          </h1>
          <p className="text-sm text-muted-foreground">
            Painel operacional e preditivo com manutenções vencidas, alertas críticos, bloqueios e disponibilidade.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadMetrics(false)}
            disabled={loading || refreshing}
            className="h-9 gap-1.5"
          >
            <RefreshCw className={`size-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </Button>
          {canViewMaintenance && (
            <Button asChild variant="outline" size="sm" className="h-9">
              <Link href="/dashboard/fleet/maintenance">Manutenções & Alertas</Link>
            </Button>
          )}
          {canViewVehicles && (
            <Button asChild variant="outline" size="sm" className="h-9">
              <Link href="/dashboard/fleet">Veículos</Link>
            </Button>
          )}
          {canViewChecklists && (
            <Button asChild variant="outline" size="sm" className="h-9">
              <Link href="/dashboard/fleet/checklists">Checklists</Link>
            </Button>
          )}
          {canManageSettings && (
            <Button asChild variant="outline" size="sm" className="h-9">
              <Link href="/dashboard/fleet/settings">
                <Sliders className="size-4 mr-1" />
                Políticas
              </Link>
            </Button>
          )}
        </div>
      </section>

      {!canViewDashboard ? (
        <WorkspaceStateCard title="Acesso restrito">
          <p>Seu perfil de usuário não possui permissão para visualizar o dashboard de frotas (`fleet.dashboard.view`).</p>
        </WorkspaceStateCard>
      ) : (
        <>
          {loadError ? (
            <WorkspaceStateCard
              title="Falha de leitura"
              tone="danger"
              actions={
                <Button variant="outline" onClick={() => void loadMetrics(false)} disabled={refreshing}>
                  {refreshing ? 'Atualizando...' : 'Tentar novamente'}
                </Button>
              }
            >
              <p>{loadError}</p>
            </WorkspaceStateCard>
          ) : null}

          {/* KPI CARDS (RF05, AC-01) */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {/* Total Veículos */}
            <MetricCard
              loading={loading}
              title="Total Frota"
              value={metrics?.total ?? 0}
              description={`${statusDetails.AVAILABLE || 0} disponíveis`}
              icon={<Car className="h-4 w-4 text-slate-500" />}
            />

            {/* Manutenções Vencidas (Destaque Crítico) */}
            <MetricCard
              loading={loading}
              title="Vencidas"
              value={metrics?.overdueMaintenancesCount ?? 0}
              description="Atrasadas (ação imediata)"
              icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
              highlight={(metrics?.overdueMaintenancesCount ?? 0) > 0 ? 'danger' : undefined}
            />

            {/* Próximas Manutenções */}
            <MetricCard
              loading={loading}
              title="Próximas (7 dias)"
              value={metrics?.upcomingMaintenancesCount ?? 0}
              description="Manutenções agendadas"
              icon={<Calendar className="h-4 w-4 text-amber-500" />}
            />

            {/* Em Andamento */}
            <MetricCard
              loading={loading}
              title="Em Andamento"
              value={metrics?.inProgressMaintenancesCount ?? 0}
              description="Serviços na oficina"
              icon={<Wrench className="h-4 w-4 text-blue-500" />}
            />

            {/* Alertas Críticos */}
            <MetricCard
              loading={loading}
              title="Alertas Críticos"
              value={metrics?.criticalAlertsCount ?? 0}
              description={`${metrics?.openAlertsCount ?? 0} abertos total`}
              icon={<Bell className="h-4 w-4 text-amber-600" />}
              highlight={(metrics?.criticalAlertsCount ?? 0) > 0 ? 'warning' : undefined}
            />

            {/* Bloqueios Ativos */}
            <MetricCard
              loading={loading}
              title="Bloqueios Ativos"
              value={metrics?.activeBlocksCount ?? 0}
              description={`${metrics?.expiredDocumentsCount ?? 0} doc. vencidos`}
              icon={<ShieldAlert className="h-4 w-4 text-red-600" />}
            />
          </div>

          {/* DETALHAMENTO EM ABAS (RF05, AC-01, AC-04) */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <TabsTrigger value="overdue" className="gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                Vencidas
                {metrics && metrics.overdueMaintenancesCount > 0 && (
                  <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">
                    {metrics.overdueMaintenancesCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="upcoming" className="gap-2">
                <Calendar className="h-4 w-4 text-amber-500" />
                Próximas (7 dias)
                {metrics && metrics.upcomingMaintenancesCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {metrics.upcomingMaintenancesCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="blocks" className="gap-2">
                <ShieldAlert className="h-4 w-4 text-slate-500" />
                Bloqueios Operacionais
                {metrics && metrics.activeBlocksCount > 0 && (
                  <Badge variant="outline" className="ml-1 h-5 px-1.5 text-xs">
                    {metrics.activeBlocksCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="availability" className="gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Disponibilidade
              </TabsTrigger>
            </TabsList>

            {/* ABA 1: MANUTENÇÕES VENCIDAS (AC-01) */}
            <TabsContent value="overdue" className="space-y-4">
              <Card className="border-slate-200 dark:border-slate-800">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      Manutenções com Prazo Vencido
                    </span>
                    {canViewMaintenance && (
                      <Button asChild size="sm" variant="ghost" className="text-xs gap-1">
                        <Link href="/dashboard/fleet/maintenance">
                          Ir para Manutenções <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Ordens de manutenção agendadas que ultrapassaram a data limite sem terem sido iniciadas.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 3 }).map((_, idx) => (
                        <Skeleton key={idx} className="h-16 w-full rounded-lg" />
                      ))}
                    </div>
                  ) : !metrics || metrics.overdueMaintenances.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-8 text-center text-sm text-slate-500">
                      <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                      Nenhuma manutenção com prazo vencido. A operação está em dia!
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {metrics.overdueMaintenances.map((m) => (
                        <div
                          key={m.id}
                          className="flex flex-col gap-3 rounded-lg border border-red-200 dark:border-red-950/60 bg-red-50/20 dark:bg-red-950/10 p-4 md:flex-row md:items-center md:justify-between"
                        >
                          <div className="flex items-start gap-3">
                            <div className="rounded-full bg-red-100 dark:bg-red-900/40 p-2 text-red-700 dark:text-red-300">
                              <AlertTriangle className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-900 dark:text-slate-100">{m.vehicle.plate}</span>
                                <span className="text-xs text-slate-500">• {m.vehicle.model}</span>
                                <Badge variant="outline" className="text-xs border-red-300 text-red-700 bg-red-50">
                                  {TYPE_LABEL[m.type]}
                                </Badge>
                              </div>
                              <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{m.description}</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between md:flex-col md:items-end gap-1">
                            <div className="text-xs text-red-600 font-semibold flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              Vencida em {new Date(m.scheduledDate).toLocaleDateString('pt-BR')}
                            </div>
                            {canManageMaintenance && (
                              <Button asChild size="sm" variant="outline" className="h-7 text-xs border-red-200 text-red-700 hover:bg-red-50">
                                <Link href="/dashboard/fleet/maintenance">Iniciar OS</Link>
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ABA 2: PRÓXIMAS MANUTENÇÕES (AC-01) */}
            <TabsContent value="upcoming" className="space-y-4">
              <Card className="border-slate-200 dark:border-slate-800">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-amber-500" />
                      Próximas Manutenções (Próximos 7 Dias)
                    </span>
                    {canViewMaintenance && (
                      <Button asChild size="sm" variant="ghost" className="text-xs gap-1">
                        <Link href="/dashboard/fleet/maintenance">
                          Ver todas <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Planejamento de paradas preventivas e corretivas agendadas para a próxima semana.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 3 }).map((_, idx) => (
                        <Skeleton key={idx} className="h-16 w-full rounded-lg" />
                      ))}
                    </div>
                  ) : !metrics || metrics.upcomingMaintenances.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-8 text-center text-sm text-slate-500">
                      Nenhuma manutenção agendada para os próximos 7 dias.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {metrics.upcomingMaintenances.map((m) => (
                        <div
                          key={m.id}
                          className="flex flex-col gap-3 rounded-lg border border-slate-200 dark:border-slate-800 p-4 md:flex-row md:items-center md:justify-between hover:bg-slate-50/50 dark:hover:bg-slate-900/50"
                        >
                          <div className="flex items-start gap-3">
                            <div className="rounded-full bg-amber-100 dark:bg-amber-950/40 p-2 text-amber-700 dark:text-amber-300">
                              <Calendar className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-900 dark:text-slate-100">{m.vehicle.plate}</span>
                                <span className="text-xs text-slate-500">• {m.vehicle.model}</span>
                                <Badge variant="outline" className="text-xs">
                                  {TYPE_LABEL[m.type]}
                                </Badge>
                              </div>
                              <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{m.description}</p>
                            </div>
                          </div>

                          <div className="text-xs text-slate-600 dark:text-slate-400 md:text-right">
                            <div className="font-medium">
                              {new Date(m.scheduledDate).toLocaleDateString('pt-BR')} às{' '}
                              {new Date(m.scheduledDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ABA 3: BLOQUEIOS OPERACIONAIS ATIVOS */}
            <TabsContent value="blocks" className="space-y-4">
              <Card className="border-slate-200 dark:border-slate-800">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <ShieldAlert className="h-5 w-5 text-red-600" />
                      Bloqueios Ativos de Veículos
                    </span>
                    {canViewVehicles && (
                      <Button asChild size="sm" variant="ghost" className="text-xs gap-1">
                        <Link href="/dashboard/fleet">
                          Ver Veículos <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Veículos impedidos de alocação operacional devido a falha de checklist (NOK), manutenção ou documento vencido.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 3 }).map((_, idx) => (
                        <Skeleton key={idx} className="h-16 w-full rounded-lg" />
                      ))}
                    </div>
                  ) : !metrics || metrics.activeBlocks.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-8 text-center text-sm text-slate-500">
                      <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                      Nenhum veículo com bloqueio ativo. Todos os ativos disponíveis estão liberados!
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {metrics.activeBlocks.map((b) => (
                        <div
                          key={b.id}
                          className="flex flex-col gap-2 rounded-lg border border-slate-200 dark:border-slate-800 p-4 md:flex-row md:items-center md:justify-between"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900 dark:text-slate-100">
                                {b.vehicle?.plate || 'Veículo'}
                              </span>
                              {b.vehicle?.model && (
                                <span className="text-xs text-slate-500">• {b.vehicle.model}</span>
                              )}
                              <Badge variant="destructive" className="text-xs">
                                {b.reason}
                              </Badge>
                            </div>
                            {b.notes && (
                              <p className="text-xs text-slate-600 dark:text-slate-400">{b.notes}</p>
                            )}
                          </div>
                          <div className="text-xs text-slate-500">
                            Bloqueado em {new Date(b.createdAt).toLocaleDateString('pt-BR')}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ABA 4: RESUMO DE DISPONIBILIDADE */}
            <TabsContent value="availability" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="border-slate-200 dark:border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-base">Distribuição de Status da Frota</CardTitle>
                    <CardDescription>Contagem consolidada por situação operacional dos ativos.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center p-2 rounded bg-slate-50 dark:bg-slate-900">
                      <span className="text-sm font-medium">Disponíveis</span>
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">
                        {statusDetails.AVAILABLE || 0}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded bg-slate-50 dark:bg-slate-900">
                      <span className="text-sm font-medium">Em Uso (Viagem / Rota)</span>
                      <Badge className="bg-blue-100 text-blue-800 border-blue-300">
                        {statusDetails.IN_USE || 0}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded bg-slate-50 dark:bg-slate-900">
                      <span className="text-sm font-medium">Em Manutenção</span>
                      <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                        {statusDetails.MAINTENANCE || 0}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded bg-slate-50 dark:bg-slate-900">
                      <span className="text-sm font-medium">Bloqueados</span>
                      <Badge className="bg-red-100 text-red-800 border-red-300">
                        {statusDetails.BLOCKED || 0}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 dark:border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-base">Diretrizes & Conformidade</CardTitle>
                    <CardDescription>Regras e sincronização com logística e portaria.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs text-slate-600 dark:text-slate-400">
                    <div className="p-3 border rounded-lg">
                      <p className="font-semibold text-slate-800 dark:text-slate-200 mb-1">
                        Regra de Disponibilidade Centralizada (D02)
                      </p>
                      <p>
                        Apenas veículos com status `AVAILABLE` e sem bloqueios ativos podem ser alocados em rotas ou receber liberação de saída.
                      </p>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <p className="font-semibold text-slate-800 dark:text-slate-200 mb-1">
                        Notificações de Alertas (D06)
                      </p>
                      <p>
                        Gestores cadastrados na filial recebem avisos imediatos por e-mail com chave de deduplicação idempotente.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}

function MetricCard({
  loading,
  title,
  value,
  description,
  icon,
  highlight,
}: {
  loading: boolean
  title: string
  value: number
  description: string
  icon: React.ReactNode
  highlight?: 'danger' | 'warning'
}) {
  const highlightClass =
    highlight === 'danger'
      ? 'border-red-300 dark:border-red-900 bg-red-50/20'
      : highlight === 'warning'
        ? 'border-amber-300 dark:border-amber-900 bg-amber-50/20'
        : 'border-slate-200 dark:border-slate-800'

  return (
    <Card className={`rounded-xl ${highlightClass}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4 space-y-0">
        <CardDescription className="text-xs font-medium text-slate-500">{title}</CardDescription>
        {icon}
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-1">
        {loading ? (
          <Skeleton className="h-8 w-16 rounded" />
        ) : (
          <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {value}
          </div>
        )}
        <p className="text-xs text-slate-500 mt-1">{description}</p>
      </CardContent>
    </Card>
  )
}
