'use client'

import type { ChangeEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2, Send, ShieldCheck, UserCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/context/auth-context'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'

type TicketDetails = {
  id: string
  code: number
  subject: string
  description: string
  status: string
  priority: string
  createdAt: string
  resolvedAt?: string | null
  closedAt?: string | null
  slaDueDate?: string | null
  resolutionDueDate?: string | null
  category?: { name: string } | null
  serviceCatalogItem?: {
    name: string
    requesterCanClose?: boolean
  } | null
  queue?: { id: string; name: string } | null
  requester?: { id: string; user?: { name?: string } | null } | null
  assignee?: { id: string; user?: { name?: string } | null } | null
  approvals?: Array<{
    id: string
    status: string
    approverId: string
    approver?: { user?: { name?: string } | null } | null
  }>
  messages?: Array<{
    id: string
    content: string
    internal?: boolean
    createdAt: string
    attachments?: Array<{ id: string; name: string; url: string }> | null
    author?: { id: string; user?: { name?: string } | null } | null
  }>
  attachments?: Array<{ id: string; name: string; url: string; messageId?: string | null }> | null
}

type QueueOption = {
  id: string
  name: string
}

type ActionReasons = {
  closeReasons: Array<{ id: string; name: string }>
  transferReasons: Array<{ id: string; name: string }>
}

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Aberto',
  IN_PROGRESS: 'Em atendimento',
  WAITING_USER: 'Aguardando usuário',
  RESOLVED: 'Resolvido',
  CLOSED: 'Fechado',
  REOPENED: 'Reaberto',
  NEW: 'Novo',
  TRIAGE: 'Em triagem',
  WAITING_ASSIGNMENT: 'Aguardando atendimento',
  WAITING_THIRD_PARTY: 'Aguardando terceiro',
  WAITING_APPROVAL: 'Aguardando aprovação',
  CANCELLED: 'Cancelado',
}

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',
}

function getStatusVariant(status: string) {
  if (status === 'RESOLVED' || status === 'CLOSED') return 'success'
  if (status === 'CANCELLED') return 'destructive'
  if (status === 'WAITING_APPROVAL' || status === 'WAITING_USER' || status === 'WAITING_THIRD_PARTY') return 'secondary'
  return 'default'
}

export default function TicketDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { user, hasPermission } = useAuth()
  const [ticket, setTicket] = useState<TicketDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [newMessage, setNewMessage] = useState('')
  const [internalNote, setInternalNote] = useState(false)
  const [attachment, setAttachment] = useState<File | null>(null)
  const [sending, setSending] = useState(false)
  const [acting, setActing] = useState(false)
  const [queueOptions, setQueueOptions] = useState<QueueOption[]>([])
  const [actionReasons, setActionReasons] = useState<ActionReasons>({
    closeReasons: [],
    transferReasons: [],
  })
  const [transferQueueId, setTransferQueueId] = useState('none')
  const [transferReasonId, setTransferReasonId] = useState('none')
  const [transferNote, setTransferNote] = useState('')
  const [closeReasonId, setCloseReasonId] = useState('none')

  const isRequester = useMemo(
    () => ticket?.requester?.id === user?.employeeId,
    [ticket?.requester?.id, user?.employeeId],
  )

  const hasPendingApproval = useMemo(
    () =>
      Boolean(
        ticket?.approvals?.some(
          (approval) =>
            approval.status === 'PENDING' && approval.approverId === user?.employeeId,
        ),
      ),
    [ticket?.approvals, user?.employeeId],
  )

  useEffect(() => {
    void fetchTicket()
  }, [params.id])

  useEffect(() => {
    void loadOperationalSupportData()
  }, [])

  async function fetchTicket() {
    setLoading(true)
    try {
      const { data } = await api.get(`/helpdesk/tickets/${params.id}`)
      setTicket(data)
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, 'Não foi possível carregar o chamado.'),
      )
      router.push('/dashboard/helpdesk')
    } finally {
      setLoading(false)
    }
  }

  async function loadOperationalSupportData() {
    try {
      const [{ data: queues }, { data: reasons }] = await Promise.all([
        api.get<QueueOption[]>('/helpdesk/queues'),
        api.get<ActionReasons>('/helpdesk/action-reasons'),
      ])
      setQueueOptions(queues)
      setActionReasons(reasons)
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, 'Não foi possível carregar dados operacionais do chamado.'),
      )
    }
  }

  async function handleSendMessage() {
    if (!newMessage.trim()) return

    setSending(true)
    try {
      const { data: message } = await api.post(`/helpdesk/tickets/${params.id}/messages`, {
        content: newMessage,
        internal: internalNote,
      })

      if (attachment) {
        const formData = new FormData()
        formData.append('file', attachment)
        const upload = await api.post('/uploads/helpdesk', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })

        await api.post(`/helpdesk/tickets/${params.id}/attachments`, {
          fileName: attachment.name,
          fileUrl: upload.data.url,
          mimeType: attachment.type || 'application/octet-stream',
          size: attachment.size,
          messageId: message.id,
        })
      }

      setNewMessage('')
      setInternalNote(false)
      setAttachment(null)
      toast.success('Mensagem enviada.')
      await fetchTicket()
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, 'Não foi possível enviar a mensagem.'),
      )
    } finally {
      setSending(false)
    }
  }

  async function runAction(
    endpoint: string,
    successMessage: string,
    payload?: Record<string, unknown>,
  ) {
    setActing(true)
    try {
      await api.post(endpoint, payload ?? {})
      toast.success(successMessage)
      await fetchTicket()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível executar a ação.'))
    } finally {
      setActing(false)
    }
  }

  async function handleReject() {
    const reason = window.prompt('Informe o motivo da reprovação deste chamado:')
    if (!reason?.trim()) return
    await runAction(`/helpdesk/tickets/${params.id}/reject`, 'Chamado reprovado.', {
      reason,
    })
  }

  async function handleTransfer() {
    if (transferQueueId === 'none') {
      toast.error('Selecione a fila de destino para transferir o chamado.')
      return
    }

    await runAction(`/helpdesk/tickets/${params.id}/transfer`, 'Chamado transferido.', {
      toQueueId: transferQueueId,
      transferReasonId: transferReasonId !== 'none' ? transferReasonId : undefined,
      reason: transferNote.trim() || undefined,
    })

    setTransferQueueId('none')
    setTransferReasonId('none')
    setTransferNote('')
  }

  if (loading) {
    return <div className="app-page text-sm text-muted-foreground">Carregando chamado...</div>
  }

  if (!ticket) {
    return null
  }

  return (
    <div className="app-page">
      <section className="app-page-header">
        <Button variant="ghost" className="w-fit" onClick={() => router.push('/dashboard/helpdesk')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para chamados
        </Button>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="app-kicker">Chamado #{ticket.code}</div>
            <h1 className="app-title">{ticket.subject}</h1>
            <p className="app-subtitle">
              Aberto em {new Date(ticket.createdAt).toLocaleString('pt-BR')} por{' '}
              {isRequester ? 'você' : ticket.requester?.user?.name || 'solicitante'}
            </p>
          </div>
          <Badge variant={getStatusVariant(ticket.status) as any}>
            {STATUS_LABELS[ticket.status] || ticket.status}
          </Badge>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="space-y-6">
          <div className="app-section-card space-y-3">
            <h2 className="section-title">Descrição</h2>
            <p className="rounded-2xl bg-muted/30 p-4 text-sm leading-6 text-foreground">
              {ticket.description}
            </p>
          </div>

          <div className="app-section-card space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <h2 className="section-title">Conversa do chamado</h2>
                <p className="text-sm text-muted-foreground">
                  Responda no próprio chamado para manter o histórico centralizado.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {ticket.messages?.map((message) => {
                const isMine = message.author?.id === user?.employeeId
                return (
                  <Card
                    key={message.id}
                    className={isMine ? 'border-primary/20 bg-primary/5' : ''}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">
                          {isMine ? 'Você' : message.author?.user?.name || 'Atendimento'}
                          {message.internal ? (
                            <Badge variant="outline" className="ml-2">
                              Nota interna
                            </Badge>
                          ) : null}
                        </span>
                        <span>
                          {new Date(message.createdAt).toLocaleString('pt-BR')}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 text-sm leading-6">
                      {message.content}
                      {message.attachments?.length ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {message.attachments.map((attachmentItem) => (
                            <a
                              key={attachmentItem.id}
                              href={attachmentItem.url}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-full border border-border px-3 py-1 text-xs text-primary underline-offset-4 hover:underline"
                            >
                              {attachmentItem.name}
                            </a>
                          ))}
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            <Card>
              <CardContent className="space-y-4 pt-6">
                <Textarea
                  className="min-h-[130px]"
                  placeholder="Digite uma atualização, dúvida ou resposta para o atendimento..."
                  value={newMessage}
                  onChange={(event) => setNewMessage(event.target.value)}
                />
                {hasPermission('helpdesk.ticket.manage') ||
                hasPermission('helpdesk.ticket.view.all') ||
                hasPermission('helpdesk.ticket.transfer') ? (
                  <label className="flex items-center gap-3 rounded-2xl border border-border bg-muted/20 px-4 py-3 text-sm">
                    <input
                      type="checkbox"
                      checked={internalNote}
                      onChange={(event) => setInternalNote(event.target.checked)}
                    />
                    Registrar como nota interna visível apenas para a operação
                  </label>
                ) : null}
                <div className="field-stack">
                  <Label htmlFor="message-attachment">Anexo opcional</Label>
                  <Input
                    id="message-attachment"
                    type="file"
                    accept=".png,.jpg,.jpeg,.gif,.pdf,.doc,.docx"
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setAttachment(event.target.files?.[0] || null)
                    }
                  />
                </div>
                <div className="flex justify-end">
                  <Button
                    onClick={handleSendMessage}
                    disabled={sending || !newMessage.trim()}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {sending ? 'Enviando...' : 'Responder'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="app-section-card space-y-4">
            <div className="space-y-1">
              <h2 className="section-title">Detalhes</h2>
              <p className="text-sm text-muted-foreground">
                Fila, serviço, prioridade e marcos principais do atendimento.
              </p>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <span className="text-muted-foreground">Serviço</span>
                <div className="font-medium">
                  {ticket.serviceCatalogItem?.name || 'Fluxo legado por categoria'}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Categoria</span>
                <div className="font-medium">{ticket.category?.name || 'Não informada'}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Fila</span>
                <div className="font-medium">{ticket.queue?.name || 'Sem fila'}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Prioridade</span>
                <div className="font-medium">
                  {PRIORITY_LABELS[ticket.priority] || ticket.priority}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Responsável</span>
                <div className="font-medium">
                  {ticket.assignee?.user?.name || 'Não atribuído'}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">SLA de resolução</span>
                <div className="font-medium">
                  {ticket.resolutionDueDate || ticket.slaDueDate
                    ? new Date(ticket.resolutionDueDate || ticket.slaDueDate || '').toLocaleString('pt-BR')
                    : 'Não calculado'}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Anexos do chamado</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {ticket.attachments?.filter((item) => !item.messageId).length ? (
                    ticket.attachments
                      ?.filter((item) => !item.messageId)
                      .map((item) => (
                        <a
                          key={item.id}
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full border border-border px-3 py-1 text-xs text-primary underline-offset-4 hover:underline"
                        >
                          {item.name}
                        </a>
                      ))
                  ) : (
                    <span className="font-medium">Sem anexos diretos</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="app-section-card space-y-3">
            <div className="space-y-1">
              <h2 className="section-title">Ações rápidas</h2>
              <p className="text-sm text-muted-foreground">
                Ações disponíveis conforme o estado atual e o seu papel no atendimento.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {!ticket.assignee && ticket.queue ? (
                <Button
                  variant="outline"
                  disabled={acting}
                  onClick={() =>
                    runAction(
                      `/helpdesk/tickets/${params.id}/pickup`,
                      'Chamado assumido com sucesso.',
                    )
                  }
                >
                  <UserCheck className="mr-2 h-4 w-4" />
                  Assumir chamado
                </Button>
              ) : null}

              {hasPendingApproval ? (
                <>
                  <Button
                    disabled={acting}
                    onClick={() =>
                      runAction(
                        `/helpdesk/tickets/${params.id}/approve`,
                        'Chamado aprovado.',
                      )
                    }
                  >
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Aprovar chamado
                  </Button>
                  <Button variant="outline" disabled={acting} onClick={handleReject}>
                    Reprovar chamado
                  </Button>
                </>
              ) : null}

              {ticket.assignee?.id === user?.employeeId ||
              hasPermission('helpdesk.ticket.manage') ? (
                <Button
                  variant="outline"
                  disabled={acting || ['RESOLVED', 'CLOSED', 'CANCELLED'].includes(ticket.status)}
                  onClick={() =>
                    runAction(
                      `/helpdesk/tickets/${params.id}/resolve`,
                      'Chamado marcado como resolvido.',
                    )
                  }
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Marcar como resolvido
                </Button>
              ) : null}

              {(isRequester || hasPermission('helpdesk.ticket.manage')) &&
              !['CLOSED', 'CANCELLED'].includes(ticket.status) ? (
                <div className="space-y-2">
                  <Label htmlFor="close-reason">Motivo de fechamento</Label>
                  <Select value={closeReasonId} onValueChange={setCloseReasonId}>
                    <SelectTrigger id="close-reason">
                      <SelectValue placeholder="Selecione o motivo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem motivo específico</SelectItem>
                      {actionReasons.closeReasons.map((reason) => (
                        <SelectItem key={reason.id} value={reason.id}>
                          {reason.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    disabled={acting}
                    onClick={() =>
                      runAction(`/helpdesk/tickets/${params.id}/close`, 'Chamado fechado.', {
                        closeReasonId: closeReasonId !== 'none' ? closeReasonId : undefined,
                      })
                    }
                  >
                    Fechar chamado
                  </Button>
                </div>
              ) : null}

              {['RESOLVED', 'CLOSED'].includes(ticket.status) ? (
                <Button
                  variant="outline"
                  disabled={acting}
                  onClick={() =>
                    runAction(`/helpdesk/tickets/${params.id}/reopen`, 'Chamado reaberto.')
                  }
                >
                  Reabrir chamado
                </Button>
              ) : null}

              {(hasPermission('helpdesk.ticket.transfer') ||
                hasPermission('helpdesk.ticket.manage')) &&
              ticket.queue ? (
                <div className="space-y-3 rounded-2xl border border-border bg-muted/20 p-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold">Transferir atendimento</h3>
                    <p className="text-xs text-muted-foreground">
                      Move o chamado para outra fila e limpa o responsável atual.
                    </p>
                  </div>
                  <div className="field-stack">
                    <Label htmlFor="transfer-queue">Fila de destino</Label>
                    <Select value={transferQueueId} onValueChange={setTransferQueueId}>
                      <SelectTrigger id="transfer-queue">
                        <SelectValue placeholder="Selecione a fila" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Selecione a fila</SelectItem>
                        {queueOptions
                          .filter((queue) => queue.id !== ticket.queue?.id)
                          .map((queue) => (
                            <SelectItem key={queue.id} value={queue.id}>
                              {queue.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="field-stack">
                    <Label htmlFor="transfer-reason">Motivo operacional</Label>
                    <Select value={transferReasonId} onValueChange={setTransferReasonId}>
                      <SelectTrigger id="transfer-reason">
                        <SelectValue placeholder="Selecione o motivo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem motivo específico</SelectItem>
                        {actionReasons.transferReasons.map((reason) => (
                          <SelectItem key={reason.id} value={reason.id}>
                            {reason.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="field-stack">
                    <Label htmlFor="transfer-note">Observação da transferência</Label>
                    <Textarea
                      id="transfer-note"
                      className="min-h-[100px]"
                      value={transferNote}
                      onChange={(event) => setTransferNote(event.target.value)}
                      placeholder="Explique por que este chamado deve seguir para outra fila."
                    />
                  </div>
                  <Button variant="outline" disabled={acting} onClick={handleTransfer}>
                    Transferir chamado
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
