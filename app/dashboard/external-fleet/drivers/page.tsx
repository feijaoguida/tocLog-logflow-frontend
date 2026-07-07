'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { CheckCircle, Eye, Pencil, Plus, ShieldAlert, Truck, XCircle } from 'lucide-react'
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

type DriverRecord = {
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
  vehicles?: { id: string }[]
}

export default function ExternalDriversPage() {
  const { hasPermission } = useAuth()
  const [drivers, setDrivers] = useState<DriverRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const canViewDrivers = hasPermission('external-fleet.drivers.view')
  const canManageDrivers = hasPermission('external-fleet.drivers.manage')

  useEffect(() => {
    if (!canViewDrivers) {
      setLoading(false)
      return
    }

    void loadDrivers()
  }, [canViewDrivers])

  async function loadDrivers(showLoadingState = true) {
    if (showLoadingState) {
      setLoading(true)
    } else {
      setRefreshing(true)
    }

    try {
      setLoadError(null)
      const { data } = await api.get<DriverRecord[]>('/external-fleet/drivers')
      setDrivers(data)
    } catch (error) {
      const message = getApiErrorMessage(error, 'Não foi possível carregar os motoristas parceiros.')
      setLoadError(message)
      setDrivers([])
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
      await api.patch(`/external-fleet/drivers/${id}/approve`)
      toast.success('Motorista parceiro aprovado.')
      await loadDrivers(false)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível aprovar o motorista parceiro.'))
    }
  }

  async function handleBlock(id: string) {
    try {
      await api.patch(`/external-fleet/drivers/${id}/block`)
      toast.success('Motorista parceiro bloqueado.')
      await loadDrivers(false)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível bloquear o motorista parceiro.'))
    }
  }

  function getStatusBadge(status: DriverRecord['status']) {
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

  function getComplianceBadge(driver: DriverRecord) {
    const issues = getComplianceIssues(driver)

    if (issues.length === 0) {
      return <Badge className="bg-green-600">Pronto para rota</Badge>
    }

    if (issues.length === 1) {
      return <Badge variant="secondary">1 pendência</Badge>
    }

    return <Badge variant="destructive">{issues.length} pendências</Badge>
  }

  const activeDrivers = drivers.filter((driver) => driver.status === 'ATIVO').length
  const pendingDrivers = drivers.filter((driver) => driver.status === 'PENDENTE_APROVACAO').length
  const compliantDrivers = drivers.filter((driver) => getComplianceIssues(driver).length === 0).length

  return (
    <div className="app-page">
      <MenuFunctionHeader
        title="Frota Externa > Motoristas"
        description="Governança de parceiros com contato, homologação e sinais de compliance para alocação em cargas e rotas."
        actions={
          <div className="flex items-center gap-2">
            {canManageDrivers ? (
              <Button asChild>
                <Link href="/dashboard/external-fleet/drivers/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Novo motorista
                </Link>
              </Button>
            ) : (
              <Badge variant="outline" className="rounded-full px-4 py-2">
                Modo leitura
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={() => void loadDrivers(false)} disabled={loading || refreshing}>
              {refreshing ? 'Atualizando...' : 'Atualizar leitura'}
            </Button>
          </div>
        }
      />

      {!canViewDrivers ? (
        <WorkspaceStateCard title="Acesso restrito">
          <p>Este perfil não pode visualizar a governança de motoristas parceiros.</p>
        </WorkspaceStateCard>
      ) : (
        <>
      {loadError ? (
        <WorkspaceStateCard
          title="Falha de leitura"
          tone="danger"
          actions={
            <Button variant="outline" onClick={() => void loadDrivers(false)} disabled={refreshing}>
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
            <CardDescription>Total de parceiros</CardDescription>
            <CardTitle className="text-3xl">{drivers.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="app-section-card">
          <CardHeader>
            <CardDescription>Prontos para operar</CardDescription>
            <CardTitle className="text-3xl">{compliantDrivers}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="app-section-card">
          <CardHeader>
            <CardDescription>Ativos / pendentes</CardDescription>
            <CardTitle className="text-3xl">
              {activeDrivers} <span className="text-base text-muted-foreground">ativos</span>
            </CardTitle>
            <CardDescription>{pendingDrivers} aguardando aprovação</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <Card className="app-section-card">
        <CardHeader>
          <CardTitle className="text-xl">Motoristas parceiros</CardTitle>
          <CardDescription>
            A tela agora centraliza CPF, contato, validade da CNH e situação do RNTRC para sustentar as regras configuráveis de `shipments`.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-2xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Parceiro</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Compliance</TableHead>
                  <TableHead>Veículos</TableHead>
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
                ) : drivers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      Nenhum motorista parceiro cadastrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  drivers.map((driver) => {
                    const complianceIssues = getComplianceIssues(driver)

                    return (
                      <TableRow key={driver.id}>
                        <TableCell>
                          <div className="font-medium">{driver.nome}</div>
                          <div className="text-xs text-muted-foreground">
                            CPF: {formatCpf(driver.documento)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>{driver.telefone}</div>
                          <div className="text-xs text-muted-foreground">
                            {driver.email || 'Sem email cadastrado'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            <div>{getComplianceBadge(driver)}</div>
                            <div className="text-xs text-muted-foreground">
                              CNH: {driver.cnhExpiresAt ? formatDate(driver.cnhExpiresAt) : 'não informada'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              RNTRC: {driver.rntrcCode ? `${driver.rntrcCode} · ${driver.rntrcStatus || 'sem status'}` : 'não informado'}
                            </div>
                            {complianceIssues.length > 0 ? (
                              <div className="flex items-start gap-2 text-xs text-amber-700">
                                <ShieldAlert className="mt-0.5 h-3.5 w-3.5" />
                                <span>{complianceIssues[0]}</span>
                              </div>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4 text-muted-foreground" />
                            {driver.vehicles?.length || 0} vinculados
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(driver.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              asChild
                              size="icon"
                              variant="outline"
                              title="Visualizar motorista parceiro"
                            >
                              <Link href={`/dashboard/external-fleet/drivers/${driver.id}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                            {driver.status === 'PENDENTE_APROVACAO' ? (
                              <Button
                                size="icon"
                                variant="outline"
                                className="text-green-600"
                                disabled={!canManageDrivers}
                                onClick={() => void handleApprove(driver.id)}
                                title="Aprovar motorista parceiro"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            ) : null}
                            {driver.status !== 'BLOQUEADO' ? (
                              <Button
                                size="icon"
                                variant="outline"
                                className="text-destructive"
                                disabled={!canManageDrivers}
                                onClick={() => void handleBlock(driver.id)}
                                title="Bloquear motorista parceiro"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            ) : null}
                            {canManageDrivers ? (
                              <Button
                                asChild
                                size="icon"
                                variant="outline"
                                title="Editar motorista parceiro"
                              >
                                <Link href={`/dashboard/external-fleet/drivers/${driver.id}/edit`}>
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

function formatCpf(value: string) {
  if (value.length !== 11) {
    return value
  }

  return `${value.slice(0, 3)}.${value.slice(3, 6)}.${value.slice(6, 9)}-${value.slice(9, 11)}`
}

function formatDate(value?: string | null) {
  if (!value) {
    return 'não informado'
  }

  return new Intl.DateTimeFormat('pt-BR').format(new Date(value))
}

function getComplianceIssues(driver: DriverRecord) {
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
