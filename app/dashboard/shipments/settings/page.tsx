'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { MenuFunctionHeader } from '@/components/layout/menu-function-header'
import { WorkspaceStateCard } from '@/components/layout/workspace-state-card'
import { useAuth } from '@/context/auth-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'

type LogisticsSettingsRecord = {
  fleetSettings: {
    blockVehicleWithoutChecklist: boolean
    blockVehicleWithExpiredMaintenance: boolean
    blockVehicleWithExpiredDocument: boolean
  }
  externalFleetSettings: {
    blockPendingExternalVehicle: boolean
    blockVehicleWithExpiredDocument: boolean
    blockPendingExternalDriver: boolean
    blockUnavailableExternalDriver: boolean
    blockDriverWithExpiredDocument: boolean
    requireRntrcActive: boolean
  }
  routeSettings: {
    requireAllVolumesBeforeDispatch: boolean
    allowManualAllocation: boolean
    allowDivergentCargoWithoutApproval: boolean
    requireFiscalDocumentBeforeDispatch: boolean
    requireRecipientBeforeDispatch: boolean
  }
  deliverySettings: {
    requireDeliveryPhoto: boolean
    requireDeliverySignature: boolean
    requireReceiverName: boolean
    requireReceiverDocument: boolean
    requireDeliveryGeolocation: boolean
    requireOccurrencePhoto: boolean
    allowDeliveryOutsideRadius: boolean
    maxCheckinRadiusMeters: number
    allowOfflineCompletion: boolean
  }
  integrationSettings: {
    useEventQueue: boolean
    maxRetries: number
    timeoutMs: number
    detailedLogsEnabled: boolean
    allowAsyncFallback: boolean
  }
}

const EMPTY_SETTINGS: LogisticsSettingsRecord = {
  fleetSettings: {
    blockVehicleWithoutChecklist: true,
    blockVehicleWithExpiredMaintenance: true,
    blockVehicleWithExpiredDocument: true,
  },
  externalFleetSettings: {
    blockPendingExternalVehicle: true,
    blockVehicleWithExpiredDocument: true,
    blockPendingExternalDriver: true,
    blockUnavailableExternalDriver: true,
    blockDriverWithExpiredDocument: true,
    requireRntrcActive: true,
  },
  routeSettings: {
    requireAllVolumesBeforeDispatch: true,
    allowManualAllocation: true,
    allowDivergentCargoWithoutApproval: false,
    requireFiscalDocumentBeforeDispatch: true,
    requireRecipientBeforeDispatch: true,
  },
  deliverySettings: {
    requireDeliveryPhoto: true,
    requireDeliverySignature: true,
    requireReceiverName: true,
    requireReceiverDocument: false,
    requireDeliveryGeolocation: true,
    requireOccurrencePhoto: true,
    allowDeliveryOutsideRadius: false,
    maxCheckinRadiusMeters: 200,
    allowOfflineCompletion: true,
  },
  integrationSettings: {
    useEventQueue: true,
    maxRetries: 3,
    timeoutMs: 10000,
    detailedLogsEnabled: true,
    allowAsyncFallback: true,
  },
}

export default function ShipmentsSettingsPage() {
  const { hasPermission } = useAuth()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<LogisticsSettingsRecord>(EMPTY_SETTINGS)
  const canManageSettings = hasPermission('shipments.settings.manage')
  const offlineQueueReady =
    settings.deliverySettings.allowOfflineCompletion &&
    settings.integrationSettings.allowAsyncFallback

  useEffect(() => {
    if (!canManageSettings) {
      setLoading(false)
      return
    }

    void loadSettings()
  }, [canManageSettings])

  async function loadSettings(showLoadingState = true) {
    if (showLoadingState) {
      setLoading(true)
    } else {
      setRefreshing(true)
    }

    try {
      setLoadError(null)
      const { data } = await api.get<LogisticsSettingsRecord>('/shipments/settings')
      setSettings({
        ...EMPTY_SETTINGS,
        ...data,
        fleetSettings: { ...EMPTY_SETTINGS.fleetSettings, ...(data.fleetSettings || {}) },
        externalFleetSettings: {
          ...EMPTY_SETTINGS.externalFleetSettings,
          ...(data.externalFleetSettings || {}),
        },
        routeSettings: { ...EMPTY_SETTINGS.routeSettings, ...(data.routeSettings || {}) },
        deliverySettings: {
          ...EMPTY_SETTINGS.deliverySettings,
          ...(data.deliverySettings || {}),
        },
        integrationSettings: {
          ...EMPTY_SETTINGS.integrationSettings,
          ...(data.integrationSettings || {}),
        },
      })
    } catch (error) {
      const message = getApiErrorMessage(error, 'Não foi possível carregar as configurações de shipments.')
      setLoadError(message)
      toast.error(message)
    } finally {
      if (showLoadingState) {
        setLoading(false)
      } else {
        setRefreshing(false)
      }
    }
  }

  async function handleSave() {
    if (
      !Number.isFinite(settings.deliverySettings.maxCheckinRadiusMeters) ||
      settings.deliverySettings.maxCheckinRadiusMeters < 0
    ) {
      toast.error('Informe um raio máximo de check-in/check-out válido maior ou igual a zero.')
      return
    }

    if (
      !Number.isFinite(settings.integrationSettings.maxRetries) ||
      settings.integrationSettings.maxRetries < 0
    ) {
      toast.error('Informe um máximo de retries válido maior ou igual a zero.')
      return
    }

    if (
      !Number.isFinite(settings.integrationSettings.timeoutMs) ||
      settings.integrationSettings.timeoutMs <= 0
    ) {
      toast.error('Informe um timeout padrão válido maior que zero.')
      return
    }

    setSaving(true)
    try {
      await api.post('/shipments/settings', settings)
      toast.success('Configurações operacionais atualizadas com sucesso.')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível salvar as configurações operacionais.'))
    } finally {
      setSaving(false)
    }
  }

  function setFleetSetting<Key extends keyof LogisticsSettingsRecord['fleetSettings']>(
    key: Key,
    value: LogisticsSettingsRecord['fleetSettings'][Key],
  ) {
    setSettings((current) => ({
      ...current,
      fleetSettings: { ...current.fleetSettings, [key]: value },
    }))
  }

  function setExternalFleetSetting<Key extends keyof LogisticsSettingsRecord['externalFleetSettings']>(
    key: Key,
    value: LogisticsSettingsRecord['externalFleetSettings'][Key],
  ) {
    setSettings((current) => ({
      ...current,
      externalFleetSettings: { ...current.externalFleetSettings, [key]: value },
    }))
  }

  function setRouteSetting<Key extends keyof LogisticsSettingsRecord['routeSettings']>(
    key: Key,
    value: LogisticsSettingsRecord['routeSettings'][Key],
  ) {
    setSettings((current) => ({
      ...current,
      routeSettings: { ...current.routeSettings, [key]: value },
    }))
  }

  function setDeliverySetting<Key extends keyof LogisticsSettingsRecord['deliverySettings']>(
    key: Key,
    value: LogisticsSettingsRecord['deliverySettings'][Key],
  ) {
    setSettings((current) => ({
      ...current,
      deliverySettings: { ...current.deliverySettings, [key]: value },
    }))
  }

  function setIntegrationSetting<Key extends keyof LogisticsSettingsRecord['integrationSettings']>(
    key: Key,
    value: LogisticsSettingsRecord['integrationSettings'][Key],
  ) {
    setSettings((current) => ({
      ...current,
      integrationSettings: { ...current.integrationSettings, [key]: value },
    }))
  }

  function renderBooleanField(
    label: string,
    description: string,
    checked: boolean,
    onCheckedChange: (value: boolean) => void,
  ) {
    return (
      <div className="flex items-start justify-between gap-4 rounded-2xl border p-4">
        <div className="space-y-1">
          <p className="font-medium">{label}</p>
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        <Switch checked={checked} onCheckedChange={onCheckedChange} />
      </div>
    )
  }

  function renderOfflineQueueSummary(context: 'delivery' | 'integration') {
    const deliveryEnabled = settings.deliverySettings.allowOfflineCompletion
    const integrationEnabled = settings.integrationSettings.allowAsyncFallback

    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <p className="font-medium text-amber-950 dark:text-amber-200">
              Fila offline do motorista
            </p>
            <p className="text-sm leading-6 text-amber-950/80 dark:text-amber-100/80">
              O replay offline do app só fica operacional quando
              {' '}
              <strong>Permitir baixa offline</strong>
              {' '}
              e
              {' '}
              <strong>Permitir fallback assíncrono</strong>
              {' '}
              estiverem ligados juntos.
            </p>
          </div>
          <Badge variant={offlineQueueReady ? 'success' : 'warning'} className="self-start">
            {offlineQueueReady ? 'Fila operacional ativa' : 'Fila operacional inativa'}
          </Badge>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-amber-500/20 bg-background/80 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-amber-950/70 dark:text-amber-100/70">
              Baixa offline
            </p>
            <p className="mt-2 text-sm text-foreground">
              {deliveryEnabled ? 'Ligada na política de entrega.' : 'Desligada na política de entrega.'}
            </p>
          </div>
          <div className="rounded-2xl border border-amber-500/20 bg-background/80 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-amber-950/70 dark:text-amber-100/70">
              Fallback assíncrono
            </p>
            <p className="mt-2 text-sm text-foreground">
              {integrationEnabled ? 'Ligado na política de integração.' : 'Desligado na política de integração.'}
            </p>
          </div>
        </div>

        <p className="mt-4 text-sm leading-6 text-amber-950/80 dark:text-amber-100/80">
          {offlineQueueReady
            ? 'Com as duas políticas alinhadas, o app do motorista passa a aceitar fallback offline normal, exibindo pendências, último erro e replay posterior.'
            : context === 'delivery'
              ? 'Se quiser liberar o replay offline, mantenha esta política ligada e revise também `Permitir fallback assíncrono` na aba de integração.'
              : 'Se quiser liberar o replay offline, mantenha esta política ligada e revise também `Permitir baixa offline` na aba de entrega.'}
          {' '}
          Em desenvolvimento, `EXPO_PUBLIC_DRIVER_OFFLINE_QUEUE=true` ainda pode servir como override local de teste.
        </p>
      </div>
    )
  }

  return (
    <div className="app-page">
      <MenuFunctionHeader
        title="Cargas e Rotas > Configurações"
        description="Governança operacional do domínio shipments, com regras por empresa para alocação, entrega e integração."
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="rounded-full px-4 py-2">
              Governança por empresa
            </Badge>
            <Button variant="outline" size="sm" onClick={() => void loadSettings(false)} disabled={loading || refreshing}>
              {refreshing ? 'Atualizando...' : 'Atualizar leitura'}
            </Button>
          </div>
        }
      />

      {!canManageSettings ? (
        <WorkspaceStateCard title="Acesso restrito">
          <p>Este perfil não pode gerenciar as configurações operacionais de `shipments`.</p>
        </WorkspaceStateCard>
      ) : (
        <>
      {loadError ? (
        <WorkspaceStateCard
          title="Falha de leitura"
          tone="danger"
          actions={
            <Button variant="outline" onClick={() => void loadSettings(false)} disabled={refreshing}>
              {refreshing ? 'Atualizando...' : 'Tentar novamente'}
            </Button>
          }
        >
          <p>{loadError}</p>
        </WorkspaceStateCard>
      ) : null}

      <Tabs defaultValue="fleet" className="space-y-6">
        <TabsList className="grid w-full max-w-[880px] grid-cols-5">
          <TabsTrigger value="fleet">Frota interna</TabsTrigger>
          <TabsTrigger value="external">Frota externa</TabsTrigger>
          <TabsTrigger value="route">Rotas</TabsTrigger>
          <TabsTrigger value="delivery">Entrega</TabsTrigger>
          <TabsTrigger value="integration">Integração</TabsTrigger>
        </TabsList>

        <TabsContent value="fleet">
          <Card className="app-section-card">
            <CardHeader>
              <CardTitle className="text-xl">Regras da frota interna</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-24 w-full rounded-2xl" />
                ))
              ) : (
                <>
                  {renderBooleanField(
                    'Bloquear veículo sem checklist',
                    'Impede alocação quando não há checklist de saída finalizado.',
                    settings.fleetSettings.blockVehicleWithoutChecklist,
                    (value) => setFleetSetting('blockVehicleWithoutChecklist', value),
                  )}
                  {renderBooleanField(
                    'Bloquear manutenção vencida ou em andamento',
                    'Usa o calendário de manutenção para barrar o veículo em rotas.',
                    settings.fleetSettings.blockVehicleWithExpiredMaintenance,
                    (value) => setFleetSetting('blockVehicleWithExpiredMaintenance', value),
                  )}
                  {renderBooleanField(
                    'Bloquear veículo com documento vencido',
                    'Preparado para a camada documental do veículo interno.',
                    settings.fleetSettings.blockVehicleWithExpiredDocument,
                    (value) => setFleetSetting('blockVehicleWithExpiredDocument', value),
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="external">
          <Card className="app-section-card">
            <CardHeader>
              <CardTitle className="text-xl">Regras da frota externa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-24 w-full rounded-2xl" />
                ))
              ) : (
                <>
                  {renderBooleanField(
                    'Bloquear veículo externo pendente',
                    'Impede uso de veículo parceiro que ainda não foi aprovado.',
                    settings.externalFleetSettings.blockPendingExternalVehicle,
                    (value) => setExternalFleetSetting('blockPendingExternalVehicle', value),
                  )}
                  {renderBooleanField(
                    'Bloquear documento vencido do veículo',
                    'Barra alocação quando a validade documental do veículo parceiro estiver vencida.',
                    settings.externalFleetSettings.blockVehicleWithExpiredDocument,
                    (value) => setExternalFleetSetting('blockVehicleWithExpiredDocument', value),
                  )}
                  {renderBooleanField(
                    'Bloquear motorista externo pendente',
                    'Impede uso de motorista parceiro fora do status ATIVO.',
                    settings.externalFleetSettings.blockPendingExternalDriver,
                    (value) => setExternalFleetSetting('blockPendingExternalDriver', value),
                  )}
                  {renderBooleanField(
                    'Bloquear motorista indisponível',
                    'Exige disponibilidade registrada como AVAILABLE para receber rota.',
                    settings.externalFleetSettings.blockUnavailableExternalDriver,
                    (value) => setExternalFleetSetting('blockUnavailableExternalDriver', value),
                  )}
                  {renderBooleanField(
                    'Bloquear CNH vencida',
                    'Barra alocação quando a validade da CNH do parceiro estiver vencida.',
                    settings.externalFleetSettings.blockDriverWithExpiredDocument,
                    (value) => setExternalFleetSetting('blockDriverWithExpiredDocument', value),
                  )}
                  {renderBooleanField(
                    'Exigir RNTRC ativo',
                    'Exige RNTRC informado, ativo e dentro da validade para o parceiro receber rota.',
                    settings.externalFleetSettings.requireRntrcActive,
                    (value) => setExternalFleetSetting('requireRntrcActive', value),
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="route">
          <Card className="app-section-card">
            <CardHeader>
              <CardTitle className="text-xl">Políticas de rota</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="h-24 w-full rounded-2xl" />
                ))
              ) : (
                <>
                  {renderBooleanField(
                    'Exigir volumes conferidos antes do despacho',
                    'Barra a rota quando a carga ainda não está pronta para saída.',
                    settings.routeSettings.requireAllVolumesBeforeDispatch,
                    (value) => setRouteSetting('requireAllVolumesBeforeDispatch', value),
                  )}
                  {renderBooleanField(
                    'Permitir alocação manual',
                    'Se desativado, o backend retorna bloqueio para alocação manual.',
                    settings.routeSettings.allowManualAllocation,
                    (value) => setRouteSetting('allowManualAllocation', value),
                  )}
                  {renderBooleanField(
                    'Permitir carga divergente sem aprovação',
                    'Mantém exceção operacional para cargas com divergência.',
                    settings.routeSettings.allowDivergentCargoWithoutApproval,
                    (value) => setRouteSetting('allowDivergentCargoWithoutApproval', value),
                  )}
                  {renderBooleanField(
                    'Exigir documento fiscal antes do despacho',
                    'Barra a rota quando a carga não possuir tipo, número e chave fiscal preenchidos.',
                    settings.routeSettings.requireFiscalDocumentBeforeDispatch,
                    (value) => setRouteSetting('requireFiscalDocumentBeforeDispatch', value),
                  )}
                  {renderBooleanField(
                    'Exigir identificação do destinatário antes do despacho',
                    'Impede saída de carga sem destinatário e documento mínimo de recepção já cadastrados.',
                    settings.routeSettings.requireRecipientBeforeDispatch,
                    (value) => setRouteSetting('requireRecipientBeforeDispatch', value),
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="delivery">
          <Card className="app-section-card">
            <CardHeader>
              <CardTitle className="text-xl">Políticas de entrega e ocorrência</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <>
                  {Array.from({ length: 6 }).map((_, index) => (
                    <Skeleton key={index} className="h-24 w-full rounded-2xl" />
                  ))}
                  <Skeleton className="h-24 w-full rounded-2xl" />
                </>
              ) : (
                <>
                  {renderBooleanField(
                    'Exigir foto na entrega',
                    'Usado na conclusão da tarefa pelo app do motorista.',
                    settings.deliverySettings.requireDeliveryPhoto,
                    (value) => setDeliverySetting('requireDeliveryPhoto', value),
                  )}
                  {renderBooleanField(
                    'Exigir assinatura na entrega',
                    'Prepara a política para a próxima camada de comprovante mais rica.',
                    settings.deliverySettings.requireDeliverySignature,
                    (value) => setDeliverySetting('requireDeliverySignature', value),
                  )}
                  {renderBooleanField(
                    'Exigir nome do recebedor',
                    'Barra conclusão de entrega sem identificação mínima.',
                    settings.deliverySettings.requireReceiverName,
                    (value) => setDeliverySetting('requireReceiverName', value),
                  )}
                  {renderBooleanField(
                    'Exigir documento do recebedor',
                    'Aumenta o nível de comprovação da entrega.',
                    settings.deliverySettings.requireReceiverDocument,
                    (value) => setDeliverySetting('requireReceiverDocument', value),
                  )}
                  {renderBooleanField(
                    'Exigir geolocalização',
                    'Impede conclusão sem coordenadas da execução.',
                    settings.deliverySettings.requireDeliveryGeolocation,
                    (value) => setDeliverySetting('requireDeliveryGeolocation', value),
                  )}
                  {renderBooleanField(
                    'Exigir foto em ocorrência',
                    'Barra falha operacional sem evidência mínima.',
                    settings.deliverySettings.requireOccurrencePhoto,
                    (value) => setDeliverySetting('requireOccurrencePhoto', value),
                  )}
                  {renderBooleanField(
                    'Permitir entrega fora do raio esperado',
                    'Mantém política de exceção para cenários de campo.',
                    settings.deliverySettings.allowDeliveryOutsideRadius,
                    (value) => setDeliverySetting('allowDeliveryOutsideRadius', value),
                  )}
                  {renderBooleanField(
                    'Permitir baixa offline',
                    'Permite que o app do motorista guarde conclusão e ocorrência localmente para reenvio posterior quando o fallback assíncrono também estiver ativo.',
                    settings.deliverySettings.allowOfflineCompletion,
                    (value) => setDeliverySetting('allowOfflineCompletion', value),
                  )}

                  <div className="field-stack rounded-2xl border p-4">
                    <Label htmlFor="max-checkin-radius">Raio máximo de check-in/check-out (m)</Label>
                    <Input
                      id="max-checkin-radius"
                      type="number"
                      value={String(settings.deliverySettings.maxCheckinRadiusMeters)}
                      onChange={(event) =>
                        setDeliverySetting(
                          'maxCheckinRadiusMeters',
                          Number(event.target.value || 0),
                        )
                      }
                    />
                    <p className="text-sm leading-6 text-muted-foreground">
                      Base para futuras políticas de distância entre a prova da entrega e o destino esperado.
                    </p>
                  </div>

                  {renderOfflineQueueSummary('delivery')}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integration">
          <Card className="app-section-card">
            <CardHeader>
              <CardTitle className="text-xl">Políticas de integração</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <>
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton key={index} className="h-24 w-full rounded-2xl" />
                  ))}
                </>
              ) : (
                <>
                  {renderBooleanField(
                    'Usar fila de eventos',
                    'Mantém o fluxo preparado para processamento assíncrono.',
                    settings.integrationSettings.useEventQueue,
                    (value) => setIntegrationSetting('useEventQueue', value),
                  )}
                  {renderBooleanField(
                    'Logs detalhados',
                    'Permite mais rastreabilidade técnica das integrações.',
                    settings.integrationSettings.detailedLogsEnabled,
                    (value) => setIntegrationSetting('detailedLogsEnabled', value),
                  )}
                  {renderBooleanField(
                    'Permitir fallback assíncrono',
                    'Mantém a operação local viva mesmo quando o provider estiver indisponível e habilita, junto da baixa offline, o replay posterior do app do motorista.',
                    settings.integrationSettings.allowAsyncFallback,
                    (value) => setIntegrationSetting('allowAsyncFallback', value),
                  )}

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="field-stack rounded-2xl border p-4">
                      <Label htmlFor="integration-retries">Máximo de retries</Label>
                      <Input
                        id="integration-retries"
                        type="number"
                        value={String(settings.integrationSettings.maxRetries)}
                        onChange={(event) =>
                          setIntegrationSetting('maxRetries', Number(event.target.value || 0))
                        }
                      />
                    </div>

                    <div className="field-stack rounded-2xl border p-4">
                      <Label htmlFor="integration-timeout">Timeout padrão (ms)</Label>
                      <Input
                        id="integration-timeout"
                        type="number"
                        value={String(settings.integrationSettings.timeoutMs)}
                        onChange={(event) =>
                          setIntegrationSetting('timeoutMs', Number(event.target.value || 0))
                        }
                      />
                    </div>
                  </div>

                  {renderOfflineQueueSummary('integration')}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-6 flex justify-end">
        <Button onClick={() => void handleSave()} disabled={saving || loading}>
          {saving ? 'Salvando...' : 'Salvar configurações'}
        </Button>
      </div>
        </>
      )}
    </div>
  )
}
