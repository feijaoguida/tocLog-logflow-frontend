import React from "react"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
  eyebrow?: string
  title: string
  description?: string
  actions?: React.ReactNode
  className?: string
  children?: React.ReactNode
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
  children,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 border-b border-border/60 pb-5 md:flex-row md:items-end md:justify-between",
        className
      )}
    >
      <div className="flex flex-col gap-1.5">
        {eyebrow && (
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            {eyebrow}
          </span>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2.5">
          {actions}
        </div>
      )}

      {children}
    </div>
  )
}
