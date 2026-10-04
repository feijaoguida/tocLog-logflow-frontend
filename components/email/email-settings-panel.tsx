'use client'

import React, { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock,
  HardDrive,
  Headphones,
  Key,
  Layers,
  Mail,
  RefreshCw,
  Send,
  Server,
  Settings2,
  ShieldCheck,
  ShoppingCart,
  Truck,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
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
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'
import { reportError } from '@/lib/error-reporter'

type ProviderConfig = {
  strategy: 'RESEND_FIRST' | 'SMTP_FIRST' | 'RESEND_ONLY' | 'SMTP_ONLY'
  resendApiKey: string | null
  hasResendApiKey: boolean
  resendFromEmail: string | null
  smtpHost: string | null
  smtpPort: number | null
  smtpUser: string | null
  hasSmtpPassword: boolean
  smtpSecure: boolean
  smtpFromEmail: string | null
  isEnabled: boolean
}

type NotificationSetting = {
  event: string
  name: string
  category: string
  description: string
  enabled: boolean
  recipientRoles: string[]
  customEmails: string
  updatedAt: string | null
}

type DispatchLog = {
  id: string
  event: string
  provider: string
  recipient: string
  subject: string
  status: string
  error: string | null
  fallbackUsed: boolean
  createdAt: string
}

const MODULE_DEFINITIONS = [
  {
    id: 'Compras',
    title: 'Módulo Compras',
    description: 'Alertas de requisições, cotações, ordens de compra e recebimentos.',
    icon: ShoppingCart,
    roles: [
      { id: 'REQUESTER', label: 'Solicitante' },
      { id: 'DEPARTMENT_MANAGER', label: 'Gestor do Departamento' },
      { id: 'PURCHASER', label: 'Comprador' },
      { id: 'APPROVER', label: 'Aprovador de Alçada' },
    ],
  },
  {
    id: 'Helpdesk',
    title: 'Módulo Helpdesk',
    description: 'Notificações de abertura, atribuição, resoluções e aprovações de chamados.',
    icon: Headphones,
    roles: [
      { id: 'REQUESTER', label: 'Solicitante do Chamado' },
      { id: 'AGENT', label: 'Técnico Designado' },
      { id: 'QUEUE_MANAGER', label: 'Gestor da Fila' },
      { id: 'APPROVER', label: 'Aprovador de Alçada' },
    ],
  },
  {
    id: 'Recursos Humanos',
    title: 'Módulo Recursos Humanos',
    description: 'Solicitações de férias, homologações e registros de feedback institucional.',
    icon: Users,
    roles: [
      { id: 'EMPLOYEE', label: 'Colaborador' },
      { id: 'DEPARTMENT_MANAGER', label: 'Gestor Imediato' },
      { id: 'HR_MANAGER', label: 'Equipe de RH' },
    ],
  },
  {
    id: 'Frotas',
    title: 'Módulo Frotas',
    description: 'Alertas de manutenção preventiva e checklist de inspeção veicular.',
    icon: Truck,
    roles: [
      { id: 'FLEET_MANAGER', label: 'Gestor de Frota' },
      { id: 'OPERATIONS', label: 'Equipe de Operações' },
      { id: 'DRIVER', label: 'Motorista' },
    ],
  },
  {
    id: 'Logística',
    title: 'Módulo Logística',
    description: 'Acompanhamento de expedição e transporte de cargas.',
    icon: HardDrive,
    roles: [
      { id: 'OPERATIONS', label: 'Equipe de Expedição' },
      { id: 'DRIVER', label: 'Motorista de Rota' },
    ],
  },
  {
    id: 'Integrações',
    title: 'Integrações & Sistema',
    description: 'Erros de sincronização externa (SSW) e avisos críticos de governança.',
    icon: Settings2,
    roles: [
      { id: 'SYSTEM_ADMIN', label: 'Administrador de Sistemas' },
    ],
  },
]

export function EmailSettingsPanel() {
  const [loading, setLoading] = useState(true)
  const [savingConfig, setSavingConfig] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)
  const [testEmailAddress, setTestEmailAddress] = useState('')
  const [testProvider, setTestProvider] = useState<'AUTO' | 'RESEND' | 'SMTP'>('AUTO')

  // Provedor Form State
  const [config, setConfig] = useState<ProviderConfig>({
    strategy: 'RESEND_FIRST',
    resendApiKey: null,
    hasResendApiKey: false,
    resendFromEmail: 'LogFlow <nao-responda@resend.dev>',
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    hasSmtpPassword: false,
    smtpSecure: false,
    smtpFromEmail: '',
    isEnabled: true,
  })

  const [resendApiKeyInput, setResendApiKeyInput] = useState('')
  const [smtpPasswordInput, setSmtpPasswordInput] = useState('')

  // Notificações State
  const [notifications, setNotifications] = useState<NotificationSetting[]>([])
  const [savingEvents, setSavingEvents] = useState<Record<string, boolean>>({})
  const [selectedModule, setSelectedModule] = useState<string>('Compras')

  // Logs State
  const [logs, setLogs] = useState<DispatchLog[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)

  useEffect(() => {
    loadAllData()
  }, [])

  const loadAllData = async () => {
    setLoading(true)
    try {
      const [configRes, notifRes] = await Promise.all([
        api.get('/email/config'),
        api.get('/email/notifications'),
      ])
      setConfig(configRes.data)
      setNotifications(notifRes.data)
      loadLogs()
    } catch (err: any) {
      const msg = 'Erro ao carregar configurações de e-mail: ' + getApiErrorMessage(err)
      toast.error(msg)
      reportError(err, {
        module: 'EMAIL_SETTINGS',
        screen: '/dashboard/settings/email',
        action: 'loadInitialData',
        errorMessage: msg,
      })
    } finally {
      setLoading(false)
    }
  }

  const loadLogs = async () => {
    setLoadingLogs(true)
    try {
      const res = await api.get('/email/logs?limit=50')
      setLogs(res.data)
    } catch (err) {
      console.error(err)
      reportError(err, {
        module: 'EMAIL_SETTINGS',
        screen: '/dashboard/settings/email',
        action: 'loadLogs',
        errorMessage: 'Erro ao carregar logs de e-mail',
      })
    } finally {
      setLoadingLogs(false)
    }
  }

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingConfig(true)
    try {
      const payload: any = {
        strategy: config.strategy,
        resendFromEmail: config.resendFromEmail,
        smtpHost: config.smtpHost || null,
        smtpPort: config.smtpPort ? Number(config.smtpPort) : null,
        smtpUser: config.smtpUser || null,
        smtpSecure: config.smtpSecure,
        smtpFromEmail: config.smtpFromEmail || null,
        isEnabled: config.isEnabled,
      }

      if (resendApiKeyInput.trim()) {
        payload.resendApiKey = resendApiKeyInput.trim()
      }
      if (smtpPasswordInput.trim()) {
        payload.smtpPassword = smtpPasswordInput.trim()
      }

      await api.patch('/email/config', payload)
      toast.success('Configurações de envio de e-mail atualizadas com sucesso!')
      setResendApiKeyInput('')
      setSmtpPasswordInput('')
      const updated = await api.get('/email/config')
      setConfig(updated.data)
    } catch (err: any) {
      const msg = 'Falha ao salvar provedores: ' + getApiErrorMessage(err)
      toast.error(msg)
      reportError(err, {
        module: 'EMAIL_SETTINGS',
        screen: '/dashboard/settings/email',
        action: 'handleSaveConfig',
        errorMessage: msg,
      })
    } finally {
      setSavingConfig(false)
    }
  }

  const handleTestConnection = async () => {
    if (!testEmailAddress || !testEmailAddress.includes('@')) {
      toast.error('Informe um endereço de e-mail válido para o teste.')
      return
    }

    setTestingConnection(true)
    try {
      const payload: any = { to: testEmailAddress }
      if (testProvider !== 'AUTO') {
        payload.provider = testProvider
      }
      const res = await api.post('/email/test', payload)
      toast.success(res.data.message || 'E-mail de teste enviado com sucesso!')
      loadLogs()
    } catch (err: any) {
      const msg = getApiErrorMessage(err)
      toast.error(msg)
      reportError(err, {
        module: 'EMAIL_SETTINGS',
        screen: '/dashboard/settings/email',
        action: 'handleTestConnection',
        errorMessage: msg,
        requestPayload: { to: testEmailAddress, provider: testProvider },
      })
    } finally {
      setTestingConnection(false)
    }
  }

  const handleToggleEvent = (event: string, enabled: boolean) => {
    setNotifications((prev) =>
      prev.map((n) => (n.event === event ? { ...n, enabled } : n)),
    )
  }

  const handleRoleToggle = (event: string, roleId: string, checked: boolean) => {
    setNotifications((prev) =>
      prev.map((n) => {
        if (n.event !== event) return n
        const currentRoles = n.recipientRoles || []
        const updatedRoles = checked
          ? [...currentRoles, roleId]
          : currentRoles.filter((r) => r !== roleId)
        return { ...n, recipientRoles: updatedRoles }
      }),
    )
  }

  const handleCustomEmailsChange = (event: string, customEmails: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.event === event ? { ...n, customEmails } : n)),
    )
  }

  const handleSaveNotification = async (item: NotificationSetting) => {
    setSavingEvents((prev) => ({ ...prev, [item.event]: true }))
    try {
      await api.put('/email/notifications', {
        event: item.event,
        enabled: item.enabled,
        recipientRoles: item.recipientRoles,
        customEmails: item.customEmails,
      })
      toast.success(`Regra do evento "${item.name}" salva com sucesso!`)
    } catch (err: any) {
      const msg = `Erro ao salvar evento: ${getApiErrorMessage(err)}`
      toast.error(msg)
      reportError(err, {
        module: 'EMAIL_SETTINGS',
        screen: '/dashboard/settings/email',
        action: 'handleSaveNotifications',
        errorMessage: msg,
        requestPayload: item,
      })
    } finally {
      setSavingEvents((prev) => ({ ...prev, [item.event]: false }))
    }
  }

  const currentModuleDef = useMemo(() => {
    return (
      MODULE_DEFINITIONS.find((m) => m.id === selectedModule) ||
      MODULE_DEFINITIONS[0]
    )
  }, [selectedModule])

  const filteredEvents = useMemo(() => {
    return notifications.filter((n) => n.category === selectedModule)
  }, [notifications, selectedModule])

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-14 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="events" className="space-y-6">
        <TabsList className="grid w-full max-w-[640px] grid-cols-3">
          <TabsTrigger value="events">Eventos por Módulo</TabsTrigger>
          <TabsTrigger value="providers">Provedor & Conexão</TabsTrigger>
          <TabsTrigger value="logs">Histórico Geral de Disparos</TabsTrigger>
        </TabsList>

        {/* ========================================================================= */}
        {/* ABA: EVENTOS E ALERTAS SEGMENTADOS POR MÓDULO                             */}
        {/* ========================================================================= */}
        <TabsContent value="events" className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold tracking-tight text-foreground">Eventos e Alertas Segmentados por Módulo</h3>
                <p className="text-sm text-muted-foreground">
                  Selecione o módulo para personalizar o gatilho dos e-mails, quem deve ser notificado e cópias adicionais.
                </p>
              </div>
              <Badge variant={config.isEnabled ? 'default' : 'secondary'} className="rounded-full px-3 py-1">
                {config.isEnabled ? 'Envio Global Ativo' : 'Envio Global Pausado'}
              </Badge>
            </div>

            {/* SELETOR DE MÓDULOS */}
            <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
              {MODULE_DEFINITIONS.map((mod) => {
                const Icon = mod.icon
                const isSelected = selectedModule === mod.id
                const countActive = notifications.filter(
                  (n) => n.category === mod.id && n.enabled,
                ).length
                const totalInMod = notifications.filter(
                  (n) => n.category === mod.id,
                ).length

                return (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => setSelectedModule(mod.id)}
                    className={`flex flex-col items-start gap-1.5 rounded-md border p-3 text-left transition shadow-xs ${
                      isSelected
                        ? 'border-primary bg-primary/10 shadow-xs'
                        : 'border-border/70 hover:border-primary/40 hover:bg-muted/40'
                    }`}
                  >
                    <div className="flex w-full items-center justify-between">
                      <Icon className={`size-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                        {countActive}/{totalInMod}
                      </Badge>
                    </div>
                    <span className="text-xs font-semibold tracking-tight">{mod.title.replace('Módulo ', '')}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* CABEÇALHO DO MÓDULO SELECIONADO */}
          <div className="flex items-center justify-between border-b border-border/70 pb-3">
            <div className="flex items-center gap-2">
              {React.createElement(currentModuleDef.icon, { className: 'size-5 text-primary' })}
              <div>
                <h4 className="text-base font-semibold tracking-tight text-foreground">{currentModuleDef.title}</h4>
                <p className="text-xs text-muted-foreground">{currentModuleDef.description}</p>
              </div>
            </div>
            <Badge variant="outline">
              {filteredEvents.length} {filteredEvents.length === 1 ? 'evento disponível' : 'eventos disponíveis'}
            </Badge>
          </div>

          {/* LISTA DE EVENTOS DO MÓDULO */}
          <div className="grid gap-5">
            {filteredEvents.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground border-dashed">
                Nenhum evento configurado para este módulo.
              </Card>
            ) : (
              filteredEvents.map((item) => (
                <Card key={item.event} className="transition border-border shadow-xs hover:border-primary/40">
                  <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base font-semibold">{item.name}</CardTitle>
                          <Badge variant="outline" className="text-xs">
                            {item.category}
                          </Badge>
                        </div>
                        <CardDescription className="text-xs leading-relaxed">
                          {item.description}
                        </CardDescription>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs font-medium text-muted-foreground">
                          {item.enabled ? 'Notificação Ativa' : 'Desativado'}
                        </span>
                        <Switch
                          checked={item.enabled}
                          onCheckedChange={(checked) => handleToggleEvent(item.event, checked)}
                        />
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Destinatários por Papel / Função neste Módulo
                      </Label>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {currentModuleDef.roles.map((role) => {
                          const isChecked = (item.recipientRoles || []).includes(role.id)
                          return (
                            <div
                              key={role.id}
                              className={`flex items-center space-x-2 rounded-md border p-2.5 transition ${
                                isChecked
                                  ? 'border-primary/40 bg-primary/5 text-foreground'
                                  : 'border-border/60 bg-muted/20 text-muted-foreground'
                              }`}
                            >
                              <Checkbox
                                id={`${item.event}-${role.id}`}
                                checked={isChecked}
                                disabled={!item.enabled}
                                onCheckedChange={(checked) =>
                                  handleRoleToggle(item.event, role.id, Boolean(checked))
                                }
                              />
                              <label
                                htmlFor={`${item.event}-${role.id}`}
                                className="text-xs font-medium leading-none cursor-pointer"
                              >
                                {role.label}
                              </label>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3 sm:items-end">
                      <div className="space-y-1 sm:col-span-2">
                        <Label htmlFor={`custom-${item.event}`} className="text-xs">
                          E-mails Adicionais em Cópia (separados por vírgula)
                        </Label>
                        <Input
                          id={`custom-${item.event}`}
                          placeholder="ex: fiscal@empresa.com, diretoria@empresa.com"
                          value={item.customEmails || ''}
                          disabled={!item.enabled}
                          onChange={(e) => handleCustomEmailsChange(item.event, e.target.value)}
                          className="text-xs h-9"
                        />
                      </div>

                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          onClick={() => handleSaveNotification(item)}
                          disabled={savingEvents[item.event]}
                          className="w-full sm:w-auto"
                        >
                          {savingEvents[item.event] ? (
                            <>
                              <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" />
                              Salvando...
                            </>
                          ) : (
                            'Salvar Regra'
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* ========================================================================= */}
        {/* ABA: PROVEDOR & CONEXÃO (GERAL DA EMPRESA)                                */}
        {/* ========================================================================= */}
        <TabsContent value="providers" className="space-y-6">
          <form onSubmit={handleSaveConfig} className="space-y-6">
            <Card className="border-border/70">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Settings2 className="size-5 text-primary" />
                      Estratégia Geral de Envio de E-mails
                    </CardTitle>
                    <CardDescription>
                      Configure os provedores de e-mail da organização com contingência automática (Fallback).
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="global-enabled" className="text-sm">
                      Serviço Ativo
                    </Label>
                    <Switch
                      id="global-enabled"
                      checked={config.isEnabled}
                      onCheckedChange={(checked) => setConfig({ ...config, isEnabled: checked })}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Estratégia de Despacho</Label>
                  <Select
                    value={config.strategy}
                    onValueChange={(val: any) => setConfig({ ...config, strategy: val })}
                  >
                    <SelectTrigger className="max-w-md">
                      <SelectValue placeholder="Selecione a estratégia" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RESEND_FIRST">
                        Resend Principal + Fallback SMTP (Recomendado)
                      </SelectItem>
                      <SelectItem value="SMTP_FIRST">
                        SMTP Principal + Fallback Resend
                      </SelectItem>
                      <SelectItem value="RESEND_ONLY">
                        Somente Resend (Sem contingência)
                      </SelectItem>
                      <SelectItem value="SMTP_ONLY">
                        Somente SMTP (Sem contingência)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Quando o modo Fallback está ativo, caso o provedor principal atinja limites de quota ou fique temporariamente instável, o LogFlow despacha imediatamente a mensagem através do segundo provedor, garantindo entrega aos usuários.
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              {/* CARD RESEND */}
              <Card className="border-border/70">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Key className="size-4 text-primary" />
                    Provedor Resend
                  </CardTitle>
                  <CardDescription className="text-xs">
                    API moderna de e-mails transacionais com alta entregabilidade.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="resend-key" className="text-xs">
                        Chave de API (re_***)
                      </Label>
                      {config.hasResendApiKey && (
                        <span className="flex items-center text-[11px] text-emerald-600 font-medium">
                          <CheckCircle2 className="size-3 mr-1" />
                          Configurada
                        </span>
                      )}
                    </div>
                    <Input
                      id="resend-key"
                      type="password"
                      placeholder={config.hasResendApiKey ? '••••••••••••••••••••••••••' : 're_xxxxxxxxxxxxxx'}
                      value={resendApiKeyInput}
                      onChange={(e) => setResendApiKeyInput(e.target.value)}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Deixe em branco para manter a chave atual cadastrada.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="resend-from" className="text-xs">
                      Remetente Padrão (From)
                    </Label>
                    <Input
                      id="resend-from"
                      placeholder="LogFlow <compras@suaempresa.com.br>"
                      value={config.resendFromEmail || ''}
                      onChange={(e) => setConfig({ ...config, resendFromEmail: e.target.value })}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* CARD SMTP */}
              <Card className="border-border/70">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Server className="size-4 text-primary" />
                    Provedor SMTP (Contingência)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Servidor tradicional de correio (Office 365, SendGrid, Amazon SES ou servidor próprio).
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2 space-y-1.5">
                      <Label htmlFor="smtp-host" className="text-xs">Host SMTP</Label>
                      <Input
                        id="smtp-host"
                        placeholder="smtp.empresa.com"
                        value={config.smtpHost || ''}
                        onChange={(e) => setConfig({ ...config, smtpHost: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="smtp-port" className="text-xs">Porta</Label>
                      <Input
                        id="smtp-port"
                        type="number"
                        placeholder="587"
                        value={config.smtpPort || ''}
                        onChange={(e) => setConfig({ ...config, smtpPort: Number(e.target.value) || null })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="smtp-user" className="text-xs">Usuário SMTP</Label>
                      <Input
                        id="smtp-user"
                        placeholder="usuario@empresa.com"
                        value={config.smtpUser || ''}
                        onChange={(e) => setConfig({ ...config, smtpUser: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="smtp-pass" className="text-xs">Senha SMTP</Label>
                        {config.hasSmtpPassword && (
                          <span className="flex items-center text-[11px] text-emerald-600 font-medium">
                            <CheckCircle2 className="size-3 mr-1" />
                            Salva
                          </span>
                        )}
                      </div>
                      <Input
                        id="smtp-pass"
                        type="password"
                        placeholder={config.hasSmtpPassword ? '••••••••••••' : 'Sua senha'}
                        value={smtpPasswordInput}
                        onChange={(e) => setSmtpPasswordInput(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="smtp-secure"
                        checked={config.smtpSecure}
                        onCheckedChange={(checked) =>
                          setConfig({ ...config, smtpSecure: Boolean(checked) })
                        }
                      />
                      <label htmlFor="smtp-secure" className="text-xs font-medium cursor-pointer">
                        Conexão Segura (SSL / TLS)
                      </label>
                    </div>

                    <div className="space-y-1 text-right">
                      <Input
                        placeholder="Remetente (From)"
                        className="text-xs h-8 max-w-[200px]"
                        value={config.smtpFromEmail || ''}
                        onChange={(e) => setConfig({ ...config, smtpFromEmail: e.target.value })}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-end gap-3">
              <Button type="submit" disabled={savingConfig}>
                {savingConfig ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Salvando Credenciais...
                  </>
                ) : (
                  'Salvar Configurações de Conexão'
                )}
              </Button>
            </div>
          </form>

          {/* CARD DE TESTE DE DISPARO */}
          <Card className="border-border/70 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Send className="size-4 text-primary" />
                Validar e Testar Conexão em Tempo Real
              </CardTitle>
              <CardDescription className="text-xs">
                Dispare uma mensagem de verificação para checar se as credenciais cadastradas estão operacionais.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[240px] space-y-1">
                  <Label htmlFor="test-email" className="text-xs">
                    Destinatário do Teste
                  </Label>
                  <Input
                    id="test-email"
                    type="email"
                    placeholder="seuemail@empresa.com"
                    value={testEmailAddress}
                    onChange={(e) => setTestEmailAddress(e.target.value)}
                  />
                </div>

                <div className="w-[180px] space-y-1">
                  <Label className="text-xs">Canal de Teste</Label>
                  <Select
                    value={testProvider}
                    onValueChange={(val: any) => setTestProvider(val)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AUTO">Estratégia Ativa</SelectItem>
                      <SelectItem value="RESEND">Apenas Resend</SelectItem>
                      <SelectItem value="SMTP">Apenas SMTP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleTestConnection}
                  disabled={testingConnection}
                  variant="outline"
                  className="bg-card"
                >
                  {testingConnection ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Disparando...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Enviar Teste
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================================================= */}
        {/* ABA: HISTÓRICO GERAL DE DISPAROS (LOGS)                                   */}
        {/* ========================================================================= */}
        <TabsContent value="logs" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold tracking-tight">Histórico Geral de Disparos</h3>
              <p className="text-sm text-muted-foreground">
                Auditoria de todas as mensagens corporativas enviadas pela organização com rastreabilidade de fallback.
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={loadLogs} disabled={loadingLogs}>
              <RefreshCw className={`mr-2 h-3.5 w-3.5 ${loadingLogs ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>

          <Card className="border-border/70 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 border-b border-border/70 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Provedor</th>
                    <th className="px-4 py-3 font-medium">Destinatário</th>
                    <th className="px-4 py-3 font-medium">Assunto</th>
                    <th className="px-4 py-3 font-medium">Fallback?</th>
                    <th className="px-4 py-3 font-medium">Data / Hora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                        Nenhum registro de disparo encontrado até o momento.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-muted/20">
                        <td className="px-4 py-3">
                          {log.status === 'SUCCESS' ? (
                            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20">
                              <CheckCircle2 className="size-3 mr-1" />
                              Sucesso
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                              <AlertCircle className="size-3" />
                              Falha
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono font-medium">
                          {log.provider}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {log.recipient}
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground">
                          {log.subject}
                          {log.error && (
                            <p className="text-[11px] text-destructive font-mono mt-0.5 max-w-sm truncate" title={log.error}>
                              {log.error}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {log.fallbackUsed ? (
                            <Badge variant="secondary" className="text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-400">
                              Sim (Acionado)
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">Não</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString('pt-BR')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
