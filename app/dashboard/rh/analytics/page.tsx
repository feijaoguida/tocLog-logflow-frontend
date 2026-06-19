'use client'

import { useState, useEffect } from 'react'
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, CalendarClock, Briefcase, Activity } from "lucide-react"
import { ManagerEffectivenessChart } from "./components/manager-effectiveness"

interface DashboardMetrics {
  headcount: number;
  pendingVacations: number;
  turnoverRate: number;
}

export default function HRAnalyticsPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await api.get('/hr-analytics/dashboard-metrics')
        setMetrics(res.data)
      } catch (error) {
        console.error('Failed to fetch HR metrics', error)
      } finally {
        setLoading(false)
      }
    }
    fetchMetrics()
  }, [])

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Carregando métricas...</div>
  }

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Painel do Gestor (RH)</h1>
        <p className="text-muted-foreground mt-2">
          Visão interativa das métricas do seu escopo de gestão.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Headcount (Total Cuidada)</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.headcount || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Colaboradores ativos na hierarquia</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Férias Pendentes</CardTitle>
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.pendingVacations || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Aguardando sua aprovação</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Turnover</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.turnoverRate || 0}%</div>
            <p className="text-xs text-muted-foreground mt-1">Rotatividade no período</p>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Relatório em Destaque</CardTitle>
            <Briefcase className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium mt-2">Eficácia da Gestão</div>
            <p className="text-xs text-muted-foreground mt-1">Acesse a análise detalhada com drill-down.</p>
          </CardContent>
        </Card>
      </div>
      
      <ManagerEffectivenessChart />
    </div>
  )
}
