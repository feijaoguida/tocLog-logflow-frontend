import { notFound } from 'next/navigation'

import { HelpShell } from '@/components/help/help-shell'
import { getAllHelpPages, getHelpMenu, getHelpSummary, getResolvedHelpPage } from '@/lib/help'

type HelpPageProps = {
  params: Promise<{ slug?: string[] }>
}

export async function generateStaticParams() {
  const pages = await getAllHelpPages()
  return pages.map((page) => ({
    slug: page.slugSegments[0] === 'overview' ? [] : page.slugSegments,
  }))
}

export async function generateMetadata({ params }: HelpPageProps) {
  const resolvedParams = await params

  try {
    const page = await getResolvedHelpPage(resolvedParams.slug)
    return {
      title: `${page.title} | Ajuda | LogFlow2`,
      description: page.summary,
    }
  } catch {
    return {
      title: 'Ajuda | LogFlow2',
    }
  }
}

export default async function HelpPage({ params }: HelpPageProps) {
  const resolvedParams = await params
  const menu = await getHelpMenu()
  const summary = await getHelpSummary()
  let page

  try {
    page = await getResolvedHelpPage(resolvedParams.slug)
  } catch {
    notFound()
  }

  return <HelpShell menu={menu} page={page} summary={summary} />
}
