'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export type Governance = {
  agentScope: string; openingApprovalMode: string; firstResponseMode: string;
  startSlaAfterApproval: boolean; pauseWhileWaitingUser: boolean; pauseWhileWaitingThirdParty: boolean;
  reopenSlaMode: string; cancelRequiresApproval: boolean; fallbackApproverUserId: string | null;
}
export const GOVERNANCE_DEFAULTS: Governance = {
  agentScope: 'OWN_QUEUES', openingApprovalMode: 'QUEUE_ANY', firstResponseMode: 'PUBLIC_REPLY',
  startSlaAfterApproval: true, pauseWhileWaitingUser: true, pauseWhileWaitingThirdParty: false,
  reopenSlaMode: 'RESUME_REMAINING', cancelRequiresApproval: false, fallbackApproverUserId: null,
}
export type ManagedQueue = { id: string; name: string; departmentId: string; description: string | null; active: boolean; allowAgentPickup: boolean; department: { id: string; name: string } }
export type GovernanceContext = { companyId: string; capabilities: { settings: boolean; manageQueues: boolean; catalog: boolean }; managedQueues: ManagedQueue[]; canNameDelegates: boolean }
export type Category = { id: string; name: string; companyId: string | null; active: boolean; slaResponse: number; slaResolve: number }
const selectClass = 'h-10 w-full rounded-md border bg-background px-3 text-sm'

export function GovernanceFields({ value, onChange }: { value: Governance; onChange: (patch: Partial<Governance>) => void }) {
  const [candidates, setCandidates] = useState<{ id: string; name: string }[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let active = true
    api.get('/helpdesk/settings/approver-candidates').then(({ data }) => { if (active) { setCandidates(data.items); setCursor(data.nextCursor) } }).catch(e => { if (active) setError(getApiErrorMessage(e, 'Falha ao carregar responsáveis.')) })
    return () => { active = false }
  }, [])
  const choices = [
    ['agentScope', 'Alcance do atendimento', [['OWN_QUEUES', 'Próprias filas'], ['ALL_QUEUES', 'Todas as filas'], ['READ_ALL_OPERATE_OWN', 'Ler todas e atuar nas próprias']]],
    ['openingApprovalMode', 'Aprovação de abertura', [['QUEUE_ANY', 'Qualquer aprovador da fila'], ['REQUESTER_MANAGER', 'Gestor direto do solicitante'], ['QUEUE_ALL', 'Todos os aprovadores da fila']]],
    ['firstResponseMode', 'Primeira resposta', [['PUBLIC_REPLY', 'Resposta pública'], ['ASSIGNMENT', 'Atribuição ao atendente']]],
    ['reopenSlaMode', 'SLA na reabertura', [['RESUME_REMAINING', 'Retomar saldo'], ['NEW_RESOLUTION_CYCLE', 'Novo ciclo de resolução']]],
  ] as const
  return <div className="space-y-4">
    <p className="text-sm text-muted-foreground">Estas políticas valem para novos chamados. Permissões e vínculos continuam sendo verificados a cada ação.</p>
    <div className="grid gap-4 md:grid-cols-2">{choices.map(([key, label, options]) => <div key={key} className="field-stack">
      <Label htmlFor={key}>{label}</Label><select id={key} className={selectClass} value={value[key]} onChange={e => onChange({ [key]: e.target.value })}>{options.map(([id, text]) => <option key={id} value={id}>{text}</option>)}</select>
    </div>)}</div>
    {([
      ['startSlaAfterApproval', 'Iniciar SLA após aprovação'], ['pauseWhileWaitingUser', 'Pausar aguardando usuário'],
      ['pauseWhileWaitingThirdParty', 'Pausar aguardando terceiro'], ['cancelRequiresApproval', 'Exigir aprovação para cancelamento'],
    ] as const).map(([key, label]) => <label key={key} className="flex items-center gap-3"><input type="checkbox" checked={value[key]} onChange={e => onChange({ [key]: e.target.checked })} />{label}</label>)}
    <Label htmlFor="fallback-approver">Responsável por exceções de aprovação</Label>
    <select id="fallback-approver" className={selectClass} value={value.fallbackApproverUserId ?? ''} onChange={e => onChange({ fallbackApproverUserId: e.target.value || null })}>
      <option value="">Sem responsável — manter pendência administrativa</option>
      {value.fallbackApproverUserId && !candidates.some(c => c.id === value.fallbackApproverUserId) && <option value={value.fallbackApproverUserId}>Responsável atual (verificar elegibilidade)</option>}
      {candidates.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
    </select>
    {cursor && <Button variant="outline" disabled={busy} onClick={async () => {
      setBusy(true)
      try { const { data } = await api.get('/helpdesk/settings/approver-candidates', { params: { cursor } }); setCandidates(current => [...current, ...data.items]); setCursor(data.nextCursor) }
      catch (e) { setError(getApiErrorMessage(e, 'Falha ao carregar responsáveis.')) } finally { setBusy(false) }
    }}>Mais responsáveis</Button>}
    {error && <p role="alert">{error}</p>}
  </div>
}

import { AlertCircle, CheckIcon, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
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
import { Switch } from '@/components/ui/switch'

type Employee = { id: string; user: { name: string }; missingPermissions: { pickup: string[]; approve: string[] } }
type Member = { employee: Employee; active: boolean; canPickup: boolean; isApprover: boolean; isManager: boolean }
type QueueOverview = { members: Member[]; approvalIssues: { id: string; reason: string }[] }

export function QueueGovernance({ context }: { context: GovernanceContext }) {
  const [queueId, setQueueId] = useState(context.managedQueues[0]?.id ?? '')
  const [overview, setOverview] = useState<QueueOverview | null>(null)
  const [candidates, setCandidates] = useState<Employee[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [queueForm, setQueueForm] = useState<ManagedQueue | null>(null)

  // Modal para Adicionar Membro
  const [candidateToAdd, setCandidateToAdd] = useState<Employee | null>(null)
  const [modalPermissions, setModalPermissions] = useState({
    canPickup: false,
    isApprover: false,
    isManager: false,
  })

  useEffect(() => {
    let active = true
    async function load() {
      setError(''); setOverview(null); setBusy(true)
      setQueueForm(context.managedQueues.find(q => q.id === queueId) ?? null)
      try {
        if (!queueId) return
        const [detail, options] = await Promise.all([
          api.get<QueueOverview>(`/helpdesk/queues/${queueId}/overview`),
          api.get(`/helpdesk/queues/${queueId}/candidates`, { params: { purpose: 'MEMBER' } })
        ])
        if (active) { setOverview(detail.data); setCandidates(options.data.items); setCursor(options.data.nextCursor) }
      } catch (e) { if (active) setError(getApiErrorMessage(e, 'Falha ao carregar a fila.')) } finally { if (active) setBusy(false) }
    }
    void load(); return () => { active = false }
  }, [queueId, revision, context.managedQueues])

  async function mutate(employeeId: string, body: object, delegate = false) {
    setBusy(true); setError('')
    try {
      await api.put(`/helpdesk/queues/${queueId}/${delegate ? 'delegates' : 'members'}/${employeeId}`, body)
      setRevision(n => n + 1)
    } catch (e) {
      setError(getApiErrorMessage(e, 'Não foi possível atualizar o membro.'))
    } finally {
      setBusy(false)
    }
  }

  function handleOpenAddMemberModal(candidate: Employee) {
    const hasPickupMissing = candidate.missingPermissions.pickup.length > 0
    const hasApproveMissing = candidate.missingPermissions.approve.length > 0
    setCandidateToAdd(candidate)
    setModalPermissions({
      canPickup: !hasPickupMissing,
      isApprover: false,
      isManager: false,
    })
  }

  async function handleConfirmAddMember() {
    if (!candidateToAdd) return
    setBusy(true)
    setError('')
    try {
      await api.put(`/helpdesk/queues/${queueId}/members/${candidateToAdd.id}`, {
        active: true,
        canPickup: modalPermissions.canPickup,
        isApprover: modalPermissions.isApprover,
      })
      if (context.canNameDelegates && modalPermissions.isManager) {
        await api.put(`/helpdesk/queues/${queueId}/delegates/${candidateToAdd.id}`, {
          active: true,
        })
      }
      setCandidateToAdd(null)
      setRevision(n => n + 1)
    } catch (e) {
      setError(getApiErrorMessage(e, 'Não foi possível adicionar o membro.'))
    } finally {
      setBusy(false)
    }
  }

  const selectedQueue = context.managedQueues.find(q => q.id === queueId)

  return (
    <Card className="app-section-card">
      <CardHeader>
        <CardTitle className="text-xl">Gestão de membros e filas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="field-stack max-w-xl">
          <Label htmlFor="managed-queue">Fila sob sua gestão</Label>
          <Select value={queueId} onValueChange={setQueueId}>
            <SelectTrigger id="managed-queue" className="h-10">
              <SelectValue placeholder="Selecione a fila" />
            </SelectTrigger>
            <SelectContent>
              {context.managedQueues.map(q => (
                <SelectItem key={q.id} value={q.id}>
                  {q.name} — {q.department.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!context.managedQueues.length && (
          <p className="text-sm text-muted-foreground">Nenhuma fila disponível para gestão.</p>
        )}

        {!context.capabilities.settings && queueForm && (
          <div className="space-y-4 rounded-lg border border-border bg-card p-4">
            <div className="field-stack">
              <Label htmlFor="local-queue-name">Nome da fila</Label>
              <Input
                id="local-queue-name"
                value={queueForm.name}
                onChange={e => setQueueForm({ ...queueForm, name: e.target.value })}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-center justify-between rounded-lg border border-border p-3">
                <span className="text-sm">Fila ativa</span>
                <Switch
                  checked={queueForm.active}
                  onCheckedChange={v => setQueueForm({ ...queueForm, active: v })}
                />
              </label>
              <label className="flex items-center justify-between rounded-lg border border-border p-3">
                <span className="text-sm">Permitir pickup do agente</span>
                <Switch
                  checked={queueForm.allowAgentPickup}
                  onCheckedChange={v => setQueueForm({ ...queueForm, allowAgentPickup: v })}
                />
              </label>
            </div>
            <Button
              disabled={busy || !queueForm.name.trim()}
              onClick={async () => {
                setBusy(true); setError('')
                try {
                  await api.patch(`/helpdesk/queues/${queueId}`, {
                    name: queueForm.name,
                    description: queueForm.description ?? '',
                    departmentId: queueForm.departmentId,
                    active: queueForm.active,
                    allowAgentPickup: queueForm.allowAgentPickup
                  });
                } catch (e) {
                  setError(getApiErrorMessage(e, 'Não foi possível salvar a fila.'))
                } finally {
                  setBusy(false)
                }
              }}
            >
              Salvar fila
            </Button>
          </div>
        )}

        {error && <p role="alert" className="text-sm text-destructive font-medium">{error}</p>}

        {!!overview?.approvalIssues.length && (
          <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning-foreground">
            {overview.approvalIssues.length} aprovação(ões) precisam de revisão de elegibilidade.
          </div>
        )}

        {/* Membros Atuais */}
        <div className="space-y-3">
          {overview?.members.map(member => {
            const missingText = [...member.employee.missingPermissions.pickup, ...member.employee.missingPermissions.approve].join(', ')
            return (
              <div
                key={member.employee.id}
                className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 transition-all sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground">{member.employee.user.name}</p>
                    <span className="text-muted-foreground">—</span>
                    <Badge variant={member.active ? 'success' : 'outline'}>
                      {member.active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Permissões faltantes: {missingText || 'Nenhuma'}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {member.canPickup && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                        <CheckIcon className="size-3.5" /> Pode assumir
                      </span>
                    )}
                    {member.isApprover && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                        <CheckIcon className="size-3.5" /> Aprovador
                      </span>
                    )}
                    {member.isManager && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                        <CheckIcon className="size-3.5" /> Gestor delegado
                      </span>
                    )}
                    {!member.canPickup && !member.isApprover && !member.isManager && (
                      <span className="text-xs text-muted-foreground italic">Sem papéis operacionais ativos</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    disabled={busy}
                    onClick={() => void mutate(member.employee.id, { active: !member.active, canPickup: false, isApprover: false })}
                  >
                    {member.active ? 'Desativar membro' : 'Reativar membro'}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Candidatos do Departamento */}
        <div className="space-y-4 pt-2">
          <div className="space-y-1">
            <h3 className="font-semibold text-foreground">Candidatos do departamento</h3>
          </div>

          <div className="space-y-2.5">
            {candidates
              .filter(c => !overview?.members.some(m => m.employee.id === c.id && m.active))
              .map(c => {
                const missingText = [...c.missingPermissions.pickup, ...c.missingPermissions.approve].join(', ')
                return (
                  <div
                    key={c.id}
                    className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 transition-colors sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">{c.user.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Faltantes: {missingText || 'Nenhuma'}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() => handleOpenAddMemberModal(c)}
                    >
                      Adicionar membro
                    </Button>
                  </div>
                )
              })}
          </div>

          {cursor && (
            <Button
              variant="outline"
              disabled={busy}
              onClick={async () => {
                setBusy(true)
                try {
                  const { data } = await api.get(`/helpdesk/queues/${queueId}/candidates`, {
                    params: { cursor, purpose: 'MEMBER' }
                  })
                  setCandidates(current => [...current, ...data.items])
                  setCursor(data.nextCursor)
                } catch (e) {
                  setError(getApiErrorMessage(e, 'Falha ao carregar candidatos.'))
                } finally {
                  setBusy(false)
                }
              }}
            >
              Mais candidatos
            </Button>
          )}

          <p className="text-xs text-muted-foreground">
            Cadastrar membros não concede permissões de cargo. A distribuição permanece manual.
          </p>
        </div>
      </CardContent>

      {/* Modal: Adicionar membro à fila */}
      <Dialog open={!!candidateToAdd} onOpenChange={open => !open && setCandidateToAdd(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar membro à fila</DialogTitle>
            <DialogDescription>
              Você está adicionando <strong className="text-foreground">{candidateToAdd?.user.name}</strong> à{' '}
              <strong className="text-foreground">{selectedQueue?.name || 'Fila'}</strong>. Selecione as permissões a conceder abaixo.
            </DialogDescription>
          </DialogHeader>

          {candidateToAdd && (
            <div className="space-y-4 py-2">
              {[...candidateToAdd.missingPermissions.pickup, ...candidateToAdd.missingPermissions.approve].length > 0 && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
                  <AlertCircle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>
                    Faltantes:{' '}
                    {[...candidateToAdd.missingPermissions.pickup, ...candidateToAdd.missingPermissions.approve].join(', ')}
                  </span>
                </div>
              )}

              <div className="space-y-2.5">
                <label
                  htmlFor="add-pickup"
                  className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50 cursor-pointer"
                >
                  <Checkbox
                    id="add-pickup"
                    checked={modalPermissions.canPickup}
                    disabled={candidateToAdd.missingPermissions.pickup.length > 0}
                    onCheckedChange={v => setModalPermissions(prev => ({ ...prev, canPickup: !!v }))}
                  />
                  <div className="space-y-0.5">
                    <span className="text-sm font-medium text-foreground">Pode assumir chamados</span>
                    {candidateToAdd.missingPermissions.pickup.length > 0 && (
                      <p className="text-xs text-muted-foreground">Requer helpdesk.ticket.pickup</p>
                    )}
                  </div>
                </label>

                <label
                  htmlFor="add-approver"
                  className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50 cursor-pointer"
                >
                  <Checkbox
                    id="add-approver"
                    checked={modalPermissions.isApprover}
                    disabled={candidateToAdd.missingPermissions.approve.length > 0}
                    onCheckedChange={v => setModalPermissions(prev => ({ ...prev, isApprover: !!v }))}
                  />
                  <div className="space-y-0.5">
                    <span className="text-sm font-medium text-foreground">Aprovador</span>
                    {candidateToAdd.missingPermissions.approve.length > 0 && (
                      <p className="text-xs text-muted-foreground">Requer helpdesk.ticket.approve</p>
                    )}
                  </div>
                </label>

                {context.canNameDelegates && (
                  <label
                    htmlFor="add-manager"
                    className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50 cursor-pointer"
                  >
                    <Checkbox
                      id="add-manager"
                      checked={modalPermissions.isManager}
                      onCheckedChange={v => setModalPermissions(prev => ({ ...prev, isManager: !!v }))}
                    />
                    <div className="space-y-0.5">
                      <span className="text-sm font-medium text-foreground">Gestor delegado</span>
                      <p className="text-xs text-muted-foreground">Permite delegar tarefas e gerir a fila</p>
                    </div>
                  </label>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setCandidateToAdd(null)}>
              Cancelar
            </Button>
            <Button disabled={busy} onClick={handleConfirmAddMember}>
              {busy ? 'Salvando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

export function CategoryEditor({
  categories,
  companyId,
  refresh,
}: {
  categories: Category[]
  companyId: string
  refresh: () => Promise<void>
}) {
  const empty = { id: '', name: '', slaResponse: 4, slaResolve: 8, active: true }
  const [form, setForm] = useState(empty)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function openCreateModal() {
    setForm(empty)
    setError('')
    setIsModalOpen(true)
  }

  function openEditModal(category: Category) {
    setForm({
      id: category.id,
      name: category.name,
      slaResponse: category.slaResponse,
      slaResolve: category.slaResolve,
      active: category.active,
    })
    setError('')
    setIsModalOpen(true)
  }

  async function handleSaveCategory() {
    if (!form.name.trim() || ![form.slaResponse, form.slaResolve].every(n => Number.isInteger(n) && n > 0)) {
      return
    }
    setBusy(true)
    setError('')
    try {
      const { id, ...body } = form
      if (id) {
        await api.patch(`/helpdesk/categories/${id}`, body)
      } else {
        await api.post('/helpdesk/categories', body)
      }
      setIsModalOpen(false)
      setForm(empty)
      await refresh()
    } catch (e) {
      setError(getApiErrorMessage(e, 'Não foi possível salvar a categoria.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="app-section-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl">Categorias e metas herdadas</CardTitle>
        <Button size="sm" onClick={openCreateModal} className="gap-1.5">
          <Plus className="size-4" />
          Nova categoria
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {categories.map(category => (
          <div
            key={category.id}
            className="flex items-center justify-between rounded-lg border border-border bg-card p-3.5 transition-colors hover:bg-muted/30"
          >
            <div className="flex items-center gap-3">
              <span
                className={`size-2.5 rounded-full shrink-0 ${
                  category.active ? 'bg-emerald-500' : 'bg-muted-foreground/40'
                }`}
              />
              <p className="text-sm font-medium text-foreground">
                {category.name} <span className="text-muted-foreground font-normal">— {category.slaResponse}h / {category.slaResolve}h</span>
                {!category.active && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    Inativa
                  </Badge>
                )}
                {category.companyId === null && (
                  <span className="text-xs text-muted-foreground ml-2">· Compartilhada, somente leitura</span>
                )}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs font-medium text-primary hover:bg-primary/10 hover:text-primary"
              disabled={category.companyId !== companyId}
              onClick={() => openEditModal(category)}
            >
              Editar categoria
            </Button>
          </div>
        ))}

        {!categories.length && (
          <p className="text-sm text-muted-foreground">Nenhuma categoria cadastrada ainda.</p>
        )}
      </CardContent>

      {/* Modal: Nova categoria / Editar categoria */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {form.id ? 'Editar categoria' : 'Nova categoria'}
            </DialogTitle>
            <DialogDescription>
              Configure o nome e as metas padrão de SLA (horas corridas) para esta categoria.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="field-stack">
              <Label htmlFor="category-name">Nome da categoria</Label>
              <Input
                id="category-name"
                value={form.name}
                placeholder="Ex: Hardware, Software, Acesso..."
                onChange={e => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="field-stack">
                <Label htmlFor="category-response">Primeira resposta (h)</Label>
                <Input
                  id="category-response"
                  type="number"
                  min={1}
                  step={1}
                  value={form.slaResponse}
                  onChange={e => setForm({ ...form, slaResponse: Number(e.target.value) })}
                />
              </div>
              <div className="field-stack">
                <Label htmlFor="category-resolve">Resolução (h)</Label>
                <Input
                  id="category-resolve"
                  type="number"
                  min={1}
                  step={1}
                  value={form.slaResolve}
                  onChange={e => setForm({ ...form, slaResolve: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="space-y-0.5">
                <span className="text-sm font-medium text-foreground">Categoria ativa</span>
                <p className="text-xs text-muted-foreground">Disponível para seleção em novos chamados</p>
              </div>
              <Switch
                checked={form.active}
                onCheckedChange={v => setForm({ ...form, active: v })}
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Alterações não recalculam chamados abertos. Desativar oculta os serviços vinculados do catálogo solicitável.
            </p>

            {error && <p role="alert" className="text-sm text-destructive font-medium">{error}</p>}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={
                busy ||
                !form.name.trim() ||
                ![form.slaResponse, form.slaResolve].every(n => Number.isInteger(n) && n > 0)
              }
              onClick={handleSaveCategory}
            >
              {busy ? 'Salvando...' : 'Salvar categoria'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
