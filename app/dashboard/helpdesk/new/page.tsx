'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'
import { uploadHelpdeskFile, type HelpdeskContext } from '../operations'

type CatalogItem = {
  id: string
  name: string
  slug: string
  description?: string | null
  defaultPriority: string
  approvalMode: string
  queue?: { id: string; name: string } | null
  department?: { id: string; name: string } | null
  ticketCategory?: { id: string; name: string } | null
}

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',
}

export default function NewTicketPage() {
  const router = useRouter()
  const [catalog, setCatalog] = useState<CatalogItem[]>([])
  const [loadingCatalog, setLoadingCatalog] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [selectedServiceId, setSelectedServiceId] = useState('')
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [attachment, setAttachment] = useState<File | null>(null)

  const [createdId, setCreatedId] = useState<string | null>(null)
  const [uploadId, setUploadId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [canCreate, setCanCreate] = useState(false)
  const lock = useRef(false)

  useEffect(() => {
    api.get<HelpdeskContext>('/helpdesk/context').then(({ data }) => setCanCreate(data.capabilities.createTicket)).catch(() => setCanCreate(false))
    void fetchCatalog()
  }, [])

  async function fetchCatalog() {
    setLoadingCatalog(true)
    try {
      const { data } = await api.get('/helpdesk/catalog')
      setCatalog(data)
      setSelectedServiceId((current) => current || data[0]?.id || '')
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, 'Não foi possível carregar o catálogo de serviços.'),
      )
    } finally {
      setLoadingCatalog(false)
    }
  }

  const selectedService = useMemo(
    () => catalog.find((item) => item.id === selectedServiceId) || null,
    [catalog, selectedServiceId],
  )

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (lock.current || !canCreate) return

    if (!selectedService) {
      toast.error('Selecione um serviço do catálogo antes de continuar.')
      return
    }

    lock.current = true; setSubmitting(true); setError('')
    let ticketId = createdId
    try {
      if (!ticketId) {
        const { data } = await api.post('/helpdesk/tickets', {
          subject, description, serviceCatalogItemId: selectedService.id,
          categoryId: selectedService.ticketCategory?.id, priority: selectedService.defaultPriority,
        })
        ticketId = data.id; setCreatedId(ticketId)
      }
      if (attachment) {
        const uploaded = uploadId ?? await uploadHelpdeskFile(attachment)
        setUploadId(uploaded)
        await api.post(`/helpdesk/tickets/${ticketId}/attachments`, { uploadId: uploaded })
      }
      toast.success('Chamado aberto com sucesso.')
      router.push(`/dashboard/helpdesk/${ticketId}`)
    } catch (error) {
      setError(ticketId ? 'Chamado criado; o anexo falhou. Tente reenviar o anexo ou abra o chamado sem ele.' : getApiErrorMessage(error, 'Não foi possível abrir o chamado.'))
    } finally { lock.current = false; setSubmitting(false) }
  }

  return (
    <div className="app-page">
      <section className="app-page-header">
        <div className="app-kicker">Atendimento Interno</div>
        <h1 className="app-title">Abrir chamado</h1>
        <p className="app-subtitle">
          Escolha o serviço correto para que o chamado seja roteado para a fila responsável
          com o SLA e as regras adequadas.
        </p>
      </section>

      {error && <p role="alert">{error}</p>}
      {createdId && <Button variant="outline" onClick={() => router.push(`/dashboard/helpdesk/${createdId}`)}>Abrir chamado criado sem reenviar anexo</Button>}
      <form className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]" onSubmit={handleSubmit}>
        <section className="app-section-card space-y-4">
          <div className="space-y-1">
            <h2 className="section-title">Dados do chamado</h2>
            <p className="text-sm text-muted-foreground">
              O assunto deve ser objetivo e a descrição deve trazer contexto, impacto e o que
              você já tentou fazer.
            </p>
          </div>

          <div className="field-stack">
            <Label htmlFor="subject">Assunto</Label>
            <Input
              id="subject"
              disabled={!!createdId}
              placeholder="Ex: preciso consultar o status de um pedido de compra"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              required
            />
          </div>

          <div className="field-stack">
            <Label htmlFor="description">Descrição detalhada</Label>
            <Textarea
              id="description"
              disabled={!!createdId}
              className="min-h-[180px]"
              placeholder="Descreva o contexto, o impacto e o que precisa do atendimento."
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              required
            />
          </div>

          <div className="field-stack">
            <Label htmlFor="attachment">Anexo opcional</Label>
            <Input
              id="attachment"
              type="file"
              accept=".png,.jpg,.jpeg,.gif,.pdf,.doc,.docx"
              onChange={(event) => { setAttachment(event.target.files?.[0] || null); setUploadId(null) }}
            />
            <p className="text-xs text-muted-foreground">
              Use quando precisar enviar comprovante, captura de tela ou documento de apoio.
            </p>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting || !selectedService || !canCreate}>
              {submitting ? 'Enviando...' : createdId ? 'Reenviar anexo' : 'Abrir chamado'}
            </Button>
          </div>
        </section>

        <section className="app-section-card space-y-4">
          <div className="space-y-1">
            <h2 className="section-title">Catálogo de serviços</h2>
            <p className="text-sm text-muted-foreground">
              O serviço escolhido define fila, categoria, prioridade sugerida e se existe
              aprovação antes do atendimento.
            </p>
          </div>

          {loadingCatalog ? (
            <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              Carregando catálogo...
            </div>
          ) : catalog.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              Nenhum serviço configurado para sua empresa neste momento.
            </div>
          ) : (
            <div className="field-stack">
              <Label htmlFor="service-catalog">Serviço</Label>
              <Select
                value={selectedServiceId}
                onValueChange={setSelectedServiceId}
                disabled={!!createdId}
              >
                <SelectTrigger id="service-catalog">
                  <SelectValue placeholder="Selecione um serviço" />
                </SelectTrigger>
                <SelectContent>
                  {catalog.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                O primeiro serviço disponível é selecionado automaticamente. Você pode trocar antes de abrir o chamado.
              </p>
            </div>
          )}

          {selectedService ? (
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle className="text-base">Serviço selecionado</CardTitle>
                <CardDescription>
                  {selectedService.name} será roteado para {selectedService.queue?.name || 'a fila configurada'}.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <div>Categoria: {selectedService.ticketCategory?.name || 'Não informada'}</div>
                <div>Departamento: {selectedService.department?.name || 'Não informado'}</div>
                <div>
                  Prioridade sugerida:{' '}
                  {PRIORITY_LABELS[selectedService.defaultPriority] || selectedService.defaultPriority}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </section>
      </form>
    </div>
  )
}
