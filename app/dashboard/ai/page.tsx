'use client'

import React from 'react'
import { Sparkles, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/context/auth-context'
import { AiChatInterface } from '@/components/ai/ai-chat-interface'

export default function AiDashboardPage() {
  const { user } = useAuth()

  return (
    <div className="app-page space-y-4 flex flex-col flex-1 h-[calc(100vh-5rem)] overflow-hidden">
      {/* Cabeçalho da Página no padrão TocLog (UI01) */}
      <section className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Assistente de IA
            </h1>
            <Badge variant="outline" className="gap-1 border-primary/40 bg-primary/5 text-primary text-xs py-0.5">
              <Sparkles className="size-3" />
              <span>TocLog AI</span>
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Tire dúvidas sobre processos internos, consulte indicadores de compras e acompanhe o status de chamados
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-surface-subtle px-2.5 py-1.5 rounded-md border border-border">
          <ShieldCheck className="size-3.5 text-emerald-500" />
          <span>Isolamento multi-tenant ativo</span>
        </div>
      </section>

      {/* Interface de Chat integrada */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <AiChatInterface className="flex-1 h-full max-h-none border-border" />
      </div>
    </div>
  )
}
