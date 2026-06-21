"use client"

import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Info } from "lucide-react"

type MenuFunctionHeaderProps = {
  title: string
  description: string
  actions?: ReactNode
  children?: ReactNode
}

export function MenuFunctionHeader({
  title,
  description,
  actions,
  children,
}: MenuFunctionHeaderProps) {
  return (
    <section className="app-page-header flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-[clamp(0.875rem,1.4vw,1rem)] font-semibold tracking-[-0.01em] text-foreground">
            {title}
          </h1>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="rounded-full text-muted-foreground hover:text-foreground"
                aria-label="Informacoes da funcionalidade"
              >
                <Info className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent sideOffset={8} className="max-w-80 px-3 py-2 text-left text-xs leading-relaxed">
              {description}
            </TooltipContent>
          </Tooltip>
        </div>
        {children}
      </div>

      {actions ? <div className="flex flex-wrap items-center gap-3 xl:justify-end">{actions}</div> : null}
    </section>
  )
}
