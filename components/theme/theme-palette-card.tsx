"use client"

import { CheckCircle2 } from "lucide-react"

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
        "group flex h-full w-full flex-col gap-4 rounded-[28px] border border-border/70 bg-card p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        selected && "border-primary shadow-lg ring-2 ring-primary/15",
        className,
      )}
      aria-pressed={selected}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Color Palette
          </p>
          <h3 className="mt-2 text-xl font-semibold tracking-tight">{palette.name}</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {palette.description}
          </p>
        </div>
        {selected ? (
          <CheckCircle2 className="mt-0.5 size-5 text-primary" />
        ) : (
          <span className="mt-1 size-4 rounded-full border border-border/80" />
        )}
      </div>

      <div
        className="rounded-[24px] border border-border/60 p-4"
        style={{ backgroundColor: preview.hero }}
      >
        <div className="grid gap-3 md:grid-cols-[1.1fr_1fr_0.9fr]">
          <Swatch tone={preview.primary} className="min-h-28" />
          <Swatch tone={preview.ink} className="min-h-28" />
          <Swatch tone={preview.neutral} className="min-h-28" />
        </div>

        <div className="mt-3 grid grid-cols-4 gap-2">
          {preview.chips.map((chip) => (
            <span
              key={chip}
              className="h-4 rounded-full border border-white/30"
              style={{ backgroundColor: chip }}
            />
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
          {preview.states.map((tone) => (
            <div
              key={tone.label}
              className="rounded-2xl px-3 py-3 text-xs font-semibold uppercase tracking-[0.16em]"
              style={{
                backgroundColor: tone.hex,
                color: tone.textHex ?? "#ffffff",
              }}
            >
              {tone.label}
            </div>
          ))}
        </div>

        <p className="mt-4 text-sm font-medium text-foreground">
          {palette.name} · {mode === "dark" ? "Modo Escuro" : "Modo Claro"}
        </p>
      </div>

      <p className="text-sm text-muted-foreground">{palette.personality}</p>
    </button>
  )
}

function Swatch({
  tone,
  className,
}: {
  tone: { label: string; hex: string; textHex?: string }
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col justify-between rounded-[20px] px-4 py-4 shadow-sm",
        className,
      )}
      style={{
        backgroundColor: tone.hex,
        color: tone.textHex ?? "#ffffff",
      }}
    >
      <span className="text-[11px] font-bold uppercase tracking-[0.2em] opacity-90">
        {tone.label}
      </span>
      <span className="text-2xl font-semibold tracking-tight">{tone.hex}</span>
    </div>
  )
}
