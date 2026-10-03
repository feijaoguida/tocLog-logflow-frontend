'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  Settings,
  Shield,
  Users,
  ClipboardList,
  Save,
  RotateCw,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Copy,
  ExternalLink,
  Clock,
  Car,
  FileCheck,
  Check,
} from 'lucide-react'
import { toast } from 'sonner'

import { WorkspaceStateCard } from '@/components/layout/workspace-state-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { api } from '@/lib/api'

interface FleetSettingsData {
  id?: string
  checklistMode: 'PER_MOVEMENT' | 'TIME_WINDOW'
  checklistValidityHours: number
  blockOnExpiredLicense: boolean
  cancelPurchaseRequestsOnMaintenanceCancel: boolean
  publicRegistrationEnabled: boolean
  publicRegistrationToken?: string
  logisticsFleetSettings?: {
    blockVehicleWithoutChecklist: boolean
    blockVehicleWithExpiredMaintenance: boolean
    blockVehicleWithExpiredDocument: boolean
  }
}

interface FleetManagerItem {
  id: string
  userId: string
  branchId?: string | null
  notifyEmail: boolean
  notifyMaintenanceAlerts: boolean
  notifyChecklistAlerts: boolean
  user: {
    id: string
    name: string
    email: string
    role: string
  }
  branch?: {
    id: string
    name: string
  } | null
}

interface ChecklistTemplateItem {
  id: string
  name: string
  description?: string | null
  type: 'RECEIVEMENT' | 'DELIVERY' | 'MAINTENANCE_EXIT' | 'PERIODIC' | 'CORRECTIVE'
  version: number
  active: boolean
  items: Array<{
    id?: string
    name: string
    category?: string | null
    required: boolean
    active: boolean
  }>
}

interface UserOption {
  id: string
  name: string
  email: string
}

export default function FleetSettingsPage() {
  const [activeTab, setActiveTab] = useState('policies')
  const [loading, setLoading] = useState(true)
  const [savingSettings, setSavingSettings] = useState(false)
  const [copiedToken, setCopiedToken] = useState(false)

  // Settings State
  const [settings, setSettings] = useState<FleetSettingsData>({
    checklistMode: 'PER_MOVEMENT',
    checklistValidityHours: 24,
    blockOnExpiredLicense: true,
    cancelPurchaseRequestsOnMaintenanceCancel: false,
    publicRegistrationEnabled: true,
  })

  // Managers State
  const [managers, setManagers] = useState<FleetManagerItem[]>([])
  const [loadingManagers, setLoadingManagers] = useState(false)
  const [isManagerModalOpen, setIsManagerModalOpen] = useState(false)
  const [usersList, setUsersList] = useState<UserOption[]>([])
  const [newManagerUserId, setNewManagerUserId] = useState('')
  const [newManagerNotifyEmail, setNewManagerNotifyEmail] = useState(true)
  const [newManagerNotifyMaintenance, setNewManagerNotifyMaintenance] = useState(true)
  const [newManagerNotifyChecklist, setNewManagerNotifyChecklist] = useState(true)
  const [savingManager, setSavingManager] = useState(false)

  // Checklist Templates State
  const [templates, setTemplates] = useState<ChecklistTemplateItem[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [templateDescription, setTemplateDescription] = useState('')
  const [templateType, setTemplateType] = useState<ChecklistTemplateItem['type']>('DELIVERY')
  const [templateItems, setTemplateItems] = useState<
    Array<{ name: string; category: string; required: boolean }>
  >([
    { name: 'Freios e Pneus', category: 'Segurança', required: true },
    { name: 'Luzes e Faróis', category: 'Elétrica', required: true },
    { name: 'Nível de Óleo e Fluidos', category: 'Mecânica', required: true },
  ])
  const [savingTemplate, setSavingTemplate] = useState(false)

  useEffect(() => {
    loadAllData()
  }, [])

  async function loadAllData() {
    setLoading(true)
    try {
      await Promise.all([loadSettings(), loadManagers(), loadTemplates()])
    } finally {
      setLoading(false)
    }
  }

  async function loadSettings() {
    try {
      const res = await api.get('/fleet/settings')
      if (res.data) {
        setSettings({
          checklistMode: res.data.checklistMode || 'PER_MOVEMENT',
          checklistValidityHours: res.data.checklistValidityHours ?? 24,
          blockOnExpiredLicense: res.data.blockOnExpiredLicense ?? true,
          cancelPurchaseRequestsOnMaintenanceCancel:
            res.data.cancelPurchaseRequestsOnMaintenanceCancel ?? false,
          publicRegistrationEnabled: res.data.publicRegistrationEnabled ?? true,
          publicRegistrationToken: res.data.publicRegistrationToken,
          logisticsFleetSettings: res.data.logisticsFleetSettings,
        })
      }
    } catch {
      toast.error('Erro ao carregar configurações de frota.')
    }
  }

  async function loadManagers() {
    setLoadingManagers(true)
    try {
      const res = await api.get('/fleet/managers')
      setManagers(res.data || [])
    } catch {
      // Endpoint fallback
      setManagers([])
    } finally {
      setLoadingManagers(false)
    }
  }

  async function loadTemplates() {
    setLoadingTemplates(true)
    try {
      const res = await api.get('/fleet/checklist-templates')
      setTemplates(res.data || [])
    } catch {
      setTemplates([])
    } finally {
      setLoadingTemplates(false)
    }
  }

  async function handleSaveSettings() {
    setSavingSettings(true)
    try {
      await api.put('/fleet/settings', {
        checklistMode: settings.checklistMode,
        checklistValidityHours: Number(settings.checklistValidityHours),
        blockOnExpiredLicense: settings.blockOnExpiredLicense,
        cancelPurchaseRequestsOnMaintenanceCancel: settings.cancelPurchaseRequestsOnMaintenanceCancel,
        publicRegistrationEnabled: settings.publicRegistrationEnabled,
      })
      toast.success('Políticas operacionais de frotas salvas com sucesso!')
      await loadSettings()
    } catch {
      toast.error('Não foi possível salvar as configurações.')
    } finally {
      setSavingSettings(false)
    }
  }

  async function handleRegenerateToken() {
    try {
      const res = await api.post('/fleet/settings/public-token/regenerate', {})
      if (res.data?.publicRegistrationToken) {
        setSettings((prev) => ({
          ...prev,
          publicRegistrationToken: res.data.publicRegistrationToken,
        }))
        toast.success('Novo token de cadastro público gerado com sucesso!')
      }
    } catch {
      toast.error('Erro ao regenerar token público.')
    }
  }

  function handleCopyPublicLink() {
    if (!settings.publicRegistrationToken) return
    const url = `${window.location.origin}/onboarding/external-driver?token=${settings.publicRegistrationToken}`
    navigator.clipboard.writeText(url)
    setCopiedToken(true)
    toast.success('Link de cadastro público copiado para a área de transferência!')
    setTimeout(() => setCopiedToken(false), 2500)
  }

  async function handleOpenAddManagerModal() {
    setIsManagerModalOpen(true)
    try {
      // Buscar usuários para selecionar
      const res = await api.get('/users?limit=100')
      const items = res.data?.items || res.data || []
      setUsersList(items)
      if (items.length > 0 && !newManagerUserId) {
        setNewManagerUserId(items[0].id)
      }
    } catch {
      setUsersList([])
    }
  }

  async function handleCreateManager() {
    if (!newManagerUserId) {
      toast.error('Selecione um usuário para vincular como gestor de frota.')
      return
    }

    setSavingManager(true)
    try {
      await api.post('/fleet/managers', {
        userId: newManagerUserId,
        notifyEmail: newManagerNotifyEmail,
        notifyMaintenanceAlerts: newManagerNotifyMaintenance,
        notifyChecklistAlerts: newManagerNotifyChecklist,
      })
      toast.success('Gestor de frota adicionado com sucesso!')
      setIsManagerModalOpen(false)
      await loadManagers()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao adicionar gestor de frota.')
    } finally {
      setSavingManager(false)
    }
  }

  async function handleDeleteManager(id: string) {
    if (!confirm('Deseja realmente remover este responsável de alertas de frota?')) return
    try {
      await api.delete(`/fleet/managers/${id}`)
      toast.success('Responsável removido com sucesso.')
      setManagers((prev) => prev.filter((m) => m.id !== id))
    } catch {
      toast.error('Erro ao remover responsável.')
    }
  }

  function handleAddTemplateItem() {
    setTemplateItems((prev) => [
      ...prev,
      { name: '', category: 'Geral', required: true },
    ])
  }

  function handleRemoveTemplateItem(index: number) {
    setTemplateItems((prev) => prev.filter((_, i) => i !== index))
  }

  function handleUpdateTemplateItem(index: number, field: string, value: any) {
    setTemplateItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    )
  }

  async function handleCreateTemplate() {
    if (!templateName.trim()) {
      toast.error('Informe o nome do modelo de checklist.')
      return
    }
    if (templateItems.length === 0 || templateItems.some((i) => !i.name.trim())) {
      toast.error('Preencha o nome de todos os itens de verificação.')
      return
    }

    setSavingTemplate(true)
    try {
      await api.post('/fleet/checklist-templates', {
        name: templateName.trim(),
        description: templateDescription.trim() || undefined,
        type: templateType,
        items: templateItems.map((i) => ({
          name: i.name.trim(),
          category: i.category.trim() || 'Geral',
          required: i.required,
        })),
      })
      toast.success('Modelo de checklist criado com sucesso!')
      setIsTemplateModalOpen(false)
      setTemplateName('')
      setTemplateDescription('')
      await loadTemplates()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao criar modelo de checklist.')
    } finally {
      setSavingTemplate(false)
    }
  }

  async function handleDeleteTemplate(tmpl: ChecklistTemplateItem) {
    if (!confirm(`Deseja inativar/remover o modelo "${tmpl.name}"?`)) return
    try {
      const res = await api.delete(`/fleet/checklist-templates/${tmpl.id}`)
      toast.success(res.data?.message || 'Modelo atualizado com sucesso.')
      await loadTemplates()
    } catch {
      toast.error('Erro ao remover modelo de checklist.')
    }
  }

  const getTypeLabel = (type: ChecklistTemplateItem['type']) => {
    switch (type) {
      case 'DELIVERY':
        return 'Saída de Viagem / Entrega'
      case 'RECEIVEMENT':
        return 'Chegada de Viagem / Retorno'
      case 'MAINTENANCE_EXIT':
        return 'Saída de Manutenção'
      case 'PERIODIC':
        return 'Inspeção Periódica'
      case 'CORRECTIVE':
        return 'Inspeção Corretiva'
      default:
        return type
    }
  }

  return (
    <div className="app-page space-y-6 p-4 md:p-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Configurações de Frotas
          </h1>
          <p className="text-sm text-muted-foreground">
            Políticas operacionais, gestores de alertas e catálogo de modelos de checklist.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadAllData}
            disabled={loading}
            className="h-9 gap-1.5"
          >
            <RotateCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </Button>
          <Button asChild variant="outline" size="sm" className="h-9">
            <Link href="/dashboard/fleet">Veículos</Link>
          </Button>
        </div>
      </section>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 rounded-lg">
          <TabsTrigger
            value="policies"
            className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm gap-2"
          >
            <Shield className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            Políticas Operacionais
          </TabsTrigger>
          <TabsTrigger
            value="managers"
            className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm gap-2"
          >
            <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            Gestores e Alertas
          </TabsTrigger>
          <TabsTrigger
            value="templates"
            className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm gap-2"
          >
            <ClipboardList className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            Modelos de Checklist
          </TabsTrigger>
        </TabsList>

        {/* ABA 1: POLÍTICAS OPERACIONAIS */}
        <TabsContent value="policies" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1: Ciclo de Checklist (D04) */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-md text-emerald-600 dark:text-emerald-400">
                    <FileCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
                      Ciclo de Checklist de Saída e Chegada
                    </CardTitle>
                    <CardDescription>
                      Regras de obrigatoriedade de inspeção veicular (Decisão D04)
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Modo de Operação do Checklist</Label>
                  <Select
                    value={settings.checklistMode}
                    onValueChange={(val: 'PER_MOVEMENT' | 'TIME_WINDOW') =>
                      setSettings((prev) => ({ ...prev, checklistMode: val }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione o modo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PER_MOVEMENT">
                        Modo A: Por Movimentação Física (Obrigatório a cada saída e chegada)
                      </SelectItem>
                      <SelectItem value="TIME_WINDOW">
                        Modo B: Janela Temporal (Válido por horas definidas)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500">
                    {settings.checklistMode === 'PER_MOVEMENT'
                      ? 'Padrão recomendado: exige novo checklist de inspeção a cada saída e retorno físico.'
                      : 'Permite reutilizar o checklist recente aprovado para múltiplas saídas dentro do período.'}
                  </p>
                </div>

                {settings.checklistMode === 'TIME_WINDOW' && (
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <Label className="text-sm font-medium">
                      Validade do Checklist (Horas)
                    </Label>
                    <div className="flex items-center gap-3">
                      <Clock className="h-4 w-4 text-slate-400" />
                      <Input
                        type="number"
                        min={1}
                        max={720}
                        value={settings.checklistValidityHours}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            checklistValidityHours: parseInt(e.target.value) || 24,
                          }))
                        }
                        className="w-32"
                      />
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        horas ({Math.floor(settings.checklistValidityHours / 24)} dias)
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Card 2: Restrições e Bloqueios (D08, D09) */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-50 dark:bg-blue-950/40 rounded-md text-blue-600 dark:text-blue-400">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
                      Regras de Bloqueio e Compras
                    </CardTitle>
                    <CardDescription>
                      Condições restritivas de rota e compras na manutenção (D08, D09)
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Bloquear por Licenciamento Vencido</Label>
                    <p className="text-xs text-slate-500">
                      Impede a saída e o despacho em rotas quando o CRLV estiver fora da validade legal.
                    </p>
                  </div>
                  <Switch
                    checked={settings.blockOnExpiredLicense}
                    onCheckedChange={(val) =>
                      setSettings((prev) => ({ ...prev, blockOnExpiredLicense: val }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">
                      Cancelar Pedido de Compra ao Cancelar Manutenção
                    </Label>
                    <p className="text-xs text-slate-500">
                      Se ativado, requisições de compras em aberto vinculadas à OS são canceladas automaticamente (D08).
                    </p>
                  </div>
                  <Switch
                    checked={settings.cancelPurchaseRequestsOnMaintenanceCancel}
                    onCheckedChange={(val) =>
                      setSettings((prev) => ({
                        ...prev,
                        cancelPurchaseRequestsOnMaintenanceCancel: val,
                      }))
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* Card 3: Link Público de Terceiros (D07) */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm md:col-span-2">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-amber-50 dark:bg-amber-950/40 rounded-md text-amber-600 dark:text-amber-400">
                    <Car className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
                      Autosserviço e Onboarding de Terceiros
                    </CardTitle>
                    <CardDescription>
                      Link público aberto para pré-cadastro de motoristas e frotas parceiras (Decisão D07)
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Habilitar Cadastro Público via Link</Label>
                    <p className="text-xs text-slate-500">
                      Permite que prestadores parceiros iniciem o pré-cadastro sem convite prévio por e-mail.
                    </p>
                  </div>
                  <Switch
                    checked={settings.publicRegistrationEnabled}
                    onCheckedChange={(val) =>
                      setSettings((prev) => ({ ...prev, publicRegistrationEnabled: val }))
                    }
                  />
                </div>

                {settings.publicRegistrationEnabled && settings.publicRegistrationToken && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Link Público Exclusivo da sua Empresa
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        readOnly
                        value={
                          typeof window !== 'undefined'
                            ? `${window.location.origin}/onboarding/external-driver?token=${settings.publicRegistrationToken}`
                            : `https://.../onboarding/external-driver?token=${settings.publicRegistrationToken}`
                        }
                        className="bg-white dark:bg-slate-950 font-mono text-xs"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handleCopyPublicLink}
                        className="shrink-0 gap-1.5"
                      >
                        {copiedToken ? (
                          <>
                            <Check className="h-4 w-4 text-emerald-600" />
                            Copiado!
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" />
                            Copiar Link
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleRegenerateToken}
                        className="shrink-0 text-slate-600 dark:text-slate-400"
                        title="Regenerar Token (invalida links anteriores)"
                      >
                        <RotateCw className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5 pt-1">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      O motorista externo permanecerá com status PENDENTE até aprovação formal do operador.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleSaveSettings}
              disabled={savingSettings}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            >
              <Save className="h-4 w-4" />
              {savingSettings ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </TabsContent>

        {/* ABA 2: GESTORES E DESTINATÁRIOS DE ALERTAS (D06) */}
        <TabsContent value="managers" className="space-y-6">
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Responsáveis e Destinatários de Alertas da Frota
                </CardTitle>
                <CardDescription>
                  Usuários configurados para receber boletins operacionais e notificações preventivas (Decisão D06)
                </CardDescription>
              </div>
              <Button
                onClick={handleOpenAddManagerModal}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
              >
                <Plus className="h-4 w-4" />
                Adicionar Gestor
              </Button>
            </CardHeader>
            <CardContent>
              {loadingManagers ? (
                <div className="py-8 text-center text-sm text-slate-500">Carregando gestores...</div>
              ) : managers.length === 0 ? (
                <WorkspaceStateCard title="Nenhum gestor cadastrado">
                  <p className="text-sm text-slate-500">
                    Adicione responsáveis para receber alertas de manutenção e boletins de checklist por e-mail.
                  </p>
                </WorkspaceStateCard>
              ) : (
                <div className="rounded-md border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-900">
                      <TableRow>
                        <TableHead>Usuário</TableHead>
                        <TableHead>E-mail</TableHead>
                        <TableHead>Escopo / Filial</TableHead>
                        <TableHead className="text-center">Notificação E-mail</TableHead>
                        <TableHead className="text-center">Alerta Manutenção</TableHead>
                        <TableHead className="text-center">Alerta Checklist</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {managers.map((mgr) => (
                        <TableRow key={mgr.id}>
                          <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                            {mgr.user?.name || 'Usuário'}
                          </TableCell>
                          <TableCell className="text-slate-600 dark:text-slate-400">
                            {mgr.user?.email}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-slate-50 dark:bg-slate-900">
                              {mgr.branch?.name || 'Todas as Filiais'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {mgr.notifyEmail ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {mgr.notifyMaintenanceAlerts ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {mgr.notifyChecklistAlerts ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteManager(mgr.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA 3: MODELOS DE CHECKLIST (AC-02, AC-03) */}
        <TabsContent value="templates" className="space-y-6">
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Catálogo de Modelos de Checklist
                </CardTitle>
                <CardDescription>
                  Templates customizados de inspeção veicular por tipo de movimento e categoria (AC-02, AC-03)
                </CardDescription>
              </div>
              <Button
                onClick={() => setIsTemplateModalOpen(true)}
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5"
              >
                <Plus className="h-4 w-4" />
                Novo Modelo
              </Button>
            </CardHeader>
            <CardContent>
              {loadingTemplates ? (
                <div className="py-8 text-center text-sm text-slate-500">Carregando modelos...</div>
              ) : templates.length === 0 ? (
                <WorkspaceStateCard title="Nenhum modelo cadastrado">
                  <p className="text-sm text-slate-500">
                    Crie o primeiro modelo de checklist com itens obrigatórios e categorias para saídas e retornos.
                  </p>
                </WorkspaceStateCard>
              ) : (
                <div className="rounded-md border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-900">
                      <TableRow>
                        <TableHead>Nome do Modelo</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Versão</TableHead>
                        <TableHead>Itens</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {templates.map((tmpl) => (
                        <TableRow key={tmpl.id}>
                          <TableCell>
                            <div className="font-medium text-slate-900 dark:text-slate-100">
                              {tmpl.name}
                            </div>
                            {tmpl.description && (
                              <div className="text-xs text-slate-500">{tmpl.description}</div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-slate-50 dark:bg-slate-900 text-xs">
                              {getTypeLabel(tmpl.type)}
                            </Badge>
                          </TableCell>
                          <TableCell>v{tmpl.version}</TableCell>
                          <TableCell>
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                              {tmpl.items?.length || 0} itens cadastrados
                            </span>
                          </TableCell>
                          <TableCell>
                            {tmpl.active ? (
                              <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200">
                                Ativo
                              </Badge>
                            ) : (
                              <Badge className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-300">
                                Inativo
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteTemplate(tmpl)}
                              className="text-slate-600 hover:text-red-600"
                              title="Inativar ou Excluir"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODAL: ADICIONAR GESTOR */}
      <Dialog open={isManagerModalOpen} onOpenChange={setIsManagerModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Gestor de Frota</DialogTitle>
            <DialogDescription>
              Vincule um usuário da empresa para receber relatórios e alertas operacionais.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Usuário Responsável</Label>
              <Select value={newManagerUserId} onValueChange={setNewManagerUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o usuário" />
                </SelectTrigger>
                <SelectContent>
                  {usersList.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3 pt-2">
              <Label className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
                Canais de Notificação
              </Label>
              <div className="flex items-center justify-between">
                <span className="text-sm">Notificar por E-mail</span>
                <Switch
                  checked={newManagerNotifyEmail}
                  onCheckedChange={setNewManagerNotifyEmail}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Alertas de Manutenção Preventiva</span>
                <Switch
                  checked={newManagerNotifyMaintenance}
                  onCheckedChange={setNewManagerNotifyMaintenance}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Alertas de Checklist e Bloqueios</span>
                <Switch
                  checked={newManagerNotifyChecklist}
                  onCheckedChange={setNewManagerNotifyChecklist}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsManagerModalOpen(false)}
              disabled={savingManager}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateManager}
              disabled={savingManager}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {savingManager ? 'Salvando...' : 'Salvar Gestor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: NOVO MODELO DE CHECKLIST */}
      <Dialog open={isTemplateModalOpen} onOpenChange={setIsTemplateModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Modelo de Checklist</DialogTitle>
            <DialogDescription>
              Configure o tipo de inspeção e os itens verificados pelo operador.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Nome do Modelo *</Label>
                <Input
                  placeholder="Ex: Inspeção de Saída Caminhão Pesado"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Tipo do Checklist *</Label>
                <Select
                  value={templateType}
                  onValueChange={(val: ChecklistTemplateItem['type']) => setTemplateType(val)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DELIVERY">Saída de Viagem / Entrega</SelectItem>
                    <SelectItem value="RECEIVEMENT">Chegada de Viagem / Retorno</SelectItem>
                    <SelectItem value="MAINTENANCE_EXIT">Saída de Manutenção</SelectItem>
                    <SelectItem value="PERIODIC">Inspeção Periódica</SelectItem>
                    <SelectItem value="CORRECTIVE">Inspeção Corretiva</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Descrição / Observações</Label>
              <Input
                placeholder="Ex: Utilizado para rotas interestaduais com cavalos mecânicos"
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
              />
            </div>

            <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Itens de Verificação</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddTemplateItem}
                  className="gap-1 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" /> Adicionar Item
                </Button>
              </div>

              <div className="space-y-2.5">
                {templateItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800"
                  >
                    <div className="flex-1">
                      <Input
                        placeholder="Nome do item (ex: Nível do óleo)"
                        value={item.name}
                        onChange={(e) =>
                          handleUpdateTemplateItem(idx, 'name', e.target.value)
                        }
                        className="h-8 text-xs bg-white dark:bg-slate-950"
                      />
                    </div>
                    <div className="w-32">
                      <Input
                        placeholder="Categoria"
                        value={item.category}
                        onChange={(e) =>
                          handleUpdateTemplateItem(idx, 'category', e.target.value)
                        }
                        className="h-8 text-xs bg-white dark:bg-slate-950"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 px-2">
                      <Switch
                        checked={item.required}
                        onCheckedChange={(val) =>
                          handleUpdateTemplateItem(idx, 'required', val)
                        }
                      />
                      <span className="text-[11px] text-slate-500">Obrigatório</span>
                    </div>
                    {templateItems.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveTemplateItem(idx)}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsTemplateModalOpen(false)}
              disabled={savingTemplate}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateTemplate}
              disabled={savingTemplate}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {savingTemplate ? 'Salvando...' : 'Criar Modelo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
