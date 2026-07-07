'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, FileWarning, Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { WorkspaceLoadingCard } from '@/components/layout/workspace-loading-card'
import { WorkspaceStateCard } from '@/components/layout/workspace-state-card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/context/auth-context'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'

type DriverRecord = {
  id: string
  nome: string
  documento: string
  telefone: string
  email?: string | null
  cnhNumber?: string | null
  cnhCategory?: string | null
  cnhExpiresAt?: string | null
  rntrcCode?: string | null
  rntrcStatus?: string | null
  rntrcExpiresAt?: string | null
  notes?: string | null
}

type DriverFormState = {
  nome: string
  documento: string
  telefone: string
  email: string
  cnhNumber: string
  cnhCategory: string
  cnhExpiresAt: string
  rntrcCode: string
  rntrcStatus: string
  rntrcExpiresAt: string
  notes: string
}

const EMPTY_FORM: DriverFormState = {
  nome: '',
  documento: '',
  telefone: '',
  email: '',
  cnhNumber: '',
  cnhCategory: '',
  cnhExpiresAt: '',
  rntrcCode: '',
  rntrcStatus: '',
  rntrcExpiresAt: '',
  notes: '',
}

type ExternalDriverFormProps = {
  driverId?: string
  mode: 'create' | 'edit'
}

export function ExternalDriverForm({ driverId, mode }: ExternalDriverFormProps) {
  const router = useRouter()
  const { hasPermission } = useAuth()
  const [loading, setLoading] = useState(mode === 'edit')
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<DriverFormState>(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof DriverFormState, string>>>({})
  const [loadError, setLoadError] = useState<string | null>(null)
  const canManageDrivers = hasPermission('external-fleet.drivers.manage')

  async function loadDriver() {
    if (mode !== 'edit' || !driverId || !canManageDrivers) {
      setLoading(false)
      return
    }

    setLoading(true)
    setLoadError(null)

    try {
      const { data } = await api.get<DriverRecord>(`/external-fleet/drivers/${driverId}`)
      setFormData({
        nome: data.nome,
        documento: data.documento,
        telefone: data.telefone,
        email: data.email ?? '',
        cnhNumber: data.cnhNumber ?? '',
        cnhCategory: data.cnhCategory ?? '',
        cnhExpiresAt: formatDateForInput(data.cnhExpiresAt),
        rntrcCode: data.rntrcCode ?? '',
        rntrcStatus: data.rntrcStatus ?? '',
        rntrcExpiresAt: formatDateForInput(data.rntrcExpiresAt),
        notes: data.notes ?? '',
      })
    } catch (error) {
      setLoadError(getApiErrorMessage(error, 'Não foi possível carregar o motorista parceiro.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (mode !== 'edit' || !driverId || !canManageDrivers) {
      setLoading(false)
      return
    }

    void loadDriver()
  }, [canManageDrivers, driverId, mode])

  function setField<Key extends keyof DriverFormState>(key: Key, value: DriverFormState[Key]) {
    setFormData((current) => ({ ...current, [key]: value }))
    setFieldErrors((current) => {
      if (!current[key]) {
        return current
      }

      const next = { ...current }
      delete next[key]
      return next
    })
  }

  function validateField(key: keyof DriverFormState, value: string) {
    switch (key) {
      case 'nome':
        return value.trim() ? '' : 'Informe o nome completo do parceiro.'
      case 'documento':
        return value.length === 11 ? '' : 'CPF deve conter 11 dígitos numéricos.'
      case 'telefone':
        return value.trim() ? '' : 'Informe um telefone para contato operacional.'
      case 'email':
        if (!value.trim()) {
          return ''
        }
        return /\S+@\S+\.\S+/.test(value.trim()) ? '' : 'Informe um e-mail válido.'
      case 'cnhCategory':
        if (!value.trim()) {
          return ''
        }
        return value.trim().length <= 2 ? '' : 'Use até 2 caracteres para a categoria da CNH.'
      default:
        return ''
    }
  }

  function handleBlur(key: keyof DriverFormState) {
    const error = validateField(key, formData[key])

    setFieldErrors((current) => {
      if (!error) {
        if (!current[key]) {
          return current
        }

        const next = { ...current }
        delete next[key]
        return next
      }

      return { ...current, [key]: error }
    })
  }

  function validateForm() {
    const nextErrors: Partial<Record<keyof DriverFormState, string>> = {}

    ;(['nome', 'documento', 'telefone', 'email', 'cnhCategory'] as const).forEach((field) => {
      const error = validateField(field, formData[field])
      if (error) {
        nextErrors[field] = error
      }
    })

    setFieldErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleSave() {
    if (!validateForm()) {
      toast.error('Revise os campos destacados antes de salvar o motorista parceiro.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        nome: formData.nome,
        documento: formData.documento,
        telefone: formData.telefone,
        email: formData.email || undefined,
        cnhNumber: formData.cnhNumber || undefined,
        cnhCategory: formData.cnhCategory || undefined,
        cnhExpiresAt: formData.cnhExpiresAt || undefined,
        rntrcCode: formData.rntrcCode || undefined,
        rntrcStatus: formData.rntrcStatus || undefined,
        rntrcExpiresAt: formData.rntrcExpiresAt || undefined,
        notes: formData.notes || undefined,
      }

      if (mode === 'edit' && driverId) {
        await api.patch(`/external-fleet/drivers/${driverId}`, payload)
        toast.success('Motorista parceiro atualizado com sucesso.')
      } else {
        await api.post('/external-fleet/drivers', payload)
        toast.success('Motorista parceiro criado com sucesso.')
      }

      router.push('/dashboard/external-fleet/drivers')
      router.refresh()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível salvar o motorista parceiro.'))
    } finally {
      setSaving(false)
    }
  }

  if (!canManageDrivers) {
    return (
      <div className="app-page">
        <WorkspaceStateCard
          title="Acesso restrito"
          actions={
            <Button asChild variant="outline">
              <Link href="/dashboard/external-fleet/drivers">Voltar para a listagem</Link>
            </Button>
          }
        >
          <p>Este perfil não pode criar ou editar motoristas parceiros.</p>
        </WorkspaceStateCard>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="app-page">
        <WorkspaceStateCard
          title="Falha de leitura"
          actions={
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button onClick={() => void loadDriver()}>Atualizar leitura</Button>
              <Button asChild variant="outline">
                <Link href="/dashboard/external-fleet/drivers">Voltar para a listagem</Link>
              </Button>
            </div>
          }
        >
          <p>{loadError}</p>
        </WorkspaceStateCard>
      </div>
    )
  }

  return (
    <div className="app-page">
      <section className="app-page-header theme-surface">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <Button asChild variant="outline" size="sm" className="w-fit">
              <Link href="/dashboard/external-fleet/drivers">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar para motoristas
              </Link>
            </Button>
            <div className="space-y-2">
              <p className="app-kicker">Frota Externa</p>
              <h1 className="app-title">
                {mode === 'edit' ? 'Editar motorista parceiro' : 'Novo motorista parceiro'}
              </h1>
              <p className="app-subtitle">
                Centralize cadastro, contato e compliance documental do parceiro em uma tela dedicada, sem depender de modal para revisão.
              </p>
            </div>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button asChild variant="outline">
              <Link href="/dashboard/external-fleet/drivers">Cancelar</Link>
            </Button>
            <Button onClick={() => void handleSave()} disabled={saving || loading}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {saving ? 'Salvando...' : 'Salvar motorista'}
            </Button>
          </div>
        </div>
      </section>

      {loading ? (
        <WorkspaceLoadingCard message="Carregando dados do motorista parceiro..." />
      ) : (
        <>
          <Card className="app-section-card">
            <CardHeader>
              <CardTitle className="text-xl">Dados cadastrais</CardTitle>
              <CardDescription>
                Informações de identificação e contato usadas na governança do parceiro.
              </CardDescription>
            </CardHeader>
            <CardContent className="app-form-grid">
              <div className="field-stack">
                <Label htmlFor="driver-name">Nome completo</Label>
                <Input
                  id="driver-name"
                  value={formData.nome}
                  onChange={(event) => setField('nome', event.target.value)}
                  onBlur={() => handleBlur('nome')}
                  placeholder="João da Silva"
                  aria-invalid={Boolean(fieldErrors.nome)}
                />
                <FieldError message={fieldErrors.nome} />
              </div>
              <div className="field-stack">
                <Label htmlFor="driver-document">CPF</Label>
                <Input
                  id="driver-document"
                  value={formData.documento}
                  onChange={(event) => setField('documento', onlyDigits(event.target.value))}
                  onBlur={() => handleBlur('documento')}
                  placeholder="12345678901"
                  maxLength={11}
                  aria-invalid={Boolean(fieldErrors.documento)}
                />
                <FieldError message={fieldErrors.documento} />
              </div>
              <div className="field-stack">
                <Label htmlFor="driver-phone">Telefone</Label>
                <Input
                  id="driver-phone"
                  value={formData.telefone}
                  onChange={(event) => setField('telefone', event.target.value)}
                  onBlur={() => handleBlur('telefone')}
                  placeholder="11999999999"
                  aria-invalid={Boolean(fieldErrors.telefone)}
                />
                <FieldError message={fieldErrors.telefone} />
              </div>
              <div className="field-stack">
                <Label htmlFor="driver-email">Email</Label>
                <Input
                  id="driver-email"
                  type="email"
                  value={formData.email}
                  onChange={(event) => setField('email', event.target.value)}
                  onBlur={() => handleBlur('email')}
                  placeholder="parceiro@transportes.com"
                  aria-invalid={Boolean(fieldErrors.email)}
                />
                <FieldError message={fieldErrors.email} />
              </div>
            </CardContent>
          </Card>

          <Card className="app-section-card">
            <CardHeader>
              <CardTitle className="text-xl">Compliance operacional</CardTitle>
              <CardDescription>
                Esses dados sustentam os bloqueios configuráveis de CNH e RNTRC na alocação.
              </CardDescription>
            </CardHeader>
            <CardContent className="app-form-grid">
              <div className="field-stack">
                <Label htmlFor="driver-cnh-number">Número da CNH</Label>
                <Input
                  id="driver-cnh-number"
                  value={formData.cnhNumber}
                  onChange={(event) => setField('cnhNumber', event.target.value)}
                  placeholder="1234567890"
                />
              </div>
              <div className="field-stack">
                <Label htmlFor="driver-cnh-category">Categoria da CNH</Label>
                <Input
                  id="driver-cnh-category"
                  value={formData.cnhCategory}
                  onChange={(event) => setField('cnhCategory', event.target.value.toUpperCase())}
                  onBlur={() => handleBlur('cnhCategory')}
                  placeholder="B / C / D / E"
                  maxLength={2}
                  aria-invalid={Boolean(fieldErrors.cnhCategory)}
                />
                <FieldError message={fieldErrors.cnhCategory} />
              </div>
              <div className="field-stack">
                <Label htmlFor="driver-cnh-expiry">Validade da CNH</Label>
                <Input
                  id="driver-cnh-expiry"
                  type="date"
                  value={formData.cnhExpiresAt}
                  onChange={(event) => setField('cnhExpiresAt', event.target.value)}
                />
              </div>
              <div className="field-stack">
                <Label htmlFor="driver-rntrc-code">RNTRC</Label>
                <Input
                  id="driver-rntrc-code"
                  value={formData.rntrcCode}
                  onChange={(event) => setField('rntrcCode', event.target.value)}
                  placeholder="Número do RNTRC"
                />
              </div>
              <div className="field-stack">
                <Label>Situação do RNTRC</Label>
                <Select
                  value={formData.rntrcStatus || 'none'}
                  onValueChange={(value) => setField('rntrcStatus', value === 'none' ? '' : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a situação" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Não informado</SelectItem>
                    <SelectItem value="ATIVO">Ativo</SelectItem>
                    <SelectItem value="PENDENTE">Pendente</SelectItem>
                    <SelectItem value="SUSPENSO">Suspenso</SelectItem>
                    <SelectItem value="VENCIDO">Vencido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="field-stack">
                <Label htmlFor="driver-rntrc-expiry">Validade do RNTRC</Label>
                <Input
                  id="driver-rntrc-expiry"
                  type="date"
                  value={formData.rntrcExpiresAt}
                  onChange={(event) => setField('rntrcExpiresAt', event.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="app-section-card">
            <CardHeader>
              <CardTitle className="text-xl">Observações internas</CardTitle>
              <CardDescription>
                Registre pendências, área atendida e combinados operacionais relevantes para a governança do parceiro.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="field-stack">
                <Label htmlFor="driver-notes">Observações</Label>
                <Textarea
                  id="driver-notes"
                  value={formData.notes}
                  onChange={(event) => setField('notes', event.target.value)}
                  placeholder="Documentos pendentes, área atendida, acordos operacionais..."
                  rows={5}
                />
              </div>
              <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <FileWarning className="mt-0.5 h-4 w-4" />
                  <p>
                    O cadastro do parceiro continua separado da operação logística. A alocação em rota acontece em `Cargas e Rotas`, usando as validações configuráveis de `shipments`.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

function formatDateForInput(value?: string | null) {
  if (!value) {
    return ''
  }

  return new Date(value).toISOString().slice(0, 10)
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, '')
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null
  }

  return <p className="text-xs text-destructive">{message}</p>
}
