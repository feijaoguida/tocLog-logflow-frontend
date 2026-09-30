'use client'

import * as React from 'react'
import { Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export interface FilterPopoverProps {
  /** Quantidade de filtros ativos no momento */
  activeCount?: number
  /** Texto do botão gatilho (padrão: "Filtro") */
  triggerLabel?: string
  /** Título exibido no cabeçalho do popover */
  title?: string
  /** Callback acionado ao clicar em "Limpar filtros" */
  onClear?: () => void
  /** Callback acionado ao clicar em "Aplicar filtros" */
  onApply?: () => void
  /** Texto do botão de aplicar (padrão: "Aplicar filtros") */
  applyLabel?: string
  /** Se deve fechar o popover ao clicar em aplicar (padrão: true) */
  closeOnApply?: boolean
  /** Se exibe o rodapé com botões Fechar e Aplicar (padrão: true) */
  showFooter?: boolean
  /** Slot customizado para o rodapé */
  footer?: React.ReactNode
  /** Classes CSS extras para o container flutuante */
  contentClassName?: string
  /** Classes CSS extras para o botão gatilho */
  triggerClassName?: string
  /** Variante do botão gatilho (padrão: 'default' quando ativo, 'outline' quando inativo) */
  triggerVariant?: 'default' | 'outline' | 'secondary' | 'ghost'
  /** Conteúdo dos filtros (inputs, selects, checkboxes, etc.) */
  children: React.ReactNode
  /** Estado de abertura controlado */
  open?: boolean
  /** Callback de mudança de estado de abertura */
  onOpenChange?: (open: boolean) => void
  /** Se o botão gatilho está desabilitado */
  disabled?: boolean
  /** Alinhamento do popover em relação ao botão (padrão: 'end') */
  align?: 'start' | 'center' | 'end'
  /** Distância em pixels do popover em relação ao gatilho (padrão: 8) */
  sideOffset?: number
}

export function FilterPopover({
  activeCount = 0,
  triggerLabel = 'Filtro',
  title = 'Opções de Filtro',
  onClear,
  onApply,
  applyLabel = 'Aplicar filtros',
  closeOnApply = true,
  showFooter = true,
  footer,
  contentClassName,
  triggerClassName,
  triggerVariant,
  children,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  disabled = false,
  align = 'end',
  sideOffset = 8,
}: FilterPopoverProps) {
  const [internalOpen, setInternalOpen] = React.useState(false)

  const isControlled = controlledOpen !== undefined
  const isOpen = isControlled ? controlledOpen : internalOpen

  const handleOpenChange = (nextOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(nextOpen)
    }
    setControlledOpen?.(nextOpen)
  }

  const handleApply = () => {
    onApply?.()
    if (closeOnApply) {
      handleOpenChange(false)
    }
  }

  const defaultVariant = activeCount > 0 ? 'default' : 'outline'
  const variant = triggerVariant ?? defaultVariant

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant={variant}
          size="sm"
          disabled={disabled}
          className={cn('h-9 gap-1.5 font-medium transition-colors', triggerClassName)}
        >
          <Filter className="size-4 shrink-0" />
          <span>{triggerLabel}</span>
          {activeCount > 0 && (
            <span className="ml-1 rounded-full bg-primary-foreground/20 px-1.5 py-0.2 text-[10px] font-bold">
              {activeCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        sideOffset={sideOffset}
        className={cn(
          'w-[340px] sm:w-[460px] p-5 space-y-4 shadow-xl rounded-lg border-border bg-popover text-popover-foreground',
          contentClassName,
        )}
      >
        <div className="flex items-center justify-between border-b pb-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Filter className="size-4 text-primary" />
            <span>{title}</span>
          </div>
          {activeCount > 0 && onClear && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground font-medium"
              onClick={onClear}
            >
              Limpar filtros
            </Button>
          )}
        </div>

        <div className="space-y-3">{children}</div>

        {showFooter && (
          <div className="flex items-center justify-end gap-2 pt-2 border-t">
            {footer ? (
              footer
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenChange(false)}
                >
                  Fechar
                </Button>
                <Button size="sm" onClick={handleApply}>
                  {applyLabel}
                </Button>
              </>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
