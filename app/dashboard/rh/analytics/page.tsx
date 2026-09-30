'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Users,
  CalendarClock,
  Activity,
  TrendingUp,
  RotateCw,
} from 'lucide-react'
import { ManagerEffectivenessChart } from './components/manager-effectiveness'

interface DashboardMetrics {
  headcount: number
  pendingVacations: number
  turnoverRate: number
}

export default function HRAnalyticsPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchMetrics = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true)
      const res = await api.get('/hr-analytics/dashboard-metrics')
      setMetrics(res.data)
    } catch (error) {
      console.error('Failed to fetch HR metrics', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchMetrics()
  }, [])

  return (
    <div className="space-y-6">
      {/* 1. Standard Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Painel do Gestor (Analytics)
            </h1>
            <Badge variant="outline" className="border-border/60 bg-muted/40 text-xs font-normal">
              Inteligência RH
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Visão analítica de headcount, rotatividade, férias pendentes e indicadores de gestão.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchMetrics(true)}
            disabled={loading || refreshing}
            className="h-8 gap-1.5"
          >
            <RotateCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* 2. 4 KPI Summary Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="p-4 shadow-sm border-border/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Headcount Total
            </span>
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            {loading ? (
              <Skeleton className="h-9 w-16" />
            ) : (
              <span className="text-3xl font-bold tracking-tight text-foreground">
                {metrics?.headcount ?? 0}
              </span>
            )}
          </div>
          <span className="mt-1 block text-xs text-muted-foreground">
            Colaboradores ativos na hierarquia
          </span>
        </Card>

        <Card className="p-4 shadow-sm border-border/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Férias Pendentes
            </span>
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            {loading ? (
              <Skeleton className="h-9 w-16" />
            ) : (
              <>
                <span className="text-3xl font-bold tracking-tight text-foreground">
                  {metrics?.pendingVacations ?? 0}
                </span>
                {(metrics?.pendingVacations ?? 0) > 0 && (
                  <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-400 text-[10px] px-1.5 py-0">
                    Ação necessária
                  </Badge>
                )}
              </>
            )}
          </div>
          <span className="mt-1 block text-xs text-muted-foreground">
            Aguardando aprovação do gestor
          </span>
        </Card>

        <Card className="p-4 shadow-sm border-border/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Taxa de Turnover
            </span>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            {loading ? (
              <Skeleton className="h-9 w-16" />
            ) : (
              <span className="text-3xl font-bold tracking-tight text-foreground">
                {metrics?.turnoverRate ?? 0}%
              </span>
            )}
          </div>
          <span className="mt-1 block text-xs text-muted-foreground">
            Rotatividade no período atual
          </span>
        </Card>

        <Card className="p-4 shadow-sm border-border/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Eficácia da Gestão
            </span>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-bold tracking-tight text-foreground">
              Drill-down
            </span>
            <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-400 text-[10px] px-1.5 py-0">
              Interativo
            </Badge>
          </div>
          <span className="mt-1 block text-xs text-muted-foreground">
            Análise detalhada por liderança
          </span>
        </Card>
      </div>

      {/* 3. Main Chart Section */}
      <ManagerEffectivenessChart />
    </div>
  )
}
