'use client'

import { useEffect, useState, useMemo } from 'react'
import { toast } from 'sonner'
import Link from 'next/link'
import {
  Plus,
  RotateCw,
  Play,
  Settings2,
} from 'lucide-react'

import { useAuth } from '@/context/auth-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FilterPopover } from '@/components/ui/filter-popover'
import {
  ConnectionDialog,
  ConnectionRecord,
  ProviderDescriptor,
} from '@/components/integrations/connection-dialog'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'

type ProviderResponsePayload = {
  provider?: string | null
  providerStatus?: string | null
  providerMessage?: string | null
  protocol?: string | null
  processedAt?: string | null
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

type SyncRunRecord = {
  id: string
  provider: string
  mode: string
  status: string
  scheduledFor?: string | null
  completedAt?: string | null
  createdAt: string
  itemCounts?: {
    total: number
    applied: number
    conflicts: number
    skipped: number
  }
}

export default function IntegrationsPage() {
  const { hasPermission } = useAuth()
  const canManageIntegrations = hasPermission('integrations.manage')
  const canViewIntegrations = hasPermission('integrations.view')

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [connections, setConnections] = useState<ConnectionRecord[]>([])
  const [providers, setProviders] = useState<ProviderDescriptor[]>([])
  const [events, setEvents] = useState<EventRecord[]>([])
  const [logs, setLogs] = useState<LogRecord[]>([])
  const [syncRuns, setSyncRuns] = useState<SyncRunRecord[]>([])

  // Filtros flutuantes
  const [filterProvider, setFilterProvider] = useState<string>('ALL')
  const [filterStatus, setFilterStatus] = useState<string>('ALL')
  const [filterEnv, setFilterEnv] = useState<string>('ALL')

  // Estado do ConnectionDialog
  const [dialogOpen, setDialogOpen] = useState<boolean>(false)
  const [selectedConnection, setSelectedConnection] = useState<ConnectionRecord | null>(null)

  // Ações de conexão
  const [testingConnectionId, setTestingConnectionId] = useState<string | null>(null)
  const [togglingStatusId, setTogglingStatusId] = useState<string | null>(null)

  useEffect(() => {
    if (!canViewIntegrations) {
      setLoading(false)
      return
    }
    void loadData(true)
  }, [canViewIntegrations])

  async function loadData(showLoadingState = true) {
    if (showLoadingState) {
      setLoading(true)
    } else {
      setRefreshing(true)
    }

    try {
      const [connRes, provRes, eventsRes, logsRes, runsRes] = await Promise.allSettled([
        api.get<ConnectionRecord[]>('/integrations/connections'),
        api.get<ProviderDescriptor[]>('/integrations/providers'),
        api.get<EventRecord[]>('/integrations/events'),
        api.get<LogRecord[]>('/integrations/logs'),
        api.get<SyncRunRecord[]>('/integrations/runs'),
      ])

      if (connRes.status === 'fulfilled') {
        const data = connRes.value.data as unknown
        setConnections(Array.isArray(data) ? data : (data as { items?: ConnectionRecord[] })?.items ?? [])
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
      if (eventsRes.status === 'fulfilled') {
        const data = eventsRes.value.data as unknown
        setEvents(Array.isArray(data) ? data : (data as { items?: EventRecord[] })?.items ?? [])
      }
      if (logsRes.status === 'fulfilled') {
        const data = logsRes.value.data as unknown
        setLogs(Array.isArray(data) ? data : (data as { items?: LogRecord[] })?.items ?? [])
      }
      if (runsRes.status === 'fulfilled') {
        const data = runsRes.value.data as unknown
        setSyncRuns(
          Array.isArray(data)
            ? data
            : (data as { items?: SyncRunRecord[]; runs?: SyncRunRecord[] })?.items ??
              (data as { runs?: SyncRunRecord[] })?.runs ??
              [],
        )
      }
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Erro ao carregar dados de integração.'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleTestConnection = async (conn: ConnectionRecord) => {
    setTestingConnectionId(conn.id)
    try {
      const { data } = await api.post<{ ok: boolean; errorMessage?: string }>(
        `/integrations/connections/${conn.id}/test`,
      )
      if (data.ok) {
        toast.success(`Conexão "${conn.name}" testada com sucesso!`)
      } else {
        toast.error(`Falha no teste da conexão: ${data.errorMessage ?? 'Provedor indisponível'}`)
      }
      void loadData(false)
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Falha ao executar teste de conexão.'))
    } finally {
      setTestingConnectionId(null)
    }
  }

  const handleToggleStatus = async (conn: ConnectionRecord) => {
    setTogglingStatusId(conn.id)
    const newStatus = conn.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    try {
      await api.patch(`/integrations/connections/${conn.id}`, {
        active: newStatus === 'ACTIVE',
      })
      toast.success(
        `Conexão "${conn.name}" ${newStatus === 'ACTIVE' ? 'ativada' : 'inativada'} com sucesso.`,
      )
      void loadData(false)
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Não foi possível alterar status da conexão.'))
    } finally {
      setTogglingStatusId(null)
    }
  }

  // Filtragem das conexões
  const filteredConnections = useMemo(() => {
    return connections.filter((c) => {
      if (filterProvider !== 'ALL' && c.provider !== filterProvider) return false
      if (filterStatus !== 'ALL' && c.status !== filterStatus) return false
      if (filterEnv !== 'ALL' && c.environment !== filterEnv) return false
      return true
    })
  }, [connections, filterProvider, filterStatus, filterEnv])

  const activeFilterCount =
    (filterProvider !== 'ALL' ? 1 : 0) +
    (filterStatus !== 'ALL' ? 1 : 0) +
    (filterEnv !== 'ALL' ? 1 : 0)

  const handleClearFilters = () => {
    setFilterProvider('ALL')
    setFilterStatus('ALL')
    setFilterEnv('ALL')
  }

  // KPIs
  const totalConnections = connections.length
  const activeConnections = connections.filter((c) => c.status === 'ACTIVE').length
  const totalRuns = syncRuns.length
  const successRuns = syncRuns.filter((r) => r.status === 'SUCCEEDED' || r.status === 'PREVIEW_READY').length
  const successRate = totalRuns > 0 ? Math.round((successRuns / totalRuns) * 100) : 100

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
      {/* 1. CABEÇALHO TOCLOG PADRÃO */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Hub de Integrações
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestão centralizada de conexões externas, mensageria e sincronizações organizacionais.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canManageIntegrations && (
            <Button
              onClick={() => {
                setSelectedConnection(null)
                setDialogOpen(true)
              }}
              size="sm"
              className="h-9 gap-1.5 font-semibold"
            >
              <Plus className="size-4" />
              <span>Nova Conexão</span>
            </Button>
          )}

          {/* Menu Flutuante de Filtro */}
          <FilterPopover
            activeCount={activeFilterCount}
            onClear={handleClearFilters}
            title="Filtrar Conexões"
          >
            <div className="space-y-3 p-1">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Provedor</Label>
                <Select value={filterProvider} onValueChange={setFilterProvider}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos os provedores</SelectItem>
                    <SelectItem value="ELOFY">Elofy</SelectItem>
                    <SelectItem value="SSW">SSW</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos os status</SelectItem>
                    <SelectItem value="ACTIVE">Ativo</SelectItem>
                    <SelectItem value="INACTIVE">Inativo</SelectItem>
                    <SelectItem value="ERROR">Erro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Ambiente</Label>
                <Select value={filterEnv} onValueChange={setFilterEnv}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos os ambientes</SelectItem>
                    <SelectItem value="PRODUCTION">Produção</SelectItem>
                    <SelectItem value="SANDBOX">Sandbox</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </FilterPopover>

          {/* Botão Atualizar */}
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            onClick={() => void loadData(false)}
            disabled={loading || refreshing}
          >
            <RotateCw className={`size-4 ${loading || refreshing ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </Button>
        </div>
      </section>

      {/* 2. CARDS DE INDICADORES OPERACIONAIS (4 COLUNAS TOCLOG) */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="p-4 transition-all hover:shadow-xs border-border/60">
          <CardContent className="p-0 space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
              Total Conexões
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-bold tracking-tight text-foreground">
                {loading ? <Skeleton className="h-8 w-12" /> : totalConnections}
              </span>
              <Badge variant="outline" className="text-xs font-normal">
                Multi-Sistema
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="p-4 transition-all hover:shadow-xs border-border/60">
          <CardContent className="p-0 space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
              Conexões Ativas
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                {loading ? <Skeleton className="h-8 w-12" /> : activeConnections}
              </span>
              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 text-xs">
                {totalConnections > 0 ? `${Math.round((activeConnections / totalConnections) * 100)}% online` : '0%'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="p-4 transition-all hover:shadow-xs border-border/60">
          <CardContent className="p-0 space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
              Rotinas & Execuções
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-bold tracking-tight text-foreground">
                {loading ? <Skeleton className="h-8 w-12" /> : totalRuns}
              </span>
              <Badge variant="secondary" className="text-xs font-normal">
                Histórico
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="p-4 transition-all hover:shadow-xs border-border/60">
          <CardContent className="p-0 space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
              Taxa de Sucesso
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-bold tracking-tight text-foreground">
                {loading ? <Skeleton className="h-8 w-12" /> : `${successRate}%`}
              </span>
              <Badge
                variant={successRate >= 95 ? 'default' : 'destructive'}
                className="text-xs font-normal"
              >
                {successRate >= 95 ? 'Operacional' : 'Atenção'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* 3. ABAS OPERACIONAIS */}
      <Tabs defaultValue="connections" className="space-y-4">
        <TabsList className="h-10 p-1">
          <TabsTrigger value="connections" className="text-xs sm:text-sm">
            Conexões ({filteredConnections.length})
          </TabsTrigger>
          <TabsTrigger value="sync-runs" className="text-xs sm:text-sm">
            Sincronizações Organizacionais ({syncRuns.length})
          </TabsTrigger>
          <TabsTrigger value="events" className="text-xs sm:text-sm">
            Eventos Outbound ({events.length})
          </TabsTrigger>
          <TabsTrigger value="logs" className="text-xs sm:text-sm">
            Auditoria & Logs ({logs.length})
          </TabsTrigger>
        </TabsList>

        {/* ABA: CONEXÕES */}
        <TabsContent value="connections" className="space-y-4">
          <Card className="border-border/60 overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Provedor</TableHead>
                    <TableHead>Nome da Conexão</TableHead>
                    <TableHead className="w-[120px]">Ambiente</TableHead>
                    <TableHead className="w-[110px]">Status</TableHead>
                    <TableHead className="w-[180px]">Última Sincronização</TableHead>
                    <TableHead className="text-right w-[200px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-8 w-28 ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : filteredConnections.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                        Nenhuma conexão encontrada com os filtros selecionados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredConnections.map((conn) => (
                      <TableRow key={conn.id} className="hover:bg-muted/30">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={
                                conn.provider === 'ELOFY'
                                  ? 'border-blue-500/30 text-blue-600 bg-blue-500/5'
                                  : 'border-orange-500/30 text-orange-600 bg-orange-500/5'
                              }
                            >
                              {conn.provider}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {conn.provider === 'ELOFY' ? 'RH/Org' : 'Logística'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <Link
                              href={`/dashboard/integrations/${conn.id}`}
                              className="font-semibold text-foreground hover:text-primary transition-colors hover:underline"
                            >
                              {conn.name}
                            </Link>
                            <span className="text-xs text-muted-foreground font-mono truncate max-w-[240px]">
                              ID: {conn.id}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs font-normal">
                            {conn.environment}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`size-2 rounded-full ${
                                conn.status === 'ACTIVE'
                                  ? 'bg-emerald-500'
                                  : conn.status === 'ERROR'
                                    ? 'bg-rose-500'
                                    : 'bg-muted-foreground'
                              }`}
                            />
                            <span className="text-xs font-medium">
                              {conn.status === 'ACTIVE'
                                ? 'Ativo'
                                : conn.status === 'ERROR'
                                  ? 'Erro'
                                  : 'Inativo'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {conn.lastSyncAt ? new Date(conn.lastSyncAt).toLocaleString('pt-BR') : 'Nunca executada'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2.5 text-xs gap-1"
                              asChild
                            >
                              <Link href={`/dashboard/integrations/${conn.id}`}>
                                <Settings2 className="size-3" />
                                <span>Gerenciar</span>
                              </Link>
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2.5 text-xs gap-1"
                              onClick={() => void handleTestConnection(conn)}
                              disabled={testingConnectionId === conn.id}
                            >
                              <Play className={`size-3 ${testingConnectionId === conn.id ? 'animate-spin' : ''}`} />
                              <span>Testar</span>
                            </Button>

                            {canManageIntegrations && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-2.5 text-xs"
                                  onClick={() => {
                                    setSelectedConnection(conn)
                                    setDialogOpen(true)
                                  }}
                                >
                                  Editar
                                </Button>

                                <Switch
                                  checked={conn.status === 'ACTIVE'}
                                  onCheckedChange={() => void handleToggleStatus(conn)}
                                  disabled={togglingStatusId === conn.id}
                                  className="scale-75"
                                />
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* ABA: SINCRONIZAÇÕES ORGANIZACIONAIS */}
        <TabsContent value="sync-runs" className="space-y-4">
          <Card className="border-border/60 overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[140px]">Execução ID</TableHead>
                    <TableHead className="w-[120px]">Provedor</TableHead>
                    <TableHead className="w-[120px]">Modo</TableHead>
                    <TableHead className="w-[130px]">Status</TableHead>
                    <TableHead>Resumo do Plano</TableHead>
                    <TableHead className="w-[180px]">Data Criação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {syncRuns.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                        Nenhuma sincronização organizacional registrada até o momento.
                      </TableCell>
                    </TableRow>
                  ) : (
                    syncRuns.map((run) => (
                      <TableRow key={run.id} className="hover:bg-muted/30">
                        <TableCell className="font-mono text-xs">{run.id.slice(0, 8)}...</TableCell>
                        <TableCell>
                          <Badge variant="outline">{run.provider}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {run.mode}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              run.status === 'SUCCEEDED' || run.status === 'PREVIEW_READY'
                                ? 'bg-emerald-500/10 text-emerald-600'
                                : run.status === 'FAILED'
                                  ? 'bg-rose-500/10 text-rose-600'
                                  : 'bg-muted text-muted-foreground'
                            }
                          >
                            {run.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {run.itemCounts
                            ? `${run.itemCounts.total} itens (${run.itemCounts.applied} aplicados, ${run.itemCounts.conflicts} conflitos)`
                            : 'Plano em processamento'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(run.createdAt).toLocaleString('pt-BR')}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* ABA: EVENTOS OUTBOUND */}
        <TabsContent value="events" className="space-y-4">
          <Card className="border-border/60 overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[140px]">Operação</TableHead>
                    <TableHead className="w-[120px]">Entidade</TableHead>
                    <TableHead className="w-[120px]">Status</TableHead>
                    <TableHead className="w-[100px]">Tentativas</TableHead>
                    <TableHead>Mensagem de Retorno</TableHead>
                    <TableHead className="w-[180px]">Atualização</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                        Nenhum evento outbound registrado no momento.
                      </TableCell>
                    </TableRow>
                  ) : (
                    events.map((ev) => (
                      <TableRow key={ev.id} className="hover:bg-muted/30">
                        <TableCell className="font-semibold text-xs">{ev.providerOperation}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{ev.entityType}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{ev.status}</Badge>
                        </TableCell>
                        <TableCell className="text-xs">{ev.attempts}</TableCell>
                        <TableCell className="text-xs text-muted-foreground truncate max-w-[280px]">
                          {ev.errorMessage ?? ev.responsePayload?.providerMessage ?? 'OK'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(ev.updatedAt).toLocaleString('pt-BR')}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* ABA: LOGS DO SISTEMA */}
        <TabsContent value="logs" className="space-y-4">
          <Card className="border-border/60 overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Método</TableHead>
                    <TableHead>Endpoint</TableHead>
                    <TableHead className="w-[140px]">Operação</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead className="w-[180px]">Data / Hora</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                        Nenhum log registrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => (
                      <TableRow key={log.id} className="hover:bg-muted/30">
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs">
                            {log.method}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-foreground truncate max-w-[320px]">
                          {log.endpoint}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-semibold">
                          {log.providerOperation}
                        </TableCell>
                        <TableCell>
                          <Badge variant={log.status === 'FAILED' ? 'destructive' : 'secondary'}>
                            {log.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(log.createdAt).toLocaleString('pt-BR')}
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

      {/* MODAL CONNECTION DIALOG TOCLOG */}
      <ConnectionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        connection={selectedConnection}
        providers={providers}
        onSuccess={() => void loadData(false)}
      />
    </div>
  )
}
