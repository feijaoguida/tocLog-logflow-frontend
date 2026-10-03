'use client'

import React, { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  Save,
  RotateCw,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Shield,
  Clock,
  Cpu,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/api'

interface AiSettingsData {
  id?: string
  companyId?: string
  enabled: boolean
  defaultConnectionId?: string | null
  defaultModelId?: string | null
  maxOutputTokens: number
  timeoutSeconds: number
  maxToolIterations: number
  defaultDailyTokenQuota: number
  retentionDays: number
}

interface ConnectionOption {
  id: string
  name: string
  provider: string
  defaultModelId?: string
  active: boolean
}

export default function AiGeneralSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [connections, setConnections] = useState<ConnectionOption[]>([])
  const [formData, setFormData] = useState<AiSettingsData>({
    enabled: false,
    defaultConnectionId: '',
    defaultModelId: '',
    maxOutputTokens: 4000,
    timeoutSeconds: 60,
    maxToolIterations: 5,
    defaultDailyTokenQuota: 100000,
    retentionDays: 90,
  })

  useEffect(() => {
    void loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [settingsRes, connectionsRes] = await Promise.all([
        api.get('/ai/settings'),
        api.get('/ai/connections'),
      ])

      const s = settingsRes.data
      setFormData({
        id: s.id,
        companyId: s.companyId,
        enabled: Boolean(s.enabled),
        defaultConnectionId: s.defaultConnectionId || '',
        defaultModelId: s.defaultModelId || '',
        maxOutputTokens: s.maxOutputTokens || 4000,
        timeoutSeconds: s.timeoutSeconds || 60,
        maxToolIterations: s.maxToolIterations || 5,
        defaultDailyTokenQuota: s.defaultDailyTokenQuota || 100000,
        retentionDays: s.retentionDays || 90,
      })

      const list = Array.isArray(connectionsRes.data)
        ? connectionsRes.data
        : connectionsRes.data?.items || []
      setConnections(list)
    } catch {
      toast.error('Erro ao carregar configurações de IA.')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validação de ativação incompleta (AC-01)
    if (formData.enabled && !formData.defaultConnectionId) {
      toast.error('Selecione uma conexão padrão antes de ativar o sistema de IA.')
      return
    }

    setSaving(true)
    try {
      const payload: any = {
        enabled: formData.enabled,
        defaultConnectionId: formData.defaultConnectionId || null,
        defaultModelId: formData.defaultModelId || null,
        maxOutputTokens: Number(formData.maxOutputTokens),
        timeoutSeconds: Number(formData.timeoutSeconds),
        maxToolIterations: Number(formData.maxToolIterations),
        defaultDailyTokenQuota: Number(formData.defaultDailyTokenQuota),
        retentionDays: Number(formData.retentionDays),
      }
      if ((formData as any).version) {
        payload.version = (formData as any).version
      }

      const { data } = await api.put('/ai/settings', payload)
      if (data?.version) {
        setFormData((prev: any) => ({ ...prev, version: data.version }))
      }
      toast.success('Configurações de inteligência artificial atualizadas com sucesso.')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Falha ao salvar configurações.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="py-20 text-center text-sm text-muted-foreground">
        <RotateCw className="size-5 animate-spin mx-auto mb-2 text-primary" />
        Carregando configurações gerais...
      </div>
    )
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
      {/* 1. Ativação Geral */}
      <Card className="app-section-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                <Cpu className="size-4 text-primary" />
                <span>Habilitação da IA na Empresa</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Ativa os assistentes e endpoints de consulta para todos os colaboradores com permissão.
              </CardDescription>
            </div>
            <Switch
              checked={formData.enabled}
              onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
            />
          </div>
        </CardHeader>
        <CardContent>
          {formData.enabled && !formData.defaultConnectionId && (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-400 flex items-start gap-2">
              <AlertTriangle className="size-4 shrink-0 mt-0.5" />
              <span>
                <strong>Atenção:</strong> A IA está marcada como habilitada, mas nenhuma conexão de provedor foi configurada como padrão.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Provedor e Modelo Padrão */}
      <Card className="app-section-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <Sliders className="size-4 text-primary" />
            <span>Roteamento Padrão de Modelos</span>
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Defina qual credencial ativa e modelo LLM respondem às consultas gerais do sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Conexão Padrão
              </Label>
              <select
                value={formData.defaultConnectionId || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    defaultConnectionId: e.target.value || null,
                  })
                }
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs sm:text-sm text-foreground outline-none focus:border-primary"
              >
                <option value="">Nenhuma selecionada</option>
                {connections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.provider}) {c.active ? '— Ativa' : '— Inativa'}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Identificador do Modelo Padrão
              </Label>
              <Input
                value={formData.defaultModelId || ''}
                onChange={(e) => setFormData({ ...formData, defaultModelId: e.target.value })}
                placeholder="Ex: gpt-4o, claude-3-5-sonnet, gemini-1.5-pro"
                className="h-9 text-xs sm:text-sm"
              />
              <p className="text-[11px] text-muted-foreground">
                Deixe em branco para utilizar o modelo padrão recomendado pelo provedor.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Limites Operacionais e Cotas */}
      <Card className="app-section-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <Shield className="size-4 text-primary" />
            <span>Limites e Contenção de Custos</span>
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Proteção contra loops de ferramentas, respostas excessivamente longas e estouro de cota diária.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Cota Diária por Usuário (Tokens)
              </Label>
              <Input
                type="number"
                value={formData.defaultDailyTokenQuota}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    defaultDailyTokenQuota: Number(e.target.value),
                  })
                }
                min={1000}
                max={10000000}
                className="h-9 text-xs sm:text-sm font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Máximo de Tokens de Saída
              </Label>
              <Input
                type="number"
                value={formData.maxOutputTokens}
                onChange={(e) =>
                  setFormData({ ...formData, maxOutputTokens: Number(e.target.value) })
                }
                min={500}
                max={16000}
                className="h-9 text-xs sm:text-sm font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Iterações Máximas de Ferramentas
              </Label>
              <Input
                type="number"
                value={formData.maxToolIterations}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    maxToolIterations: Number(e.target.value),
                  })
                }
                min={1}
                max={10}
                className="h-9 text-xs sm:text-sm font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Timeout por Requisição (Segundos)
              </Label>
              <Input
                type="number"
                value={formData.timeoutSeconds}
                onChange={(e) =>
                  setFormData({ ...formData, timeoutSeconds: Number(e.target.value) })
                }
                min={10}
                max={300}
                className="h-9 text-xs sm:text-sm font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Clock className="size-3.5" />
                <span>Retenção de Auditoria (Dias)</span>
              </Label>
              <Input
                type="number"
                value={formData.retentionDays}
                onChange={(e) =>
                  setFormData({ ...formData, retentionDays: Number(e.target.value) })
                }
                min={7}
                max={730}
                className="h-9 text-xs sm:text-sm font-mono"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rodapé de Ações */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 text-xs"
          onClick={() => void loadData()}
          disabled={saving}
        >
          Descartar
        </Button>
        <Button
          type="submit"
          size="sm"
          className="h-9 text-xs gap-1.5 font-semibold"
          disabled={saving}
        >
          {saving ? <RotateCw className="size-4 animate-spin" /> : <Save className="size-4" />}
          <span>Salvar Alterações</span>
        </Button>
      </div>
    </form>
  )
}
