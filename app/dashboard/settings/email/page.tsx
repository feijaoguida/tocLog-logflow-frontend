'use client'

import React from 'react'
import { Mail } from 'lucide-react'
import { EmailSettingsPanel } from '@/components/email/email-settings-panel'
import { Badge } from '@/components/ui/badge'

export default function EmailSettingsRoutePage() {
  return (
    <div className="app-page">
      <section className="app-page-header theme-surface">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <p className="app-kicker flex items-center gap-1.5">
              <Mail className="size-3.5 text-primary" />
              Comunicações & Mensageria
            </p>
            <h1 className="app-title">Configurações de E-mail</h1>
            <p className="app-subtitle">
              Gestão de provedores (Resend & SMTP), contingência automática e regras de notificação por evento corporativo.
            </p>
          </div>
          <Badge variant="outline" className="rounded-full px-4 py-2">
            Multi-Tenant Isolado
          </Badge>
        </div>
      </section>

      <div className="pt-2">
        <EmailSettingsPanel />
      </div>
    </div>
  )
}
