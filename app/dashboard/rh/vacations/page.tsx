'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Calendar,
  CalendarCheck2,
  CalendarClock,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Loader2,
  Pencil,
  Plus,
  RotateCw,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { useAuth } from '@/context/auth-context'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'

type VacationStatus =
  | 'REQUESTED'
  | 'MANAGER_APPROVED'
  | 'MANAGER_REJECTED'
  | 'HR_CONFIRMED'
  | 'HR_REJECTED'
  | 'HR_CANCELLED'

type VacationRecord = {
  id: string
  employeeId: string
  startDate: string
  endDate: string
  note?: string | null
  status: VacationStatus
  rejectionReason?: string | null
  cancellationReason?: string | null
  employee: { user: { name: string } }
}

type RequestableEmployee = {
  id: string
  user: { name: string }
}

type EmployeeProfile = {
  id: string
  user: { name: string }
}

const STATUS_LABELS: Record<VacationStatus, string> = {
  REQUESTED: 'Aguardando gestor',
  MANAGER_APPROVED: 'Aguardando RH',
  MANAGER_REJECTED: 'Rejeitada pelo gestor',
  HR_CONFIRMED: 'Confirmada',
  HR_REJECTED: 'Rejeitada pelo RH',
  HR_CANCELLED: 'Cancelada pelo RH',
}

const STATUS_CLASSNAMES: Record<VacationStatus, string> = {
  REQUESTED:
    'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60',
  MANAGER_APPROVED:
    'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900/60',
  MANAGER_REJECTED:
    'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60',
  HR_CONFIRMED:
    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60',
  HR_REJECTED:
    'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60',
  HR_CANCELLED:
    'bg-muted text-muted-foreground border-border',
}

export default function VacationsPage() {
  const { hasPermission } = useAuth()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [actionSubmitting, setActionSubmitting] = useState(false)

  const [profile, setProfile] = useState<EmployeeProfile | null>(null)
  const [requestableEmployees, setRequestableEmployees] = useState<RequestableEmployee[]>([])
  const [myVacations, setMyVacations] = useState<VacationRecord[]>([])
  const [teamVacations, setTeamVacations] = useState<VacationRecord[]>([])
  const [hrVacations, setHrVacations] = useState<VacationRecord[]>([])

  const [requestOpen, setRequestOpen] = useState(false)
  const [editingVacation, setEditingVacation] = useState<VacationRecord | null>(null)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [note, setNote] = useState('')

  const [actionOpen, setActionOpen] = useState(false)
  const [actionVacation, setActionVacation] = useState<VacationRecord | null>(null)
  const [actionStatus, setActionStatus] = useState<VacationStatus | null>(null)
  const [actionReason, setActionReason] = useState('')

  const canRequestForOthers = hasPermission('vacation.request.for_others')
  const canApproveManager = hasPermission('vacation.approve.manager') || canRequestForOthers
  const canApproveHr = hasPermission('vacation.approve.hr')
  const canCancelHr = hasPermission('vacation.cancel.hr')

  const requestableOptions = useMemo(() => {
    if (!profile) return []
    if (!canRequestForOthers && !canApproveHr && !canCancelHr) return []
    return requestableEmployees
  }, [profile, canRequestForOthers, canApproveHr, canCancelHr, requestableEmployees])

  useEffect(() => {
    void refreshAll()
  }, [])

  async function refreshAll() {
    setLoading(true)
    try {
      const { data: currentProfile } = await api.get('/employees/me')
      setProfile(currentProfile)

      const requests: Promise<unknown>[] = [
        api.get('/vacations/me').then((res) => setMyVacations(res.data)),
      ]

      if (canApproveManager) {
        requests.push(api.get('/vacations/team').then((res) => setTeamVacations(res.data)))
      }

      if (canApproveHr) {
        requests.push(api.get('/vacations').then((res) => setHrVacations(res.data)))
      }

      if (canRequestForOthers || canApproveHr || canCancelHr) {
        requests.push(
          api.get('/employees').then((res) =>
            setRequestableEmployees(
              res.data.map((item: { id: string; user?: { name?: string } }) => ({
                id: item.id,
                user: { name: item.user?.name || 'Sem nome' },
              })),
            ),
          ),
        )
      }

      await Promise.all(requests)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Erro ao carregar dados de férias.'))
    } finally {
      setLoading(false)
    }
  }

  function resetRequestForm() {
    setEditingVacation(null)
    setSelectedEmployeeId(profile?.id || '')
    setStartDate('')
    setEndDate('')
    setNote('')
  }

  function openNewRequest() {
    resetRequestForm()
    setRequestOpen(true)
  }

  function openEditRequest(vacation: VacationRecord) {
    setEditingVacation(vacation)
    setSelectedEmployeeId(vacation.employeeId)
    setStartDate(vacation.startDate.split('T')[0])
    setEndDate(vacation.endDate.split('T')[0])
    setNote(vacation.note || '')
    setRequestOpen(true)
  }

  async function handleSubmitRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!profile) return

    setSubmitting(true)
    try {
      const payload = {
        employeeId:
          canRequestForOthers || canApproveHr || canCancelHr
            ? selectedEmployeeId || profile.id
            : undefined,
        startDate,
        endDate,
        note: note.trim() || undefined,
      }

      if (editingVacation) {
        await api.patch(`/vacations/${editingVacation.id}`, payload)
        toast.success('Solicitação de férias atualizada.')
      } else {
        await api.post('/vacations', payload)
        toast.success('Solicitação de férias registrada.')
      }

      setRequestOpen(false)
      resetRequestForm()
      await refreshAll()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível salvar a solicitação de férias.'))
    } finally {
      setSubmitting(false)
    }
  }

  function openAction(vacation: VacationRecord, nextStatus: VacationStatus) {
    setActionVacation(vacation)
    setActionStatus(nextStatus)
    setActionReason('')
    setActionOpen(true)
  }

  function actionNeedsReason() {
    return (
      actionStatus === 'MANAGER_REJECTED' ||
      actionStatus === 'HR_REJECTED' ||
      actionStatus === 'HR_CANCELLED'
    )
  }

  async function handleActionSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!actionVacation || !actionStatus) return

    setActionSubmitting(true)
    try {
      await api.patch(`/vacations/${actionVacation.id}/status`, {
        status: actionStatus,
        reason: actionReason.trim() || undefined,
      })

      toast.success('Status da solicitação atualizado.')
      setActionOpen(false)
      setActionVacation(null)
      setActionStatus(null)
      setActionReason('')
      await refreshAll()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível atualizar o status da solicitação.'))
    } finally {
      setActionSubmitting(false)
    }
  }

  function formatDate(value: string) {
    return new Date(value).toLocaleDateString('pt-BR')
  }

  function durationLabel(vacation: VacationRecord) {
    const start = new Date(vacation.startDate)
    const end = new Date(vacation.endDate)
    const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    return `${diff} dia(s)`
  }

  // KPIs
  const stats = useMemo(() => {
    const myCount = myVacations.length
    const pendingManagerCount = teamVacations.filter((v) => v.status === 'REQUESTED').length
    const pendingHrCount = hrVacations.filter((v) => v.status === 'MANAGER_APPROVED').length
    const confirmedCount = hrVacations.filter((v) => v.status === 'HR_CONFIRMED').length

    return {
      myCount,
      pendingManagerCount,
      pendingHrCount,
      confirmedCount,
    }
  }, [myVacations, teamVacations, hrVacations])

  return (
    <div className="app-page space-y-6">
      {/* 1. Cabeçalho Padronizado */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Férias
          </h1>
          <p className="text-sm text-muted-foreground">
            Solicite, aprove, acompanhe e confirme períodos de férias com fluxo integrado de aprovação.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={openNewRequest}
            size="sm"
            className="h-9 gap-1.5 font-semibold"
          >
            <Plus className="size-4" />
            <span>Solicitar férias</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            onClick={() => void refreshAll()}
            disabled={loading}
          >
            <RotateCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </Button>
        </div>
      </section>

      {/* 2. Cards de Resumo (KPIs em 4 colunas) */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Minhas */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Minhas Solicitações
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {stats.myCount}
            </span>
            <Calendar className="size-5 text-muted-foreground/60" />
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
                {stats.pendingManagerCount}
              </span>
              {stats.pendingManagerCount > 0 && (
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
                {stats.pendingHrCount}
              </span>
              {stats.pendingHrCount > 0 && (
                <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                  Ação necessária
                </span>
              )}
            </div>
            <CalendarClock className="size-5 text-sky-500/60" />
          </CardContent>
        </Card>

        {/* Confirmadas */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Confirmadas
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {stats.confirmedCount}
            </span>
            <CheckCircle2 className="size-5 text-emerald-500/60" />
          </CardContent>
        </Card>
      </section>

      {/* 3. Abas Operacionais */}
      <Tabs defaultValue="my-requests" className="space-y-4">
        <TabsList className="bg-muted/40 p-1">
          <TabsTrigger value="my-requests" className="text-xs font-medium">
            Minhas solicitações ({myVacations.length})
          </TabsTrigger>
          <TabsTrigger
            value="team"
            disabled={!canApproveManager}
            className="text-xs font-medium"
          >
            Gestão de equipe ({teamVacations.length})
          </TabsTrigger>
          <TabsTrigger
            value="hr"
            disabled={!canApproveHr}
            className="text-xs font-medium"
          >
            Administração RH ({hrVacations.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Minhas solicitações */}
        <TabsContent value="my-requests">
          <Card className="app-section-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/80 hover:bg-transparent">
                  <TableHead className="min-w-[200px] font-semibold text-foreground text-xs uppercase tracking-wider pl-6">
                    Período
                  </TableHead>
                  <TableHead className="w-[100px] font-semibold text-foreground text-xs uppercase tracking-wider">
                    Duração
                  </TableHead>
                  <TableHead className="min-w-[180px] font-semibold text-foreground text-xs uppercase tracking-wider">
                    Status
                  </TableHead>
                  <TableHead className="min-w-[240px] font-semibold text-foreground text-xs uppercase tracking-wider">
                    Observação & Motivo
                  </TableHead>
                  <TableHead className="w-[100px] font-semibold text-foreground text-xs uppercase tracking-wider text-right pr-6">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myVacations.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      Nenhuma solicitação de férias encontrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  myVacations.map((vacation) => (
                    <TableRow
                      key={vacation.id}
                      className="border-b border-border/60 hover:bg-muted/40 transition-colors"
                    >
                      <TableCell className="pl-6 font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="size-4 text-muted-foreground" />
                          <span className="text-sm font-semibold">
                            {formatDate(vacation.startDate)} a {formatDate(vacation.endDate)}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="text-sm text-muted-foreground">
                        {durationLabel(vacation)}
                      </TableCell>

                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${
                            STATUS_CLASSNAMES[vacation.status]
                          }`}
                        >
                          {STATUS_LABELS[vacation.status]}
                        </span>
                      </TableCell>

                      <TableCell>
                        <div className="space-y-1 text-xs">
                          <p className="text-muted-foreground">{vacation.note || '-'}</p>
                          {vacation.rejectionReason && (
                            <p className="text-rose-600 dark:text-rose-400 font-medium">
                              Motivo: {vacation.rejectionReason}
                            </p>
                          )}
                          {vacation.cancellationReason && (
                            <p className="text-muted-foreground italic">
                              Cancelada: {vacation.cancellationReason}
                            </p>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-right pr-6">
                        {vacation.status === 'REQUESTED' ? (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="size-8 text-muted-foreground hover:text-foreground"
                            onClick={() => openEditRequest(vacation)}
                            title="Editar solicitação"
                          >
                            <Pencil className="size-4" />
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">
                            Sem ação
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Tab 2: Gestão de equipe */}
        <TabsContent value="team">
          <Card className="app-section-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/80 hover:bg-transparent">
                  <TableHead className="min-w-[220px] font-semibold text-foreground text-xs uppercase tracking-wider pl-6">
                    Colaborador
                  </TableHead>
                  <TableHead className="min-w-[200px] font-semibold text-foreground text-xs uppercase tracking-wider">
                    Período Solicitado
                  </TableHead>
                  <TableHead className="w-[160px] font-semibold text-foreground text-xs uppercase tracking-wider">
                    Status
                  </TableHead>
                  <TableHead className="min-w-[200px] font-semibold text-foreground text-xs uppercase tracking-wider">
                    Observação
                  </TableHead>
                  <TableHead className="w-[180px] font-semibold text-foreground text-xs uppercase tracking-wider text-right pr-6">
                    Ações de Gestor
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamVacations.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      Nenhuma solicitação da sua equipe encontrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  teamVacations.map((vacation) => (
                    <TableRow
                      key={vacation.id}
                      className="border-b border-border/60 hover:bg-muted/40 transition-colors"
                    >
                      <TableCell className="pl-6 font-semibold text-sm text-foreground">
                        {vacation.employee.user.name}
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground block">
                          {formatDate(vacation.startDate)} a {formatDate(vacation.endDate)}
                        </span>
                        <span>{durationLabel(vacation)}</span>
                      </TableCell>

                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${
                            STATUS_CLASSNAMES[vacation.status]
                          }`}
                        >
                          {STATUS_LABELS[vacation.status]}
                        </span>
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground">
                        {vacation.note || '-'}
                      </TableCell>

                      <TableCell className="text-right pr-6">
                        {vacation.status === 'REQUESTED' ? (
                          <div className="flex justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-2.5 text-xs text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                              onClick={() => openAction(vacation, 'MANAGER_APPROVED')}
                            >
                              <Check className="mr-1 size-3.5" />
                              Aprovar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-2.5 text-xs text-rose-600 border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                              onClick={() => openAction(vacation, 'MANAGER_REJECTED')}
                            >
                              <X className="mr-1 size-3.5" />
                              Rejeitar
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">
                            Resolvido
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Tab 3: Administração RH */}
        <TabsContent value="hr">
          <Card className="app-section-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/80 hover:bg-transparent">
                  <TableHead className="min-w-[220px] font-semibold text-foreground text-xs uppercase tracking-wider pl-6">
                    Colaborador
                  </TableHead>
                  <TableHead className="min-w-[200px] font-semibold text-foreground text-xs uppercase tracking-wider">
                    Período Solicitado
                  </TableHead>
                  <TableHead className="w-[160px] font-semibold text-foreground text-xs uppercase tracking-wider">
                    Status
                  </TableHead>
                  <TableHead className="min-w-[200px] font-semibold text-foreground text-xs uppercase tracking-wider">
                    Observação & Motivos
                  </TableHead>
                  <TableHead className="w-[200px] font-semibold text-foreground text-xs uppercase tracking-wider text-right pr-6">
                    Ações RH
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hrVacations.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      Nenhuma solicitação de férias para o RH.
                    </TableCell>
                  </TableRow>
                ) : (
                  hrVacations.map((vacation) => (
                    <TableRow
                      key={vacation.id}
                      className="border-b border-border/60 hover:bg-muted/40 transition-colors"
                    >
                      <TableCell className="pl-6 font-semibold text-sm text-foreground">
                        {vacation.employee.user.name}
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground block">
                          {formatDate(vacation.startDate)} a {formatDate(vacation.endDate)}
                        </span>
                        <span>{durationLabel(vacation)}</span>
                      </TableCell>

                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${
                            STATUS_CLASSNAMES[vacation.status]
                          }`}
                        >
                          {STATUS_LABELS[vacation.status]}
                        </span>
                      </TableCell>

                      <TableCell>
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <p>{vacation.note || '-'}</p>
                          {vacation.rejectionReason && (
                            <p className="text-rose-600 dark:text-rose-400 font-medium">
                              Motivo: {vacation.rejectionReason}
                            </p>
                          )}
                          {vacation.cancellationReason && (
                            <p className="italic">Cancelada: {vacation.cancellationReason}</p>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-right pr-6">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {vacation.status === 'MANAGER_APPROVED' ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2.5 text-xs text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                                onClick={() => openAction(vacation, 'HR_CONFIRMED')}
                              >
                                <Check className="mr-1 size-3.5" />
                                Confirmar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2.5 text-xs text-rose-600 border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                onClick={() => openAction(vacation, 'HR_REJECTED')}
                              >
                                <X className="mr-1 size-3.5" />
                                Rejeitar
                              </Button>
                            </>
                          ) : null}

                          {canCancelHr && vacation.status !== 'HR_CANCELLED' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-2.5 text-xs text-muted-foreground hover:text-destructive hover:border-destructive/40"
                              onClick={() => openAction(vacation, 'HR_CANCELLED')}
                            >
                              Cancelar
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 4. Modal de Nova / Editar Solicitação */}
      <Dialog
        open={requestOpen}
        onOpenChange={(open) => {
          setRequestOpen(open)
          if (!open) resetRequestForm()
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editingVacation ? 'Editar solicitação de férias' : 'Nova solicitação de férias'}
            </DialogTitle>
            <DialogDescription>
              Informe o período desejado e observações para análise do gestor e RH.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitRequest} className="space-y-4 py-2">
            <div className="space-y-4 rounded-lg border border-border bg-card p-4">
              {requestableOptions.length > 0 && (
                <div className="space-y-1.5">
                  <Label htmlFor="vacation-employee">Solicitação para</Label>
                  <Select
                    value={selectedEmployeeId}
                    onValueChange={setSelectedEmployeeId}
                  >
                    <SelectTrigger id="vacation-employee">
                      <SelectValue placeholder="Selecione o colaborador" />
                    </SelectTrigger>
                    <SelectContent>
                      {requestableOptions.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employee.user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="vacation-start-date">Início *</Label>
                  <Input
                    id="vacation-start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="vacation-end-date">Fim *</Label>
                  <Input
                    id="vacation-end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="vacation-note">Observação adicional</Label>
                <Textarea
                  id="vacation-note"
                  placeholder="Inclua contexto ou detalhes adicionais..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRequestOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : null}
                {editingVacation ? 'Salvar alterações' : 'Registrar solicitação'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 5. Modal de Ação / Aprovação / Rejeição */}
      <Dialog open={actionOpen} onOpenChange={setActionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atualizar status da solicitação</DialogTitle>
            <DialogDescription>
              {actionNeedsReason()
                ? 'Esta ação exige justificativa obrigatória registrada no histórico.'
                : 'Confirme a mudança de status da solicitação selecionada.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleActionSubmit} className="space-y-4 py-2">
            <div className="space-y-3 rounded-lg border border-border bg-card p-4">
              <div className="space-y-0.5 text-xs">
                <p className="font-semibold text-sm text-foreground">
                  {actionVacation?.employee.user.name}
                </p>
                <p className="text-muted-foreground">
                  {actionVacation
                    ? `${formatDate(actionVacation.startDate)} a ${formatDate(
                        actionVacation.endDate,
                      )}`
                    : ''}
                </p>
              </div>

              <div className="space-y-1.5 pt-2">
                <Label htmlFor="vacation-action-reason">
                  {actionStatus === 'HR_CANCELLED'
                    ? 'Justificativa do cancelamento *'
                    : 'Motivo da reprovação *'}
                </Label>
                <Textarea
                  id="vacation-action-reason"
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="Explique detalhadamente o motivo desta decisão..."
                  required={actionNeedsReason()}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setActionOpen(false)}
              >
                Fechar
              </Button>
              <Button type="submit" disabled={actionSubmitting}>
                {actionSubmitting ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : null}
                Confirmar decisão
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
