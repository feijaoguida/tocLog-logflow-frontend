'use client'

import React, { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Calendar,
  CalendarCheck2,
  CalendarClock,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Eye,
  Info,
  Loader2,
  Mail,
  Pencil,
  Plus,
  RefreshCw,
  RotateCw,
  Search,
  Settings,
  ShieldAlert,
  Trash2,
  X,
  XCircle,
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
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
import { FilterPopover } from '@/components/ui/filter-popover'
import { TablePagination } from '@/components/ui/table-pagination'
import { useAuth } from '@/context/auth-context'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'

// ==========================================
// TIPAGENS & ENUMS
// ==========================================

export type VacationStatus =
  | 'REQUESTED'
  | 'AWAITING_EMPLOYEE_ACCEPTANCE'
  | 'MANAGER_APPROVED'
  | 'MANAGER_REJECTED'
  | 'HR_CONFIRMED'
  | 'HR_REJECTED'
  | 'HR_CANCELLED'

export interface VacationRecord {
  id: string
  employeeId: string
  startDate: string
  endDate: string
  daysCount: number
  sellDays: number
  installmentNumber?: number | null
  status: VacationStatus
  note?: string | null
  hasReservation: boolean
  reservationNote?: string | null
  originalStartDate?: string | null
  originalEndDate?: string | null
  originalDaysCount?: number | null
  acceptedByEmployeeAt?: string | null
  rejectionReason?: string | null
  cancellationReason?: string | null
  employee: {
    id: string
    user: { name: string; email?: string }
    department?: { name: string }
  }
  manager?: { user: { name: string } } | null
  hr?: { user: { name: string } } | null
}

export interface VacationSettingsData {
  requireEmployeeAcceptanceOnReservation: boolean
  minNoticeDays: number
  allowCashAllowance: boolean
  maxCashAllowanceDays: number
  maxInstallments: number
  minInstallmentDays: number
  minMainInstallmentDays: number
  hrNotificationEmails: string[]
}

export interface EmployeeBalanceSummary {
  employeeId: string
  employeeName: string
  admissionDate: string | null
  departmentName?: string
  totalEntitledDays: number
  totalTakenDays: number
  totalRemainingDays: number
  overallStatus: 'OK' | 'WARNING_EXPIRING' | 'OVERDUE'
  activeCycle: {
    cycleIndex: number
    acquisitionStart: string
    acquisitionEnd: string
    concessionDeadline: string
    remainingDays: number
    status: string
    daysUntilDeadline: number
  } | null
}

export interface OverdueReportResponse {
  metrics: {
    totalEmployees: number
    inCompliance: number
    expiringSoon: number
    overdueCount: number
  }
  employees: EmployeeBalanceSummary[]
}

interface RequestableEmployee {
  id: string
  user: { name: string }
}

interface EmployeeProfile {
  id: string
  user: { name: string }
}

// ==========================================
// LABELS & CORES TOCLOG DESIGN SYSTEM
// ==========================================

const STATUS_LABELS: Record<VacationStatus, string> = {
  REQUESTED: 'Aguardando gestor',
  AWAITING_EMPLOYEE_ACCEPTANCE: 'Aguardando seu aceite',
  MANAGER_APPROVED: 'Aguardando RH',
  MANAGER_REJECTED: 'Rejeitada pelo gestor',
  HR_CONFIRMED: 'Confirmada',
  HR_REJECTED: 'Rejeitada pelo RH',
  HR_CANCELLED: 'Cancelada',
}

function getStatusBadgeStyle(status: VacationStatus) {
  switch (status) {
    case 'REQUESTED':
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60'
    case 'AWAITING_EMPLOYEE_ACCEPTANCE':
      return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900/60 animate-pulse font-semibold'
    case 'MANAGER_APPROVED':
      return 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900/60'
    case 'HR_CONFIRMED':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60'
    case 'MANAGER_REJECTED':
    case 'HR_REJECTED':
      return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60'
    case 'HR_CANCELLED':
    default:
      return 'bg-muted text-muted-foreground border-border'
  }
}

function getInitials(name?: string | null) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  const parts = value.split('T')[0].split('-')
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`
  }
  return new Date(value).toLocaleDateString('pt-BR')
}

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

export default function VacationsPage() {
  const { hasPermission } = useAuth()
  const [loading, setLoading] = useState(true)
  const [syncingStatus, setSyncingStatus] = useState(false)

  // Dados
  const [profile, setProfile] = useState<EmployeeProfile | null>(null)
  const [requestableEmployees, setRequestableEmployees] = useState<RequestableEmployee[]>([])
  const [myVacations, setMyVacations] = useState<VacationRecord[]>([])
  const [teamVacations, setTeamVacations] = useState<VacationRecord[]>([])
  const [hrVacations, setHrVacations] = useState<VacationRecord[]>([])
  const [overdueReport, setOverdueReport] = useState<OverdueReportResponse | null>(null)
  const [settings, setSettings] = useState<VacationSettingsData | null>(null)

  // Filtros flutuantes
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('ALL')
  const [onlyMine, setOnlyMine] = useState(false)

  // Paginação
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [activeTab, setActiveTab] = useState<'my-requests' | 'team' | 'hr' | 'balances'>('my-requests')

  // Modais de Operação
  const [requestOpen, setRequestOpen] = useState(false)
  const [editingVacation, setEditingVacation] = useState<VacationRecord | null>(null)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [formStartDate, setFormStartDate] = useState('')
  const [formDaysCount, setFormDaysCount] = useState<number>(30)
  const [formSellDays, setFormSellDays] = useState<number>(0)
  const [enableSelling, setEnableSelling] = useState(false)
  const [formInstallment, setFormInstallment] = useState<number | undefined>(1)
  const [formNote, setFormNote] = useState('')
  const [requestSubmitting, setRequestSubmitting] = useState(false)

  // Modal de Detalhes
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailVacation, setDetailVacation] = useState<VacationRecord | null>(null)

  // Modal de Análise (Gestor / RH) com Ressalva
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewVacation, setReviewVacation] = useState<VacationRecord | null>(null)
  const [reviewMode, setReviewMode] = useState<'MANAGER' | 'HR'>('MANAGER')
  const [reviewAction, setReviewAction] = useState<'APPROVE' | 'RESERVATION' | 'REJECT'>('APPROVE')
  const [reviewNewStartDate, setReviewNewStartDate] = useState('')
  const [reviewNewDaysCount, setReviewNewDaysCount] = useState<number>(15)
  const [reviewReason, setReviewReason] = useState('')
  const [reviewSubmitting, setReviewSubmitting] = useState(false)

  // Modal de Resposta à Ressalva do Colaborador
  const [responseModalOpen, setResponseModalOpen] = useState(false)
  const [respondingVacation, setRespondingVacation] = useState<VacationRecord | null>(null)
  const [responseAccept, setResponseAccept] = useState(true)
  const [responseComment, setResponseComment] = useState('')
  const [responseSubmitting, setResponseSubmitting] = useState(false)

  // Gaveta de Configurações do Módulo (RH)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [newEmailTag, setNewEmailTag] = useState('')
  const [settingsSubmitting, setSettingsSubmitting] = useState(false)

  // Permissões
  const canRequestForOthers = hasPermission('vacation.request.for_others')
  const canApproveManager = hasPermission('vacation.approve.manager') || canRequestForOthers
  const canApproveHr = hasPermission('vacation.approve.hr')
  const canCancelHr = hasPermission('vacation.cancel.hr')

  // Carregamento inicial
  useEffect(() => {
    void loadInitialData()
  }, [])

  async function loadInitialData() {
    setLoading(true)
    try {
      const { data: currentProfile } = await api.get('/employees/me')
      setProfile(currentProfile)

      const requests: Promise<unknown>[] = [
        api.get('/vacations/my').then((res) => setMyVacations(res.data)),
      ]

      if (canApproveManager) {
        requests.push(api.get('/vacations/team').then((res) => setTeamVacations(res.data)))
      }

      if (canApproveHr) {
        requests.push(api.get('/vacations').then((res) => setHrVacations(res.data)))
        requests.push(api.get('/vacations/overdue-report').then((res) => setOverdueReport(res.data)))
        requests.push(api.get('/vacations/settings').then((res) => setSettings(res.data)))
      }

      if (canRequestForOthers || canApproveHr || canCancelHr) {
        requests.push(
          api.get('/vacations/requestable-employees').then((res) => setRequestableEmployees(res.data)),
        )
      }

      await Promise.all(requests)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Erro ao carregar dados de férias.'))
    } finally {
      setLoading(false)
    }
  }

  // Sincronização sob demanda de status (Job AWAY/ACTIVE)
  async function handleSyncStatus() {
    setSyncingStatus(true)
    try {
      const res = await api.post('/vacations/sync-status')
      toast.success(
        `Sincronização realizada! ${res.data.activatedAwayCount} colaboradores em férias e ${res.data.restoredActiveCount} retornados ao trabalho.`,
      )
      await loadInitialData()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Erro ao sincronizar status de férias.'))
    } finally {
      setSyncingStatus(false)
    }
  }

  // Cálculo reativo de data de término
  const calculatedEndDate = useMemo(() => {
    if (!formStartDate || !formDaysCount) return ''
    const parts = formStartDate.split('-')
    if (parts.length !== 3) return ''
    const start = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0))
    start.setUTCDate(start.getUTCDate() + (formDaysCount - 1))
    return start.toISOString().split('T')[0]
  }, [formStartDate, formDaysCount])

  // Verificação de advertência CLT sobre início de férias
  const cltStartDayWarning = useMemo(() => {
    if (!formStartDate) return null
    const parts = formStartDate.split('-')
    if (parts.length !== 3) return null
    const date = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0))
    const day = date.getUTCDay()
    if (day === 4 || day === 5 || day === 6 || day === 0) {
      return 'Atenção CLT (Art. 134, § 3º): É proibido iniciar férias em quinta, sexta ou finais de semana (dois dias antecedentes ao DSR).'
    }
    return null
  }, [formStartDate])

  // Contagem de filtros ativos
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (searchQuery.trim()) count++
    if (filterStatus !== 'ALL') count++
    if (onlyMine) count++
    return count
  }, [searchQuery, filterStatus, onlyMine])

  function handleClearFilters() {
    setSearchQuery('')
    setFilterStatus('ALL')
    setOnlyMine(false)
  }

  // Lista de férias ativa baseada na aba
  const rawListForActiveTab = useMemo(() => {
    if (activeTab === 'my-requests') return myVacations
    if (activeTab === 'team') return teamVacations
    if (activeTab === 'hr') return hrVacations
    return []
  }, [activeTab, myVacations, teamVacations, hrVacations])

  // Filtragem da tabela
  const filteredVacations = useMemo(() => {
    return rawListForActiveTab.filter((item) => {
      if (onlyMine && item.employeeId !== profile?.id) return false
      if (filterStatus !== 'ALL' && item.status !== filterStatus) return false
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const empName = item.employee?.user?.name?.toLowerCase() || ''
        const dept = item.employee?.department?.name?.toLowerCase() || ''
        if (!empName.includes(query) && !dept.includes(query)) return false
      }
      return true
    })
  }, [rawListForActiveTab, onlyMine, filterStatus, searchQuery, profile?.id])

  // Paginação
  const paginatedVacations = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredVacations.slice(start, start + pageSize)
  }, [filteredVacations, currentPage, pageSize])

  // Identificar solicitação com ressalva pendente de aceite para o colaborador logado
  const pendingAcceptanceVacation = useMemo(() => {
    return myVacations.find((v) => v.status === 'AWAITING_EMPLOYEE_ACCEPTANCE') || null
  }, [myVacations])

  // ==========================================
  // DISPARO DE FORMULÁRIO DE SOLICITAÇÃO
  // ==========================================

  function openNewRequest(preselectedEmpId?: string) {
    setEditingVacation(null)
    setSelectedEmployeeId(preselectedEmpId || profile?.id || '')
    setFormStartDate('')
    setFormDaysCount(30)
    setFormSellDays(0)
    setEnableSelling(false)
    setFormInstallment(1)
    setFormNote('')
    setRequestOpen(true)
  }

  async function handleSaveRequest(e: React.FormEvent) {
    e.preventDefault()
    if (!formStartDate || !formDaysCount) {
      toast.error('Preencha a data de início e a duração.')
      return
    }

    setRequestSubmitting(true)
    try {
      const payload = {
        employeeId:
          canRequestForOthers || canApproveHr || canCancelHr
            ? selectedEmployeeId || profile?.id
            : undefined,
        startDate: formStartDate,
        daysCount: Number(formDaysCount),
        sellDays: enableSelling ? Number(formSellDays) : 0,
        installmentNumber: formInstallment ? Number(formInstallment) : undefined,
        note: formNote.trim() || undefined,
      }

      if (editingVacation) {
        await api.patch(`/vacations/${editingVacation.id}`, payload)
        toast.success('Solicitação de férias atualizada com sucesso!')
      } else {
        await api.post('/vacations', payload)
        toast.success('Solicitação de férias registrada! O gestor foi notificado.')
      }

      setRequestOpen(false)
      await loadInitialData()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível salvar a solicitação de férias.'))
    } finally {
      setRequestSubmitting(false)
    }
  }

  // ==========================================
  // DISPARO DE AVALIAÇÃO COM RESSALVA
  // ==========================================

  function openReview(vacation: VacationRecord, mode: 'MANAGER' | 'HR') {
    setReviewVacation(vacation)
    setReviewMode(mode)
    setReviewAction('APPROVE')
    setReviewNewStartDate(vacation.startDate.split('T')[0])
    setReviewNewDaysCount(vacation.daysCount || 15)
    setReviewReason('')
    setReviewOpen(true)
  }

  async function handleReviewSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!reviewVacation) return

    setReviewSubmitting(true)
    try {
      const endpoint =
        reviewMode === 'MANAGER'
          ? `/vacations/${reviewVacation.id}/approve-manager`
          : `/vacations/${reviewVacation.id}/confirm-hr`

      let actionPayload: any = { action: reviewAction }

      if (reviewAction === 'RESERVATION') {
        actionPayload = {
          action: reviewMode === 'MANAGER' ? 'APPROVE_WITH_RESERVATION' : 'CONFIRM_WITH_RESERVATION',
          newStartDate: reviewNewStartDate,
          newDaysCount: Number(reviewNewDaysCount),
          reservationNote: reviewReason.trim(),
        }
      } else if (reviewAction === 'REJECT') {
        actionPayload = {
          action: 'REJECT',
          reason: reviewReason.trim(),
        }
      }

      await api.post(endpoint, actionPayload)
      toast.success(
        reviewAction === 'RESERVATION'
          ? 'Ressalva registrada! O colaborador e a equipe foram notificados.'
          : reviewAction === 'REJECT'
          ? 'Solicitação rejeitada com justificativa registrada.'
          : 'Férias aprovadas com sucesso!',
      )

      setReviewOpen(false)
      await loadInitialData()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Falha ao processar a avaliação de férias.'))
    } finally {
      setReviewSubmitting(false)
    }
  }

  // ==========================================
  // RESPOSTA DO COLABORADOR À RESSALVA
  // ==========================================

  function openRespondModal(vacation: VacationRecord, accept: boolean) {
    setRespondingVacation(vacation)
    setResponseAccept(accept)
    setResponseComment('')
    setResponseModalOpen(true)
  }

  async function handleConfirmReservationResponse(e: React.FormEvent) {
    e.preventDefault()
    if (!respondingVacation) return

    setResponseSubmitting(true)
    try {
      await api.post(`/vacations/${respondingVacation.id}/respond-reservation`, {
        accepted: responseAccept,
        comment: responseComment.trim() || undefined,
      })

      toast.success(
        responseAccept
          ? 'Você aceitou a nova data de férias proposta!'
          : 'Proposta de férias recusada. A solicitação foi cancelada.',
      )

      setResponseModalOpen(false)
      await loadInitialData()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível registrar sua resposta.'))
    } finally {
      setResponseSubmitting(false)
    }
  }

  // ==========================================
  // SALVAR CONFIGURAÇÕES DO TENANT (RH)
  // ==========================================

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault()
    if (!settings) return

    setSettingsSubmitting(true)
    try {
      await api.put('/vacations/settings', settings)
      toast.success('Configurações de férias atualizadas com sucesso!')
      setSettingsOpen(false)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Falha ao salvar configurações do módulo.'))
    } finally {
      setSettingsSubmitting(false)
    }
  }

  function handleAddEmailTag() {
    if (!newEmailTag.trim() || !settings) return
    const email = newEmailTag.trim().toLowerCase()
    if (!settings.hrNotificationEmails.includes(email)) {
      setSettings({
        ...settings,
        hrNotificationEmails: [...settings.hrNotificationEmails, email],
      })
    }
    setNewEmailTag('')
  }

  function handleRemoveEmailTag(email: string) {
    if (!settings) return
    setSettings({
      ...settings,
      hrNotificationEmails: settings.hrNotificationEmails.filter((e) => e !== email),
    })
  }

  // ==========================================
  // RENDERIZAÇÃO
  // ==========================================

  const quickDaysChips = [5, 10, 15, 20, 25, 30]

  return (
    <div className="app-page space-y-6">
      {/* 1. CABEÇALHO DA PÁGINA (TOCLOG SCREEN STANDARD) */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Férias</h1>
          <p className="text-sm text-muted-foreground">
            Solicite, aprove, acompanhe e gerencie a conformidade de férias da empresa com motor CLT.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => openNewRequest()} size="sm" className="h-9 gap-1.5 font-semibold">
            <Plus className="size-4" />
            <span>Solicitar férias</span>
          </Button>

          {canApproveHr && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5"
                onClick={() => setSettingsOpen(true)}
              >
                <Settings className="size-4" />
                <span className="hidden sm:inline">Configurações</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5"
                onClick={() => void handleSyncStatus()}
                disabled={syncingStatus}
                title="Sincronizar status funcional dos colaboradores em férias (Job diário)"
              >
                <RefreshCw className={`size-4 ${syncingStatus ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Sincronizar status</span>
              </Button>
            </>
          )}

          {/* Filtro Flutuante Oficial */}
          <FilterPopover
            activeCount={activeFilterCount}
            onClear={handleClearFilters}
            onApply={() => {}}
            contentClassName="sm:w-[460px]"
          >
            <div className="space-y-3">
              <div className="space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Buscar colaborador
                </span>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    className="pl-9 h-9 text-sm"
                    placeholder="Nome do colaborador ou departamento..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Status da Solicitação
                  </span>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Todos os status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Todos os status</SelectItem>
                      <SelectItem value="REQUESTED">Aguardando gestor</SelectItem>
                      <SelectItem value="AWAITING_EMPLOYEE_ACCEPTANCE">Aguardando aceite</SelectItem>
                      <SelectItem value="MANAGER_APPROVED">Aguardando RH</SelectItem>
                      <SelectItem value="HR_CONFIRMED">Confirmadas</SelectItem>
                      <SelectItem value="MANAGER_REJECTED">Rejeitadas pelo gestor</SelectItem>
                      <SelectItem value="HR_REJECTED">Rejeitadas pelo RH</SelectItem>
                      <SelectItem value="HR_CANCELLED">Canceladas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end pb-1.5">
                  <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                    <Checkbox
                      checked={onlyMine}
                      onCheckedChange={(checked) => setOnlyMine(Boolean(checked))}
                    />
                    <span>Apenas minhas</span>
                  </label>
                </div>
              </div>
            </div>
          </FilterPopover>

          {/* Botão de Atualizar com Rotação */}
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            onClick={() => void loadInitialData()}
            disabled={loading}
          >
            <RotateCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </Button>
        </div>
      </section>

      {/* 2. CARDS DE INDICADORES OPERACIONAIS (KPIS EM 4 COLUNAS) */}
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
              {myVacations.length}
            </span>
            <Calendar className="size-5 text-muted-foreground/60" />
          </CardContent>
        </Card>

        {/* Aguardando Gestor */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Aguardando Gestão
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2 flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-foreground">
                {teamVacations.filter((v) => v.status === 'REQUESTED').length}
              </span>
              {teamVacations.filter((v) => v.status === 'REQUESTED').length > 0 && (
                <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                  Ação necessária
                </span>
              )}
            </div>
            <Clock className="size-5 text-amber-500/60" />
          </CardContent>
        </Card>

        {/* Aguardando RH */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Aguardando RH
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2 flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-foreground">
                {hrVacations.filter((v) => v.status === 'MANAGER_APPROVED').length}
              </span>
              {hrVacations.filter((v) => v.status === 'MANAGER_APPROVED').length > 0 && (
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
              {hrVacations.filter((v) => v.status === 'HR_CONFIRMED').length ||
                myVacations.filter((v) => v.status === 'HR_CONFIRMED').length}
            </span>
            <CheckCircle2 className="size-5 text-emerald-500/60" />
          </CardContent>
        </Card>
      </section>

      {/* 3. BANNER DE ACEITE DE RESSALVA PARA O COLABORADOR (SE HOUVER) */}
      {pendingAcceptanceVacation && (
        <Card className="border-amber-300 bg-amber-50/70 p-4 dark:border-amber-900/60 dark:bg-amber-950/20">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-amber-500/20 p-2 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="size-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                  Proposta de Férias com Ressalva de Datas Pendente do seu Aceite!
                </h4>
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  O período solicitado originalmente ({formatDate(pendingAcceptanceVacation.originalStartDate || pendingAcceptanceVacation.startDate)} -{' '}
                  {pendingAcceptanceVacation.originalDaysCount || pendingAcceptanceVacation.daysCount} dias) foi ajustado para:{' '}
                  <strong>
                    {formatDate(pendingAcceptanceVacation.startDate)} até {formatDate(pendingAcceptanceVacation.endDate)} (
                    {pendingAcceptanceVacation.daysCount} dias)
                  </strong>
                  .
                </p>
                {pendingAcceptanceVacation.reservationNote && (
                  <p className="text-xs italic text-amber-700 dark:text-amber-400">
                    Justificativa do gestor: &ldquo;{pendingAcceptanceVacation.reservationNote}&rdquo;
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-8"
                onClick={() => openRespondModal(pendingAcceptanceVacation, true)}
              >
                <Check className="size-4 mr-1" />
                Aceitar Nova Data
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 h-8"
                onClick={() => openRespondModal(pendingAcceptanceVacation, false)}
              >
                <X className="size-4 mr-1" />
                Recusar
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* 4. ABAS OPERACIONAIS */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => {
          setActiveTab(val as any)
          setCurrentPage(1)
        }}
        className="space-y-4"
      >
        <TabsList className="bg-muted/40 p-1">
          <TabsTrigger value="my-requests" className="text-xs font-medium">
            Minhas solicitações ({myVacations.length})
          </TabsTrigger>

          {canApproveManager && (
            <TabsTrigger value="team" className="text-xs font-medium">
              Gestão de equipe ({teamVacations.length})
            </TabsTrigger>
          )}

          {canApproveHr && (
            <>
              <TabsTrigger value="hr" className="text-xs font-medium">
                Administração RH ({hrVacations.length})
              </TabsTrigger>
              <TabsTrigger value="balances" className="text-xs font-medium">
                Saldos & Férias Vencidas CLT ({overdueReport?.metrics?.overdueCount || 0} vencidas)
              </TabsTrigger>
            </>
          )}
        </TabsList>

        {/* ============================================================== */}
        {/* ABA: TABELA DE SOLICITAÇÕES (MINHAS, EQUIPE OU RH)            */}
        {/* ============================================================== */}
        {activeTab !== 'balances' && (
          <TabsContent value={activeTab} className="space-y-4 m-0">
            <Card className="app-section-card overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-border/80 hover:bg-transparent">
                      <TableHead className="w-[80px] font-semibold text-foreground text-xs uppercase tracking-wider pl-4">
                        ID
                      </TableHead>
                      <TableHead className="min-w-[220px] font-semibold text-foreground text-xs uppercase tracking-wider">
                        Colaborador
                      </TableHead>
                      <TableHead className="min-w-[220px] font-semibold text-foreground text-xs uppercase tracking-wider">
                        Período & Duração
                      </TableHead>
                      <TableHead className="min-w-[200px] font-semibold text-foreground text-xs uppercase tracking-wider">
                        Status / Responsável
                      </TableHead>
                      <TableHead className="w-[140px] text-right font-semibold text-foreground text-xs uppercase tracking-wider pr-4">
                        Ações
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-32 text-center text-sm text-muted-foreground">
                          <Loader2 className="size-5 animate-spin mx-auto mb-2 text-primary" />
                          Carregando solicitações de férias...
                        </TableCell>
                      </TableRow>
                    ) : paginatedVacations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-32 text-center text-sm text-muted-foreground">
                          Nenhuma solicitação encontrada para os filtros aplicados.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedVacations.map((vac) => {
                        const isPendingManager = vac.status === 'REQUESTED'
                        const isPendingHr = vac.status === 'MANAGER_APPROVED'
                        const isAwaitingAcceptance = vac.status === 'AWAITING_EMPLOYEE_ACCEPTANCE'
                        const isMyOwn = vac.employeeId === profile?.id

                        return (
                          <TableRow key={vac.id} className="hover:bg-muted/40 transition-colors">
                            {/* ID */}
                            <TableCell className="pl-4 font-mono text-xs text-muted-foreground font-semibold">
                              #{vac.id.substring(0, 6)}
                            </TableCell>

                            {/* Colaborador / Solicitante */}
                            <TableCell>
                              <div className="flex items-center gap-2.5">
                                <span className="flex size-7 items-center justify-center rounded-full bg-muted text-[11px] font-bold text-muted-foreground shrink-0">
                                  {getInitials(vac.employee?.user?.name)}
                                </span>
                                <div className="space-y-0.5">
                                  <div className="font-semibold text-sm text-foreground">
                                    {vac.employee?.user?.name || 'Colaborador'}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {vac.employee?.department?.name || 'Geral'}
                                  </div>
                                </div>
                              </div>
                            </TableCell>

                            {/* Período & Duração */}
                            <TableCell>
                              <div className="space-y-1">
                                <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                  <CalendarDays className="size-3.5 text-muted-foreground shrink-0" />
                                  <span>
                                    {formatDate(vac.startDate)} — {formatDate(vac.endDate)}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="rounded-md bg-secondary px-2 py-0.2 text-[11px] font-medium text-secondary-foreground">
                                    {vac.daysCount || 30} dias
                                  </span>
                                  {vac.sellDays > 0 && (
                                    <span className="rounded-md bg-sky-500/10 px-2 py-0.2 text-[11px] font-medium text-sky-700 dark:text-sky-300">
                                      + {vac.sellDays}d venda
                                    </span>
                                  )}
                                  {vac.hasReservation && (
                                    <span className="rounded-md bg-amber-500/15 px-2 py-0.2 text-[10px] font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1">
                                      <Clock className="size-3" />
                                      Ressalva proposta
                                    </span>
                                  )}
                                </div>
                              </div>
                            </TableCell>

                            {/* Status & Responsável */}
                            <TableCell>
                              <div className="space-y-1">
                                <span
                                  className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${getStatusBadgeStyle(
                                    vac.status,
                                  )}`}
                                >
                                  {STATUS_LABELS[vac.status]}
                                </span>

                                <div className="text-xs text-muted-foreground truncate">
                                  {vac.hr?.user?.name ? (
                                    <span>RH: {vac.hr.user.name}</span>
                                  ) : vac.manager?.user?.name ? (
                                    <span>Gestor: {vac.manager.user.name}</span>
                                  ) : (
                                    <span className="italic">Pendente de avaliação</span>
                                  )}
                                </div>
                              </div>
                            </TableCell>

                            {/* Ações Compactas */}
                            <TableCell className="pr-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Botão Eye de Detalhes */}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-8 text-muted-foreground hover:text-foreground"
                                  onClick={() => {
                                    setDetailVacation(vac)
                                    setDetailOpen(true)
                                  }}
                                  title="Ver detalhes da solicitação"
                                >
                                  <Eye className="size-4" />
                                </Button>

                                {/* Ação de Aceite do Colaborador (se for o próprio em ressalva) */}
                                {isAwaitingAcceptance && isMyOwn && (
                                  <Button
                                    size="sm"
                                    className="h-8 px-2.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                                    onClick={() => openRespondModal(vac, true)}
                                  >
                                    Aceitar
                                  </Button>
                                )}

                                {/* Ação do Gestor */}
                                {isPendingManager && canApproveManager && activeTab === 'team' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 px-2.5 text-xs font-semibold border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                                    onClick={() => openReview(vac, 'MANAGER')}
                                  >
                                    Avaliar
                                  </Button>
                                )}

                                {/* Ação do RH */}
                                {isPendingHr && canApproveHr && activeTab === 'hr' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 px-2.5 text-xs font-semibold border-emerald-600 text-emerald-700 hover:bg-emerald-600 hover:text-white dark:border-emerald-500 dark:text-emerald-400"
                                    onClick={() => openReview(vac, 'HR')}
                                  >
                                    Confirmar
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Rodapé com Paginação Padrão TocLog */}
              <div className="border-t border-border/80 px-4 py-3 bg-muted/10">
                <TablePagination
                  page={currentPage}
                  pageSize={pageSize}
                  totalItems={filteredVacations.length}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={(sz) => {
                    setPageSize(sz)
                    setCurrentPage(1)
                  }}
                  pageSizeOptions={[10, 20, 50]}
                />
              </div>
            </Card>
          </TabsContent>
        )}

        {/* ============================================================== */}
        {/* ABA: CONTROLE DE SALDOS & VENCIMENTOS (RH - VAC26-T11)         */}
        {/* ============================================================== */}
        {activeTab === 'balances' && canApproveHr && (
          <TabsContent value="balances" className="space-y-4 m-0">
            {/* 4 KPIs de Conformidade CLT */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Card className="app-section-card p-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Total de Colaboradores
                </span>
                <div className="pt-2 text-3xl font-bold tracking-tight text-foreground">
                  {overdueReport?.metrics?.totalEmployees || 0}
                </div>
              </Card>

              <Card className="app-section-card p-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Férias em Dia
                </span>
                <div className="pt-2 text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                  {overdueReport?.metrics?.inCompliance || 0}
                </div>
              </Card>

              <Card className="app-section-card p-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Atenção (&lt; 60 dias)
                </span>
                <div className="pt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
                    {overdueReport?.metrics?.expiringSoon || 0}
                  </span>
                  {(overdueReport?.metrics?.expiringSoon || 0) > 0 && (
                    <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                      Ação necessária
                    </span>
                  )}
                </div>
              </Card>

              <Card className="app-section-card p-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Férias Vencidas
                </span>
                <div className="pt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
                    {overdueReport?.metrics?.overdueCount || 0}
                  </span>
                  {(overdueReport?.metrics?.overdueCount || 0) > 0 && (
                    <span className="rounded-md bg-rose-500/10 px-2 py-0.5 text-xs font-medium text-rose-700 dark:text-rose-400">
                      Risco de Dobra CLT
                    </span>
                  )}
                </div>
              </Card>
            </div>

            {/* Tabela de Vencimentos */}
            <Card className="app-section-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border/80 hover:bg-transparent">
                    <TableHead className="min-w-[200px] font-semibold text-foreground text-xs uppercase tracking-wider pl-4">
                      Colaborador / Departamento
                    </TableHead>
                    <TableHead className="w-[120px] font-semibold text-foreground text-xs uppercase tracking-wider">
                      Admissão
                    </TableHead>
                    <TableHead className="min-w-[180px] font-semibold text-foreground text-xs uppercase tracking-wider">
                      Período Aquisitivo
                    </TableHead>
                    <TableHead className="w-[120px] font-semibold text-foreground text-xs uppercase tracking-wider">
                      Saldo Restante
                    </TableHead>
                    <TableHead className="w-[140px] font-semibold text-foreground text-xs uppercase tracking-wider">
                      Limite Concessivo
                    </TableHead>
                    <TableHead className="w-[130px] font-semibold text-foreground text-xs uppercase tracking-wider">
                      Situação
                    </TableHead>
                    <TableHead className="w-[120px] text-right font-semibold text-foreground text-xs uppercase tracking-wider pr-4">
                      Ação
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(!overdueReport || overdueReport.employees.length === 0) ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center text-sm text-muted-foreground">
                        Nenhum colaborador com dados de admissão cadastrados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    overdueReport.employees.map((emp) => {
                      const isOverdue = emp.overallStatus === 'OVERDUE'
                      const isExpiring = emp.overallStatus === 'WARNING_EXPIRING'

                      return (
                        <TableRow key={emp.employeeId} className="hover:bg-muted/40 transition-colors">
                          <TableCell className="pl-4">
                            <div className="font-semibold text-sm text-foreground">
                              {emp.employeeName}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {emp.departmentName || 'Departamento Geral'}
                            </div>
                          </TableCell>

                          <TableCell className="text-xs text-muted-foreground font-mono">
                            {formatDate(emp.admissionDate)}
                          </TableCell>

                          <TableCell className="text-xs text-foreground font-mono">
                            {emp.activeCycle
                              ? `${formatDate(emp.activeCycle.acquisitionStart)} a ${formatDate(emp.activeCycle.acquisitionEnd)}`
                              : '—'}
                          </TableCell>

                          <TableCell>
                            <span className="font-semibold text-sm text-foreground">
                              {emp.totalRemainingDays} dias
                            </span>
                          </TableCell>

                          <TableCell className="text-xs font-mono">
                            <span
                              className={
                                isOverdue
                                  ? 'text-rose-600 font-bold'
                                  : isExpiring
                                  ? 'text-amber-600 font-bold'
                                  : 'text-muted-foreground'
                              }
                            >
                              {formatDate(emp.activeCycle?.concessionDeadline)}
                            </span>
                          </TableCell>

                          <TableCell>
                            {isOverdue ? (
                              <Badge className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60 font-semibold">
                                Vencida (Dobra)
                              </Badge>
                            ) : isExpiring ? (
                              <Badge className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60 font-semibold">
                                Atenção (&lt;60d)
                              </Badge>
                            ) : (
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60">
                                Em dia
                              </Badge>
                            )}
                          </TableCell>

                          <TableCell className="pr-4 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs font-semibold"
                              onClick={() => openNewRequest(emp.employeeId)}
                            >
                              Programar
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* ============================================================== */}
      {/* 5. MODAL DE SOLICITAÇÃO INTELIGENTE (VAC26-T09)                */}
      {/* ============================================================== */}
      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editingVacation ? 'Editar Solicitação de Férias' : 'Nova Solicitação de Férias'}
            </DialogTitle>
            <DialogDescription>
              Selecione o início e a duração do descanso. As regras da CLT serão validadas automaticamente.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveRequest} className="space-y-4">
            {/* Seleção do Colaborador (se gestor/RH) */}
            {(canRequestForOthers || canApproveHr || canCancelHr) && (
              <div className="space-y-1.5">
                <Label htmlFor="employee-select" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Colaborador
                </Label>
                <Select
                  value={selectedEmployeeId}
                  onValueChange={setSelectedEmployeeId}
                  disabled={Boolean(editingVacation)}
                >
                  <SelectTrigger id="employee-select" className="h-9">
                    <SelectValue placeholder="Selecione o colaborador" />
                  </SelectTrigger>
                  <SelectContent>
                    {requestableEmployees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.user?.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Início do Descanso */}
            <div className="space-y-1.5">
              <Label htmlFor="start-date" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Data de Início do Descanso
              </Label>
              <Input
                id="start-date"
                type="date"
                className="h-9"
                value={formStartDate}
                onChange={(e) => setFormStartDate(e.target.value)}
                required
              />
              {cltStartDayWarning && (
                <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5 mt-1">
                  <AlertTriangle className="size-3.5 shrink-0" />
                  <span>{cltStartDayWarning}</span>
                </p>
              )}
            </div>

            {/* Chips Rápidos de Dias */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Quantidade de Dias de Descanso
              </Label>
              <div className="flex flex-wrap gap-2">
                {quickDaysChips.map((chip) => (
                  <Button
                    key={chip}
                    type="button"
                    variant={formDaysCount === chip ? 'default' : 'outline'}
                    size="sm"
                    className="h-8 px-3 text-xs font-semibold"
                    onClick={() => setFormDaysCount(chip)}
                  >
                    {chip} dias
                  </Button>
                ))}
              </div>
              <div className="pt-1 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Outro período:</span>
                <Input
                  type="number"
                  min={5}
                  max={30}
                  className="w-20 h-8 text-xs"
                  value={formDaysCount}
                  onChange={(e) => setFormDaysCount(Number(e.target.value))}
                />
              </div>
            </div>

            {/* Card Reativo de Previsão de Retorno */}
            {formStartDate && calculatedEndDate && (
              <div className="rounded-lg border bg-muted/30 p-3 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <span className="text-muted-foreground uppercase tracking-wider text-[10px] font-semibold">
                    Previsão de Término
                  </span>
                  <div className="font-bold text-sm text-foreground">
                    {formatDate(calculatedEndDate)}
                  </div>
                </div>
                <div className="text-right space-y-0.5">
                  <span className="text-muted-foreground uppercase tracking-wider text-[10px] font-semibold">
                    Duração Total
                  </span>
                  <div className="font-bold text-sm text-foreground">
                    {formDaysCount} dias corridos
                  </div>
                </div>
              </div>
            )}

            {/* Seção de Venda de Férias (Abono Pecuniário) */}
            <div className="rounded-lg border p-3 space-y-3 bg-card">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="sell-toggle" className="text-sm font-semibold cursor-pointer">
                    Venda de Férias (Abono Pecuniário)
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    A CLT permite vender até 1/3 das férias (máximo 10 dias).
                  </p>
                </div>
                <Switch
                  id="sell-toggle"
                  checked={enableSelling}
                  onCheckedChange={(checked) => {
                    setEnableSelling(checked)
                    if (!checked) setFormSellDays(0)
                    else if (formSellDays === 0) setFormSellDays(10)
                  }}
                />
              </div>

              {enableSelling && (
                <div className="pt-2 border-t flex items-center gap-3">
                  <Label htmlFor="sell-days" className="text-xs font-medium">
                    Dias a vender:
                  </Label>
                  <div className="flex gap-2">
                    {[5, 10].map((d) => (
                      <Button
                        key={d}
                        type="button"
                        size="sm"
                        variant={formSellDays === d ? 'default' : 'outline'}
                        className="h-7 text-xs font-semibold"
                        onClick={() => setFormSellDays(d)}
                      >
                        {d} dias
                      </Button>
                    ))}
                  </div>
                  <Input
                    id="sell-days"
                    type="number"
                    min={1}
                    max={10}
                    className="w-16 h-7 text-xs"
                    value={formSellDays}
                    onChange={(e) => setFormSellDays(Number(e.target.value))}
                  />
                </div>
              )}
            </div>

            {/* Parcela */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Número da Parcela
              </Label>
              <Select
                value={String(formInstallment || 1)}
                onValueChange={(val) => setFormInstallment(Number(val))}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1ª Parcela (Período integral ou principal)</SelectItem>
                  <SelectItem value="2">2ª Parcela</SelectItem>
                  <SelectItem value="3">3ª Parcela</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Observações */}
            <div className="space-y-1.5">
              <Label htmlFor="form-note" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Observações
              </Label>
              <Textarea
                id="form-note"
                className="text-xs min-h-[60px]"
                placeholder="Observações complementares sobre o período..."
                value={formNote}
                onChange={(e) => setFormNote(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setRequestOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={requestSubmitting}>
                {requestSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-1.5" />
                    Salvando...
                  </>
                ) : (
                  'Salvar solicitação'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ============================================================== */}
      {/* 6. MODAL DE AVALIAÇÃO (GESTOR / RH) COM RESSALVA (VAC26-T10)   */}
      {/* ============================================================== */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {reviewMode === 'MANAGER' ? 'Avaliação pelo Gestor Imediato' : 'Confirmação pelo RH'}
            </DialogTitle>
            <DialogDescription>
              {reviewVacation?.employee?.user?.name} — Solicitação de {reviewVacation?.daysCount} dias (
              {formatDate(reviewVacation?.startDate)} a {formatDate(reviewVacation?.endDate)})
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleReviewSubmit} className="space-y-4">
            {/* 3 Ações Claras */}
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant={reviewAction === 'APPROVE' ? 'default' : 'outline'}
                className={
                  reviewAction === 'APPROVE'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-semibold'
                    : 'text-emerald-700 border-emerald-300 dark:border-emerald-800'
                }
                onClick={() => setReviewAction('APPROVE')}
              >
                <Check className="size-4 mr-1" />
                {reviewMode === 'MANAGER' ? 'Aprovar Direto' : 'Confirmar'}
              </Button>

              <Button
                type="button"
                variant={reviewAction === 'RESERVATION' ? 'default' : 'outline'}
                className={
                  reviewAction === 'RESERVATION'
                    ? 'bg-amber-600 hover:bg-amber-700 text-white font-semibold'
                    : 'text-amber-700 border-amber-300 dark:border-amber-800'
                }
                onClick={() => setReviewAction('RESERVATION')}
              >
                <Clock className="size-4 mr-1" />
                Com Ressalva
              </Button>

              <Button
                type="button"
                variant={reviewAction === 'REJECT' ? 'default' : 'outline'}
                className={
                  reviewAction === 'REJECT'
                    ? 'bg-rose-600 hover:bg-rose-700 text-white font-semibold'
                    : 'text-rose-700 border-rose-300 dark:border-rose-800'
                }
                onClick={() => setReviewAction('REJECT')}
              >
                <X className="size-4 mr-1" />
                Rejeitar
              </Button>
            </div>

            {/* Painel condicional para Ressalva */}
            {reviewAction === 'RESERVATION' && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 space-y-3 dark:border-amber-900/50 dark:bg-amber-950/20">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider">
                    Nova Proposta de Período
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Altere as datas e forneça a justificativa formal para o colaborador.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="res-start" className="text-xs font-semibold">
                      Nova Data de Início
                    </Label>
                    <Input
                      id="res-start"
                      type="date"
                      className="h-8 text-xs"
                      value={reviewNewStartDate}
                      onChange={(e) => setReviewNewStartDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="res-days" className="text-xs font-semibold">
                      Novos Dias de Descanso
                    </Label>
                    <Input
                      id="res-days"
                      type="number"
                      min={5}
                      max={30}
                      className="h-8 text-xs"
                      value={reviewNewDaysCount}
                      onChange={(e) => setReviewNewDaysCount(Number(e.target.value))}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="res-note" className="text-xs font-semibold">
                    Justificativa da Ressalva (Obrigatória)
                  </Label>
                  <Textarea
                    id="res-note"
                    className="text-xs min-h-[60px]"
                    placeholder="Ex: Escala de fechamento fiscal ou cobertura de plantão..."
                    value={reviewReason}
                    onChange={(e) => setReviewReason(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            {/* Painel condicional para Rejeição */}
            {reviewAction === 'REJECT' && (
              <div className="space-y-1.5">
                <Label htmlFor="rej-reason" className="text-xs font-semibold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
                  Motivo da Rejeição (Obrigatório)
                </Label>
                <Textarea
                  id="rej-reason"
                  className="text-xs min-h-[80px]"
                  placeholder="Explique o motivo pelo qual a solicitação não pôde ser atendida..."
                  value={reviewReason}
                  onChange={(e) => setReviewReason(e.target.value)}
                  required
                />
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setReviewOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={reviewSubmitting}>
                {reviewSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-1.5" />
                    Processando...
                  </>
                ) : (
                  'Confirmar Decisão'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ============================================================== */}
      {/* 7. MODAL DE RESPOSTA À RESSALVA (COLABORADOR)                  */}
      {/* ============================================================== */}
      <Dialog open={responseModalOpen} onOpenChange={setResponseModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {responseAccept ? 'Aceitar Proposta de Férias' : 'Recusar Proposta de Férias'}
            </DialogTitle>
            <DialogDescription>
              {responseAccept
                ? 'Ao aceitar, o novo período de férias entrará no fluxo de confirmação final.'
                : 'Ao recusar, a solicitação atual será cancelada e você poderá conversar com seu gestor para um novo agendamento.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConfirmReservationResponse} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="res-comment" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Considerações / Comentário (Opcional)
              </Label>
              <Textarea
                id="res-comment"
                className="text-xs min-h-[80px]"
                placeholder="Insira observações caso deseje..."
                value={responseComment}
                onChange={(e) => setResponseComment(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setResponseModalOpen(false)}>
                Voltar
              </Button>
              <Button
                type="submit"
                size="sm"
                className={
                  responseAccept
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-rose-600 hover:bg-rose-700 text-white'
                }
                disabled={responseSubmitting}
              >
                {responseSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-1.5" />
                    Enviando...
                  </>
                ) : responseAccept ? (
                  'Confirmar Aceite'
                ) : (
                  'Confirmar Recusa'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ============================================================== */}
      {/* 8. MODAL DE DETALHES COMPLETOS DA SOLICITAÇÃO                  */}
      {/* ============================================================== */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes da Solicitação de Férias</DialogTitle>
            <DialogDescription>
              Código #{detailVacation?.id.substring(0, 8)}
            </DialogDescription>
          </DialogHeader>

          {detailVacation && (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/40 p-3">
                <div>
                  <span className="text-muted-foreground uppercase font-semibold text-[10px]">
                    Colaborador
                  </span>
                  <div className="font-semibold text-foreground text-sm">
                    {detailVacation.employee?.user?.name}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground uppercase font-semibold text-[10px]">
                    Status
                  </span>
                  <div>
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${getStatusBadgeStyle(
                        detailVacation.status,
                      )}`}
                    >
                      {STATUS_LABELS[detailVacation.status]}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-muted-foreground uppercase font-semibold text-[10px]">
                  Período e Duração
                </span>
                <div className="font-medium text-foreground">
                  {formatDate(detailVacation.startDate)} até {formatDate(detailVacation.endDate)} (
                  {detailVacation.daysCount} dias de descanso
                  {detailVacation.sellDays > 0 ? ` + ${detailVacation.sellDays} dias vendidos` : ''})
                </div>
              </div>

              {detailVacation.hasReservation && (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-2.5 space-y-1 dark:border-amber-900 dark:bg-amber-950/30">
                  <span className="text-amber-800 dark:text-amber-300 font-bold text-[11px]">
                    Ressalva Aplicada:
                  </span>
                  <div className="text-muted-foreground">
                    Período Original: {formatDate(detailVacation.originalStartDate)} (
                    {detailVacation.originalDaysCount} dias)
                  </div>
                  <div className="italic text-foreground">
                    Motivo: &ldquo;{detailVacation.reservationNote}&rdquo;
                  </div>
                  {detailVacation.acceptedByEmployeeAt && (
                    <div className="text-emerald-700 dark:text-emerald-400 font-medium">
                      Aceito pelo colaborador em: {formatDate(detailVacation.acceptedByEmployeeAt)}
                    </div>
                  )}
                </div>
              )}

              {detailVacation.rejectionReason && (
                <div className="rounded-md border border-rose-200 bg-rose-50 p-2.5 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30">
                  <strong>Motivo da Reprovação:</strong> {detailVacation.rejectionReason}
                </div>
              )}

              {detailVacation.note && (
                <div className="space-y-1">
                  <span className="text-muted-foreground uppercase font-semibold text-[10px]">
                    Observação do Solicitante
                  </span>
                  <p className="text-foreground italic">{detailVacation.note}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button size="sm" variant="outline" onClick={() => setDetailOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================== */}
      {/* 9. GAVETA DE CONFIGURAÇÕES DE FÉRIAS (RH - VAC26-T12)          */}
      {/* ============================================================== */}
      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Configurações do Módulo de Férias</SheetTitle>
            <SheetDescription>
              Ajuste as regras de negócio e a lista de e-mails de notificação corporativa.
            </SheetDescription>
          </SheetHeader>

          {settings && (
            <form onSubmit={handleSaveSettings} className="space-y-5 py-4">
              {/* Toggle de Aceite Formal */}
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5 pr-2">
                  <Label htmlFor="cfg-req-accept" className="text-sm font-semibold cursor-pointer">
                    Exigir Aceite em Ressalvas
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Se ativado, solicitações com ressalva exigem aceite formal do colaborador antes de prosseguir.
                  </p>
                </div>
                <Switch
                  id="cfg-req-accept"
                  checked={settings.requireEmployeeAcceptanceOnReservation}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, requireEmployeeAcceptanceOnReservation: checked })
                  }
                />
              </div>

              {/* Aviso Prévio CLT */}
              <div className="space-y-1.5">
                <Label htmlFor="cfg-notice" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Aviso Prévio Mínimo (Dias)
                </Label>
                <Input
                  id="cfg-notice"
                  type="number"
                  min={0}
                  max={90}
                  className="h-9 text-sm"
                  value={settings.minNoticeDays}
                  onChange={(e) =>
                    setSettings({ ...settings, minNoticeDays: Number(e.target.value) })
                  }
                />
                <p className="text-[11px] text-muted-foreground">
                  Padrão CLT: 30 dias de antecedência para comunicação de férias.
                </p>
              </div>

              {/* Venda de Férias (Abono) */}
              <div className="space-y-3 rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="cfg-allow-sell" className="text-sm font-semibold cursor-pointer">
                    Permitir Venda de Férias (Abono)
                  </Label>
                  <Switch
                    id="cfg-allow-sell"
                    checked={settings.allowCashAllowance}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, allowCashAllowance: checked })
                    }
                  />
                </div>
                {settings.allowCashAllowance && (
                  <div className="space-y-1 pt-2 border-t">
                    <Label htmlFor="cfg-max-sell" className="text-xs text-muted-foreground">
                      Limite Máximo de Dias de Venda
                    </Label>
                    <Input
                      id="cfg-max-sell"
                      type="number"
                      min={1}
                      max={10}
                      className="h-8 text-xs w-24"
                      value={settings.maxCashAllowanceDays}
                      onChange={(e) =>
                        setSettings({ ...settings, maxCashAllowanceDays: Number(e.target.value) })
                      }
                    />
                  </div>
                )}
              </div>

              {/* E-mails do RH para Notificações Transacionais */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Lista de E-mails do RH Destinatários
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Estes e-mails receberão alertas sobre abertura, aprovação e ressalvas de férias.
                </p>

                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="novo-email-rh@empresa.com"
                    className="h-8 text-xs"
                    value={newEmailTag}
                    onChange={(e) => setNewEmailTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddEmailTag()
                      }
                    }}
                  />
                  <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={handleAddEmailTag}>
                    Adicionar
                  </Button>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-2">
                  {settings.hrNotificationEmails.length === 0 ? (
                    <span className="text-xs text-muted-foreground italic">Nenhum e-mail cadastrado ainda.</span>
                  ) : (
                    settings.hrNotificationEmails.map((email) => (
                      <span
                        key={email}
                        className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs text-secondary-foreground"
                      >
                        <Mail className="size-3 text-muted-foreground" />
                        {email}
                        <button
                          type="button"
                          onClick={() => handleRemoveEmailTag(email)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>

              <SheetFooter className="pt-4 border-t">
                <Button type="button" variant="outline" size="sm" onClick={() => setSettingsOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" size="sm" disabled={settingsSubmitting}>
                  {settingsSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin mr-1.5" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar Configurações'
                  )}
                </Button>
              </SheetFooter>
            </form>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
