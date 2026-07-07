'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Calendar, Plus, ShieldAlert, Wrench } from 'lucide-react'
import { toast } from 'sonner'

import { MenuFunctionHeader } from '@/components/layout/menu-function-header'
import { WorkspaceInlineAlert } from '@/components/layout/workspace-inline-alert'
import { WorkspaceStateCard } from '@/components/layout/workspace-state-card'
import { useAuth } from '@/context/auth-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'
import type { Vehicle } from '@/types/fleet'

type MaintenanceRecord = {
  id: string
  type: 'PREVENTIVE' | 'CORRECTIVE'
  origin: 'INTERNAL' | 'EXTERNAL'
  description: string
  scheduledDate: string
  executionDate?: string | null
  completionDate?: string | null
  estimatedCost?: number | null
  finalCost?: number | null
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  vehicle: Pick<Vehicle, 'id' | 'plate' | 'model'>
}

const STATUS_BADGE: Record<
  MaintenanceRecord['status'],
  { label: string; className: string }
> = {
  SCHEDULED: { label: 'Agendada', className: 'bg-muted text-foreground' },
  IN_PROGRESS: { label: 'Em andamento', className: 'bg-sky-600' },
  COMPLETED: { label: 'Concluída', className: 'bg-green-600' },
  CANCELLED: { label: 'Cancelada', className: 'bg-destructive text-destructive-foreground' },
}

const TYPE_LABEL: Record<MaintenanceRecord['type'], string> = {
  PREVENTIVE: 'Preventiva',
  CORRECTIVE: 'Corretiva',
}

export default function MaintenancePage() {
  const { hasPermission } = useAuth()
  const canViewMaintenance = hasPermission('fleet.maintenance.view')
  const canManageMaintenance = hasPermission('fleet.maintenance.manage')

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [maintenancesLoadError, setMaintenancesLoadError] = useState<string | null>(null)
  const [vehiclesLoadError, setVehiclesLoadError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [maintenances, setMaintenances] = useState<MaintenanceRecord[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])

  const [vehicleId, setVehicleId] = useState('')
  const [type, setType] = useState<MaintenanceRecord['type']>('PREVENTIVE')
  const [origin, setOrigin] = useState<MaintenanceRecord['origin']>('EXTERNAL')
  const [description, setDescription] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [estimatedCost, setEstimatedCost] = useState('')

  useEffect(() => {
    if (!canViewMaintenance) {
      setLoading(false)
      return
    }

    void loadData()
  }, [canViewMaintenance])

  async function loadData(showLoadingState = true) {
    if (showLoadingState) {
      setLoading(true)
    } else {
      setRefreshing(true)
    }

    try {
      setLoadError(null)
      const maintenancesRequest = api.get<MaintenanceRecord[]>('/fleet/maintenance')
      const vehiclesRequest = canManageMaintenance
        ? api.get<Vehicle[]>('/fleet/vehicles')
        : Promise.resolve<{ data: Vehicle[] }>({ data: [] })

      const [maintenancesRes, vehiclesRes] = await Promise.allSettled([
        maintenancesRequest,
        vehiclesRequest,
      ])

      const partialFailures: string[] = []

      if (maintenancesRes.status === 'fulfilled') {
        setMaintenances(maintenancesRes.value.data)
        setMaintenancesLoadError(null)
      } else {
        const message = getApiErrorMessage(
          maintenancesRes.reason,
          'Não foi possível carregar a agenda de manutenções da frota.',
        )
        setMaintenancesLoadError(message)
        partialFailures.push('agenda')
      }

      if (vehiclesRes.status === 'fulfilled') {
        setVehicles(vehiclesRes.value.data)
        setVehiclesLoadError(null)
      } else {
        const message = getApiErrorMessage(
          vehiclesRes.reason,
          'Não foi possível carregar os veículos elegíveis para manutenção.',
        )
        setVehiclesLoadError(message)
        partialFailures.push('veículos')
      }

      if (partialFailures.length === 2) {
        const message = 'Não foi possível carregar a agenda nem os veículos da manutenção.'
        setLoadError(message)
        toast.error(message)
        return
      }

      if (partialFailures.length > 0) {
        toast.error(
          `Leitura parcial concluída. Revise o bloco de ${partialFailures.join(', ')} antes de seguir na agenda de manutenção.`,
        )
      }
    } finally {
      if (showLoadingState) {
        setLoading(false)
      } else {
        setRefreshing(false)
      }
    }
  }

  async function handleCreateMaintenance(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!vehicleId) {
      toast.error('Selecione um veículo para agendar a manutenção.')
      return
    }

    if (!description.trim()) {
      toast.error('Informe a descrição do serviço planejado.')
      return
    }

    if (!scheduledDate) {
      toast.error('Informe a data agendada da manutenção.')
      return
    }

    if (estimatedCost && Number(estimatedCost) < 0) {
      toast.error('O custo estimado não pode ser negativo.')
      return
    }

    setSubmitting(true)
    try {
      await api.post('/fleet/maintenance', {
        vehicleId,
        type,
        origin,
        description: description.trim(),
        scheduledDate: new Date(scheduledDate).toISOString(),
        estimatedCost: estimatedCost ? Number(estimatedCost) : undefined,
      })
      toast.success('Manutenção agendada com sucesso.')
      setOpen(false)
      resetForm()
      await loadData(false)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível agendar a manutenção.'))
    } finally {
      setSubmitting(false)
    }
  }

  function resetForm() {
    setVehicleId('')
    setType('PREVENTIVE')
    setOrigin('EXTERNAL')
    setDescription('')
    setScheduledDate('')
    setEstimatedCost('')
  }

  const scheduledCount = maintenances.filter((item) => item.status === 'SCHEDULED').length
  const inProgressCount = maintenances.filter((item) => item.status === 'IN_PROGRESS').length
  const totalEstimatedCost = useMemo(
    () =>
      maintenances.reduce((sum, item) => sum + Number(item.estimatedCost ?? item.finalCost ?? 0), 0),
    [maintenances],
  )
  const hasPartialLoadIssue = !loadError && Boolean(maintenancesLoadError || vehiclesLoadError)

  return (
    <div className="app-page">
      <MenuFunctionHeader
        title="Frota > Manutenções"
        description="Agenda e histórico de manutenção da frota interna, com apoio ao bloqueio operacional dos veículos quando necessário."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {canManageMaintenance ? (
              <Dialog
                open={open}
                onOpenChange={(nextOpen) => {
                  setOpen(nextOpen)
                  if (!nextOpen) {
                    resetForm()
                  }
                }}
              >
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Nova manutenção
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[560px]">
                  <DialogHeader>
                    <DialogTitle>Agendar manutenção</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateMaintenance} className="space-y-4">
                    {vehiclesLoadError ? (
                      <WorkspaceInlineAlert
                        title="Falha ao atualizar os veículos elegíveis"
                        description={vehiclesLoadError}
                        hint="A agenda continua disponível, mas o cadastro de nova manutenção depende do recarregamento dessa lista."
                      />
                    ) : null}
                    <div className="space-y-2">
                      <Label htmlFor="vehicleId">Veículo</Label>
                      <Select value={vehicleId} onValueChange={setVehicleId}>
                        <SelectTrigger id="vehicleId" disabled={Boolean(vehiclesLoadError)}>
                          <SelectValue placeholder="Selecione o veículo" />
                        </SelectTrigger>
                        <SelectContent>
                          {vehicles.map((vehicle) => (
                            <SelectItem key={vehicle.id} value={vehicle.id}>
                              {vehicle.plate} • {vehicle.model}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="type">Tipo</Label>
                        <Select value={type} onValueChange={(value) => setType(value as MaintenanceRecord['type'])}>
                          <SelectTrigger id="type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PREVENTIVE">Preventiva</SelectItem>
                            <SelectItem value="CORRECTIVE">Corretiva</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="origin">Origem</Label>
                        <Select value={origin} onValueChange={(value) => setOrigin(value as MaintenanceRecord['origin'])}>
                          <SelectTrigger id="origin">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="INTERNAL">Interna</SelectItem>
                            <SelectItem value="EXTERNAL">Externa</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Descrição</Label>
                      <Textarea
                        id="description"
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        placeholder="Ex: troca de óleo, freios, alinhamento, correção elétrica."
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="scheduledDate">Data agendada</Label>
                        <Input
                          id="scheduledDate"
                          type="datetime-local"
                          value={scheduledDate}
                          onChange={(event) => setScheduledDate(event.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="estimatedCost">Custo estimado</Label>
                        <Input
                          id="estimatedCost"
                          type="number"
                          min="0"
                          step="0.01"
                          value={estimatedCost}
                          onChange={(event) => setEstimatedCost(event.target.value)}
                          placeholder="0,00"
                        />
                      </div>
                    </div>

                    <DialogFooter>
                      <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={submitting}>
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={submitting || Boolean(vehiclesLoadError)}>
                        {submitting ? 'Salvando...' : 'Agendar manutenção'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            ) : (
              <Badge variant="outline" className="rounded-full px-4 py-2">
                Modo leitura
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={() => void loadData(false)} disabled={loading || refreshing}>
              {refreshing ? 'Atualizando...' : 'Atualizar leitura'}
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/fleet">Veículos</Link>
            </Button>
          </div>
        }
      />

      {!canViewMaintenance ? (
        <WorkspaceStateCard title="Acesso restrito">
          <p>Este perfil não pode visualizar o histórico de manutenções da frota.</p>
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

          {hasPartialLoadIssue ? (
            <WorkspaceStateCard title="Leitura parcial" tone="warning">
              <p>
                A tela conseguiu aproveitar parte dos dados já carregados, mas um dos blocos da
                manutenção falhou nesta atualização.
              </p>
              <p>
                Revise os avisos da agenda e do cadastro de nova manutenção antes de concluir que
                toda a área está indisponível.
              </p>
            </WorkspaceStateCard>
          ) : null}

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="app-section-card">
              <CardHeader>
                <CardDescription>Total monitorado</CardDescription>
                <CardTitle className="text-3xl">{maintenances.length}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="app-section-card">
              <CardHeader>
                <CardDescription>Agenda ativa</CardDescription>
                <CardTitle className="text-3xl">
                  {scheduledCount} <span className="text-base text-muted-foreground">agendadas</span>
                </CardTitle>
                <CardDescription>{inProgressCount} em andamento</CardDescription>
              </CardHeader>
            </Card>
            <Card className="app-section-card">
              <CardHeader>
                <CardDescription>Custo previsto</CardDescription>
                <CardTitle className="text-3xl">
                  R$ {totalEstimatedCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card className="app-section-card">
            <CardHeader>
              <CardTitle className="text-xl">Histórico e agenda</CardTitle>
              <CardDescription>
                Manutenções preventivas e corretivas que impactam a elegibilidade da frota.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {maintenancesLoadError ? (
                <WorkspaceInlineAlert
                  className="mb-4"
                  title="Falha ao atualizar a agenda de manutenções"
                  description={maintenancesLoadError}
                  hint="A última agenda válida foi preservada para manter a leitura operacional disponível."
                />
              ) : null}
              <div className="rounded-2xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Veículo</TableHead>
                      <TableHead>Serviço</TableHead>
                      <TableHead>Janela</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Custo</TableHead>
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
                      : maintenances.length === 0
                        ? (
                          <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                              Nenhuma manutenção registrada para a frota visível neste tenant.
                            </TableCell>
                          </TableRow>
                          )
                        : maintenances.map((maintenance) => {
                            const statusBadge = STATUS_BADGE[maintenance.status]

                            return (
                              <TableRow key={maintenance.id}>
                                <TableCell>
                                  <div className="font-medium">{maintenance.vehicle.plate}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {maintenance.vehicle.model}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="font-medium">{maintenance.description}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {TYPE_LABEL[maintenance.type]} • {maintenance.origin === 'INTERNAL' ? 'Origem interna' : 'Fornecedor externo'}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="text-sm">
                                    {new Date(maintenance.scheduledDate).toLocaleDateString('pt-BR')}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {new Date(maintenance.scheduledDate).toLocaleTimeString('pt-BR', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge className={statusBadge.className}>{statusBadge.label}</Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  {maintenance.finalCost != null
                                    ? `R$ ${Number(maintenance.finalCost).toLocaleString('pt-BR', {
                                        minimumFractionDigits: 2,
                                      })}`
                                    : maintenance.estimatedCost != null
                                      ? `Est. R$ ${Number(maintenance.estimatedCost).toLocaleString('pt-BR', {
                                          minimumFractionDigits: 2,
                                        })}`
                                      : '-'}
                                </TableCell>
                              </TableRow>
                            )
                          })}
                  </TableBody>
                </Table>
              </div>

              {!canManageMaintenance ? (
                <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <ShieldAlert className="h-4 w-4" />
                  Este perfil acompanha agenda e histórico, mas não abre novas manutenções.
                </div>
              ) : null}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
