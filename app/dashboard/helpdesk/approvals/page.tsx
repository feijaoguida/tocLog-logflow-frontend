'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { isAxiosError } from 'axios'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { HelpdeskContext } from '../operations'

type Approval = {
  id: string; kind: string; mode: string; status: string; version: number;
  ticket: { id: string; code: number; subject: string; status: string };
  participants: { id: string; status: string; approver: { id: string; name: string } }[];
  allowedActions: string[];
}
const statuses: Record<string, string> = { PENDING: 'Pendente', NEEDS_ASSIGNMENT: 'Aguardando substituto', APPROVED: 'Aprovada', REJECTED: 'Rejeitada', SUPERSEDED: 'Superada' }

export default function HelpdeskApprovalsPage() {
  const [context, setContext] = useState<HelpdeskContext | null>(null)
  const [administrative, setAdministrative] = useState(false)
  const [items, setItems] = useState<Approval[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [reason, setReason] = useState('')
  const [candidate, setCandidate] = useState('')
  const [candidates, setCandidates] = useState<{ id: string; name: string }[]>([])
  const [candidateCursor, setCandidateCursor] = useState<string | null>(null)
  const [participant, setParticipant] = useState('')
  const lock = useRef(false)
  useEffect(() => {
    let active = true
    api.get<HelpdeskContext>('/helpdesk/context').then(({ data }) => { if (active) setContext(data) }).catch(e => { if (active) setError(getApiErrorMessage(e, 'Não foi possível consultar permissões.')) })
    return () => { active = false }
  }, [])
  const permitted = administrative ? context?.capabilities.settings : context?.capabilities.approvals
  const load = useCallback(async (next?: string) => {
    if (!permitted) { setItems([]); return }
    const { data } = await api.get<{ items: Approval[]; nextCursor: string | null }>(`/helpdesk/approvals/${administrative ? 'unassigned' : 'my'}`, { params: { cursor: next } })
    setItems(current => next ? [...current, ...data.items] : data.items); setCursor(data.nextCursor)
  }, [administrative, permitted])
  useEffect(() => { setItems([]); setCursor(null); void load().catch(e => setError(getApiErrorMessage(e, 'Não foi possível carregar aprovações.'))) }, [load])
  useEffect(() => {
    if (!context?.capabilities.settings) return
    api.get('/helpdesk/settings/approver-candidates').then(({ data }) => { setCandidates(data.items); setCandidateCursor(data.nextCursor) }).catch(e => setError(getApiErrorMessage(e, 'Não foi possível carregar substitutos.')))
  }, [context?.capabilities.settings])

  async function act(item: Approval, action: 'approve' | 'reject' | 'reassign') {
    if (lock.current) return
    lock.current = true; setBusy(true); setError('')
    try {
      await api.post(`/helpdesk/approvals/${item.id}/${action}`, {
        expectedVersion: item.version, reason: reason.trim() || undefined,
        ...(action === 'reassign' ? { approverUserId: candidate, participantId: participant || undefined } : {}),
      })
      setReason(''); setParticipant(''); await load()
    } catch (e) {
      setError(isAxiosError(e) && e.response?.status === 409 ? 'Solicitação atualizada ou superada. Lista recarregada; motivo preservado.' : getApiErrorMessage(e, 'Não foi possível atualizar a solicitação.'))
      if (isAxiosError(e) && [403, 409].includes(e.response?.status ?? 0)) await load().catch(() => setItems([]))
    } finally { lock.current = false; setBusy(false) }
  }

  return <div className="app-page space-y-4">
    <h1 className="app-title">Minhas aprovações</h1>
    <p>Decisões de abertura e cancelamento. Uma aprovação parcial não libera um chamado que exige todos os votos.</p>
    <div className="flex gap-3">
      {context?.capabilities.approvals && <Button variant="outline" onClick={() => setAdministrative(false)}>Minhas solicitações e histórico</Button>}
      {context?.capabilities.settings && <Button variant="outline" onClick={() => setAdministrative(true)}>Pendências administrativas</Button>}
      <Button disabled={busy} variant="outline" onClick={() => void load().catch(e => setError(getApiErrorMessage(e, 'Falha ao atualizar.')))}>Atualizar</Button>
    </div>
    {error && <p role="alert">{error}</p>}
    {context && !permitted && <p role="status">Sem permissão para esta lista. Selecione uma área disponível.</p>}
    <Label htmlFor="approval-reason">Motivo da decisão ou substituição</Label>
    <Textarea id="approval-reason" value={reason} onChange={e => setReason(e.target.value)} />
    {administrative && context?.capabilities.approvals && <div className="space-y-2">
      <Label htmlFor="approval-candidate">Substituto elegível</Label>
      <select id="approval-candidate" value={candidate} onChange={e => setCandidate(e.target.value)}><option value="">Selecione</option>{candidates.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      {candidateCursor && <Button disabled={busy} onClick={async () => {
        try { const { data } = await api.get('/helpdesk/settings/approver-candidates', { params: { cursor: candidateCursor } }); setCandidates(current => [...current, ...data.items]); setCandidateCursor(data.nextCursor) }
        catch (e) { setError(getApiErrorMessage(e, 'Falha ao carregar substitutos.')) }
      }}>Mais substitutos</Button>}
      <p>Indicar substituto não aprova a solicitação nem apaga votos anteriores.</p>
    </div>}
    {items.map(item => <section key={item.id} className="app-section-card space-y-3" aria-label={`Solicitação ${item.ticket.subject}`}>
      <h2>{item.kind === 'CANCELLATION' ? 'Cancelamento' : 'Abertura'} — #{item.ticket.code} {item.ticket.subject}</h2>
      <p>{statuses[item.status] || item.status} · {item.mode === 'QUEUE_ALL' ? 'Todos os aprovadores' : item.mode === 'REQUESTER_MANAGER' ? 'Gestor direto' : 'Qualquer aprovador'}</p>
      <p>Obrigações pendentes: {item.participants.filter(p => p.status === 'PENDING').length}</p>
      <ul>{item.participants.map(p => <li key={p.id}>{p.approver.name}: {statuses[p.status] || p.status}</li>)}</ul>
      <Link href={`/dashboard/helpdesk/${item.ticket.id}`}>Detalhe do chamado</Link>
      <div className="flex gap-3">
        {item.allowedActions.includes('approve') && <Button disabled={busy} onClick={() => void act(item, 'approve')}>Aprovar solicitação</Button>}
        {item.allowedActions.includes('reject') && <Button disabled={busy || !reason.trim()} variant="outline" onClick={() => void act(item, 'reject')}>Rejeitar solicitação</Button>}
        {administrative && context?.capabilities.approvals && item.status === 'NEEDS_ASSIGNMENT' && <>
          <select aria-label={`Obrigação de ${item.ticket.subject}`} value={item.participants.some(p => p.id === participant) ? participant : ''} onChange={e => setParticipant(e.target.value)}><option value="">Sem participante pendente</option>{item.participants.filter(p => p.status === 'PENDING').map(p => <option key={p.id} value={p.id}>{p.approver.name}</option>)}</select>
          <Button disabled={busy || !candidate || !reason.trim() || (item.participants.some(p => p.status === 'PENDING') && !item.participants.some(p => p.id === participant && p.status === 'PENDING'))} onClick={() => void act(item, 'reassign')}>Indicar substituto</Button>
        </>}
      </div>
    </section>)}
    {permitted && items.length === 0 && <p>Nenhuma solicitação nesta página.</p>}
    {cursor && <Button disabled={busy} onClick={() => void load(cursor).catch(e => setError(getApiErrorMessage(e, 'Falha ao carregar próxima página.')))}>Mais solicitações</Button>}
  </div>
}
