'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, FileWarning, Loader2, RefreshCcw, Save } from 'lucide-react'
import { toast } from 'sonner'

import { WorkspaceInlineAlert } from '@/components/layout/workspace-inline-alert'
import { WorkspaceLoadingCard } from '@/components/layout/workspace-loading-card'
import { WorkspaceStateCard } from '@/components/layout/workspace-state-card'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/context/auth-context'
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
  driver?: DriverOption | null
}

type VehicleFormState = {
  tipo: string
  placa: string
  capacidadePeso: string
  capacidadeVolume: string
  renavam: string
  bodyType: string
  documentExpiresAt: string
  notes: string
  driverId: string
}

const EMPTY_FORM: VehicleFormState = {
  tipo: 'TRUCK',
  placa: '',
  capacidadePeso: '',
  capacidadeVolume: '',
  renavam: '',
  bodyType: '',
  documentExpiresAt: '',
  notes: '',
  driverId: '',
}

type ExternalVehicleFormProps = {
  mode: 'create' | 'edit'
  vehicleId?: string
}

export function ExternalVehicleForm({ mode, vehicleId }: ExternalVehicleFormProps) {
  const router = useRouter()
  const { hasPermission } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [drivers, setDrivers] = useState<DriverOption[]>([])
  const [formData, setFormData] = useState<VehicleFormState>(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof VehicleFormState, string>>>({})
  const [loadError, setLoadError] = useState<string | null>(null)
  const [driverOptionsError, setDriverOptionsError] = useState<string | null>(null)
  const [refreshingDriverOptions, setRefreshingDriverOptions] = useState(false)
  const canManageVehicles = hasPermission('external-fleet.vehicles.manage')

  async function loadDriverOptions(currentDriver?: DriverOption | null) {
    try {
      const { data } = await api.get<DriverOption[]>('/external-fleet/vehicles/driver-options')

      if (currentDriver && !data.some((driver) => driver.id === currentDriver.id)) {
        setDrivers([currentDriver, ...data])
      } else {
        setDrivers(data)
      }

      setDriverOptionsError(null)
      return true
    } catch (error) {
      const message = getApiErrorMessage(
        error,
        'Não foi possível carregar os motoristas ativos para vínculo.',
      )
      setDriverOptionsError(message)
      setDrivers(currentDriver ? [currentDriver] : [])
      return false
    }
  }

  async function retryDriverOptions() {
    setRefreshingDriverOptions(true)
    try {
      const currentDriver =
        drivers.find((driver) => driver.id === formData.driverId) ??
        (formData.driverId ? { id: formData.driverId, nome: 'Motorista vinculado atualmente' } : null)

      const ok = await loadDriverOptions(currentDriver)

      if (ok) {
        toast.success('Opções de vínculo atualizadas com sucesso.')
      } else {
        toast.error('Ainda não foi possível atualizar os motoristas ativos para vínculo.')
      }
    } finally {
      setRefreshingDriverOptions(false)
    }
  }

  async function loadData() {
    if (!canManageVehicles) {
      setLoading(false)
      return
    }

    setLoading(true)
    setLoadError(null)
    setDriverOptionsError(null)

    try {
      const results = await Promise.allSettled([
        mode === 'edit' && vehicleId
          ? api.get<VehicleRecord>(`/external-fleet/vehicles/${vehicleId}`)
          : Promise.resolve<{ data: VehicleRecord | null }>({ data: null }),
      ])

      const [vehicleResult] = results
      let currentDriver: DriverOption | null = null

      if (vehicleResult.status === 'fulfilled' && vehicleResult.value.data) {
        const data = vehicleResult.value.data
        currentDriver = data.driver ?? null
        setFormData({
          tipo: data.tipo,
          placa: data.placa,
          capacidadePeso: String(data.capacidadePeso),
          capacidadeVolume: String(data.capacidadeVolume),
          renavam: data.renavam ?? '',
          bodyType: data.bodyType ?? '',
          documentExpiresAt: formatDateForInput(data.documentExpiresAt),
          notes: data.notes ?? '',
          driverId: data.driver?.id ?? '',
        })
      } else if (vehicleResult.status === 'rejected') {
        setLoadError(getApiErrorMessage(vehicleResult.reason, 'Não foi possível carregar o veículo parceiro.'))
        return
      }

      await loadDriverOptions(currentDriver)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!canManageVehicles) {
      setLoading(false)
      return
    }

    void loadData()
  }, [canManageVehicles, mode, vehicleId])

  function setField<Key extends keyof VehicleFormState>(key: Key, value: VehicleFormState[Key]) {
    setFormData((current) => ({ ...current, [key]: value }))
    setFieldErrors((current) => {
      if (!current[key]) {
        return current
      }

      const next = { ...current }
      delete next[key]
      return next
    })
  }

  function validateField(key: keyof VehicleFormState, value: string) {
    switch (key) {
      case 'tipo':
        return value.trim() ? '' : 'Informe o tipo operacional do veículo.'
      case 'placa':
        return value.trim().length >= 7 ? '' : 'Informe uma placa válida para o recurso parceiro.'
      case 'capacidadePeso':
        return Number(value) > 0 ? '' : 'Informe uma capacidade de peso maior que zero.'
      case 'capacidadeVolume':
        return Number(value) > 0 ? '' : 'Informe uma capacidade de volume maior que zero.'
      default:
        return ''
    }
  }

  function handleBlur(key: keyof VehicleFormState) {
    const error = validateField(key, formData[key])

    setFieldErrors((current) => {
      if (!error) {
        if (!current[key]) {
          return current
        }

        const next = { ...current }
        delete next[key]
        return next
      }

      return { ...current, [key]: error }
    })
  }

  function validateForm() {
    const nextErrors: Partial<Record<keyof VehicleFormState, string>> = {}

    ;(['tipo', 'placa', 'capacidadePeso', 'capacidadeVolume'] as const).forEach((field) => {
      const error = validateField(field, formData[field])
      if (error) {
        nextErrors[field] = error
      }
    })

    setFieldErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleSave() {
    if (!validateForm()) {
      toast.error('Revise os campos destacados antes de salvar o veículo parceiro.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        tipo: formData.tipo,
        placa: formData.placa,
        capacidadePeso: Number(formData.capacidadePeso),
        capacidadeVolume: Number(formData.capacidadeVolume),
        renavam: formData.renavam || undefined,
        bodyType: formData.bodyType || undefined,
        documentExpiresAt: formData.documentExpiresAt || undefined,
        notes: formData.notes || undefined,
        driverId: formData.driverId || undefined,
      }

      if (mode === 'edit' && vehicleId) {
        await api.patch(`/external-fleet/vehicles/${vehicleId}`, payload)
        toast.success('Veículo parceiro atualizado com sucesso.')
      } else {
        await api.post('/external-fleet/vehicles', payload)
        toast.success('Veículo parceiro criado com sucesso.')
      }

      router.push('/dashboard/external-fleet/vehicles')
      router.refresh()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível salvar o veículo parceiro.'))
    } finally {
      setSaving(false)
    }
  }

  if (!canManageVehicles) {
    return (
      <div className="app-page">
        <WorkspaceStateCard
          title="Acesso restrito"
          actions={
            <Button asChild variant="outline">
              <Link href="/dashboard/external-fleet/vehicles">Voltar para a listagem</Link>
            </Button>
          }
        >
          <p>Este perfil não pode criar ou editar veículos parceiros.</p>
        </WorkspaceStateCard>
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
              <Button onClick={() => void loadData()}>Atualizar leitura</Button>
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

  return (
    <div className="app-page">
      <section className="app-page-header theme-surface">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <Button asChild variant="outline" size="sm" className="w-fit">
              <Link href="/dashboard/external-fleet/vehicles">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar para veículos
              </Link>
            </Button>
            <div className="space-y-2">
              <p className="app-kicker">Frota Externa</p>
              <h1 className="app-title">
                {mode === 'edit' ? 'Editar veículo parceiro' : 'Novo veículo parceiro'}
              </h1>
              <p className="app-subtitle">
                Revise identificação, capacidade, compliance documental e vínculo operacional do recurso parceiro em uma página dedicada.
              </p>
            </div>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button asChild variant="outline">
              <Link href="/dashboard/external-fleet/vehicles">Cancelar</Link>
            </Button>
            <Button onClick={() => void handleSave()} disabled={saving || loading}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {saving ? 'Salvando...' : 'Salvar veículo'}
            </Button>
          </div>
        </div>
      </section>

      {loading ? (
        <WorkspaceLoadingCard message="Carregando dados do veículo parceiro..." />
      ) : (
        <>
          <Card className="app-section-card">
            <CardHeader>
              <CardTitle className="text-xl">Dados operacionais</CardTitle>
              <CardDescription>
                Identificação, categoria e capacidade base do recurso parceiro.
              </CardDescription>
            </CardHeader>
            <CardContent className="app-form-grid">
              <div className="field-stack">
                <Label htmlFor="vehicle-type">Tipo</Label>
                <Input
                  id="vehicle-type"
                  value={formData.tipo}
                  onChange={(event) => setField('tipo', event.target.value.toUpperCase())}
                  onBlur={() => handleBlur('tipo')}
                  placeholder="TRUCK / VAN / MOTO"
                  aria-invalid={Boolean(fieldErrors.tipo)}
                />
                <FieldError message={fieldErrors.tipo} />
              </div>
              <div className="field-stack">
                <Label htmlFor="vehicle-plate">Placa</Label>
                <Input
                  id="vehicle-plate"
                  value={formData.placa}
                  onChange={(event) => setField('placa', normalizeVehiclePlate(event.target.value))}
                  onBlur={() => handleBlur('placa')}
                  placeholder="ABC-1234"
                  aria-invalid={Boolean(fieldErrors.placa)}
                />
                <p className="text-xs text-muted-foreground">
                  O sistema normaliza a placa para letras e números, sem depender de hífen ou espaço.
                </p>
                <FieldError message={fieldErrors.placa} />
              </div>
              <div className="field-stack">
                <Label htmlFor="vehicle-body-type">Carroceria</Label>
                <Input
                  id="vehicle-body-type"
                  value={formData.bodyType}
                  onChange={(event) => setField('bodyType', event.target.value.toUpperCase())}
                  placeholder="BAU / SIDER / GRANELEIRO"
                />
              </div>
              <div className="field-stack">
                <Label htmlFor="vehicle-renavam">RENAVAM</Label>
                <Input
                  id="vehicle-renavam"
                  value={formData.renavam}
                  onChange={(event) => setField('renavam', event.target.value)}
                  placeholder="12345678901"
                />
              </div>
              <div className="field-stack">
                <Label htmlFor="vehicle-weight">Capacidade de peso (kg)</Label>
                <Input
                  id="vehicle-weight"
                  type="number"
                  value={formData.capacidadePeso}
                  onChange={(event) => setField('capacidadePeso', event.target.value)}
                  onBlur={() => handleBlur('capacidadePeso')}
                  aria-invalid={Boolean(fieldErrors.capacidadePeso)}
                />
                <FieldError message={fieldErrors.capacidadePeso} />
              </div>
              <div className="field-stack">
                <Label htmlFor="vehicle-volume">Capacidade de volume (m³)</Label>
                <Input
                  id="vehicle-volume"
                  type="number"
                  value={formData.capacidadeVolume}
                  onChange={(event) => setField('capacidadeVolume', event.target.value)}
                  onBlur={() => handleBlur('capacidadeVolume')}
                  aria-invalid={Boolean(fieldErrors.capacidadeVolume)}
                />
                <FieldError message={fieldErrors.capacidadeVolume} />
              </div>
            </CardContent>
          </Card>

          <Card className="app-section-card">
            <CardHeader>
              <CardTitle className="text-xl">Compliance documental</CardTitle>
              <CardDescription>
                Esses dados sustentam os bloqueios configuráveis de validade documental na alocação.
              </CardDescription>
            </CardHeader>
            <CardContent className="app-form-grid">
              <div className="field-stack">
                <Label htmlFor="vehicle-doc-expiry">Validade documental</Label>
                <Input
                  id="vehicle-doc-expiry"
                  type="date"
                  value={formData.documentExpiresAt}
                  onChange={(event) => setField('documentExpiresAt', event.target.value)}
                />
              </div>
              <div className="field-stack">
                <Label>Motorista vinculado</Label>
                <Select
                  value={formData.driverId || 'none'}
                  onValueChange={(value) => setField('driverId', value === 'none' ? '' : value)}
                  disabled={Boolean(driverOptionsError) && drivers.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um motorista parceiro ativo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem vínculo inicial</SelectItem>
                    {drivers.map((driver) => (
                      <SelectItem key={driver.id} value={driver.id}>
                        {driver.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Só aparecem motoristas parceiros ativos da mesma empresa. O backend também rejeita vínculo manual fora dessa regra.
                </p>
                {driverOptionsError ? (
                  <div className="space-y-3">
                    <WorkspaceInlineAlert
                      className="px-3 py-3 text-xs"
                      title="Falha ao atualizar opções de vínculo"
                      description={driverOptionsError}
                      hint={
                        drivers.length > 0
                          ? 'O vínculo atual foi preservado, mas a lista completa de motoristas ativos precisa ser recarregada antes de trocar esse relacionamento.'
                          : 'Você ainda pode salvar o veículo sem vínculo inicial e tentar atualizar a lista de motoristas depois.'
                      }
                    />
                    <div className="mt-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void retryDriverOptions()}
                        disabled={refreshingDriverOptions}
                      >
                        {refreshingDriverOptions ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCcw className="mr-2 h-4 w-4" />
                        )}
                        {refreshingDriverOptions ? 'Atualizando opções...' : 'Atualizar opções de vínculo'}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card className="app-section-card">
            <CardHeader>
              <CardTitle className="text-xl">Observações internas</CardTitle>
              <CardDescription>
                Registre pendências documentais, particularidades do recurso e restrições relevantes para a governança do parceiro.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="field-stack">
                <Label htmlFor="vehicle-notes">Observações</Label>
                <Textarea
                  id="vehicle-notes"
                  value={formData.notes}
                  onChange={(event) => setField('notes', event.target.value)}
                  placeholder="Pendências documentais, particularidades do baú, restrições de operação..."
                  rows={5}
                />
              </div>
              <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <FileWarning className="mt-0.5 h-4 w-4" />
                  <p>
                    A governança do veículo continua separada da operação. A alocação acontece em `Cargas e Rotas`, consumindo essas validações conforme a política de `shipments`.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

function formatDateForInput(value?: string | null) {
  if (!value) {
    return ''
  }

  return new Date(value).toISOString().slice(0, 10)
}

function normalizeVehiclePlate(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null
  }

  return <p className="text-xs text-destructive">{message}</p>
}
