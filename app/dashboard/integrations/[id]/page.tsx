'use client'

import { useEffect, useState, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowLeft,
  RotateCw,
  Play,
  Settings2,
  Link2,
  Save,
} from 'lucide-react'

import { useAuth } from '@/context/auth-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ConnectionDialog,
  ConnectionRecord,
  ProviderDescriptor,
} from '@/components/integrations/connection-dialog'
import {
  SyncPreview,
  SyncPlanSummary,
} from '@/components/integrations/sync-preview'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'

interface MappingRecord {
  id: string
  entityType: string
  internalCode: string
  externalCode: string
  createdAt: string
}

export default function IntegrationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = use(params)
  const connectionId = resolvedParams.id
  const router = useRouter()
  const { hasPermission } = useAuth()
  const canManage = hasPermission('integrations.manage')
  const canManageOrg = hasPermission('integrations.organization.manage')

  const [loading, setLoading] = useState(true)
  const [connection, setConnection] = useState<ConnectionRecord | null>(null)
  const [providers, setProviders] = useState<ProviderDescriptor[]>([])
  const [mappings, setMappings] = useState<MappingRecord[]>([])
  const [currentPlan, setCurrentPlan] = useState<SyncPlanSummary | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [triggeringPreview, setTriggeringPreview] = useState(false)

  // Política de sincronização
  const [direction, setDirection] = useState<'INBOUND' | 'OUTBOUND' | 'BIDIRECTIONAL'>('INBOUND')
  const [authority, setAuthority] = useState<'LOCAL' | 'PROVIDER' | 'MANUAL'>('LOCAL')
  const [scheduleEnabled, setScheduleEnabled] = useState(false)
  const [cronExpression, setCronExpression] = useState('0 2 * * *')
  const [timezone, setTimezone] = useState('America/Sao_Paulo')
  const [executionMode, setExecutionMode] = useState<'PREVIEW_ONLY' | 'APPLY_POLICY'>('PREVIEW_ONLY')
  const [savingPolicy, setSavingPolicy] = useState(false)

  // Associação manual
  const [mappingEntity, setMappingEntity] = useState('DEPARTMENT')
  const [mappingInternalId, setMappingInternalId] = useState('')
  const [mappingExternalId, setMappingExternalId] = useState('')
  const [savingMapping, setSavingMapping] = useState(false)

  const loadConnectionData = useCallback(async () => {
    setLoading(true)
    try {
      const [connRes, provRes, mapsRes, runsRes] = await Promise.allSettled([
        api.get<ConnectionRecord>(`/integrations/connections/${connectionId}`),
        api.get<ProviderDescriptor[]>('/integrations/providers'),
        api.get<MappingRecord[]>(`/integrations/mappings?connectionId=${connectionId}`),
        api.get<{ items?: Array<{ id: string }>; runs?: Array<{ id: string }> }>(
          `/integrations/connections/${connectionId}/sync-runs`,
        ),
      ])

      if (connRes.status === 'fulfilled') {
        const c = connRes.value.data
        setConnection(c)

        // Carrega configurações de syncPolicy se existirem
        const settings = (c.settings as Record<string, unknown>) ?? {}
        const syncPolicy = (settings.syncPolicy as Record<string, unknown>) ?? {}
        const defaults = (syncPolicy.defaults as Record<string, unknown>) ?? {}
        setDirection((defaults.direction as 'INBOUND' | 'OUTBOUND' | 'BIDIRECTIONAL') ?? 'INBOUND')
        setAuthority((defaults.authority as 'LOCAL' | 'PROVIDER' | 'MANUAL') ?? 'LOCAL')

        const sched = (syncPolicy.schedule as Record<string, unknown>) ?? {}
        setScheduleEnabled(Boolean(sched.enabled))
        setCronExpression((sched.expression as string) ?? '0 2 * * *')
        setTimezone((sched.timezone as string) ?? 'America/Sao_Paulo')
        setExecutionMode((sched.executionMode as 'PREVIEW_ONLY' | 'APPLY_POLICY') ?? 'PREVIEW_ONLY')
      }

      if (provRes.status === 'fulfilled') {
        const data = provRes.value.data as unknown
        if (Array.isArray(data)) {
          setProviders(data)
        } else if (data && typeof data === 'object' && Array.isArray((data as { items?: ProviderDescriptor[] }).items)) {
          setProviders((data as { items: ProviderDescriptor[] }).items)
        } else {
          setProviders([])
        }
      }
      if (mapsRes.status === 'fulfilled') {
        const data = mapsRes.value.data as unknown
        setMappings(Array.isArray(data) ? data : (data as { items?: MappingRecord[] })?.items ?? [])
      }

      // Se houver runs, busca a prévia mais recente
      if (runsRes.status === 'fulfilled') {
        const runsData = runsRes.value.data
        const runList = Array.isArray(runsData)
          ? runsData
          : runsData?.items || runsData?.runs || []
        if (runList.length > 0) {
          const latestRun = runList[0]
          try {
            const runDetailsRes = await api.get<SyncPlanSummary>(
              `/integrations/connections/${connectionId}/sync-runs/${latestRun.id}`,
            )
            setCurrentPlan(runDetailsRes.data)
          } catch {
            // ignora se falhar
          }
        }
      }
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Erro ao carregar detalhes da conexão.'))
    } finally {
      setLoading(false)
    }
  }, [connectionId])

  useEffect(() => {
    void loadConnectionData()
  }, [loadConnectionData])

  const handleTriggerPreview = async () => {
    setTriggeringPreview(true)
    try {
      const idempotencyKey = `manual:${connectionId}:${Date.now()}`
      const { data } = await api.post<{ id?: string; runId?: string }>(
        `/integrations/connections/${connectionId}/sync-runs`,
        {
          mode: 'PREVIEW',
          idempotencyKey,
        },
      )
      toast.success('Geração de prévia iniciada com sucesso.')
      const runId = data.runId || data.id
      if (runId) {
        const planRes = await api.get<SyncPlanSummary>(
          `/integrations/connections/${connectionId}/sync-runs/${runId}`,
        )
        setCurrentPlan(planRes.data)
      }
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Falha ao gerar prévia de sincronização.'))
    } finally {
      setTriggeringPreview(false)
    }
  }

  const handleSavePolicy = async () => {
    setSavingPolicy(true)
    try {
      const payload = {
        expectedRevision: (connection?.settings as any)?.revision ?? 1,
        syncPolicy: {
          schemaVersion: 1,
          defaults: {
            direction,
            authority,
          },
          schedule: {
            enabled: scheduleEnabled,
            kind: 'CRON',
            expression: cronExpression,
            timezone,
            executionMode,
            overlapPolicy: 'SKIP',
            misfirePolicy: 'SKIP',
          },
        },
      }

      await api.patch(
        `/integrations/connections/${connectionId}/organization/configuration`,
        payload,
      )
      toast.success('Política de sincronização atualizada com sucesso.')
      void loadConnectionData()
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Erro ao salvar política de sincronização.'))
    } finally {
      setSavingPolicy(false)
    }
  }

  const handleCreateMapping = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mappingInternalId.trim() || !mappingExternalId.trim()) {
      toast.error('Informe os códigos interno e externo.')
      return
    }

    setSavingMapping(true)
    try {
      await api.post('/integrations/mappings', {
        connectionId,
        entityType: mappingEntity,
        internalCode: mappingInternalId.trim(),
        externalCode: mappingExternalId.trim(),
      })
      toast.success('Mapeamento manual registrado com sucesso.')
      setMappingInternalId('')
      setMappingExternalId('')
      void loadConnectionData()
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Falha ao registrar mapeamento.'))
    } finally {
      setSavingMapping(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-9 rounded-md" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (!connection) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-muted-foreground">Conexão não encontrada.</p>
        <Button variant="outline" onClick={() => router.push('/dashboard/integrations')}>
          Voltar para o Hub
        </Button>
      </div>
    )
  }

  const isElofy = connection.provider === 'ELOFY'

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
      {/* 1. CABEÇALHO TOCLOG COM NAVEGAÇÃO DE RETORNO */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0"
            onClick={() => router.push('/dashboard/integrations')}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {connection.name}
              </h1>
              <Badge variant="outline">{connection.provider}</Badge>
              <Badge variant="secondary">{connection.environment}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Configurações detalhadas, prévias de sincronização e conciliação de identidade.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canManage && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5"
                onClick={() => setDialogOpen(true)}
              >
                <Settings2 className="size-4" />
                <span>Editar Conexão</span>
              </Button>

              <Button
                size="sm"
                className="h-9 gap-1.5 font-semibold"
                onClick={() => void handleTriggerPreview()}
                disabled={triggeringPreview}
              >
                <Play className={`size-4 ${triggeringPreview ? 'animate-spin' : ''}`} />
                <span>{triggeringPreview ? 'Gerando...' : 'Gerar Prévia'}</span>
              </Button>
            </>
          )}

          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            onClick={() => void loadConnectionData()}
          >
            <RotateCw className="size-4" />
            <span>Atualizar</span>
          </Button>
        </div>
      </section>

      {/* 2. CARDS DE INDICADORES DA CONEXÃO */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="p-4 border-border/60">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
            Status Operacional
          </span>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`size-2.5 rounded-full ${
                connection.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-muted-foreground'
              }`}
            />
            <span className="text-xl font-bold">
              {connection.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
            </span>
          </div>
        </Card>

        <Card className="p-4 border-border/60">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
            Revisão Cadastral
          </span>
          <span className="text-xl font-bold mt-1 block">
            Rev. {((connection as unknown as Record<string, unknown>).revision as number) ?? 1}
          </span>
        </Card>

        <Card className="p-4 border-border/60">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
            Mapeamentos Vinculados
          </span>
          <span className="text-xl font-bold mt-1 block">{mappings.length}</span>
        </Card>

        <Card className="p-4 border-border/60">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
            Última Execução
          </span>
          <span className="text-xs text-muted-foreground mt-2 block">
            {connection.lastSyncAt ? new Date(connection.lastSyncAt).toLocaleString('pt-BR') : 'Nenhuma'}
          </span>
        </Card>
      </section>

      {/* 3. ABAS: PRÉVIA, POLÍTICA E MAPEAMENTOS */}
      <Tabs defaultValue="preview" className="space-y-4">
        <TabsList className="h-10 p-1">
          <TabsTrigger value="preview" className="text-xs sm:text-sm">
            Prévia & Conflitos
          </TabsTrigger>
          <TabsTrigger value="policy" className="text-xs sm:text-sm">
            Política & Agendamento
          </TabsTrigger>
          <TabsTrigger value="mappings" className="text-xs sm:text-sm">
            Mapeamentos & Identidade ({mappings.length})
          </TabsTrigger>
        </TabsList>

        {/* ABA: PRÉVIA E CONFLITOS */}
        <TabsContent value="preview" className="space-y-4">
          {currentPlan ? (
            <SyncPreview
              plan={currentPlan}
              onAppliedSuccess={() => void loadConnectionData()}
              onRefreshRequested={() => void handleTriggerPreview()}
              canApply={canManageOrg}
            />
          ) : (
            <Card className="p-8 text-center space-y-3 border-dashed">
              <p className="text-sm text-muted-foreground">
                Nenhum plano de sincronização ativo para esta conexão.
              </p>
              <Button
                size="sm"
                onClick={() => void handleTriggerPreview()}
                disabled={triggeringPreview}
                className="gap-1.5"
              >
                <Play className="size-4" />
                <span>Gerar Primeira Prévia</span>
              </Button>
            </Card>
          )}
        </TabsContent>

        {/* ABA: POLÍTICA E AGENDAMENTO */}
        <TabsContent value="policy" className="space-y-4">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-lg">Fonte de Verdade, Direção e Agendamento</CardTitle>
              <CardDescription>
                Defina como os dados são transmitidos e a periodicidade do motor de reconciliação.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* DIREÇÃO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Direção da Sincronização</Label>
                  <Select
                    value={direction}
                    onValueChange={(val: 'INBOUND' | 'OUTBOUND' | 'BIDIRECTIONAL') => setDirection(val)}
                    disabled={isElofy} // Elofy é exclusivamente INBOUND
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INBOUND">INBOUND (Externo → LogFlow)</SelectItem>
                      <SelectItem value="OUTBOUND" disabled={isElofy}>
                        OUTBOUND (LogFlow → Externo)
                      </SelectItem>
                      <SelectItem value="BIDIRECTIONAL" disabled={isElofy}>
                        BIDIRECTIONAL (Ambos os sentidos)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {isElofy && (
                    <p className="text-[11px] text-muted-foreground">
                      * O provedor Elofy suporta exclusivamente o sentido INBOUND (apenas leitura do contrato remoto).
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label>Fonte de Verdade Padrão</Label>
                  <Select
                    value={authority}
                    onValueChange={(val: 'LOCAL' | 'PROVIDER' | 'MANUAL') => setAuthority(val)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOCAL">LOCAL (LogFlow prevalece)</SelectItem>
                      <SelectItem value="PROVIDER">PROVIDER (Provedor externo prevalece)</SelectItem>
                      <SelectItem value="MANUAL">MANUAL (Exige decisão humana)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* CRON E AGENDAMENTO */}
              <div className="border rounded-lg p-4 space-y-4 bg-muted/20">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-semibold">Agendamento Automático</Label>
                    <p className="text-xs text-muted-foreground">
                      Executa rotinas periódicas em segundo plano com ticker durável.
                    </p>
                  </div>
                  <Switch
                    checked={scheduleEnabled}
                    onCheckedChange={setScheduleEnabled}
                  />
                </div>

                {scheduleEnabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="cron-exp">Expressão Cron (5 campos)</Label>
                      <Input
                        id="cron-exp"
                        value={cronExpression}
                        onChange={(e) => setCronExpression(e.target.value)}
                        placeholder="0 2 * * *"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="cron-tz">Fuso Horário IANA</Label>
                      <Select value={timezone} onValueChange={setTimezone}>
                        <SelectTrigger id="cron-tz">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="America/Sao_Paulo">America/Sao_Paulo (UTC-3)</SelectItem>
                          <SelectItem value="UTC">UTC (Universal Time)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label>Modo de Execução</Label>
                      <Select
                        value={executionMode}
                        onValueChange={(val: 'PREVIEW_ONLY' | 'APPLY_POLICY') => setExecutionMode(val)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PREVIEW_ONLY">Apenas Prévia (Requer Aprovação)</SelectItem>
                          <SelectItem value="APPLY_POLICY">Aplicação Automática Autorizada</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  onClick={() => void handleSavePolicy()}
                  disabled={savingPolicy}
                  className="gap-1.5"
                >
                  <Save className="size-4" />
                  <span>{savingPolicy ? 'Salvando...' : 'Salvar Política de Sincronização'}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA: MAPEAMENTOS DE IDENTIDADE */}
        <TabsContent value="mappings" className="space-y-4">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-lg">Associação Manual de Entidades</CardTitle>
              <CardDescription>
                Vincule identificadores remotos a registros internos do LogFlow para resolver conflitos de identidade.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateMapping} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Tipo de Entidade</Label>
                  <Select value={mappingEntity} onValueChange={setMappingEntity}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DEPARTMENT">Departamento</SelectItem>
                      <SelectItem value="JOB_POSITION">Cargo</SelectItem>
                      <SelectItem value="EMPLOYEE">Funcionário</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Código Interno (LogFlow UUID)</Label>
                  <Input
                    className="h-9 text-xs font-mono"
                    placeholder="UUID da entidade local"
                    value={mappingInternalId}
                    onChange={(e) => setMappingInternalId(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Código Externo (Remoto)</Label>
                  <Input
                    className="h-9 text-xs font-mono"
                    placeholder="ID do provedor"
                    value={mappingExternalId}
                    onChange={(e) => setMappingExternalId(e.target.value)}
                    required
                  />
                </div>

                <div className="flex items-end">
                  <Button type="submit" size="sm" className="h-9 w-full gap-1 text-xs" disabled={savingMapping}>
                    <Link2 className="size-3.5" />
                    <span>{savingMapping ? 'Vinculando...' : 'Vincular Manual'}</span>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="border-border/60 overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[140px]">Tipo</TableHead>
                    <TableHead>Código Interno</TableHead>
                    <TableHead>Código Externo</TableHead>
                    <TableHead className="w-[180px]">Data Criação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground text-xs">
                        Nenhum mapeamento registrado para esta conexão.
                      </TableCell>
                    </TableRow>
                  ) : (
                    mappings.map((m) => (
                      <TableRow key={m.id} className="hover:bg-muted/30">
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{m.entityType}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{m.internalCode}</TableCell>
                        <TableCell className="font-mono text-xs font-semibold">{m.externalCode}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(m.createdAt).toLocaleString('pt-BR')}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODAL CONNECTION DIALOG */}
      <ConnectionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        connection={connection}
        providers={providers}
        onSuccess={() => void loadConnectionData()}
      />
    </div>
  )
}
