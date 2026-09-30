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
import { 
  Headphones, 
  Layers, 
  Send, 
  UploadCloud, 
  FileText, 
  X, 
  Building2, 
  Tag, 
  Clock, 
  AlertCircle,
  Loader2
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

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
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    <div className="space-y-6">
      {/* Page Header */}
      <div className="space-y-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-primary">Helpdesk</span>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Abrir chamado</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Escolha o serviço correto para que o chamado seja roteado para a fila responsável com o SLA e as regras adequadas.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {createdId && (
        <div className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-600 dark:text-amber-400">
          <span>Chamado preliminar criado ({createdId}). Você pode acessá-lo ou tentar reenviar o anexo.</span>
          <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/helpdesk/${createdId}`)}>
            Abrir chamado sem reenviar anexo
          </Button>
        </div>
      )}

      {/* Grid de 2 Colunas fiel às Imagens 2 e 4 */}
      <form className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr] items-start" onSubmit={handleSubmit}>
        {/* Coluna 1: Dados do Chamado */}
        <Card className="shadow-xs">
          <CardHeader className="pb-4 border-b border-border/70">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Headphones className="size-4.5" />
              </div>
              <div className="space-y-0.5">
                <CardTitle className="text-base font-semibold">Dados do chamado</CardTitle>
                <CardDescription className="text-xs">
                  O assunto deve ser objetivo e a descrição deve trazer contexto e detalhes.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-5 pt-5">
            {/* Assunto */}
            <div className="space-y-1.5">
              <Label htmlFor="subject" className="text-xs font-medium">
                Assunto <span className="text-destructive">*</span>
              </Label>
              <Input
                id="subject"
                disabled={!!createdId}
                placeholder="Ex: preciso consultar o status de um pedido de compra"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                required
              />
            </div>

            {/* Descrição Detalhada com Contador */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="description" className="text-xs font-medium">
                  Descrição detalhada <span className="text-destructive">*</span>
                </Label>
                <span className="text-[11px] text-muted-foreground font-mono">
                  {description.length}/1000
                </span>
              </div>
              <Textarea
                id="description"
                disabled={!!createdId}
                maxLength={1000}
                className="min-h-[160px] resize-y"
                placeholder="Descreva o contexto, o impacto e o que você precisa de atendimento."
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                required
              />
            </div>

            {/* Dropzone de Anexo Opcional */}
            <div className="space-y-1.5">
              <Label htmlFor="attachment" className="text-xs font-medium">
                Anexo opcional
              </Label>
              
              <input
                ref={fileInputRef}
                id="attachment"
                type="file"
                className="hidden"
                accept=".png,.jpg,.jpeg,.gif,.pdf,.doc,.docx"
                onChange={(event) => {
                  setAttachment(event.target.files?.[0] || null)
                  setUploadId(null)
                }}
              />

              {attachment ? (
                <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <FileText className="size-5 shrink-0 text-primary" />
                    <div className="truncate">
                      <p className="text-xs font-medium text-foreground truncate">{attachment.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {(attachment.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      setAttachment(null)
                      setUploadId(null)
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="group flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border/80 bg-muted/10 p-6 text-center transition-colors hover:border-primary/50 hover:bg-muted/20 cursor-pointer"
                >
                  <div className="flex size-10 items-center justify-center rounded-full bg-muted/60 text-muted-foreground transition group-hover:bg-primary/10 group-hover:text-primary">
                    <UploadCloud className="size-5" />
                  </div>
                  <p className="mt-2 text-xs font-medium text-foreground">
                    Arraste e solte um arquivo aqui ou clique para selecionar
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    PDF, PNG, JPG, DOC até 10MB
                  </p>
                </div>
              )}
            </div>

            {/* Ações no Rodapé */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/70">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting || !selectedService || !canCreate} className="gap-2 shadow-xs">
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Enviando...
                  </>
                ) : createdId ? (
                  <>
                    <Send className="size-4" />
                    Reenviar anexo
                  </>
                ) : (
                  <>
                    <Send className="size-4" />
                    Abrir chamado
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Coluna 2: Catálogo de Serviços */}
        <Card className="shadow-xs">
          <CardHeader className="pb-4 border-b border-border/70">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Layers className="size-4.5" />
              </div>
              <div className="space-y-0.5">
                <CardTitle className="text-base font-semibold">Catálogo de serviços</CardTitle>
                <CardDescription className="text-xs">
                  O serviço escolhido define fila, categoria, prioridade e regras de SLA.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-5 pt-5">
            {loadingCatalog ? (
              <div className="flex items-center justify-center rounded-lg border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
                <Loader2 className="mr-2 size-4 animate-spin" />
                Carregando catálogo...
              </div>
            ) : catalog.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
                Nenhum serviço configurado para sua empresa neste momento.
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="service-catalog" className="text-xs font-medium">
                  Serviço <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={selectedServiceId}
                  onValueChange={setSelectedServiceId}
                  disabled={!!createdId}
                >
                  <SelectTrigger id="service-catalog" className="w-full">
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
                <p className="text-[11px] text-muted-foreground">
                  Selecione a categoria operacional mais próxima da sua necessidade.
                </p>
              </div>
            )}

            {/* Box "Serviço Selecionado" fiel às Imagens 2 e 4 */}
            {selectedService && (
              <div className="rounded-lg border border-primary/20 bg-primary/4 p-4 space-y-3.5">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
                    <Layers className="size-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-foreground">Serviço selecionado</h4>
                    <p className="text-[11px] text-muted-foreground">
                      {selectedService.name} será roteado para a fila {selectedService.queue?.name || 'Geral'}.
                    </p>
                  </div>
                </div>

                <div className="grid gap-2 border-t border-primary/10 pt-3 text-xs">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Tag className="size-3.5 text-primary shrink-0" />
                    <span>Categoria: <strong className="font-medium text-foreground">{selectedService.ticketCategory?.name || 'Geral'}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building2 className="size-3.5 text-primary shrink-0" />
                    <span>Departamento: <strong className="font-medium text-foreground">{selectedService.department?.name || 'Geral'}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <AlertCircle className="size-3.5 text-primary shrink-0" />
                    <span>Prioridade sugerida: <strong className="font-medium text-foreground">{PRIORITY_LABELS[selectedService.defaultPriority] || selectedService.defaultPriority}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="size-3.5 text-primary shrink-0" />
                    <span>SLA de atendimento: <strong className="font-medium text-foreground">3 dias úteis</strong></span>
                  </div>
                </div>

                {selectedService.description && (
                  <div className="border-t border-primary/10 pt-3">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Descrição</span>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                      {selectedService.description}
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </form>
    </div>
  )
}

