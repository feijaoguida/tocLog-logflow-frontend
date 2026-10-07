'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { usePathname } from 'next/navigation'
import { FloatingAgentIcon } from './floating-agent-icon'
import { AiPersonalProfileDialog } from './ai-personal-profile-dialog'
import { AiChatInterface } from './ai-chat-interface'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/auth-context'
import { api } from '@/lib/api'
import { X, Minus, Settings, Bot, Sparkles } from 'lucide-react'
import { resolveAiModule, getModuleLabel } from '@/lib/ai-modules'

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

  // 1. Verificar se a IA está administrativamente ativa para a empresa (AC-05)
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

  // 2. Carregar perfil do agente pessoal (AC-01)
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

  // 3. Captura passiva do contexto da tela atual (AC-04)
  const passiveContext = useMemo(() => {
    if (!pathname) return undefined

    // Mapeamento de rotas para módulos canônicos
    let detectedModule = 'GERAL'
    if (pathname.includes('/compras')) detectedModule = 'COMPRAS'
    else if (pathname.includes('/helpdesk')) detectedModule = 'HELPDESK'
    else if (pathname.includes('/rh')) detectedModule = 'RH'
    else if (pathname.includes('/frotas')) detectedModule = 'FROTAS'
    else if (pathname.includes('/portaria')) detectedModule = 'PORTARIA'

    const pageTitle = typeof document !== 'undefined' ? document.title : ''

    return {
      module: detectedModule,
      screenTitle: pageTitle || getModuleLabel(detectedModule),
      pathname,
    }
  }, [pathname])

  // 4. Manipular clique no robô (AC-01)
  const handleIconClick = () => {
    if (hasProfile === false) {
      // Primeiro clique: força onboarding antes de abrir o chat
      setIsOnboardingMode(true)
      setIsProfileModalOpen(true)
    } else {
      // Perfil já existe: abre chat
      setIsOpen((prev) => !prev)
      setIsMinimized(false)
    }
  }

  // Não renderizar se IA não estiver ativa pelo administrador (AC-05)
  if (!aiEnabled || !user) {
    return null
  }

  const agentName = profileData?.agentName || 'Meu Agente'
  const themeColor = profileData?.themeColor || '#3B82F6'

  return (
    <>
      {/* Botão flutuante animado com 3 estados (AC-02, AC-06) */}
      {!isOpen && (
        <FloatingAgentIcon
          onClick={handleIconClick}
          title={`Conversar com ${agentName}`}
          themeColorHex={themeColor}
        />
      )}

      {/* Janela de Chat Flutuante Inteligente (AC-02, AC-03, AC-04) */}
      {isOpen && (
        <Card
          className={`fixed right-4 sm:right-6 shadow-2xl z-50 w-[95vw] sm:w-[480px] transition-all duration-300 border-primary/20 flex flex-col bg-background ${
            isMinimized
              ? 'bottom-22 h-14 overflow-hidden'
              : 'bottom-4 sm:bottom-6 h-[620px] max-h-[88vh]'
          }`}
        >
          {/* Cabeçalho coordenado e personalizado */}
          <CardHeader className="p-3 border-b flex flex-row items-center justify-between space-y-0 h-14 bg-card shrink-0">
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white shadow-sm"
                style={{ backgroundColor: themeColor }}
              >
                <Bot className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <CardTitle className="text-sm font-semibold leading-none">
                    {agentName}
                  </CardTitle>
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
                </div>
                <span className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                  {passiveContext?.screenTitle ? `Contexto: ${passiveContext.screenTitle}` : 'Assistente IA'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                title="Configurar preferências do agente"
                onClick={() => {
                  setIsOnboardingMode(false)
                  setIsProfileModalOpen(true)
                }}
              >
                <Settings className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                title={isMinimized ? 'Expandir' : 'Minimizar'}
                onClick={() => setIsMinimized((prev) => !prev)}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                title="Fechar"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          {/* Conteúdo do Chat: AiChatInterface reaproveitada com contexto passivo (AC-04) */}
          {!isMinimized && (
            <CardContent className="p-0 flex-1 overflow-hidden relative">
              <AiChatInterface
                compact
                initialContext={passiveContext}
                className="h-full border-none shadow-none rounded-none"
              />
            </CardContent>
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
