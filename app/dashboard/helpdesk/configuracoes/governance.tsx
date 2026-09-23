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
  useEffect(() => {
    let active = true
    async function load() {
      setError(''); setOverview(null); setBusy(true)
      setQueueForm(context.managedQueues.find(q => q.id === queueId) ?? null)
      try {
        if (!queueId) return
        const [detail, options] = await Promise.all([api.get<QueueOverview>(`/helpdesk/queues/${queueId}/overview`), api.get(`/helpdesk/queues/${queueId}/candidates`, { params: { purpose: 'MEMBER' } })])
        if (active) { setOverview(detail.data); setCandidates(options.data.items); setCursor(options.data.nextCursor) }
      } catch (e) { if (active) setError(getApiErrorMessage(e, 'Falha ao carregar a fila.')) } finally { if (active) setBusy(false) }
    }
    void load(); return () => { active = false }
  }, [queueId, revision, context.managedQueues])
  async function mutate(employeeId: string, body: object, delegate = false) {
    setBusy(true); setError('')
    try { await api.put(`/helpdesk/queues/${queueId}/${delegate ? 'delegates' : 'members'}/${employeeId}`, body); setRevision(n => n + 1) }
    catch (e) { setError(getApiErrorMessage(e, 'Não foi possível atualizar o membro.')) } finally { setBusy(false) }
  }
  return <Card><CardHeader><CardTitle>Gestão de membros e filas</CardTitle></CardHeader><CardContent className="space-y-4">
    <Label htmlFor="managed-queue">Fila sob sua gestão</Label><select id="managed-queue" className={selectClass} value={queueId} onChange={e => setQueueId(e.target.value)}>{context.managedQueues.map(q => <option key={q.id} value={q.id}>{q.name} — {q.department.name}</option>)}</select>
    {!context.managedQueues.length && <p>Nenhuma fila disponível para gestão.</p>}
    {!context.capabilities.settings && queueForm && <div className="space-y-3">
      <Label htmlFor="local-queue-name">Nome da fila</Label><Input id="local-queue-name" value={queueForm.name} onChange={e => setQueueForm({ ...queueForm, name: e.target.value })} />
      <label className="flex gap-2"><input type="checkbox" checked={queueForm.active} onChange={e => setQueueForm({ ...queueForm, active: e.target.checked })} />Fila ativa</label>
      <label className="flex gap-2"><input type="checkbox" checked={queueForm.allowAgentPickup} onChange={e => setQueueForm({ ...queueForm, allowAgentPickup: e.target.checked })} />Permitir pickup do agente</label>
      <Button disabled={busy || !queueForm.name.trim()} onClick={async () => {
        setBusy(true); setError('')
        try { await api.patch(`/helpdesk/queues/${queueId}`, { name: queueForm.name, description: queueForm.description ?? '', departmentId: queueForm.departmentId, active: queueForm.active, allowAgentPickup: queueForm.allowAgentPickup }); }
        catch (e) { setError(getApiErrorMessage(e, 'Não foi possível salvar a fila.')) } finally { setBusy(false) }
      }}>Salvar fila</Button>
    </div>}
    {error && <p role="alert">{error}</p>}
    {!!overview?.approvalIssues.length && <p role="status">{overview.approvalIssues.length} aprovação(ões) precisam de revisão de elegibilidade.</p>}
    {overview?.members.map(member => <div className="rounded-lg border p-3 space-y-2" key={member.employee.id}>
      <p className="font-medium">{member.employee.user.name} — {member.active ? 'Ativo' : 'Inativo'}</p>
      <p className="text-sm">Permissões faltantes: {[...member.employee.missingPermissions.pickup, ...member.employee.missingPermissions.approve].join(', ') || 'Nenhuma'}</p>
      <label className="flex gap-2"><input type="checkbox" checked={member.canPickup} disabled={busy || !member.active || member.employee.missingPermissions.pickup.length > 0} onChange={e => void mutate(member.employee.id, { active: member.active, canPickup: e.target.checked, isApprover: member.isApprover })} />Pode assumir</label>
      <label className="flex gap-2"><input type="checkbox" checked={member.isApprover} disabled={busy || !member.active || member.employee.missingPermissions.approve.length > 0} onChange={e => void mutate(member.employee.id, { active: member.active, canPickup: member.canPickup, isApprover: e.target.checked })} />Aprovador</label>
      {context.canNameDelegates && <label className="flex gap-2"><input type="checkbox" checked={member.isManager} disabled={busy} onChange={e => void mutate(member.employee.id, { active: e.target.checked }, true)} />Gestor delegado</label>}
      <Button variant="outline" disabled={busy} onClick={() => void mutate(member.employee.id, { active: !member.active, canPickup: false, isApprover: false })}>{member.active ? 'Desativar membro' : 'Reativar membro'}</Button>
    </div>)}
    <h3 className="font-medium">Candidatos do departamento</h3>
    {candidates.filter(c => !overview?.members.some(m => m.employee.id === c.id && m.active)).map(c => <div key={c.id} className="flex items-center justify-between gap-3 border rounded-lg p-3"><div><p>{c.user.name}</p><p className="text-sm">Faltantes: {[...c.missingPermissions.pickup, ...c.missingPermissions.approve].join(', ') || 'Nenhuma'}</p></div><Button disabled={busy} onClick={() => void mutate(c.id, { active: true, canPickup: false, isApprover: false })}>Adicionar membro</Button></div>)}
    {cursor && <Button variant="outline" disabled={busy} onClick={async () => {
      setBusy(true)
      try { const { data } = await api.get(`/helpdesk/queues/${queueId}/candidates`, { params: { cursor, purpose: 'MEMBER' } }); setCandidates(current => [...current, ...data.items]); setCursor(data.nextCursor) }
      catch (e) { setError(getApiErrorMessage(e, 'Falha ao carregar candidatos.')) } finally { setBusy(false) }
    }}>Mais candidatos</Button>}
    <p className="text-sm text-muted-foreground">Cadastrar membros não concede permissões de cargo. A distribuição permanece manual.</p>
  </CardContent></Card>
}

export function CategoryEditor({ categories, companyId, refresh }: { categories: Category[]; companyId: string; refresh: () => Promise<void> }) {
  const empty = { id: '', name: '', slaResponse: 4, slaResolve: 8, active: true }
  const [form, setForm] = useState(empty)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  return <Card><CardHeader><CardTitle>Categorias e metas herdadas</CardTitle></CardHeader><CardContent className="space-y-4">
    {categories.map(category => <div key={category.id} className="flex justify-between gap-3 border rounded-lg p-3"><p>{category.name} — {category.slaResponse}h / {category.slaResolve}h — {category.active ? 'Ativa' : 'Inativa'}{category.companyId === null ? ' · Compartilhada, somente leitura' : ''}</p><Button variant="outline" disabled={category.companyId !== companyId} onClick={() => setForm({ id: category.id, name: category.name, slaResponse: category.slaResponse, slaResolve: category.slaResolve, active: category.active })}>Editar categoria</Button></div>)}
    <Label htmlFor="category-name">Nome da categoria</Label><Input id="category-name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
    <Label htmlFor="category-response">Primeira resposta (horas)</Label><Input id="category-response" type="number" min={1} step={1} value={form.slaResponse} onChange={e => setForm({ ...form, slaResponse: Number(e.target.value) })} />
    <Label htmlFor="category-resolve">Resolução (horas)</Label><Input id="category-resolve" type="number" min={1} step={1} value={form.slaResolve} onChange={e => setForm({ ...form, slaResolve: Number(e.target.value) })} />
    <label className="flex gap-2"><input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} />Categoria ativa</label>
    <p className="text-sm text-muted-foreground">Alterações não recalculam chamados abertos. Desativar oculta os serviços vinculados do catálogo solicitável.</p>
    {error && <p role="alert">{error}</p>}
    <div className="flex gap-3"><Button variant="outline" onClick={() => setForm(empty)}>Nova categoria</Button><Button disabled={busy || !form.name.trim() || ![form.slaResponse, form.slaResolve].every(n => Number.isInteger(n) && n > 0)} onClick={async () => {
      setBusy(true); setError('')
      try { const { id, ...body } = form; if (id) await api.patch(`/helpdesk/categories/${id}`, body); else await api.post('/helpdesk/categories', body); setForm(empty); await refresh() }
      catch (e) { setError(getApiErrorMessage(e, 'Não foi possível salvar a categoria.')) } finally { setBusy(false) }
    }}>Salvar categoria</Button></div>
  </CardContent></Card>
}
