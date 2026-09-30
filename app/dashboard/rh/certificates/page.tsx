'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  HeartPulse,
  Loader2,
  Paperclip,
  Plus,
  RotateCw,
  Upload,
  UserCheck,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'

interface EmployeeProfile {
  id: string
  userId: string
  user: { name: string }
}

interface MedicalCertificate {
  id: string
  startDate: string
  endDate: string
  description: string
  fileUrls: string[]
  status: string
  rejectionReason: string | null
  employee: { user: { name: string } }
  manager?: { user: { name: string } } | null
  hr?: { user: { name: string } } | null
  createdAt: string
}

function getInitials(name?: string | null) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function getCertificateStatusBadgeStyle(status: string) {
  switch (status) {
    case 'SUBMITTED':
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60'
    case 'MANAGER_APPROVED':
      return 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900/60'
    case 'HR_APPROVED':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60'
    case 'MANAGER_REJECTED':
    case 'HR_REJECTED':
      return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60'
    default:
      return 'bg-muted text-muted-foreground border-border'
  }
}

function getCertificateStatusLabel(status: string) {
  switch (status) {
    case 'SUBMITTED':
      return 'Aguardando Gestor'
    case 'MANAGER_APPROVED':
      return 'Aprovado (Gestor)'
    case 'HR_APPROVED':
      return 'Homologado (RH)'
    case 'MANAGER_REJECTED':
      return 'Reprovado (Gestor)'
    case 'HR_REJECTED':
      return 'Reprovado (RH)'
    default:
      return status
  }
}

export default function CertificatesPage() {
  const [loading, setLoading] = useState(true)
  const [myProfile, setMyProfile] = useState<EmployeeProfile | null>(null)
  const [myCertificates, setMyCertificates] = useState<MedicalCertificate[]>([])
  const [allCertificates, setAllCertificates] = useState<MedicalCertificate[]>([])

  // Submit form
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [description, setDescription] = useState('')
  const [files, setFiles] = useState<FileList | null>(null)

  // Rejection dialog
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [rejectStatus, setRejectStatus] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [rejectLoading, setRejectLoading] = useState(false)

  const formatDate = (d: string) => new Date(d).toLocaleDateString('pt-BR')

  const fetchInitialData = async () => {
    setLoading(true)
    try {
      const [userRes, employeesRes, certsRes] = await Promise.all([
        api.get('/auth/profile'),
        api.get('/employees'),
        api.get('/medical-certificates').catch(() => ({ data: [] })),
      ])

      const user = userRes.data
      const employees = employeesRes.data
      const me = employees.find(
        (e: EmployeeProfile) => e.userId === user.userId || e.user.name === user.name,
      )

      if (me) {
        setMyProfile(me)
        try {
          const myCerts = await api.get(`/medical-certificates?employeeId=${me.id}`)
          setMyCertificates(myCerts.data)
        } catch {
          setMyCertificates([])
        }
      }

      setAllCertificates(certsRes.data || [])
    } catch (e) {
      console.error(e)
      toast.error(getApiErrorMessage(e, 'Erro ao carregar atestados.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchInitialData()
  }, [])

  const pendingManager = useMemo(
    () => allCertificates.filter((c) => c.status === 'SUBMITTED'),
    [allCertificates],
  )

  const pendingHR = useMemo(
    () =>
      allCertificates.filter(
        (c) => c.status === 'MANAGER_APPROVED' || c.status === 'SUBMITTED',
      ),
    [allCertificates],
  )

  const approvedCount = useMemo(
    () => allCertificates.filter((c) => c.status === 'HR_APPROVED').length,
    [allCertificates],
  )

  const uploadFiles = async (): Promise<string[]> => {
    if (!files?.length) return []
    const urls: string[] = []
    for (let i = 0; i < files.length; i++) {
      const fd = new FormData()
      fd.append('file', files[i])
      try {
        const { data } = await api.post('/uploads/atestados', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        urls.push(data.url)
      } catch {
        toast.error(`Erro ao enviar arquivo ${files[i].name}`)
      }
    }
    return urls
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!myProfile) return toast.error('Perfil não identificado.')
    setFormLoading(true)
    try {
      const fileUrls = await uploadFiles()
      await api.post('/medical-certificates', {
        employeeId: myProfile.id,
        startDate,
        endDate,
        description,
        fileUrls,
      })
      toast.success('Atestado enviado com sucesso.')
      setIsFormOpen(false)
      setStartDate('')
      setEndDate('')
      setDescription('')
      setFiles(null)
      void fetchInitialData()
    } catch (e: any) {
      toast.error(getApiErrorMessage(e, 'Erro ao enviar atestado.'))
    } finally {
      setFormLoading(false)
    }
  }

  const handleApprove = async (id: string, newStatus: string) => {
    try {
      await api.patch(`/medical-certificates/${id}/status`, { status: newStatus })
      toast.success('Status do atestado atualizado com sucesso.')
      void fetchInitialData()
    } catch (e: any) {
      toast.error(getApiErrorMessage(e, 'Erro ao aprovar atestado.'))
    }
  }

  const handleRejectConfirm = async () => {
    if (!rejectReason.trim()) return toast.error('Informe o motivo da reprovação.')
    setRejectLoading(true)
    try {
      await api.patch(`/medical-certificates/${rejectId}/status`, {
        status: rejectStatus,
        rejectionReason: rejectReason,
      })
      toast.success('Atestado reprovado com sucesso.')
      setRejectId(null)
      setRejectReason('')
      void fetchInitialData()
    } catch (e: any) {
      toast.error(getApiErrorMessage(e, 'Erro ao reprovar atestado.'))
    } finally {
      setRejectLoading(false)
    }
  }

  const renderTable = (
    items: MedicalCertificate[],
    showActions: boolean,
    approveStatus?: string,
    rejectStatusVal?: string,
  ) => (
    <Table>
      <TableHeader>
        <TableRow className="border-b border-border/80 hover:bg-transparent">
          <TableHead className="min-w-[220px] font-semibold text-foreground text-xs uppercase tracking-wider pl-6">
            Colaborador
          </TableHead>
          <TableHead className="min-w-[180px] font-semibold text-foreground text-xs uppercase tracking-wider">
            Período do Afastamento
          </TableHead>
          <TableHead className="min-w-[240px] font-semibold text-foreground text-xs uppercase tracking-wider">
            Justificativa & Parecer
          </TableHead>
          <TableHead className="w-[120px] font-semibold text-foreground text-xs uppercase tracking-wider">
            Anexos
          </TableHead>
          <TableHead className="w-[160px] font-semibold text-foreground text-xs uppercase tracking-wider">
            Status
          </TableHead>
          {showActions && (
            <TableHead className="w-[180px] font-semibold text-foreground text-xs uppercase tracking-wider text-right pr-6">
              Ações
            </TableHead>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={showActions ? 6 : 5}
              className="py-10 text-center text-sm text-muted-foreground"
            >
              Nenhum atestado médico registrado nesta visualização.
            </TableCell>
          </TableRow>
        ) : (
          items.map((c) => (
            <TableRow
              key={c.id}
              className="border-b border-border/60 hover:bg-muted/40 transition-colors"
            >
              <TableCell className="pl-6">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-7 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground shrink-0">
                    {getInitials(c.employee.user.name)}
                  </span>
                  <span className="font-semibold text-sm text-foreground">
                    {c.employee.user.name}
                  </span>
                </div>
              </TableCell>

              <TableCell className="text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <CalendarDays className="size-3.5 text-muted-foreground/60 shrink-0" />
                  <span className="font-medium text-foreground">
                    {formatDate(c.startDate)} a {formatDate(c.endDate)}
                  </span>
                </div>
              </TableCell>

              <TableCell>
                <div className="space-y-1 text-xs">
                  <p className="text-foreground line-clamp-2">{c.description}</p>
                  {c.rejectionReason && (
                    <p className="text-rose-600 dark:text-rose-400 font-medium">
                      Motivo: {c.rejectionReason}
                    </p>
                  )}
                </div>
              </TableCell>

              <TableCell>
                <div className="flex flex-wrap items-center gap-1.5">
                  {c.fileUrls.length > 0 ? (
                    c.fileUrls.map((url, i) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-1 text-xs text-primary hover:bg-muted transition-colors"
                        title="Ver anexo"
                      >
                        <FileText className="size-3" />
                        <span>Doc #{i + 1}</span>
                      </a>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground italic">Sem anexo</span>
                  )}
                </div>
              </TableCell>

              <TableCell>
                <span
                  className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${getCertificateStatusBadgeStyle(
                    c.status,
                  )}`}
                >
                  {getCertificateStatusLabel(c.status)}
                </span>
              </TableCell>

              {showActions && (
                <TableCell className="text-right pr-6">
                  <div className="flex justify-end gap-1.5">
                    {approveStatus && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2.5 text-xs text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                        onClick={() => void handleApprove(c.id, approveStatus)}
                      >
                        <Check className="size-3.5 mr-1" />
                        Aprovar
                      </Button>
                    )}
                    {rejectStatusVal && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2.5 text-xs text-rose-600 border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        onClick={() => {
                          setRejectId(c.id)
                          setRejectStatus(rejectStatusVal)
                        }}
                      >
                        <X className="size-3.5 mr-1" />
                        Reprovar
                      </Button>
                    )}
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )

  return (
    <div className="app-page space-y-6">
      {/* 1. Cabeçalho Padronizado */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Atestados Médicos
          </h1>
          <p className="text-sm text-muted-foreground">
            Envie atestados, acompanhe aprovações médicas e trate pareceres de gestores e RH de forma integrada.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => setIsFormOpen(true)}
            size="sm"
            className="h-9 gap-1.5 font-semibold"
          >
            <Plus className="size-4" />
            <span>Enviar atestado</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            onClick={() => void fetchInitialData()}
            disabled={loading}
          >
            <RotateCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </Button>
        </div>
      </section>

      {/* 2. Cards de Resumo (KPIs em 4 colunas) */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Meus Atestados */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Meus Atestados
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {myCertificates.length}
            </span>
            <HeartPulse className="size-5 text-muted-foreground/60" />
          </CardContent>
        </Card>

        {/* Pendentes Gestão */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Aguardando Gestor
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2 flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-foreground">
                {pendingManager.length}
              </span>
              {pendingManager.length > 0 && (
                <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                  Ação necessária
                </span>
              )}
            </div>
            <Clock className="size-5 text-amber-500/60" />
          </CardContent>
        </Card>

        {/* Pendentes RH */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Aguardando RH
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2 flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-foreground">
                {pendingHR.length}
              </span>
              {pendingHR.length > 0 && (
                <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                  Ação necessária
                </span>
              )}
            </div>
            <UserCheck className="size-5 text-sky-500/60" />
          </CardContent>
        </Card>

        {/* Homologados */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Homologados
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {approvedCount}
            </span>
            <CheckCircle2 className="size-5 text-emerald-500/60" />
          </CardContent>
        </Card>
      </section>

      {/* 3. Abas Operacionais */}
      <Tabs defaultValue="my-certs" className="space-y-4">
        <TabsList className="bg-muted/40 p-1">
          <TabsTrigger value="my-certs" className="text-xs font-medium">
            Meus Atestados ({myCertificates.length})
          </TabsTrigger>
          <TabsTrigger value="manager" className="text-xs font-medium">
            Gestão de Equipe ({pendingManager.length})
          </TabsTrigger>
          <TabsTrigger value="hr" className="text-xs font-medium">
            Administração RH ({pendingHR.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-certs">
          <Card className="app-section-card overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              renderTable(myCertificates, false)
            )}
          </Card>
        </TabsContent>

        <TabsContent value="manager">
          <Card className="app-section-card overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              renderTable(
                pendingManager,
                true,
                'MANAGER_APPROVED',
                'MANAGER_REJECTED',
              )
            )}
          </Card>
        </TabsContent>

        <TabsContent value="hr">
          <Card className="app-section-card overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              renderTable(pendingHR, true, 'HR_APPROVED', 'HR_REJECTED')
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* 4. Modal de Envio de Atestado */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Enviar Atestado Médico</DialogTitle>
            <DialogDescription>
              Anexe o comprovante médico, informe o período do afastamento e a justificativa.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="space-y-4 rounded-lg border border-border bg-card p-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="cert-start-date">Data Início *</Label>
                  <Input
                    id="cert-start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cert-end-date">Data Fim *</Label>
                  <Input
                    id="cert-end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cert-desc">Justificativa / CID / Motivo *</Label>
                <Textarea
                  id="cert-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva o motivo do afastamento..."
                  required
                  rows={3}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cert-files">Anexar Documento / Foto do Atestado</Label>
                <Input
                  id="cert-files"
                  type="file"
                  accept="image/*,.pdf,.doc,.docx"
                  multiple
                  onChange={(e) => setFiles(e.target.files)}
                />
                {files && files.length > 0 && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 pt-1">
                    <Upload className="size-3.5" />
                    <span>{files.length} arquivo(s) selecionado(s)</span>
                  </p>
                )}
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFormOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={formLoading}>
                {formLoading ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : null}
                Enviar atestado
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 5. Modal de Reprovação */}
      <Dialog
        open={Boolean(rejectId)}
        onOpenChange={() => {
          setRejectId(null)
          setRejectReason('')
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Motivo da Reprovação</DialogTitle>
            <DialogDescription>
              Informe a justificativa formal para a recusa deste atestado médico.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="reject-reason">Justificativa da Reprovação *</Label>
              <Textarea
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Ex.: Documento ilegível, CRM ausente, período divergente..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setRejectId(null)
                setRejectReason('')
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleRejectConfirm()}
              disabled={rejectLoading}
            >
              {rejectLoading ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : null}
              Confirmar Reprovação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
