'use client'

import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type WorkspaceInlineAlertProps = {
  title: string
  description: ReactNode
  hint?: ReactNode
  className?: string
}

export function WorkspaceInlineAlert({
  title,
  description,
  hint,
  className,
}: WorkspaceInlineAlertProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-amber-500/40 bg-amber-50/60 px-4 py-3 text-sm text-muted-foreground',
        className,
      )}
    >
      <p className="font-medium text-foreground">{title}</p>
      <p className="mt-1">{description}</p>
      {hint ? <p className="mt-1 text-xs">{hint}</p> : null}
    </div>
  )
}
