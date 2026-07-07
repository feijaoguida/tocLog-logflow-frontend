'use client'

import type { ReactNode } from 'react'

type WorkspaceEmptyStateProps = {
  children: ReactNode
  className?: string
}

export function WorkspaceEmptyState({ children, className }: WorkspaceEmptyStateProps) {
  return (
    <div className={`rounded-2xl border border-dashed p-4 text-sm text-muted-foreground ${className ?? ''}`.trim()}>
      {children}
    </div>
  )
}
