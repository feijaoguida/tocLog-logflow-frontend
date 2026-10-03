'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  CheckCircle,
  Eye,
  Filter,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Truck,
  UserCheck,
  X,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'

import { WorkspaceStateCard } from '@/components/layout/workspace-state-card'
import { useAuth } from '@/context/auth-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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

const PAGE_SIZE = 10

export default function ExternalVehiclesPage() {
  const { hasPermission } = useAuth()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([])

  // Filtros TocLog
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ATIVO' | 'PENDENTE_APROVACAO' | 'BLOQUEADO'>('ALL')
  const [complianceFilter, setComplianceFilter] = useState<'ALL' | 'COMPLIANT' | 'NON_COMPLIANT'>('ALL')
  const [page, setPage] = useState(1)

  // Modais de Decisão (AC-02 / AC-04)
  const [approveTarget, setApproveTarget] = useState<VehicleRecord | null>(null)
  const [blockTarget, setBlockTarget] = useState<VehicleRecord | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const canViewVehicles = hasPermission('external-fleet.vehicles.view')
  const canManageVehicles = hasPermission('external-fleet.vehicles.manage')
  const canApproveVehicles = hasPermission('external-fleet.vehicles.approve')
  const canBlockVehicles = hasPermission('external-fleet.vehicles.block')

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

  async function confirmApprove() {
    if (!approveTarget) return
    setActionLoading(true)
    try {
      await api.patch(`/external-fleet/vehicles/${approveTarget.id}/approve`)
      toast.success(`Veículo parceiro ${approveTarget.placa} aprovado com sucesso.`)
      setApproveTarget(null)
      await loadData(false)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível aprovar o veículo parceiro.'))
    } finally {
      setActionLoading(false)
    }
  }

  async function confirmBlock() {
    if (!blockTarget) return
    setActionLoading(true)
    try {
      await api.patch(`/external-fleet/vehicles/${blockTarget.id}/block`)
      toast.success(`Veículo parceiro ${blockTarget.placa} bloqueado.`)
      setBlockTarget(null)
      await loadData(false)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível bloquear o veículo parceiro.'))
    } finally {
      setActionLoading(false)
    }
  }

  // Filtragem
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const query = search.trim().toLowerCase()
      const matchesSearch =
        !query ||
        v.placa.toLowerCase().includes(query) ||
        v.tipo.toLowerCase().includes(query) ||
        (v.driver?.nome && v.driver.nome.toLowerCase().includes(query))

      const matchesStatus = statusFilter === 'ALL' || v.status === statusFilter

      const issues = getVehicleComplianceIssues(v)
      const matchesCompliance =
        complianceFilter === 'ALL' ||
        (complianceFilter === 'COMPLIANT' && issues.length === 0) ||
        (complianceFilter === 'NON_COMPLIANT' && issues.length > 0)

      return matchesSearch && matchesStatus && matchesCompliance
    })
  }, [vehicles, search, statusFilter, complianceFilter])

  const totalPages = Math.max(1, Math.ceil(filteredVehicles.length / PAGE_SIZE))
  const paginatedVehicles = filteredVehicles.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const activeVehicles = vehicles.filter((v) => v.status === 'ATIVO').length
  const pendingVehicles = vehicles.filter((v) => v.status === 'PENDENTE_APROVACAO').length
  const compliantVehicles = vehicles.filter((v) => getVehicleComplianceIssues(v).length === 0).length

  const activeFiltersCount =
    (statusFilter !== 'ALL' ? 1 : 0) + (complianceFilter !== 'ALL' ? 1 : 0)

  return (
    <div className="space-y-6">
      {/* U1: Cabeçalho Padrão TocLog */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Veículos Parceiros
            </h1>
            <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary text-xs">
              Frota Externa
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 sm:text-sm">
            Homologação de veículos agregados, validação cruzada de duplicidade de placas e vinculação a motoristas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canManageVehicles ? (
            <Button asChild size="sm" className="gap-1.5 shadow-sm">
              <Link href="/dashboard/external-fleet/vehicles/new">
                <Plus className="h-4 w-4" />
                Novo Veículo
              </Link>
            </Button>
          ) : (
            <Badge variant="outline" className="px-3 py-1">
              Modo Leitura
            </Badge>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadData(false)}
            disabled={loading || refreshing}
            className="gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Atualizando...' : 'Atualizar'}
          </Button>
        </div>
      </div>

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

          {/* U2: Quatro Cards KPIs Responsivos */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <Card className="rounded-xl border border-border bg-card p-4 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40">
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Total Veículos</p>
                  <p className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                    {vehicles.length}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="rounded-xl border border-border bg-card p-4 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Ativos / Homologados</p>
                  <p className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                    {activeVehicles}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="rounded-xl border border-border bg-card p-4 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/40">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Aguardando Aprovação</p>
                  <p className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                    {pendingVehicles}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="rounded-xl border border-border bg-card p-4 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">100% Compliance</p>
                  <p className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                    {compliantVehicles}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* U3: Barra de Ações Integrada & FilterPopover */}
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 sm:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por placa, tipo de veículo ou motorista..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="pl-9 text-xs sm:text-sm font-mono"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                    <Filter className="h-3.5 w-3.5" />
                    Filtros
                    {activeFiltersCount > 0 && (
                      <Badge variant="secondary" className="ml-1 px-1.5 py-0.2 text-[10px]">
                        {activeFiltersCount}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-72 space-y-4 p-4 text-xs">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="font-semibold text-sm">Filtros Avançados</span>
                    {activeFiltersCount > 0 && (
                      <button
                        onClick={() => {
                          setStatusFilter('ALL')
                          setComplianceFilter('ALL')
                          setPage(1)
                        }}
                        className="text-xs text-primary hover:underline"
                      >
                        Limpar
                      </button>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-medium text-muted-foreground">Status do Veículo</label>
                    <Select
                      value={statusFilter}
                      onValueChange={(val: any) => {
                        setStatusFilter(val)
                        setPage(1)
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Todos os status</SelectItem>
                        <SelectItem value="ATIVO">Ativo</SelectItem>
                        <SelectItem value="PENDENTE_APROVACAO">Pendente de Aprovação</SelectItem>
                        <SelectItem value="BLOQUEADO">Bloqueado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-medium text-muted-foreground">Conformidade Operacional</label>
                    <Select
                      value={complianceFilter}
                      onValueChange={(val: any) => {
                        setComplianceFilter(val)
                        setPage(1)
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Todos</SelectItem>
                        <SelectItem value="COMPLIANT">Pronto para rota (Sem pendências)</SelectItem>
                        <SelectItem value="NON_COMPLIANT">Com pendências (Motorista/Documento)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </PopoverContent>
              </Popover>

              <span className="text-xs text-muted-foreground hidden sm:inline">
                {filteredVehicles.length} {filteredVehicles.length === 1 ? 'veículo' : 'veículos'}
              </span>
            </div>
          </div>

          {/* U4 & U5: Tabela com Soft Badges */}
          <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="w-[180px]">Placa / Tipo</TableHead>
                    <TableHead>Motorista Vinculado</TableHead>
                    <TableHead>Capacidade & Carroceria</TableHead>
                    <TableHead>Compliance & Documentos</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 4 }).map((_, index) => (
                      <TableRow key={index}>
                        <TableCell colSpan={6}>
                          <Skeleton className="h-9 w-full rounded-md" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : paginatedVehicles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-28 text-center text-muted-foreground text-xs sm:text-sm">
                        Nenhum veículo parceiro encontrado com os critérios aplicados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedVehicles.map((vehicle) => {
                      const complianceIssues = getVehicleComplianceIssues(vehicle)

                      return (
                        <TableRow key={vehicle.id} className="hover:bg-muted/20">
                          <TableCell>
                            <div className="font-semibold text-sm font-mono text-foreground">
                              {vehicle.placa}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {vehicle.tipo}
                            </div>
                          </TableCell>

                          <TableCell>
                            {vehicle.driver ? (
                              <div>
                                <div className="font-medium text-xs sm:text-sm text-foreground">
                                  {vehicle.driver.nome}
                                </div>
                                <div className="text-[11px] text-muted-foreground">Motorista ativo</div>
                              </div>
                            ) : (
                              <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                                Sem motorista vinculado
                              </span>
                            )}
                          </TableCell>

                          <TableCell>
                            <div className="text-xs">
                              <span className="font-medium">{vehicle.capacidadePeso} kg</span> ·{' '}
                              <span className="text-muted-foreground">{vehicle.capacidadeVolume} m³</span>
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {vehicle.bodyType || 'Carroceria padrão'}
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="space-y-1">
                              <div>{getComplianceSoftBadge(vehicle)}</div>
                              <div className="text-[11px] text-muted-foreground">
                                Doc: {vehicle.documentExpiresAt ? formatDate(vehicle.documentExpiresAt) : 'Não informado'}
                              </div>
                              {complianceIssues.length > 0 && (
                                <div className="text-[10px] text-amber-700 dark:text-amber-300 font-medium truncate max-w-[200px]">
                                  {complianceIssues[0]}
                                </div>
                              )}
                            </div>
                          </TableCell>

                          <TableCell>{getStatusSoftBadge(vehicle.status)}</TableCell>

                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                asChild
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                title="Visualizar detalhes"
                              >
                                <Link href={`/dashboard/external-fleet/vehicles/${vehicle.id}`}>
                                  <Eye className="h-4 w-4" />
                                </Link>
                              </Button>

                              {/* Ação de Aprovação com Modal (AC-02 / AC-04) */}
                              {vehicle.status === 'PENDENTE_APROVACAO' && canApproveVehicles ? (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                                  onClick={() => setApproveTarget(vehicle)}
                                  title="Aprovar veículo parceiro"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                              ) : null}

                              {/* Ação de Bloqueio com Modal (AC-03 / AC-04) */}
                              {vehicle.status !== 'BLOQUEADO' && canBlockVehicles ? (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                  onClick={() => setBlockTarget(vehicle)}
                                  title="Bloquear veículo parceiro"
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              ) : null}

                              {canManageVehicles ? (
                                <Button
                                  asChild
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                  title="Editar veículo"
                                >
                                  <Link href={`/dashboard/external-fleet/vehicles/${vehicle.id}/edit`}>
                                    <Pencil className="h-4 w-4" />
                                  </Link>
                                </Button>
                              ) : null}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* U6: Paginação Real */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground">
                <span>
                  Página {page} de {totalPages} ({filteredVehicles.length} resultados)
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* U7: Diálogo Centralizado de Homologação / Aprovação de Veículo (AC-02) */}
      <Dialog open={!!approveTarget} onOpenChange={(open) => !open && setApproveTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <CheckCircle className="h-5 w-5" />
              Homologar Veículo Parceiro
            </DialogTitle>
            <DialogDescription>
              Confirma a aprovação do veículo terceiro para alocação em fretes e rotas da empresa.
            </DialogDescription>
          </DialogHeader>

          {approveTarget && (
            <div className="space-y-3 py-2 text-xs">
              <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
                <div className="font-semibold text-sm font-mono text-foreground">{approveTarget.placa}</div>
                <div className="text-muted-foreground">Tipo: {approveTarget.tipo}</div>
                <div className="text-muted-foreground">
                  Motorista: {approveTarget.driver?.nome || 'Nenhum motorista vinculado'}
                </div>
              </div>

              {getVehicleComplianceIssues(approveTarget).length > 0 && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 p-3 text-amber-800 dark:text-amber-200">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <ShieldAlert className="h-4 w-4 text-amber-600" />
                    Atenção aos sinais cadastrais:
                  </div>
                  <ul className="list-disc pl-4 mt-1 space-y-0.5 text-[11px]">
                    {getVehicleComplianceIssues(approveTarget).map((issue, idx) => (
                      <li key={idx}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="text-muted-foreground leading-relaxed">
                <strong>Prevenção de Autoaprovação (AC-02):</strong> Se o motorista vinculado for o próprio operador conectado, a operação será expressamente recusada.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveTarget(null)} disabled={actionLoading}>
              Cancelar
            </Button>
            <Button
              onClick={() => void confirmApprove()}
              disabled={actionLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {actionLoading ? 'Aprovando...' : 'Confirmar Aprovação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* U7: Diálogo Centralizado de Bloqueio Operacional de Veículo (AC-03) */}
      <Dialog open={!!blockTarget} onOpenChange={(open) => !open && setBlockTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              Bloquear Veículo Parceiro
            </DialogTitle>
            <DialogDescription>
              O bloqueio impede a alocação deste veículo em qualquer novo frete ou despacho logístico (AC-03).
            </DialogDescription>
          </DialogHeader>

          {blockTarget && (
            <div className="space-y-3 py-2 text-xs">
              <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
                <div className="font-semibold text-sm font-mono text-foreground">{blockTarget.placa}</div>
                <div className="text-muted-foreground">Tipo: {blockTarget.tipo}</div>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                O veículo constará imediatamente como bloqueado em toda a validação de disponibilidade e rotas.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockTarget(null)} disabled={actionLoading}>
              Voltar
            </Button>
            <Button
              variant="destructive"
              onClick={() => void confirmBlock()}
              disabled={actionLoading}
            >
              {actionLoading ? 'Bloqueando...' : 'Confirmar Bloqueio'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function formatDate(value?: string | null) {
  if (!value) {
    return 'Não informado'
  }
  return new Intl.DateTimeFormat('pt-BR').format(new Date(value))
}

function getStatusSoftBadge(status: VehicleRecord['status']) {
  switch (status) {
    case 'ATIVO':
      return (
        <Badge variant="outline" className="border-emerald-500/20 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 text-xs">
          Ativo
        </Badge>
      )
    case 'PENDENTE_APROVACAO':
      return (
        <Badge variant="outline" className="border-amber-500/20 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 text-xs">
          Pendente
        </Badge>
      )
    case 'BLOQUEADO':
      return (
        <Badge variant="outline" className="border-destructive/20 bg-destructive/10 text-destructive text-xs">
          Bloqueado
        </Badge>
      )
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

function getComplianceSoftBadge(vehicle: VehicleRecord) {
  const issues = getVehicleComplianceIssues(vehicle)

  if (issues.length === 0) {
    return (
      <Badge variant="outline" className="border-emerald-500/20 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 text-[10px]">
        Pronto para rota
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className="border-amber-500/20 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 text-[10px]">
      {issues.length} {issues.length === 1 ? 'pendência' : 'pendências'}
    </Badge>
  )
}

function getVehicleComplianceIssues(vehicle: VehicleRecord) {
  const issues: string[] = []
  const now = Date.now()

  if (!vehicle.driver) {
    issues.push('Nenhum motorista vinculado.')
  }

  if (!vehicle.documentExpiresAt) {
    issues.push('Validade do documento não informada.')
  } else if (new Date(vehicle.documentExpiresAt).getTime() <= now) {
    issues.push('Documento do veículo vencido.')
  }

  if (vehicle.status !== 'ATIVO') {
    issues.push('Veículo parceiro ainda não homologado.')
  }

  return issues
}
