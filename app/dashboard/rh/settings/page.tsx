'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Save,
  RotateCw,
  Sliders,
  ShieldCheck,
  Eye,
  Building2,
  Lock,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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

export default function HrSettingsPage() {
  const [routingMode, setRoutingMode] =
    useState<FeedbackSettingsRecord['routingMode']>('branch-owner')
  const [allowExplicitOverride, setAllowExplicitOverride] = useState(true)
  const [showVisibilityLabel, setShowVisibilityLabel] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function loadSettings() {
      try {
        const { data } = await api.get<FeedbackSettingsRecord>('/feedbacks/settings')
        setRoutingMode(data.routingMode)
        setAllowExplicitOverride(data.allowExplicitOverride)
        setShowVisibilityLabel(data.showVisibilityLabel)
      } catch (error) {
        toast.error(getApiErrorMessage(error, 'Não foi possível carregar as configurações de feedback.'))
      } finally {
        setLoading(false)
      }
    }

    void loadSettings()
  }, [])

  async function handleSave() {
    setSaving(true)

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
      setSaving(false)
    }
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
              Governança
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Área de governança para regras operacionais e políticas de feedback por empresa.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={loading || saving}
            className="h-8 gap-1.5"
          >
            {saving ? (
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
        </div>
      </div>

      {/* 2. 4 KPI Summary Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="p-4 shadow-sm border-border/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Destino do Feedback
            </span>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold tracking-tight text-foreground">
              {loading ? '...' : getRoutingLabel(routingMode)}
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
              {loading ? '...' : allowExplicitOverride ? 'Permitido' : 'Bloqueado'}
            </span>
            <span className={`inline-flex h-2 w-2 rounded-full ${allowExplicitOverride ? 'bg-emerald-500' : 'bg-muted-foreground'}`} />
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
              {loading ? '...' : showVisibilityLabel ? 'Ativo' : 'Oculto'}
            </span>
            <span className={`inline-flex h-2 w-2 rounded-full ${showVisibilityLabel ? 'bg-emerald-500' : 'bg-muted-foreground'}`} />
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
      </div>

      {/* 3. Main Workspace Tabs */}
      <Tabs defaultValue="feedbacks" className="space-y-6">
        <TabsList className="grid w-full max-w-[420px] grid-cols-2">
          <TabsTrigger value="feedbacks" className="gap-2">
            <Sliders className="h-4 w-4" />
            Feedbacks
          </TabsTrigger>
          <TabsTrigger value="future" className="gap-2">
            <Building2 className="h-4 w-4" />
            Outras Decisões
          </TabsTrigger>
        </TabsList>

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
                {loading ? (
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
                    disabled={loading}
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
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-border/60 pt-4">
                <Badge variant="outline" className="border-border/60 text-xs text-muted-foreground">
                  Persistência multi-tenant ativa
                </Badge>
                <Button
                  onClick={handleSave}
                  disabled={loading || saving}
                  size="sm"
                  className="gap-1.5"
                >
                  {saving ? (
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
                  Políticas de SLA de resposta para férias e despesas, regras de distribuição por filial, alertas automáticos e leituras obrigatórias.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
