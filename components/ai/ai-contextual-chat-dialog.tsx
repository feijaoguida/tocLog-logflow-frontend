'use client'

import React, { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog'
import { AiChatInterface } from './ai-chat-interface'

interface AiContextualChatDialogProps {
  module: 'compras' | 'helpdesk' | 'rh' | 'frotas' | string
  title?: string
  entityId?: string
  entityTitle?: string
  triggerLabel?: string
  variant?: 'outline' | 'default' | 'ghost' | 'secondary'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
}

export function AiContextualChatDialog({
  module,
  title = 'Assistente TocLog',
  entityId,
  entityTitle,
  triggerLabel = 'Perguntar ao assistente',
  variant = 'outline',
  size = 'sm',
  className = '',
}: AiContextualChatDialogProps) {
  const [open, setOpen] = useState(false)

  const contextData = {
    module,
    entityId,
    entityTitle,
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={`h-9 gap-1.5 font-medium border-primary/30 hover:border-primary text-foreground ${className}`}
        >
          <Sparkles className="size-4 text-primary" />
          <span>{triggerLabel}</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-4xl w-[95vw] h-[85vh] max-h-[750px] p-0 flex flex-col overflow-hidden gap-0 border-border bg-card">
        <DialogHeader className="p-4 border-b border-border bg-surface-subtle shrink-0">
          <div className="flex items-center justify-between pr-6">
            <div>
              <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                <span>{title}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {entityTitle
                  ? `Contexto vinculado: ${entityTitle}`
                  : `Assistente inteligente contextualizado para ${module.toUpperCase()}`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 p-2 md:p-3 overflow-hidden bg-background">
          <AiChatInterface initialContext={contextData} compact className="h-full border-0 shadow-none rounded-none" />
        </div>
      </DialogContent>
    </Dialog>
  )
}
