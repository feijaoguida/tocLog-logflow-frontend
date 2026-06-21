 'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { FeedbackStatusBadge } from '@/components/feedback/feedback-status-badge'
import { FeedbackVisibilityNote } from '@/components/feedback/feedback-visibility-note'
import { MenuFunctionHeader } from '@/components/layout/menu-function-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'
import { adaptDemoFeedbacks, demoSurveys } from '@/lib/feedback-demo'
import type { FeedbackRecord } from '@/lib/feedback-types'

export default function FeedbacksPage() {
  const [feedbacks, setFeedbacks] = useState<FeedbackRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [usingFallback, setUsingFallback] = useState(false)

  useEffect(() => {
    async function loadFeedbacks() {
      try {
        const { data } = await api.get<FeedbackRecord[]>('/feedbacks')
        setFeedbacks(data)
        setUsingFallback(false)
      } catch (error) {
        setFeedbacks(adaptDemoFeedbacks())
        setUsingFallback(true)
        toast.error(getApiErrorMessage(error, 'Nao foi possivel carregar a caixa de feedbacks.'))
      } finally {
        setLoading(false)
      }
    }

    loadFeedbacks()
  }, [])

  const companyCount = useMemo(
    () => feedbacks.filter((item) => item.type === 'EMPLOYEE_TO_COMPANY').length,
    [feedbacks],
  )
  const peerCount = useMemo(
    () => feedbacks.filter((item) => item.type === 'ONE_TO_ONE').length,
    [feedbacks],
  )

  return (
    <div className="app-page">
      <MenuFunctionHeader
        title="Recursos Humanos > Feedbacks"
        description="Central operacional do modulo de feedback, com caixa do colaborador, historico das trilhas e sinalizacao de privacidade para conversas 1 para 1."
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/dashboard/rh/settings">Configuracoes RH</Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard/feedbacks/new">Novo feedback</Link>
            </Button>
          </>
        }
      >
        <div className="rounded-[24px] border border-primary/15 bg-primary/6 px-4 py-3 text-sm leading-6 text-muted-foreground">
          Feedbacks 1 para 1 so aparecem para RH em denuncias ou quando houver autorizacao explicita.
          A tela tambem destaca quando um item esta ou nao sob acompanhamento do RH.
        </div>
        {usingFallback ? (
          <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
            Pendente de validacao: a tela entrou em modo demonstrativo porque a API do modulo ainda nao respondeu como esperado.
          </div>
        ) : null}
      </MenuFunctionHeader>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="app-section-card">
          <CardHeader>
            <CardTitle className="text-base">Feedbacks para empresa</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight">{companyCount}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Entradas que dependem de triagem, resposta e possivel roteamento configuravel do RH.
            </p>
          </CardContent>
        </Card>
        <Card className="app-section-card">
          <CardHeader>
            <CardTitle className="text-base">Conversas 1 para 1</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight">{peerCount}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              O label de visibilidade deixa claro quando RH tambem acompanha a thread.
            </p>
          </CardContent>
        </Card>
        <Card className="app-section-card">
          <CardHeader>
            <CardTitle className="text-base">Pesquisas ativas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight">{demoSurveys.length}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Surveys curtas convivem com a caixa de feedback e alimentam o dashboard do RH.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="app-section-card space-y-4">
        <div className="space-y-2">
          <p className="app-kicker">Fila inicial</p>
          <h2 className="text-2xl font-semibold tracking-tight">Threads com destaque de privacidade</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            A lista abaixo usa dados demonstrativos do dominio para representar o comportamento esperado enquanto a integracao backend segue sendo endurecida.
          </p>
        </div>

        <div className="space-y-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="rounded-[24px] border border-border/70 bg-card/80 p-5">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="mt-4 h-5 w-72" />
                <Skeleton className="mt-2 h-4 w-full" />
                <Skeleton className="mt-2 h-4 w-3/4" />
              </div>
            ))
          ) : feedbacks.map((feedback) => (
            <Link
              key={feedback.id}
              href={`/dashboard/feedbacks/${feedback.id}`}
              className="block rounded-[24px] border border-border/70 bg-card/80 p-5 transition hover:border-primary/35 hover:bg-card"
            >
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <FeedbackStatusBadge status={feedback.status} />
                    {feedback.hrVisibilityLabel !== null ? (
                      <FeedbackVisibilityNote
                        isOneToOne={feedback.type === 'ONE_TO_ONE'}
                        visibleToHr={feedback.isVisibleToHR}
                      />
                    ) : null}
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold tracking-tight text-foreground">{feedback.title}</h3>
                    <p className="max-w-4xl text-sm leading-6 text-muted-foreground">{feedback.description}</p>
                  </div>
                </div>
                <div className="min-w-[240px] space-y-1 text-sm text-muted-foreground xl:text-right">
                  <p>Tipo: {feedback.type}</p>
                  <p>Categoria: {feedback.category}</p>
                  <p>Autor exibido: {feedback.createdByDisplayName || 'Nao informado'}</p>
                  {feedback.targetEmployee?.user?.name ? <p>Destino: {feedback.targetEmployee.user.name}</p> : null}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
