'use client'

import React, { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  Save,
  RotateCw,
  AlertTriangle,
  Sliders,
  Shield,
  Clock,
  Cpu,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/api'
import { reportError } from '@/lib/error-reporter'

interface AiSettingsData {
  id?: string
  companyId?: string
  version?: number
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
  defaultModel?: string | null
  active: boolean
}

const KNOWN_MODELS_BY_PROVIDER: Record<string, Array<{ id: string; name: string }>> = {
  OPENROUTER: [
    { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash (Rápido & Econômico)' },
    { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet (Raciocínio & Código)' },
    { id: 'openai/gpt-4o', name: 'OpenAI GPT-4o' },
    { id: 'openai/gpt-4o-mini', name: 'OpenAI GPT-4o Mini' },
    { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3' },
    { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B Instruct' },
    { id: 'qwen/qwen-2.5-72b-instruct', name: 'Qwen 2.5 72B Instruct' },
  ],
  OPENAI: [
    { id: 'gpt-4o', name: 'GPT-4o (Recomendado)' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Econômico)' },
    { id: 'o1', name: 'OpenAI o1' },
    { id: 'o3-mini', name: 'OpenAI o3-mini' },
  ],
  ANTHROPIC: [
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet (Recomendado)' },
    { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku (Rápido)' },
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
  ],
  GEMINI: [
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash (Recomendado)' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
  ],
}

export default function AiGeneralSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [connections, setConnections] = useState<ConnectionOption[]>([])
  const [isCustomModel, setIsCustomModel] = useState(false)
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
        version: s.version,
        enabled: Boolean(s.enabled),
        defaultConnectionId: s.defaultConnectionId || '',
        defaultModelId: s.defaultModelId || '',
        maxOutputTokens: s.maxOutputTokens || 4000,
        timeoutSeconds: s.timeoutSeconds || 60,
        maxToolIterations: s.maxToolIterations || 5,
        defaultDailyTokenQuota: s.defaultDailyTokenQuota ?? s.dailyMessageLimit ?? 100000,
        retentionDays: s.retentionDays || 90,
      })

      const list = Array.isArray(connectionsRes.data)
        ? connectionsRes.data
        : connectionsRes.data?.items || []
      setConnections(list)
    } catch (err) {
      toast.error('Erro ao carregar configurações de IA.')
      reportError(err, {
        module: 'AI_SETTINGS',
        screen: '/dashboard/settings/ai',
        action: 'loadData',
        errorMessage: 'Erro ao carregar configurações de IA.',
      })
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
    let payload: Record<string, unknown> | null = null
    try {
      payload = {
        enabled: formData.enabled,
        defaultConnectionId: formData.defaultConnectionId || null,
        defaultModelId: formData.defaultModelId || null,
        maxOutputTokens: Number(formData.maxOutputTokens),
        timeoutSeconds: Number(formData.timeoutSeconds),
        maxToolIterations: Number(formData.maxToolIterations),
        defaultDailyTokenQuota: Number(formData.defaultDailyTokenQuota),
        dailyMessageLimit: Number(formData.defaultDailyTokenQuota),
        retentionDays: Number(formData.retentionDays),
      }
      if (formData.version !== undefined) {
        payload.version = formData.version
      }

      const { data } = await api.put('/ai/settings', payload)
      if (data?.version) {
        setFormData((prev) => ({ ...prev, version: data.version }))
      }
      toast.success('Configurações de inteligência artificial atualizadas com sucesso.')
    } catch (err: unknown) {
      const respData = (err as { response?: { data?: { message?: string } } })?.response?.data
      const msg = respData?.message || 'Falha ao salvar configurações.'
      toast.error(msg)
      reportError(err, {
        module: 'AI_SETTINGS',
        screen: '/dashboard/settings/ai',
        action: 'handleSave',
        errorMessage: msg,
        requestPayload: payload,
      })
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
                onChange={(e) => {
                  const connId = e.target.value
                  const conn = connections.find((c) => c.id === connId)
                  setFormData((prev) => ({
                    ...prev,
                    defaultConnectionId: connId || null,
                    defaultModelId: conn?.defaultModel || prev.defaultModelId,
                  }))
                }}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs sm:text-sm text-foreground outline-none focus:border-primary"
              >
                <option value="">Nenhuma selecionada</option>
                {connections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.provider}) {c.defaultModel ? `[${c.defaultModel}]` : ''} {c.active ? '— Ativa' : '— Inativa'}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-primary" />
                  Modelo Padrão
                </Label>
                <button
                  type="button"
                  onClick={() => setIsCustomModel((v) => !v)}
                  className="text-[11px] text-primary hover:underline font-medium"
                >
                  {isCustomModel ? '← Escolher da lista' : '+ Digitar outro modelo'}
                </button>
              </div>

              {(() => {
                const activeConn = connections.find((c) => c.id === formData.defaultConnectionId)
                const providerModels = activeConn ? (KNOWN_MODELS_BY_PROVIDER[activeConn.provider] || []) : []

                if (!isCustomModel && providerModels.length > 0) {
                  return (
                    <div className="space-y-1">
                      <select
                        value={formData.defaultModelId || ''}
                        onChange={(e) => setFormData({ ...formData, defaultModelId: e.target.value })}
                        className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs sm:text-sm text-foreground outline-none focus:border-primary font-mono"
                      >
                        <option value="">Padrão do Provedor (Recomendado)</option>
                        {providerModels.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.id})
                          </option>
                        ))}
                      </select>
                      <p className="text-[11px] text-muted-foreground">
                        Modelo que responderá por padrão às requisições do sistema.
                      </p>
                    </div>
                  )
                }

                return (
                  <div className="space-y-1">
                    <Input
                      value={formData.defaultModelId || ''}
                      onChange={(e) => setFormData({ ...formData, defaultModelId: e.target.value })}
                      placeholder="Ex: google/gemini-2.0-flash-001, gpt-4o, claude-3-5-sonnet"
                      className="h-9 text-xs sm:text-sm font-mono"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Deixe em branco para utilizar o modelo padrão recomendado pelo provedor.
                    </p>
                  </div>
                )
              })()}
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
