'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { BookOpen, LayoutPanelLeft, MonitorSmartphone, Search, TriangleAlert } from 'lucide-react'

import type { HelpMenu, HelpMenuSection, HelpPlatform, HelpSummary, ResolvedHelpPage } from '@/help/help-types'
import { MarkdownRenderer } from '@/components/help/markdown-renderer'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

type HelpShellProps = {
  menu: HelpMenu
  page: ResolvedHelpPage
  summary: HelpSummary
}

function statusLabel(status: ResolvedHelpPage['status']) {
  if (status === 'pending-validation') return 'Pendente'
  return 'Disponível'
}

function platformLabel(platform: HelpPlatform) {
  if (platform === 'mobile') return 'Mobile'
  if (platform === 'web') return 'Web'
  return 'Compartilhado'
}

function platformIcon(platform: HelpPlatform) {
  if (platform === 'mobile') return <MonitorSmartphone className="h-4 w-4" />
  return <BookOpen className="h-4 w-4" />
}

function filterSections(sections: HelpMenuSection[], query: string) {
  const normalized = query.trim().toLowerCase()
  if (!normalized) {
    return sections
  }

  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) =>
        [item.title, item.summary, item.route || '', item.slug]
          .join(' ')
          .toLowerCase()
          .includes(normalized),
      ),
    }))
    .filter((section) => section.items.length > 0)
}

function HelpSidebar({
  menu,
  currentHref,
}: {
  menu: HelpMenu
  currentHref: string
}) {
  const [query, setQuery] = useState('')
  const sections = useMemo(() => filterSections(menu.sections, query), [menu.sections, query])

  return (
    <div className="flex h-full flex-col rounded-[28px] border border-border/70 bg-card/90 shadow-sm">
      <div className="border-b border-border/70 p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar funcionalidade..."
            className="pl-9"
          />
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-18rem)]">
        <div className="space-y-6 p-4">
          {sections.map((section) => (
            <section key={section.id} className="space-y-2">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {section.title}
                </p>
                <p className="text-xs text-muted-foreground">{section.description}</p>
              </div>
              <div className="space-y-1.5">
                {section.items.map((item) => {
                  const href = item.slug === menu.homeSlug ? '/dashboard/help' : `/dashboard/help/${item.slug}`
                  const isActive = href === currentHref

                  return (
                    <Link
                      key={item.slug}
                      href={href}
                      className={cn(
                        'block rounded-2xl border px-3 py-3 transition',
                        isActive
                          ? 'border-primary/40 bg-primary/10 text-foreground shadow-sm'
                          : 'border-transparent bg-muted/20 text-muted-foreground hover:border-border/70 hover:bg-muted/40 hover:text-foreground',
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold">{item.title}</p>
                          <p className="text-xs leading-5">{item.summary}</p>
                        </div>
                        {item.status === 'pending-validation' ? (
                          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                        ) : null}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

export function HelpShell({ menu, page, summary }: HelpShellProps) {
  const currentHref = page.href

  return (
    <div className="app-page">
      <section className="app-page-header">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <p className="app-kicker">Ajuda do Sistema</p>
            <div className="space-y-2">
              <h1 className="app-title">{page.title}</h1>
              <p className="app-subtitle max-w-3xl">{page.summary}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{page.section.title}</Badge>
              <Badge variant="outline" className="gap-1">
                {platformIcon(page.platform)}
                {platformLabel(page.platform)}
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  page.status === 'pending-validation' ? 'border-warning/40 bg-warning/10' : '',
                )}
              >
                {statusLabel(page.status)}
              </Badge>
              {page.route ? <Badge variant="secondary">{page.route}</Badge> : null}
            </div>
          </div>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="gap-2 lg:hidden">
                <LayoutPanelLeft className="h-4 w-4" />
                Abrir menu
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[90vw] sm:max-w-md">
              <SheetHeader>
                <SheetTitle>Central de Ajuda</SheetTitle>
                <SheetDescription>
                  Navegue pelas funcionalidades documentadas do sistema.
                </SheetDescription>
              </SheetHeader>
              <div className="px-4 pb-4">
                <HelpSidebar menu={menu} currentHref={currentHref} />
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {page.slug === menu.homeSlug ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="app-section-card space-y-2">
              <p className="text-sm text-muted-foreground">Páginas documentadas</p>
              <p className="text-3xl font-semibold tracking-tight text-foreground">
                {summary.totalPages}
              </p>
            </div>
            <div className="app-section-card space-y-2">
              <p className="text-sm text-muted-foreground">Seções do menu</p>
              <p className="text-3xl font-semibold tracking-tight text-foreground">
                {summary.totalSections}
              </p>
            </div>
            <div className="app-section-card space-y-2">
              <p className="text-sm text-muted-foreground">Cobertura Web / Mobile</p>
              <p className="text-3xl font-semibold tracking-tight text-foreground">
                {summary.webPages} / {summary.mobilePages}
              </p>
            </div>
            <div className="app-section-card space-y-2">
              <p className="text-sm text-muted-foreground">Itens pendentes de validação</p>
              <p className="text-3xl font-semibold tracking-tight text-foreground">
                {summary.pendingValidationPages}
              </p>
            </div>
          </div>
        ) : null}
      </section>

      <section className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="hidden lg:block lg:sticky lg:top-20 lg:self-start">
          <HelpSidebar menu={menu} currentHref={currentHref} />
        </aside>

        <div className="space-y-4">
          <div className="app-section-card space-y-6">
            <MarkdownRenderer content={page.content} />
          </div>
        </div>
      </section>
    </div>
  )
}
