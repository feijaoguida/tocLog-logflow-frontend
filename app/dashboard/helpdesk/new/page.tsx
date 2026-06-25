'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
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
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'

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

  useEffect(() => {
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

    if (!selectedService) {
      toast.error('Selecione um serviço do catálogo antes de continuar.')
      return
    }

    setSubmitting(true)
    try {
      const { data } = await api.post('/helpdesk/tickets', {
        subject,
        description,
        serviceCatalogItemId: selectedService.id,
        categoryId: selectedService.ticketCategory?.id,
        priority: selectedService.defaultPriority,
      })

      if (attachment) {
        const formData = new FormData()
        formData.append('file', attachment)
        const upload = await api.post('/uploads/helpdesk', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })

        await api.post(`/helpdesk/tickets/${data.id}/attachments`, {
          fileName: attachment.name,
          fileUrl: upload.data.url,
          mimeType: attachment.type || 'application/octet-stream',
          size: attachment.size,
        })
      }

      toast.success('Chamado aberto com sucesso.')
      router.push('/dashboard/helpdesk')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível abrir o chamado.'))
    } finally {
      setSubmitting(false)
    }
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
              onChange={(event) => setAttachment(event.target.files?.[0] || null)}
            />
            <p className="text-xs text-muted-foreground">
              Use quando precisar enviar comprovante, captura de tela ou documento de apoio.
            </p>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting || !selectedService}>
              {submitting ? 'Abrindo...' : 'Abrir chamado'}
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
            <div className="space-y-3">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                O primeiro serviço disponível é selecionado automaticamente. Se precisar, você
                pode trocar antes de abrir o chamado.
              </div>
              {catalog.map((item) => {
                const isSelected = item.id === selectedServiceId
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedServiceId(item.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border bg-card hover:border-primary/40'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="font-semibold">{item.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {item.description || 'Sem descrição cadastrada.'}
                        </div>
                      </div>
                      <Badge variant="outline">
                        {PRIORITY_LABELS[item.defaultPriority] || item.defaultPriority}
                      </Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>Departamento: {item.department?.name || 'Não informado'}</span>
                      <span>Fila: {item.queue?.name || 'Não informada'}</span>
                      <span>Categoria: {item.ticketCategory?.name || 'Não informada'}</span>
                    </div>
                    {item.approvalMode === 'REQUIRED' ? (
                      <div className="mt-3 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        <AlertCircle className="h-4 w-4" />
                        Este serviço exige aprovação antes do atendimento.
                      </div>
                    ) : null}
                  </button>
                )
              })}
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
