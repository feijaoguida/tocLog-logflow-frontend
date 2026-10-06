'use client'

import React, { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  Plus,
  RotateCw,
  Bot,
  SlidersHorizontal,
  CheckCircle2,
  BookOpen,
  Wrench,
  FileText,
  History,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AI_MODULE_OPTIONS, getModuleLabel } from '@/lib/ai-modules'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
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
import { reportError } from '@/lib/error-reporter'

interface AssistantItem {
  id: string
  key?: string
  name: string
  description?: string
  module?: string
  audience?: string
  currentRevisionId?: string | null
  currentRevisionNumber?: number
  latestRevisionNumber?: number
  isPublished?: boolean
  toolsCount?: number
  knowledgeCount?: number
  updatedAt?: string
}

export default function AiAssistantsPage() {
  const [assistants, setAssistants] = useState<AssistantItem[]>([])
  const [availableTools, setAvailableTools] = useState<Array<{ name: string; description: string }>>([])
  const [availableKnowledge, setAvailableKnowledge] = useState<Array<{ id: string; title: string }>>([])
  const [loading, setLoading] = useState(true)

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'INFO' | 'TOOLS' | 'KNOWLEDGE'>('INFO')
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    key: '',
    name: '',
    description: '',
    module: 'GERAL',
    instructions: '',
    tools: [] as string[],
    knowledgeIds: [] as string[],
    expectedVersion: 1,
    publishNow: true,
  })

  useEffect(() => {
    void loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [asstRes, toolsRes, knowRes] = await Promise.all([
        api.get('/ai/assistants'),
        api.get('/ai/tools'),
        api.get('/ai/knowledge'),
      ])

      setAssistants(Array.isArray(asstRes.data) ? asstRes.data : asstRes.data.items || [])
      setAvailableTools(Array.isArray(toolsRes.data) ? toolsRes.data : [])
      setAvailableKnowledge(Array.isArray(knowRes.data) ? knowRes.data : knowRes.data.items || [])
    } catch (err: unknown) {
      toast.error('Erro ao carregar assistentes.')
      reportError(err, {
        module: 'AI_ASSISTANTS',
        screen: '/dashboard/settings/ai/assistants',
        action: 'loadData',
        errorMessage: 'Erro ao carregar catálogo de assistentes.',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleOpenCreate = () => {
    setEditingId(null)
    setActiveTab('INFO')
    setFormData({
      key: '',
      name: '',
      description: '',
      module: 'GERAL',
      instructions: 'Você é um assistente do sistema TocLog. Responda com clareza e precisão técnica.',
      tools: [],
      knowledgeIds: [],
      expectedVersion: 1,
      publishNow: true,
    })
    setDialogOpen(true)
  }

  const handleOpenEdit = async (asst: AssistantItem) => {
    setEditingId(asst.id)
    setActiveTab('INFO')
    try {
      const { data } = await api.get(`/ai/assistants/${asst.id}`)
      setFormData({
        key: data.key || '',
        name: data.name,
        description: data.description || '',
        module: data.module || 'GERAL',
        instructions: data.currentRevision?.instructions || '',
        tools: Array.isArray(data.currentRevision?.tools) ? data.currentRevision.tools : [],
        knowledgeIds: Array.isArray(data.currentRevision?.knowledgeIds) ? data.currentRevision.knowledgeIds : [],
        expectedVersion: data.version || 1,
        publishNow: true,
      })
      setDialogOpen(true)
    } catch (err: unknown) {
      toast.error('Erro ao carregar detalhes do assistente.')
      reportError(err, {
        module: 'AI_ASSISTANTS',
        screen: '/dashboard/settings/ai/assistants',
        action: 'handleOpenEdit',
        errorMessage: 'Erro ao carregar detalhes do assistente.',
      })
    }
  }

  const toggleTool = (toolName: string) => {
    setFormData((prev) => ({
      ...prev,
      tools: prev.tools.includes(toolName)
        ? prev.tools.filter((t) => t !== toolName)
        : [...prev.tools, toolName],
    }))
  }

  const toggleKnowledge = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      knowledgeIds: prev.knowledgeIds.includes(id)
        ? prev.knowledgeIds.filter((k) => k !== id)
        : [...prev.knowledgeIds, id],
    }))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      toast.error('O nome do assistente é obrigatório.')
      return
    }

    setSaving(true)
    let payloadToLog: Record<string, unknown> | null = null
    try {
      if (editingId) {
        const updatePayload = {
          name: formData.name.trim(),
          description: formData.description?.trim() || undefined,
          module: formData.module,
          instructions: formData.instructions,
          tools: formData.tools,
          knowledgeIds: formData.knowledgeIds,
          expectedVersion: formData.expectedVersion,
          publishNow: formData.publishNow,
        }
        payloadToLog = updatePayload
        await api.put(`/ai/assistants/${editingId}`, updatePayload)
        toast.success(
          formData.publishNow
            ? 'Assistente atualizado e publicado com sucesso!'
            : 'Assistente e revisão salvos como rascunho.',
        )
      } else {
        const createPayload = {
          key: formData.key?.trim() || undefined,
          name: formData.name.trim(),
          description: formData.description?.trim() || undefined,
          module: formData.module,
          instructions: formData.instructions,
          tools: formData.tools,
          knowledgeIds: formData.knowledgeIds,
          publishNow: formData.publishNow,
        }
        payloadToLog = createPayload
        await api.post('/ai/assistants', createPayload)
        toast.success(
          formData.publishNow
            ? 'Assistente criado e publicado com sucesso!'
            : 'Assistente criado como rascunho.',
        )
      }

      setDialogOpen(false)
      void loadData()
    } catch (err: unknown) {
      const respData = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data
      const rawMsg = respData?.message
      const msg = Array.isArray(rawMsg) ? rawMsg.join(', ') : rawMsg || 'Falha ao salvar assistente.'
      toast.error(msg)
      reportError(err, {
        module: 'AI_ASSISTANTS',
        screen: '/dashboard/settings/ai/assistants',
        action: editingId ? 'updateAssistant' : 'createAssistant',
        errorMessage: msg,
        requestPayload: payloadToLog,
      })
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async (asst: AssistantItem) => {
    try {
      const targetRev = asst.currentRevisionNumber || asst.latestRevisionNumber || 1
      await api.post(`/ai/assistants/${asst.id}/publish`, {
        revision: targetRev,
        revisionNumber: targetRev,
      })
      toast.success(`Assistente "${asst.name}" publicado com sucesso!`)
      void loadData()
    } catch (err: unknown) {
      const respData = (err as { response?: { data?: { message?: string } } })?.response?.data
      const msg = respData?.message || 'Falha ao publicar assistente.'
      toast.error(msg)
      reportError(err, {
        module: 'AI_ASSISTANTS',
        screen: '/dashboard/settings/ai/assistants',
        action: 'publishRevision',
        errorMessage: msg,
        requestPayload: { revisionNumber: asst.currentRevisionNumber || asst.latestRevisionNumber || 1 },
      })
    }
  }

  return (
    <div className="space-y-4">
      {/* Cabeçalho de Ações */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Catálogo de Assistentes</h2>
          <p className="text-xs text-muted-foreground">
            Configure assistentes especializados com ferramentas autorizadas e bases de conhecimento.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handleOpenCreate} size="sm" className="h-9 gap-1.5 font-semibold">
            <Plus className="size-4" />
            <span>Novo Assistente</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            onClick={() => void loadData()}
            disabled={loading}
          >
            <RotateCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </Button>
        </div>
      </div>

      {/* Tabela de Assistentes (UI04) */}
      <Card className="app-section-card border-border overflow-hidden p-0">
        <Table>
          <TableHeader className="bg-surface-subtle">
            <TableRow>
              <TableHead className="w-1/3">Assistente / Finalidade</TableHead>
              <TableHead>Módulo</TableHead>
              <TableHead>Público</TableHead>
              <TableHead>Ferramentas & Fontes</TableHead>
              <TableHead>Publicação</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-xs text-muted-foreground">
                  Carregando catálogo de assistentes...
                </TableCell>
              </TableRow>
            ) : assistants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-xs text-muted-foreground">
                  Nenhum assistente cadastrado nesta empresa.
                </TableCell>
              </TableRow>
            ) : (
              assistants.map((asst) => (
                <TableRow key={asst.id} className="hover:bg-muted/20">
                  <TableCell>
                    <div className="font-semibold text-foreground text-sm flex items-center gap-2">
                      <Bot className="size-4 text-primary" />
                      <span>{asst.name}</span>
                    </div>
                    {asst.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{asst.description}</p>
                    )}
                  </TableCell>

                  <TableCell>
                    <Badge variant="outline" className="text-xs uppercase">
                      {getModuleLabel(asst.module)}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-xs text-muted-foreground">{asst.audience || 'TODOS'}</TableCell>

                  <TableCell>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Wrench className="size-3" />
                        <span>{asst.toolsCount || 0}</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <BookOpen className="size-3" />
                        <span>{asst.knowledgeCount || 0}</span>
                      </span>
                    </div>
                  </TableCell>

                  <TableCell>
                    {asst.isPublished || asst.currentRevisionId ? (
                      <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-600 bg-emerald-500/10 gap-1">
                        <CheckCircle2 className="size-3" />
                        <span>Publicado (v{asst.currentRevisionNumber || asst.latestRevisionNumber || 1})</span>
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        Rascunho
                      </Badge>
                    )}
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs gap-1"
                        onClick={() => handleOpenEdit(asst)}
                      >
                        <SlidersHorizontal className="size-3.5" />
                        <span>Editar</span>
                      </Button>

                      {!(asst.isPublished || asst.currentRevisionId) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2 text-xs gap-1 border-primary/30 text-primary"
                          onClick={() => handlePublish(asst)}
                        >
                          <Check className="size-3.5" />
                          <span>Publicar</span>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Dialog de Criação / Edição do Assistente */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Bot className="size-4 text-primary" />
              <span>{editingId ? 'Editar Assistente de IA' : 'Novo Assistente de IA'}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Define instruções do sistema, permissões de ferramentas e acervo de conhecimento.
            </DialogDescription>
          </DialogHeader>

          {/* Sub-abas do Dialog */}
          <div className="flex items-center gap-2 border-b border-border pb-2 pt-1 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('INFO')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                activeTab === 'INFO' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted/50'
              }`}
            >
              1. Instruções
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('TOOLS')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                activeTab === 'TOOLS' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted/50'
              }`}
            >
              2. Ferramentas ({formData.tools.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('KNOWLEDGE')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                activeTab === 'KNOWLEDGE'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted/50'
              }`}
            >
              3. Conhecimento ({formData.knowledgeIds.length})
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-4 py-2">
            {activeTab === 'INFO' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Nome do Assistente
                    </Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => {
                        const newName = e.target.value
                        setFormData((prev) => ({
                          ...prev,
                          name: newName,
                          ...(!editingId && (!prev.key || prev.key === prev.name.toLowerCase().replace(/[^a-z0-9_-]/g, '-')) ? {
                            key: newName
                              .toLowerCase()
                              .normalize('NFD')
                              .replace(/[\u0300-\u036f]/g, '')
                              .replace(/[^a-z0-9_-]+/g, '-')
                              .replace(/^-+|-+$/g, '')
                              .slice(0, 45)
                          } : {})
                        }))
                      }}
                      placeholder="Ex: Suporte de Compras, Helpdesk N1"
                      className="h-9 text-xs sm:text-sm"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Módulo
                    </Label>
                    <select
                      value={formData.module}
                      onChange={(e) => setFormData({ ...formData, module: e.target.value })}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs sm:text-sm text-foreground outline-none focus:border-primary"
                    >
                      {AI_MODULE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Identificador / Chave (Slug)
                    </Label>
                    <Input
                      value={formData.key}
                      onChange={(e) => setFormData({ ...formData, key: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '-') })}
                      placeholder="Ex: compras-suporte"
                      className="h-9 text-xs sm:text-sm font-mono"
                      disabled={Boolean(editingId)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Descrição Pública
                    </Label>
                    <Input
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Breve descrição da finalidade para os usuários"
                      className="h-9 text-xs sm:text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Instruções do Sistema (System Prompt)
                  </Label>
                  <Textarea
                    value={formData.instructions}
                    onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                    rows={6}
                    placeholder="Instruções comportamentais e regras de negócio para orientar o modelo..."
                    className="text-xs font-mono leading-relaxed resize-none"
                    required
                  />
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                  <input
                    type="checkbox"
                    id="publishNowCheckbox"
                    checked={formData.publishNow}
                    onChange={(e) => setFormData({ ...formData, publishNow: e.target.checked })}
                    className="size-4 accent-primary rounded cursor-pointer"
                  />
                  <Label htmlFor="publishNowCheckbox" className="text-xs cursor-pointer font-medium text-foreground">
                    Publicar imediatamente (disponibilizar esta versão para uso no sistema)
                  </Label>
                </div>
              </div>
            )}

            {activeTab === 'TOOLS' && (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                <p className="text-xs text-muted-foreground mb-2">
                  Selecione quais ferramentas autorizadas este assistente pode invocar durante conversas:
                </p>
                {availableTools.map((tool) => {
                  const checked = formData.tools.includes(tool.name)
                  return (
                    <div
                      key={tool.name}
                      onClick={() => toggleTool(tool.name)}
                      className={`p-2.5 rounded-md border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                        checked
                          ? 'border-primary bg-primary/5 text-foreground'
                          : 'border-border bg-surface-subtle text-muted-foreground hover:bg-muted/40'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          <Wrench className="size-3.5 text-primary" />
                          <span>{tool.name}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{tool.description}</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {}}
                        className="size-4 mt-0.5 accent-primary"
                      />
                    </div>
                  )
                })}
              </div>
            )}

            {activeTab === 'KNOWLEDGE' && (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                <p className="text-xs text-muted-foreground mb-2">
                  Selecione os manuais e políticas publicados que compõem o contexto de busca:
                </p>
                {availableKnowledge.length === 0 ? (
                  <p className="text-xs text-center py-6 text-muted-foreground">
                    Nenhuma base de conhecimento publicada encontrada.
                  </p>
                ) : (
                  availableKnowledge.map((doc) => {
                    const checked = formData.knowledgeIds.includes(doc.id)
                    return (
                      <div
                        key={doc.id}
                        onClick={() => toggleKnowledge(doc.id)}
                        className={`p-2.5 rounded-md border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                          checked
                            ? 'border-primary bg-primary/5 text-foreground'
                            : 'border-border bg-surface-subtle text-muted-foreground hover:bg-muted/40'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <BookOpen className="size-3.5 text-primary" />
                          <span className="text-xs font-medium text-foreground">{doc.title}</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {}}
                          className="size-4 accent-primary"
                        />
                      </div>
                    )
                  })
                )}
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" size="sm" className="h-9 text-xs" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" className="h-9 text-xs font-semibold" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar Assistente'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
