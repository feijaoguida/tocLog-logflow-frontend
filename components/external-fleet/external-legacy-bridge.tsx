'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'

import { MenuFunctionHeader } from '@/components/layout/menu-function-header'
import { WorkspaceStateCard } from '@/components/layout/workspace-state-card'
import { useAuth } from '@/context/auth-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type LegacyBridgeDestination = {
  buttonLabel: string
  href: string
  permission: string
  summaryLabel: string
  buttonVariant?: 'default' | 'outline' | 'ghost'
}

type ExternalLegacyBridgeProps = {
  title: string
  description: string
  statusBadgeLabel: string
  restrictedDescription: string
  cardTitle: string
  paragraphs: ReactNode[]
  hint: string
  destinations: LegacyBridgeDestination[]
}

export function ExternalLegacyBridge({
  title,
  description,
  statusBadgeLabel,
  restrictedDescription,
  cardTitle,
  paragraphs,
  hint,
  destinations,
}: ExternalLegacyBridgeProps) {
  const { hasPermission } = useAuth()
  const destinationsWithAccess = destinations.map((destination) => ({
    ...destination,
    allowed: hasPermission(destination.permission),
  }))
  const canViewLegacyBridge = destinationsWithAccess.some((destination) => destination.allowed)

  return (
    <div className="app-page">
      <MenuFunctionHeader
        title={title}
        description={description}
        actions={
          <Badge variant="outline" className="rounded-full px-4 py-2">
            {statusBadgeLabel}
          </Badge>
        }
      />

      {!canViewLegacyBridge ? (
        <WorkspaceStateCard title="Acesso restrito" className="max-w-4xl">
          <p>{restrictedDescription}</p>
        </WorkspaceStateCard>
      ) : (
        <Card className="app-section-card max-w-4xl">
          <CardHeader>
            <CardTitle className="text-xl">{cardTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            {paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
            <div className="rounded-2xl border bg-muted/20 px-4 py-4">
              <p className="font-medium text-foreground">Atalhos liberados para este perfil</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {destinationsWithAccess.map((destination) => (
                  <Badge key={destination.summaryLabel} variant={destination.allowed ? 'default' : 'secondary'}>
                    {destination.allowed
                      ? `${destination.summaryLabel} disponível`
                      : `${destination.summaryLabel} indisponível`}
                  </Badge>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">{hint}</p>
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              {destinationsWithAccess.map((destination) =>
                destination.allowed ? (
                  <Button
                    key={destination.href}
                    asChild
                    variant={destination.buttonVariant ?? 'default'}
                  >
                    <Link href={destination.href}>{destination.buttonLabel}</Link>
                  </Button>
                ) : null,
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
