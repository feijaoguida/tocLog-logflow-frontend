'use client'

import React, { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  Plus,
  RotateCw,
  Cpu,
  Key,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Eye,
  SlidersHorizontal,
  AlertTriangle,
  Play,
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
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { api } from '@/lib/api'

interface AiConnection {
  id: string
  name: string
  provider: 'OPENAI' | 'ANTHROPIC' | 'GEMINI' | 'OPENROUTER'
  active: boolean
  currentRevision: number
  maskedKey: string
  models: string[]
  updatedAt: string
}

export default function AiConnectionsPage() {
  const [connections, setConnections] = useState<AiConnection[]>([])
  const [loading, setLoading] = useState(true)

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingConnection, setEditingConnection] = useState<AiConnection | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    provider: 'OPENAI',
    apiKey: '',
    active: true,
  })
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  // Inactivation confirmation
  const [confirmInactivateOpen, setConfirmInactivateOpen] = useState(false)
  const [connectionToInactivate, setConnectionToInactivate] = useState<AiConnection | null>(null)

  useEffect(() => {
    void fetchConnections()
  }, [])

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

  const handleOpenCreate = () => {
    setEditingConnection(null)
    setFormData({
      name: '',
      provider: 'OPENAI',
      apiKey: '',
      active: true,
    })
    setTestResult(null)
    setDialogOpen(true)
  }

  const handleOpenEdit = (conn: AiConnection) => {
    setEditingConnection(conn)
    setFormData({
      name: conn.name,
      provider: conn.provider,
      apiKey: '', // AC-02: Sempre vazio na edição; nunca preenche com a chave real
      active: conn.active,
    })
    setTestResult(null)
    setDialogOpen(true)
  }

  const handleTestConnection = async () => {
    if (!editingConnection && !formData.apiKey.trim()) {
      toast.error('Informe a API Key para testar a conexão.')
      return
    }

    setTesting(true)
    setTestResult(null)
    try {
      if (editingConnection) {
        const { data } = await api.post(`/ai/connections/${editingConnection.id}/test`)
        setTestResult({
          success: data.success,
          message: data.message || `Conexão validada com sucesso! Latência: ${data.latencyMs}ms.`,
        })
      } else {
        // Teste prévio na criação
        const { data } = await api.post('/ai/connections/test-credentials', {
          provider: formData.provider,
          apiKey: formData.apiKey,
        })
        setTestResult({
          success: data.success,
          message: data.message || 'Credenciais validadas com sucesso junto ao provedor!',
        })
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.response?.data?.message || 'Falha na autenticação com o provedor.',
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

    setSaving(true)
    try {
      if (editingConnection) {
        // Se apiKey foi preenchida, rotaciona; se vazia, preserva chave atual
        const payload: any = {
          name: formData.name,
          active: formData.active,
        }
        if (formData.apiKey.trim()) {
          payload.apiKey = formData.apiKey.trim()
        }

        await api.put(`/ai/connections/${editingConnection.id}`, payload)
        toast.success(
          formData.apiKey.trim()
            ? 'Conexão atualizada e chave rotacionada com sucesso!'
            : 'Conexão atualizada com sucesso!'
        )
      } else {
        await api.post('/ai/connections', {
          name: formData.name,
          provider: formData.provider,
          apiKey: formData.apiKey.trim(),
          active: formData.active,
        })
        toast.success('Conexão criada com sucesso!')
      }

      setDialogOpen(false)
      void fetchConnections()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Falha ao salvar conexão.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Barra de Ações (UI01) */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Conexões e Provedores LLM</h2>
          <p className="text-xs text-muted-foreground">
            Cadastre credenciais criptografadas para OpenAI, Anthropic, Google Gemini e OpenRouter.
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
            <RotateCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </Button>
        </div>
      </div>

      {/* Tabela de Conexões (UI04) */}
      <Card className="app-section-card border-border overflow-hidden p-0">
        <Table>
          <TableHeader className="bg-surface-subtle">
            <TableRow>
              <TableHead className="w-1/4">Nome / Provedor</TableHead>
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
                <TableCell colSpan={6} className="text-center py-8 text-xs text-muted-foreground">
                  Carregando conexões...
                </TableCell>
              </TableRow>
            ) : connections.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-xs text-muted-foreground">
                  Nenhuma conexão configurada para esta empresa. Clique em "+ Nova Conexão" para começar.
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
                        <span>Editar / Rotacionar</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Dialog de Criação / Edição de Conexão (UI06) */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Key className="size-4 text-primary" />
              <span>{editingConnection ? 'Editar Conexão & Rotacionar Chave' : 'Nova Conexão de IA'}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              As chaves são cifradas com AES-256-GCM com autenticação de integridade por empresa.
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
                placeholder="Ex: OpenAI Produção, Gemini Primário"
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
                onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                disabled={Boolean(editingConnection)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs sm:text-sm text-foreground outline-none focus:border-primary disabled:opacity-70"
              >
                <option value="OPENAI">OpenAI (GPT-4o, GPT-4o-mini)</option>
                <option value="ANTHROPIC">Anthropic (Claude 3.5 Sonnet, Haiku)</option>
                <option value="GEMINI">Google Gemini (Gemini 1.5 Pro, Flash)</option>
                <option value="OPENROUTER">OpenRouter (Roteador Multi-Modelo)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {editingConnection ? 'Nova API Key (Rotacionar)' : 'API Key'}
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
                  : 'A chave será salva cifrada no banco e nunca é revelada após gravação.'}
              </p>
            </div>

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
                {testResult.success ? <CheckCircle2 className="size-4 shrink-0" /> : <AlertTriangle className="size-4 shrink-0" />}
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
