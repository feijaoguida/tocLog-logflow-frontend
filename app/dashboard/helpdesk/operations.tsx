'use client'

import { useState } from 'react'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'
import { Button } from '@/components/ui/button'

export type HelpdeskContext = { capabilities: { createTicket: boolean; myTickets: boolean; queues: boolean; approvals: boolean; dashboard: boolean; settings: boolean; manageQueues: boolean } }
export type Sla = { state: string; cycle: number; firstResponse: SlaMetric; resolution: SlaMetric }
type SlaMetric = { state: string; remainingSeconds: number; violated: boolean; dueAt: string | null }
const states: Record<string, string> = { ACTIVE: 'Em andamento', PAUSED: 'Pausado', NOT_STARTED: 'Não iniciado', COMPLETED: 'Concluído', CANCELLED: 'Cancelado' }

export function SlaStatus({ sla }: { sla: Sla }) {
  return <div className="space-y-2 text-sm" aria-label="SLA atual">
    <p>Ciclo {sla.cycle} — {states[sla.state] || sla.state}</p>
    {([['Primeira resposta', sla.firstResponse], ['Resolução', sla.resolution]] as const).map(([label, metric]) => <p key={label}>
      {label}: {states[metric.state] || metric.state} · Saldo {(metric.remainingSeconds / 3600).toFixed(2)}h{metric.violated ? ' · Violado' : ''}{metric.dueAt ? ` · Prazo ${new Date(metric.dueAt).toLocaleString('pt-BR')}` : ''}
    </p>)}
  </div>
}

export async function uploadHelpdeskFile(file: File): Promise<string> {
  const body = new FormData()
  body.append('file', file)
  const { data } = await api.post<{ uploadId: string }>('/uploads/helpdesk', body)
  return data.uploadId
}

export function AttachmentDownload({ id, name }: { id: string; name: string }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  return <span><Button variant="outline" size="sm" disabled={busy} onClick={async () => {
    setBusy(true); setError('')
    try {
      const { data } = await api.get(`/helpdesk/attachments/${encodeURIComponent(id)}/content`, { responseType: 'blob' })
      const url = URL.createObjectURL(data)
      const link = document.createElement('a')
      link.href = url; link.download = name; link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (e) { setError(getApiErrorMessage(e, 'Não foi possível baixar o anexo. Verifique sua sessão e tente novamente.')) }
    finally { setBusy(false) }
  }}>{busy ? 'Baixando...' : name}</Button>{error && <span role="alert">{error}</span>}</span>
}
