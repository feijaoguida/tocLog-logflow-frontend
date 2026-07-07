'use client'

import { Loader2 } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'

type WorkspaceLoadingCardProps = {
  message: string
}

export function WorkspaceLoadingCard({ message }: WorkspaceLoadingCardProps) {
  return (
    <Card className="app-section-card">
      <CardContent className="flex items-center gap-3 py-10 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        {message}
      </CardContent>
    </Card>
  )
}
