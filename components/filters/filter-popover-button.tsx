"use client"

import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { Filter, X } from "lucide-react"

type FilterPopoverButtonProps = {
  title: string
  description?: string
  children: ReactNode
  active?: boolean
  activeSummary?: string | string[]
  label?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  className?: string
  contentClassName?: string
  align?: "start" | "center" | "end"
  footer?: ReactNode
  onClear?: () => void
  clearLabel?: string
  showClear?: boolean
}

function normalizeSummary(summary?: string | string[]) {
  if (!summary) return []
  return Array.isArray(summary) ? summary.filter(Boolean) : [summary]
}

export function FilterPopoverButton({
  title,
  description,
  children,
  active = false,
  activeSummary,
  label = "Filtros",
  open,
  onOpenChange,
  className,
  contentClassName,
  align = "end",
  footer,
  onClear,
  clearLabel = "Limpar filtro",
  showClear = false,
}: FilterPopoverButtonProps) {
  const summaryLines = normalizeSummary(activeSummary)

  const button = (
    <Button
      type="button"
      variant="outline"
      className={cn(
        "relative h-10 gap-2 px-4",
        active && "border-primary/50 bg-primary/5 text-primary hover:bg-primary/10",
        className,
      )}
      onClick={() => onOpenChange(!open)}
      aria-pressed={open}
    >
      <Filter className="h-4 w-4" />
      {label}
      {active ? (
        <span className="absolute right-2.5 top-2.5 flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/35" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
        </span>
      ) : null}
    </Button>
  )

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverAnchor asChild>
        <div className="inline-flex">
          {active && summaryLines.length > 0 ? (
            <Tooltip>
              <TooltipTrigger asChild>{button}</TooltipTrigger>
              <TooltipContent sideOffset={8} className="max-w-72 space-y-1 px-3 py-2 text-left">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] opacity-70">
                  Filtros aplicados
                </p>
                {summaryLines.map((line) => (
                  <p key={line} className="text-xs leading-relaxed">
                    {line}
                  </p>
                ))}
              </TooltipContent>
            </Tooltip>
          ) : (
            button
          )}
        </div>
      </PopoverAnchor>

      <PopoverContent align={align} className={cn("w-[min(92vw,30rem)] p-0", contentClassName)}>
        <div className="border-b border-border/70 px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-base font-semibold">{title}</h3>
              {description ? (
                <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
              ) : null}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="shrink-0"
              onClick={() => onOpenChange(false)}
              aria-label="Fechar filtros"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>

        {footer || showClear ? (
          <div className="border-t border-border/70 px-5 py-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                {showClear && onClear ? (
                  <Button type="button" variant="ghost" className="px-0 text-muted-foreground hover:text-foreground" onClick={onClear}>
                    {clearLabel}
                  </Button>
                ) : null}
              </div>
              {footer}
            </div>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}
