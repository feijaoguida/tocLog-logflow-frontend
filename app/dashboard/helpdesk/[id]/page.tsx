'use client'

import type { ChangeEvent } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  FileText,
  Layers,
  Lock,
  MessageSquare,
  Paperclip,
  RotateCw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Tag,
  User,
  UserCheck,
  UserPlus,
  X,
  XCircle,
} from 'lucide-react'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  LOW: 'BAIXA',
  MEDIUM: 'MÉDIA',
  HIGH: 'ALTA',
  CRITICAL: 'CRÍTICA',
}

function getInitials(name?: string | null) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function getStatusBadgeStyle(status: string) {
  switch (status) {
    case 'WAITING_ASSIGNMENT':
    case 'NEW':
      return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60'
    case 'IN_PROGRESS':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60'
    case 'WAITING_USER':
    case 'WAITING_THIRD_PARTY':
    case 'WAITING_APPROVAL':
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60'
    case 'RESOLVED':
    case 'CLOSED':
      return 'bg-muted text-muted-foreground border-border'
    default:
      return 'bg-secondary text-secondary-foreground border-border'
  }
}

function getPriorityBadgeStyle(priority: string) {
  switch (priority) {
    case 'CRITICAL':
      return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60'
    case 'HIGH':
      return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900/60'
    case 'MEDIUM':
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60'
    case 'LOW':
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-800'
  }
}

export default function TicketDetailsPage() {
  const params = useParams<{ id: string | string[] }>()
  const id = params.id
  if (
    typeof id !== 'string' ||
    !/^[a-zA-Z0-9_-]{1,128}$/.test(id) ||
    ['undefined', 'null'].includes(id)
  ) {
    return (
      <div className="app-page" role="alert" aria-label="Erro do chamado">
        Identificador de chamado inválido.
      </div>
    )
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
  const [uploadId, setUploadId] = useState<string | null>(null)
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
  const [candidates, setCandidates] = useState<
    { id: string; user: { name: string }; eligible: boolean }[]
  >([])
  const [candidateCursor, setCandidateCursor] = useState<string | null>(null)
  const [messageId, setMessageId] = useState<string | null>(null)

  const fetchTicket = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const { data } = await api.get<TicketDetails>(`/helpdesk/tickets/${ticketId}`)
      setTicket(data)
    } catch (error) {
      setLoadError(getApiErrorMessage(error, 'Não foi possível carregar os detalhes do chamado.'))
    } finally {
      setLoading(false)
    }
  }, [ticketId])

  useEffect(() => {
    void fetchTicket()
  }, [fetchTicket])

  const assignmentQueueId = ticket?.queue?.id
  useEffect(() => {
    if (!assignmentQueueId) return
    api
      .get(`/helpdesk/queues/${assignmentQueueId}/candidates`, {
        params: { purpose: 'ASSIGNEE' },
      })
      .then(({ data }) => {
        setCandidates(data.items)
        setCandidateCursor(data.nextCursor)
      })
      .catch((e) =>
        setActionError(getApiErrorMessage(e, 'Não foi possível carregar candidatos da fila.')),
      )
  }, [assignmentQueueId])

  useEffect(() => {
    if (!can('transfer') && !can('close')) return

    async function loadAux() {
      try {
        const [queuesRes, reasonsRes] = await Promise.all([
          api.get<QueueOption[]>('/helpdesk/queues'),
          api.get<ActionReasons>('/helpdesk/settings/action-reasons'),
        ])
        setQueueOptions(queuesRes.data)
        setActionReasons(reasonsRes.data)
      } catch (error) {
        toast.error(
          getApiErrorMessage(error, 'Não foi possível carregar opções de transferência/fechamento.'),
        )
      }
    }

    void loadAux()
  }, [ticket?.allowedActions])

  async function handleSendMessage() {
    if (lock.current || (!newMessage.trim() && !messageId)) return
    lock.current = true
    setSending(true)
    setActionError('')
    let sentMessageId = messageId
    try {
      if (!sentMessageId) {
        const { data } = await api.post(`/helpdesk/tickets/${ticketId}/messages`, {
          content: newMessage,
          internal: internalNote,
          expectedVersion: ticket?.version,
        })
        sentMessageId = data.id
        setMessageId(sentMessageId)
      }
      if (attachment) {
        const currentUploadId = uploadId ?? (await uploadHelpdeskFile(attachment))
        setUploadId(currentUploadId)
        await api.post(`/helpdesk/tickets/${ticketId}/messages/${sentMessageId}/attachments`, {
          uploadId: currentUploadId,
        })
      }
      setNewMessage('')
      setAttachment(null)
      setUploadId(null)
      setMessageId(null)
      setInternalNote(false)
      toast.success('Mensagem enviada.')
      await fetchTicket()
    } catch (error) {
      setActionError(
        sentMessageId
          ? 'Mensagem salva; o anexo falhou. Tente reenviar o anexo ou continue a conversa.'
          : getApiErrorMessage(error, 'Não foi possível enviar a mensagem.'),
      )
    } finally {
      lock.current = false
      setSending(false)
    }
  }

  async function runAction(
    endpoint: string,
    successMessage: string,
    payload: Record<string, unknown> = {},
  ) {
    if (lock.current) return
    lock.current = true
    setActing(true)
    setActionError('')
    try {
      await api.post(endpoint, {
        expectedVersion: ticket?.version,
        ...payload,
      })
      toast.success(successMessage)
      setReason('')
      await fetchTicket()
      return true
    } catch (error) {
      setActionError(
        isAxiosError(error) && error.response?.status === 409
          ? 'Chamado atualizado por outro usuário. Os dados foram recarregados.'
          : getApiErrorMessage(error, 'Não foi possível concluir a ação.'),
      )
      if (isAxiosError(error) && error.response?.status === 409) {
        await fetchTicket()
      }
      return false
    } finally {
      lock.current = false
      setActing(false)
    }
  }

  async function handleReject() {
    if (!reason.trim()) {
      toast.error('Informe o motivo da reprovação.')
      return
    }
    await runAction(`/helpdesk/tickets/${ticketId}/reject`, 'Chamado reprovado.', { reason })
  }

  async function handleTransfer() {
    if (transferQueueId === 'none') {
      toast.error('Selecione a fila de destino.')
      return
    }

    const transferred = await runAction(
      `/helpdesk/tickets/${ticketId}/transfer`,
      'Chamado transferido.',
      {
        targetQueueId: transferQueueId,
        transferReasonId: transferReasonId !== 'none' ? transferReasonId : undefined,
        note: transferNote.trim() || undefined,
      },
    )

    if (!transferred) return
    setTransferQueueId('none')
    setTransferReasonId('none')
    setTransferNote('')
  }

  if (loading) {
    return (
      <div className="app-page flex min-h-[300px] flex-col items-center justify-center gap-3">
        <RotateCw className="size-6 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Carregando detalhes do chamado...</span>
      </div>
    )
  }

  if (loadError || !ticket) {
    return (
      <div className="app-page space-y-4">
        <Card className="app-section-card p-6">
          <p role="alert" className="text-sm text-destructive font-medium">
            {loadError || 'Chamado não encontrado.'}
          </p>
          <div className="mt-4 flex gap-2">
            <Button onClick={() => void fetchTicket()}>Tentar novamente</Button>
            <Button variant="outline" onClick={() => router.push('/dashboard/helpdesk')}>
              Voltar para chamados
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="app-page space-y-6">
      {/* Page Header TocLog */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1.5 font-medium"
            onClick={() => router.push('/dashboard/helpdesk')}
          >
            <ArrowLeft className="size-4" />
            <span>Voltar para chamados</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => void fetchTicket()}
            disabled={loading}
          >
            <RotateCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </Button>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between border-b pb-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-muted-foreground">
                #{ticket.code}
              </span>
              <span className="text-xs text-muted-foreground">•</span>
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wider ${getPriorityBadgeStyle(
                  ticket.priority,
                )}`}
              >
                {PRIORITY_LABELS[ticket.priority] || ticket.priority}
              </span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {ticket.subject}
            </h1>

            <p className="text-xs text-muted-foreground">
              Aberto em {new Date(ticket.createdAt).toLocaleString('pt-BR')} por{' '}
              <strong className="text-foreground font-semibold">
                {isRequester ? 'você' : ticket.requester?.user?.name || 'solicitante'}
              </strong>
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`inline-flex items-center rounded-md border px-3 py-1 text-xs font-semibold ${getStatusBadgeStyle(
                ticket.status,
              )}`}
            >
              {STATUS_LABELS[ticket.status] || ticket.status}
            </span>
          </div>
        </div>
      </section>

      {/* Grid de 4 Cards de Resumo Operacional do Chamado */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Card 1: Fila */}
        <Card className="app-section-card p-4 shadow-2xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Fila de Atendimento
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-1.5">
            <div className="flex items-center gap-1.5 text-base font-bold text-foreground truncate">
              <span className="size-2 rounded-full bg-primary shrink-0" />
              <span className="truncate">{ticket.queue?.name || 'Sem fila atribuída'}</span>
            </div>
            <p className="text-xs text-muted-foreground truncate pt-0.5">
              {ticket.serviceCatalogItem?.name || 'Fluxo direto'}
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Responsável */}
        <Card className="app-section-card p-4 shadow-2xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Responsável
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-1.5 flex items-center gap-2">
            {ticket.assignee?.user?.name ? (
              <>
                <span className="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                  {getInitials(ticket.assignee.user.name)}
                </span>
                <span className="text-sm font-bold text-foreground truncate">
                  {ticket.assignee.user.name}
                </span>
              </>
            ) : (
              <span className="text-xs italic text-amber-700 dark:text-amber-400 font-medium">
                Sem responsável atribuído
              </span>
            )}
          </CardContent>
        </Card>

        {/* Card 3: SLA de Resolução */}
        <Card className="app-section-card p-4 shadow-2xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              SLA de Resolução
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-1.5 text-sm font-semibold">
            {ticket.sla ? (
              <SlaStatus sla={ticket.sla} />
            ) : ticket.resolutionDueDate || ticket.slaDueDate ? (
              <span className="text-xs text-foreground">
                {new Date(
                  ticket.resolutionDueDate || ticket.slaDueDate || '',
                ).toLocaleString('pt-BR')}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">Sem SLA configurado</span>
            )}
          </CardContent>
        </Card>

        {/* Card 4: Categoria Operacional */}
        <Card className="app-section-card p-4 shadow-2xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Categoria
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-1.5">
            <span className="text-sm font-bold text-foreground truncate">
              {ticket.category?.name || 'Geral'}
            </span>
            <p className="text-xs text-muted-foreground">Classificação do fluxo</p>
          </CardContent>
        </Card>
      </section>

      {/* Grid Principal: Esquerda Conversa & Descrição | Direita Detalhes & Ações */}
      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr] items-start">
        {/* Coluna da Esquerda: Descrição & Conversa */}
        <section className="space-y-6">
          {/* Card Descrição */}
          <Card className="app-section-card p-5 shadow-xs">
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Descrição do Solicitante
              </span>
              <p className="rounded-lg bg-muted/20 border border-border/60 p-4 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                {ticket.description}
              </p>
            </div>
          </Card>

          {/* Histórico / Conversa do Chamado */}
          <Card className="app-section-card p-5 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <MessageSquare className="size-4 text-primary" />
                  <h2 className="text-base font-bold text-foreground">
                    Linha do Tempo e Mensagens
                  </h2>
                </div>
                <p className="text-xs text-muted-foreground">
                  Histórico centralizado de respostas, esclarecimentos e notas internas.
                </p>
              </div>
              <span className="text-xs text-muted-foreground">
                {ticket.messages?.length || 0} mensagem(ns)
              </span>
            </div>

            {/* Lista de Mensagens */}
            <div className="space-y-3">
              {ticket.messages?.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  Nenhuma mensagem registrada ainda. Seja o primeiro a responder abaixo.
                </div>
              ) : (
                ticket.messages?.map((message) => {
                  const isMine = message.author?.id === user?.employeeId
                  return (
                    <div
                      key={message.id}
                      className={`rounded-lg border p-4 transition-all ${
                        message.internal
                          ? 'border-amber-300/60 bg-amber-500/5 dark:border-amber-900/60'
                          : isMine
                          ? 'border-primary/20 bg-primary/5'
                          : 'border-border bg-card'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 text-xs pb-2 border-b border-border/50">
                        <div className="flex items-center gap-2">
                          <span className="flex size-5 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                            {getInitials(message.author?.user?.name || (isMine ? 'Você' : 'Atendimento'))}
                          </span>
                          <span className="font-semibold text-foreground">
                            {isMine ? 'Você' : message.author?.user?.name || 'Atendimento'}
                          </span>
                          {message.internal && (
                            <span className="rounded-md bg-amber-500/10 px-1.5 py-0.2 text-[10px] font-bold text-amber-700 dark:text-amber-400 border border-amber-300/40">
                              Nota Interna
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(message.createdAt).toLocaleString('pt-BR')}
                        </span>
                      </div>

                      <div className="pt-2 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                        {message.content}
                      </div>

                      {message.attachments?.length ? (
                        <div className="mt-3 flex flex-wrap gap-2 pt-2 border-t border-border/40">
                          {message.attachments.map((attachmentItem) => (
                            <AttachmentDownload
                              key={attachmentItem.id}
                              id={attachmentItem.id}
                              name={attachmentItem.name}
                            />
                          ))}
                        </div>
                      ) : null}
                    </div>
                  )
                })
              )}
            </div>

            {/* Caixa de Nova Resposta */}
            {(can('reply') || can('internalNote')) && (
              <div className="rounded-lg border border-border bg-muted/10 p-4 space-y-3 mt-4">
                {actionError && (
                  <div role="alert" className="p-3 rounded-md bg-destructive/10 text-destructive text-xs">
                    {actionError}
                  </div>
                )}

                <div className="space-y-1.5">
                  <Textarea
                    className="min-h-[110px] text-sm bg-background"
                    placeholder="Escreva sua resposta ou atualização operacional..."
                    disabled={!!messageId || sending}
                    value={newMessage}
                    onChange={(event) => setNewMessage(event.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-1">
                  <div className="flex items-center gap-3">
                    {can('internalNote') && (
                      <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer select-none">
                        <input
                          type="checkbox"
                          className="rounded border-border"
                          disabled={!!messageId || !can('reply') || sending}
                          checked={internalNote || !can('reply')}
                          onChange={(event) => setInternalNote(event.target.checked)}
                        />
                        <span className="font-medium">Registrar como nota interna</span>
                      </label>
                    )}

                    {can('attach') && (
                      <div>
                        <input
                          id="message-attachment"
                          type="file"
                          className="hidden"
                          accept=".png,.jpg,.jpeg,.gif,.pdf,.doc,.docx"
                          onChange={(event: ChangeEvent<HTMLInputElement>) => {
                            setAttachment(event.target.files?.[0] || null)
                            setUploadId(null)
                          }}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                          onClick={() => document.getElementById('message-attachment')?.click()}
                          disabled={sending}
                        >
                          <Paperclip className="size-3.5" />
                          <span>{attachment ? attachment.name : 'Anexar arquivo'}</span>
                        </Button>
                      </div>
                    )}
                  </div>

                  <Button
                    size="sm"
                    className="h-8 px-3 text-xs gap-1.5 font-semibold"
                    onClick={handleSendMessage}
                    disabled={sending || !newMessage.trim()}
                  >
                    <Send className="size-3.5" />
                    <span>{sending ? 'Enviando...' : messageId ? 'Reenviar anexo' : 'Enviar resposta'}</span>
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </section>

        {/* Coluna da Direita: Atributos & Ações Operacionais */}
        <aside className="space-y-6">
          {/* Card Detalhes Operacionais */}
          <Card className="app-section-card p-5 shadow-xs space-y-4">
            <div className="space-y-0.5 border-b pb-2">
              <h2 className="text-base font-bold text-foreground">Metadados do Chamado</h2>
              <p className="text-xs text-muted-foreground">
                Informações de auditoria e parametrização.
              </p>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Serviço</span>
                <span className="font-semibold text-foreground text-right">
                  {ticket.serviceCatalogItem?.name || 'Fluxo direto por categoria'}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Categoria</span>
                <span className="font-medium text-foreground text-right">
                  {ticket.category?.name || 'Não informada'}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Fila Atual</span>
                <span className="font-medium text-foreground text-right">
                  {ticket.queue?.name || 'Sem fila'}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Prioridade</span>
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.2 text-[10px] font-bold ${getPriorityBadgeStyle(
                    ticket.priority,
                  )}`}
                >
                  {PRIORITY_LABELS[ticket.priority] || ticket.priority}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">Responsável</span>
                <span className="font-medium text-foreground text-right">
                  {ticket.assignee?.user?.name || 'Não atribuído'}
                </span>
              </div>

              <div className="py-1">
                <span className="text-muted-foreground block pb-1.5">Anexos diretos</span>
                <div className="flex flex-wrap gap-1.5">
                  {ticket.attachments?.filter((item) => !item.messageId).length ? (
                    ticket.attachments
                      ?.filter((item) => !item.messageId)
                      .map((item) => (
                        <AttachmentDownload key={item.id} id={item.id} name={item.name} />
                      ))
                  ) : (
                    <span className="text-muted-foreground italic">Sem anexos de abertura</span>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Card Ações Rápidas */}
          <Card className="app-section-card p-5 shadow-xs space-y-4">
            <div className="space-y-0.5 border-b pb-2">
              <h2 className="text-base font-bold text-foreground">Ações Operacionais</h2>
              <p className="text-xs text-muted-foreground">
                Controles disponíveis conforme seu perfil e o estado do chamado.
              </p>
            </div>

            {actionError && (
              <p role="alert" className="text-xs text-destructive font-medium">
                {actionError}
              </p>
            )}

            <div className="flex flex-col gap-3">
              {/* Campo unificado de motivo / justificativa */}
              {['resolve', 'reopen', 'cancel', 'waitUser', 'waitThirdParty', 'assign'].some(can) && (
                <div className="field-stack">
                  <Label htmlFor="action-reason" className="text-xs font-semibold">
                    Motivo ou Justificativa da Ação
                  </Label>
                  <Textarea
                    id="action-reason"
                    rows={2}
                    className="text-xs"
                    placeholder="Necessário para resolver, aguardar, cancelar ou reabrir..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </div>
              )}

              {/* Atribuição de Responsável */}
              {can('assign') && (
                <div className="space-y-2 rounded-lg border border-border/70 bg-muted/20 p-3">
                  <span className="text-xs font-semibold text-foreground">Atribuir Responsável</span>
                  <Select value={assigneeId} onValueChange={setAssigneeId}>
                    <SelectTrigger id="assign-employee" className="h-9 text-xs">
                      <SelectValue placeholder="Selecione um operador" />
                    </SelectTrigger>
                    <SelectContent>
                      {candidates
                        .filter((c) => c.eligible)
                        .map((c) => (
                          <SelectItem value={c.id} key={c.id}>
                            {c.user.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>

                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      size="sm"
                      className="h-8 text-xs font-semibold w-full"
                      disabled={acting || !assigneeId || (!!ticket.assignee && !reason.trim())}
                      onClick={() =>
                        runAction(`/helpdesk/tickets/${ticketId}/assign`, 'Responsável atualizado.', {
                          assigneeId,
                          reason: reason.trim() || undefined,
                        })
                      }
                    >
                      <UserPlus className="size-3.5 mr-1" />
                      <span>Confirmar Atribuição</span>
                    </Button>
                  </div>
                </div>
              )}

              {/* Assumir Chamado (Pickup) */}
              {can('pickup') && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs font-semibold border-primary text-primary hover:bg-primary/10 gap-1.5"
                  disabled={acting}
                  onClick={() =>
                    runAction(`/helpdesk/tickets/${ticketId}/pickup`, 'Chamado assumido com sucesso.')
                  }
                >
                  <UserCheck className="size-4" />
                  <span>Assumir Atendimento</span>
                </Button>
              )}

              {/* Botões de Decisão de Aprovação */}
              {can('approve') && (
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    className="h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                    disabled={acting}
                    onClick={() =>
                      runAction(`/helpdesk/tickets/${ticketId}/approve`, 'Chamado aprovado.')
                    }
                  >
                    <ShieldCheck className="size-3.5" />
                    <span>Aprovar</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-semibold text-destructive border-destructive/40 hover:bg-destructive/10 gap-1"
                    disabled={acting}
                    onClick={handleReject}
                  >
                    <ShieldAlert className="size-3.5" />
                    <span>Reprovar</span>
                  </Button>
                </div>
              )}

              {/* Resolver Chamado */}
              {can('resolve') && (
                <Button
                  size="sm"
                  className="h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                  disabled={acting || !reason.trim()}
                  onClick={() =>
                    runAction(
                      `/helpdesk/tickets/${ticketId}/resolve`,
                      'Chamado marcado como resolvido.',
                      { reason },
                    )
                  }
                >
                  <CheckCircle2 className="size-4" />
                  <span>Marcar como Resolvido</span>
                </Button>
              )}

              {/* Aguardar Usuário ou Terceiro */}
              {(['waitUser', 'waitThirdParty'] as const).filter(can).map((action) => (
                <Button
                  key={action}
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-medium"
                  disabled={acting || !reason.trim()}
                  onClick={() =>
                    runAction(`/helpdesk/tickets/${ticketId}/wait`, 'Espera registrada.', {
                      target: action === 'waitUser' ? 'WAITING_USER' : 'WAITING_THIRD_PARTY',
                      reason,
                    })
                  }
                >
                  {action === 'waitUser' ? 'Aguardar Usuário' : 'Aguardar Terceiro'}
                </Button>
              ))}

              {/* Retomar Atendimento */}
              {can('resume') && (
                <Button
                  size="sm"
                  className="h-8 text-xs font-semibold"
                  disabled={acting}
                  onClick={() =>
                    runAction(`/helpdesk/tickets/${ticketId}/resume`, 'Atendimento retomado.')
                  }
                >
                  Retomar Atendimento
                </Button>
              )}

              {/* Solicitar Cancelamento */}
              {can('cancel') && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                  disabled={acting || !reason.trim()}
                  onClick={() =>
                    runAction(
                      `/helpdesk/tickets/${ticketId}/cancel`,
                      'Cancelamento registrado; consulte o estado e as aprovações.',
                      { reason },
                    )
                  }
                >
                  Solicitar Cancelamento
                </Button>
              )}

              {/* Fechar Chamado */}
              {can('close') && (
                <div className="space-y-2 rounded-lg border border-border/70 bg-muted/20 p-3">
                  <span className="text-xs font-semibold text-foreground">Fechar Chamado</span>
                  <Select value={closeReasonId} onValueChange={setCloseReasonId}>
                    <SelectTrigger id="close-reason" className="h-8 text-xs">
                      <SelectValue placeholder="Motivo de fechamento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem motivo específico</SelectItem>
                      {actionReasons.closeReasons.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-semibold w-full"
                    disabled={acting}
                    onClick={() =>
                      runAction(`/helpdesk/tickets/${ticketId}/close`, 'Chamado fechado.', {
                        closeReasonId: closeReasonId !== 'none' ? closeReasonId : undefined,
                      })
                    }
                  >
                    Confirmar Fechamento
                  </Button>
                </div>
              )}

              {/* Reabrir Chamado */}
              {can('reopen') && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-semibold border-amber-500/50 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
                  disabled={acting}
                  onClick={() =>
                    reason.trim() &&
                    runAction(`/helpdesk/tickets/${ticketId}/reopen`, 'Chamado reaberto.', { reason })
                  }
                >
                  Reabrir Chamado
                </Button>
              )}

              {/* Transferir Atendimento */}
              {can('transfer') && (
                <div className="space-y-3 rounded-lg border border-border/70 bg-muted/20 p-3">
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-foreground">Transferir Atendimento</span>
                    <p className="text-[11px] text-muted-foreground">
                      Muda o chamado de fila e limpa o responsável atual.
                    </p>
                  </div>

                  <Select value={transferQueueId} onValueChange={setTransferQueueId}>
                    <SelectTrigger id="transfer-queue" className="h-8 text-xs">
                      <SelectValue placeholder="Selecione a fila de destino" />
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

                  <Select value={transferReasonId} onValueChange={setTransferReasonId}>
                    <SelectTrigger id="transfer-reason" className="h-8 text-xs">
                      <SelectValue placeholder="Motivo operacional (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem motivo específico</SelectItem>
                      {actionReasons.transferReasons.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Textarea
                    id="transfer-note"
                    className="min-h-[70px] text-xs"
                    value={transferNote}
                    onChange={(event) => setTransferNote(event.target.value)}
                    placeholder="Justificativa da transferência..."
                  />

                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-semibold w-full"
                    disabled={acting || transferQueueId === 'none'}
                    onClick={handleTransfer}
                  >
                    <ArrowRightLeft className="size-3.5 mr-1" />
                    <span>Transferir Chamado</span>
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </aside>
      </div>
    </div>
  )
}
