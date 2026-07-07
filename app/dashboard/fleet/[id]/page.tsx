'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Calendar,
  FileCheck,
  Gauge,
  ShieldAlert,
  User,
  Wrench,
} from 'lucide-react'
import { toast } from 'sonner'

import { MenuFunctionHeader } from '@/components/layout/menu-function-header'
import { WorkspaceEmptyState } from '@/components/layout/workspace-empty-state'
import { WorkspaceStateCard } from '@/components/layout/workspace-state-card'
import { useAuth } from '@/context/auth-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'
import type { Checklist, Maintenance, Vehicle, VehicleTimelineEvent } from '@/types/fleet'

type DetailedVehicle = Vehicle & {
  branch?: { id: string; name: string } | null
  department?: { id: string; name: string } | null
  timeline: VehicleTimelineEvent[]
  checklists: Checklist[]
  maintenances: Maintenance[]
}

const STATUS_BADGE: Record<DetailedVehicle['status'], { label: string; className: string }> = {
  AVAILABLE: { label: 'Disponível', className: 'bg-green-600' },
  IN_USE: { label: 'Em uso', className: 'bg-sky-600' },
  MAINTENANCE: { label: 'Em manutenção', className: 'bg-amber-500 text-amber-950' },
  BLOCKED: { label: 'Bloqueado', className: 'bg-destructive text-destructive-foreground' },
}

function TimelineItem({ event }: { event: VehicleTimelineEvent }) {
  function getIcon(type: string) {
    switch (type) {
      case 'CHECKLIST':
        return <FileCheck className="h-4 w-4 text-sky-500" />
      case 'MAINTENANCE':
        return <Wrench className="h-4 w-4 text-amber-500" />
      case 'KM_UPDATE':
        return <Gauge className="h-4 w-4 text-green-600" />
      case 'DRIVER_ASSIGNMENT':
        return <User className="h-4 w-4 text-violet-500" />
      default:
        return <Calendar className="h-4 w-4 text-muted-foreground" />
    }
  }

  return (
    <div className="relative flex gap-4 pb-8 last:pb-0">
      <div className="absolute left-[19px] top-8 bottom-0 w-px bg-border last:hidden" />
      <div className="z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-background shadow-sm">
        {getIcon(event.eventType)}
      </div>
      <div className="flex-1 space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-semibold">
            {event.eventType.replaceAll('_', ' ')}
          </span>
          <span className="text-xs text-muted-foreground">
            {new Date(event.eventDate).toLocaleString('pt-BR')}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{event.description}</p>
        {event.actor ? (
          <span className="text-xs text-muted-foreground">por {event.actor.name}</span>
        ) : null}
      </div>
    </div>
  )
}

export default function VehicleDetailsPage() {
  const { hasPermission } = useAuth()
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const vehicleId = Array.isArray(params?.id) ? params.id[0] : params?.id

  const canViewVehicles = hasPermission('fleet.vehicles.view')
  const canManageVehicles = hasPermission('fleet.vehicles.manage')

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [vehicle, setVehicle] = useState<DetailedVehicle | null>(null)

  useEffect(() => {
    if (!canViewVehicles || !vehicleId) {
      setLoading(false)
      return
    }

    void loadVehicle()
  }, [canViewVehicles, vehicleId])

  async function loadVehicle(showLoadingState = true) {
    if (!vehicleId) {
      return
    }

    if (showLoadingState) {
      setLoading(true)
    } else {
      setRefreshing(true)
    }

    try {
      setLoadError(null)
      const { data } = await api.get<DetailedVehicle>(`/fleet/vehicles/${vehicleId}`)
      setVehicle(data)
    } catch (error) {
      const message = getApiErrorMessage(error, 'Não foi possível carregar o detalhe do veículo.')
      setLoadError(message)
      setVehicle(null)
      toast.error(message)
    } finally {
      if (showLoadingState) {
        setLoading(false)
      } else {
        setRefreshing(false)
      }
    }
  }

  if (!canViewVehicles) {
    return (
      <WorkspaceStateCard title="Acesso restrito">
        <p>Este perfil não pode visualizar o detalhe da frota interna.</p>
      </WorkspaceStateCard>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full rounded-3xl" />
        <div className="grid gap-6 lg:grid-cols-[1.8fr_1fr]">
          <Skeleton className="h-[420px] rounded-3xl" />
          <Skeleton className="h-[420px] rounded-3xl" />
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <WorkspaceStateCard
        title="Falha de leitura"
        tone="danger"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void loadVehicle(false)} disabled={refreshing}>
              {refreshing ? 'Atualizando...' : 'Tentar novamente'}
            </Button>
            <Button variant="ghost" onClick={() => router.push('/dashboard/fleet')}>
              Voltar para a frota
            </Button>
          </div>
        }
      >
        <p>{loadError}</p>
      </WorkspaceStateCard>
    )
  }

  if (!vehicle) {
    return (
      <WorkspaceStateCard title="Veículo não encontrado">
        <p>O recurso solicitado não foi localizado no tenant atual ou já não está disponível.</p>
      </WorkspaceStateCard>
    )
  }

  const statusBadge = STATUS_BADGE[vehicle.status]

  return (
    <div className="app-page">
      <MenuFunctionHeader
        title={`Frota > Veículos > ${vehicle.plate}`}
        description="Detalhe operacional do veículo interno com timeline, contexto de filial/departamento e atalhos para os fluxos de checklist e manutenção."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/fleet')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
            <Button variant="outline" size="sm" onClick={() => void loadVehicle(false)} disabled={refreshing}>
              {refreshing ? 'Atualizando...' : 'Atualizar leitura'}
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/fleet/checklists/new">Novo checklist</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/fleet/maintenance">Manutenções</Link>
            </Button>
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          <Badge className={statusBadge.className}>{statusBadge.label}</Badge>
          {canManageVehicles ? null : (
            <Badge variant="outline" className="rounded-full px-3 py-1">
              Modo leitura
            </Badge>
          )}
        </div>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          {vehicle.model} • {vehicle.category?.name || 'Sem categoria'} • {vehicle.year}
          {' · '}
          {vehicle.branch?.name || 'Filial não informada'}
          {vehicle.department?.name ? ` · ${vehicle.department.name}` : ''}
        </p>
      </MenuFunctionHeader>

      <div className="grid gap-6 lg:grid-cols-[1.8fr_1fr]">
        <Card className="app-section-card">
          <CardHeader>
            <CardTitle className="text-xl">Linha do tempo operacional</CardTitle>
            <CardDescription>
              Histórico recente de checklist, manutenção, KM e demais eventos do veículo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {vehicle.timeline.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                Nenhum evento foi registrado ainda para este veículo.
              </div>
            ) : (
              <div className="pl-2">
                {vehicle.timeline.map((event) => (
                  <TimelineItem key={event.id} event={event} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="app-section-card">
            <CardHeader>
              <CardTitle className="text-xl">Dados técnicos</CardTitle>
              <CardDescription>
                Informações-base consumidas pela governança da frota interna.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <DetailRow label="Placa" value={vehicle.plate} />
              <DetailRow label="Modelo" value={vehicle.model} />
              <DetailRow label="Combustível" value={vehicle.fuelType} />
              <DetailRow label="Cor" value={vehicle.color} />
              <DetailRow
                label="Quilometragem"
                value={`${vehicle.currentKm.toLocaleString('pt-BR')} km`}
              />
              <DetailRow label="Filial" value={vehicle.branch?.name || 'Não informada'} />
              <DetailRow
                label="Departamento"
                value={vehicle.department?.name || 'Não informado'}
              />
              {vehicle.observacoes ? (
                <div className="rounded-2xl border border-dashed p-4 text-muted-foreground">
                  {vehicle.observacoes}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="app-section-card">
            <CardHeader>
              <CardTitle className="text-xl">Resumo operacional</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <SummaryPill
                icon={<FileCheck className="h-4 w-4" />}
                label={`${vehicle.checklists.length} checklists recentes`}
              />
              <SummaryPill
                icon={<Wrench className="h-4 w-4" />}
                label={`${vehicle.maintenances.length} manutenções recentes`}
              />
              <SummaryPill
                icon={<Gauge className="h-4 w-4" />}
                label="KM controlada por evento dedicado"
              />
              {!canManageVehicles ? (
                <div className="flex items-start gap-2 rounded-2xl border border-dashed p-4">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    Este perfil pode consultar o histórico do veículo, mas não manter
                    cadastros ou ajustes estruturais.
                  </span>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b pb-2 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  )
}

function SummaryPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border p-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-foreground">
        {icon}
      </div>
      <span>{label}</span>
    </div>
  )
}
