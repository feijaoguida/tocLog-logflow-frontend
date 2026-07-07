'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { ArrowLeft, Loader2, Pencil, ShieldAlert, Truck } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { WorkspaceLoadingCard } from '@/components/layout/workspace-loading-card'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { WorkspaceStateCard } from '@/components/layout/workspace-state-card'
import { useAuth } from '@/context/auth-context'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'

type DriverDetail = {
  id: string
  nome: string
  documento: string
  telefone: string
  email?: string | null
  cnhNumber?: string | null
  cnhCategory?: string | null
  cnhExpiresAt?: string | null
  rntrcCode?: string | null
  rntrcStatus?: string | null
  rntrcExpiresAt?: string | null
  notes?: string | null
  status: 'ATIVO' | 'PENDENTE_APROVACAO' | 'BLOQUEADO'
  vehicles?: Array<{ id: string; placa?: string | null; tipo?: string | null }>
}

type ExternalDriverDetailsProps = {
  driverId: string
}

export function ExternalDriverDetails({ driverId }: ExternalDriverDetailsProps) {
  const { hasPermission } = useAuth()
  const [loading, setLoading] = useState(true)
  const [driver, setDriver] = useState<DriverDetail | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const canViewDrivers = hasPermission('external-fleet.drivers.view')
  const canManageDrivers = hasPermission('external-fleet.drivers.manage')

  async function loadDriver() {
    setLoading(true)
    setLoadError(null)

    try {
      const { data } = await api.get<DriverDetail>(`/external-fleet/drivers/${driverId}`)
      setDriver(data)
    } catch (error) {
      setDriver(null)
      setLoadError(getApiErrorMessage(error, 'Não foi possível carregar o motorista parceiro.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!canViewDrivers) {
      setLoading(false)
      return
    }

    void loadDriver()
  }, [canViewDrivers, driverId])

  if (!canViewDrivers) {
    return (
      <div className="app-page">
        <WorkspaceStateCard title="Acesso restrito">
          <p>Este perfil não pode visualizar os detalhes do motorista parceiro.</p>
        </WorkspaceStateCard>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="app-page">
        <WorkspaceLoadingCard message="Carregando detalhes do motorista parceiro..." />
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
              <Button onClick={() => void loadDriver()}>Atualizar leitura</Button>
              <Button asChild variant="outline">
                <Link href="/dashboard/external-fleet/drivers">Voltar para a listagem</Link>
              </Button>
            </div>
          }
        >
          <p>{loadError}</p>
        </WorkspaceStateCard>
      </div>
    )
  }

  if (!driver) {
    return null
  }

  const issues = getComplianceIssues(driver)

  return (
    <div className="app-page">
      <section className="app-page-header theme-surface">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link href="/dashboard/external-fleet/drivers" className="transition hover:text-foreground">
                Frota Externa
              </Link>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span className="text-primary">Motoristas</span>
            </div>
            <div className="space-y-2">
              <p className="app-kicker">Frota Externa</p>
              <h1 className="app-title">{driver.nome}</h1>
              <p className="app-subtitle">
                Leitura consolidada de contato, compliance e vínculos operacionais do parceiro externo.
              </p>
            </div>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            {canManageDrivers ? (
              <Button asChild variant="outline">
                <Link href={`/dashboard/external-fleet/drivers/${driver.id}/edit`}>
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
              <Link href="/dashboard/external-fleet/drivers">
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
            <CardTitle className="text-2xl">{statusLabel(driver.status)}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="app-section-card">
          <CardHeader>
            <CardDescription>Pendências de compliance</CardDescription>
            <CardTitle className="text-2xl">{issues.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="app-section-card">
          <CardHeader>
            <CardDescription>Veículos vinculados</CardDescription>
            <CardTitle className="text-2xl">{driver.vehicles?.length ?? 0}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="app-section-card">
        <CardHeader>
          <CardTitle className="text-xl">Identificação e contato</CardTitle>
          <CardDescription>Dados usados na governança do parceiro e na leitura operacional da alocação.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <InfoField label="CPF" value={formatCpf(driver.documento)} />
          <InfoField label="Telefone" value={driver.telefone} />
          <InfoField label="Email" value={driver.email || 'Não informado'} />
          <InfoField label="Status" value={statusLabel(driver.status)} badge={statusBadge(driver.status)} />
        </CardContent>
      </Card>

      <Card className="app-section-card">
        <CardHeader>
          <CardTitle className="text-xl">Compliance operacional</CardTitle>
          <CardDescription>Leitura dos mesmos dados usados por `shipments` para bloquear ou alertar a alocação.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <InfoField label="Número da CNH" value={driver.cnhNumber || 'Não informado'} />
            <InfoField label="Categoria da CNH" value={driver.cnhCategory || 'Não informada'} />
            <InfoField label="Validade da CNH" value={formatDate(driver.cnhExpiresAt)} />
            <InfoField label="RNTRC" value={driver.rntrcCode || 'Não informado'} />
            <InfoField label="Situação do RNTRC" value={driver.rntrcStatus || 'Não informada'} />
            <InfoField label="Validade do RNTRC" value={formatDate(driver.rntrcExpiresAt)} />
          </div>
          <div className="rounded-2xl border border-dashed p-4 text-sm">
            <div className="flex items-start gap-2">
              <ShieldAlert className="mt-0.5 h-4 w-4 text-amber-700" />
              <div className="space-y-1">
                <p className="font-medium text-foreground">Resumo de pendências</p>
                {issues.length === 0 ? (
                  <p className="text-muted-foreground">Parceiro pronto para rota dentro das regras atuais de compliance.</p>
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
          <CardTitle className="text-xl">Veículos vinculados</CardTitle>
          <CardDescription>Recursos parceiros já associados ao motorista dentro da mesma empresa.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {driver.vehicles?.length ? (
            driver.vehicles.map((vehicle) => (
              <div key={vehicle.id} className="rounded-2xl border px-4 py-4">
                <div className="flex items-start gap-3">
                  <Truck className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">{vehicle.placa || 'Placa não informada'}</p>
                    <p className="text-sm text-muted-foreground">{vehicle.tipo || 'Tipo não informado'}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed px-4 py-6 text-sm text-muted-foreground">
              Nenhum veículo parceiro vinculado a este motorista até o momento.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="app-section-card">
        <CardHeader>
          <CardTitle className="text-xl">Observações internas</CardTitle>
          <CardDescription>Notas de homologação e operação registradas pela governança.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
            {driver.notes || 'Nenhuma observação interna registrada para este parceiro.'}
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

function statusLabel(status: DriverDetail['status']) {
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

function statusBadge(status: DriverDetail['status']) {
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

function getComplianceIssues(driver: DriverDetail) {
  const issues: string[] = []
  const now = Date.now()

  if (!driver.cnhExpiresAt) {
    issues.push('Validade da CNH não informada.')
  } else if (new Date(driver.cnhExpiresAt).getTime() <= now) {
    issues.push('CNH vencida.')
  }

  if (!driver.rntrcCode) {
    issues.push('RNTRC não informado.')
  } else if (driver.rntrcStatus !== 'ATIVO') {
    issues.push('RNTRC sem situação ATIVO.')
  } else if (driver.rntrcExpiresAt && new Date(driver.rntrcExpiresAt).getTime() <= now) {
    issues.push('RNTRC vencido.')
  }

  if (driver.status !== 'ATIVO') {
    issues.push('Parceiro ainda não está ativo para operação.')
  }

  return issues
}
