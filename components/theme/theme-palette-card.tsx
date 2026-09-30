"use client"

import { CheckCircle2, Circle } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  getThemePreview,
  type ThemePaletteDefinition,
} from "@/lib/theme-system"

type ThemePaletteCardProps = {
  palette: ThemePaletteDefinition
  mode: "light" | "dark"
  selected?: boolean
  onSelect?: (paletteId: ThemePaletteDefinition["id"]) => void
  className?: string
}

export function ThemePaletteCard({
  palette,
  mode,
  selected = false,
  onSelect,
  className,
}: ThemePaletteCardProps) {
  const preview = getThemePreview(palette.id, mode)

  return (
    <button
      type="button"
      onClick={() => onSelect?.(palette.id)}
      className={cn(
        "group relative flex w-full flex-col justify-between gap-4 rounded-lg border p-4 text-left shadow-xs transition-all outline-none",
        selected
          ? "border-primary bg-primary/4 ring-1 ring-primary"
          : "border-border bg-card hover:border-border-strong hover:bg-surface-subtle",
        className
      )}
      aria-pressed={selected}
    >
      <div className="flex w-full items-start justify-between gap-3">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: preview.tokens.primary }}
            />
            <h3 className="text-base font-semibold tracking-tight text-foreground">
              {palette.name}
            </h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground leading-normal">
            {palette.personality}
          </p>
        </div>

        <div className="shrink-0 text-primary">
          {selected ? (
            <CheckCircle2 className="size-5" />
          ) : (
            <Circle className="size-5 text-muted-foreground/40 group-hover:text-muted-foreground/70" />
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 pt-2">
        {/* Color swatches bar */}
        <div className="grid grid-cols-4 gap-1.5 h-6 w-full rounded overflow-hidden">
          {preview.chips.map((chip, index) => (
            <span
              key={index}
              className="h-full w-full rounded-sm"
              style={{ backgroundColor: chip }}
            />
          ))}
        </div>

        <div className="flex items-center justify-between pt-1">
          <span
            className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium"
            style={{
              backgroundColor: preview.tokens.primarySubtle,
              color: preview.tokens.primary,
            }}
          >
            {preview.tokens.primary}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {mode === "dark" ? "Modo Escuro" : "Modo Claro"}
          </span>
        </div>
      </div>
    </button>
  )
}
