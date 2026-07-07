'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Car, Gauge, Search, ShieldAlert, Wrench } from 'lucide-react'
import { toast } from 'sonner'

import { MenuFunctionHeader } from '@/components/layout/menu-function-header'
import { WorkspaceStateCard } from '@/components/layout/workspace-state-card'
import { useAuth } from '@/context/auth-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'
import type { Vehicle } from '@/types/fleet'

type VehicleRecord = Vehicle & {
  branch?: { id: string; name: string } | null
  department?: { id: string; name: string } | null
}

const STATUS_BADGE: Record<
  VehicleRecord['status'],
  { label: string; className: string }
> = {
  AVAILABLE: { label: 'Disponível', className: 'bg-green-600' },
  IN_USE: { label: 'Em uso', className: 'bg-sky-600' },
  MAINTENANCE: { label: 'Em manutenção', className: 'bg-amber-500 text-amber-950' },
  BLOCKED: { label: 'Bloqueado', className: 'bg-destructive text-destructive-foreground' },
}

export default function FleetPage() {
  const { hasPermission } = useAuth()
  const canViewVehicles = hasPermission('fleet.vehicles.view')
  const canManageVehicles = hasPermission('fleet.vehicles.manage')

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (!canViewVehicles) {
      setLoading(false)
      return
    }

    void loadVehicles()
  }, [canViewVehicles])

  async function loadVehicles(showLoadingState = true) {
    if (showLoadingState) {
      setLoading(true)
    } else {
      setRefreshing(true)
    }

    try {
      setLoadError(null)
      const { data } = await api.get<VehicleRecord[]>('/fleet/vehicles')
      setVehicles(data)
    } catch (error) {
      const message = getApiErrorMessage(error, 'Não foi possível carregar a frota interna.')
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

  const filteredVehicles = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    if (!normalizedSearch) {
      return vehicles
    }

    return vehicles.filter((vehicle) => {
      const searchableValues = [
        vehicle.plate,
        vehicle.model,
        vehicle.category?.name,
        vehicle.branch?.name,
        vehicle.department?.name,
      ]

      return searchableValues.some((value) =>
        value?.toLowerCase().includes(normalizedSearch),
      )
    })
  }, [searchTerm, vehicles])

  const availableVehicles = vehicles.filter((vehicle) => vehicle.status === 'AVAILABLE').length
  const maintenanceVehicles = vehicles.filter((vehicle) => vehicle.status === 'MAINTENANCE').length
  const blockedVehicles = vehicles.filter((vehicle) => vehicle.status === 'BLOCKED').length
  const totalKm = vehicles.reduce((sum, vehicle) => sum + vehicle.currentKm, 0)

  return (
    <div className="app-page">
      <MenuFunctionHeader
        title="Frota > Veículos"
        description="Catálogo operacional da frota interna com recorte por tenant, leitura por status e navegação para manutenção, checklists e histórico do veículo."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {canManageVehicles ? (
              <Badge variant="outline" className="rounded-full px-4 py-2">
                Cadastro web em evolução
              </Badge>
            ) : (
              <Badge variant="outline" className="rounded-full px-4 py-2">
                Modo leitura
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadVehicles(false)}
              disabled={loading || refreshing}
            >
              {refreshing ? 'Atualizando...' : 'Atualizar leitura'}
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/fleet/maintenance">Manutenções</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/fleet/checklists">Checklists</Link>
            </Button>
          </div>
        }
      >
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          A governança de veículos internos continua separada da operação de{' '}
          <code>shipments</code>, mas sustenta as regras de checklist, manutenção e
          elegibilidade usadas na alocação de rotas.
        </p>
      </MenuFunctionHeader>

      {!canViewVehicles ? (
        <WorkspaceStateCard title="Acesso restrito">
          <p>Este perfil não pode visualizar a frota interna.</p>
        </WorkspaceStateCard>
      ) : (
        <>
          {loadError ? (
            <WorkspaceStateCard
              title="Falha de leitura"
              tone="danger"
              actions={
                <Button
                  variant="outline"
                  onClick={() => void loadVehicles(false)}
                  disabled={refreshing}
                >
                  {refreshing ? 'Atualizando...' : 'Tentar novamente'}
                </Button>
              }
            >
              <p>{loadError}</p>
            </WorkspaceStateCard>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card className="app-section-card">
              <CardHeader>
                <CardDescription>Total da frota</CardDescription>
                <CardTitle className="text-3xl">{vehicles.length}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="app-section-card">
              <CardHeader>
                <CardDescription>Disponíveis para operação</CardDescription>
                <CardTitle className="text-3xl">{availableVehicles}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="app-section-card">
              <CardHeader>
                <CardDescription>Com atenção operacional</CardDescription>
                <CardTitle className="text-3xl">{maintenanceVehicles + blockedVehicles}</CardTitle>
                <CardDescription>
                  {maintenanceVehicles} em manutenção • {blockedVehicles} bloqueados
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="app-section-card">
              <CardHeader>
                <CardDescription>KM consolidada</CardDescription>
                <CardTitle className="text-3xl">{totalKm.toLocaleString('pt-BR')}</CardTitle>
                <CardDescription>Soma da quilometragem atual da frota visível</CardDescription>
              </CardHeader>
            </Card>
          </div>

          <Card className="app-section-card">
            <CardHeader className="gap-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle className="text-xl">Veículos internos</CardTitle>
                  <CardDescription>
                    Leitura operacional da frota por status, categoria, filial e
                    departamento.
                  </CardDescription>
                </div>
                <div className="relative w-full lg:w-80">
                  <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Buscar placa, modelo, categoria ou filial"
                    className="pl-9"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-2xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Veículo</TableHead>
                      <TableHead>Contexto</TableHead>
                      <TableHead>Quilometragem</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Atalho</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading
                      ? Array.from({ length: 5 }).map((_, index) => (
                          <TableRow key={index}>
                            <TableCell colSpan={5}>
                              <Skeleton className="h-8 w-full rounded-xl" />
                            </TableCell>
                          </TableRow>
                        ))
                      : filteredVehicles.length === 0
                        ? (
                          <TableRow>
                            <TableCell
                              colSpan={5}
                              className="h-24 text-center text-muted-foreground"
                            >
                              {searchTerm
                                ? 'Nenhum veículo encontrado para o filtro informado.'
                                : 'Nenhum veículo interno cadastrado para este tenant.'}
                            </TableCell>
                          </TableRow>
                          )
                        : filteredVehicles.map((vehicle) => {
                            const statusBadge = STATUS_BADGE[vehicle.status]

                            return (
                              <TableRow key={vehicle.id}>
                                <TableCell>
                                  <div className="font-medium">{vehicle.plate}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {vehicle.model} • {vehicle.year} • {vehicle.color}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="text-sm">
                                    {vehicle.category?.name || 'Sem categoria'}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {vehicle.branch?.name || 'Filial não informada'}
                                    {vehicle.department?.name
                                      ? ` • ${vehicle.department.name}`
                                      : ''}
                                  </div>
                                </TableCell>
                                <TableCell>{vehicle.currentKm.toLocaleString('pt-BR')} km</TableCell>
                                <TableCell>
                                  <Badge className={statusBadge.className}>
                                    {statusBadge.label}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button asChild variant="ghost" size="sm">
                                    <Link href={`/dashboard/fleet/${vehicle.id}`}>
                                      Ver detalhe
                                    </Link>
                                  </Button>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
                  <div className="mb-2 flex items-center gap-2 text-foreground">
                    <Car className="h-4 w-4" />
                    <span className="font-medium">Leitura por tenant</span>
                  </div>
                  A listagem já respeita o recorte por empresa definido no backend,
                  evitando mistura entre frotas internas de tenants diferentes.
                </div>
                <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
                  <div className="mb-2 flex items-center gap-2 text-foreground">
                    <Wrench className="h-4 w-4" />
                    <span className="font-medium">Manutenção e checklist</span>
                  </div>
                  A elegibilidade operacional do veículo continua sendo consumida por{' '}
                  <code>shipments</code> nas validações de alocação e despacho.
                </div>
                <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
                  <div className="mb-2 flex items-center gap-2 text-foreground">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-medium">Cadastro web</span>
                  </div>
                  O cadastro/edição dedicado da frota interna ainda precisa de uma
                  próxima onda. Por enquanto, esta área foi endurecida para leitura
                  operacional confiável.
                </div>
              </div>

              {!canManageVehicles ? (
                <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <ShieldAlert className="h-4 w-4" />
                  Este perfil pode acompanhar a frota, mas não manter cadastros ou
                  alterações estruturais.
                </div>
              ) : null}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
