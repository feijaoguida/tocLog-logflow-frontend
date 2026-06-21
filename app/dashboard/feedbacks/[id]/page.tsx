 'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { FeedbackStatusBadge } from '@/components/feedback/feedback-status-badge'
import { FeedbackVisibilityNote } from '@/components/feedback/feedback-visibility-note'
import { MenuFunctionHeader } from '@/components/layout/menu-function-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/context/auth-context'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'
import { adaptDemoFeedbacks } from '@/lib/feedback-demo'
import type { FeedbackRecord } from '@/lib/feedback-types'

export default function FeedbackDetailPage() {
  const params = useParams<{ id: string }>()
  const { user } = useAuth()
  const [feedback, setFeedback] = useState<FeedbackRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [usingFallback, setUsingFallback] = useState(false)
  const [reply, setReply] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const [confirmingRead, setConfirmingRead] = useState(false)

  async function loadFeedback() {
    try {
      const { data } = await api.get<FeedbackRecord>(`/feedbacks/${params.id}`)
      setFeedback(data)
      setUsingFallback(false)
    } catch (error) {
      const fallback = adaptDemoFeedbacks().find((item) => item.id === params.id)
      setFeedback(fallback || null)
      setUsingFallback(Boolean(fallback))
      toast.error(getApiErrorMessage(error, 'Nao foi possivel carregar o detalhe do feedback.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    async function load() {
      try {
        await loadFeedback()
      } catch {
        // loadFeedback already reports failure paths.
      }
    }

    void load()
  }, [params.id])

  const thread = useMemo(() => {
    if (!feedback) {
      return []
    }

    if (feedback.messages?.length) {
      return feedback.messages.map((message) => ({
        id: message.id,
        author: message.senderDisplayName || 'Participante da thread',
        time: message.createdAt,
        message: message.message,
      }))
    }

    return [
      {
        id: `${feedback.id}-msg-1`,
        author: feedback.createdByDisplayName || 'Autor da thread',
        time: feedback.createdAt,
        message: feedback.description,
      },
    ]
  }, [feedback])

  const canConfirmRead =
    Boolean(feedback?.requiresReadConfirmation) &&
    !feedback?.readAt &&
    feedback?.targetEmployeeId === user?.employeeId

  async function handleSendReply() {
    if (!reply.trim()) {
      toast.error('Digite uma mensagem antes de responder a thread.')
      return
    }

    setSendingReply(true)

    try {
      await api.post(`/feedbacks/${params.id}/messages`, {
        message: reply.trim(),
      })
      setReply('')
      await loadFeedback()
      toast.success('Resposta enviada com sucesso.')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Nao foi possivel responder a thread.'))
    } finally {
      setSendingReply(false)
    }
  }

  async function handleConfirmRead() {
    setConfirmingRead(true)

    try {
      await api.patch(`/feedbacks/${params.id}/read-confirmation`, { read: true })
      await loadFeedback()
      toast.success('Leitura confirmada com sucesso.')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Nao foi possivel confirmar a leitura.'))
    } finally {
      setConfirmingRead(false)
    }
  }

  return (
    <div className="app-page">
      <MenuFunctionHeader
        title="Recursos Humanos > Feedbacks > Detalhe"
        description="Visual operacional da thread, com status, metadados da privacidade e leitura contextual da regra de visibilidade para RH."
        actions={
          <Button asChild variant="outline">
            <Link href="/dashboard/feedbacks">Voltar</Link>
          </Button>
        }
      >
        {usingFallback ? (
          <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
            Modo demonstrativo ativo enquanto o detalhe real da API e validado.
          </div>
        ) : null}
        {feedback ? (
          <div className="flex flex-wrap items-center gap-2">
            <FeedbackStatusBadge status={feedback.status} />
            {feedback.hrVisibilityLabel !== null ? (
              <FeedbackVisibilityNote
                isOneToOne={feedback.type === 'ONE_TO_ONE'}
                visibleToHr={feedback.isVisibleToHR}
              />
            ) : null}
          </div>
        ) : null}
      </MenuFunctionHeader>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="app-section-card">
          <CardHeader>
            <CardTitle className="text-xl">{loading ? 'Carregando thread...' : feedback?.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              Array.from({ length: 2 }).map((_, index) => (
                <div key={index} className="rounded-[20px] border border-border/70 bg-card/60 p-4">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="mt-3 h-4 w-full" />
                  <Skeleton className="mt-2 h-4 w-3/4" />
                </div>
              ))
            ) : thread.map((message) => (
              <div key={message.id} className="rounded-[20px] border border-border/70 bg-card/60 p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{message.author}</span>
                  <span>{message.time}</span>
                </div>
                <p className="text-sm leading-6 text-muted-foreground">{message.message}</p>
              </div>
            ))}

            {!loading && !usingFallback && feedback ? (
              <div className="space-y-3 rounded-[20px] border border-dashed border-border/80 bg-muted/20 p-4">
                <h3 className="text-sm font-semibold tracking-tight text-foreground">Responder thread</h3>
                <Textarea
                  rows={4}
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                  placeholder="Adicione contexto, resposta ou complemento para esta conversa."
                />
                <div className="flex flex-wrap gap-3">
                  <Button onClick={handleSendReply} disabled={sendingReply}>
                    {sendingReply ? 'Enviando...' : 'Enviar resposta'}
                  </Button>
                  {canConfirmRead ? (
                    <Button
                      variant="outline"
                      onClick={handleConfirmRead}
                      disabled={confirmingRead}
                    >
                      {confirmingRead ? 'Confirmando...' : 'Confirmar leitura'}
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="app-section-card h-fit">
          <CardHeader>
            <CardTitle className="text-lg">Metadados da thread</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
            {loading || !feedback ? (
              <>
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-4 w-36" />
              </>
            ) : (
              <>
                <p>Tipo: {feedback.type}</p>
                <p>Categoria: {feedback.category}</p>
                <p>Autor exibido: {feedback.createdByDisplayName || 'Nao informado'}</p>
                {feedback.targetEmployee?.user?.name ? <p>Destino: {feedback.targetEmployee.user.name}</p> : null}
                <p>Anonimo: {feedback.isAnonymous ? 'Sim' : 'Nao'}</p>
                <p>RH acompanha: {feedback.isVisibleToHR ? 'Sim' : 'Nao'}</p>
                <p>Confirmacao de leitura: {feedback.requiresReadConfirmation ? 'Obrigatoria' : 'Nao exigida'}</p>
                <p>Leitura confirmada: {feedback.readAt ? 'Sim' : 'Nao'}</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
