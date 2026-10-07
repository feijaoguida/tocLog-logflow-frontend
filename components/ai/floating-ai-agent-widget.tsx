'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { usePathname } from 'next/navigation'
import { FloatingAgentIcon } from './floating-agent-icon'
import { AiPersonalProfileDialog } from './ai-personal-profile-dialog'
import { AiMarkdownRenderer } from './ai-markdown-renderer'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/context/auth-context'
import { api } from '@/lib/api'
import { getScreenSnapshot, ScreenSnapshot } from '@/lib/screen-context-reader'
import {
  X,
  Minus,
  Settings,
  Send,
  Sparkles,
  Bot,
  RotateCw,
  Plus,
  Compass,
  ScanEye,
  ChevronDown,
} from 'lucide-react'
import { toast } from 'sonner'

interface ChatMessage {
  id: string
  role: 'USER' | 'ASSISTANT' | 'SYSTEM'
  content: string
  createdAt: string
  screenTag?: string
}

export function FloatingAiAgentWidget() {
  const { user } = useAuth()
  const pathname = usePathname()

  const [aiEnabled, setAiEnabled] = useState(false)
  const [hasProfile, setHasProfile] = useState<boolean | null>(null)
  const [profileData, setProfileData] = useState<any>(null)

  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [isOnboardingMode, setIsOnboardingMode] = useState(false)

  // Mensagens e conversa ativa
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [status, setStatus] = useState<'IDLE' | 'SENDING' | 'RUNNING'>('IDLE')
  const [statusMessage, setStatusMessage] = useState('')

  // Contexto da tela em tempo real
  const [currentScreen, setCurrentScreen] = useState<ScreenSnapshot>({
    pathname: '',
    module: 'GERAL',
    title: 'TocLog',
    primaryActions: [],
  })

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  // 1. Atualizar contexto da tela em tempo real quando rota mudar
  useEffect(() => {
    const snapshot = getScreenSnapshot(false)
    setCurrentScreen(snapshot)
  }, [pathname])

  // 2. Verificar se a IA está administrativamente ativa (AC-05)
  useEffect(() => {
    if (!user) {
      setAiEnabled(false)
      setIsOpen(false)
      return
    }

    let isMounted = true
    api
      .get('/ai/settings/status')
      .then((res) => {
        if (isMounted) {
          setAiEnabled(Boolean(res.data?.enabled))
        }
      })
      .catch(() => {
        if (isMounted) setAiEnabled(false)
      })

    return () => {
      isMounted = false
    }
  }, [user?.companyId, user?.id])

  // 3. Carregar perfil do agente pessoal (AC-01)
  const loadProfile = () => {
    if (!user) return
    api
      .get('/ai/profile/me')
      .then((res) => {
        setHasProfile(Boolean(res.data?.hasProfile))
        setProfileData(res.data?.profile || null)
      })
      .catch(() => {
        setHasProfile(false)
        setProfileData(null)
      })
  }

  useEffect(() => {
    if (aiEnabled && user) {
      loadProfile()
    }
  }, [aiEnabled, user?.companyId, user?.id])

  // Auto-scroll ao receber novas mensagens
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, statusMessage, isOpen, isMinimized])

  // Ao abrir o chat, focar no campo de digitação e atualizar leitura da tela
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setCurrentScreen(getScreenSnapshot(false))
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [isOpen, isMinimized])

  // 4. Parar polling
  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }

  // 5. Iniciar polling para aguardar resposta do modelo
  const startPollingRun = (runId: string, convId: string) => {
    stopPolling()
    setStatus('RUNNING')
    setStatusMessage('Consultando dados do sistema...')

    let attempts = 0
    const maxAttempts = 50

    pollingRef.current = setInterval(async () => {
      attempts++
      try {
        const { data: run } = await api.get(`/ai/runs/${runId}`)

        if (run.status === 'COMPLETED') {
          stopPolling()
          setStatus('IDLE')
          setStatusMessage('')

          const { data: updatedMessages } = await api.get(`/ai/conversations/${convId}/messages`)
          const formatted = (Array.isArray(updatedMessages) ? updatedMessages : []).map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            createdAt: m.createdAt,
            screenTag: m.references?.title,
          }))
          setMessages(formatted)
          return
        }

        if (run.status === 'FAILED' || run.status === 'CANCELLED') {
          stopPolling()
          setStatus('IDLE')
          setStatusMessage('')
          toast.error(run.error || 'A consulta foi encerrada com erro.')
          return
        }

        if (run.status === 'RUNNING') {
          setStatusMessage('Digitando resposta...')
        }
      } catch {
        if (attempts >= maxAttempts) {
          stopPolling()
          setStatus('IDLE')
          setStatusMessage('')
          toast.error('Tempo limite de resposta atingido.')
        }
      }

      if (attempts >= maxAttempts) {
        stopPolling()
        setStatus('IDLE')
        setStatusMessage('')
      }
    }, 1500)
  }

  // 6. Enviar mensagem com contexto visual e de tela em tempo real
  const handleSendMessage = async (customText?: string, isDetailedRequest: boolean = false) => {
    const textToSend = (customText || inputValue).trim()
    if (!textToSend || status === 'SENDING' || status === 'RUNNING') return

    // Ler a tela atual no exato momento do envio
    const screenSnapshot = getScreenSnapshot(isDetailedRequest)
    setCurrentScreen(screenSnapshot)

    setInputValue('')
    setStatus('SENDING')
    setStatusMessage('Enviando...')

    // Mensagem otimista no chat
    const userMessageItem: ChatMessage = {
      id: `opt-${Date.now()}`,
      role: 'USER',
      content: textToSend,
      createdAt: new Date().toISOString(),
      screenTag: screenSnapshot.title,
    }
    setMessages((prev) => [...prev, userMessageItem])

    try {
      let convId = activeConversationId

      // Criar conversa se não existir
      if (!convId) {
        const title = textToSend.length > 35 ? `${textToSend.slice(0, 35)}...` : textToSend
        const { data: newConv } = await api.post('/ai/conversations', {
          title,
          contextType: screenSnapshot.module,
        })
        convId = newConv.id
        setActiveConversationId(newConv.id)
      }

      const clientRequestId = crypto.randomUUID()

      // Postar mensagem passando o contexto visual da tela e botões
      const { data: postResult } = await api.post(`/ai/conversations/${convId}/messages`, {
        text: textToSend,
        content: textToSend,
        clientRequestId,
        screenContext: {
          title: screenSnapshot.title || undefined,
          description: screenSnapshot.description || undefined,
          pathname: screenSnapshot.pathname || undefined,
          module: screenSnapshot.module || undefined,
          primaryActions: screenSnapshot.primaryActions?.length ? screenSnapshot.primaryActions : undefined,
          screenDetails: screenSnapshot.screenDetails || undefined,
        },
      })

      const runId = postResult.runId || postResult.run?.id
      if (runId && convId) {
        startPollingRun(runId, convId)
      } else {
        setStatus('IDLE')
        setStatusMessage('')
        if (convId) {
          const { data: updatedMessages } = await api.get(`/ai/conversations/${convId}/messages`)
          const formatted = (Array.isArray(updatedMessages) ? updatedMessages : []).map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            createdAt: m.createdAt,
            screenTag: m.references?.title,
          }))
          setMessages(formatted)
        }
      }
    } catch (err: any) {
      setStatus('IDLE')
      setStatusMessage('')
      const msg = err.response?.data?.message || 'Falha ao enviar mensagem.'
      toast.error(typeof msg === 'string' ? msg : 'Erro ao processar mensagem.')
    }
  }

  // 7. Limpar conversa atual
  const handleNewConversation = () => {
    setActiveConversationId(null)
    setMessages([])
    setStatus('IDLE')
    setStatusMessage('')
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  // 8. Sugestões de perguntas contextuais baseadas na tela atual
  const screenSuggestions = useMemo(() => {
    const list = [
      `Como cadastrar nesta tela?`,
      `Quais botões estão disponíveis aqui?`,
    ]

    if (currentScreen.module === 'COMPRAS') {
      list.push('Qual o fluxo de aprovação de pedidos?')
    } else if (currentScreen.module === 'HELPDESK') {
      list.push('Como abrir um novo chamado?')
    } else if (currentScreen.module === 'RH') {
      list.push('Como cadastrar um novo colaborador?')
    } else {
      list.push('O que posso fazer nesta tela?')
    }

    return list
  }, [currentScreen.module, currentScreen.title])

  // Manipular clique no robô
  const handleIconClick = () => {
    if (hasProfile === false) {
      setIsOnboardingMode(true)
      setIsProfileModalOpen(true)
    } else {
      setIsOpen((prev) => !prev)
      setIsMinimized(false)
    }
  }

  if (!aiEnabled || !user) {
    return null
  }

  const agentName = profileData?.agentName || 'TocBot'
  const themeColor = profileData?.themeColor || '#3B82F6'

  return (
    <>
      {/* Botão flutuante animado com 3 estados (AC-02, AC-06) */}
      {!isOpen && (
        <FloatingAgentIcon
          onClick={handleIconClick}
          title={`Conversar com ${agentName}`}
          themeColorHex={themeColor}
          pathname={pathname}
        />
      )}

      {/* Janela de Chat Flutuante estilo Instagram Direct / Chat Interno */}
      {isOpen && (
        <Card
          data-ai-widget="true"
          className={`fixed right-4 sm:right-6 z-50 transition-all duration-300 shadow-2xl border border-border bg-card flex flex-col overflow-hidden ${
            isMinimized
              ? 'bottom-4 h-14 w-80 rounded-xl'
              : 'bottom-4 sm:bottom-6 w-[94vw] sm:w-[390px] h-[550px] max-h-[86vh] rounded-2xl'
          }`}
        >
          {/* Cabeçalho Limpo Estilo Instagram / Chat Interno */}
          <CardHeader className="p-3 border-b flex flex-row items-center justify-between space-y-0 h-14 bg-card shrink-0">
            <div className="flex items-center gap-2.5 overflow-hidden">
              {/* Mini avatar com imagem do mascote */}
              <div
                className="relative size-9 rounded-full overflow-hidden shrink-0 border border-primary/30 flex items-center justify-center bg-primary/10"
                style={{ borderColor: themeColor }}
              >
                <img
                  src="/assets/agent/robot-normal.webp?v=3"
                  alt={agentName}
                  className="size-full object-contain pointer-events-none select-none"
                />
                <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
              </div>

              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <CardTitle className="text-sm font-semibold truncate leading-tight">
                    {agentName}
                  </CardTitle>
                </div>
                {/* Pill indicadora da tela ativa */}
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground truncate" title={currentScreen.title}>
                  <Compass className="size-3 text-primary shrink-0" />
                  <span className="truncate max-w-[190px]">{currentScreen.title}</span>
                </div>
              </div>
            </div>

            {/* Ações do cabeçalho */}
            <div className="flex items-center gap-0.5 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-foreground"
                title="Nova conversa limpa"
                onClick={handleNewConversation}
              >
                <Plus className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-foreground"
                title="Configurações do agente"
                onClick={() => {
                  setIsOnboardingMode(false)
                  setIsProfileModalOpen(true)
                }}
              >
                <Settings className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-foreground"
                title={isMinimized ? 'Expandir' : 'Minimizar'}
                onClick={() => setIsMinimized((prev) => !prev)}
              >
                <Minus className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:text-foreground"
                title="Fechar"
                onClick={() => setIsOpen(false)}
              >
                <X className="size-4" />
              </Button>
            </div>
          </CardHeader>

          {/* Corpo do Chat / Mensagens com barra de rolagem padronizada da tela */}
          {!isMinimized && (
            <div className="flex flex-col flex-1 min-h-0 bg-background/50">
              <div className="flex-1 min-h-0 overflow-y-auto p-3 custom-scrollbar">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-3 my-auto">
                    <div className="size-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden p-1">
                      <img
                        src="/assets/agent/robot-smiling.webp?v=3"
                        alt={agentName}
                        className="size-full object-contain pointer-events-none"
                      />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">
                        Olá, {user.name.split(' ')[0]}!
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Estou acompanhando sua navegação. Como posso ajudar nesta tela?
                      </p>
                    </div>

                    <div className="w-full pt-1">
                      <div className="rounded-lg bg-surface-subtle border border-border p-2 text-left mb-3">
                        <div className="flex items-center gap-1.5 text-[11px] font-medium text-foreground">
                          <Compass className="size-3.5 text-primary" />
                          <span>Tela atual: <strong>{currentScreen.title}</strong></span>
                        </div>
                        {currentScreen.primaryActions.length > 0 && (
                          <p className="text-[10px] text-muted-foreground mt-1">
                            Ações detectadas: {currentScreen.primaryActions.slice(0, 3).join(', ')}
                          </p>
                        )}
                      </div>

                      <div className="space-y-1.5 text-left">
                        <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider px-1">
                          Perguntas rápidas
                        </p>
                        {screenSuggestions.map((sug, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => void handleSendMessage(sug)}
                            className="w-full text-left p-2 rounded-lg text-xs bg-card hover:bg-muted/70 border border-border transition-colors flex items-center justify-between text-foreground"
                          >
                            <span className="truncate">{sug}</span>
                            <Send className="size-3 text-muted-foreground shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 pb-2">
                    {messages.map((m) => {
                      const isUser = m.role === 'USER'
                      return (
                        <div
                          key={m.id}
                          className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                        >
                          <div
                            className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs sm:text-sm leading-relaxed ${
                              isUser
                                ? 'bg-primary text-primary-foreground rounded-br-xs shadow-xs'
                                : 'bg-muted/80 text-foreground rounded-bl-xs border border-border/50 shadow-xs'
                            }`}
                          >
                            {isUser ? (
                              <p className="whitespace-pre-wrap select-text">{m.content}</p>
                            ) : (
                              <AiMarkdownRenderer content={m.content} />
                            )}
                          </div>
                          <span className="text-[9px] text-muted-foreground mt-1 px-1">
                            {new Date(m.createdAt).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      )
                    })}

                    {/* Indicador de digitando */}
                    {(status === 'SENDING' || status === 'RUNNING') && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-2xl px-3 py-2 max-w-[70%] border border-border/40">
                        <RotateCw className="size-3 animate-spin text-primary" />
                        <span>{statusMessage || 'Pensando...'}</span>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Sugestões rápidas acima do input */}
              {messages.length > 0 && (
                <div className="px-3 py-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 border-t border-border/40 bg-card/40">
                  <button
                    type="button"
                    onClick={() => void handleSendMessage('Por favor, leia os detalhes e dados da tela atual.', true)}
                    className="inline-flex items-center gap-1 text-[10px] bg-muted/60 hover:bg-muted text-foreground border border-border rounded-full px-2 py-0.5 whitespace-nowrap transition-colors"
                    title="Faz a IA ler colunas, formulários e métricas visíveis na tela atual"
                  >
                    <ScanEye className="size-3 text-primary" />
                    <span>Ler tela atual</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSendMessage(`Como fazer um cadastro na tela de ${currentScreen.title}?`)}
                    className="inline-flex items-center gap-1 text-[10px] bg-muted/60 hover:bg-muted text-foreground border border-border rounded-full px-2 py-0.5 whitespace-nowrap transition-colors"
                  >
                    <span>Como cadastrar aqui?</span>
                  </button>
                </div>
              )}

              {/* Rodapé: Input Estilo Instagram Direct */}
              <div className="p-2.5 border-t border-border bg-card shrink-0">
                <form
                  className="flex items-center gap-1.5"
                  onSubmit={(e) => {
                    e.preventDefault()
                    void handleSendMessage()
                  }}
                >
                  <div className="flex-1 relative flex items-center bg-muted/50 rounded-full border border-border focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-all px-3 py-1">
                    <Input
                      ref={inputRef}
                      placeholder={`Mensagem para ${agentName}...`}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      disabled={status === 'SENDING' || status === 'RUNNING'}
                      className="h-8 border-0 shadow-none bg-transparent focus-visible:ring-0 text-xs sm:text-sm px-0 placeholder:text-muted-foreground"
                    />
                  </div>

                  <Button
                    type="submit"
                    size="icon"
                    disabled={!inputValue.trim() || status === 'SENDING' || status === 'RUNNING'}
                    className="size-9 rounded-full shrink-0 shadow-xs"
                    title="Enviar mensagem"
                  >
                    <Send className="size-4" />
                  </Button>
                </form>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Modal de Onboarding e Ajustes de Personalidade do Agente (AC-01) */}
      <AiPersonalProfileDialog
        isOpen={isProfileModalOpen}
        isOnboarding={isOnboardingMode}
        onClose={() => setIsProfileModalOpen(false)}
        onSaved={(newProfile) => {
          setHasProfile(true)
          setProfileData(newProfile)
          if (isOnboardingMode) {
            setIsOnboardingMode(false)
            setIsOpen(true)
          }
        }}
      />
    </>
  )
}
