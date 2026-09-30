'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { GovernanceFields, QueueGovernance, CategoryEditor, GOVERNANCE_DEFAULTS, type Governance, type GovernanceContext, type Category } from './governance'

import { MenuFunctionHeader } from '@/components/layout/menu-function-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { AlertCircle, Plus, Search, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'

type HelpdeskSettingsRecord = Governance & {
  allowMultipleOpenTickets: boolean
  globalOpenLimit: number
  duplicateWindowHours: number
  reopenWindowDays: number
  autoCloseAfterDays: number
}

type HelpdeskOverview = {
  settings: HelpdeskSettingsRecord
  departments: Array<{ id: string; name: string }>
  categories: Category[]
  queues: Array<{
    id: string
    name: string
    description?: string | null
    departmentId: string
    department?: { name?: string | null } | null
    active: boolean
    autoAssignEnabled: boolean
    allowAgentPickup: boolean
    members?: Array<{ id: string }>
  }>
  catalogItems: Array<{
    id: string
    name: string
    slug: string
    description?: string | null
    departmentId: string
    queueId: string
    slaResponseHours?: number | null
    slaResolveHours?: number | null
    regularizationRequired?: boolean
    ticketCategoryId?: string | null
    defaultPriority: string
    approvalMode: string
    active: boolean
    allowMultipleOpenTickets: boolean
    maxOpenTicketsPerUser?: number | null
    requesterCanClose: boolean
    duplicateWindowHours: number
    reopenWithinDays: number
    department?: { name?: string | null } | null
    queue?: { name?: string | null } | null
    ticketCategory?: { name?: string | null } | null
  }>
  closeReasons: Array<{ id: string; name: string; active: boolean }>
  transferReasons: Array<{ id: string; name: string; active: boolean }>
}

type QueueFormState = {
  id: string | null
  name: string
  description: string
  departmentId: string
  active: boolean
  autoAssignEnabled: boolean
  allowAgentPickup: boolean
}

type CatalogFormState = {
  id: string | null
  name: string
  slug: string
  description: string
  departmentId: string
  queueId: string
  ticketCategoryId: string
  slaResponseHours: string
  slaResolveHours: string
  defaultPriority: string
  approvalMode: string
  active: boolean
  allowMultipleOpenTickets: boolean
  maxOpenTicketsPerUser: string
  requesterCanClose: boolean
  duplicateWindowHours: string
  reopenWithinDays: string
}

const EMPTY_QUEUE_FORM: QueueFormState = {
  id: null,
  name: '',
  description: '',
  departmentId: '',
  active: true,
  autoAssignEnabled: false,
  allowAgentPickup: true,
}

const EMPTY_CATALOG_FORM: CatalogFormState = {
  id: null,
  name: '',
  slug: '',
  description: '',
  departmentId: '',
  queueId: '',
  ticketCategoryId: 'none',
  slaResponseHours: '',
  slaResolveHours: '',
  defaultPriority: 'MEDIUM',
  approvalMode: 'NONE',
  active: true,
  allowMultipleOpenTickets: true,
  maxOpenTicketsPerUser: '',
  requesterCanClose: true,
  duplicateWindowHours: '24',
  reopenWithinDays: '5',
}

export default function HelpdeskSettingsPage() {
  const [context, setContext] = useState<GovernanceContext | null>(null)
  const [loadError, setLoadError] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingSettings, setSavingSettings] = useState(false)
  const [runningAutoClose, setRunningAutoClose] = useState(false)
  const [savingQueue, setSavingQueue] = useState(false)
  const [savingCatalog, setSavingCatalog] = useState(false)
  const [overview, setOverview] = useState<HelpdeskOverview | null>(null)
  const [settings, setSettings] = useState<HelpdeskSettingsRecord>({
    ...GOVERNANCE_DEFAULTS,
    allowMultipleOpenTickets: true,
    globalOpenLimit: 5,
    duplicateWindowHours: 24,
    reopenWindowDays: 5,
    autoCloseAfterDays: 7,
  })
  const [queueForm, setQueueForm] = useState<QueueFormState>(EMPTY_QUEUE_FORM)
  const [catalogForm, setCatalogForm] = useState<CatalogFormState>(EMPTY_CATALOG_FORM)

  // Estados de modais e filtros
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false)
  const [queueSearch, setQueueSearch] = useState('')
  const [queueStatusFilter, setQueueStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false)
  const [catalogSearch, setCatalogSearch] = useState('')

  useEffect(() => {
    void loadOverview()
  }, [])

  async function loadOverview() {
    setLoading(true)
    try {
      setLoadError('')
      const { data: access } = await api.get<GovernanceContext>('/helpdesk/context')
      setContext(access)
      if (!access.capabilities.settings) { setOverview(null); return }
      const { data } = await api.get<HelpdeskOverview>('/helpdesk/admin/overview')
      setOverview(data)
      setSettings({ ...GOVERNANCE_DEFAULTS, ...data.settings })
      if (!queueForm.departmentId && data.departments[0]) {
        setQueueForm((current) => ({ ...current, departmentId: data.departments[0].id }))
      }
      if (!catalogForm.departmentId && data.departments[0]) {
        const firstQueue = data.queues.find((queue) => queue.departmentId === data.departments[0].id)
        setCatalogForm((current) => ({
          ...current,
          departmentId: data.departments[0].id,
          queueId: firstQueue?.id || current.queueId,
        }))
      }
    } catch (error) {
      setLoadError(getApiErrorMessage(error, 'Não foi possível carregar a governança do helpdesk.'))
      toast.error(
        getApiErrorMessage(error, 'Não foi possível carregar a governança do helpdesk.'),
      )
    } finally {
      setLoading(false)
    }
  }

  function startQueueEdit(queue?: HelpdeskOverview['queues'][number]) {
    if (!queue) {
      setQueueForm({
        ...EMPTY_QUEUE_FORM,
        departmentId: overview?.departments[0]?.id || '',
      })
    } else {
      setQueueForm({
        id: queue.id,
        name: queue.name,
        description: queue.description || '',
        departmentId: queue.departmentId,
        active: queue.active,
        autoAssignEnabled: queue.autoAssignEnabled,
        allowAgentPickup: queue.allowAgentPickup,
      })
    }
    setIsQueueModalOpen(true)
  }

  function startCatalogEdit(item?: HelpdeskOverview['catalogItems'][number]) {
    if (!item) {
      const defaultDepartmentId = overview?.departments[0]?.id || ''
      const defaultQueueId =
        overview?.queues.find((queue) => queue.departmentId === defaultDepartmentId)?.id || ''
      setCatalogForm({
        ...EMPTY_CATALOG_FORM,
        departmentId: defaultDepartmentId,
        queueId: defaultQueueId,
      })
    } else {
      setCatalogForm({
        id: item.id,
        name: item.name,
        slug: item.slug,
        description: item.description || '',
        departmentId: item.departmentId,
        queueId: item.queueId,
        ticketCategoryId: item.ticketCategoryId || 'none',
        slaResponseHours: item.slaResponseHours == null ? '' : String(item.slaResponseHours),
        slaResolveHours: item.slaResolveHours == null ? '' : String(item.slaResolveHours),
        defaultPriority: item.defaultPriority,
        approvalMode: item.approvalMode,
        active: item.active,
        allowMultipleOpenTickets: item.allowMultipleOpenTickets,
        maxOpenTicketsPerUser: item.maxOpenTicketsPerUser ? String(item.maxOpenTicketsPerUser) : '',
        requesterCanClose: item.requesterCanClose,
        duplicateWindowHours: String(item.duplicateWindowHours),
        reopenWithinDays: String(item.reopenWithinDays),
      })
    }
    setIsCatalogModalOpen(true)
  }

  const filteredQueues = useMemo(() => {
    return (overview?.queues || []).filter((queue) => {
      const matchesSearch =
        queue.name.toLowerCase().includes(queueSearch.toLowerCase()) ||
        (queue.description || '').toLowerCase().includes(queueSearch.toLowerCase())
      const matchesStatus =
        queueStatusFilter === 'all'
          ? true
          : queueStatusFilter === 'active'
          ? queue.active
          : !queue.active
      return matchesSearch && matchesStatus
    })
  }, [overview?.queues, queueSearch, queueStatusFilter])

  const filteredCatalogItems = useMemo(() => {
    return (overview?.catalogItems || []).filter((item) => {
      return (
        item.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
        (item.description || '').toLowerCase().includes(catalogSearch.toLowerCase()) ||
        (item.department?.name || '').toLowerCase().includes(catalogSearch.toLowerCase()) ||
        (item.queue?.name || '').toLowerCase().includes(catalogSearch.toLowerCase())
      )
    })
  }, [overview?.catalogItems, catalogSearch])

  const filteredQueuesForCatalog = useMemo(() => {
    return overview?.queues.filter((queue) => queue.departmentId === catalogForm.departmentId) || []
  }, [catalogForm.departmentId, overview?.queues])

  async function handleSaveSettings() {
    setSavingSettings(true)
    try {
      const { data } = await api.patch<HelpdeskSettingsRecord>('/helpdesk/settings', {
        agentScope: settings.agentScope,
        openingApprovalMode: settings.openingApprovalMode,
        firstResponseMode: settings.firstResponseMode,
        startSlaAfterApproval: settings.startSlaAfterApproval,
        pauseWhileWaitingUser: settings.pauseWhileWaitingUser,
        pauseWhileWaitingThirdParty: settings.pauseWhileWaitingThirdParty,
        reopenSlaMode: settings.reopenSlaMode,
        cancelRequiresApproval: settings.cancelRequiresApproval,
        fallbackApproverUserId: settings.fallbackApproverUserId,
        allowMultipleOpenTickets: settings.allowMultipleOpenTickets,
        globalOpenLimit: Number(settings.globalOpenLimit || 1),
        duplicateWindowHours: Number(settings.duplicateWindowHours || 1),
        reopenWindowDays: Number(settings.reopenWindowDays || 1),
        autoCloseAfterDays: Number(settings.autoCloseAfterDays || 1),
      })
      setSettings(data)
      toast.success('Configurações globais do helpdesk atualizadas.')
      await loadOverview()
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, 'Não foi possível salvar as configurações do helpdesk.'),
      )
    } finally {
      setSavingSettings(false)
    }
  }

  async function handleSaveQueue() {
    setSavingQueue(true)
    try {
      const payload = {
        name: queueForm.name,
        description: queueForm.description,
        departmentId: queueForm.departmentId,
        active: queueForm.active,
        autoAssignEnabled: queueForm.autoAssignEnabled,
        allowAgentPickup: queueForm.allowAgentPickup,
      }

      if (queueForm.id) {
        await api.patch(`/helpdesk/queues/${queueForm.id}`, payload)
        toast.success('Fila atualizada com sucesso.')
      } else {
        await api.post('/helpdesk/queues', payload)
        toast.success('Fila criada com sucesso.')
      }

      setIsQueueModalOpen(false)
      setQueueForm(EMPTY_QUEUE_FORM)
      await loadOverview()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível salvar a fila.'))
    } finally {
      setSavingQueue(false)
    }
  }

  async function handleRunAutoClose() {
    setRunningAutoClose(true)
    try {
      const { data } = await api.post<{
        scanned: number
        closed: number
        closedTicketIds: string[]
      }>('/helpdesk/jobs/auto-close')

      toast.success(
        data.closed > 0
          ? `${data.closed} chamado(s) fechados automaticamente nesta execução.`
          : `Nenhum chamado precisou de auto fechamento. ${data.scanned} resolvido(s) analisado(s).`,
      )
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, 'Não foi possível executar o auto fechamento manual.'),
      )
    } finally {
      setRunningAutoClose(false)
    }
  }

  const validCatalog = (!catalogForm.active || !!overview?.categories.some(c => c.id === catalogForm.ticketCategoryId && c.active)) && [catalogForm.slaResponseHours, catalogForm.slaResolveHours].every(value => value === '' || (Number.isInteger(Number(value)) && Number(value) > 0))

  async function handleSaveCatalog() {
    if (!validCatalog) { toast.error('Selecione categoria ativa e metas inteiras positivas ou herança.'); return }
    setSavingCatalog(true)
    try {
      const payload = {
        slaResponseHours: catalogForm.slaResponseHours === '' ? null : Number(catalogForm.slaResponseHours),
        slaResolveHours: catalogForm.slaResolveHours === '' ? null : Number(catalogForm.slaResolveHours),
        name: catalogForm.name,
        slug: catalogForm.slug || undefined,
        description: catalogForm.description || undefined,
        departmentId: catalogForm.departmentId,
        queueId: catalogForm.queueId,
        ticketCategoryId:
          catalogForm.ticketCategoryId !== 'none' ? catalogForm.ticketCategoryId : undefined,
        defaultPriority: catalogForm.defaultPriority,
        approvalMode: catalogForm.approvalMode,
        active: catalogForm.active,
        allowMultipleOpenTickets: catalogForm.allowMultipleOpenTickets,
        maxOpenTicketsPerUser: catalogForm.maxOpenTicketsPerUser
          ? Number(catalogForm.maxOpenTicketsPerUser)
          : undefined,
        requesterCanClose: catalogForm.requesterCanClose,
        duplicateWindowHours: Number(catalogForm.duplicateWindowHours || 24),
        reopenWithinDays: Number(catalogForm.reopenWithinDays || 5),
      }

      if (catalogForm.id) {
        await api.patch(`/helpdesk/catalog/${catalogForm.id}`, payload)
        toast.success('Serviço atualizado com sucesso.')
      } else {
        await api.post('/helpdesk/catalog', payload)
        toast.success('Serviço criado com sucesso.')
      }

      setIsCatalogModalOpen(false)
      setCatalogForm(EMPTY_CATALOG_FORM)
      await loadOverview()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível salvar o serviço.'))
    } finally {
      setSavingCatalog(false)
    }
  }

  if (!loading && !context?.capabilities.settings) return <div className="app-page">
    <MenuFunctionHeader title="Helpdesk > Gestão de filas" description="Administre somente as filas sob sua responsabilidade." />
    {loadError ? <p role="alert">{loadError}</p> : context?.capabilities.manageQueues ? <QueueGovernance context={context} /> : <p role="alert">Você não tem permissão para administrar o Helpdesk.</p>}
    <Button variant="outline" onClick={() => void loadOverview()}>Atualizar</Button>
  </div>

  return (
    <div className="app-page">
      <MenuFunctionHeader
        title="Helpdesk > Configurações"
        description="Área de governança da Central de Atendimento. Aqui a empresa controla limites operacionais, filas e catálogo de serviços do helpdesk."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="rounded-full px-4 py-2">
              Governança por empresa
            </Badge>
            <Button variant="outline" onClick={() => void loadOverview()}>
              Atualizar
            </Button>
          </div>
        }
      />

      {loadError && <p role="alert">{loadError}</p>}
      <Tabs defaultValue="settings" className="space-y-6">
        <TabsList className="grid w-full max-w-[720px] grid-cols-3">
          <TabsTrigger value="settings">Configurações</TabsTrigger>
          <TabsTrigger value="queues">Filas</TabsTrigger>
          <TabsTrigger value="catalog">Catálogo</TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <Card className="app-section-card">
            <CardHeader>
              <CardTitle className="text-xl">Regras globais do módulo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {loading ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-24 rounded-2xl" />
                  ))}
                </div>
              ) : (
                <>
                  <GovernanceFields value={settings} onChange={patch => setSettings(current => ({ ...current, ...patch }))} />
                  <div className="flex items-center justify-between rounded-2xl border border-border bg-muted/20 px-4 py-4">
                    <div className="space-y-1">
                      <p className="font-medium">Permitir múltiplos chamados abertos</p>
                      <p className="text-sm text-muted-foreground">
                        Define se o colaborador pode acumular mais de um chamado ativo ao mesmo tempo.
                      </p>
                    </div>
                    <Switch
                      checked={settings.allowMultipleOpenTickets}
                      onCheckedChange={(value) =>
                        setSettings((current) => ({
                          ...current,
                          allowMultipleOpenTickets: value,
                        }))
                      }
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="field-stack">
                      <Label htmlFor="global-open-limit">Limite global de chamados abertos</Label>
                      <Input
                        id="global-open-limit"
                        type="number"
                        min={1}
                        value={String(settings.globalOpenLimit)}
                        onChange={(event) =>
                          setSettings((current) => ({
                            ...current,
                            globalOpenLimit: Number(event.target.value || 1),
                          }))
                        }
                      />
                    </div>
                    <div className="field-stack">
                      <Label htmlFor="duplicate-window-hours">Janela de duplicidade (horas)</Label>
                      <Input
                        id="duplicate-window-hours"
                        type="number"
                        min={1}
                        value={String(settings.duplicateWindowHours)}
                        onChange={(event) =>
                          setSettings((current) => ({
                            ...current,
                            duplicateWindowHours: Number(event.target.value || 1),
                          }))
                        }
                      />
                    </div>
                    <div className="field-stack">
                      <Label htmlFor="reopen-window-days">Janela de reabertura (dias)</Label>
                      <Input
                        id="reopen-window-days"
                        type="number"
                        min={1}
                        value={String(settings.reopenWindowDays)}
                        onChange={(event) =>
                          setSettings((current) => ({
                            ...current,
                            reopenWindowDays: Number(event.target.value || 1),
                          }))
                        }
                      />
                    </div>
                    <div className="field-stack">
                      <Label htmlFor="auto-close-after-days">Base para auto fechamento (dias)</Label>
                      <Input
                        id="auto-close-after-days"
                        type="number"
                        min={1}
                        value={String(settings.autoCloseAfterDays)}
                        onChange={(event) =>
                          setSettings((current) => ({
                            ...current,
                            autoCloseAfterDays: Number(event.target.value || 1),
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <div className="flex flex-wrap justify-end gap-3">
                      <Button
                        variant="outline"
                        onClick={() => void handleRunAutoClose()}
                        disabled={runningAutoClose}
                      >
                        {runningAutoClose ? 'Executando...' : 'Rodar auto fechamento agora'}
                      </Button>
                      <Button onClick={() => void handleSaveSettings()} disabled={savingSettings}>
                        {savingSettings ? 'Salvando...' : 'Salvar configurações'}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queues" className="space-y-6">
          {context?.capabilities.manageQueues && (
            <QueueGovernance context={context} />
          )}

          <Card className="app-section-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xl">Filas configuradas</CardTitle>
              {context?.capabilities.manageQueues && (
                <Button size="sm" onClick={() => startQueueEdit()} className="gap-1.5">
                  <Plus className="size-4" />
                  Nova fila
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Barra de busca e filtros de status */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <Input
                    placeholder="Buscar fila pelo nome..."
                    value={queueSearch}
                    onChange={(e) => setQueueSearch(e.target.value)}
                    className="pl-9 h-10"
                  />
                </div>
                <div className="w-full sm:w-[200px]">
                  <Select
                    value={queueStatusFilter}
                    onValueChange={(val: 'all' | 'active' | 'inactive') => setQueueStatusFilter(val)}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os status</SelectItem>
                      <SelectItem value="active">Ativas</SelectItem>
                      <SelectItem value="inactive">Inativas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Grid de 2 colunas para os cards de filas */}
              {loading ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-28 rounded-lg" />
                  ))}
                </div>
              ) : filteredQueues.length ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {filteredQueues.map((queue) => (
                    <div
                      key={queue.id}
                      className="flex items-start justify-between gap-4 rounded-lg border border-border bg-card p-4 transition-all hover:shadow-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-foreground">{queue.name}</p>
                          <Badge variant={queue.active ? 'success' : 'outline'}>
                            {queue.active ? 'Ativa' : 'Inativa'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {queue.department?.name || 'Sem departamento'} · {queue.members?.length || 0} membro(s)
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {queue.description || 'Sem descrição operacional registrada.'}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => startQueueEdit(queue)}>
                        Editar
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  Nenhuma fila cadastrada ou encontrada para os filtros atuais.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Modal: Editar fila / Nova fila */}
          <Dialog open={isQueueModalOpen} onOpenChange={setIsQueueModalOpen}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{queueForm.id ? 'Editar fila' : 'Nova fila'}</DialogTitle>
                <DialogDescription>
                  {queueForm.id
                    ? 'Atualize as configurações e escopo desta fila de atendimento.'
                    : 'Preencha os dados abaixo para cadastrar uma nova fila de atendimento.'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="field-stack">
                  <Label htmlFor="queue-name">Nome</Label>
                  <Input
                    id="queue-name"
                    placeholder="Ex: Fila de Compras"
                    value={queueForm.name}
                    onChange={(event) =>
                      setQueueForm((current) => ({ ...current, name: event.target.value }))
                    }
                  />
                </div>

                <div className="field-stack">
                  <Label htmlFor="queue-department">Departamento</Label>
                  <Select
                    value={queueForm.departmentId || 'none'}
                    onValueChange={(value) =>
                      setQueueForm((current) => ({ ...current, departmentId: value }))
                    }
                  >
                    <SelectTrigger id="queue-department" className="h-10">
                      <SelectValue placeholder="Selecione o departamento" />
                    </SelectTrigger>
                    <SelectContent>
                      {(overview?.departments || []).map((department) => (
                        <SelectItem key={department.id} value={department.id}>
                          {department.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="field-stack">
                  <Label htmlFor="queue-description">Descrição</Label>
                  <Textarea
                    id="queue-description"
                    placeholder="Finalidade e escopo desta fila..."
                    rows={3}
                    value={queueForm.description}
                    onChange={(event) =>
                      setQueueForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div className="space-y-0.5">
                      <span className="text-sm font-medium text-foreground">Fila ativa</span>
                      <p className="text-xs text-muted-foreground">Chamados só chegam a filas ativas</p>
                    </div>
                    <Switch
                      checked={queueForm.active}
                      onCheckedChange={(value) =>
                        setQueueForm((current) => ({ ...current, active: value }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div className="space-y-0.5">
                      <span className="text-sm font-medium text-foreground">Permitir pickup do agente</span>
                      <p className="text-xs text-muted-foreground">A distribuição de chamados é manual</p>
                    </div>
                    <Switch
                      checked={queueForm.allowAgentPickup}
                      onCheckedChange={(value) =>
                        setQueueForm((current) => ({ ...current, allowAgentPickup: value }))
                      }
                    />
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setIsQueueModalOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={() => void handleSaveQueue()}
                  disabled={savingQueue || !queueForm.name.trim() || !context?.capabilities.manageQueues}
                >
                  {savingQueue ? 'Salvando...' : queueForm.id ? 'Salvar alterações' : 'Criar fila'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="catalog" className="space-y-6">
          {context?.capabilities.catalog && (
            <CategoryEditor
              categories={overview?.categories ?? []}
              companyId={context.companyId}
              refresh={loadOverview}
            />
          )}

          {/* Catálogo de serviços em Grid de Cards */}
          <Card className="app-section-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xl">Catálogo de serviços</CardTitle>
              {context?.capabilities.catalog && (
                <Button size="sm" onClick={() => startCatalogEdit()} className="gap-1.5">
                  <Plus className="size-4" />
                  Novo serviço
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Barra de busca de serviços */}
              <div className="relative">
                <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  placeholder="Buscar serviço..."
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  className="pl-9 h-10"
                />
              </div>

              {/* Grid de 3 colunas de serviços */}
              {loading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-36 rounded-lg" />
                  ))}
                </div>
              ) : filteredCatalogItems.length ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredCatalogItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col justify-between rounded-lg border border-border bg-card p-4 transition-all hover:shadow-xs"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-foreground text-sm line-clamp-1">{item.name}</p>
                          <Badge variant={item.active ? 'success' : 'outline'} className="shrink-0 text-xs">
                            {item.active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </div>
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <p>
                            {item.department?.name || 'Sem departamento'} · {item.queue?.name || 'Sem fila'}
                          </p>
                          <p>
                            {item.ticketCategory?.name || 'Sem categoria vinculada'}
                            {item.regularizationRequired ? ' · Regularização necessária' : ''} · prioridade{' '}
                            {item.defaultPriority}
                          </p>
                        </div>
                      </div>

                      <div className="pt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs font-medium"
                          onClick={() => startCatalogEdit(item)}
                        >
                          Editar serviço
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  Nenhum serviço cadastrado ou encontrado com a busca.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Modal: Editar serviço / Novo serviço */}
          <Dialog open={isCatalogModalOpen} onOpenChange={setIsCatalogModalOpen}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{catalogForm.id ? 'Editar serviço' : 'Novo serviço'}</DialogTitle>
                <DialogDescription>
                  Configure as metas de SLA, regras operacionais e vinculações deste item no catálogo.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
                  <AlertCircle className="size-4 shrink-0 text-destructive mt-0.5" />
                  <span>
                    Metas em horas corridas. Deixe vazio para herdar da categoria: alterações afetam apenas novos chamados.
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="field-stack">
                    <Label htmlFor="service-response">1ª resposta — vazio p/ herdar</Label>
                    <Input
                      id="service-response"
                      type="number"
                      min={1}
                      step={1}
                      placeholder="Herdar da categoria"
                      value={catalogForm.slaResponseHours}
                      onChange={(e) =>
                        setCatalogForm((current) => ({ ...current, slaResponseHours: e.target.value }))
                      }
                    />
                  </div>
                  <div className="field-stack">
                    <Label htmlFor="service-resolve">Resolução — vazio p/ herdar</Label>
                    <Input
                      id="service-resolve"
                      type="number"
                      min={1}
                      step={1}
                      placeholder="Herdar da categoria"
                      value={catalogForm.slaResolveHours}
                      onChange={(e) =>
                        setCatalogForm((current) => ({ ...current, slaResolveHours: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <div className="field-stack">
                  <Label htmlFor="catalog-name">Nome</Label>
                  <Input
                    id="catalog-name"
                    placeholder="Nome do serviço"
                    value={catalogForm.name}
                    onChange={(event) =>
                      setCatalogForm((current) => ({ ...current, name: event.target.value }))
                    }
                  />
                </div>

                <div className="field-stack">
                  <Label htmlFor="catalog-slug">Slug</Label>
                  <Input
                    id="catalog-slug"
                    placeholder="Opcional: gerado automaticamente se vazio"
                    value={catalogForm.slug}
                    onChange={(event) =>
                      setCatalogForm((current) => ({ ...current, slug: event.target.value }))
                    }
                  />
                </div>

                <div className="field-stack">
                  <Label htmlFor="catalog-description">Descrição</Label>
                  <Textarea
                    id="catalog-description"
                    rows={3}
                    placeholder="Descrição detalhada do serviço..."
                    value={catalogForm.description}
                    onChange={(event) =>
                      setCatalogForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="field-stack">
                    <Label htmlFor="catalog-department">Departamento</Label>
                    <Select
                      value={catalogForm.departmentId || 'none'}
                      onValueChange={(value) =>
                        setCatalogForm((current) => ({
                          ...current,
                          departmentId: value,
                          queueId:
                            overview?.queues.find((queue) => queue.departmentId === value)?.id || '',
                        }))
                      }
                    >
                      <SelectTrigger id="catalog-department" className="h-10">
                        <SelectValue placeholder="Selecione o departamento" />
                      </SelectTrigger>
                      <SelectContent>
                        {(overview?.departments || []).map((department) => (
                          <SelectItem key={department.id} value={department.id}>
                            {department.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="field-stack">
                    <Label htmlFor="catalog-queue">Fila</Label>
                    <Select
                      value={catalogForm.queueId || 'none'}
                      onValueChange={(value) =>
                        setCatalogForm((current) => ({ ...current, queueId: value }))
                      }
                    >
                      <SelectTrigger id="catalog-queue" className="h-10">
                        <SelectValue placeholder="Selecione a fila" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredQueuesForCatalog.map((queue) => (
                          <SelectItem key={queue.id} value={queue.id}>
                            {queue.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="field-stack">
                    <Label htmlFor="catalog-category">Categoria</Label>
                    <Select
                      value={catalogForm.ticketCategoryId}
                      onValueChange={(value) =>
                        setCatalogForm((current) => ({ ...current, ticketCategoryId: value }))
                      }
                    >
                      <SelectTrigger id="catalog-category" className="h-10">
                        <SelectValue placeholder="Selecione a categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem categoria específica</SelectItem>
                        {(overview?.categories || []).map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="field-stack">
                    <Label htmlFor="catalog-priority">Prioridade padrão</Label>
                    <Select
                      value={catalogForm.defaultPriority}
                      onValueChange={(value) =>
                        setCatalogForm((current) => ({ ...current, defaultPriority: value }))
                      }
                    >
                      <SelectTrigger id="catalog-priority" className="h-10">
                        <SelectValue placeholder="Selecione a prioridade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOW">Baixa</SelectItem>
                        <SelectItem value="MEDIUM">Média</SelectItem>
                        <SelectItem value="HIGH">Alta</SelectItem>
                        <SelectItem value="CRITICAL">Crítica</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="field-stack">
                    <Label htmlFor="catalog-approval">Modo de aprovação</Label>
                    <Select
                      value={catalogForm.approvalMode}
                      onValueChange={(value) =>
                        setCatalogForm((current) => ({ ...current, approvalMode: value }))
                      }
                    >
                      <SelectTrigger id="catalog-approval" className="h-10">
                        <SelectValue placeholder="Selecione o modo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">Sem aprovação</SelectItem>
                        <SelectItem value="REQUIRED">Exige aprovação</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="field-stack">
                    <Label htmlFor="catalog-limit">Limite aberto por usuário</Label>
                    <Input
                      id="catalog-limit"
                      type="number"
                      min={1}
                      value={catalogForm.maxOpenTicketsPerUser}
                      onChange={(event) =>
                        setCatalogForm((current) => ({
                          ...current,
                          maxOpenTicketsPerUser: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="field-stack">
                    <Label htmlFor="catalog-duplicate">Janela de duplicidade (h)</Label>
                    <Input
                      id="catalog-duplicate"
                      type="number"
                      min={1}
                      value={catalogForm.duplicateWindowHours}
                      onChange={(event) =>
                        setCatalogForm((current) => ({
                          ...current,
                          duplicateWindowHours: event.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="field-stack">
                    <Label htmlFor="catalog-reopen">Janela de reabertura (dias)</Label>
                    <Input
                      id="catalog-reopen"
                      type="number"
                      min={1}
                      value={catalogForm.reopenWithinDays}
                      onChange={(event) =>
                        setCatalogForm((current) => ({
                          ...current,
                          reopenWithinDays: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div className="space-y-0.5">
                      <span className="text-sm font-medium text-foreground">Serviço ativo</span>
                      <p className="text-xs text-muted-foreground">Disponível no catálogo de abertura</p>
                    </div>
                    <Switch
                      checked={catalogForm.active}
                      onCheckedChange={(value) =>
                        setCatalogForm((current) => ({ ...current, active: value }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div className="space-y-0.5">
                      <span className="text-sm font-medium text-foreground">Permitir múltiplos chamados abertos</span>
                      <p className="text-xs text-muted-foreground">Colaborador pode ter múltiplos chamados ativos deste item</p>
                    </div>
                    <Switch
                      checked={catalogForm.allowMultipleOpenTickets}
                      onCheckedChange={(value) =>
                        setCatalogForm((current) => ({
                          ...current,
                          allowMultipleOpenTickets: value,
                        }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div className="space-y-0.5">
                      <span className="text-sm font-medium text-foreground">Solicitante pode fechar</span>
                      <p className="text-xs text-muted-foreground">Autoriza o fechamento pelo próprio solicitante</p>
                    </div>
                    <Switch
                      checked={catalogForm.requesterCanClose}
                      onCheckedChange={(value) =>
                        setCatalogForm((current) => ({
                          ...current,
                          requesterCanClose: value,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setIsCatalogModalOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={() => void handleSaveCatalog()}
                  disabled={savingCatalog || !validCatalog || !context?.capabilities.catalog}
                >
                  {savingCatalog ? 'Salvando...' : catalogForm.id ? 'Salvar alterações' : 'Criar serviço'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Motivos já semeados */}
          <Card className="app-section-card">
            <CardHeader>
              <CardTitle className="text-xl">Motivos já semeados</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Fechamento
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 text-xs font-medium text-primary hover:bg-transparent hover:underline"
                    onClick={() => toast.info('Os motivos de fechamento são fixados pela governança de conformidade.')}
                  >
                    + Adicionar
                  </Button>
                </div>
                {(overview?.closeReasons || []).map((reason) => (
                  <div
                    key={reason.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-card p-3.5 text-sm transition-colors hover:bg-muted/30"
                  >
                    <span className="text-foreground">{reason.name}</span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground/60 hover:text-destructive"
                      title="Motivo do sistema"
                      onClick={() => toast.info('Este motivo é protegido pelo sistema.')}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Transferência
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 text-xs font-medium text-primary hover:bg-transparent hover:underline"
                    onClick={() => toast.info('Os motivos de transferência são fixados pela governança de conformidade.')}
                  >
                    + Adicionar
                  </Button>
                </div>
                {(overview?.transferReasons || []).map((reason) => (
                  <div
                    key={reason.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-card p-3.5 text-sm transition-colors hover:bg-muted/30"
                  >
                    <span className="text-foreground">{reason.name}</span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground/60 hover:text-destructive"
                      title="Motivo do sistema"
                      onClick={() => toast.info('Este motivo é protegido pelo sistema.')}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
