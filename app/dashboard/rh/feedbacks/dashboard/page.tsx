 'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { MenuFunctionHeader } from '@/components/layout/menu-function-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'
import { adaptDemoFeedbacks, demoFeedbacks, demoSurveys } from '@/lib/feedback-demo'
import type { FeedbackDashboardRecord } from '@/lib/feedback-types'

export default function HrFeedbackDashboardPage() {
  const [dashboard, setDashboard] = useState<FeedbackDashboardRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [usingFallback, setUsingFallback] = useState(false)

  useEffect(() => {
    async function loadDashboard() {
      try {
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
            IMPROVEMENT_IDEA: demoFeedbacks.filter((item) => item.category === 'IMPROVEMENT_IDEA').length,
            REPORT: demoFeedbacks.filter((item) => item.category === 'REPORT').length,
          },
          pendingFeedbacks: demoFeedbacks.filter((item) => ['OPEN', 'IN_REVIEW'].includes(item.status)).length,
          averageResponseTimeHours: 6.4,
          satisfactionScore: 3.2,
          latestFeedbacks: adaptDemoFeedbacks(),
        })
        setUsingFallback(true)
        toast.error(getApiErrorMessage(error, 'Nao foi possivel carregar o dashboard de feedbacks.'))
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [])

  const openCount = dashboard?.byStatus?.OPEN ?? 0
  const reviewCount = dashboard?.byStatus?.IN_REVIEW ?? 0
  const reportCount = dashboard?.byCategory?.REPORT ?? 0
  const averageResponseHours = dashboard?.averageResponseTimeHours ?? 0
  const latestFeedbacks = useMemo(() => dashboard?.latestFeedbacks ?? [], [dashboard])

  return (
    <div className="app-page">
      <MenuFunctionHeader
        title="Recursos Humanos > Feedbacks > Dashboard"
        description="Painel gerencial do modulo, reunindo status, denuncias, pesquisas e a regra de privacidade para feedbacks 1 para 1."
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/dashboard/rh/settings">Configuracoes RH</Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard/feedbacks">Abrir caixa operacional</Link>
            </Button>
          </>
        }
      >
        {usingFallback ? (
          <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
            Modo demonstrativo ativo enquanto o dashboard real do backend e estabilizado.
          </div>
        ) : null}
      </MenuFunctionHeader>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="app-section-card">
          <CardHeader><CardTitle className="text-base">Abertos</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-semibold">{loading ? '-' : openCount}</p></CardContent>
        </Card>
        <Card className="app-section-card">
          <CardHeader><CardTitle className="text-base">Em analise</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-semibold">{loading ? '-' : reviewCount}</p></CardContent>
        </Card>
        <Card className="app-section-card">
          <CardHeader><CardTitle className="text-base">Denuncias com visibilidade RH</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-semibold">{loading ? '-' : reportCount}</p></CardContent>
        </Card>
        <Card className="app-section-card">
          <CardHeader><CardTitle className="text-base">Tempo medio de resposta</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-semibold">{loading ? '-' : `${averageResponseHours.toFixed(1)}h`}</p></CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="app-section-card">
          <CardHeader>
            <CardTitle className="text-xl">Ultimos feedbacks relevantes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="rounded-[20px] border border-border/70 bg-card/60 p-4">
                  <Skeleton className="h-5 w-56" />
                  <Skeleton className="mt-2 h-4 w-40" />
                </div>
              ))
            ) : latestFeedbacks.map((feedback) => (
              <div key={feedback.id} className="rounded-[20px] border border-border/70 bg-card/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{feedback.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {feedback.type} · {feedback.category}
                    </p>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/dashboard/feedbacks/${feedback.id}`}>Abrir thread</Link>
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="app-section-card h-fit">
          <CardHeader>
            <CardTitle className="text-xl">Pesquisas e governanca</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-6 text-muted-foreground">
            {demoSurveys.map((survey) => (
              <div key={survey.id} className="rounded-[20px] border border-border/70 bg-card/60 p-4">
                <p className="font-medium text-foreground">{survey.title}</p>
                <p>{survey.type} · taxa de resposta {survey.responseRate}%</p>
                <p>Media atual: {survey.averageScore ?? '-'} </p>
              </div>
            ))}
            <p>
              Pendente de validacao: consolidacao final dos KPIs via backend e persistencia das configuracoes
              de roteamento dentro do RH.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
