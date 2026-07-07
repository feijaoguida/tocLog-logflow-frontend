'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { ArrowLeft, Loader2, Pencil, ShieldAlert, UserCheck } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { WorkspaceLoadingCard } from '@/components/layout/workspace-loading-card'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { WorkspaceStateCard } from '@/components/layout/workspace-state-card'
import { useAuth } from '@/context/auth-context'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'

type VehicleDetail = {
  id: string
  tipo: string
  placa: string
  capacidadePeso: number
  capacidadeVolume: number
  renavam?: string | null
  bodyType?: string | null
  documentExpiresAt?: string | null
  notes?: string | null
  status: 'ATIVO' | 'PENDENTE_APROVACAO' | 'BLOQUEADO'
  driver?: {
    id: string
    nome: string
    status?: 'ATIVO' | 'PENDENTE_APROVACAO' | 'BLOQUEADO'
    documento?: string | null
  } | null
}

type ExternalVehicleDetailsProps = {
  vehicleId: string
}

export function ExternalVehicleDetails({ vehicleId }: ExternalVehicleDetailsProps) {
  const { hasPermission } = useAuth()
  const [loading, setLoading] = useState(true)
  const [vehicle, setVehicle] = useState<VehicleDetail | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const canViewVehicles = hasPermission('external-fleet.vehicles.view')
  const canManageVehicles = hasPermission('external-fleet.vehicles.manage')

  async function loadVehicle() {
    setLoading(true)
    setLoadError(null)

    try {
      const { data } = await api.get<VehicleDetail>(`/external-fleet/vehicles/${vehicleId}`)
      setVehicle(data)
    } catch (error) {
      setVehicle(null)
      setLoadError(getApiErrorMessage(error, 'Não foi possível carregar o veículo parceiro.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!canViewVehicles) {
      setLoading(false)
      return
    }

    void loadVehicle()
  }, [canViewVehicles, vehicleId])

  if (!canViewVehicles) {
    return (
      <div className="app-page">
        <WorkspaceStateCard title="Acesso restrito">
          <p>Este perfil não pode visualizar os detalhes do veículo parceiro.</p>
        </WorkspaceStateCard>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="app-page">
        <WorkspaceLoadingCard message="Carregando detalhes do veículo parceiro..." />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="app-page">
        <WorkspaceStateCard
          title="Falha de leitura"
          actions={
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button onClick={() => void loadVehicle()}>Atualizar leitura</Button>
              <Button asChild variant="outline">
                <Link href="/dashboard/external-fleet/vehicles">Voltar para a listagem</Link>
              </Button>
            </div>
          }
        >
          <p>{loadError}</p>
        </WorkspaceStateCard>
      </div>
    )
  }

  if (!vehicle) {
    return null
  }

  const issues = getComplianceIssues(vehicle)

  return (
    <div className="app-page">
      <section className="app-page-header theme-surface">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link href="/dashboard/external-fleet/vehicles" className="transition hover:text-foreground">
                Frota Externa
              </Link>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span className="text-primary">Veículos</span>
            </div>
            <div className="space-y-2">
              <p className="app-kicker">Frota Externa</p>
              <h1 className="app-title">{vehicle.placa}</h1>
              <p className="app-subtitle">
                Leitura consolidada de capacidade, compliance documental e vínculo operacional do recurso parceiro.
              </p>
            </div>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            {canManageVehicles ? (
              <Button asChild variant="outline">
                <Link href={`/dashboard/external-fleet/vehicles/${vehicle.id}/edit`}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </Link>
              </Button>
            ) : (
              <Badge variant="outline" className="rounded-full px-4 py-2">
                Modo leitura
              </Badge>
            )}
            <Button asChild variant="outline">
              <Link href="/dashboard/external-fleet/vehicles">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="app-section-card">
          <CardHeader>
            <CardDescription>Status operacional</CardDescription>
            <CardTitle className="text-2xl">{statusLabel(vehicle.status)}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="app-section-card">
          <CardHeader>
            <CardDescription>Pendências documentais</CardDescription>
            <CardTitle className="text-2xl">{issues.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="app-section-card">
          <CardHeader>
            <CardDescription>Motorista vinculado</CardDescription>
            <CardTitle className="text-2xl">{vehicle.driver?.nome || 'Sem vínculo'}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="app-section-card">
        <CardHeader>
          <CardTitle className="text-xl">Identificação e capacidade</CardTitle>
          <CardDescription>Dados estruturais do recurso parceiro usados na elegibilidade logística.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <InfoField label="Placa" value={vehicle.placa} />
          <InfoField label="Tipo" value={vehicle.tipo} />
          <InfoField label="Carroceria" value={vehicle.bodyType || 'Não informada'} />
          <InfoField label="RENAVAM" value={vehicle.renavam || 'Não informado'} />
          <InfoField label="Capacidade de peso" value={`${Number(vehicle.capacidadePeso)} kg`} />
          <InfoField label="Capacidade de volume" value={`${Number(vehicle.capacidadeVolume)} m³`} />
          <InfoField label="Status" value={statusLabel(vehicle.status)} badge={statusBadge(vehicle.status)} />
        </CardContent>
      </Card>

      <Card className="app-section-card">
        <CardHeader>
          <CardTitle className="text-xl">Compliance documental</CardTitle>
          <CardDescription>Leitura do mesmo contrato usado por `shipments` ao validar alocação e despacho.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <InfoField label="Validade documental" value={formatDate(vehicle.documentExpiresAt)} />
          <div className="rounded-2xl border border-dashed p-4 text-sm">
            <div className="flex items-start gap-2">
              <ShieldAlert className="mt-0.5 h-4 w-4 text-amber-700" />
              <div className="space-y-1">
                <p className="font-medium text-foreground">Resumo de pendências</p>
                {issues.length === 0 ? (
                  <p className="text-muted-foreground">Recurso pronto para rota dentro das regras atuais de compliance.</p>
                ) : (
                  <ul className="space-y-1 text-muted-foreground">
                    {issues.map((issue) => (
                      <li key={issue}>- {issue}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="app-section-card">
        <CardHeader>
          <CardTitle className="text-xl">Motorista vinculado</CardTitle>
          <CardDescription>Parceiro ativo associado ao veículo dentro da mesma empresa.</CardDescription>
        </CardHeader>
        <CardContent>
          {vehicle.driver ? (
            <div className="rounded-2xl border px-4 py-4">
              <div className="flex items-start gap-3">
                <UserCheck className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{vehicle.driver.nome}</p>
                    {vehicle.driver.status ? statusBadge(vehicle.driver.status) : null}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    CPF: {vehicle.driver.documento ? formatCpf(vehicle.driver.documento) : 'Não informado'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed px-4 py-6 text-sm text-muted-foreground">
              Nenhum motorista parceiro vinculado a este veículo até o momento.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="app-section-card">
        <CardHeader>
          <CardTitle className="text-xl">Observações internas</CardTitle>
          <CardDescription>Notas de homologação e restrições operacionais registradas pela governança.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
            {vehicle.notes || 'Nenhuma observação interna registrada para este recurso.'}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function InfoField({
  label,
  value,
  badge,
}: {
  label: string
  value: string
  badge?: ReactNode
}) {
  return (
    <div className="rounded-2xl border px-4 py-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-2 flex items-center gap-2">
        <p className="text-sm text-foreground">{value}</p>
        {badge}
      </div>
    </div>
  )
}

function statusLabel(status: VehicleDetail['status']) {
  switch (status) {
    case 'ATIVO':
      return 'Ativo'
    case 'PENDENTE_APROVACAO':
      return 'Pendente'
    case 'BLOQUEADO':
      return 'Bloqueado'
    default:
      return status
  }
}

function statusBadge(status: 'ATIVO' | 'PENDENTE_APROVACAO' | 'BLOQUEADO') {
  switch (status) {
    case 'ATIVO':
      return <Badge className="bg-green-600">Ativo</Badge>
    case 'PENDENTE_APROVACAO':
      return <Badge variant="secondary">Pendente</Badge>
    case 'BLOQUEADO':
      return <Badge variant="destructive">Bloqueado</Badge>
    default:
      return null
  }
}

function formatCpf(value: string) {
  if (value.length !== 11) {
    return value
  }

  return `${value.slice(0, 3)}.${value.slice(3, 6)}.${value.slice(6, 9)}-${value.slice(9, 11)}`
}

function formatDate(value?: string | null) {
  if (!value) {
    return 'Não informado'
  }

  return new Intl.DateTimeFormat('pt-BR').format(new Date(value))
}

function getComplianceIssues(vehicle: VehicleDetail) {
  const issues: string[] = []
  const now = Date.now()

  if (!vehicle.documentExpiresAt) {
    issues.push('Validade documental não informada.')
  } else if (new Date(vehicle.documentExpiresAt).getTime() <= now) {
    issues.push('Documento do veículo vencido.')
  }

  if (!vehicle.renavam) {
    issues.push('RENAVAM não informado.')
  }

  if (vehicle.status !== 'ATIVO') {
    issues.push('Recurso ainda não está ativo para operação.')
  }

  return issues
}
