'use client'

import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'

type WorkspaceDetailStateProps = {
  kind: 'error' | 'empty'
  title?: string
  description: ReactNode
  actionLabel?: string
  onAction?: () => void
  actionDisabled?: boolean
}

export function WorkspaceDetailState({
  kind,
  title,
  description,
  actionLabel,
  onAction,
  actionDisabled = false,
}: WorkspaceDetailStateProps) {
  if (kind === 'empty') {
    return <div className="rounded-2xl border border-dashed p-5 text-sm text-muted-foreground">{description}</div>
  }

  return (
    <div className="rounded-2xl border border-destructive/30 p-5 text-sm text-muted-foreground">
      {title ? <p className="font-medium text-foreground">{title}</p> : null}
      <p className={title ? 'mt-2' : undefined}>{description}</p>
      {actionLabel && onAction ? (
        <div className="mt-4">
          <Button variant="outline" size="sm" onClick={onAction} disabled={actionDisabled}>
            {actionLabel}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
