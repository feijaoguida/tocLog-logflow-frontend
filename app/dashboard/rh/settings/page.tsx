'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import {
  Save,
  RotateCw,
  Sliders,
  ShieldCheck,
  Eye,
  Building2,
  Lock,
  Calendar,
  Mail,
  Plus,
  X,
  FileCheck,
  BadgeDollarSign,
  AlertTriangle,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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

type FeedbackSettingsRecord = {
  routingMode: 'branch-owner' | 'central-hr' | 'both'
  allowExplicitOverride: boolean
  showVisibilityLabel: boolean
}

export interface VacationSettingsData {
  id?: string
  companyId?: string
  requireEmployeeAcceptanceOnReservation: boolean
  minNoticeDays: number
  allowCashAllowance: boolean
  maxCashAllowanceDays: number
  maxInstallments?: number
  minInstallmentDays?: number
  minMainInstallmentDays?: number
  hrNotificationEmails: string[]
}

function HrSettingsContent() {
  const searchParams = useSearchParams()
  const initialTab = searchParams?.get('tab') === 'vacations' ? 'vacations' : 'feedbacks'
  const [activeTab, setActiveTab] = useState(initialTab)

  // Configurações de Feedback
  const [routingMode, setRoutingMode] =
    useState<FeedbackSettingsRecord['routingMode']>('branch-owner')
  const [allowExplicitOverride, setAllowExplicitOverride] = useState(true)
  const [showVisibilityLabel, setShowVisibilityLabel] = useState(true)
  const [loadingFeedback, setLoadingFeedback] = useState(true)
  const [savingFeedback, setSavingFeedback] = useState(false)

  // Configurações do Módulo de Férias e Venda (Abono)
  const [vacationSettings, setVacationSettings] = useState<VacationSettingsData>({
    requireEmployeeAcceptanceOnReservation: true,
    minNoticeDays: 30,
    allowCashAllowance: true,
    maxCashAllowanceDays: 10,
    hrNotificationEmails: [],
  })
  const [loadingVacations, setLoadingVacations] = useState(true)
  const [savingVacations, setSavingVacations] = useState(false)
  const [newEmailTag, setNewEmailTag] = useState('')

  useEffect(() => {
    async function loadData() {
      try {
        const [feedbackRes, vacationRes] = await Promise.allSettled([
          api.get<FeedbackSettingsRecord>('/feedbacks/settings'),
          api.get<VacationSettingsData>('/vacations/settings'),
        ])

        if (feedbackRes.status === 'fulfilled') {
          const data = feedbackRes.value.data
          setRoutingMode(data.routingMode)
          setAllowExplicitOverride(data.allowExplicitOverride)
          setShowVisibilityLabel(data.showVisibilityLabel)
        }

        if (vacationRes.status === 'fulfilled' && vacationRes.value.data) {
          setVacationSettings(vacationRes.value.data)
        }
      } catch (error) {
        toast.error(getApiErrorMessage(error, 'Erro ao carregar configurações de RH.'))
      } finally {
        setLoadingFeedback(false)
        setLoadingVacations(false)
      }
    }

    void loadData()
  }, [])

  async function handleSaveFeedback() {
    setSavingFeedback(true)
    try {
      await api.patch('/feedbacks/settings', {
        routingMode,
        allowExplicitOverride,
        showVisibilityLabel,
      })
      toast.success('Configurações de feedback atualizadas com sucesso.')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível salvar as configurações de feedback.'))
    } finally {
      setSavingFeedback(false)
    }
  }

  async function handleSaveVacationSettings() {
    if (!vacationSettings) return
    setSavingVacations(true)
    try {
      const { data } = await api.put<VacationSettingsData>('/vacations/settings', vacationSettings)
      setVacationSettings(data)
      toast.success('Configurações do módulo de férias atualizadas com sucesso!')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível salvar as configurações de férias.'))
    } finally {
      setSavingVacations(false)
    }
  }

  function handleAddEmailTag() {
    const email = newEmailTag.trim().toLowerCase()
    if (!email) return
    if (!email.includes('@') || !email.includes('.')) {
      toast.error('Informe um endereço de e-mail válido.')
      return
    }
    if (vacationSettings.hrNotificationEmails.includes(email)) {
      toast.info('Este e-mail já está cadastrado.')
      return
    }
    setVacationSettings({
      ...vacationSettings,
      hrNotificationEmails: [...vacationSettings.hrNotificationEmails, email],
    })
    setNewEmailTag('')
  }

  function handleRemoveEmailTag(email: string) {
    setVacationSettings({
      ...vacationSettings,
      hrNotificationEmails: vacationSettings.hrNotificationEmails.filter((e) => e !== email),
    })
  }

  const getRoutingLabel = (mode: FeedbackSettingsRecord['routingMode']) => {
    switch (mode) {
      case 'branch-owner':
        return 'Resp. Filial'
      case 'central-hr':
        return 'RH Geral'
      case 'both':
        return 'Ambos'
      default:
        return mode
    }
  }

  const isVacationTab = activeTab === 'vacations'

  return (
    <div className="space-y-6">
      {/* 1. Standard Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Configurações de RH
            </h1>
            <Badge variant="outline" className="border-border/60 bg-muted/40 text-xs font-normal">
              Governança & CLT
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Área de governança para regras operacionais, venda de férias, fluxos de aprovação e políticas de feedback por empresa.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isVacationTab ? (
            <Button
              size="sm"
              onClick={handleSaveVacationSettings}
              disabled={loadingVacations || savingVacations}
              className="h-8 gap-1.5 font-semibold"
            >
              {savingVacations ? (
                <>
                  <RotateCw className="h-3.5 w-3.5 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  Salvar Configurações de Férias
                </>
              )}
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleSaveFeedback}
              disabled={loadingFeedback || savingFeedback}
              className="h-8 gap-1.5"
            >
              {savingFeedback ? (
                <>
                  <RotateCw className="h-3.5 w-3.5 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  Salvar Alterações
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* 2. 4 KPI Summary Cards (Dinâmicos conforme a Aba Ativa) */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {isVacationTab ? (
          <>
            <Card className="p-4 shadow-sm border-border/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Venda de Férias (Abono)
                </span>
                <BadgeDollarSign className="h-4 w-4 text-amber-500" />
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-foreground">
                  {loadingVacations
                    ? '...'
                    : vacationSettings.allowCashAllowance
                    ? `Até ${vacationSettings.maxCashAllowanceDays} dias`
                    : 'Desativada'}
                </span>
                <span
                  className={`inline-flex h-2 w-2 rounded-full ${
                    vacationSettings.allowCashAllowance ? 'bg-emerald-500' : 'bg-muted-foreground'
                  }`}
                />
              </div>
              <span className="mt-1 block text-xs text-muted-foreground">
                Art. 143 CLT (limite de 1/3)
              </span>
            </Card>

            <Card className="p-4 shadow-sm border-border/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Aceite em Ressalvas
                </span>
                <FileCheck className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-foreground">
                  {loadingVacations
                    ? '...'
                    : vacationSettings.requireEmployeeAcceptanceOnReservation
                    ? 'Obrigatório'
                    : 'Automático'}
                </span>
                <span
                  className={`inline-flex h-2 w-2 rounded-full ${
                    vacationSettings.requireEmployeeAcceptanceOnReservation
                      ? 'bg-amber-500'
                      : 'bg-blue-500'
                  }`}
                />
              </div>
              <span className="mt-1 block text-xs text-muted-foreground">
                Exige validação do colaborador
              </span>
            </Card>

            <Card className="p-4 shadow-sm border-border/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Aviso Prévio Mínimo
                </span>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2">
                <span className="text-xl font-bold tracking-tight text-foreground">
                  {loadingVacations ? '...' : `${vacationSettings.minNoticeDays} dias`}
                </span>
              </div>
              <span className="mt-1 block text-xs text-muted-foreground">
                Padrão legal CLT (30 dias)
              </span>
            </Card>

            <Card className="p-4 shadow-sm border-border/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Destinatários do RH
                </span>
                <Mail className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-foreground">
                  {loadingVacations ? '...' : `${vacationSettings.hrNotificationEmails.length} e-mails`}
                </span>
                <span
                  className={`inline-flex h-2 w-2 rounded-full ${
                    vacationSettings.hrNotificationEmails.length > 0
                      ? 'bg-emerald-500'
                      : 'bg-amber-500'
                  }`}
                />
              </div>
              <span className="mt-1 block text-xs text-muted-foreground">
                Notificações de solicitações/ressalvas
              </span>
            </Card>
          </>
        ) : (
          <>
            <Card className="p-4 shadow-sm border-border/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Destino do Feedback
                </span>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2">
                <span className="text-xl font-bold tracking-tight text-foreground">
                  {loadingFeedback ? '...' : getRoutingLabel(routingMode)}
                </span>
              </div>
              <span className="mt-1 block text-xs text-muted-foreground">
                Roteamento inicial padrão
              </span>
            </Card>

            <Card className="p-4 shadow-sm border-border/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Override Explícito
                </span>
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-foreground">
                  {loadingFeedback ? '...' : allowExplicitOverride ? 'Permitido' : 'Bloqueado'}
                </span>
                <span
                  className={`inline-flex h-2 w-2 rounded-full ${
                    allowExplicitOverride ? 'bg-emerald-500' : 'bg-muted-foreground'
                  }`}
                />
              </div>
              <span className="mt-1 block text-xs text-muted-foreground">
                1 para 1 com RH reservado
              </span>
            </Card>

            <Card className="p-4 shadow-sm border-border/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Tag de Visibilidade
                </span>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-foreground">
                  {loadingFeedback ? '...' : showVisibilityLabel ? 'Ativo' : 'Oculto'}
                </span>
                <span
                  className={`inline-flex h-2 w-2 rounded-full ${
                    showVisibilityLabel ? 'bg-emerald-500' : 'bg-muted-foreground'
                  }`}
                />
              </div>
              <span className="mt-1 block text-xs text-muted-foreground">
                Exibição visual ao colaborador
              </span>
            </Card>

            <Card className="p-4 shadow-sm border-border/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Persistência
                </span>
                <Lock className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2">
                <span className="text-xl font-bold tracking-tight text-foreground">
                  Por Empresa
                </span>
              </div>
              <span className="mt-1 block text-xs text-muted-foreground">
                Regras isoladas por tenant
              </span>
            </Card>
          </>
        )}
      </div>

      {/* 3. Main Workspace Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-[480px] grid-cols-3">
          <TabsTrigger value="feedbacks" className="gap-2">
            <Sliders className="h-4 w-4" />
            Feedbacks
          </TabsTrigger>
          <TabsTrigger value="vacations" className="gap-2">
            <Calendar className="h-4 w-4" />
            Módulo de Férias
          </TabsTrigger>
          <TabsTrigger value="future" className="gap-2">
            <Building2 className="h-4 w-4" />
            Outras Decisões
          </TabsTrigger>
        </TabsList>

        {/* ============================================================== */}
        {/* ABA: FEEDBACKS                                                 */}
        {/* ============================================================== */}
        <TabsContent value="feedbacks" className="space-y-6">
          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Roteamento do feedback para empresa</CardTitle>
              <CardDescription>
                Define para quem as mensagens e feedbacks anônimos ou direcionados serão roteados por padrão.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2 max-w-xl">
                <Label htmlFor="routing-mode" className="text-sm font-medium">
                  Destino inicial padrão
                </Label>
                {loadingFeedback ? (
                  <Skeleton className="h-10 w-full rounded-md" />
                ) : (
                  <Select
                    value={routingMode}
                    onValueChange={(value) =>
                      setRoutingMode(value as FeedbackSettingsRecord['routingMode'])
                    }
                  >
                    <SelectTrigger id="routing-mode" className="h-9">
                      <SelectValue placeholder="Selecione o destino" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="branch-owner">Responsável da filial</SelectItem>
                      <SelectItem value="central-hr">RH geral</SelectItem>
                      <SelectItem value="both">Ambos (Filial e RH Geral)</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                <p className="text-xs text-muted-foreground">
                  Esta preferência fica registrada por empresa para orientar a governança do módulo sem depender de deploy.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-start justify-between rounded-xl border border-border/60 bg-muted/20 p-4 transition-colors hover:bg-muted/30">
                  <div className="space-y-1 pr-4">
                    <p className="text-sm font-medium text-foreground">Permitir override explícito</p>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Mantém a regra de que RH só entra em reuniões 1 para 1 quando houver denúncia ou autorização explícita.
                    </p>
                  </div>
                  <Switch
                    checked={allowExplicitOverride}
                    onCheckedChange={setAllowExplicitOverride}
                    disabled={loadingFeedback}
                  />
                </div>

                <div className="flex items-start justify-between rounded-xl border border-border/60 bg-muted/20 p-4 transition-colors hover:bg-muted/30">
                  <div className="space-y-1 pr-4">
                    <p className="text-sm font-medium text-foreground">Exibir label de visibilidade</p>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Mostra claramente na interface se um feedback 1 para 1 também está visível para a equipe de Recursos Humanos.
                    </p>
                  </div>
                  <Switch
                    checked={showVisibilityLabel}
                    onCheckedChange={setShowVisibilityLabel}
                    disabled={loadingFeedback}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-border/60 pt-4">
                <Badge variant="outline" className="border-border/60 text-xs text-muted-foreground">
                  Persistência multi-tenant ativa
                </Badge>
                <Button
                  onClick={handleSaveFeedback}
                  disabled={loadingFeedback || savingFeedback}
                  size="sm"
                  className="gap-1.5"
                >
                  {savingFeedback ? (
                    <>
                      <RotateCw className="h-3.5 w-3.5 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5" />
                      Salvar Configurações
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================================== */}
        {/* ABA: MÓDULO DE FÉRIAS & VENDA (CONFIGURAÇÃO CENTRALIZADA)       */}
        {/* ============================================================== */}
        <TabsContent value="vacations" className="space-y-6">
          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Calendar className="size-5 text-primary" />
                    <span>Configurações do Módulo de Férias</span>
                  </CardTitle>
                  <CardDescription>
                    Parâmetros legais CLT, venda de férias (abono pecuniário), fluxo de aprovação com ressalva e notificações do RH.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="border-border/60 text-xs text-muted-foreground hidden sm:inline-flex">
                  Motor de Regras CLT
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {loadingVacations ? (
                <div className="space-y-4">
                  <Skeleton className="h-12 w-full rounded-md" />
                  <Skeleton className="h-12 w-full rounded-md" />
                  <Skeleton className="h-12 w-full rounded-md" />
                </div>
              ) : (
                <>
                  {/* Bloco 1: Regras da Venda de Férias (Abono Pecuniário) */}
                  <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 pr-4">
                        <Label htmlFor="cfg-allow-sell" className="text-sm font-semibold cursor-pointer">
                          Permitir Venda de Férias (Abono Pecuniário)
                        </Label>
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          Habilita a opção para que o colaborador venda parte de suas férias. Pela CLT (Art. 143), é permitida a venda de até 1/3 do período legal de descanso.
                        </p>
                      </div>
                      <Switch
                        id="cfg-allow-sell"
                        checked={vacationSettings.allowCashAllowance}
                        onCheckedChange={(checked) =>
                          setVacationSettings({ ...vacationSettings, allowCashAllowance: checked })
                        }
                      />
                    </div>

                    {vacationSettings.allowCashAllowance && (
                      <div className="pt-3 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <Label htmlFor="cfg-max-sell" className="text-xs font-semibold">
                            Limite Máximo de Dias de Venda
                          </Label>
                          <p className="text-[11px] text-muted-foreground">
                            Teto permitido para venda por solicitação (máximo legal CLT de 10 dias).
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {[5, 10].map((d) => (
                            <Button
                              key={d}
                              type="button"
                              size="sm"
                              variant={vacationSettings.maxCashAllowanceDays === d ? 'default' : 'outline'}
                              className="h-8 text-xs font-semibold"
                              onClick={() =>
                                setVacationSettings({ ...vacationSettings, maxCashAllowanceDays: d })
                              }
                            >
                              {d} dias
                            </Button>
                          ))}
                          <Input
                            id="cfg-max-sell"
                            type="number"
                            min={1}
                            max={10}
                            className="w-20 h-8 text-xs font-semibold text-center"
                            value={vacationSettings.maxCashAllowanceDays}
                            onChange={(e) => {
                              const val = Math.min(10, Math.max(1, Number(e.target.value)))
                              setVacationSettings({
                                ...vacationSettings,
                                maxCashAllowanceDays: val,
                              })
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bloco 2: Regras de Aprovação e Aceite em Ressalvas */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex items-start justify-between rounded-xl border border-border/60 bg-muted/20 p-4 transition-colors hover:bg-muted/30">
                      <div className="space-y-1 pr-4">
                        <Label htmlFor="cfg-req-accept" className="text-sm font-semibold cursor-pointer">
                          Exigir Aceite em Ressalvas
                        </Label>
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          Se ativado, qualquer aprovação pelo gestor ou RH que altere datas ou duração exigirá o aceite formal do colaborador na tela antes de ser efetivada.
                        </p>
                      </div>
                      <Switch
                        id="cfg-req-accept"
                        checked={vacationSettings.requireEmployeeAcceptanceOnReservation}
                        onCheckedChange={(checked) =>
                          setVacationSettings({
                            ...vacationSettings,
                            requireEmployeeAcceptanceOnReservation: checked,
                          })
                        }
                      />
                    </div>

                    <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-2">
                      <Label htmlFor="cfg-notice" className="text-sm font-semibold">
                        Aviso Prévio Mínimo (Dias)
                      </Label>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        Antecedência mínima para que o colaborador cadastre a solicitação. Padrão CLT: 30 dias.
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <Input
                          id="cfg-notice"
                          type="number"
                          min={0}
                          max={90}
                          className="w-24 h-9 text-xs font-semibold"
                          value={vacationSettings.minNoticeDays}
                          onChange={(e) =>
                            setVacationSettings({
                              ...vacationSettings,
                              minNoticeDays: Number(e.target.value),
                            })
                          }
                        />
                        <span className="text-xs text-muted-foreground">dias de antecedência</span>
                      </div>
                    </div>
                  </div>

                  {/* Bloco 3: Lista de E-mails do RH para Notificações Transacionais */}
                  <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
                    <div>
                      <Label className="text-sm font-semibold">
                        Lista de E-mails do RH para Notificações
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Estes e-mails receberão cópias de todas as solicitações, aprovações, ressalvas e cancelamentos de férias corporativas.
                      </p>
                    </div>

                    <div className="flex gap-2 max-w-md">
                      <Input
                        type="email"
                        placeholder="ex: rh-ferias@empresa.com"
                        className="h-9 text-xs"
                        value={newEmailTag}
                        onChange={(e) => setNewEmailTag(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleAddEmailTag()
                          }
                        }}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="h-9 text-xs gap-1 font-semibold"
                        onClick={handleAddEmailTag}
                      >
                        <Plus className="size-3.5" />
                        Adicionar
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      {vacationSettings.hrNotificationEmails.length === 0 ? (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground italic">
                          <AlertTriangle className="size-3.5 text-amber-500" />
                          <span>Nenhum e-mail de RH cadastrado. Alertas serão enviados apenas aos gestores imediatos.</span>
                        </div>
                      ) : (
                        vacationSettings.hrNotificationEmails.map((email) => (
                          <span
                            key={email}
                            className="inline-flex items-center gap-1.5 rounded-md bg-secondary/80 border border-border/50 px-2.5 py-1 text-xs text-secondary-foreground"
                          >
                            <Mail className="size-3 text-muted-foreground" />
                            {email}
                            <button
                              type="button"
                              onClick={() => handleRemoveEmailTag(email)}
                              className="text-muted-foreground hover:text-foreground transition-colors ml-0.5"
                              title="Remover e-mail"
                            >
                              <X className="size-3" />
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Ação de Salvar no Rodapé */}
                  <div className="flex items-center justify-between border-t border-border/60 pt-4">
                    <Badge variant="outline" className="border-border/60 text-xs text-muted-foreground">
                      Parâmetros salvos diretamente no banco de dados por tenant
                    </Badge>
                    <Button
                      onClick={handleSaveVacationSettings}
                      disabled={loadingVacations || savingVacations}
                      size="sm"
                      className="gap-1.5 font-semibold"
                    >
                      {savingVacations ? (
                        <>
                          <RotateCw className="h-3.5 w-3.5 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Save className="h-3.5 w-3.5" />
                          Salvar Configurações de Férias
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================================== */}
        {/* ABA: OUTRAS DECISÕES                                           */}
        {/* ============================================================== */}
        <TabsContent value="future">
          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Políticas e Regras Adicionais do RH</CardTitle>
              <CardDescription>
                Espaço centralizador para futuras customizações operacionais por empresa.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
              <p>
                Esta área foi planejada para concentrar decisões operacionais configuráveis do RH no mesmo lugar.
              </p>
              <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-6 text-center">
                <Sliders className="mx-auto h-8 w-8 text-muted-foreground/60 mb-2" />
                <h3 className="font-semibold text-foreground text-sm">Próximas Funcionalidades Previstas</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                  Políticas de SLA de resposta para despesas, regras de distribuição por filial, alertas automáticos e leituras obrigatórias.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function HrSettingsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Carregando configurações de RH...</div>}>
      <HrSettingsContent />
    </Suspense>
  )
}
