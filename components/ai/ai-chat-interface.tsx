'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import Link from 'next/link'
import {
  Send,
  RotateCw,
  StopCircle,
  Sparkles,
  Bot,
  User as UserIcon,
  Plus,
  MessageSquare,
  AlertTriangle,
  Clock,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Settings,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/context/auth-context'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { AiMarkdownRenderer } from './ai-markdown-renderer'
import { reportError } from '@/lib/error-reporter'

export interface AiChatInterfaceProps {
  initialContext?: {
    module?: string
    entityId?: string
    entityTitle?: string
    [key: string]: any
  }
  initialAssistantId?: string
  className?: string
  compact?: boolean
}

interface ConversationItem {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  assistant?: { id: string; name: string } | null
}

interface MessageItem {
  id: string
  role: 'USER' | 'ASSISTANT' | 'SYSTEM' | 'TOOL'
  content: string
  createdAt: string
  runId?: string
  metadata?: {
    toolName?: string
    toolCalls?: any[]
    sources?: Array<{ title: string; url?: string; period?: string }>
    provenance?: any
  }
}

interface AssistantOption {
  id: string
  name: string
  description?: string
  module?: string
}

export function AiChatInterface({
  initialContext,
  initialAssistantId,
  className = '',
  compact = false,
}: AiChatInterfaceProps) {
  const { user, hasPermission } = useAuth()
  const currentCompanyId = user?.companyId
  const canManageAi =
    user?.accessType === 'SAAS_ADMIN' ||
    user?.accessType === 'COMPANY_ADMIN' ||
    hasPermission('ai.settings.manage') ||
    hasPermission('ai.settings.view')

  // Conversations state
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<MessageItem[]>([])
  const [assistants, setAssistants] = useState<AssistantOption[]>([])
  const [selectedAssistantId, setSelectedAssistantId] = useState<string>(initialAssistantId || '')

  // Execution state
  const [inputText, setInputText] = useState('')
  const [status, setStatus] = useState<'IDLE' | 'SENDING' | 'RUNNING' | 'ERROR'>('IDLE')
  const [statusMessage, setStatusMessage] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [activeRunId, setActiveRunId] = useState<string | null>(null)
  const [lastClientRequestId, setLastClientRequestId] = useState<string | null>(null)

  // Layout state
  const [showHistory, setShowHistory] = useState<boolean>(!compact)
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  // AC-02: Se a empresa do usuário mudar, limpar imediatamente histórico e estado
  useEffect(() => {
    setConversations([])
    setActiveConversationId(null)
    setMessages([])
    setStatus('IDLE')
    setErrorMessage(null)
    setActiveRunId(null)
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
    if (currentCompanyId) {
      void fetchAssistants()
      void fetchConversations()
    }
  }, [currentCompanyId])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, statusMessage])

  // Load assistants
  const fetchAssistants = async () => {
    try {
      const { data } = await api.get('/ai/assistants')
      const items = Array.isArray(data) ? data : data.items || []
      setAssistants(items)
      if (!selectedAssistantId && items.length > 0) {
        setSelectedAssistantId(items[0].id)
      }
    } catch {
      // Ignorar falha silenciosa se usuário não tiver permissão
    }
  }

  // Load user conversations
  const fetchConversations = async () => {
    setIsLoadingHistory(true)
    try {
      const { data } = await api.get('/ai/conversations', { params: { pageSize: 20 } })
      const list = Array.isArray(data) ? data : data.items || []
      setConversations(list)
    } catch {
      // Silenciar erro inicial
    } finally {
      setIsLoadingHistory(false)
    }
  }

  // Select a conversation and load its messages
  const handleSelectConversation = async (conversationId: string) => {
    setActiveConversationId(conversationId)
    setErrorMessage(null)
    try {
      const { data } = await api.get(`/ai/conversations/${conversationId}/messages`)
      setMessages(Array.isArray(data) ? data : [])
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Falha ao carregar mensagens da conversa.')
    }
  }

  // Create new conversation
  const handleNewConversation = async () => {
    setActiveConversationId(null)
    setMessages([])
    setErrorMessage(null)
    setStatus('IDLE')
    textareaRef.current?.focus()
  }

  // Suggestion prompt pills
  const suggestedPrompts = useMemo(() => {
    if (initialContext?.module === 'compras') {
      return [
        'Consultar compras de pneus no ano passado',
        'Quais são os principais fornecedores deste mês?',
        'Resumo dos pedidos pendentes de aprovação',
      ]
    }
    if (initialContext?.module === 'helpdesk') {
      return [
        'Listar meus chamados abertos',
        'Qual o status do meu último chamado?',
        'Métricas gerais de chamados e prazos de SLA',
      ]
    }
    return [
      'Como funciona o fluxo de aprovação de compras?',
      'Como abrir um novo chamado de TI no Helpdesk?',
      'Consultar status do sistema e horários de atendimento',
    ]
  }, [initialContext?.module])

  // Stop polling helper
  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }

  // Poll run status
  const startPollingRun = useCallback((runId: string, convId: string) => {
    stopPolling()
    setActiveRunId(runId)
    setStatus('RUNNING')
    setStatusMessage('Consultando dados do sistema...')

    let attempts = 0
    const maxAttempts = 60 // 60 * 1.5s = 90 segundos

    pollingRef.current = setInterval(async () => {
      attempts++
      try {
        const { data: run } = await api.get(`/ai/runs/${runId}`)

        if (run.status === 'COMPLETED') {
          stopPolling()
          setStatus('IDLE')
          setStatusMessage('')
          setActiveRunId(null)

          // Recarregar mensagens da conversa para exibir a resposta final
          const { data: updatedMessages } = await api.get(`/ai/conversations/${convId}/messages`)
          setMessages(Array.isArray(updatedMessages) ? updatedMessages : [])
          return
        }

        if (run.status === 'FAILED' || run.status === 'CANCELLED') {
          stopPolling()
          setStatus('ERROR')
          setStatusMessage('')
          setActiveRunId(null)
          setErrorMessage(run.error || 'A execução da consulta foi encerrada com erro.')
          return
        }

        // Status intermediários
        if (run.status === 'RUNNING') {
          setStatusMessage('Processando resposta com ferramentas autorizadas...')
        }
      } catch (err: any) {
        if (attempts >= maxAttempts) {
          stopPolling()
          setStatus('ERROR')
          setStatusMessage('')
          setErrorMessage('Tempo limite de resposta atingido. Tente novamente.')
        }
      }

      if (attempts >= maxAttempts) {
        stopPolling()
        setStatus('ERROR')
        setStatusMessage('')
        setErrorMessage('Tempo limite de resposta atingido.')
      }
    }, 1500)
  }, [])

  // Cancel running execution
  const handleCancelRun = async () => {
    if (!activeRunId) return
    try {
      await api.post(`/ai/runs/${activeRunId}/cancel`)
      stopPolling()
      setStatus('IDLE')
      setStatusMessage('Execução cancelada.')
      setActiveRunId(null)
    } catch {
      // Ignorar
    }
  }

  // Send message
  const handleSendMessage = async (textToSend?: string) => {
    const content = (textToSend || inputText).trim()
    if (!content || status === 'SENDING' || status === 'RUNNING') return

    setErrorMessage(null)
    setInputText('')
    setStatus('SENDING')
    setStatusMessage('Enviando mensagem...')

    let convId = activeConversationId
    const clientRequestId = crypto.randomUUID()
    setLastClientRequestId(clientRequestId)

    try {
      // 1. Criar conversa se não existir
      if (!convId) {
        const title = content.length > 40 ? `${content.slice(0, 40)}...` : content
        const contextType = initialContext?.module ? String(initialContext.module).toUpperCase() : undefined
        const contextId =
          (initialContext as any)?.recordId ||
          (initialContext as any)?.entityId ||
          undefined

        const { data: newConv } = await api.post('/ai/conversations', {
          title,
          assistantId: selectedAssistantId || undefined,
          contextType,
          contextId,
        })
        convId = newConv.id
        setActiveConversationId(newConv.id)
        setConversations((prev) => [newConv, ...prev])
      }

      // Adicionar mensagem do usuário otimista na tela
      const userOptimisticMessage: MessageItem = {
        id: `opt-${Date.now()}`,
        role: 'USER',
        content,
        createdAt: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, userOptimisticMessage])

      // 2. Postar mensagem com idempotência (clientRequestId)
      const { data: postResult } = await api.post(`/ai/conversations/${convId}/messages`, {
        text: content,
        content,
        clientRequestId,
      })

      // 3. Se retornou runId para execução assíncrona
      const runId = postResult.runId || postResult.run?.id
      if (runId && convId) {
        startPollingRun(runId, convId)
      } else {
        // Se a resposta já foi síncrona
        setStatus('IDLE')
        setStatusMessage('')
        if (convId) {
          const { data: updatedMessages } = await api.get(`/ai/conversations/${convId}/messages`)
          setMessages(Array.isArray(updatedMessages) ? updatedMessages : [])
        }
      }
    } catch (err: any) {
      setStatus('ERROR')
      setStatusMessage('')
      const rawMsg = err.response?.data?.message
      const msg = Array.isArray(rawMsg) ? rawMsg.join(', ') : rawMsg || 'Falha ao processar solicitação.'
      setErrorMessage(msg)
      toast.error(msg)
      reportError(err, {
        module: 'AI_CHAT',
        screen: '/dashboard/ai',
        action: 'handleSendMessage',
        errorMessage: msg,
        requestPayload: { assistantId: selectedAssistantId, convId, contentSnippet: content.slice(0, 100) },
      })
      // Restaurar o texto digitado se a mensagem não pôde ser enviada
      if (!textToSend) {
        setInputText(content)
      }
    }
  }

  // Retry sending last request
  const handleRetry = () => {
    if (!messages.length) return
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'USER')
    if (lastUserMsg) {
      void handleSendMessage(lastUserMsg.content)
    }
  }

  // Keyboard handler
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      if ((e.nativeEvent as any).isComposing) return // Respeita composição IME de teclado
      e.preventDefault()
      void handleSendMessage()
    }
  }

  return (
    <div className={`flex h-[620px] max-h-[85vh] w-full overflow-hidden rounded-xl border border-border bg-card shadow-xs ${className}`}>
      {/* Drawer lateral de histórico de conversas */}
      {showHistory && (
        <aside className="w-64 shrink-0 border-r border-border bg-surface-subtle flex flex-col justify-between transition-all">
          <div className="p-3 border-b border-border flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <MessageSquare className="size-3.5" />
              <span>Conversas</span>
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs gap-1 font-medium"
              onClick={handleNewConversation}
            >
              <Plus className="size-3.5" />
              <span>Nova</span>
            </Button>
          </div>

          <ScrollArea className="flex-1 p-2">
            {isLoadingHistory ? (
              <div className="p-4 text-center text-xs text-muted-foreground">Carregando histórico...</div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">Nenhuma conversa registrada.</div>
            ) : (
              <div className="space-y-1">
                {conversations.map((conv) => {
                  const isActive = conv.id === activeConversationId
                  return (
                    <button
                      key={conv.id}
                      onClick={() => handleSelectConversation(conv.id)}
                      className={`w-full text-left p-2 rounded-md text-xs transition-colors flex flex-col gap-0.5 ${
                        isActive
                          ? 'bg-primary/10 text-primary font-medium border border-primary/20'
                          : 'text-foreground hover:bg-muted/50'
                      }`}
                    >
                      <span className="truncate w-full font-medium">{conv.title || 'Conversa sem título'}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(conv.updatedAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </ScrollArea>

          <div className="p-2 border-t border-border bg-card">
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-7 text-xs text-muted-foreground hover:text-foreground justify-center gap-1"
              onClick={() => setShowHistory(false)}
            >
              <ChevronLeft className="size-3.5" />
              <span>Recolher histórico</span>
            </Button>
          </div>
        </aside>
      )}

      {/* Área Principal de Conversa */}
      <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative">
        {/* Cabeçalho da conversa */}
        <header className="h-12 border-b border-border px-4 flex items-center justify-between shrink-0 bg-surface-subtle">
          <div className="flex items-center gap-2">
            {!showHistory && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground"
                onClick={() => setShowHistory(true)}
                title="Abrir histórico de conversas"
              >
                <ChevronRight className="size-4" />
              </Button>
            )}

            <div className="flex items-center gap-1.5">
              <Sparkles className="size-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Assistente TocLog</span>
            </div>

            {initialContext?.module && (
              <Badge variant="outline" className="text-[11px] font-normal uppercase tracking-wider bg-background">
                Contexto: {initialContext.module}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {assistants.length > 1 && (
              <select
                value={selectedAssistantId}
                onChange={(e) => setSelectedAssistantId(e.target.value)}
                className="h-7 text-xs rounded border border-border bg-background px-2 text-foreground outline-none"
              >
                {assistants.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            )}

            {canManageAi && (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs gap-1"
                title="Configurações de IA, Provedores e Chaves"
              >
                <Link href="/dashboard/settings/ai/connections">
                  <Settings className="size-3.5" />
                  <span className="hidden sm:inline">Configurar IA</span>
                </Link>
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs gap-1"
              onClick={handleNewConversation}
              title="Iniciar nova conversa limpa"
            >
              <Plus className="size-3.5" />
              <span className="hidden sm:inline">Nova conversa</span>
            </Button>
          </div>
        </header>

        {/* Região acessível de anúncios dinâmicos */}
        <div className="sr-only" aria-live="polite">
          {statusMessage}
        </div>

        {/* Mensagens */}
        <ScrollArea className="flex-1 p-4 md:p-6 overflow-y-auto">
          {/* Mensagem de Erro com Ações */}
          {errorMessage && (
            <div className="max-w-3xl mx-auto mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-destructive">
              <div className="flex items-start gap-2">
                <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Não foi possível processar a consulta</p>
                  <p className="text-muted-foreground mt-0.5">{errorMessage}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {canManageAi && (
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs border-primary/40 text-primary hover:bg-primary/10 gap-1"
                  >
                    <Link href="/dashboard/settings/ai/connections">
                      <Settings className="size-3" />
                      <span>Configurações de IA</span>
                    </Link>
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs border-destructive/30 hover:bg-destructive/10 text-destructive gap-1"
                  onClick={handleRetry}
                >
                  <RotateCw className="size-3" />
                  <span>Tentar novamente</span>
                </Button>
              </div>
            </div>
          )}

          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4 max-w-md mx-auto my-auto">
              <div className="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-xs">
                <Bot className="size-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-foreground">Como posso ajudar hoje?</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Pergunte sobre procedimentos operacionais, consulte indicadores de compras ou verifique o status dos seus chamados.
                </p>
              </div>

              {/* Pílulas de sugestões */}
              <div className="w-full pt-2 flex flex-col gap-1.5 text-left">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
                  Sugestões (clique para preencher o texto)
                </span>
                {suggestedPrompts.map((prompt, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg border border-border bg-surface-subtle hover:bg-muted/50 text-xs text-foreground transition-all hover:border-primary/40 flex items-center justify-between group gap-2"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setInputText(prompt)
                        setTimeout(() => {
                          textareaRef.current?.focus()
                        }, 0)
                      }}
                      className="flex-1 text-left cursor-pointer hover:text-primary transition-colors select-none"
                      title="Clique para colocar este texto no bloco de digitação"
                    >
                      <span>{prompt}</span>
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-[11px] text-muted-foreground hover:text-primary gap-1 shrink-0"
                      onClick={() => void handleSendMessage(prompt)}
                      title="Enviar diretamente"
                    >
                      <span className="hidden sm:inline">Enviar</span>
                      <Send className="size-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4 max-w-3xl mx-auto pb-4">
              {messages.map((m) => {
                const isUser = m.role === 'USER'
                return (
                  <div
                    key={m.id}
                    className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    <div
                      className={`size-7 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold ${
                        isUser
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-surface-subtle border border-border text-foreground'
                      }`}
                    >
                      {isUser ? <UserIcon className="size-4" /> : <Bot className="size-4 text-primary" />}
                    </div>

                    <div
                      className={`max-w-[85%] rounded-lg p-3.5 text-sm ${
                        isUser
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-surface-subtle border border-border text-foreground'
                      }`}
                    >
                      {isUser ? (
                        <p className="whitespace-pre-wrap leading-relaxed select-text">{m.content}</p>
                      ) : (
                        <div className="space-y-2">
                          <AiMarkdownRenderer content={m.content} />

                          {/* Metadados e Proveniência */}
                          {m.metadata?.provenance && (
                            <div className="mt-3 pt-2 border-t border-border/60 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                              <span className="flex items-center gap-1 font-mono">
                                <Clock className="size-3" />
                                <span>
                                  Consultado em:{' '}
                                  {new Date(m.metadata.provenance.geradoEm || m.createdAt).toLocaleTimeString('pt-BR')}
                                </span>
                              </span>
                              {m.metadata.provenance.codigo && (
                                <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 bg-background">
                                  Ref: #{m.metadata.provenance.codigo}
                                </Badge>
                              )}
                              {m.metadata.provenance.tipoProjecao && (
                                <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 bg-background">
                                  {m.metadata.provenance.tipoProjecao === 'PUBLIC' ? 'Visão Pública' : 'Visão Interna'}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}

              {/* Status de processamento ativo */}
              {(status === 'SENDING' || status === 'RUNNING') && (
                <div className="flex items-start gap-3">
                  <div className="size-7 rounded-full bg-surface-subtle border border-border flex items-center justify-center shrink-0">
                    <RotateCw className="size-3.5 text-primary animate-spin" />
                  </div>
                  <div className="rounded-lg p-3 bg-surface-subtle border border-border text-xs text-muted-foreground flex items-center gap-3">
                    <span>{statusMessage || 'Processando consulta...'}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-[11px] text-destructive hover:bg-destructive/10 gap-1"
                      onClick={handleCancelRun}
                    >
                      <StopCircle className="size-3" />
                      <span>Cancelar</span>
                    </Button>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Compositor de mensagem */}
        <footer className="p-3 border-t border-border bg-surface-subtle shrink-0">
          <div className="relative max-w-3xl mx-auto flex items-end gap-2">
            <Textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua dúvida ou instrução (Enter para enviar, Shift+Enter para quebra de linha)..."
              disabled={status === 'SENDING' || status === 'RUNNING'}
              rows={2}
              className="resize-none min-h-[52px] max-h-32 text-xs sm:text-sm bg-background border-border pr-12 focus-visible:ring-1 focus-visible:ring-primary"
            />
            <div className="absolute right-2 bottom-2 flex items-center gap-1">
              {status === 'RUNNING' ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="size-8 p-0 text-destructive hover:bg-destructive/10 rounded-md"
                  onClick={handleCancelRun}
                  title="Interromper execução"
                >
                  <StopCircle className="size-4" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="size-8 p-0 rounded-md font-semibold"
                  disabled={!inputText.trim() || status === 'SENDING'}
                  onClick={() => handleSendMessage()}
                  title="Enviar mensagem"
                >
                  <Send className="size-3.5" />
                </Button>
              )}
            </div>
          </div>
          <p className="text-[10px] text-center text-muted-foreground mt-1.5">
            O assistente analisa fontes autorizadas do TocLog com isolamento estrito por empresa.
          </p>
        </footer>
      </div>
    </div>
  )
}
