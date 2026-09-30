'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  Clock,
  ExternalLink,
  Inbox,
  MessageSquare,
  RotateCw,
  Search,
  Settings,
  ShieldAlert,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'
import { adaptDemoFeedbacks, demoFeedbacks, demoSurveys } from '@/lib/feedback-demo'
import type { FeedbackDashboardRecord } from '@/lib/feedback-types'

export default function HrFeedbackDashboardPage() {
  const [dashboard, setDashboard] = useState<FeedbackDashboardRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [usingFallback, setUsingFallback] = useState(false)

  const loadDashboard = async () => {
    try {
      setLoading(true)
      const { data } = await api.get<FeedbackDashboardRecord>('/feedbacks/dashboard')
      setDashboard(data)
      setUsingFallback(false)
    } catch (error) {
      setDashboard({
        totalFeedbacks: demoFeedbacks.length,
        byStatus: {
          OPEN: demoFeedbacks.filter((item) => item.status === 'OPEN').length,
          IN_REVIEW: demoFeedbacks.filter((item) => item.status === 'IN_REVIEW').length,
          ANSWERED: demoFeedbacks.filter((item) => item.status === 'ANSWERED').length,
          CLOSED: demoFeedbacks.filter((item) => item.status === 'CLOSED').length,
        },
        byCategory: {
          SUGGESTION: demoFeedbacks.filter((item) => item.category === 'SUGGESTION').length,
          COMPLAINT: demoFeedbacks.filter((item) => item.category === 'COMPLAINT').length,
          PRAISE: demoFeedbacks.filter((item) => item.category === 'PRAISE').length,
          IMPROVEMENT_IDEA: demoFeedbacks.filter(
            (item) => item.category === 'IMPROVEMENT_IDEA',
          ).length,
          REPORT: demoFeedbacks.filter((item) => item.category === 'REPORT').length,
        },
        pendingFeedbacks: demoFeedbacks.filter((item) =>
          ['OPEN', 'IN_REVIEW'].includes(item.status),
        ).length,
        averageResponseTimeHours: 6.4,
        satisfactionScore: 3.2,
        latestFeedbacks: adaptDemoFeedbacks(),
      })
      setUsingFallback(true)
      toast.error(
        getApiErrorMessage(error, 'Não foi possível carregar o dashboard de feedbacks em tempo real.'),
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadDashboard()
  }, [])

  const openCount = dashboard?.byStatus?.OPEN ?? 0
  const reviewCount = dashboard?.byStatus?.IN_REVIEW ?? 0
  const reportCount = dashboard?.byCategory?.REPORT ?? 0
  const averageResponseHours = dashboard?.averageResponseTimeHours ?? 0
  const latestFeedbacks = useMemo(() => dashboard?.latestFeedbacks ?? [], [dashboard])

  return (
    <div className="app-page space-y-6">
      {/* 1. Cabeçalho Padronizado */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Dashboard de Feedbacks
          </h1>
          <p className="text-sm text-muted-foreground">
            Painel gerencial de ouvidoria, denúncias corporativas, pesquisas de clima e governança 1 para 1.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm" className="h-9 gap-1.5 font-semibold">
            <Link href="/dashboard/feedbacks">
              <Inbox className="size-4" />
              <span>Caixa operacional</span>
            </Link>
          </Button>

          <Button asChild variant="outline" size="sm" className="h-9 gap-1.5">
            <Link href="/dashboard/rh/settings">
              <Settings className="size-4" />
              <span>Configurações RH</span>
            </Link>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            onClick={() => void loadDashboard()}
            disabled={loading}
          >
            <RotateCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </Button>
        </div>
      </section>

      {usingFallback && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-300">
          Modo demonstrativo ativo enquanto os dados em tempo real são sincronizados pelo servidor.
        </div>
      )}

      {/* 2. Cards de Resumo (KPIs em 4 colunas) */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Abertos */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Abertos
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2 flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-foreground">
                {loading ? '-' : openCount}
              </span>
              {openCount > 0 && (
                <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                  Ação necessária
                </span>
              )}
            </div>
            <MessageSquare className="size-5 text-amber-500/60" />
          </CardContent>
        </Card>

        {/* Em Análise */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Em Análise
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {loading ? '-' : reviewCount}
            </span>
            <Clock className="size-5 text-sky-500/60" />
          </CardContent>
        </Card>

        {/* Denúncias RH */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Denúncias (RH)
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2 flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-foreground">
                {loading ? '-' : reportCount}
              </span>
              {reportCount > 0 && (
                <span className="rounded-md bg-rose-500/10 px-2 py-0.5 text-xs font-medium text-rose-700 dark:text-rose-400">
                  Sensível
                </span>
              )}
            </div>
            <ShieldAlert className="size-5 text-rose-500/60" />
          </CardContent>
        </Card>

        {/* Tempo Médio */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tempo Médio Resposta
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {loading ? '-' : `${averageResponseHours.toFixed(1)}h`}
            </span>
            <span className="text-xs font-medium text-muted-foreground">SLA Médio</span>
          </CardContent>
        </Card>
      </section>

      {/* 3. Seção Principal */}
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* Feedbacks Recentes */}
        <Card className="app-section-card overflow-hidden">
          <CardHeader className="p-5 pb-3 border-b border-border/70">
            <h3 className="text-sm font-semibold text-foreground">
              Últimos Feedbacks Relevantes
            </h3>
            <p className="text-xs text-muted-foreground">
              Demandas abertas recentemente pelos colaboradores que requerem acompanhamento.
            </p>
          </CardHeader>
          <CardContent className="p-5 space-y-3">
            {loading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-border/70 bg-card/60 p-4"
                >
                  <Skeleton className="h-5 w-56" />
                  <Skeleton className="mt-2 h-4 w-40" />
                </div>
              ))
            ) : latestFeedbacks.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-6 text-center">
                Nenhum feedback registrado até o momento.
              </p>
            ) : (
              latestFeedbacks.map((feedback) => (
                <div
                  key={feedback.id}
                  className="rounded-lg border border-border/70 bg-card/60 p-4 transition-all hover:border-border hover:shadow-2xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <p className="font-semibold text-sm text-foreground">
                        {feedback.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {feedback.type} • {feedback.category}
                      </p>
                    </div>
                    <Button asChild size="sm" variant="outline" className="h-8 text-xs">
                      <Link href={`/dashboard/feedbacks/${feedback.id}`}>
                        <ExternalLink className="mr-1.5 size-3.5" />
                        Abrir thread
                      </Link>
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Pesquisas e Governança */}
        <Card className="app-section-card overflow-hidden h-fit">
          <CardHeader className="p-5 pb-3 border-b border-border/70">
            <h3 className="text-sm font-semibold text-foreground">
              Pesquisas de Clima & Governança
            </h3>
            <p className="text-xs text-muted-foreground">
              Acompanhamento dos instrumentos de escuta ativa da organização.
            </p>
          </CardHeader>
          <CardContent className="p-5 space-y-3 text-xs leading-relaxed text-muted-foreground">
            {demoSurveys.map((survey) => (
              <div
                key={survey.id}
                className="rounded-lg border border-border/70 bg-card/60 p-3.5 space-y-1"
              >
                <p className="font-semibold text-sm text-foreground">
                  {survey.title}
                </p>
                <p>
                  {survey.type} • taxa de resposta{' '}
                  <span className="font-semibold text-foreground">
                    {survey.responseRate}%
                  </span>
                </p>
                <p>
                  Média atual:{' '}
                  <span className="font-semibold text-foreground">
                    {survey.averageScore ?? '-'} / 5.0
                  </span>
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
