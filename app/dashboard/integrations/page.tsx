'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { MenuFunctionHeader } from '@/components/layout/menu-function-header'
import { WorkspaceInlineAlert } from '@/components/layout/workspace-inline-alert'
import { WorkspaceStateCard } from '@/components/layout/workspace-state-card'
import { useAuth } from '@/context/auth-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'

const DEFAULT_CONNECTION_NAME = 'SSW Principal'
const DEFAULT_TIMEOUT_MS = '10000'
const DEFAULT_MAX_RETRIES = '3'

type ConnectionSettingsRecord = {
  timeoutMs?: number
  maxRetries?: number
}

type ConnectionRecord = {
  id: string
  provider: 'SSW'
  name: string
  environment: 'SANDBOX' | 'PRODUCTION'
  status: 'ACTIVE' | 'INACTIVE' | 'ERROR'
  lastSyncAt?: string | null
  credentials?: { configured?: boolean } | null
  settings?: ConnectionSettingsRecord | null
}

type ConnectionDetailsRecord = ConnectionRecord & {
  latestTest?: ConnectionTestResult | null
}

type ProviderResponsePayload = {
  provider?: string | null
  providerStatus?: string | null
  providerMessage?: string | null
  protocol?: string | null
  processedAt?: string | null
  queue?: string | null
  receiptNumber?: string | null
}

type ConnectionTestResult = {
  ok: boolean
  connectionId: string
  errorMessage?: string | null
  response?: ProviderResponsePayload | null
  testedAt?: string | null
}

type EventRecord = {
  id: string
  status: string
  providerOperation: string
  entityType: string
  entityId?: string | null
  attempts: number
  errorMessage?: string | null
  nextAttemptAt?: string | null
  updatedAt: string
  responsePayload?: ProviderResponsePayload | null
  connection?: { name: string; provider: string } | null
}

type LogRecord = {
  id: string
  endpoint: string
  method: string
  providerOperation: string
  status: string
  errorMessage?: string | null
  createdAt: string
  responsePayload?: ProviderResponsePayload | null
  connection?: { id: string; name: string; provider: string } | null
}

function providerStatusVariant(status?: string | null): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (!status) {
    return 'outline'
  }

  if (['REJECTED', 'ERROR', 'DENIED'].includes(status)) {
    return 'destructive'
  }

  if (['AUTHENTICATED', 'RECEIVED', 'ACCEPTED'].includes(status)) {
    return 'default'
  }

  return 'secondary'
}

function canReprocessEvent(status: string) {
  return status === 'FAILED' || status === 'RETRY_SCHEDULED'
}

function getProviderOperationMeta(providerOperation: string) {
  switch (providerOperation) {
    case 'SSW_NOTFIS_OUTBOUND':
      return {
        label: 'Documento fiscal outbound',
        detail: 'Despacho da rota com base fiscal publicada para a SSW.',
      }
    case 'SSW_OCCURRENCE_OUTBOUND':
      return {
        label: 'Ocorrência outbound',
        detail: 'Falha, devolução ou reagendamento enviado da operação local para a SSW.',
      }
    case 'SSW_POD_OUTBOUND':
      return {
        label: 'Comprovante outbound',
        detail: 'POD/comprovante enviado após a conclusão operacional da tarefa.',
      }
    case 'SSW_CONNECTION_TEST':
      return {
        label: 'Teste de conexão',
        detail: 'Validação técnica manual da credencial e do provider.',
      }
    case 'SSW_TRACKING_LOOKUP':
      return {
        label: 'Consulta de tracking',
        detail: 'Leitura pontual do provider disparada a partir do tracking web.',
      }
    default:
      return {
        label: providerOperation,
        detail: 'Evento técnico registrado na trilha de integrações.',
      }
  }
}

export default function IntegrationsPage() {
  const { hasPermission } = useAuth()
  const canManageIntegrations = hasPermission('integrations.manage')
  const canViewIntegrations = hasPermission('integrations.view')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [connectionsError, setConnectionsError] = useState<string | null>(null)
  const [eventsError, setEventsError] = useState<string | null>(null)
  const [logsError, setLogsError] = useState<string | null>(null)
  const [connections, setConnections] = useState<ConnectionRecord[]>([])
  const [events, setEvents] = useState<EventRecord[]>([])
  const [logs, setLogs] = useState<LogRecord[]>([])
  const [saving, setSaving] = useState(false)
  const [bootstrapping, setBootstrapping] = useState(false)
  const [processingPending, setProcessingPending] = useState(false)
  const [testingConnectionId, setTestingConnectionId] = useState<string | null>(null)
  const [statusUpdatingConnectionId, setStatusUpdatingConnectionId] = useState<string | null>(null)
  const [loadingConnectionDetailId, setLoadingConnectionDetailId] = useState<string | null>(null)
  const [editingConnectionId, setEditingConnectionId] = useState<string | null>(null)
  const [lastConnectionTest, setLastConnectionTest] = useState<ConnectionTestResult | null>(null)
  const [name, setName] = useState(DEFAULT_CONNECTION_NAME)
  const [environment, setEnvironment] = useState<'SANDBOX' | 'PRODUCTION'>('SANDBOX')
  const [token, setToken] = useState('')
  const [ediCode, setEdiCode] = useState('')
  const [active, setActive] = useState(true)
  const [timeoutMs, setTimeoutMs] = useState(DEFAULT_TIMEOUT_MS)
  const [maxRetries, setMaxRetries] = useState(DEFAULT_MAX_RETRIES)

  useEffect(() => {
    if (!canViewIntegrations) {
      setLoading(false)
      return
    }

    void loadData()
  }, [canViewIntegrations])

  function resetConnectionForm() {
    setEditingConnectionId(null)
    setLastConnectionTest(null)
    setName(DEFAULT_CONNECTION_NAME)
    setEnvironment('SANDBOX')
    setToken('')
    setEdiCode('')
    setActive(true)
    setTimeoutMs(DEFAULT_TIMEOUT_MS)
    setMaxRetries(DEFAULT_MAX_RETRIES)
  }

  async function startEditingConnection(connection: ConnectionRecord) {
    setLoadingConnectionDetailId(connection.id)

    try {
      const { data } = await api.get<ConnectionDetailsRecord>(
        `/integrations/connections/${connection.id}`,
      )

      setEditingConnectionId(data.id)
      setLastConnectionTest(data.latestTest ?? null)
      setName(data.name)
      setEnvironment(data.environment)
      setToken('')
      setEdiCode('')
      setActive(data.status === 'ACTIVE')
      setTimeoutMs(String(data.settings?.timeoutMs ?? 10000))
      setMaxRetries(String(data.settings?.maxRetries ?? 3))
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível abrir o detalhe da conexão.'))
    } finally {
      setLoadingConnectionDetailId(null)
    }
  }

  async function loadData(showLoadingState = true) {
    if (showLoadingState) {
      setLoading(true)
    } else {
      setRefreshing(true)
    }

    try {
      setLoadError(null)
      const [connectionsRes, eventsRes, logsRes] = await Promise.allSettled([
        api.get<ConnectionRecord[]>('/integrations/connections'),
        api.get<EventRecord[]>('/integrations/events'),
        api.get<LogRecord[]>('/integrations/logs'),
      ])

      const partialFailures: string[] = []

      if (connectionsRes.status === 'fulfilled') {
        setConnections(connectionsRes.value.data)
        setConnectionsError(null)
      } else {
        const message = getApiErrorMessage(
          connectionsRes.reason,
          'Não foi possível carregar as conexões.',
        )
        setConnectionsError(message)
        partialFailures.push('conexões')
      }

      if (eventsRes.status === 'fulfilled') {
        setEvents(eventsRes.value.data)
        setEventsError(null)
      } else {
        const message = getApiErrorMessage(
          eventsRes.reason,
          'Não foi possível carregar os eventos.',
        )
        setEventsError(message)
        partialFailures.push('eventos')
      }

      if (logsRes.status === 'fulfilled') {
        setLogs(logsRes.value.data)
        setLogsError(null)
      } else {
        const message = getApiErrorMessage(logsRes.reason, 'Não foi possível carregar os logs.')
        setLogsError(message)
        partialFailures.push('logs')
      }

      if (partialFailures.length === 3) {
        const message = 'Não foi possível carregar conexões, eventos e logs de integrações.'
        setLoadError(message)
        toast.error(message)
        return
      }

      if (partialFailures.length > 0) {
        toast.error(
          `Leitura parcial concluída. Revise a aba de ${partialFailures.join(', ')} e tente atualizar novamente.`,
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

  async function handleSaveConnection() {
    if (!name.trim()) {
      toast.error('Informe o nome da conexão antes de salvar.')
      return
    }

    const parsedTimeoutMs = Number(timeoutMs.trim())
    if (!Number.isInteger(parsedTimeoutMs) || parsedTimeoutMs <= 0) {
      toast.error('Informe um timeout positivo em milissegundos para a conexão.')
      return
    }

    const parsedMaxRetries = Number(maxRetries.trim())
    if (!Number.isInteger(parsedMaxRetries) || parsedMaxRetries < 0) {
      toast.error('Informe um número inteiro maior ou igual a zero para as retentativas.')
      return
    }

    const nextToken = token.trim()
    const nextEdiCode = ediCode.trim()
    const replacingCredentials = Boolean(nextToken || nextEdiCode)

    if (!editingConnectionId && !nextToken) {
      toast.error('Informe o token da conexão SSW antes de salvar.')
      return
    }

    if (!editingConnectionId && !nextEdiCode) {
      toast.error('Informe o código EDI da conexão SSW antes de salvar.')
      return
    }

    if (replacingCredentials && (!nextToken || !nextEdiCode)) {
      toast.error('Ao trocar as credenciais da conexão, informe token e código EDI juntos.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: name.trim(),
        environment,
        active,
        ...(replacingCredentials
          ? {
              credentials: {
                token: nextToken,
                ediCode: nextEdiCode,
              },
            }
          : {}),
        settings: {
          timeoutMs: parsedTimeoutMs,
          maxRetries: parsedMaxRetries,
        },
      }

      if (editingConnectionId) {
        await api.patch(`/integrations/connections/${editingConnectionId}`, payload)
        toast.success('Conexão atualizada com sucesso.')
      } else {
        await api.post('/integrations/connections', {
          provider: 'SSW',
          ...payload,
          credentials: {
            token: nextToken,
            ediCode: nextEdiCode,
          },
        })
        toast.success('Conexão criada com sucesso.')
      }

      resetConnectionForm()
      await loadData(false)
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          editingConnectionId
            ? 'Não foi possível atualizar a conexão.'
            : 'Não foi possível criar a conexão.',
        ),
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleConnectionStatus(connection: ConnectionRecord) {
    setStatusUpdatingConnectionId(connection.id)
    try {
      if (connection.status === 'INACTIVE') {
        await api.patch(`/integrations/connections/${connection.id}`, { active: true })
        toast.success('Conexão reativada com sucesso.')
        if (editingConnectionId === connection.id) {
          setActive(true)
        }
      } else {
        await api.patch(`/integrations/connections/${connection.id}/deactivate`)
        toast.success('Conexão marcada como inativa.')
        if (editingConnectionId === connection.id) {
          setActive(false)
        }
      }

      await loadData(false)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível atualizar o status da conexão.'))
    } finally {
      setStatusUpdatingConnectionId(null)
    }
  }

  async function handleBootstrapMappings() {
    setBootstrapping(true)
    try {
      await api.post('/integrations/mappings/bootstrap')
      toast.success('Mapeamentos padrão da SSW criados.')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível criar os mapeamentos padrão.'))
    } finally {
      setBootstrapping(false)
    }
  }

  async function handleReprocess(eventId: string) {
    try {
      await api.post(`/integrations/events/${eventId}/reprocess`, {
        reason: 'Reprocessamento solicitado pela área operacional.',
      })
      toast.success('Evento reenfileirado para processamento.')
      await loadData(false)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível reenfileirar o evento.'))
    }
  }

  async function handleTestConnection(connectionId: string) {
    setTestingConnectionId(connectionId)
    try {
      const { data } = await api.post<ConnectionTestResult>(
        `/integrations/connections/${connectionId}/test`,
      )

      setLastConnectionTest(data)

      if (data.ok) {
        toast.success('Conexão SSW validada com sucesso.')
      } else {
        toast.error(data.errorMessage || 'A conexão retornou falha.')
      }

      await loadData(false)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível testar a conexão.'))
    } finally {
      setTestingConnectionId(null)
    }
  }

  async function handleProcessPending() {
    setProcessingPending(true)
    try {
      const { data } = await api.post<{ processed: number }>('/integrations/events/process-pending', {
        limit: 20,
      })
      toast.success(
        data.processed > 0
          ? `${data.processed} evento(s) processado(s).`
          : 'Nenhum evento pendente estava elegível para processamento.',
      )
      await loadData()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível processar os eventos pendentes.'))
    } finally {
      setProcessingPending(false)
    }
  }

  const summary = {
    connections: connections.length,
    pendingEvents: events.filter((event) => ['PENDING', 'PROCESSING', 'RETRY_SCHEDULED'].includes(event.status)).length,
    failedEvents: events.filter((event) => event.status === 'FAILED').length,
  }
  const hasEligiblePendingEvents = events.some((event) =>
    ['PENDING', 'RETRY_SCHEDULED'].includes(event.status),
  )
  const editingConnection = connections.find((connection) => connection.id === editingConnectionId) ?? null
  const hasPartialLoadIssue = !loadError && Boolean(connectionsError || eventsError || logsError)
  const visibleConnectionTest = lastConnectionTest && (
    !editingConnectionId || lastConnectionTest.connectionId === editingConnectionId
  )
    ? lastConnectionTest
    : null

  return (
    <div className="app-page">
      <MenuFunctionHeader
        title="Integrações > Conexões e Eventos"
        description="Governança técnica das integrações por empresa, com conexão, reprocessamento, logs sanitizados e monitoramento operacional."
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="rounded-full px-4 py-2">Primeiro provider: SSW</Badge>
            <Button variant="outline" size="sm" onClick={() => void loadData(false)} disabled={loading || refreshing}>
              {refreshing ? 'Atualizando...' : 'Atualizar leitura'}
            </Button>
          </div>
        }
      />

      {!canViewIntegrations ? (
        <WorkspaceStateCard title="Acesso restrito">
          <p>Este perfil não pode visualizar conexões, eventos e logs de integrações.</p>
        </WorkspaceStateCard>
      ) : (
        <>
      {canViewIntegrations && !canManageIntegrations ? (
        <WorkspaceStateCard title="Modo leitura" tone="warning">
          <p>
            Este perfil pode revisar conexões, eventos e logs já registrados, mas não pode testar,
            editar, reenfileirar ou alterar o cadastro técnico da integração.
          </p>
          <p>
            Use esta tela como trilha de auditoria operacional e acione um perfil com gestão quando
            for preciso trocar credencial, reprocessar fila ou bootstrap de mapeamentos.
          </p>
        </WorkspaceStateCard>
      ) : null}

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
            A tela conseguiu aproveitar parte dos dados já disponíveis, mas uma ou mais abas
            retornaram falha nesta atualização.
          </p>
          <p>
            Revise os avisos dentro de `Conexões`, `Eventos` e `Logs` para identificar o bloco
            afetado antes de concluir que a integração inteira está indisponível.
          </p>
        </WorkspaceStateCard>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="app-section-card">
          <CardHeader>
            <CardTitle className="text-3xl">{summary.connections}</CardTitle>
            <p className="text-sm text-muted-foreground">Conexões configuradas</p>
          </CardHeader>
        </Card>
        <Card className="app-section-card">
          <CardHeader>
            <CardTitle className="text-3xl">{summary.pendingEvents}</CardTitle>
            <p className="text-sm text-muted-foreground">Eventos aguardando execução</p>
          </CardHeader>
        </Card>
        <Card className="app-section-card">
          <CardHeader>
            <CardTitle className="text-3xl">{summary.failedEvents}</CardTitle>
            <p className="text-sm text-muted-foreground">Falhas que exigem revisão</p>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="app-section-card">
          <CardHeader>
            <CardTitle className="text-xl">Monitoramento operacional</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="connections" className="space-y-6">
              <TabsList className="grid w-full max-w-[520px] grid-cols-3">
                <TabsTrigger value="connections">Conexões</TabsTrigger>
                <TabsTrigger value="events">Eventos</TabsTrigger>
                <TabsTrigger value="logs">Logs</TabsTrigger>
              </TabsList>

              <TabsContent value="connections">
                {connectionsError ? (
                  <WorkspaceInlineAlert
                    className="mb-4"
                    title="Falha ao atualizar conexões"
                    description={connectionsError}
                    hint="A tela preservou a última lista válida já carregada enquanto a nova leitura não conclui."
                  />
                ) : null}
                <div className="rounded-2xl border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Provider</TableHead>
                        <TableHead>Ambiente</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Último sync</TableHead>
                        <TableHead className="text-right">Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        Array.from({ length: 3 }).map((_, index) => (
                          <TableRow key={index}>
                            <TableCell colSpan={6}><Skeleton className="h-8 w-full rounded-xl" /></TableCell>
                          </TableRow>
                        ))
                      ) : connections.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                            Nenhuma conexão configurada para este tenant.
                          </TableCell>
                        </TableRow>
                      ) : (
                        connections.map((connection) => (
                          <TableRow key={connection.id}>
                            <TableCell className="font-medium">{connection.name}</TableCell>
                            <TableCell>{connection.provider}</TableCell>
                            <TableCell>{connection.environment}</TableCell>
                            <TableCell>
                              <Badge variant={connection.status === 'ACTIVE' ? 'default' : connection.status === 'ERROR' ? 'destructive' : 'secondary'}>
                                {connection.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {connection.lastSyncAt ? new Date(connection.lastSyncAt).toLocaleString('pt-BR') : 'Nunca'}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => void startEditingConnection(connection)}
                                  disabled={loadingConnectionDetailId === connection.id}
                                >
                                  {loadingConnectionDetailId === connection.id
                                    ? 'Abrindo...'
                                    : canManageIntegrations
                                      ? 'Editar'
                                      : 'Visualizar'}
                                </Button>
                                {canManageIntegrations ? (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleTestConnection(connection.id)}
                                      disabled={testingConnectionId === connection.id}
                                    >
                                      {testingConnectionId === connection.id ? 'Testando...' : 'Testar'}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant={connection.status === 'INACTIVE' ? 'default' : 'secondary'}
                                      onClick={() => void handleToggleConnectionStatus(connection)}
                                      disabled={statusUpdatingConnectionId === connection.id}
                                    >
                                      {statusUpdatingConnectionId === connection.id
                                        ? 'Salvando...'
                                        : connection.status === 'INACTIVE'
                                          ? 'Reativar'
                                          : 'Inativar'}
                                    </Button>
                                  </>
                                ) : null}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="events">
                <p className="mb-4 text-sm text-muted-foreground">
                  Os eventos outbound de documento fiscal de `shipments` passam a aparecer aqui quando a rota é despachada com conexão SSW ativa.
                </p>
                {eventsError ? (
                  <WorkspaceInlineAlert
                    className="mb-4"
                    title="Falha ao atualizar eventos"
                    description={eventsError}
                    hint="A última fila válida foi mantida para não interromper a conferência operacional."
                  />
                ) : null}
                <div className="mb-4 flex justify-end">
                  {canManageIntegrations ? (
                    <Button
                      variant="outline"
                      onClick={handleProcessPending}
                      disabled={processingPending || !hasEligiblePendingEvents}
                    >
                      {processingPending ? 'Processando...' : 'Processar pendências'}
                    </Button>
                  ) : null}
                </div>
                <div className="rounded-2xl border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Operação</TableHead>
                        <TableHead>Entidade</TableHead>
                        <TableHead>Registro</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Provider</TableHead>
                        <TableHead>Tentativas</TableHead>
                        <TableHead>Próxima tentativa</TableHead>
                        <TableHead className="text-right">Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        Array.from({ length: 3 }).map((_, index) => (
                          <TableRow key={index}>
                            <TableCell colSpan={8}><Skeleton className="h-8 w-full rounded-xl" /></TableCell>
                          </TableRow>
                        ))
                      ) : events.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                            Ainda não há eventos de integração.
                          </TableCell>
                        </TableRow>
                      ) : (
                        events.map((event) => {
                          const canReprocess = canReprocessEvent(event.status)
                          const operationMeta = getProviderOperationMeta(event.providerOperation)

                          return (
                          <TableRow key={event.id}>
                            <TableCell className="max-w-[260px] align-top">
                              <p className="font-medium">{operationMeta.label}</p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {operationMeta.detail}
                              </p>
                              <p className="mt-1 text-[11px] font-mono text-muted-foreground">
                                {event.providerOperation}
                              </p>
                            </TableCell>
                            <TableCell>{event.entityType}</TableCell>
                            <TableCell className="font-mono text-xs">{event.entityId || '—'}</TableCell>
                            <TableCell><Badge variant={event.status === 'FAILED' ? 'destructive' : event.status === 'SUCCESS' ? 'default' : 'secondary'}>{event.status}</Badge></TableCell>
                            <TableCell className="max-w-[280px] align-top">
                              {event.responsePayload ? (
                                <div className="space-y-1">
                                  <Badge variant={providerStatusVariant(event.responsePayload.providerStatus)}>
                                    {event.responsePayload.providerStatus || event.responsePayload.provider || 'Sem status'}
                                  </Badge>
                                  <p className="text-xs font-mono text-muted-foreground">
                                    {event.responsePayload.protocol || 'Sem protocolo'}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Processado em {event.responsePayload.processedAt
                                      ? new Date(event.responsePayload.processedAt).toLocaleString('pt-BR')
                                      : 'horário não informado'}
                                  </p>
                                  {event.responsePayload.queue || event.responsePayload.receiptNumber ? (
                                    <p className="text-xs text-muted-foreground">
                                      {event.responsePayload.queue ? `Fila ${event.responsePayload.queue}` : 'Fila não informada'}
                                      {event.responsePayload.receiptNumber
                                        ? ` • Recibo ${event.responsePayload.receiptNumber}`
                                        : ''}
                                    </p>
                                  ) : null}
                                  <p className="text-xs text-muted-foreground">
                                    {event.responsePayload.providerMessage || 'Sem mensagem do provider'}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">Sem retorno útil ainda.</span>
                              )}
                            </TableCell>
                            <TableCell>{event.attempts}</TableCell>
                            <TableCell className="max-w-[180px] text-xs text-muted-foreground">
                              {event.nextAttemptAt ? new Date(event.nextAttemptAt).toLocaleString('pt-BR') : event.errorMessage || '—'}
                            </TableCell>
                            <TableCell className="text-right">
                              {canManageIntegrations ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleReprocess(event.id)}
                                  disabled={!canReprocess}
                                >
                                  Reprocessar
                                </Button>
                              ) : (
                                <span className="text-xs text-muted-foreground">Somente revisão</span>
                              )}
                            </TableCell>
                          </TableRow>
                          )
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  {canManageIntegrations
                    ? 'O reenfileiramento manual fica disponível apenas para eventos com `FAILED` ou `RETRY_SCHEDULED`.'
                    : 'Perfis em `Modo leitura` acompanham a fila, mas não conseguem reenfileirar manualmente os eventos.'}
                </p>
              </TabsContent>

              <TabsContent value="logs">
                {logsError ? (
                  <WorkspaceInlineAlert
                    className="mb-4"
                    title="Falha ao atualizar logs"
                    description={logsError}
                    hint="O histórico técnico mais recente já carregado foi preservado enquanto a nova leitura falhou."
                  />
                ) : null}
                <div className="rounded-2xl border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Endpoint</TableHead>
                        <TableHead>Método</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Retorno do provider</TableHead>
                        <TableHead>Erro</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        Array.from({ length: 3 }).map((_, index) => (
                          <TableRow key={index}>
                            <TableCell colSpan={5}><Skeleton className="h-8 w-full rounded-xl" /></TableCell>
                          </TableRow>
                        ))
                      ) : logs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                            Nenhum log técnico registrado.
                          </TableCell>
                        </TableRow>
                      ) : (
                        logs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="font-medium">{log.endpoint}</TableCell>
                            <TableCell>{log.method}</TableCell>
                            <TableCell><Badge variant={log.status === 'FAILED' ? 'destructive' : log.status === 'SUCCESS' ? 'default' : 'secondary'}>{log.status}</Badge></TableCell>
                            <TableCell className="max-w-[280px]">
                              {log.responsePayload ? (
                                <div className="space-y-1">
                                  <Badge variant={providerStatusVariant(log.responsePayload.providerStatus)}>
                                    {log.responsePayload.providerStatus || log.responsePayload.provider || 'Sem status'}
                                  </Badge>
                                  <p className="text-xs font-mono text-muted-foreground">
                                    {log.responsePayload.protocol || 'Sem protocolo'}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">Sem payload de retorno.</span>
                              )}
                            </TableCell>
                            <TableCell className="max-w-[280px] truncate text-muted-foreground">{log.errorMessage || 'Sem erro'}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card className="app-section-card">
          <CardHeader>
            <CardTitle className="text-xl">
              {editingConnectionId
                ? canManageIntegrations
                  ? 'Editar conexão SSW'
                  : 'Detalhe da conexão SSW'
                : canManageIntegrations
                  ? 'Nova conexão SSW'
                  : 'Selecione uma conexão'}
            </CardTitle>
            <CardDescription>
              {canManageIntegrations
                ? editingConnectionId
                  ? 'Atualize nome, ambiente, status e parâmetros técnicos sem expor as credenciais já mascaradas.'
                  : 'Configure a primeira conexão técnica do tenant com token, código EDI e parâmetros básicos de processamento.'
                : editingConnectionId
                  ? 'Revise o cadastro técnico mascarado, o último teste e os parâmetros atuais sem abrir manutenção indevida.'
                  : 'Escolha uma conexão na lista para revisar o cadastro técnico e o histórico do último teste.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {editingConnection ? (
              <div className="rounded-2xl border bg-muted/20 px-4 py-4 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">{editingConnection.name}</p>
                <p className="mt-1">
                  Credenciais atuais: {editingConnection.credentials?.configured ? 'configuradas e mascaradas' : 'não configuradas'}
                </p>
                <p className="mt-1">
                  Timeout atual: {editingConnection.settings?.timeoutMs ?? 10000} ms • Retentativas atuais: {editingConnection.settings?.maxRetries ?? 3}
                </p>
                <p className="mt-2 text-xs">
                  Preencha token e código EDI apenas se quiser substituir as credenciais atuais.
                </p>
              </div>
            ) : null}

            {visibleConnectionTest ? (
              <div className="rounded-2xl border px-4 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">Último teste da conexão</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Retorno sanitizado do provider para apoiar troubleshooting sem depender só de toast ou apenas da sessão atual.
                    </p>
                  </div>
                  <Badge variant={visibleConnectionTest.ok ? 'default' : 'destructive'}>
                    {visibleConnectionTest.ok ? 'Teste válido' : 'Teste com falha'}
                  </Badge>
                </div>
                {visibleConnectionTest.testedAt ? (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Último teste registrado em {new Date(visibleConnectionTest.testedAt).toLocaleString('pt-BR')}.
                  </p>
                ) : null}
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Status do provider</p>
                    <div className="mt-1">
                      <Badge variant={providerStatusVariant(visibleConnectionTest.response?.providerStatus)}>
                        {visibleConnectionTest.response?.providerStatus || visibleConnectionTest.response?.provider || 'Sem status'}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Protocolo</p>
                    <p className="mt-1 text-sm font-mono text-foreground">
                      {visibleConnectionTest.response?.protocol || 'Sem protocolo'}
                    </p>
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-xs text-muted-foreground">Mensagem sanitizada</p>
                  <p className="mt-1 text-sm text-foreground">
                    {visibleConnectionTest.response?.providerMessage || visibleConnectionTest.errorMessage || 'Sem mensagem adicional do provider.'}
                  </p>
                </div>
              </div>
            ) : null}

            {canManageIntegrations ? (
              <>
                <div className="field-stack">
                  <Label htmlFor="integration-name">Nome da conexão</Label>
                  <Input id="integration-name" value={name} onChange={(event) => setName(event.target.value)} />
                </div>

                <div className="field-stack">
                  <Label>Ambiente</Label>
                  <Select value={environment} onValueChange={(value) => setEnvironment(value as 'SANDBOX' | 'PRODUCTION')}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o ambiente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SANDBOX">Sandbox</SelectItem>
                      <SelectItem value="PRODUCTION">Produção</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="field-stack">
                  <div className="flex items-center justify-between gap-4 rounded-2xl border px-4 py-4">
                    <div>
                      <Label htmlFor="integration-active" className="text-sm font-medium">
                        Conexão ativa
                      </Label>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Conexões inativas não entram na trilha operacional até serem reativadas.
                      </p>
                    </div>
                    <Switch id="integration-active" checked={active} onCheckedChange={setActive} />
                  </div>
                </div>

                <div className="field-stack">
                  <Label htmlFor="integration-token">
                    {editingConnectionId ? 'Novo token (opcional)' : 'Token'}
                  </Label>
                  <Input id="integration-token" type="password" value={token} onChange={(event) => setToken(event.target.value)} />
                </div>

                <div className="field-stack">
                  <Label htmlFor="integration-edi">
                    {editingConnectionId ? 'Novo código EDI / identificador (opcional)' : 'Código EDI / identificador'}
                  </Label>
                  <Input id="integration-edi" value={ediCode} onChange={(event) => setEdiCode(event.target.value)} />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="field-stack">
                    <Label htmlFor="integration-timeout">Timeout do provider (ms)</Label>
                    <Input
                      id="integration-timeout"
                      inputMode="numeric"
                      value={timeoutMs}
                      onChange={(event) => setTimeoutMs(event.target.value)}
                    />
                  </div>
                  <div className="field-stack">
                    <Label htmlFor="integration-retries">Máximo de retentativas</Label>
                    <Input
                      id="integration-retries"
                      inputMode="numeric"
                      value={maxRetries}
                      onChange={(event) => setMaxRetries(event.target.value)}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-2">
                  <Button onClick={handleSaveConnection} disabled={saving}>
                    {saving
                      ? 'Salvando...'
                      : editingConnectionId
                        ? 'Salvar alterações'
                        : 'Criar conexão'}
                  </Button>
                  {editingConnectionId ? (
                    <Button variant="outline" onClick={resetConnectionForm} disabled={saving}>
                      Cancelar edição
                    </Button>
                  ) : null}
                  <Button variant="outline" onClick={handleBootstrapMappings} disabled={bootstrapping}>
                    {bootstrapping ? 'Gerando...' : 'Criar mapeamentos padrão'}
                  </Button>
                </div>
              </>
            ) : editingConnection ? (
              <div className="space-y-4 rounded-2xl border bg-muted/20 px-4 py-4 text-sm text-muted-foreground">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Nome</p>
                    <p className="mt-1 font-medium text-foreground">{editingConnection.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Ambiente</p>
                    <p className="mt-1 text-foreground">{editingConnection.environment}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <div className="mt-1">
                      <Badge variant={editingConnection.status === 'ACTIVE' ? 'default' : editingConnection.status === 'ERROR' ? 'destructive' : 'secondary'}>
                        {editingConnection.status}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Último sync</p>
                    <p className="mt-1 text-foreground">
                      {editingConnection.lastSyncAt ? new Date(editingConnection.lastSyncAt).toLocaleString('pt-BR') : 'Nunca'}
                    </p>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Credenciais</p>
                    <p className="mt-1 text-foreground">
                      {editingConnection.credentials?.configured ? 'Configuradas e mascaradas' : 'Não configuradas'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Parâmetros atuais</p>
                    <p className="mt-1 text-foreground">
                      {editingConnection.settings?.timeoutMs ?? 10000} ms • {editingConnection.settings?.maxRetries ?? 3} retentativas
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed px-4 py-6 text-sm text-muted-foreground">
                Selecione `Visualizar` em uma conexão para revisar o cadastro técnico e o último teste sem abrir edição.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
        </>
      )}
    </div>
  )
}
