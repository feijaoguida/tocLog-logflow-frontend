'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { MenuFunctionHeader } from '@/components/layout/menu-function-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
        toast.error(getApiErrorMessage(error, 'Nao foi possivel carregar as configuracoes de feedback.'))
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
      toast.success('Configuracoes de feedback atualizadas com sucesso.')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Nao foi possivel salvar as configuracoes de feedback.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="app-page">
      <MenuFunctionHeader
        title="Recursos Humanos > Configuracoes"
        description="Area de governanca para regras operacionais do RH. Esta tela agora persiste as decisoes do modulo por empresa."
        actions={
          <Badge variant="outline" className="rounded-full px-4 py-2">
            Governanca RH
          </Badge>
        }
      />

      <Tabs defaultValue="feedbacks" className="space-y-6">
        <TabsList className="grid w-full max-w-[460px] grid-cols-2">
          <TabsTrigger value="feedbacks">Feedbacks</TabsTrigger>
          <TabsTrigger value="future">Outras decisoes</TabsTrigger>
        </TabsList>

        <TabsContent value="feedbacks" className="space-y-6">
          <Card className="app-section-card">
            <CardHeader>
              <CardTitle className="text-xl">Roteamento do feedback para empresa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="field-stack">
                <Label htmlFor="routing-mode">Destino inicial</Label>
                {loading ? (
                  <Skeleton className="h-10 w-full rounded-xl" />
                ) : (
                  <Select
                    value={routingMode}
                    onValueChange={(value) =>
                      setRoutingMode(value as FeedbackSettingsRecord['routingMode'])
                    }
                  >
                    <SelectTrigger id="routing-mode">
                      <SelectValue placeholder="Selecione o destino" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="branch-owner">Responsavel da filial</SelectItem>
                      <SelectItem value="central-hr">RH geral</SelectItem>
                      <SelectItem value="both">Ambos</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                <p className="text-sm leading-6 text-muted-foreground">
                  Esta preferencia fica registrada por empresa para orientar a governanca do modulo sem depender de deploy.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-start justify-between rounded-[20px] border border-border/70 bg-muted/35 p-4">
                  <div className="space-y-1">
                    <p className="font-medium">Permitir override explicito</p>
                    <p className="text-sm leading-6 text-muted-foreground">
                      Mantem a regra de que RH so entra em 1 para 1 quando houver denuncia ou autorizacao explicita.
                    </p>
                  </div>
                  <Switch
                    checked={allowExplicitOverride}
                    onCheckedChange={setAllowExplicitOverride}
                    disabled={loading}
                  />
                </div>

                <div className="flex items-start justify-between rounded-[20px] border border-border/70 bg-muted/35 p-4">
                  <div className="space-y-1">
                    <p className="font-medium">Exibir label de visibilidade</p>
                    <p className="text-sm leading-6 text-muted-foreground">
                      Mostra na UI se um feedback 1 para 1 tambem esta visivel para RH.
                    </p>
                  </div>
                  <Switch
                    checked={showVisibilityLabel}
                    onCheckedChange={setShowVisibilityLabel}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button onClick={handleSave} disabled={loading || saving}>
                  {saving ? 'Salvando...' : 'Salvar configuracoes'}
                </Button>
                <Badge variant="outline" className="rounded-full px-3 py-2">
                  Persistencia por empresa ativa
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="future">
          <Card className="app-section-card">
            <CardHeader>
              <CardTitle className="text-xl">Espaco para futuras regras do RH</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
              <p>Esta area foi aberta para concentrar decisoes operacionais configuraveis do RH no mesmo lugar.</p>
              <p>
                Exemplos naturais para as proximas iteracoes: regras de SLA, distribuicao por filial, alertas,
                surveys por publico e politicas de leitura obrigatoria.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
