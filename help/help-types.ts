export type HelpPageStatus = 'ready' | 'pending-validation'

export type HelpPlatform = 'shared' | 'web' | 'mobile'

export type HelpMenuItem = {
  title: string
  slug: string
  file: string
  summary: string
  route?: string
  platform: HelpPlatform
  status?: HelpPageStatus
}

export type HelpMenuSection = {
  id: string
  title: string
  description: string
  items: HelpMenuItem[]
}

export type HelpMenu = {
  homeSlug: string
  sections: HelpMenuSection[]
}

export type HelpSummary = {
  totalPages: number
  totalSections: number
  webPages: number
  mobilePages: number
  pendingValidationPages: number
}

export type ResolvedHelpPage = HelpMenuItem & {
  content: string
  href: string
  slugSegments: string[]
  section: Pick<HelpMenuSection, 'id' | 'title' | 'description'>
}
