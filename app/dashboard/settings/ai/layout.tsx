'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Sparkles,
  Settings,
  Cpu,
  Bot,
  BookOpen,
  Wrench,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/context/auth-context'

export default function AiSettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { user, hasPermission } = useAuth()

  // Verificação de permissões administrativas (AC-01)
  const canManage =
    user?.accessType === 'SAAS_ADMIN' ||
    user?.accessType === 'COMPANY_ADMIN' ||
    hasPermission('ai.settings.manage') ||
    hasPermission('ai.assistants.manage') ||
    hasPermission('system.settings.manage')

  if (!canManage) {
    return (
      <div className="app-page space-y-6">
        <Card className="p-8 text-center space-y-3 max-w-lg mx-auto border-destructive/20 bg-destructive/5">
          <div className="size-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
            <ShieldAlert className="size-6" />
          </div>
          <h2 className="text-base font-semibold text-foreground">Acesso Administrativo Restrito</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Seu perfil não possui a permissão <code className="font-mono bg-muted/60 px-1 py-0.5 rounded text-destructive">ai.settings.manage</code> para configurar conexões, assistentes ou parâmetros globais de inteligência artificial.
          </p>
        </Card>
      </div>
    )
  }

  const tabs = [
    {
      title: 'Geral e Limites',
      href: '/dashboard/settings/ai',
      icon: Settings,
      exact: true,
    },
    {
      title: 'Conexões e Chaves',
      href: '/dashboard/settings/ai/connections',
      icon: Cpu,
    },
    {
      title: 'Assistentes',
      href: '/dashboard/settings/ai/assistants',
      icon: Bot,
    },
    {
      title: 'Bases de Conhecimento',
      href: '/dashboard/settings/ai/knowledge',
      icon: BookOpen,
    },
    {
      title: 'Ferramentas Configuráveis',
      href: '/dashboard/settings/ai/tools',
      icon: Wrench,
    },
    {
      title: 'Uso e Auditoria',
      href: '/dashboard/settings/ai/usage',
      icon: Sparkles,
    },
  ]

  return (
    <div className="app-page space-y-6">
      {/* Cabeçalho Padronizado TocLog (UI01) */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Administração de IA
            </h1>
            <Badge variant="outline" className="gap-1 border-primary/40 bg-primary/5 text-primary text-xs py-0.5">
              <Sparkles className="size-3" />
              <span>Painel de Governança</span>
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure credenciais criptografadas, limites diários, retenção e catálogo de assistentes por empresa
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-surface-subtle px-3 py-1.5 rounded-md border border-border">
          <ShieldCheck className="size-4 text-emerald-500" />
          <span>Isolamento Ativo: <strong>{user?.companyId || 'Empresa Padrão'}</strong></span>
        </div>
      </section>

      {/* Navegação por Abas no padrão TocLog */}
      <nav className="flex items-center gap-1 border-b border-border pb-px overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = tab.exact
            ? pathname === tab.href
            : pathname === tab.href || pathname?.startsWith(tab.href + '/')
          const Icon = tab.icon

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                isActive
                  ? 'border-primary text-primary font-semibold'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              <Icon className="size-4" />
              <span>{tab.title}</span>
            </Link>
          )
        })}
      </nav>

      {/* Conteúdo da Aba */}
      <div>{children}</div>
    </div>
  )
}
