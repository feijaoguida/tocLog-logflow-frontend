'use client'

import Link from 'next/link'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertTriangle, CheckCircle2, ChevronRight, FileCheck, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'

import { MenuFunctionHeader } from '@/components/layout/menu-function-header'
import { WorkspaceInlineAlert } from '@/components/layout/workspace-inline-alert'
import { WorkspaceStateCard } from '@/components/layout/workspace-state-card'
import { useAuth } from '@/context/auth-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'
import type { Vehicle } from '@/types/fleet'

export const dynamic = 'force-dynamic'

type ChecklistExecutionRecord = {
  id: string
  type: string
  km: number
  vehicle?: {
    id: string
    plate: string
    model: string
  } | null
  items: Array<{
    id: string
    itemId: string
    name: string
    status: 'OK' | 'NOK' | 'NA'
    observation?: string | null
  }>
}

const CHECKLIST_TYPE_OPTIONS = [
  { value: 'DELIVERY', label: 'Saída / Entrega' },
  { value: 'RECEIVEMENT', label: 'Retorno / Recebimento' },
  { value: 'MAINTENANCE_EXIT', label: 'Saída p/ manutenção' },
]

export default function NewChecklistPageWrapper() {
  return (
    <Suspense fallback={<ChecklistLoadingState />}>
      <NewChecklistPageContent />
    </Suspense>
  )
}

function NewChecklistPageContent() {
  const { hasPermission } = useAuth()
  const canExecuteChecklists = hasPermission('fleet.checklists.execute')

  const router = useRouter()
  const searchParams = useSearchParams()

  const [loadingVehicles, setLoadingVehicles] = useState(true)
  const [refreshingVehicles, setRefreshingVehicles] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [vehicleCatalogError, setVehicleCatalogError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [step, setStep] = useState<1 | 2>(1)

  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [selectedVehicleId, setSelectedVehicleId] = useState(searchParams.get('vehicleId') || '')
  const [checklistType, setChecklistType] = useState('DELIVERY')

  const [executionId, setExecutionId] = useState<string | null>(null)
  const [executionData, setExecutionData] = useState<ChecklistExecutionRecord | null>(null)
  const [currentKm, setCurrentKm] = useState(0)
  const [observations, setObservations] = useState('')
  const [itemsStatus, setItemsStatus] = useState<Record<string, 'OK' | 'NOK'>>({})

  useEffect(() => {
    if (!canExecuteChecklists) {
      setLoadingVehicles(false)
      return
    }

    void loadVehicles()
  }, [canExecuteChecklists])

  async function loadVehicles(showLoadingState = true) {
    if (showLoadingState) {
      setLoadingVehicles(true)
    } else {
      setRefreshingVehicles(true)
    }

    try {
      setLoadError(null)
      setVehicleCatalogError(null)
      const { data } = await api.get<Vehicle[]>('/fleet/vehicles')
      setVehicles(data)
    } catch (error) {
      const message = getApiErrorMessage(error, 'Não foi possível carregar os veículos da frota.')
      if (showLoadingState && vehicles.length === 0) {
        setLoadError(message)
      } else {
        setVehicleCatalogError(message)
      }
      toast.error(message)
    } finally {
      if (showLoadingState) {
        setLoadingVehicles(false)
      } else {
        setRefreshingVehicles(false)
      }
    }
  }

  async function handleStartChecklist() {
    if (!selectedVehicleId) {
      toast.error('Selecione um veículo para iniciar a inspeção.')
      return
    }

    setSubmitting(true)
    try {
      const { data } = await api.post<ChecklistExecutionRecord>('/fleet/checklists/start', {
        vehicleId: selectedVehicleId,
        type: checklistType,
      })

      setExecutionId(data.id)
      setExecutionData(data)
      setCurrentKm(data.km)
      setItemsStatus(
        data.items.reduce<Record<string, 'OK' | 'NOK'>>((accumulator, item) => {
          accumulator[item.itemId] = item.status === 'NOK' ? 'NOK' : 'OK'
          return accumulator
        }, {}),
      )
      setStep(2)
      toast.success('Checklist iniciado. Continue com a inspeção.')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível iniciar o checklist.'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSubmitChecklist() {
    if (!executionId || !executionData) {
      return
    }

    if (!Number.isFinite(currentKm) || currentKm < 0) {
      toast.error('Informe uma quilometragem válida para concluir o checklist.')
      return
    }

    setSubmitting(true)
    try {
      await api.post(`/fleet/checklists/${executionId}/submit`, {
        km: Number(currentKm),
        observations: observations.trim(),
        items: executionData.items.map((item) => ({
          itemId: item.itemId,
          status: itemsStatus[item.itemId] ?? 'OK',
          observation: '',
        })),
      })
      toast.success('Checklist finalizado com sucesso.')
      router.push('/dashboard/fleet/checklists')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível concluir o checklist.'))
    } finally {
      setSubmitting(false)
    }
  }

  const selectedVehicle = useMemo(
    () => vehicles.find((vehicle) => vehicle.id === selectedVehicleId) ?? null,
    [selectedVehicleId, vehicles],
  )

  if (!canExecuteChecklists) {
    return (
      <WorkspaceStateCard title="Acesso restrito">
        <p>Este perfil não pode iniciar checklists da frota interna.</p>
      </WorkspaceStateCard>
    )
  }

  return (
    <div className="app-page">
      <MenuFunctionHeader
        title="Frota > Checklists > Novo"
        description="Fluxo guiado para iniciar e concluir um checklist operacional da frota interna."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="rounded-full px-4 py-2">
              Passo {step} de 2
            </Badge>
            <Button variant="outline" size="sm" onClick={() => void loadVehicles(false)} disabled={loadingVehicles || refreshingVehicles}>
              {refreshingVehicles ? 'Atualizando...' : 'Atualizar leitura'}
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/fleet/checklists">Voltar</Link>
            </Button>
          </div>
        }
      />

      {loadError ? (
        <WorkspaceStateCard
          title="Falha de leitura"
          tone="danger"
          actions={
            <Button variant="outline" onClick={() => void loadVehicles(false)} disabled={refreshingVehicles}>
              {refreshingVehicles ? 'Atualizando...' : 'Tentar novamente'}
            </Button>
          }
        >
          <p>{loadError}</p>
        </WorkspaceStateCard>
      ) : null}

      {step === 1 ? (
        <Card className="app-section-card max-w-2xl">
          <CardHeader>
            <CardTitle className="text-xl">Selecionar contexto</CardTitle>
            <CardDescription>
              Escolha o veículo e o tipo de checklist antes de abrir a inspeção.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingVehicles ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full rounded-xl" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            ) : (
              <>
                {vehicleCatalogError ? (
                  <WorkspaceInlineAlert
                    title="Falha ao atualizar os veículos da frota"
                    description={vehicleCatalogError}
                    hint="A última lista válida foi preservada para você continuar a inspeção sem perder o contexto."
                  />
                ) : null}
                <div className="space-y-2">
                  <Label htmlFor="vehicleId">Veículo</Label>
                  <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                    <SelectTrigger id="vehicleId">
                      <SelectValue placeholder="Selecione um veículo" />
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
                <div className="space-y-2">
                  <Label htmlFor="checklistType">Tipo do checklist</Label>
                  <Select value={checklistType} onValueChange={setChecklistType}>
                    <SelectTrigger id="checklistType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CHECKLIST_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
                  {selectedVehicle ? (
                    <>
                      <p className="font-medium text-foreground">{selectedVehicle.plate}</p>
                      <p>{selectedVehicle.model}</p>
                      <p className="mt-2">KM atual informada na frota: {selectedVehicle.currentKm.toLocaleString('pt-BR')} km</p>
                    </>
                  ) : (
                    'Selecione um veículo para revisar o contexto antes de iniciar.'
                  )}
                </div>
              </>
            )}
          </CardContent>
          <CardFooter className="justify-end">
            <Button onClick={handleStartChecklist} disabled={loadingVehicles || submitting || !selectedVehicleId}>
              {submitting ? 'Iniciando...' : 'Iniciar inspeção'}
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <Card className="app-section-card">
            <CardHeader>
              <CardTitle className="text-xl">Itens da inspeção</CardTitle>
              <CardDescription>
                Revise os itens do checklist, registre a quilometragem e finalize o fluxo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-2xl border p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                  <FileCheck className="h-4 w-4" />
                  {executionData?.vehicle?.plate || selectedVehicle?.plate || 'Veículo selecionado'}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="currentKm">Quilometragem atual</Label>
                    <Input
                      id="currentKm"
                      type="number"
                      min="0"
                      value={currentKm}
                      onChange={(event) => setCurrentKm(Number(event.target.value))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Valor de abertura: {executionData?.km?.toLocaleString('pt-BR') || 0} km
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="observations">Observações finais</Label>
                    <Textarea
                      id="observations"
                      value={observations}
                      onChange={(event) => setObservations(event.target.value)}
                      placeholder="Avarias, ressalvas ou orientações importantes."
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {executionData?.items.map((item) => {
                  const currentStatus = itemsStatus[item.itemId] ?? 'OK'

                  return (
                    <div key={item.id} className="flex flex-col gap-3 rounded-2xl border p-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          O item começa como `OK`, mas pode ser marcado como `NOK` antes do fechamento.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant={currentStatus === 'OK' ? 'default' : 'outline'}
                          className={currentStatus === 'OK' ? 'bg-green-600 hover:bg-green-700' : ''}
                          onClick={() =>
                            setItemsStatus((current) => ({ ...current, [item.itemId]: 'OK' }))
                          }
                        >
                          OK
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={currentStatus === 'NOK' ? 'destructive' : 'outline'}
                          onClick={() =>
                            setItemsStatus((current) => ({ ...current, [item.itemId]: 'NOK' }))
                          }
                        >
                          <AlertTriangle className="mr-2 h-4 w-4" />
                          NOK
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
            <CardFooter className="justify-end">
              <Button onClick={handleSubmitChecklist} disabled={submitting}>
                {submitting ? 'Finalizando...' : 'Finalizar checklist'}
                <CheckCircle2 className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>

          <Card className="app-section-card">
            <CardHeader>
              <CardTitle className="text-xl">Resumo do fluxo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="rounded-2xl border p-4">
                <p className="font-medium text-foreground">Tipo selecionado</p>
                <p>{CHECKLIST_TYPE_OPTIONS.find((option) => option.value === checklistType)?.label || checklistType}</p>
              </div>
              <div className="rounded-2xl border p-4">
                <p className="font-medium text-foreground">Itens no checklist</p>
                <p>{executionData?.items.length || 0} itens carregados para inspeção</p>
              </div>
              <div className="rounded-2xl border p-4">
                <p className="font-medium text-foreground">Impacto operacional</p>
                <p>
                  Ao finalizar, o checklist pode atualizar KM e status do veículo conforme o tipo selecionado.
                </p>
              </div>
              <div className="flex items-start gap-2 rounded-2xl border border-dashed p-4">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Este fluxo já respeita o recorte por tenant do veículo no backend e não deve abrir inspeções fora da empresa atual.
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

function ChecklistLoadingState() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-24 w-full rounded-3xl" />
      <Skeleton className="h-[420px] w-full rounded-3xl" />
    </div>
  )
}
