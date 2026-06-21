export type ThemeMode = "light" | "dark" | "system"
export type ThemePaletteId = "ruby" | "royal" | "forest" | "ember"

type PreviewTone = {
  label: string
  hex: string
  textHex?: string
}

type PaletteModePreview = {
  hero: string
  surface: string
  primary: PreviewTone
  ink: PreviewTone
  neutral: PreviewTone
  states: PreviewTone[]
  chips: string[]
}

export type ThemePaletteDefinition = {
  id: ThemePaletteId
  name: string
  description: string
  personality: string
  light: PaletteModePreview
  dark: PaletteModePreview
}

export const DEFAULT_THEME_MODE: ThemeMode = "system"
export const DEFAULT_THEME_PALETTE: ThemePaletteId = "ruby"

export const THEME_PALETTES: ThemePaletteDefinition[] = [
  {
    id: "ruby",
    name: "Ruby",
    description: "Contraste institucional com energia comercial e leitura calorosa.",
    personality: "Direta, premium e operacional.",
    light: {
      hero: "#fdf4f5",
      surface: "#fff8f8",
      primary: { label: "Primary Red", hex: "#c6102e", textHex: "#ffffff" },
      ink: { label: "Ink Dark", hex: "#221013", textHex: "#ffffff" },
      neutral: { label: "Slate Neutral", hex: "#94a3b8", textHex: "#ffffff" },
      states: [
        { label: "Success", hex: "#20b16a", textHex: "#ffffff" },
        { label: "Warning", hex: "#f59e0b", textHex: "#ffffff" },
        { label: "Error", hex: "#f43f5e", textHex: "#ffffff" },
        { label: "Info", hex: "#0ea5e9", textHex: "#ffffff" },
      ],
      chips: ["#fde2e5", "#f8bcc6", "#ee8797", "#c6102e"],
    },
    dark: {
      hero: "#2a1419",
      surface: "#1b0d10",
      primary: { label: "Primary Red", hex: "#e11d48", textHex: "#ffffff" },
      ink: { label: "Ink Dark", hex: "#0f0b0c", textHex: "#ffffff" },
      neutral: { label: "Slate Neutral", hex: "#64748b", textHex: "#ffffff" },
      states: [
        { label: "Success", hex: "#22c55e", textHex: "#052e16" },
        { label: "Warning", hex: "#fbbf24", textHex: "#422006" },
        { label: "Error", hex: "#fb7185", textHex: "#4c0519" },
        { label: "Info", hex: "#38bdf8", textHex: "#082f49" },
      ],
      chips: ["#4c1020", "#7f1633", "#b21846", "#e11d48"],
    },
  },
  {
    id: "royal",
    name: "Royal",
    description: "Tom tecnologico com leitura fria e composicao analitica.",
    personality: "Sistemica, limpa e confiavel.",
    light: {
      hero: "#f6f5ff",
      surface: "#fcfbff",
      primary: { label: "Primary Royal", hex: "#4f46e5", textHex: "#ffffff" },
      ink: { label: "Charcoal Ink", hex: "#0f172a", textHex: "#ffffff" },
      neutral: { label: "Slate Neutral", hex: "#94a3b8", textHex: "#ffffff" },
      states: [
        { label: "Success", hex: "#10b981", textHex: "#ffffff" },
        { label: "Warning", hex: "#f59e0b", textHex: "#ffffff" },
        { label: "Error", hex: "#f43f5e", textHex: "#ffffff" },
        { label: "Info", hex: "#0ea5e9", textHex: "#ffffff" },
      ],
      chips: ["#e0ddff", "#c7c2ff", "#8d84ff", "#4f46e5"],
    },
    dark: {
      hero: "#171534",
      surface: "#0f1228",
      primary: { label: "Primary Royal", hex: "#6366f1", textHex: "#ffffff" },
      ink: { label: "Charcoal Ink", hex: "#020617", textHex: "#ffffff" },
      neutral: { label: "Slate Neutral", hex: "#64748b", textHex: "#ffffff" },
      states: [
        { label: "Success", hex: "#22c55e", textHex: "#052e16" },
        { label: "Warning", hex: "#fbbf24", textHex: "#422006" },
        { label: "Error", hex: "#fb7185", textHex: "#4c0519" },
        { label: "Info", hex: "#38bdf8", textHex: "#082f49" },
      ],
      chips: ["#282572", "#3730a3", "#4f46e5", "#818cf8"],
    },
  },
  {
    id: "forest",
    name: "Forest",
    description: "Atmosfera organica com superficies tranquilas e sem perder foco operacional.",
    personality: "Confiavel, estavel e humana.",
    light: {
      hero: "#f1fbf4",
      surface: "#f7fdf8",
      primary: { label: "Forest Primary", hex: "#16a34a", textHex: "#ffffff" },
      ink: { label: "Stone Dark", hex: "#1c1917", textHex: "#ffffff" },
      neutral: { label: "Stone Neutral", hex: "#a8a29e", textHex: "#ffffff" },
      states: [
        { label: "Success", hex: "#10b981", textHex: "#ffffff" },
        { label: "Warning", hex: "#f59e0b", textHex: "#ffffff" },
        { label: "Error", hex: "#f43f5e", textHex: "#ffffff" },
        { label: "Info", hex: "#0ea5e9", textHex: "#ffffff" },
      ],
      chips: ["#dcfce7", "#b7efc5", "#73d594", "#16a34a"],
    },
    dark: {
      hero: "#13241a",
      surface: "#0e1a13",
      primary: { label: "Forest Primary", hex: "#22c55e", textHex: "#052e16" },
      ink: { label: "Stone Dark", hex: "#0c0a09", textHex: "#ffffff" },
      neutral: { label: "Stone Neutral", hex: "#78716c", textHex: "#ffffff" },
      states: [
        { label: "Success", hex: "#34d399", textHex: "#052e16" },
        { label: "Warning", hex: "#fbbf24", textHex: "#422006" },
        { label: "Error", hex: "#fb7185", textHex: "#4c0519" },
        { label: "Info", hex: "#38bdf8", textHex: "#082f49" },
      ],
      chips: ["#14532d", "#15803d", "#16a34a", "#4ade80"],
    },
  },
  {
    id: "ember",
    name: "Ember",
    description: "Paleta mais vibrante para equipes que querem tom caloroso e orientado a acao.",
    personality: "Expressiva, intensa e memoravel.",
    light: {
      hero: "#fff7ed",
      surface: "#fffaf5",
      primary: { label: "Ember Orange", hex: "#ea580c", textHex: "#ffffff" },
      ink: { label: "Carbon", hex: "#1f2937", textHex: "#ffffff" },
      neutral: { label: "Fog Neutral", hex: "#94a3b8", textHex: "#ffffff" },
      states: [
        { label: "Success", hex: "#10b981", textHex: "#ffffff" },
        { label: "Warning", hex: "#f59e0b", textHex: "#ffffff" },
        { label: "Error", hex: "#f43f5e", textHex: "#ffffff" },
        { label: "Info", hex: "#0ea5e9", textHex: "#ffffff" },
      ],
      chips: ["#ffedd5", "#fed7aa", "#fdba74", "#ea580c"],
    },
    dark: {
      hero: "#2b170b",
      surface: "#1c130d",
      primary: { label: "Ember Orange", hex: "#f97316", textHex: "#431407" },
      ink: { label: "Carbon", hex: "#111827", textHex: "#ffffff" },
      neutral: { label: "Fog Neutral", hex: "#64748b", textHex: "#ffffff" },
      states: [
        { label: "Success", hex: "#34d399", textHex: "#052e16" },
        { label: "Warning", hex: "#fbbf24", textHex: "#422006" },
        { label: "Error", hex: "#fb7185", textHex: "#4c0519" },
        { label: "Info", hex: "#38bdf8", textHex: "#082f49" },
      ],
      chips: ["#7c2d12", "#c2410c", "#ea580c", "#fb923c"],
    },
  },
]

export function getThemePalette(paletteId: ThemePaletteId) {
  return (
    THEME_PALETTES.find((palette) => palette.id === paletteId) ??
    THEME_PALETTES[0]
  )
}

export function getThemePreview(
  paletteId: ThemePaletteId,
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
