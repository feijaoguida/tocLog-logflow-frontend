'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { MenuFunctionHeader } from '@/components/layout/menu-function-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'
import type {
  FeedbackCategory,
  FeedbackRecipientRecord,
  FeedbackType,
} from '@/lib/feedback-types'

type CompanyFeedbackKind =
  | 'RECOGNITION'
  | 'GUIDANCE'
  | 'PERIODIC_REVIEW'
  | 'DEVELOPMENT_PLAN'

const TYPE_OPTIONS: Array<{ value: FeedbackType; label: string }> = [
  { value: 'EMPLOYEE_TO_COMPANY', label: 'Colaborador para empresa' },
  { value: 'ONE_TO_ONE', label: '1 para 1' },
  { value: 'COMPANY_TO_EMPLOYEE', label: 'Empresa para colaborador' },
]

const CATEGORY_OPTIONS: Array<{ value: FeedbackCategory; label: string }> = [
  { value: 'SUGGESTION', label: 'Sugestao' },
  { value: 'COMPLAINT', label: 'Reclamacao' },
  { value: 'PRAISE', label: 'Elogio' },
  { value: 'IMPROVEMENT_IDEA', label: 'Ideia de melhoria' },
  { value: 'REPORT', label: 'Denuncia' },
]

const COMPANY_KIND_OPTIONS: Array<{ value: CompanyFeedbackKind; label: string }> = [
  { value: 'RECOGNITION', label: 'Reconhecimento' },
  { value: 'GUIDANCE', label: 'Orientacao' },
  { value: 'PERIODIC_REVIEW', label: 'Avaliacao periodica' },
  { value: 'DEVELOPMENT_PLAN', label: 'Plano de desenvolvimento' },
]

export default function NewFeedbackPage() {
  const router = useRouter()
  const [type, setType] = useState<FeedbackType>('EMPLOYEE_TO_COMPANY')
  const [category, setCategory] = useState<FeedbackCategory>('SUGGESTION')
  const [companyFeedbackKind, setCompanyFeedbackKind] =
    useState<CompanyFeedbackKind>('RECOGNITION')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [anonymous, setAnonymous] = useState(false)
  const [visibleToHr, setVisibleToHr] = useState(false)
  const [readConfirmation, setReadConfirmation] = useState(false)
  const [targetEmployeeId, setTargetEmployeeId] = useState('')
  const [recipients, setRecipients] = useState<FeedbackRecipientRecord[]>([])
  const [loadingRecipients, setLoadingRecipients] = useState(true)
  const [saving, setSaving] = useState(false)

  const requiresTarget = type !== 'EMPLOYEE_TO_COMPANY'
  const isReport = category === 'REPORT'

  useEffect(() => {
    async function loadRecipients() {
      try {
        const { data } = await api.get<FeedbackRecipientRecord[]>('/feedbacks/recipients')
        setRecipients(data)
      } catch (error) {
        toast.error(getApiErrorMessage(error, 'Nao foi possivel carregar os destinatarios disponiveis.'))
      } finally {
        setLoadingRecipients(false)
      }
    }

    void loadRecipients()
  }, [])

  useEffect(() => {
    if (type === 'EMPLOYEE_TO_COMPANY') {
      setTargetEmployeeId('')
      setReadConfirmation(false)
      setVisibleToHr(false)
    }

    if (type === 'COMPANY_TO_EMPLOYEE') {
      setAnonymous(false)
      setVisibleToHr(false)
    }

    if (type === 'ONE_TO_ONE') {
      setAnonymous(false)
      setReadConfirmation(false)
    }
  }, [type])

  useEffect(() => {
    if (isReport && type === 'ONE_TO_ONE') {
      setVisibleToHr(true)
    }
  }, [isReport, type])

  const privacyCopy = useMemo(() => {
    if (type === 'EMPLOYEE_TO_COMPANY') {
      return 'O feedback segue o fluxo corporativo do RH e podera ser roteado pelas configuracoes do modulo.'
    }

    if (type === 'COMPANY_TO_EMPLOYEE') {
      return 'Use este tipo para reconhecimento, orientacao, avaliacao periodica ou plano de desenvolvimento.'
    }

    if (isReport) {
      return 'Como este 1 para 1 foi classificado como denuncia, o RH tambem visualizara a thread.'
    }

    return visibleToHr
      ? 'Este 1 para 1 foi marcado para tambem ser visualizado pelo RH.'
      : 'Este 1 para 1 nao sera visualizado pelo RH, salvo se houver mudanca de regra ou reclassificacao.'
  }, [isReport, type, visibleToHr])

  const targetPlaceholder = useMemo(() => {
    if (type === 'COMPANY_TO_EMPLOYEE') {
      return 'Selecione o colaborador que recebera o feedback'
    }

    return 'Selecione o colaborador da mesma empresa'
  }, [type])

  async function handleSubmit() {
    if (!title.trim() || !description.trim()) {
      toast.error('Preencha titulo e descricao antes de enviar o feedback.')
      return
    }

    if (requiresTarget && !targetEmployeeId) {
      toast.error('Selecione o destinatario do feedback.')
      return
    }

    setSaving(true)

    try {
      const payload: Record<string, unknown> = {
        type,
        title: title.trim(),
        description: description.trim(),
      }

      if (type === 'COMPANY_TO_EMPLOYEE') {
        payload.companyFeedbackKind = companyFeedbackKind
        payload.targetEmployeeId = targetEmployeeId
        payload.requiresReadConfirmation = readConfirmation
      } else {
        payload.category = category
      }

      if (type === 'EMPLOYEE_TO_COMPANY') {
        payload.isAnonymous = anonymous
      }

      if (type === 'ONE_TO_ONE') {
        payload.targetEmployeeId = targetEmployeeId
        payload.isVisibleToHR = isReport ? true : visibleToHr
      }

      const { data } = await api.post('/feedbacks', payload)
      toast.success('Feedback criado com sucesso.')
      router.push(`/dashboard/feedbacks/${data.id}`)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Nao foi possivel criar o feedback.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="app-page">
      <MenuFunctionHeader
        title="Recursos Humanos > Feedbacks > Novo"
        description="Crie feedback corporativo, feedback para empresa ou 1 para 1 com regras explicitas de privacidade e visibilidade do RH."
        actions={
          <Button asChild variant="outline">
            <Link href="/dashboard/feedbacks">Voltar para a caixa</Link>
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="app-section-card">
          <CardHeader>
            <CardTitle className="text-xl">Compositor de feedback</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="app-form-grid">
              <div className="field-stack">
                <Label htmlFor="feedback-type">Tipo</Label>
                <Select
                  value={type}
                  onValueChange={(value) => setType(value as FeedbackType)}
                >
                  <SelectTrigger id="feedback-type">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {type === 'COMPANY_TO_EMPLOYEE' ? (
                <div className="field-stack">
                  <Label htmlFor="feedback-company-kind">Categoria corporativa</Label>
                  <Select
                    value={companyFeedbackKind}
                    onValueChange={(value) =>
                      setCompanyFeedbackKind(value as CompanyFeedbackKind)
                    }
                  >
                    <SelectTrigger id="feedback-company-kind">
                      <SelectValue placeholder="Selecione a categoria corporativa" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPANY_KIND_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="field-stack">
                  <Label htmlFor="feedback-category">Categoria</Label>
                  <Select
                    value={category}
                    onValueChange={(value) => setCategory(value as FeedbackCategory)}
                  >
                    <SelectTrigger id="feedback-category">
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="field-stack">
              <Label htmlFor="feedback-title">Titulo</Label>
              <Input
                id="feedback-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Resumo objetivo da situacao"
              />
            </div>

            {requiresTarget ? (
              <div className="field-stack">
                <Label htmlFor="feedback-target">Destinatario</Label>
                {loadingRecipients ? (
                  <Skeleton className="h-10 w-full rounded-xl" />
                ) : (
                  <Select value={targetEmployeeId} onValueChange={setTargetEmployeeId}>
                    <SelectTrigger id="feedback-target">
                      <SelectValue placeholder={targetPlaceholder} />
                    </SelectTrigger>
                    <SelectContent>
                      {recipients.map((recipient) => (
                        <SelectItem key={recipient.id} value={recipient.id}>
                          {recipient.name}
                          {recipient.departmentName ? ` · ${recipient.departmentName}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            ) : null}

            <div className="field-stack">
              <Label htmlFor="feedback-description">Descricao</Label>
              <Textarea
                id="feedback-description"
                rows={8}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Descreva contexto, impacto, fatos e proxima expectativa."
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-start justify-between rounded-[20px] border border-border/70 bg-muted/35 p-4">
                <div className="space-y-1">
                  <p className="font-medium">Enviar anonimamente</p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Disponivel apenas para feedback do colaborador para a empresa.
                  </p>
                </div>
                <Switch
                  checked={anonymous}
                  onCheckedChange={setAnonymous}
                  disabled={type !== 'EMPLOYEE_TO_COMPANY'}
                />
              </div>

              <div className="flex items-start justify-between rounded-[20px] border border-border/70 bg-muted/35 p-4">
                <div className="space-y-1">
                  <p className="font-medium">Solicitar leitura obrigatoria</p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Usado em feedback da empresa para colaborador quando a leitura precisa ser confirmada.
                  </p>
                </div>
                <Switch
                  checked={readConfirmation}
                  onCheckedChange={setReadConfirmation}
                  disabled={type !== 'COMPANY_TO_EMPLOYEE'}
                />
              </div>
            </div>

            {type === 'ONE_TO_ONE' ? (
              <div className="flex items-start justify-between rounded-[20px] border border-border/70 bg-muted/35 p-4">
                <div className="space-y-1">
                  <p className="font-medium">Tambem visivel para RH</p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Fora das denuncias, use esta opcao apenas quando o contexto pedir acompanhamento institucional.
                  </p>
                </div>
                <Switch
                  checked={isReport ? true : visibleToHr}
                  onCheckedChange={setVisibleToHr}
                  disabled={isReport}
                />
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <Button onClick={handleSubmit} disabled={saving}>
                {saving ? 'Enviando...' : 'Criar feedback'}
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  toast.info('O fluxo de anexos continua mapeado para a proxima etapa de integracao do modulo.')
                }
              >
                Anexar evidencias
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="app-section-card h-fit">
          <CardHeader>
            <CardTitle className="text-lg">Regras desta selecao</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-6 text-muted-foreground">
            <p>{privacyCopy}</p>
            <p>
              A configuracao de roteamento do feedback para empresa permanece concentrada em
              <strong> Recursos Humanos &gt; Configuracoes</strong>.
            </p>
            {type === 'ONE_TO_ONE' ? (
              <p>
                O label de visibilidade tambem aparece na listagem e no detalhe da thread para deixar claro se o RH
                acompanha ou nao o caso.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
