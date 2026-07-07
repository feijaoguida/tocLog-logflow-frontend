'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { AlertCircle, Calendar, Car, ShieldAlert, Wrench } from 'lucide-react'
import { toast } from 'sonner'

import { MenuFunctionHeader } from '@/components/layout/menu-function-header'
import { WorkspaceStateCard } from '@/components/layout/workspace-state-card'
import { useAuth } from '@/context/auth-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'

type FleetMetricsRecord = {
  total: number
  statusDetails: Partial<Record<'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'BLOCKED', number>>
  activeMaintenances: number
  upcomingMaintenances: Array<{
    id: string
    type: 'PREVENTIVE' | 'CORRECTIVE'
    description: string
    scheduledDate: string
    vehicle: {
      id: string
      plate: string
      model: string
    }
  }>
}

const TYPE_LABEL: Record<'PREVENTIVE' | 'CORRECTIVE', string> = {
  PREVENTIVE: 'Preventiva',
  CORRECTIVE: 'Corretiva',
}

export default function FleetDashboardPage() {
  const { hasPermission } = useAuth()
  const canViewDashboard = hasPermission('fleet.dashboard.view')

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [metrics, setMetrics] = useState<FleetMetricsRecord | null>(null)

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
    <div className="app-page">
      <MenuFunctionHeader
        title="Frota > Dashboard"
        description="Painel resumido da frota interna com disponibilidade, manutenções ativas e próximos alertas operacionais."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => void loadMetrics(false)} disabled={loading || refreshing}>
              {refreshing ? 'Atualizando...' : 'Atualizar leitura'}
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/fleet/maintenance">Manutenções</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/fleet">Veículos</Link>
            </Button>
          </div>
        }
      />

      {!canViewDashboard ? (
        <WorkspaceStateCard title="Acesso restrito">
          <p>Este perfil não pode visualizar os indicadores da frota interna.</p>
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

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              loading={loading}
              title="Total da frota"
              value={metrics?.total ?? 0}
              description={`${statusDetails.AVAILABLE || 0} disponíveis`}
              icon={<Car className="h-4 w-4 text-muted-foreground" />}
            />
            <MetricCard
              loading={loading}
              title="Em manutenção"
              value={statusDetails.MAINTENANCE || 0}
              description="Veículos indisponíveis no momento"
              icon={<Wrench className="h-4 w-4 text-amber-500" />}
            />
            <MetricCard
              loading={loading}
              title="Manutenções ativas"
              value={metrics?.activeMaintenances ?? 0}
              description="Agendadas ou em andamento"
              icon={<AlertCircle className="h-4 w-4 text-sky-500" />}
            />
            <MetricCard
              loading={loading}
              title="Em uso"
              value={statusDetails.IN_USE || 0}
              description={`${statusDetails.BLOCKED || 0} bloqueados`}
              icon={<Car className="h-4 w-4 text-green-600" />}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
            <Card className="app-section-card">
              <CardHeader>
                <CardTitle className="text-xl">Próximas manutenções</CardTitle>
                <CardDescription>
                  Alertas dos próximos 7 dias para acompanhamento da operação.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <Skeleton key={index} className="h-16 w-full rounded-2xl" />
                    ))}
                  </div>
                ) : metrics && metrics.upcomingMaintenances.length > 0 ? (
                  <div className="space-y-3">
                    {metrics.upcomingMaintenances.map((maintenance) => (
                      <div key={maintenance.id} className="flex flex-col gap-3 rounded-2xl border p-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-start gap-3">
                          <div className="rounded-full bg-amber-100 p-2 text-amber-700">
                            <Calendar className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium">{maintenance.vehicle.plate}</p>
                            <p className="text-sm text-muted-foreground">{maintenance.vehicle.model}</p>
                            <p className="mt-1 text-sm">{maintenance.description}</p>
                          </div>
                        </div>
                        <div className="text-sm md:text-right">
                          <p className="font-medium">
                            {new Date(maintenance.scheduledDate).toLocaleDateString('pt-BR')}
                          </p>
                          <p className="text-muted-foreground">
                            {new Date(maintenance.scheduledDate).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                          <Badge variant="outline" className="mt-2">
                            {TYPE_LABEL[maintenance.type]}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                    Nenhuma manutenção próxima encontrada para os próximos 7 dias.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="app-section-card">
              <CardHeader>
                <CardTitle className="text-xl">Leitura operacional</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="rounded-2xl border p-4">
                  <p className="font-medium text-foreground">Tenant isolado</p>
                  <p>Os indicadores agora refletem apenas a frota interna visível para a empresa atual.</p>
                </div>
                <div className="rounded-2xl border p-4">
                  <p className="font-medium text-foreground">Integração com operação</p>
                  <p>Use este painel em conjunto com veículos, manutenções e checklists para entender bloqueios antes de alocar em `shipments`.</p>
                </div>
                <div className="flex items-start gap-2 rounded-2xl border border-dashed p-4">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    Se algum número parecer inconsistente, revalide em `Veículos` e `Manutenções` para conferir o estado detalhado dos ativos.
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
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
}: {
  loading: boolean
  title: string
  value: number
  description: string
  icon: React.ReactNode
}) {
  return (
    <Card className="app-section-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardDescription>{title}</CardDescription>
          {loading ? <Skeleton className="mt-2 h-8 w-20 rounded-xl" /> : <CardTitle className="text-3xl">{value}</CardTitle>}
        </div>
        {icon}
      </CardHeader>
      <CardContent className="pt-0 text-sm text-muted-foreground">{description}</CardContent>
    </Card>
  )
}
