"use client"

import React from "react"
import {
  ChevronRight,
  Bell,
  Search,
  LayoutDashboard,
  Home,
  Database,
  Truck,
  Check,
  AlertTriangle,
  XCircle,
  Info,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { type ThemePaletteDefinition } from "@/lib/theme-system"

interface ThemeSelectionShellPreviewProps {
  palette: ThemePaletteDefinition
  mode: "light" | "dark"
}

export function ThemeSelectionShellPreview({
  palette,
  mode,
}: ThemeSelectionShellPreviewProps) {
  const isDark = mode === "dark"
  const tokens = palette[mode].tokens

  return (
    <div
      className="w-full rounded-lg border border-border bg-card overflow-hidden shadow-xs transition-colors"
      style={{
        ["--primary" as string]: tokens.primary,
        ["--primary-hover" as string]: tokens.primaryHover,
        ["--primary-active" as string]: tokens.primaryActive,
        ["--primary-subtle" as string]: tokens.primarySubtle,
        ["--ring" as string]: tokens.primary,
      }}
    >
      {/* Mini Shell Layout */}
      <div className="flex h-full min-h-[320px]">
        {/* Mini Sidebar */}
        <div className="w-48 shrink-0 border-r border-border bg-surface-subtle p-3 flex flex-col justify-between">
          <div className="flex flex-col gap-3">
            {/* Logo */}
            <div className="flex items-center gap-2 px-2 py-1">
              <div
                className="flex size-6 items-center justify-center rounded text-white text-xs font-bold"
                style={{ backgroundColor: tokens.primary }}
              >
                <Truck className="size-3.5" />
              </div>
              <span className="text-xs font-bold tracking-tight text-foreground">
                TocLog
              </span>
            </div>

            {/* Menu Items */}
            <div className="flex flex-col gap-1 text-xs">
              <div
                className="flex items-center gap-2 rounded px-2.5 py-1.5 font-medium transition-colors"
                style={{
                  backgroundColor: tokens.primarySubtle,
                  color: tokens.primary,
                }}
              >
                <LayoutDashboard className="size-3.5" />
                <span>Dashboard</span>
              </div>
              <div className="flex items-center gap-2 rounded px-2.5 py-1.5 text-muted-foreground hover:bg-muted/50">
                <Home className="size-3.5" />
                <span>Intranet</span>
              </div>
              <div className="flex items-center gap-2 rounded px-2.5 py-1.5 text-muted-foreground hover:bg-muted/50">
                <Database className="size-3.5" />
                <span>Cadastros</span>
              </div>
            </div>
          </div>

          <div className="border-t border-border/60 pt-2 px-1">
            <span className="text-[10px] text-muted-foreground">
              {palette.name} · {isDark ? "Escuro" : "Claro"}
            </span>
          </div>
        </div>

        {/* Mini Body */}
        <div className="flex flex-1 flex-col">
          {/* Mini Topbar */}
          <div className="flex h-11 items-center justify-between border-b border-border bg-card px-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Search className="size-3.5" />
              <span className="text-[11px]">Buscar no sistema...</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Bell className="size-3.5 text-muted-foreground" />
              <div
                className="flex size-6 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                style={{ backgroundColor: tokens.primary }}
              >
                DT
              </div>
            </div>
          </div>

          {/* Mini Content */}
          <div className="flex flex-col gap-4 p-4">
            {/* Buttons & Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" className="h-8 text-xs font-medium">
                Botão primário
              </Button>
              <Button size="sm" variant="secondary" className="h-8 text-xs">
                Botão secundário
              </Button>
              <div className="flex items-center gap-1.5 pl-2">
                <span className="text-xs text-muted-foreground">Switch:</span>
                <Switch defaultChecked />
              </div>
            </div>

            {/* Semantic Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="success" className="text-[11px] gap-1">
                <Check className="size-2.5" /> Sucesso
              </Badge>
              <Badge variant="warning" className="text-[11px] gap-1">
                <AlertTriangle className="size-2.5" /> Aviso
              </Badge>
              <Badge variant="destructive" className="text-[11px] gap-1">
                <XCircle className="size-2.5" /> Erro
              </Badge>
              <Badge variant="info" className="text-[11px] gap-1">
                <Info className="size-2.5" /> Informação
              </Badge>
            </div>

            {/* Card Example */}
            <div
              className="flex items-center justify-between rounded-lg border p-3.5 transition-colors"
              style={{
                borderColor: tokens.primary,
                backgroundColor: tokens.primarySubtle,
              }}
            >
              <div className="flex flex-col gap-0.5">
                <h4
                  className="text-xs font-semibold"
                  style={{ color: tokens.primary }}
                >
                  Card de exemplo
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  Este é um exemplo de componente utilizando a assinatura visual {palette.name}.
                </p>
              </div>
              <ChevronRight
                className="size-4 shrink-0"
                style={{ color: tokens.primary }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
