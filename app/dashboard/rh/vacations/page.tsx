'use client'

import { useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { MenuFunctionHeader } from "@/components/layout/menu-function-header"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/context/auth-context"
import { api } from "@/lib/api"
import { getApiErrorMessage } from "@/lib/api-error"
import { CalendarDays, Check, Loader2, Pencil, Plus, X } from "lucide-react"
import { toast } from "sonner"

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
  REQUESTED: 'bg-amber-50 text-amber-700 border-amber-200',
  MANAGER_APPROVED: 'bg-sky-50 text-sky-700 border-sky-200',
  MANAGER_REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
  HR_CONFIRMED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  HR_REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
  HR_CANCELLED: 'bg-slate-100 text-slate-700 border-slate-200',
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
  }, [canApproveHr, canCancelHr, canRequestForOthers, profile, requestableEmployees])

  useEffect(() => {
    void fetchInitialData()
  }, [])

  async function fetchInitialData() {
    setLoading(true)
    try {
      const { data: currentProfile } = await api.get('/employees/me')
      setProfile(currentProfile)

      const requests: Promise<unknown>[] = [
        fetchMyVacations(),
      ]

      if (canApproveManager) {
        requests.push(fetchTeamVacations())
      } else {
        setTeamVacations([])
      }

      if (canApproveHr) {
        requests.push(fetchHrVacations())
      } else {
        setHrVacations([])
      }

      if (canRequestForOthers || canApproveHr || canCancelHr) {
        requests.push(fetchRequestableEmployees())
      } else {
        setRequestableEmployees([])
      }

      await Promise.all(requests)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Nao foi possivel carregar o fluxo de ferias.'))
    } finally {
      setLoading(false)
    }
  }

  async function fetchMyVacations() {
    const { data } = await api.get('/vacations/my')
    setMyVacations(data)
  }

  async function fetchTeamVacations() {
    const { data } = await api.get('/vacations/team')
    setTeamVacations(data)
  }

  async function fetchHrVacations() {
    const { data } = await api.get('/vacations/hr')
    setHrVacations(data)
  }

  async function fetchRequestableEmployees() {
    const { data } = await api.get('/vacations/requestable-employees')
    setRequestableEmployees(data)
  }

  async function refreshAll() {
    await fetchMyVacations()
    if (canApproveManager) await fetchTeamVacations()
    if (canApproveHr) await fetchHrVacations()
  }

  function resetRequestForm() {
    setEditingVacation(null)
    setSelectedEmployeeId(profile?.id || '')
    setStartDate('')
    setEndDate('')
    setNote('')
  }

  function openNewRequest() {
    setEditingVacation(null)
    setSelectedEmployeeId(profile?.id || '')
    setStartDate('')
    setEndDate('')
    setNote('')
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
        toast.success('Solicitacao de ferias atualizada.')
      } else {
        await api.post('/vacations', payload)
        toast.success('Solicitacao de ferias registrada.')
      }

      setRequestOpen(false)
      resetRequestForm()
      await refreshAll()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Nao foi possivel salvar a solicitacao de ferias.'))
    } finally {
      setSubmitting(false)
    }
  }

  function openAction(
    vacation: VacationRecord,
    nextStatus: VacationStatus,
  ) {
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

      toast.success('Status da solicitacao atualizado.')
      setActionOpen(false)
      setActionVacation(null)
      setActionStatus(null)
      setActionReason('')
      await refreshAll()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Nao foi possivel atualizar o status da solicitacao.'))
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

  if (loading) {
    return (
      <div className="flex min-h-[280px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="app-page">
      <MenuFunctionHeader
        title="Recursos Humanos > Ferias"
        description="Solicite, edite, aprove, rejeite ou cancele solicitacoes de ferias conforme o seu escopo de permissao."
        actions={
          <Dialog
            open={requestOpen}
            onOpenChange={(open) => {
              setRequestOpen(open)
              if (!open) resetRequestForm()
            }}
          >
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={openNewRequest}>
                <Plus className="h-4 w-4" />
                Solicitar Ferias
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingVacation ? 'Editar solicitacao de ferias' : 'Nova solicitacao de ferias'}
                </DialogTitle>
                <DialogDescription>
                  Escolha o colaborador quando o seu perfil permitir solicitar para terceiros.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmitRequest} className="space-y-6 py-2">
                <section className="app-section-card space-y-5">
                  <div className="app-form-grid">
                    {requestableOptions.length > 0 ? (
                      <div className="field-stack md:col-span-2">
                        <Label htmlFor="vacation-employee">Solicitacao para</Label>
                        <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
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
                    ) : null}
                    <div className="field-stack">
                      <Label htmlFor="vacation-start-date">Inicio</Label>
                      <Input id="vacation-start-date" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required />
                    </div>
                    <div className="field-stack">
                      <Label htmlFor="vacation-end-date">Fim</Label>
                      <Input id="vacation-end-date" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} required />
                    </div>
                    <div className="field-stack md:col-span-2">
                      <Label htmlFor="vacation-note">Observacao</Label>
                      <Textarea
                        id="vacation-note"
                        placeholder="Inclua contexto adicional quando necessario."
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                      />
                    </div>
                  </div>
                </section>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setRequestOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {editingVacation ? 'Salvar alteracoes' : 'Registrar solicitacao'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <Tabs defaultValue="my-requests" className="space-y-4">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="my-requests">Minhas solicitacoes</TabsTrigger>
          <TabsTrigger value="team" disabled={!canApproveManager}>
            Gestao de equipe
          </TabsTrigger>
          <TabsTrigger value="hr" disabled={!canApproveHr}>
            Administracao RH
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-requests">
          <Card className="app-section-card">
            <CardHeader className="px-0 pt-0">
              <CardTitle>Historico de solicitacoes</CardTitle>
              <CardDescription>
                Revise o andamento dos pedidos e edite apenas os que ainda estiverem pendentes.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Periodo</TableHead>
                    <TableHead>Dias</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Observacao</TableHead>
                    <TableHead className="text-right">Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myVacations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                        Nenhuma solicitacao encontrada.
                      </TableCell>
                    </TableRow>
                  ) : (
                    myVacations.map((vacation) => (
                      <TableRow key={vacation.id}>
                        <TableCell>
                          <span className="inline-flex items-center gap-2">
                            <CalendarDays className="h-4 w-4 text-muted-foreground" />
                            {formatDate(vacation.startDate)} - {formatDate(vacation.endDate)}
                          </span>
                        </TableCell>
                        <TableCell>{durationLabel(vacation)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={STATUS_CLASSNAMES[vacation.status]}>
                            {STATUS_LABELS[vacation.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p>{vacation.note || '-'}</p>
                            {vacation.rejectionReason ? (
                              <p className="text-xs text-rose-600">Motivo: {vacation.rejectionReason}</p>
                            ) : null}
                            {vacation.cancellationReason ? (
                              <p className="text-xs text-slate-600">Cancelada: {vacation.cancellationReason}</p>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {vacation.status === 'REQUESTED' ? (
                            <Button variant="ghost" size="icon" onClick={() => openEditRequest(vacation)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">Somente leitura</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team">
          <Card className="app-section-card">
            <CardHeader className="px-0 pt-0">
              <CardTitle>Aprovacoes do gestor</CardTitle>
              <CardDescription>
                Solicitações do seu escopo de equipe que exigem parecer gerencial.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Periodo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Observacao</TableHead>
                    <TableHead className="text-right">Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamVacations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                        Nenhuma solicitacao de equipe encontrada.
                      </TableCell>
                    </TableRow>
                  ) : (
                    teamVacations.map((vacation) => (
                      <TableRow key={vacation.id}>
                        <TableCell className="font-medium">{vacation.employee.user.name}</TableCell>
                        <TableCell>{formatDate(vacation.startDate)} - {formatDate(vacation.endDate)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={STATUS_CLASSNAMES[vacation.status]}>
                            {STATUS_LABELS[vacation.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>{vacation.note || '-'}</TableCell>
                        <TableCell className="text-right">
                          {vacation.status === 'REQUESTED' ? (
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="outline" onClick={() => openAction(vacation, 'MANAGER_APPROVED')}>
                                <Check className="mr-1 h-4 w-4" />
                                Aprovar
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => openAction(vacation, 'MANAGER_REJECTED')}>
                                <X className="mr-1 h-4 w-4" />
                                Rejeitar
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Sem acao pendente</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hr">
          <Card className="app-section-card">
            <CardHeader className="px-0 pt-0">
              <CardTitle>Administracao RH</CardTitle>
              <CardDescription>
                Confirmacoes, rejeicoes e cancelamentos centralizados do RH.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Periodo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Observacao</TableHead>
                    <TableHead className="text-right">Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hrVacations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                        Nenhuma solicitacao disponivel para o RH.
                      </TableCell>
                    </TableRow>
                  ) : (
                    hrVacations.map((vacation) => (
                      <TableRow key={vacation.id}>
                        <TableCell className="font-medium">{vacation.employee.user.name}</TableCell>
                        <TableCell>{formatDate(vacation.startDate)} - {formatDate(vacation.endDate)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={STATUS_CLASSNAMES[vacation.status]}>
                            {STATUS_LABELS[vacation.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p>{vacation.note || '-'}</p>
                            {vacation.rejectionReason ? (
                              <p className="text-xs text-rose-600">Motivo: {vacation.rejectionReason}</p>
                            ) : null}
                            {vacation.cancellationReason ? (
                              <p className="text-xs text-slate-600">Cancelada: {vacation.cancellationReason}</p>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            {vacation.status === 'MANAGER_APPROVED' ? (
                              <>
                                <Button size="sm" variant="outline" onClick={() => openAction(vacation, 'HR_CONFIRMED')}>
                                  <Check className="mr-1 h-4 w-4" />
                                  Confirmar
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => openAction(vacation, 'HR_REJECTED')}>
                                  <X className="mr-1 h-4 w-4" />
                                  Rejeitar
                                </Button>
                              </>
                            ) : null}
                            {canCancelHr && vacation.status !== 'HR_CANCELLED' ? (
                              <Button size="sm" variant="outline" onClick={() => openAction(vacation, 'HR_CANCELLED')}>
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={actionOpen} onOpenChange={setActionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atualizar status da solicitacao</DialogTitle>
            <DialogDescription>
              {actionNeedsReason()
                ? 'Esta acao exige justificativa obrigatoria e sera registrada no historico.'
                : 'Confirme a mudanca de status da solicitacao selecionada.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleActionSubmit} className="space-y-6 py-2">
            <section className="app-section-card space-y-4">
              <div className="space-y-1 text-sm">
                <p className="font-medium">{actionVacation?.employee.user.name}</p>
                <p className="text-muted-foreground">
                  {actionVacation ? `${formatDate(actionVacation.startDate)} - ${formatDate(actionVacation.endDate)}` : ''}
                </p>
              </div>

              <div className="field-stack">
                <Label htmlFor="vacation-action-reason">
                  {actionStatus === 'HR_CANCELLED' ? 'Justificativa do cancelamento' : 'Motivo da reprovacao'}
                </Label>
                <Textarea
                  id="vacation-action-reason"
                  value={actionReason}
                  onChange={(event) => setActionReason(event.target.value)}
                  placeholder="Explique o motivo desta decisao."
                  required={actionNeedsReason()}
                />
              </div>
            </section>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setActionOpen(false)}>
                Fechar
              </Button>
              <Button type="submit" disabled={actionSubmitting}>
                {actionSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Confirmar acao
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
