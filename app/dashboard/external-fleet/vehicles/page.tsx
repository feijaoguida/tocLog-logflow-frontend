'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { CheckCircle, Eye, Pencil, Plus, ShieldAlert, XCircle } from 'lucide-react'
import { toast } from 'sonner'

import { MenuFunctionHeader } from '@/components/layout/menu-function-header'
import { WorkspaceStateCard } from '@/components/layout/workspace-state-card'
import { useAuth } from '@/context/auth-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'

type DriverOption = {
  id: string
  nome: string
}

type VehicleRecord = {
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
  driver?: DriverOption | null
}

export default function ExternalVehiclesPage() {
  const { hasPermission } = useAuth()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([])
  const canViewVehicles = hasPermission('external-fleet.vehicles.view')
  const canManageVehicles = hasPermission('external-fleet.vehicles.manage')

  useEffect(() => {
    if (!canViewVehicles) {
      setLoading(false)
      return
    }

    void loadData()
  }, [canManageVehicles, canViewVehicles])

  async function loadData(showLoadingState = true) {
    if (showLoadingState) {
      setLoading(true)
    } else {
      setRefreshing(true)
    }

    try {
      setLoadError(null)
      const vehiclesRes = await api.get<VehicleRecord[]>('/external-fleet/vehicles')
      setVehicles(vehiclesRes.data)
    } catch (error) {
      const message = getApiErrorMessage(error, 'Não foi possível carregar os veículos parceiros.')
      setLoadError(message)
      setVehicles([])
      toast.error(message)
    } finally {
      if (showLoadingState) {
        setLoading(false)
      } else {
        setRefreshing(false)
      }
    }
  }

  async function handleApprove(id: string) {
    try {
      await api.patch(`/external-fleet/vehicles/${id}/approve`)
      toast.success('Veículo parceiro aprovado.')
      await loadData(false)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível aprovar o veículo parceiro.'))
    }
  }

  async function handleBlock(id: string) {
    try {
      await api.patch(`/external-fleet/vehicles/${id}/block`)
      toast.success('Veículo parceiro bloqueado.')
      await loadData(false)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível bloquear o veículo parceiro.'))
    }
  }

  function getStatusBadge(status: VehicleRecord['status']) {
    switch (status) {
      case 'ATIVO':
        return <Badge className="bg-green-600">Ativo</Badge>
      case 'PENDENTE_APROVACAO':
        return <Badge variant="secondary">Pendente</Badge>
      case 'BLOQUEADO':
        return <Badge variant="destructive">Bloqueado</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  function getComplianceBadge(vehicle: VehicleRecord) {
    const issues = getVehicleComplianceIssues(vehicle)

    if (issues.length === 0) {
      return <Badge className="bg-green-600">Pronto para rota</Badge>
    }

    if (issues.length === 1) {
      return <Badge variant="secondary">1 pendência</Badge>
    }

    return <Badge variant="destructive">{issues.length} pendências</Badge>
  }

  const activeVehicles = vehicles.filter((vehicle) => vehicle.status === 'ATIVO').length
  const pendingVehicles = vehicles.filter((vehicle) => vehicle.status === 'PENDENTE_APROVACAO').length
  const compliantVehicles = vehicles.filter((vehicle) => getVehicleComplianceIssues(vehicle).length === 0).length

  return (
    <div className="app-page">
      <MenuFunctionHeader
        title="Frota Externa > Veículos"
        description="Governança de veículos parceiros com capacidade, vínculo operacional e sinais de compliance para alocação."
        actions={
          <div className="flex items-center gap-2">
            {canManageVehicles ? (
              <Button asChild>
                <Link href="/dashboard/external-fleet/vehicles/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Novo veículo
                </Link>
              </Button>
            ) : (
              <Badge variant="outline" className="rounded-full px-4 py-2">
                Modo leitura
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={() => void loadData(false)} disabled={loading || refreshing}>
              {refreshing ? 'Atualizando...' : 'Atualizar leitura'}
            </Button>
          </div>
        }
      />

      {!canViewVehicles ? (
        <WorkspaceStateCard title="Acesso restrito">
          <p>Este perfil não pode visualizar a governança de veículos parceiros.</p>
        </WorkspaceStateCard>
      ) : (
        <>
      {loadError ? (
        <WorkspaceStateCard
          title="Falha de leitura"
          tone="danger"
          actions={
            <Button variant="outline" onClick={() => void loadData(false)} disabled={refreshing}>
              {refreshing ? 'Atualizando...' : 'Tentar novamente'}
            </Button>
          }
        >
          <p>{loadError}</p>
        </WorkspaceStateCard>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="app-section-card">
          <CardHeader>
            <CardDescription>Total de recursos</CardDescription>
            <CardTitle className="text-3xl">{vehicles.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="app-section-card">
          <CardHeader>
            <CardDescription>Prontos para operar</CardDescription>
            <CardTitle className="text-3xl">{compliantVehicles}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="app-section-card">
          <CardHeader>
            <CardDescription>Ativos / pendentes</CardDescription>
            <CardTitle className="text-3xl">
              {activeVehicles} <span className="text-base text-muted-foreground">ativos</span>
            </CardTitle>
            <CardDescription>{pendingVehicles} aguardando aprovação</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <Card className="app-section-card">
        <CardHeader>
          <CardTitle className="text-xl">Veículos parceiros</CardTitle>
          <CardDescription>
            A tela agora concentra placa, RENAVAM, carroceria, validade documental e vínculo com motorista para sustentar as regras configuráveis de `shipments`.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-2xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Veículo</TableHead>
                  <TableHead>Capacidade</TableHead>
                  <TableHead>Compliance</TableHead>
                  <TableHead>Motorista vinculado</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 4 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell colSpan={6}>
                        <Skeleton className="h-8 w-full rounded-xl" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : vehicles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      Nenhum veículo parceiro cadastrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  vehicles.map((vehicle) => {
                    const complianceIssues = getVehicleComplianceIssues(vehicle)

                    return (
                      <TableRow key={vehicle.id}>
                        <TableCell>
                          <div className="font-medium">{vehicle.placa}</div>
                          <div className="text-xs text-muted-foreground">
                            {vehicle.tipo} {vehicle.bodyType ? `· ${vehicle.bodyType}` : ''}
                          </div>
                        </TableCell>
                        <TableCell>
                          {Number(vehicle.capacidadePeso)} kg • {Number(vehicle.capacidadeVolume)} m³
                        </TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            <div>{getComplianceBadge(vehicle)}</div>
                            <div className="text-xs text-muted-foreground">
                              Documento: {vehicle.documentExpiresAt ? formatDate(vehicle.documentExpiresAt) : 'não informado'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              RENAVAM: {vehicle.renavam || 'não informado'}
                            </div>
                            {complianceIssues.length > 0 ? (
                              <div className="flex items-start gap-2 text-xs text-amber-700">
                                <ShieldAlert className="mt-0.5 h-3.5 w-3.5" />
                                <span>{complianceIssues[0]}</span>
                              </div>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>{vehicle.driver?.nome || 'Não vinculado'}</TableCell>
                        <TableCell>{getStatusBadge(vehicle.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              asChild
                              size="icon"
                              variant="outline"
                              title="Visualizar veículo parceiro"
                            >
                              <Link href={`/dashboard/external-fleet/vehicles/${vehicle.id}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                            {vehicle.status === 'PENDENTE_APROVACAO' ? (
                              <Button
                                size="icon"
                                variant="outline"
                                className="text-green-600"
                                disabled={!canManageVehicles}
                                onClick={() => void handleApprove(vehicle.id)}
                                title="Aprovar veículo parceiro"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            ) : null}
                            {vehicle.status !== 'BLOQUEADO' ? (
                              <Button
                                size="icon"
                                variant="outline"
                                className="text-destructive"
                                disabled={!canManageVehicles}
                                onClick={() => void handleBlock(vehicle.id)}
                                title="Bloquear veículo parceiro"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            ) : null}
                            {canManageVehicles ? (
                              <Button
                                asChild
                                size="icon"
                                variant="outline"
                                title="Editar veículo parceiro"
                              >
                                <Link href={`/dashboard/external-fleet/vehicles/${vehicle.id}/edit`}>
                                  <Pencil className="h-4 w-4" />
                                </Link>
                              </Button>
                            ) : (
                              <Button
                                size="icon"
                                variant="outline"
                                disabled
                                title="Edição indisponível para este perfil"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

        </>
      )}
    </div>
  )
}

function formatDate(value?: string | null) {
  if (!value) {
    return 'não informado'
  }

  return new Intl.DateTimeFormat('pt-BR').format(new Date(value))
}

function getVehicleComplianceIssues(vehicle: VehicleRecord) {
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
