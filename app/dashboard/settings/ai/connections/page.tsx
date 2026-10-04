'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Plus,
  RotateCw,
  Cpu,
  Key,
  CheckCircle2,
  XCircle,
  SlidersHorizontal,
  AlertTriangle,
  Play,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { api } from '@/lib/api'

interface AiConnection {
  id: string
  name: string
  provider: 'OPENAI' | 'ANTHROPIC' | 'GEMINI' | 'OPENROUTER'
  active: boolean
  defaultModel?: string | null
  currentRevision: number
  maskedKey: string
  models?: string[]
  updatedAt: string
}

interface ModelOption {
  id: string
  name: string
}

const KNOWN_MODELS_BY_PROVIDER: Record<string, ModelOption[]> = {
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

export default function AiConnectionsPage() {
  const [connections, setConnections] = useState<AiConnection[]>([])
  const [loading, setLoading] = useState(true)

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingConnection, setEditingConnection] = useState<AiConnection | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    provider: 'OPENROUTER',
    apiKey: '',
    defaultModel: 'google/gemini-2.0-flash-001',
    customModel: '',
    isCustomModel: false,
    active: true,
  })
  const [modelsList, setModelsList] = useState<ModelOption[]>([])
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  const fetchConnections = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/ai/connections')
      const items = Array.isArray(data) ? data : data.items || []
      setConnections(items)
    } catch {
      toast.error('Erro ao carregar conexões de IA.')
    } finally {
      setLoading(false)
    }
  }

  const loadModelsForProvider = useCallback(async (provider: string, currentSelectedModel?: string | null) => {
    const fallbackList = KNOWN_MODELS_BY_PROVIDER[provider] || []
    try {
      const { data } = await api.get('/ai/connections/models', { params: { provider } })
      if (Array.isArray(data) && data.length > 0) {
        // Unifica os modelos retornados da API com os conhecidos
        const map = new Map<string, string>()
        fallbackList.forEach((m) => map.set(m.id, m.name))
        data.forEach((m: { id: string; name: string }) => map.set(m.id, m.name || m.id))
        const merged: ModelOption[] = Array.from(map.entries()).map(([id, name]) => ({ id, name }))
        setModelsList(merged)
        return
      }
    } catch {
      // Usa fallback local
    }
    setModelsList(fallbackList)

    if (currentSelectedModel) {
      const exists = fallbackList.some((m) => m.id === currentSelectedModel)
      if (!exists && currentSelectedModel !== '') {
        setFormData((prev) => ({
          ...prev,
          isCustomModel: true,
          customModel: currentSelectedModel,
        }))
      }
    }
  }, [])

  useEffect(() => {
    void fetchConnections()
  }, [])

  const handleOpenCreate = () => {
    setEditingConnection(null)
    const initialProvider = 'OPENROUTER'
    const defaultModel = 'google/gemini-2.0-flash-001'
    setFormData({
      name: '',
      provider: initialProvider,
      apiKey: '',
      defaultModel,
      customModel: '',
      isCustomModel: false,
      active: true,
    })
    setTestResult(null)
    void loadModelsForProvider(initialProvider)
    setDialogOpen(true)
  }

  const handleOpenEdit = (conn: AiConnection) => {
    setEditingConnection(conn)
    const known = KNOWN_MODELS_BY_PROVIDER[conn.provider] || []
    const isCustom = Boolean(conn.defaultModel && !known.some((m) => m.id === conn.defaultModel))

    setFormData({
      name: conn.name,
      provider: conn.provider,
      apiKey: '', // Chave protegida, só preenche se for rotacionar
      defaultModel: conn.defaultModel || known[0]?.id || '',
      customModel: isCustom ? conn.defaultModel || '' : '',
      isCustomModel: isCustom,
      active: conn.active,
    })
    setTestResult(null)
    void loadModelsForProvider(conn.provider, conn.defaultModel)
    setDialogOpen(true)
  }

  const handleProviderChange = (newProvider: string) => {
    const known = KNOWN_MODELS_BY_PROVIDER[newProvider] || []
    const firstModel = known[0]?.id || ''
    setFormData((prev) => ({
      ...prev,
      provider: newProvider,
      defaultModel: firstModel,
      isCustomModel: false,
      customModel: '',
    }))
    void loadModelsForProvider(newProvider)
  }

  const handleTestConnection = async () => {
    if (!editingConnection && !formData.apiKey.trim()) {
      toast.error('Informe a API Key para testar a conexão.')
      return
    }

    const effectiveModel = formData.isCustomModel
      ? formData.customModel.trim()
      : formData.defaultModel

    setTesting(true)
    setTestResult(null)
    try {
      if (editingConnection) {
        const { data } = await api.post(`/ai/connections/${editingConnection.id}/test`, {
          modelId: effectiveModel || undefined,
        })
        setTestResult({
          success: data.success,
          message:
            data.message ||
            `Conexão validada com sucesso! Modelo testado: ${data.modelId || effectiveModel || 'padrão'}. Latência: ${data.latencyMs}ms.`,
        })
      } else {
        const { data } = await api.post('/ai/connections/test-credentials', {
          provider: formData.provider,
          apiKey: formData.apiKey,
          modelId: effectiveModel || undefined,
        })
        setTestResult({
          success: data.success,
          message:
            data.message ||
            `Credenciais validadas com sucesso junto ao provedor ${formData.provider}!`,
        })
      }
    } catch (err: unknown) {
      const respMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setTestResult({
        success: false,
        message: respMsg || 'Falha na autenticação com o provedor.',
      })
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      toast.error('O nome da conexão é obrigatório.')
      return
    }

    if (!editingConnection && !formData.apiKey.trim()) {
      toast.error('A API Key é obrigatória para novas conexões.')
      return
    }

    const effectiveModel = formData.isCustomModel
      ? formData.customModel.trim()
      : formData.defaultModel.trim()

    setSaving(true)
    try {
      if (editingConnection) {
        const payload: Record<string, unknown> = {
          name: formData.name.trim(),
          active: formData.active,
          defaultModel: effectiveModel || null,
        }
        if (formData.apiKey.trim()) {
          payload.apiKey = formData.apiKey.trim()
        }

        await api.patch(`/ai/connections/${editingConnection.id}`, payload)
        toast.success(
          formData.apiKey.trim()
            ? 'Conexão atualizada e chave rotacionada com sucesso!'
            : 'Conexão atualizada com sucesso!',
        )
      } else {
        await api.post('/ai/connections', {
          name: formData.name.trim(),
          provider: formData.provider,
          apiKey: formData.apiKey.trim(),
          active: formData.active,
          defaultModel: effectiveModel || null,
        })
        toast.success('Conexão de IA criada com sucesso!')
      }

      setDialogOpen(false)
      void fetchConnections()
    } catch (err: unknown) {
      const respMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(respMsg || 'Falha ao salvar conexão.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Barra de Ações */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Conexões e Provedores LLM</h2>
          <p className="text-xs text-muted-foreground">
            Cadastre credenciais criptografadas e escolha os modelos para OpenRouter, OpenAI, Anthropic e Google Gemini.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handleOpenCreate} size="sm" className="h-9 gap-1.5 font-semibold">
            <Plus className="size-4" />
            <span>Nova Conexão</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            onClick={() => void fetchConnections()}
            disabled={loading}
          >
            <RotateCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </Button>
        </div>
      </div>

      {/* Tabela de Conexões */}
      <Card className="app-section-card border-border overflow-hidden p-0">
        <Table>
          <TableHeader className="bg-surface-subtle">
            <TableRow>
              <TableHead className="w-1/4">Nome / Provedor</TableHead>
              <TableHead>Modelo Selecionado</TableHead>
              <TableHead>Chave Criptografada</TableHead>
              <TableHead>Revisão</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Atualizado em</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-xs text-muted-foreground">
                  Carregando conexões...
                </TableCell>
              </TableRow>
            ) : connections.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-xs text-muted-foreground">
                  Nenhuma conexão configurada para esta empresa. Clique em &quot;+ Nova Conexão&quot; para começar.
                </TableCell>
              </TableRow>
            ) : (
              connections.map((conn) => (
                <TableRow key={conn.id} className="hover:bg-muted/20">
                  <TableCell>
                    <div className="font-semibold text-foreground text-sm flex items-center gap-2">
                      <Cpu className="size-4 text-primary" />
                      <span>{conn.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-mono">
                      {conn.provider}
                    </span>
                  </TableCell>

                  <TableCell>
                    {conn.defaultModel ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 border border-primary/20 px-2 py-0.5 text-xs font-mono font-medium text-primary">
                        <Sparkles className="size-3" />
                        <span className="truncate max-w-[200px]" title={conn.defaultModel}>
                          {conn.defaultModel}
                        </span>
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">
                        Padrão do Provedor
                      </span>
                    )}
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
                      <Key className="size-3.5 text-muted-foreground" />
                      <span>{conn.maskedKey || '••••••••••••••••'}</span>
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge variant="outline" className="text-xs font-mono">
                      v{conn.currentRevision || 1}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    {conn.active ? (
                      <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-600 bg-emerald-500/10 gap-1">
                        <CheckCircle2 className="size-3" />
                        <span>Ativa</span>
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs border-muted-foreground/30 text-muted-foreground gap-1">
                        <XCircle className="size-3" />
                        <span>Inativa</span>
                      </Badge>
                    )}
                  </TableCell>

                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(conn.updatedAt).toLocaleDateString('pt-BR')}
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs gap-1"
                        onClick={() => handleOpenEdit(conn)}
                      >
                        <SlidersHorizontal className="size-3.5" />
                        <span>Editar / Modelo</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Dialog de Criação / Edição de Conexão */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Key className="size-4 text-primary" />
              <span>{editingConnection ? 'Editar Conexão de IA' : 'Nova Conexão de IA'}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Configure o provedor, a chave e selecione qual modelo será utilizado por esta conexão.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Nome da Conexão
              </Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: OpenRouter Produção, Gemini Primário"
                className="h-9 text-xs sm:text-sm"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Provedor
              </Label>
              <select
                value={formData.provider}
                onChange={(e) => handleProviderChange(e.target.value)}
                disabled={Boolean(editingConnection)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs sm:text-sm text-foreground outline-none focus:border-primary disabled:opacity-70"
              >
                <option value="OPENROUTER">OpenRouter (Roteador Multi-Modelo - Gemini, Claude, Llama, DeepSeek)</option>
                <option value="OPENAI">OpenAI (GPT-4o, GPT-4o-mini)</option>
                <option value="ANTHROPIC">Anthropic (Claude 3.5 Sonnet, Haiku)</option>
                <option value="GEMINI">Google Gemini (Gemini 2.0 Flash, 1.5 Pro)</option>
              </select>
            </div>

            {/* Seleção de Modelo */}
            <div className="space-y-2 p-3 rounded-md bg-surface-subtle border border-border">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-primary" />
                  Modelo LLM a Utilizar
                </Label>
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      isCustomModel: !prev.isCustomModel,
                    }))
                  }
                  className="text-[11px] text-primary hover:underline font-medium"
                >
                  {formData.isCustomModel ? '← Escolher da lista' : '+ Digitar outro modelo'}
                </button>
              </div>

              {!formData.isCustomModel ? (
                <div className="space-y-1">
                  <select
                    value={formData.defaultModel}
                    onChange={(e) =>
                      setFormData({ ...formData, defaultModel: e.target.value })
                    }
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs sm:text-sm text-foreground outline-none focus:border-primary font-mono"
                  >
                    {modelsList.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.id})
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-muted-foreground">
                    Selecione o modelo do provedor para processar os comandos e conversas.
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <Input
                    value={formData.customModel}
                    onChange={(e) =>
                      setFormData({ ...formData, customModel: e.target.value })
                    }
                    placeholder="Ex: mistralai/mistral-large-2407 ou outro slug"
                    className="h-9 text-xs sm:text-sm font-mono"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Informe o identificador exato do modelo (conforme catálogo do OpenRouter/provedor).
                  </p>
                </div>
              )}
            </div>

            {/* API Key */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {editingConnection ? 'Nova API Key (Opcional)' : 'API Key'}
                </Label>
                {editingConnection && (
                  <span className="text-[11px] text-muted-foreground font-mono">
                    Atual: {editingConnection.maskedKey}
                  </span>
                )}
              </div>
              <Input
                type="password"
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                placeholder={editingConnection ? 'Deixe em branco para manter a chave atual' : 'sk-...'}
                className="h-9 text-xs sm:text-sm font-mono"
                required={!editingConnection}
                autoComplete="off"
              />
              <p className="text-[11px] text-muted-foreground">
                {editingConnection
                  ? 'A chave nunca é retornada para o navegador. Preencha apenas se desejar rotacioná-la.'
                  : 'A chave será salva cifrada no banco com AES-256-GCM.'}
              </p>
            </div>

            {/* Ativação */}
            <div className="flex items-center justify-between p-3 rounded-md bg-surface-subtle border border-border">
              <div className="space-y-0.5">
                <Label className="text-xs font-medium text-foreground">Conexão Ativa</Label>
                <p className="text-[11px] text-muted-foreground">
                  Desativar impede que este provedor seja chamado por assistentes.
                </p>
              </div>
              <Switch
                checked={formData.active}
                onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
              />
            </div>

            {/* Resultado do Teste */}
            {testResult && (
              <div
                className={`p-3 rounded-md text-xs border flex items-start gap-2 ${
                  testResult.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                    : 'bg-destructive/10 border-destructive/30 text-destructive'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <AlertTriangle className="size-4 shrink-0 text-destructive" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}

            <DialogFooter className="flex items-center justify-between gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTestConnection}
                disabled={testing || saving}
                className="h-9 text-xs gap-1.5"
              >
                {testing ? <RotateCw className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
                <span>Testar Conexão</span>
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 text-xs"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" size="sm" className="h-9 text-xs font-semibold" disabled={saving}>
                  {saving ? 'Salvando...' : 'Salvar Conexão'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
