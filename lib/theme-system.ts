export type ThemeMode = "light" | "dark" | "system"
export type ThemeColor = "ruby" | "royal" | "forest" | "ember"
export type ThemePaletteId = ThemeColor

type PreviewTone = {
  label: string
  hex: string
  textHex?: string
}

type PaletteTokens = {
  primary: string
  primaryHover: string
  primaryActive: string
  primarySubtle: string
  primaryMuted: string
  primaryForeground: string
  accent: string
  accentForeground: string
}

type PaletteModePreview = {
  hero: string
  surface: string
  primary: PreviewTone
  ink: PreviewTone
  neutral: PreviewTone
  states: PreviewTone[]
  chips: string[]
  tokens: PaletteTokens
}

export type ThemePaletteDefinition = {
  id: ThemeColor
  name: string
  description: string
  personality: string
  light: PaletteModePreview
  dark: PaletteModePreview
}

export const DEFAULT_THEME_MODE: ThemeMode = "system"
export const DEFAULT_THEME_PALETTE: ThemeColor = "ruby"
export const DEFAULT_THEME_COLOR: ThemeColor = "ruby"

export const THEME_PALETTES: ThemePaletteDefinition[] = [
  {
    id: "ruby",
    name: "Ruby",
    description: "Identidade institucional TocLog, contraste premium e leitura calorosa.",
    personality: "Direta, premium e operacional.",
    light: {
      hero: "#fff1f3",
      surface: "#ffffff",
      primary: { label: "Primary Red", hex: "#c6102e", textHex: "#ffffff" },
      ink: { label: "Neutral 900", hex: "#18181b", textHex: "#ffffff" },
      neutral: { label: "Neutral 500", hex: "#71717a", textHex: "#ffffff" },
      states: [
        { label: "Success", hex: "#16a34a", textHex: "#ffffff" },
        { label: "Warning", hex: "#f59e0b", textHex: "#ffffff" },
        { label: "Error", hex: "#ef4444", textHex: "#ffffff" },
        { label: "Info", hex: "#3b82f6", textHex: "#ffffff" },
      ],
      chips: ["#fff1f3", "#fecdd3", "#e11d48", "#c6102e"],
      tokens: {
        primary: "#c6102e",
        primaryHover: "#a90e27",
        primaryActive: "#8f0c22",
        primarySubtle: "#fff1f3",
        primaryMuted: "#fecdd3",
        primaryForeground: "#ffffff",
        accent: "#c6102e",
        accentForeground: "#ffffff",
      },
    },
    dark: {
      hero: "#2b0a12",
      surface: "#111216",
      primary: { label: "Primary Red", hex: "#e11d48", textHex: "#ffffff" },
      ink: { label: "Neutral 50", hex: "#fafafa", textHex: "#18181b" },
      neutral: { label: "Neutral 400", hex: "#a1a1aa", textHex: "#ffffff" },
      states: [
        { label: "Success", hex: "#16a34a", textHex: "#052e16" },
        { label: "Warning", hex: "#f59e0b", textHex: "#451a03" },
        { label: "Error", hex: "#ef4444", textHex: "#450a0a" },
        { label: "Info", hex: "#3b82f6", textHex: "#172554" },
      ],
      chips: ["#2b0a12", "#4c0519", "#9f1239", "#e11d48"],
      tokens: {
        primary: "#e11d48",
        primaryHover: "#be123c",
        primaryActive: "#9f1239",
        primarySubtle: "#2b0a12",
        primaryMuted: "#4c0519",
        primaryForeground: "#ffffff",
        accent: "#e11d48",
        accentForeground: "#ffffff",
      },
    },
  },
  {
    id: "royal",
    name: "Royal",
    description: "Visual tecnológico, limpo, analítico e corporativo.",
    personality: "Sistêmica, limpa e confiável.",
    light: {
      hero: "#eef2ff",
      surface: "#ffffff",
      primary: { label: "Primary Royal", hex: "#4f46e5", textHex: "#ffffff" },
      ink: { label: "Neutral 900", hex: "#18181b", textHex: "#ffffff" },
      neutral: { label: "Neutral 500", hex: "#71717a", textHex: "#ffffff" },
      states: [
        { label: "Success", hex: "#16a34a", textHex: "#ffffff" },
        { label: "Warning", hex: "#f59e0b", textHex: "#ffffff" },
        { label: "Error", hex: "#ef4444", textHex: "#ffffff" },
        { label: "Info", hex: "#3b82f6", textHex: "#ffffff" },
      ],
      chips: ["#eef2ff", "#c7d2fe", "#6366f1", "#4f46e5"],
      tokens: {
        primary: "#4f46e5",
        primaryHover: "#4338ca",
        primaryActive: "#3730a3",
        primarySubtle: "#eef2ff",
        primaryMuted: "#c7d2fe",
        primaryForeground: "#ffffff",
        accent: "#4f46e5",
        accentForeground: "#ffffff",
      },
    },
    dark: {
      hero: "#17172d",
      surface: "#111216",
      primary: { label: "Primary Royal", hex: "#6366f1", textHex: "#ffffff" },
      ink: { label: "Neutral 50", hex: "#fafafa", textHex: "#18181b" },
      neutral: { label: "Neutral 400", hex: "#a1a1aa", textHex: "#ffffff" },
      states: [
        { label: "Success", hex: "#16a34a", textHex: "#052e16" },
        { label: "Warning", hex: "#f59e0b", textHex: "#451a03" },
        { label: "Error", hex: "#ef4444", textHex: "#450a0a" },
        { label: "Info", hex: "#3b82f6", textHex: "#172554" },
      ],
      chips: ["#17172d", "#312e81", "#4f46e5", "#6366f1"],
      tokens: {
        primary: "#6366f1",
        primaryHover: "#4f46e5",
        primaryActive: "#4338ca",
        primarySubtle: "#17172d",
        primaryMuted: "#312e81",
        primaryForeground: "#ffffff",
        accent: "#6366f1",
        accentForeground: "#ffffff",
      },
    },
  },
  {
    id: "forest",
    name: "Forest",
    description: "Visual estável, orgânico e focado em operações com tranquilidade.",
    personality: "Confiável, estável e humana.",
    light: {
      hero: "#f0fdf4",
      surface: "#ffffff",
      primary: { label: "Forest Primary", hex: "#16a34a", textHex: "#ffffff" },
      ink: { label: "Neutral 900", hex: "#18181b", textHex: "#ffffff" },
      neutral: { label: "Neutral 500", hex: "#71717a", textHex: "#ffffff" },
      states: [
        { label: "Success", hex: "#16a34a", textHex: "#ffffff" },
        { label: "Warning", hex: "#f59e0b", textHex: "#ffffff" },
        { label: "Error", hex: "#ef4444", textHex: "#ffffff" },
        { label: "Info", hex: "#3b82f6", textHex: "#ffffff" },
      ],
      chips: ["#f0fdf4", "#bbf7d0", "#22c55e", "#16a34a"],
      tokens: {
        primary: "#16a34a",
        primaryHover: "#15803d",
        primaryActive: "#166534",
        primarySubtle: "#f0fdf4",
        primaryMuted: "#bbf7d0",
        primaryForeground: "#ffffff",
        accent: "#16a34a",
        accentForeground: "#ffffff",
      },
    },
    dark: {
      hero: "#052e16",
      surface: "#111216",
      primary: { label: "Forest Primary", hex: "#22c55e", textHex: "#ffffff" },
      ink: { label: "Neutral 50", hex: "#fafafa", textHex: "#18181b" },
      neutral: { label: "Neutral 400", hex: "#a1a1aa", textHex: "#ffffff" },
      states: [
        { label: "Success", hex: "#16a34a", textHex: "#052e16" },
        { label: "Warning", hex: "#f59e0b", textHex: "#451a03" },
        { label: "Error", hex: "#ef4444", textHex: "#450a0a" },
        { label: "Info", hex: "#3b82f6", textHex: "#172554" },
      ],
      chips: ["#052e16", "#14532d", "#16a34a", "#22c55e"],
      tokens: {
        primary: "#22c55e",
        primaryHover: "#16a34a",
        primaryActive: "#15803d",
        primarySubtle: "#052e16",
        primaryMuted: "#14532d",
        primaryForeground: "#ffffff",
        accent: "#22c55e",
        accentForeground: "#ffffff",
      },
    },
  },
  {
    id: "ember",
    name: "Ember",
    description: "Visual energético e caloroso, orientado a ação sem perder a seriedade.",
    personality: "Expressiva, intensa e memorável.",
    light: {
      hero: "#fff7ed",
      surface: "#ffffff",
      primary: { label: "Ember Orange", hex: "#ea580c", textHex: "#ffffff" },
      ink: { label: "Neutral 900", hex: "#18181b", textHex: "#ffffff" },
      neutral: { label: "Neutral 500", hex: "#71717a", textHex: "#ffffff" },
      states: [
        { label: "Success", hex: "#16a34a", textHex: "#ffffff" },
        { label: "Warning", hex: "#f59e0b", textHex: "#ffffff" },
        { label: "Error", hex: "#ef4444", textHex: "#ffffff" },
        { label: "Info", hex: "#3b82f6", textHex: "#ffffff" },
      ],
      chips: ["#fff7ed", "#fed7aa", "#f97316", "#ea580c"],
      tokens: {
        primary: "#ea580c",
        primaryHover: "#c2410c",
        primaryActive: "#9a3412",
        primarySubtle: "#fff7ed",
        primaryMuted: "#fed7aa",
        primaryForeground: "#ffffff",
        accent: "#ea580c",
        accentForeground: "#ffffff",
      },
    },
    dark: {
      hero: "#431407",
      surface: "#111216",
      primary: { label: "Ember Orange", hex: "#f97316", textHex: "#ffffff" },
      ink: { label: "Neutral 50", hex: "#fafafa", textHex: "#18181b" },
      neutral: { label: "Neutral 400", hex: "#a1a1aa", textHex: "#ffffff" },
      states: [
        { label: "Success", hex: "#16a34a", textHex: "#052e16" },
        { label: "Warning", hex: "#f59e0b", textHex: "#451a03" },
        { label: "Error", hex: "#ef4444", textHex: "#450a0a" },
        { label: "Info", hex: "#3b82f6", textHex: "#172554" },
      ],
      chips: ["#431407", "#7c2d12", "#c2410c", "#f97316"],
      tokens: {
        primary: "#f97316",
        primaryHover: "#ea580c",
        primaryActive: "#c2410c",
        primarySubtle: "#431407",
        primaryMuted: "#7c2d12",
        primaryForeground: "#ffffff",
        accent: "#f97316",
        accentForeground: "#ffffff",
      },
    },
  },
]

export function getThemePalette(paletteId: ThemeColor) {
  return (
    THEME_PALETTES.find((palette) => palette.id === paletteId) ??
    THEME_PALETTES[0]
  )
}

export function getThemePreview(
  paletteId: ThemeColor,
  mode: Exclude<ThemeMode, "system">,
) {
  const palette = getThemePalette(paletteId)
  return palette[mode]
}

export function resolvePreviewMode(
  themeMode: ThemeMode,
  resolvedTheme?: string,
): "light" | "dark" {
  if (themeMode === "system") {
    return resolvedTheme === "dark" ? "dark" : "light"
  }

  return themeMode
}
