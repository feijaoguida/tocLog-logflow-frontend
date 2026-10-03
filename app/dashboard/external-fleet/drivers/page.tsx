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
  Users,
  X,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'

import { WorkspaceStateCard } from '@/components/layout/workspace-state-card'
import { useAuth } from '@/context/auth-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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

const PAGE_SIZE = 10

export default function ExternalDriversPage() {
  const { hasPermission, user } = useAuth()
  const [drivers, setDrivers] = useState<DriverRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Filtros TocLog
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ATIVO' | 'PENDENTE_APROVACAO' | 'BLOQUEADO'>('ALL')
  const [complianceFilter, setComplianceFilter] = useState<'ALL' | 'COMPLIANT' | 'NON_COMPLIANT'>('ALL')
  const [page, setPage] = useState(1)

  // Modais de Decisão (AC-02 / AC-04 / D12)
  const [approveTarget, setApproveTarget] = useState<DriverRecord | null>(null)
  const [blockTarget, setBlockTarget] = useState<DriverRecord | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const canViewDrivers = hasPermission('external-fleet.drivers.view')
  const canManageDrivers = hasPermission('external-fleet.drivers.manage')
  const canApproveDrivers = hasPermission('external-fleet.drivers.approve')
  const canBlockDrivers = hasPermission('external-fleet.drivers.block')

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

  async function confirmApprove() {
    if (!approveTarget) return
    setActionLoading(true)
    try {
      await api.patch(`/external-fleet/drivers/${approveTarget.id}/approve`)
      toast.success(`Motorista parceiro ${approveTarget.nome} aprovado com sucesso.`)
      setApproveTarget(null)
      await loadDrivers(false)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível aprovar o motorista parceiro.'))
    } finally {
      setActionLoading(false)
    }
  }

  async function confirmBlock() {
    if (!blockTarget) return
    setActionLoading(true)
    try {
      await api.patch(`/external-fleet/drivers/${blockTarget.id}/block`)
      toast.success(`Motorista parceiro ${blockTarget.nome} bloqueado.`)
      setBlockTarget(null)
      await loadDrivers(false)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível bloquear o motorista parceiro.'))
    } finally {
      setActionLoading(false)
    }
  }

  // Filtragem
  const filteredDrivers = useMemo(() => {
    return drivers.filter((driver) => {
      const query = search.trim().toLowerCase()
      const matchesSearch =
        !query ||
        driver.nome.toLowerCase().includes(query) ||
        driver.documento.includes(query) ||
        driver.telefone.includes(query) ||
        (driver.email && driver.email.toLowerCase().includes(query))

      const matchesStatus = statusFilter === 'ALL' || driver.status === statusFilter

      const issues = getComplianceIssues(driver)
      const matchesCompliance =
        complianceFilter === 'ALL' ||
        (complianceFilter === 'COMPLIANT' && issues.length === 0) ||
        (complianceFilter === 'NON_COMPLIANT' && issues.length > 0)

      return matchesSearch && matchesStatus && matchesCompliance
    })
  }, [drivers, search, statusFilter, complianceFilter])

  const totalPages = Math.max(1, Math.ceil(filteredDrivers.length / PAGE_SIZE))
  const paginatedDrivers = filteredDrivers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const activeDrivers = drivers.filter((d) => d.status === 'ATIVO').length
  const pendingDrivers = drivers.filter((d) => d.status === 'PENDENTE_APROVACAO').length
  const blockedDrivers = drivers.filter((d) => d.status === 'BLOQUEADO').length
  const compliantDrivers = drivers.filter((d) => getComplianceIssues(d).length === 0).length

  const activeFiltersCount =
    (statusFilter !== 'ALL' ? 1 : 0) + (complianceFilter !== 'ALL' ? 1 : 0)

  return (
    <div className="space-y-6">
      {/* U1: Cabeçalho Padrão TocLog */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Motoristas Parceiros
            </h1>
            <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary text-xs">
              Frota Externa
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 sm:text-sm">
            Homologação independente, sinalização de compliance regulatório e governança de alocação de terceiros.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canManageDrivers ? (
            <Button asChild size="sm" className="gap-1.5 shadow-sm">
              <Link href="/dashboard/external-fleet/drivers/new">
                <Plus className="h-4 w-4" />
                Novo Motorista
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
            onClick={() => void loadDrivers(false)}
            disabled={loading || refreshing}
            className="gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Atualizando...' : 'Atualizar'}
          </Button>
        </div>
      </div>

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

          {/* U2: Quatro Cards KPIs Responsivos */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <Card className="rounded-xl border border-border bg-card p-4 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Total Parceiros</p>
                  <p className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                    {drivers.length}
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
                    {activeDrivers}
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
                    {pendingDrivers}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="rounded-xl border border-border bg-card p-4 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40">
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">100% Compliance</p>
                  <p className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                    {compliantDrivers}
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
                placeholder="Buscar por nome, CPF, telefone ou e-mail..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="pl-9 text-xs sm:text-sm"
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
                    <label className="font-medium text-muted-foreground">Status do Cadastro</label>
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
                    <label className="font-medium text-muted-foreground">Conformidade / Compliance</label>
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
                        <SelectItem value="NON_COMPLIANT">Com pendências (CNH/RNTRC)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </PopoverContent>
              </Popover>

              <span className="text-xs text-muted-foreground hidden sm:inline">
                {filteredDrivers.length} {filteredDrivers.length === 1 ? 'parceiro' : 'parceiros'}
              </span>
            </div>
          </div>

          {/* U4 & U5: Tabela com Soft Badges */}
          <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="w-[240px]">Motorista Parceiro</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Compliance & Documentos</TableHead>
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
                          <Skeleton className="h-9 w-full rounded-md" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : paginatedDrivers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-28 text-center text-muted-foreground text-xs sm:text-sm">
                        Nenhum motorista parceiro encontrado com os critérios aplicados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedDrivers.map((driver) => {
                      const complianceIssues = getComplianceIssues(driver)

                      return (
                        <TableRow key={driver.id} className="hover:bg-muted/20">
                          <TableCell>
                            <div className="font-semibold text-sm leading-tight text-foreground">
                              {driver.nome}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              CPF: {formatCpf(driver.documento)}
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="text-xs sm:text-sm">{driver.telefone}</div>
                            <div className="text-xs text-muted-foreground">
                              {driver.email || 'Sem e-mail'}
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="space-y-1">
                              <div>{getComplianceSoftBadge(driver)}</div>
                              <div className="text-[11px] text-muted-foreground">
                                CNH: {driver.cnhExpiresAt ? formatDate(driver.cnhExpiresAt) : 'Não informada'}
                              </div>
                              <div className="text-[11px] text-muted-foreground">
                                RNTRC: {driver.rntrcCode ? `${driver.rntrcCode} (${driver.rntrcStatus || 'Sem status'})` : 'Não informado'}
                              </div>
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Truck className="h-3.5 w-3.5" />
                              <span>{driver.vehicles?.length || 0} vinculados</span>
                            </div>
                          </TableCell>

                          <TableCell>{getStatusSoftBadge(driver.status)}</TableCell>

                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                asChild
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                title="Visualizar detalhes"
                              >
                                <Link href={`/dashboard/external-fleet/drivers/${driver.id}`}>
                                  <Eye className="h-4 w-4" />
                                </Link>
                              </Button>

                              {/* Ação de Homologação com Modal (AC-02 / AC-04) */}
                              {driver.status === 'PENDENTE_APROVACAO' && canApproveDrivers ? (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                                  onClick={() => setApproveTarget(driver)}
                                  title="Aprovar motorista parceiro"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                              ) : null}

                              {/* Ação de Bloqueio com Modal (AC-03 / AC-04) */}
                              {driver.status !== 'BLOQUEADO' && canBlockDrivers ? (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                  onClick={() => setBlockTarget(driver)}
                                  title="Bloquear motorista parceiro"
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              ) : null}

                              {canManageDrivers ? (
                                <Button
                                  asChild
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                  title="Editar motorista"
                                >
                                  <Link href={`/dashboard/external-fleet/drivers/${driver.id}/edit`}>
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
                  Página {page} de {totalPages} ({filteredDrivers.length} resultados)
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

      {/* U7: Diálogo Centralizado de Homologação / Aprovação (AC-02) */}
      <Dialog open={!!approveTarget} onOpenChange={(open) => !open && setApproveTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600">
              <CheckCircle className="h-5 w-5" />
              Homologar Motorista Parceiro
            </DialogTitle>
            <DialogDescription>
              Confirma a aprovação cadastral e liberação operacional do motorista terceiro.
            </DialogDescription>
          </DialogHeader>

          {approveTarget && (
            <div className="space-y-3 py-2 text-xs">
              <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
                <div className="font-semibold text-sm text-foreground">{approveTarget.nome}</div>
                <div className="text-muted-foreground">CPF: {formatCpf(approveTarget.documento)}</div>
                <div className="text-muted-foreground">Telefone: {approveTarget.telefone}</div>
              </div>

              {getComplianceIssues(approveTarget).length > 0 && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 p-3 text-amber-800 dark:text-amber-200">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <ShieldAlert className="h-4 w-4 text-amber-600" />
                    Atenção aos sinais regulatórios:
                  </div>
                  <ul className="list-disc pl-4 mt-1 space-y-0.5 text-[11px]">
                    {getComplianceIssues(approveTarget).map((issue, idx) => (
                      <li key={idx}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="text-muted-foreground leading-relaxed">
                <strong>Regra de Governança (AC-02):</strong> A aprovação é registrada pelo operador logado e não permite autoaprovação pelo próprio terceiro.
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

      {/* U7: Diálogo Centralizado de Bloqueio Operacional (AC-03) */}
      <Dialog open={!!blockTarget} onOpenChange={(open) => !open && setBlockTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              Bloquear Motorista Parceiro
            </DialogTitle>
            <DialogDescription>
              O bloqueio suspende imediatamente a emissão de rotas e o acesso a manifestos para este terceiro (AC-03).
            </DialogDescription>
          </DialogHeader>

          {blockTarget && (
            <div className="space-y-3 py-2 text-xs">
              <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
                <div className="font-semibold text-sm text-foreground">{blockTarget.nome}</div>
                <div className="text-muted-foreground">CPF: {formatCpf(blockTarget.documento)}</div>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Sessões ativas anteriores serão invalidadas na próxima requisição protegida pelo sistema de autorização.
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

function formatCpf(value: string) {
  if (value.length !== 11) {
    return value
  }
  return `${value.slice(0, 3)}.${value.slice(3, 6)}.${value.slice(6, 9)}-${value.slice(9, 11)}`
}

function formatDate(value?: string | null) {
  if (!value) {
    return 'Não informada'
  }
  return new Intl.DateTimeFormat('pt-BR').format(new Date(value))
}

function getStatusSoftBadge(status: DriverRecord['status']) {
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

function getComplianceSoftBadge(driver: DriverRecord) {
  const issues = getComplianceIssues(driver)

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
    issues.push('Parceiro ainda não homologado.')
  }

  return issues
}
