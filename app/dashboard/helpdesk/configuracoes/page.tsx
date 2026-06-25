'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

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
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'

type HelpdeskSettingsRecord = {
  allowMultipleOpenTickets: boolean
  globalOpenLimit: number
  duplicateWindowHours: number
  reopenWindowDays: number
  autoCloseAfterDays: number
}

type HelpdeskOverview = {
  settings: HelpdeskSettingsRecord
  departments: Array<{ id: string; name: string }>
  categories: Array<{ id: string; name: string; companyId?: string | null }>
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
  const [loading, setLoading] = useState(true)
  const [savingSettings, setSavingSettings] = useState(false)
  const [runningAutoClose, setRunningAutoClose] = useState(false)
  const [savingQueue, setSavingQueue] = useState(false)
  const [savingCatalog, setSavingCatalog] = useState(false)
  const [overview, setOverview] = useState<HelpdeskOverview | null>(null)
  const [settings, setSettings] = useState<HelpdeskSettingsRecord>({
    allowMultipleOpenTickets: true,
    globalOpenLimit: 5,
    duplicateWindowHours: 24,
    reopenWindowDays: 5,
    autoCloseAfterDays: 7,
  })
  const [queueForm, setQueueForm] = useState<QueueFormState>(EMPTY_QUEUE_FORM)
  const [catalogForm, setCatalogForm] = useState<CatalogFormState>(EMPTY_CATALOG_FORM)

  useEffect(() => {
    void loadOverview()
  }, [])

  async function loadOverview() {
    setLoading(true)
    try {
      const { data } = await api.get<HelpdeskOverview>('/helpdesk/admin/overview')
      setOverview(data)
      setSettings(data.settings)
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
      return
    }

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
      return
    }

    setCatalogForm({
      id: item.id,
      name: item.name,
      slug: item.slug,
      description: item.description || '',
      departmentId: item.departmentId,
      queueId: item.queueId,
      ticketCategoryId: item.ticketCategoryId || 'none',
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

  const filteredQueuesForCatalog = useMemo(() => {
    return overview?.queues.filter((queue) => queue.departmentId === catalogForm.departmentId) || []
  }, [catalogForm.departmentId, overview?.queues])

  async function handleSaveSettings() {
    setSavingSettings(true)
    try {
      const { data } = await api.patch<HelpdeskSettingsRecord>('/helpdesk/settings', {
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

      startQueueEdit()
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

  async function handleSaveCatalog() {
    setSavingCatalog(true)
    try {
      const payload = {
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

      startCatalogEdit()
      await loadOverview()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível salvar o serviço.'))
    } finally {
      setSavingCatalog(false)
    }
  }

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

        <TabsContent value="queues" className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="app-section-card">
            <CardHeader>
              <CardTitle className="text-xl">Filas configuradas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <Skeleton className="h-80 rounded-2xl" />
              ) : overview?.queues.length ? (
                overview.queues.map((queue) => (
                  <div
                    key={queue.id}
                    className="flex items-start justify-between gap-4 rounded-2xl border border-border bg-muted/20 p-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{queue.name}</p>
                        <Badge variant={queue.active ? 'success' : 'outline'}>
                          {queue.active ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {queue.department?.name || 'Sem departamento'} · {queue.members?.length || 0} membro(s)
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {queue.description || 'Sem descrição operacional registrada.'}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => startQueueEdit(queue)}>
                      Editar
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhuma fila cadastrada para esta empresa ainda.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="app-section-card">
            <CardHeader>
              <CardTitle className="text-xl">
                {queueForm.id ? 'Editar fila' : 'Nova fila'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="field-stack">
                <Label htmlFor="queue-name">Nome</Label>
                <Input
                  id="queue-name"
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
                  <SelectTrigger id="queue-department">
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
                  value={queueForm.description}
                  onChange={(event) =>
                    setQueueForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="grid gap-3">
                <label className="flex items-center justify-between rounded-2xl border border-border px-4 py-3">
                  <span className="text-sm">Fila ativa</span>
                  <Switch
                    checked={queueForm.active}
                    onCheckedChange={(value) =>
                      setQueueForm((current) => ({ ...current, active: value }))
                    }
                  />
                </label>
                <label className="flex items-center justify-between rounded-2xl border border-border px-4 py-3">
                  <span className="text-sm">Permitir pickup do agente</span>
                  <Switch
                    checked={queueForm.allowAgentPickup}
                    onCheckedChange={(value) =>
                      setQueueForm((current) => ({ ...current, allowAgentPickup: value }))
                    }
                  />
                </label>
                <label className="flex items-center justify-between rounded-2xl border border-border px-4 py-3">
                  <span className="text-sm">Preparar auto-atribuição</span>
                  <Switch
                    checked={queueForm.autoAssignEnabled}
                    onCheckedChange={(value) =>
                      setQueueForm((current) => ({ ...current, autoAssignEnabled: value }))
                    }
                  />
                </label>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => startQueueEdit()}>
                  Limpar
                </Button>
                <Button onClick={() => void handleSaveQueue()} disabled={savingQueue}>
                  {savingQueue ? 'Salvando...' : queueForm.id ? 'Salvar fila' : 'Criar fila'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="catalog" className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="app-section-card">
            <CardHeader>
              <CardTitle className="text-xl">Catálogo de serviços</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <Skeleton className="h-80 rounded-2xl" />
              ) : overview?.catalogItems.length ? (
                overview.catalogItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-4 rounded-2xl border border-border bg-muted/20 p-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{item.name}</p>
                        <Badge variant={item.active ? 'success' : 'outline'}>
                          {item.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {item.department?.name || 'Sem departamento'} · {item.queue?.name || 'Sem fila'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {item.ticketCategory?.name || 'Sem categoria vinculada'} · prioridade{' '}
                        {item.defaultPriority}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => startCatalogEdit(item)}>
                      Editar
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhum serviço cadastrado para esta empresa ainda.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="app-section-card">
            <CardHeader>
              <CardTitle className="text-xl">
                {catalogForm.id ? 'Editar serviço' : 'Novo serviço'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="field-stack">
                <Label htmlFor="catalog-name">Nome</Label>
                <Input
                  id="catalog-name"
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
                  value={catalogForm.description}
                  onChange={(event) =>
                    setCatalogForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
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
                    <SelectTrigger id="catalog-department">
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
                    <SelectTrigger id="catalog-queue">
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
                <div className="field-stack">
                  <Label htmlFor="catalog-category">Categoria</Label>
                  <Select
                    value={catalogForm.ticketCategoryId}
                    onValueChange={(value) =>
                      setCatalogForm((current) => ({ ...current, ticketCategoryId: value }))
                    }
                  >
                    <SelectTrigger id="catalog-category">
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
                    <SelectTrigger id="catalog-priority">
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
                <div className="field-stack">
                  <Label htmlFor="catalog-approval">Aprovação</Label>
                  <Select
                    value={catalogForm.approvalMode}
                    onValueChange={(value) =>
                      setCatalogForm((current) => ({ ...current, approvalMode: value }))
                    }
                  >
                    <SelectTrigger id="catalog-approval">
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
                <div className="field-stack">
                  <Label htmlFor="catalog-duplicate">Janela de duplicidade (horas)</Label>
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
              <div className="grid gap-3">
                <label className="flex items-center justify-between rounded-2xl border border-border px-4 py-3">
                  <span className="text-sm">Serviço ativo</span>
                  <Switch
                    checked={catalogForm.active}
                    onCheckedChange={(value) =>
                      setCatalogForm((current) => ({ ...current, active: value }))
                    }
                  />
                </label>
                <label className="flex items-center justify-between rounded-2xl border border-border px-4 py-3">
                  <span className="text-sm">Permitir múltiplos chamados abertos</span>
                  <Switch
                    checked={catalogForm.allowMultipleOpenTickets}
                    onCheckedChange={(value) =>
                      setCatalogForm((current) => ({
                        ...current,
                        allowMultipleOpenTickets: value,
                      }))
                    }
                  />
                </label>
                <label className="flex items-center justify-between rounded-2xl border border-border px-4 py-3">
                  <span className="text-sm">Solicitante pode fechar</span>
                  <Switch
                    checked={catalogForm.requesterCanClose}
                    onCheckedChange={(value) =>
                      setCatalogForm((current) => ({
                        ...current,
                        requesterCanClose: value,
                      }))
                    }
                  />
                </label>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => startCatalogEdit()}>
                  Limpar
                </Button>
                <Button onClick={() => void handleSaveCatalog()} disabled={savingCatalog}>
                  {savingCatalog ? 'Salvando...' : catalogForm.id ? 'Salvar serviço' : 'Criar serviço'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="app-section-card xl:col-span-2">
            <CardHeader>
              <CardTitle className="text-xl">Motivos já semeados</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Fechamento
                </h3>
                {(overview?.closeReasons || []).map((reason) => (
                  <div
                    key={reason.id}
                    className="rounded-2xl border border-border bg-muted/20 px-4 py-3 text-sm"
                  >
                    {reason.name}
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Transferência
                </h3>
                {(overview?.transferReasons || []).map((reason) => (
                  <div
                    key={reason.id}
                    className="rounded-2xl border border-border bg-muted/20 px-4 py-3 text-sm"
                  >
                    {reason.name}
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
