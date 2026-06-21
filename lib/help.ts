import { existsSync, readFileSync } from 'node:fs'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { cache } from 'react'

import type {
  HelpMenu,
  HelpSummary,
  ResolvedHelpPage,
} from '@/help/help-types'

function resolveHelpRoot() {
  const localRoot = path.join(process.cwd(), 'help')
  if (existsSync(localRoot)) {
    return localRoot
  }

  return path.join(process.cwd(), 'frontend', 'help')
}

const HELP_ROOT = resolveHelpRoot()

function buildHelpHref(slug: string, homeSlug: string) {
  return slug === homeSlug ? '/dashboard/help' : `/dashboard/help/${slug}`
}

export const getHelpMenu = cache(async (): Promise<HelpMenu> => {
  const menuPath = path.join(HELP_ROOT, 'help-menu.json')
  const raw = await fs.readFile(menuPath, 'utf-8')
  return JSON.parse(raw) as HelpMenu
})

export async function getAllHelpPages() {
  const menu = await getHelpMenu()
  return menu.sections.flatMap((section) =>
    section.items.map((item) => ({
      ...item,
      href: buildHelpHref(item.slug, menu.homeSlug),
      slugSegments: item.slug.split('/'),
      section: {
        id: section.id,
        title: section.title,
        description: section.description,
      },
    })),
  )
}

export async function getHelpSummary(): Promise<HelpSummary> {
  const pages = await getAllHelpPages()
  return {
    totalPages: pages.length,
    totalSections: new Set(pages.map((page) => page.section.id)).size,
    webPages: pages.filter((page) => page.platform === 'web').length,
    mobilePages: pages.filter((page) => page.platform === 'mobile').length,
    pendingValidationPages: pages.filter((page) => page.status === 'pending-validation').length,
  }
}

export async function getResolvedHelpPage(slugSegments?: string[]): Promise<ResolvedHelpPage> {
  const menu = await getHelpMenu()
  const targetSlug = slugSegments && slugSegments.length > 0 ? slugSegments.join('/') : menu.homeSlug
  const pages = await getAllHelpPages()
  const page = pages.find((entry) => entry.slug === targetSlug)

  if (!page) {
    throw new Error(`Help page not found for slug "${targetSlug}"`)
  }

  const contentPath = path.join(HELP_ROOT, page.file)
  const content = await fs.readFile(contentPath, 'utf-8')

  return {
    ...page,
    content,
  }
}

export async function getHelpSidebarData() {
  return getHelpMenu()
}

export function getHelpImageAbsolutePath(relativePath: string) {
  return path.join(HELP_ROOT, 'images', relativePath)
}

export function getHelpImageContentType(fileName: string) {
  const extension = path.extname(fileName).toLowerCase()
  switch (extension) {
    case '.png':
      return 'image/png'
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg'
    case '.webp':
      return 'image/webp'
    case '.gif':
      return 'image/gif'
    case '.svg':
      return 'image/svg+xml'
    default:
      return 'application/octet-stream'
  }
}

export function readHelpImage(relativePath: string) {
  const safePath = relativePath.replace(/^\/+/, '')
  const absolutePath = getHelpImageAbsolutePath(safePath)
  return readFileSync(absolutePath)
}
