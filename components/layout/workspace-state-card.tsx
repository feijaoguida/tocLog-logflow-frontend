'use client'

import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type WorkspaceStateTone = 'default' | 'warning' | 'danger'

type WorkspaceStateCardProps = {
  title: string
  tone?: WorkspaceStateTone
  children: ReactNode
  actions?: ReactNode
  className?: string
}

const toneClassName: Record<WorkspaceStateTone, string> = {
  default: '',
  warning: 'border-amber-500/30 bg-amber-50/60',
  danger: 'border-destructive/30',
}

export function WorkspaceStateCard({
  title,
  tone = 'default',
  children,
  actions,
  className,
}: WorkspaceStateCardProps) {
  return (
    <Card className={cn('app-section-card', toneClassName[tone], className)}>
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 text-sm text-muted-foreground">
        <div className="space-y-2">{children}</div>
        {actions ? <div>{actions}</div> : null}
      </CardContent>
    </Card>
  )
}
