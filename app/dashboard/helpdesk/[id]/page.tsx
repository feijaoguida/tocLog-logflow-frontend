'use client'

import type { ChangeEvent } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2, Send, ShieldCheck, UserCheck } from 'lucide-react'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
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
import { AttachmentDownload, SlaStatus, uploadHelpdeskFile, type Sla } from '../operations'

type TicketDetails = {
  id: string
  version: number
  allowedActions: string[]
  sla?: Sla | null
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
  requester?: { id: string; user?: { id?: string; name?: string } | null } | null
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

export default function TicketDetailsPage() {
  const params = useParams<{ id: string | string[] }>()
  const id = params.id
  if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(id) || ['undefined', 'null'].includes(id)) {
    return <div className="app-page" role="alert" aria-label="Erro do chamado">Identificador de chamado inválido.</div>
  }
  return <TicketDetailsContent key={id} ticketId={id} />
}

function TicketDetailsContent({ ticketId }: { ticketId: string }) {
  const router = useRouter()
  const { user } = useAuth()
  const [ticket, setTicket] = useState<TicketDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
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

  const isRequester = ticket?.requester?.user?.id === user?.id
  const can = (action: string) => ticket?.allowedActions?.includes(action) ?? false
  const lock = useRef(false)
  const [actionError, setActionError] = useState('')
  const [reason, setReason] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [candidates, setCandidates] = useState<{ id: string; user: { name: string }; eligible: boolean }[]>([])
  const [candidateCursor, setCandidateCursor] = useState<string | null>(null)
  const [messageId, setMessageId] = useState<string | null>(null)
  const [uploadId, setUploadId] = useState<string | null>(null)
  const canTransfer = can('transfer')
  const canAssign = can('assign')
  const assignmentQueueId = ticket?.queue?.id
  const fetchTicket = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setLoadError(null)
    try {
      const { data } = await api.get<TicketDetails>(`/helpdesk/tickets/${ticketId}`, { signal })
      if (!signal?.aborted) setTicket(data)
    } catch (error) {
      if (signal?.aborted) return
      const status = isAxiosError(error) ? error.response?.status : undefined
      setLoadError(status === 404 ? 'Chamado não encontrado.' : status === 403
        ? 'Você não tem permissão para acessar este chamado.'
        : status === undefined ? 'Não foi possível conectar ao atendimento. Tente novamente.'
        : getApiErrorMessage(error, 'Não foi possível carregar o chamado. Tente novamente.'))
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [ticketId])

  useEffect(() => {
    const controller = new AbortController()
    void fetchTicket(controller.signal)
    return () => controller.abort()
  }, [fetchTicket])

  useEffect(() => {
    const controller = new AbortController()
    if (canTransfer) void api.get<QueueOption[]>(`/helpdesk/tickets/${ticketId}/transfer-targets`, { signal: controller.signal })
      .then(({ data }) => setQueueOptions(data)).catch(() => {})
    if (canTransfer) void api.get<ActionReasons>('/helpdesk/action-reasons', { signal: controller.signal })
      .then(({ data }) => setActionReasons(data)).catch(() => {})
    if (canAssign && assignmentQueueId) void api.get(`/helpdesk/queues/${assignmentQueueId}/candidates`, { params: { purpose: 'ASSIGNEE' }, signal: controller.signal })
      .then(({ data }) => { setCandidates(data.items); setCandidateCursor(data.nextCursor) }).catch(() => {})
    return () => controller.abort()
  }, [canTransfer, canAssign, assignmentQueueId, ticketId])

  async function reportFailure(error: unknown) {
    const status = isAxiosError(error) ? error.response?.status : undefined
    setActionError(status === 409 ? 'O chamado foi atualizado. Dados recarregados; seu rascunho foi preservado.' : getApiErrorMessage(error, 'Não foi possível executar a ação.'))
    if (status === 409 || status === 403) await fetchTicket()
  }

  async function handleSendMessage() {
    if (lock.current || !newMessage.trim() || ticket?.id !== ticketId || loadError) return
    lock.current = true; setSending(true); setActionError('')
    let savedMessage = messageId
    try {
      if (!savedMessage) {
        const { data } = await api.post(`/helpdesk/tickets/${ticketId}/messages`, {
          content: newMessage, internal: can('internalNote') && (internalNote || !can('reply')), expectedVersion: ticket.version,
        })
        savedMessage = data.id; setMessageId(savedMessage)
      }
      if (attachment) {
        const uploaded = uploadId ?? await uploadHelpdeskFile(attachment)
        setUploadId(uploaded)
        await api.post(`/helpdesk/tickets/${ticketId}/attachments`, { uploadId: uploaded, messageId: savedMessage })
      }
      setNewMessage(''); setInternalNote(false); setAttachment(null); setMessageId(null); setUploadId(null)
      toast.success('Mensagem enviada.'); await fetchTicket()
    } catch (error) {
      await reportFailure(error)
      if (savedMessage) setActionError('Mensagem enviada; o anexo falhou. Tente novamente para enviar somente o anexo.')
    } finally { lock.current = false; setSending(false) }
  }

  async function runAction(endpoint: string, successMessage: string, payload?: Record<string, unknown>) {
    if (lock.current || ticket?.id !== ticketId || loadError) return false
    lock.current = true; setActing(true); setActionError('')
    try {
      await api.post(endpoint, { ...payload, expectedVersion: ticket.version })
      toast.success(successMessage)
      if (endpoint.endsWith('/transfer')) router.push('/dashboard/helpdesk/queue')
      else await fetchTicket()
      setReason('')
      return true
    } catch (error) { await reportFailure(error); return false }
    finally { lock.current = false; setActing(false) }
  }

  async function handleReject() {
    const reason = window.prompt('Informe o motivo da reprovação deste chamado:')
    if (!reason?.trim()) return
    await runAction(`/helpdesk/tickets/${ticketId}/reject`, 'Chamado reprovado.', {
      reason,
    })
  }

  async function handleTransfer() {
    if (transferQueueId === 'none') {
      toast.error('Selecione a fila de destino para transferir o chamado.')
      return
    }

    const transferred = await runAction(`/helpdesk/tickets/${ticketId}/transfer`, 'Chamado transferido.', {
      toQueueId: transferQueueId,
      transferReasonId: transferReasonId !== 'none' ? transferReasonId : undefined,
      reason: transferNote.trim() || undefined,
    })

    if (!transferred) return
    setTransferQueueId('none')
    setTransferReasonId('none')
    setTransferNote('')
  }

  if (loading) {
    return <div className="app-page text-sm text-muted-foreground">Carregando chamado...</div>
  }

  if (loadError || !ticket) {
    return <div className="app-page space-y-4">
      <p role="alert" aria-label="Erro do chamado">{loadError || 'Chamado não encontrado.'}</p>
      <Button onClick={() => void fetchTicket()}>Tentar novamente</Button>
      <Button variant="outline" onClick={() => router.push('/dashboard/helpdesk')}>Voltar para chamados</Button>
    </div>
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
          <Badge variant={getStatusVariant(ticket.status)}>
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
                            <AttachmentDownload key={attachmentItem.id} id={attachmentItem.id} name={attachmentItem.name} />
                          ))}
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {(can('reply') || can('internalNote')) && <Card>
              <CardContent className="space-y-4 pt-6">
                {actionError && <p role="alert">{actionError}</p>}
                <Textarea
                  className="min-h-[130px]"
                  placeholder="Digite uma atualização, dúvida ou resposta para o atendimento..."
                  disabled={!!messageId}
                  value={newMessage}
                  onChange={(event) => setNewMessage(event.target.value)}
                />
                {can('internalNote') ? (
                  <label className="flex items-center gap-3 rounded-2xl border border-border bg-muted/20 px-4 py-3 text-sm">
                    <input
                      type="checkbox"
                      disabled={!!messageId || !can('reply')}
                      checked={internalNote || !can('reply')}
                      onChange={(event) => setInternalNote(event.target.checked)}
                    />
                    Registrar como nota interna visível apenas para a operação
                  </label>
                ) : null}
                {can('attach') && <div className="field-stack">
                  <Label htmlFor="message-attachment">Anexo opcional</Label>
                  <Input
                    id="message-attachment"
                    type="file"
                    accept=".png,.jpg,.jpeg,.gif,.pdf,.doc,.docx"
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      { setAttachment(event.target.files?.[0] || null); setUploadId(null) }
                    }
                  />
                </div>}
                <div className="flex justify-end">
                  <Button
                    onClick={handleSendMessage}
                    disabled={sending || !newMessage.trim()}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {sending ? 'Enviando...' : messageId ? 'Reenviar anexo' : 'Responder'}
                  </Button>
                </div>
              </CardContent>
            </Card>}
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
                  {ticket.sla ? <SlaStatus sla={ticket.sla} /> : ticket.resolutionDueDate || ticket.slaDueDate
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
                        <AttachmentDownload key={item.id} id={item.id} name={item.name} />
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

            {actionError && <p role="alert">{actionError}</p>}
            <div className="flex flex-col gap-3">
              {['resolve', 'reopen', 'cancel', 'waitUser', 'waitThirdParty', 'assign'].some(can) && <div className="field-stack">
                <Label htmlFor="action-reason">Motivo ou resumo público</Label>
                <Textarea id="action-reason" value={reason} onChange={e => setReason(e.target.value)} />
              </div>}
              {can('assign') && <div className="space-y-2">
                <Label htmlFor="assign-employee">Responsável elegível</Label>
                <select id="assign-employee" value={assigneeId} onChange={e => setAssigneeId(e.target.value)}>
                  <option value="">Selecione</option>
                  {candidates.filter(c => c.eligible).map(c => <option value={c.id} key={c.id}>{c.user.name}</option>)}
                </select>
                {candidateCursor && <Button disabled={acting} variant="outline" onClick={async () => {
                  try { const { data } = await api.get(`/helpdesk/queues/${assignmentQueueId}/candidates`, { params: { purpose: 'ASSIGNEE', cursor: candidateCursor } }); setCandidates(current => [...current, ...data.items]); setCandidateCursor(data.nextCursor) }
                  catch (e) { setActionError(getApiErrorMessage(e, 'Não foi possível carregar candidatos.')) }
                }}>Mais responsáveis</Button>}
                <Button disabled={acting || !assigneeId || (!!ticket.assignee && !reason.trim())} onClick={() => runAction(`/helpdesk/tickets/${ticketId}/assign`, 'Responsável atualizado.', { assigneeId, reason: reason.trim() || undefined })}>Atribuir responsável</Button>
              </div>}
              {(['waitUser', 'waitThirdParty'] as const).filter(can).map(action => <Button key={action} disabled={acting || !reason.trim()} onClick={() => runAction(`/helpdesk/tickets/${ticketId}/wait`, 'Espera registrada.', { target: action === 'waitUser' ? 'WAITING_USER' : 'WAITING_THIRD_PARTY', reason })}>{action === 'waitUser' ? 'Aguardar usuário' : 'Aguardar terceiro'}</Button>)}
              {can('resume') && <Button disabled={acting} onClick={() => runAction(`/helpdesk/tickets/${ticketId}/resume`, 'Atendimento retomado.')}>Retomar atendimento</Button>}
              {can('cancel') && <Button disabled={acting || !reason.trim()} variant="outline" onClick={() => runAction(`/helpdesk/tickets/${ticketId}/cancel`, 'Cancelamento registrado; consulte o estado e as aprovações.', { reason })}>Solicitar cancelamento</Button>}
              {can('pickup') ? (
                <Button
                  variant="outline"
                  disabled={acting}
                  onClick={() =>
                    runAction(
                      `/helpdesk/tickets/${ticketId}/pickup`,
                      'Chamado assumido com sucesso.',
                    )
                  }
                >
                  <UserCheck className="mr-2 h-4 w-4" />
                  Assumir chamado
                </Button>
              ) : null}

              {can('approve') ? (
                <>
                  <Button
                    disabled={acting}
                    onClick={() =>
                      runAction(
                        `/helpdesk/tickets/${ticketId}/approve`,
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

              {can('resolve') ? (
                <Button
                  variant="outline"
                  disabled={acting || !reason.trim()}
                  onClick={() =>
                    runAction(
                      `/helpdesk/tickets/${ticketId}/resolve`,
                      'Chamado marcado como resolvido.',
                      { reason },
                    )
                  }
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Marcar como resolvido
                </Button>
              ) : null}

              {can('close') ? (
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
                      runAction(`/helpdesk/tickets/${ticketId}/close`, 'Chamado fechado.', {
                        closeReasonId: closeReasonId !== 'none' ? closeReasonId : undefined,
                      })
                    }
                  >
                    Fechar chamado
                  </Button>
                </div>
              ) : null}

              {can('reopen') ? (
                <Button
                  variant="outline"
                  disabled={acting}
                  onClick={() =>
                    reason.trim() && runAction(`/helpdesk/tickets/${ticketId}/reopen`, 'Chamado reaberto.', { reason })
                  }
                >
                  Reabrir chamado
                </Button>
              ) : null}

              {can('transfer') ? (
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
