'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  Calendar,
  Plus,
  ShieldAlert,
  Wrench,
  Play,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Clock,
  Send,
  AlertTriangle,
  Bell,
  Check,
  RefreshCw,
  RotateCw,
  FileText,
  Sliders,
  Package,
  Search,
} from 'lucide-react'
import { toast } from 'sonner'

import { WorkspaceInlineAlert } from '@/components/layout/workspace-inline-alert'
import { WorkspaceStateCard } from '@/components/layout/workspace-state-card'
import { useAuth } from '@/context/auth-context'
import { FilterPopover } from '@/components/ui/filter-popover'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'
import type { Vehicle } from '@/types/fleet'

type MaintenanceRecord = {
  id: string
  type: 'PREVENTIVE' | 'CORRECTIVE'
  origin: 'INTERNAL' | 'EXTERNAL'
  description: string
  scheduledDate: string
  executionDate?: string | null
  completionDate?: string | null
  estimatedCost?: number | null
  finalCost?: number | null
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  vehicle: Pick<Vehicle, 'id' | 'plate' | 'model'>
}

type MaintenanceNoteItem = {
  id: string
  content: string
  authorId: string
  author?: { id: string; name: string; email: string }
  createdAt: string
}

type MaintenanceAlertItem = {
  id: string
  title: string
  description?: string | null
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  status: 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'DISMISSED'
  createdAt: string
  vehicle?: { id: string; plate: string; brand?: string; model?: string; currentKm?: number }
  externalVehicle?: { id: string; placa: string; brand?: string; model?: string; kmAtual?: number }
  plan?: { id: string; name: string; intervalKm?: number; intervalDays?: number }
  checklistExecution?: { id: string; status: string; startedAt?: string; finishedAt?: string; type: string }
  maintenance?: { id: string; status: string; scheduledDate: string; type: string }
}

type MaintenancePlanItem = {
  id: string
  name: string
  description?: string | null
  intervalKm?: number | null
  intervalDays?: number | null
  lastExecutionKm?: number | null
  lastExecutionDate?: string | null
  active: boolean
  vehicle?: { id: string; plate: string; brand?: string; model?: string; currentKm?: number }
  externalVehicle?: { id: string; placa: string; brand?: string; model?: string; kmAtual?: number }
  alerts?: { id: string; severity: string; status: string; title: string }[]
}

type MaintenancePurchaseRequestItem = {
  id: string
  status: string
  justification: string
  observation?: string | null
  createdAt: string
  requester?: { user?: { name: string } }
  department?: { name: string }
  items?: {
    id: string
    quantity: number
    product?: { name: string }
    unit?: { symbol: string }
    estimatedUnitPrice?: number
    description?: string
  }[]
}

const PURCHASE_STATUS_BADGE: Record<string, { label: string; className: string }> = {
  DRAFT: { label: 'Rascunho', className: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-300' },
  PENDING_APPROVAL: { label: 'Pendente Aprovação', className: 'bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300' },
  APPROVED: { label: 'Aprovada', className: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300' },
  REJECTED: { label: 'Rejeitada', className: 'bg-red-100 text-red-900 dark:bg-red-950/40 dark:text-red-300 border-red-300' },
  CANCELLED: { label: 'Cancelada', className: 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-300' },
}

const STATUS_BADGE: Record<
  MaintenanceRecord['status'],
  { label: string; className: string }
> = {
  SCHEDULED: {
    label: 'Agendada',
    className: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-800',
  },
  IN_PROGRESS: {
    label: 'Em andamento',
    className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60',
  },
  COMPLETED: {
    label: 'Concluída',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60',
  },
  CANCELLED: {
    label: 'Cancelada',
    className: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60',
  },
}

const ALERT_SEVERITY_BADGE: Record<
  MaintenanceAlertItem['severity'],
  { label: string; className: string }
> = {
  CRITICAL: { label: 'Crítico', className: 'bg-red-100 text-red-900 dark:bg-red-950/40 dark:text-red-300 border-red-300' },
  HIGH: { label: 'Alto', className: 'bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300' },
  MEDIUM: { label: 'Médio', className: 'bg-yellow-100 text-yellow-900 dark:bg-yellow-950/40 dark:text-yellow-300 border-yellow-300' },
  LOW: { label: 'Baixo', className: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-300' },
}

const ALERT_STATUS_BADGE: Record<
  MaintenanceAlertItem['status'],
  { label: string; className: string }
> = {
  OPEN: { label: 'Aberto', className: 'bg-blue-100 text-blue-900 dark:bg-blue-950/40 dark:text-blue-300 border-blue-300' },
  IN_REVIEW: { label: 'Em Análise', className: 'bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300' },
  RESOLVED: { label: 'Resolvido', className: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300' },
  DISMISSED: { label: 'Descartado', className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300' },
}

export default function MaintenancePage() {
  const { hasPermission } = useAuth()
  const canViewMaintenance = hasPermission('fleet.maintenance.view')
  const canManageMaintenance = hasPermission('fleet.maintenance.manage')
  const canExecuteMaintenance = hasPermission('fleet.maintenance.execute')
  const canRequestParts = canManageMaintenance || hasPermission('procurement.requests.create')

  const [activeTab, setActiveTab] = useState('orders')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [maintenancesLoadError, setMaintenancesLoadError] = useState<string | null>(null)
  const [vehiclesLoadError, setVehiclesLoadError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [maintenances, setMaintenances] = useState<MaintenanceRecord[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])

  // Alertas e Planos
  const [alerts, setAlerts] = useState<MaintenanceAlertItem[]>([])
  const [loadingAlerts, setLoadingAlerts] = useState(false)
  const [evaluatingPlans, setEvaluatingPlans] = useState(false)

  const [plans, setPlans] = useState<MaintenancePlanItem[]>([])
  const [loadingPlans, setLoadingPlans] = useState(false)

  // Nova Manutenção
  const [vehicleId, setVehicleId] = useState('')
  const [type, setType] = useState<MaintenanceRecord['type']>('PREVENTIVE')
  const [origin, setOrigin] = useState<MaintenanceRecord['origin']>('EXTERNAL')
  const [description, setDescription] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [estimatedCost, setEstimatedCost] = useState('')

  // Modal de Conclusão
  const [completeModalOpen, setCompleteModalOpen] = useState(false)
  const [selectedMaintenanceForComplete, setSelectedMaintenanceForComplete] = useState<MaintenanceRecord | null>(null)
  const [finalCost, setFinalCost] = useState('')
  const [completionObs, setCompletionObs] = useState('')
  const [completing, setCompleting] = useState(false)

  // Diário de Bordo / Notas
  const [notesModalOpen, setNotesModalOpen] = useState(false)
  const [selectedMaintenanceForNotes, setSelectedMaintenanceForNotes] = useState<MaintenanceRecord | null>(null)
  const [notesList, setNotesList] = useState<MaintenanceNoteItem[]>([])
  const [loadingNotes, setLoadingNotes] = useState(false)
  const [newNoteContent, setNewNoteContent] = useState('')
  const [submittingNote, setSubmittingNote] = useState(false)

  // Peças / Requisições de Compras (RF10, D08)
  const [partsModalOpen, setPartsModalOpen] = useState(false)
  const [selectedMaintenanceForParts, setSelectedMaintenanceForParts] = useState<MaintenanceRecord | null>(null)
  const [partsRequestsList, setPartsRequestsList] = useState<MaintenancePurchaseRequestItem[]>([])
  const [loadingParts, setLoadingParts] = useState(false)
  const [showNewPartForm, setShowNewPartForm] = useState(false)
  const [partDescription, setPartDescription] = useState('')
  const [partQuantity, setPartQuantity] = useState('1')
  const [partEstimatedPrice, setPartEstimatedPrice] = useState('')
  const [partJustification, setPartJustification] = useState('')
  const [submittingPart, setSubmittingPart] = useState(false)

  // Modal de Triagem de Alerta (AC-02, AC-03 / D05)
  const [triageModalOpen, setTriageModalOpen] = useState(false)
  const [selectedAlertForTriage, setSelectedAlertForTriage] = useState<MaintenanceAlertItem | null>(null)
  const [triageAction, setTriageAction] = useState<'IN_REVIEW' | 'DISMISSED' | 'OPEN_MAINTENANCE'>('OPEN_MAINTENANCE')
  const [triageReason, setTriageReason] = useState('')
  const [triageScheduledDate, setTriageScheduledDate] = useState('')
  const [triageEstimatedCost, setTriageEstimatedCost] = useState('')
  const [submittingTriage, setSubmittingTriage] = useState(false)

  // Modal de Novo Plano Preventivo (RF07)
  const [planModalOpen, setPlanModalOpen] = useState(false)
  const [planVehicleId, setPlanVehicleId] = useState('')
  const [planName, setPlanName] = useState('')
  const [planDescription, setPlanDescription] = useState('')
  const [planIntervalKm, setPlanIntervalKm] = useState('')
  const [planIntervalDays, setPlanIntervalDays] = useState('')
  const [planLastKm, setPlanLastKm] = useState('')
  const [planLastDate, setPlanLastDate] = useState('')
  const [submittingPlan, setSubmittingPlan] = useState(false)

  async function loadData(isInitial = false) {
    if (isInitial) setLoading(true)
    else setRefreshing(true)

    setLoadError(null)
    setMaintenancesLoadError(null)
    setVehiclesLoadError(null)

    const [maintenancesRes, vehiclesRes] = await Promise.allSettled([
      api.get('/fleet/maintenance'),
      api.get('/fleet/vehicles'),
    ])

    if (maintenancesRes.status === 'fulfilled') {
      const data = maintenancesRes.value.data
      setMaintenances(Array.isArray(data) ? data : data?.items || [])
    } else {
      const msg = getApiErrorMessage(maintenancesRes.reason, 'Erro ao carregar manutenções.')
      setMaintenancesLoadError(msg)
      toast.error(msg)
    }

    if (vehiclesRes.status === 'fulfilled') {
      const data = vehiclesRes.value.data
      setVehicles(Array.isArray(data) ? data : data?.items || [])
    } else {
      const msg = getApiErrorMessage(vehiclesRes.reason, 'Erro ao carregar veículos para agendamento.')
      setVehiclesLoadError(msg)
      toast.error(msg)
    }

    if (maintenancesRes.status === 'rejected' && vehiclesRes.status === 'rejected') {
      setLoadError('Não foi possível obter dados de manutenção ou veículos no momento.')
    }

    setLoading(false)
    setRefreshing(false)
  }

  async function loadAlerts() {
    setLoadingAlerts(true)
    try {
      const res = await api.get('/fleet/maintenance/alerts')
      const data = res.data
      setAlerts(Array.isArray(data) ? data : data?.items || [])
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, 'Erro ao carregar alertas de manutenção.'))
    } finally {
      setLoadingAlerts(false)
    }
  }

  async function loadPlans() {
    setLoadingPlans(true)
    try {
      const res = await api.get('/fleet/maintenance/plans')
      const data = res.data
      setPlans(Array.isArray(data) ? data : data?.items || [])
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, 'Erro ao carregar planos de manutenção.'))
    } finally {
      setLoadingPlans(false)
    }
  }

  useEffect(() => {
    if (canViewMaintenance) {
      void loadData(true)
      void loadAlerts()
      void loadPlans()
    }
  }, [canViewMaintenance])

  async function handleEvaluatePlans() {
    setEvaluatingPlans(true)
    try {
      const res = await api.post('/fleet/maintenance/plans/evaluate', {})
      const result = res.data
      toast.success(
        `Avaliação concluída: ${result.evaluatedCount} planos avaliados, ${result.alertsCreated} novos alertas gerados, ${result.alertsUpdated} atualizados.`,
      )
      await loadAlerts()
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, 'Erro ao disparar avaliação de planos.'))
    } finally {
      setEvaluatingPlans(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!vehicleId || !description.trim() || !scheduledDate) {
      toast.error('Preencha veículo, descrição e data agendada.')
      return
    }

    setSubmitting(true)
    try {
      await api.post('/fleet/maintenance', {
        vehicleId,
        type,
        origin,
        description: description.trim(),
        scheduledDate: new Date(scheduledDate).toISOString(),
        estimatedCost: estimatedCost ? Number(estimatedCost) : undefined,
      })

      toast.success('Manutenção agendada com sucesso!')
      setOpen(false)
      setVehicleId('')
      setDescription('')
      setScheduledDate('')
      setEstimatedCost('')
      await loadData(false)
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, 'Erro ao agendar manutenção.'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleStartMaintenance(maintenance: MaintenanceRecord) {
    if (
      !confirm(
        `Deseja iniciar formalmente o serviço para ${maintenance.vehicle?.plate}? O veículo será marcado em MANUTENÇÃO e bloqueado para novas rotas.`,
      )
    ) {
      return
    }

    try {
      await api.post(`/fleet/maintenance/${maintenance.id}/start`)
      toast.success('Manutenção iniciada! O veículo foi bloqueado para operações.')
      await loadData(false)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao iniciar manutenção.')
    }
  }

  function handleOpenCompleteModal(maintenance: MaintenanceRecord) {
    setSelectedMaintenanceForComplete(maintenance)
    setFinalCost(maintenance.estimatedCost ? String(maintenance.estimatedCost) : '')
    setCompletionObs('')
    setCompleteModalOpen(true)
  }

  async function handleConfirmComplete() {
    if (!selectedMaintenanceForComplete) return
    setCompleting(true)
    try {
      await api.post(`/fleet/maintenance/${selectedMaintenanceForComplete.id}/complete`, {
        finalCost: finalCost ? Number(finalCost) : undefined,
        observations: completionObs.trim() || undefined,
      })
      toast.success('Manutenção concluída! Se não houver outros bloqueios, o veículo foi liberado.')
      setCompleteModalOpen(false)
      await loadData(false)
      await loadAlerts()
      await loadPlans()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao concluir manutenção.')
    } finally {
      setCompleting(false)
    }
  }

  async function handleCancelMaintenance(maintenance: MaintenanceRecord) {
    const reason = prompt('Informe o motivo do cancelamento:')
    if (reason === null) return

    try {
      await api.post(`/fleet/maintenance/${maintenance.id}/cancel`, {
        reason: reason.trim() || 'Cancelado pelo operador',
      })
      toast.success('Manutenção cancelada com sucesso.')
      await loadData(false)
      await loadAlerts()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao cancelar manutenção.')
    }
  }

  async function handleOpenNotesModal(maintenance: MaintenanceRecord) {
    setSelectedMaintenanceForNotes(maintenance)
    setNotesModalOpen(true)
    setNewNoteContent('')
    setLoadingNotes(true)
    try {
      const res = await api.get(`/fleet/maintenance/${maintenance.id}/notes`)
      setNotesList(res.data || [])
    } catch {
      setNotesList([])
    } finally {
      setLoadingNotes(false)
    }
  }

  async function handleAddNote() {
    if (!selectedMaintenanceForNotes || !newNoteContent.trim()) return
    setSubmittingNote(true)
    try {
      await api.post(`/fleet/maintenance/${selectedMaintenanceForNotes.id}/notes`, {
        content: newNoteContent.trim(),
      })
      toast.success('Apontamento adicionado ao diário de bordo!')
      setNewNoteContent('')
      const res = await api.get(`/fleet/maintenance/${selectedMaintenanceForNotes.id}/notes`)
      setNotesList(res.data || [])
    } catch {
      toast.error('Erro ao adicionar nota.')
    } finally {
      setSubmittingNote(false)
    }
  }

  // Triagem de Alerta (AC-02, AC-03 / D05)
  function handleOpenTriage(alert: MaintenanceAlertItem) {
    setSelectedAlertForTriage(alert)
    setTriageAction('OPEN_MAINTENANCE')
    setTriageReason('')
    setTriageScheduledDate('')
    setTriageEstimatedCost('')
    setTriageModalOpen(true)
  }

  async function handleConfirmTriage() {
    if (!selectedAlertForTriage) return
    if (triageAction === 'DISMISSED' && !triageReason.trim()) {
      toast.error('Justificativa é obrigatória para descartar um alerta.')
      return
    }

    setSubmittingTriage(true)
    try {
      await api.post(`/fleet/maintenance/alerts/${selectedAlertForTriage.id}/triage`, {
        action: triageAction,
        reason: triageReason.trim() || undefined,
        scheduledDate: triageScheduledDate ? new Date(triageScheduledDate).toISOString() : undefined,
        estimatedCost: triageEstimatedCost ? Number(triageEstimatedCost) : undefined,
      })

      toast.success(
        triageAction === 'OPEN_MAINTENANCE'
          ? 'Ordem de serviço criada em agendamento!'
          : triageAction === 'DISMISSED'
          ? 'Alerta descartado justificadamente.'
          : 'Alerta colocado em análise.',
      )
      setTriageModalOpen(false)
      await loadAlerts()
      await loadData(false)
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, 'Erro ao realizar triagem do alerta.'))
    } finally {
      setSubmittingTriage(false)
    }
  }

  // Novo Plano Preventivo (RF07)
  async function handleCreatePlan(e: React.FormEvent) {
    e.preventDefault()
    if (!planVehicleId || !planName.trim()) {
      toast.error('Informe o veículo e o nome do plano.')
      return
    }
    if (!planIntervalKm && !planIntervalDays) {
      toast.error('Informe pelo menos um intervalo (KM ou Dias).')
      return
    }

    setSubmittingPlan(true)
    try {
      await api.post('/fleet/maintenance/plans', {
        vehicleId: planVehicleId,
        name: planName.trim(),
        description: planDescription.trim() || undefined,
        intervalKm: planIntervalKm ? Number(planIntervalKm) : undefined,
        intervalDays: planIntervalDays ? Number(planIntervalDays) : undefined,
        lastExecutionKm: planLastKm ? Number(planLastKm) : undefined,
        lastExecutionDate: planLastDate ? new Date(planLastDate).toISOString() : undefined,
      })

      toast.success('Plano de manutenção criado com sucesso!')
      setPlanModalOpen(false)
      setPlanName('')
      setPlanDescription('')
      setPlanVehicleId('')
      setPlanIntervalKm('')
      setPlanIntervalDays('')
      setPlanLastKm('')
      setPlanLastDate('')
      await loadPlans()
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, 'Erro ao criar plano de manutenção.'))
    } finally {
      setSubmittingPlan(false)
    }
  }

  async function handleDeletePlan(plan: MaintenancePlanItem) {
    if (!confirm(`Deseja desativar o plano "${plan.name}"?`)) return
    try {
      await api.delete(`/fleet/maintenance/plans/${plan.id}`)
      toast.success('Plano desativado.')
      await loadPlans()
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, 'Erro ao desativar plano.'))
    }
  }

  const handleOpenPartsModal = async (maintenance: MaintenanceRecord) => {
    setSelectedMaintenanceForParts(maintenance)
    setPartsModalOpen(true)
    setShowNewPartForm(false)
    setLoadingParts(true)
    try {
      const res = await api.get(`/fleet/maintenance/${maintenance.id}/parts`)
      setPartsRequestsList(res.data)
    } catch (err) {
      toast.error('Erro ao carregar peças solicitadas', {
        description: getApiErrorMessage(err),
      })
    } finally {
      setLoadingParts(false)
    }
  }

  const handleCreatePartsRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMaintenanceForParts || !partDescription.trim()) return

    setSubmittingPart(true)
    try {
      await api.post(`/fleet/maintenance/${selectedMaintenanceForParts.id}/parts`, {
        items: [
          {
            description: partDescription.trim(),
            quantity: Number(partQuantity) || 1,
            estimatedUnitPrice: partEstimatedPrice ? Number(partEstimatedPrice) : undefined,
          },
        ],
        justification: partJustification.trim() || undefined,
      })
      toast.success('Requisição de peças criada em DRAFT no módulo de Compras!')
      setPartDescription('')
      setPartQuantity('1')
      setPartEstimatedPrice('')
      setPartJustification('')
      setShowNewPartForm(false)
      const res = await api.get(`/fleet/maintenance/${selectedMaintenanceForParts.id}/parts`)
      setPartsRequestsList(res.data)
    } catch (err) {
      toast.error('Erro ao solicitar peças', {
        description: getApiErrorMessage(err),
      })
    } finally {
      setSubmittingPart(false)
    }
  }

  const scheduledCount = useMemo(
    () => maintenances.filter((m) => m.status === 'SCHEDULED').length,
    [maintenances],
  )
  const inProgressCount = useMemo(
    () => maintenances.filter((m) => m.status === 'IN_PROGRESS').length,
    [maintenances],
  )
  const totalEstimatedCost = useMemo(
    () =>
      maintenances.reduce((acc, curr) => {
        const cost = curr.finalCost ?? curr.estimatedCost ?? 0
        return acc + Number(cost)
      }, 0),
    [maintenances],
  )

  const openAlertsCount = useMemo(
    () => alerts.filter((a) => a.status === 'OPEN').length,
    [alerts],
  )
  const criticalAlertsCount = useMemo(
    () => alerts.filter((a) => (a.severity === 'CRITICAL' || a.severity === 'HIGH') && a.status === 'OPEN').length,
    [alerts],
  )

  const hasPartialLoadIssue = Boolean(maintenancesLoadError || vehiclesLoadError)

  // Filtros de Ordens
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [page, setPage] = useState(1)
  const pageSize = 10

  const filteredMaintenances = useMemo(() => {
    return maintenances.filter((m) => {
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim()
        const matchPlate = m.vehicle?.plate?.toLowerCase().includes(query)
        const matchModel = m.vehicle?.model?.toLowerCase().includes(query)
        const matchDesc = m.description?.toLowerCase().includes(query)
        if (!matchPlate && !matchModel && !matchDesc) return false
      }
      if (statusFilter !== 'ALL' && m.status !== statusFilter) return false
      if (typeFilter !== 'ALL' && m.type !== typeFilter) return false
      return true
    })
  }, [maintenances, searchTerm, statusFilter, typeFilter])

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (searchTerm.trim()) count++
    if (statusFilter !== 'ALL') count++
    if (typeFilter !== 'ALL') count++
    return count
  }, [searchTerm, statusFilter, typeFilter])

  const totalPages = Math.max(1, Math.ceil(filteredMaintenances.length / pageSize))
  const paginatedMaintenances = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredMaintenances.slice(start, start + pageSize)
  }, [filteredMaintenances, page, pageSize])

  useEffect(() => {
    if (page > totalPages) setPage(1)
  }, [page, totalPages])

  return (
    <div className="app-page space-y-6 p-4 md:p-6">
      {/* 1. Page Header padrão TocLog */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Manutenção e Serviços
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestão de ordens, ciclo de vida, alertas preditivos por KM/data e planos preventivos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canManageMaintenance ? (
            <Dialog open={open} onOpenChange={setOpen}>
              <Button
                size="sm"
                onClick={() => setOpen(true)}
                disabled={Boolean(vehiclesLoadError)}
                className="h-9 gap-1.5 font-semibold"
              >
                <Plus className="size-4" />
                <span>+ Agendar manutenção</span>
              </Button>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Agendar manutenção</DialogTitle>
                  <DialogDescription>
                    Registre uma ordem de serviço preventiva ou corretiva para o veículo.
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="vehicleId">Veículo *</Label>
                    <Select value={vehicleId} onValueChange={setVehicleId}>
                      <SelectTrigger id="vehicleId" disabled={Boolean(vehiclesLoadError)}>
                        <SelectValue placeholder="Selecione o veículo" />
                      </SelectTrigger>
                      <SelectContent>
                        {vehicles.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.plate} • {v.model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="type">Tipo</Label>
                      <Select value={type} onValueChange={(val) => setType(val as MaintenanceRecord['type'])}>
                        <SelectTrigger id="type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PREVENTIVE">Preventiva</SelectItem>
                          <SelectItem value="CORRECTIVE">Corretiva</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="origin">Origem</Label>
                      <Select value={origin} onValueChange={(val) => setOrigin(val as MaintenanceRecord['origin'])}>
                        <SelectTrigger id="origin">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="INTERNAL">Interna (Garagem)</SelectItem>
                          <SelectItem value="EXTERNAL">Externa (Oficina terceirizada)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição do Serviço *</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Ex: Troca de pastilhas de freio e óleo de motor"
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="scheduledDate">Data Agendada *</Label>
                      <Input
                        id="scheduledDate"
                        type="datetime-local"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="estimatedCost">Custo Estimado (R$)</Label>
                      <Input
                        id="estimatedCost"
                        type="number"
                        min="0"
                        step="0.01"
                        value={estimatedCost}
                        onChange={(e) => setEstimatedCost(e.target.value)}
                        placeholder="0,00"
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting ? 'Agendando...' : 'Confirmar Agendamento'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          ) : null}

          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            onClick={() => {
              void loadData(false)
              void loadAlerts()
              void loadPlans()
            }}
            disabled={loading || refreshing}
          >
            <RotateCw className={`size-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </Button>

          <Button asChild variant="outline" size="sm" className="h-9">
            <Link href="/dashboard/fleet">Veículos</Link>
          </Button>
        </div>
      </section>

      {!canViewMaintenance ? (
        <WorkspaceStateCard title="Acesso restrito">
          <p className="text-sm text-slate-500">Este perfil não tem permissão para visualizar o módulo de manutenção.</p>
        </WorkspaceStateCard>
      ) : (
        <>
          {loadError ? (
            <WorkspaceStateCard title="Falha de leitura" tone="danger">
              <p className="text-sm text-red-600">{loadError}</p>
            </WorkspaceStateCard>
          ) : null}

          {/* NAVEGAÇÃO EM ABAS TOCLOG */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
              <TabsTrigger value="orders" className="gap-2">
                <Wrench className="h-4 w-4" />
                <span>Ordens de Serviço</span>
                <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                  {maintenances.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="alerts" className="gap-2">
                <Bell className="h-4 w-4 text-amber-500" />
                <span>Alertas & Triagem (RF07)</span>
                {openAlertsCount > 0 && (
                  <Badge className="ml-1 px-1.5 py-0 text-xs bg-red-600 text-white">
                    {openAlertsCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="plans" className="gap-2">
                <Sliders className="h-4 w-4 text-blue-500" />
                <span>Planos Preventivos (RF07)</span>
                <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                  {plans.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            {/* ABA 1: ORDENS DE SERVIÇO */}
            <TabsContent value="orders" className="space-y-6">
              {/* 4 KPIs Operacionais TocLog */}
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <Card className="app-section-card p-4 transition-all hover:shadow-xs">
                  <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Total de Ordens
                  </CardDescription>
                  <CardTitle className="mt-1 text-3xl font-bold tracking-tight text-foreground">
                    {maintenances.length}
                  </CardTitle>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Ordens cadastradas
                  </div>
                </Card>

                <Card className="app-section-card p-4 transition-all hover:shadow-xs">
                  <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Em Andamento
                  </CardDescription>
                  <CardTitle className="mt-1 text-3xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
                    {inProgressCount}
                  </CardTitle>
                  <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                    <Wrench className="size-3.5 text-amber-500" />
                    <span>Em execução</span>
                  </div>
                </Card>

                <Card className="app-section-card p-4 transition-all hover:shadow-xs">
                  <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Agendadas
                  </CardDescription>
                  <CardTitle className="mt-1 text-3xl font-bold tracking-tight text-sky-600 dark:text-sky-400">
                    {scheduledCount}
                  </CardTitle>
                  <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="size-3.5 text-sky-500" />
                    <span>Programadas</span>
                  </div>
                </Card>

                <Card className="app-section-card p-4 transition-all hover:shadow-xs">
                  <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Custo Consolidado
                  </CardDescription>
                  <CardTitle className="mt-1 text-2xl font-bold tracking-tight text-foreground">
                    R$ {totalEstimatedCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </CardTitle>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Total previsto / final
                  </div>
                </Card>
              </div>

              {/* TABELA DE MANUTENÇÕES */}
              <Card className="app-section-card">
                <CardHeader className="gap-4 pb-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
                        Ordens de Serviço e Manutenção
                      </CardTitle>
                      <CardDescription>
                        Histórico operacional com ações de início de serviço, conclusão e diário de bordo
                      </CardDescription>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative w-64">
                        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          value={searchTerm}
                          onChange={(e) => {
                            setSearchTerm(e.target.value)
                            setPage(1)
                          }}
                          placeholder="Buscar placa, modelo, descrição..."
                          className="h-9 pl-9 text-sm"
                        />
                      </div>

                      <FilterPopover
                        activeCount={activeFilterCount}
                        onClear={() => {
                          setSearchTerm('')
                          setStatusFilter('ALL')
                          setTypeFilter('ALL')
                          setPage(1)
                        }}
                        onApply={() => setPage(1)}
                      >
                        <div className="space-y-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              Status da Ordem
                            </Label>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                              <SelectTrigger className="h-9 text-sm">
                                <SelectValue placeholder="Todos os status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ALL">Todos os status</SelectItem>
                                <SelectItem value="SCHEDULED">Agendada</SelectItem>
                                <SelectItem value="IN_PROGRESS">Em andamento</SelectItem>
                                <SelectItem value="COMPLETED">Concluída</SelectItem>
                                <SelectItem value="CANCELLED">Cancelada</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              Tipo
                            </Label>
                            <Select value={typeFilter} onValueChange={setTypeFilter}>
                              <SelectTrigger className="h-9 text-sm">
                                <SelectValue placeholder="Todos os tipos" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ALL">Todos os tipos</SelectItem>
                                <SelectItem value="PREVENTIVE">Preventiva</SelectItem>
                                <SelectItem value="CORRECTIVE">Corretiva</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </FilterPopover>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <Table>
                      <TableHeader className="bg-slate-50 dark:bg-slate-900">
                        <TableRow>
                          <TableHead>Veículo</TableHead>
                          <TableHead>Serviço / Descrição</TableHead>
                          <TableHead>Data Agendada</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Custo</TableHead>
                          <TableHead className="text-right">Ações Operacionais</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loading ? (
                          Array.from({ length: 4 }).map((_, idx) => (
                            <TableRow key={idx}>
                              <TableCell colSpan={6}>
                                <Skeleton className="h-8 w-full" />
                              </TableCell>
                            </TableRow>
                          ))
                        ) : paginatedMaintenances.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                              Nenhuma ordem de serviço encontrada com os filtros selecionados.
                            </TableCell>
                          </TableRow>
                        ) : (
                          paginatedMaintenances.map((m) => {
                            const statusBadge = STATUS_BADGE[m.status] || {
                              label: m.status,
                              className: 'bg-slate-100 text-slate-700',
                            }

                            return (
                              <TableRow key={m.id}>
                                <TableCell>
                                  <div className="font-semibold text-slate-900 dark:text-slate-100">
                                    {m.vehicle?.plate || '—'}
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    {m.vehicle?.model || 'Próprio'}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="font-medium text-slate-800 dark:text-slate-200">
                                    {m.description}
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    {m.type === 'PREVENTIVE' ? 'Preventiva' : 'Corretiva'} • {m.origin === 'INTERNAL' ? 'Interna' : 'Oficina'}
                                  </div>
                                </TableCell>
                                <TableCell className="text-sm text-slate-600 dark:text-slate-400">
                                  {new Date(m.scheduledDate).toLocaleDateString('pt-BR')} {new Date(m.scheduledDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </TableCell>
                                <TableCell>
                                  <Badge className={statusBadge.className}>
                                    {statusBadge.label}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right font-medium text-slate-900 dark:text-slate-100">
                                  {m.finalCost != null ? (
                                    <span>R$ {Number(m.finalCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                  ) : m.estimatedCost != null ? (
                                    <span className="text-slate-500 text-xs">(Est.) R$ {Number(m.estimatedCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                  ) : (
                                    <span className="text-slate-400">—</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    {/* Botão Diário de Bordo */}
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleOpenNotesModal(m)}
                                      title="Diário de Bordo / Apontamentos"
                                      className="h-8 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                                    >
                                      <MessageSquare className="h-4 w-4" />
                                    </Button>

                                    {/* Peças & Compras (RF10, D08) */}
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleOpenPartsModal(m)}
                                      title="Peças & Compras (RF10)"
                                      className="h-8 px-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                                    >
                                      <Package className="h-4 w-4" />
                                    </Button>

                                    {/* Ações por status */}
                                    {m.status === 'SCHEDULED' && canExecuteMaintenance && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleStartMaintenance(m)}
                                        className="h-8 gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border-emerald-200"
                                      >
                                        <Play className="h-3.5 w-3.5" />
                                        Iniciar
                                      </Button>
                                    )}

                                    {m.status === 'IN_PROGRESS' && canExecuteMaintenance && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleOpenCompleteModal(m)}
                                        className="h-8 gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40 border-blue-200"
                                      >
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                        Concluir
                                      </Button>
                                    )}

                                    {(m.status === 'SCHEDULED' || m.status === 'IN_PROGRESS') && canManageMaintenance && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleCancelMaintenance(m)}
                                        className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                                        title="Cancelar manutenção"
                                      >
                                        <XCircle className="h-4 w-4" />
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

                  {/* Rodapé com Paginação Real */}
                  <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                    <div>
                      Exibindo {paginatedMaintenances.length} de {filteredMaintenances.length} ordens
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                      >
                        Anterior
                      </Button>
                      <span className="text-xs">
                        Página {page} de {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        Próxima
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ABA 2: ALERTAS & TRIAGEM (RF07) */}
            <TabsContent value="alerts" className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Alertas de Manutenção e Triagem (RF07)
                  </h3>
                  <p className="text-sm text-slate-500">
                    Gatilhos automáticos disparados por odômetro (KM), periodicidade por data e falhas de checklist (NOK)
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={handleEvaluatePlans}
                  disabled={evaluatingPlans}
                  className="bg-amber-600 hover:bg-amber-700 text-white gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${evaluatingPlans ? 'animate-spin' : ''}`} />
                  {evaluatingPlans ? 'Avaliando planos...' : 'Disparar Avaliação de Gatilhos'}
                </Button>
              </div>

              {/* KPIs de Alertas */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card className="border-slate-200 dark:border-slate-800">
                  <CardHeader className="pb-2">
                    <CardDescription>Alertas Abertos</CardDescription>
                    <CardTitle className="text-2xl font-bold text-blue-600">
                      {openAlertsCount}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card className="border-slate-200 dark:border-slate-800">
                  <CardHeader className="pb-2">
                    <CardDescription>Críticos / Limite Atingido</CardDescription>
                    <CardTitle className="text-2xl font-bold text-red-600">
                      {criticalAlertsCount}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card className="border-slate-200 dark:border-slate-800">
                  <CardHeader className="pb-2">
                    <CardDescription>Em Análise pelo Gestor</CardDescription>
                    <CardTitle className="text-2xl font-bold text-amber-600">
                      {alerts.filter((a) => a.status === 'IN_REVIEW').length}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card className="border-slate-200 dark:border-slate-800">
                  <CardHeader className="pb-2">
                    <CardDescription>Resolvidos no Ciclo</CardDescription>
                    <CardTitle className="text-2xl font-bold text-emerald-600">
                      {alerts.filter((a) => a.status === 'RESOLVED').length}
                    </CardTitle>
                  </CardHeader>
                </Card>
              </div>

              {/* TABELA DE ALERTAS */}
              <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    Fila de Triagem de Alertas
                  </CardTitle>
                  <CardDescription>
                    Cada alerta exige triagem do gestor antes de iniciar ordens no sistema
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <Table>
                      <TableHeader className="bg-slate-50 dark:bg-slate-900">
                        <TableRow>
                          <TableHead>Severidade</TableHead>
                          <TableHead>Veículo</TableHead>
                          <TableHead>Título / Origem</TableHead>
                          <TableHead>Detalhes</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Triagem</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loadingAlerts ? (
                          Array.from({ length: 4 }).map((_, idx) => (
                            <TableRow key={idx}>
                              <TableCell colSpan={6}>
                                <Skeleton className="h-8 w-full" />
                              </TableCell>
                            </TableRow>
                          ))
                        ) : alerts.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                              Nenhum alerta de manutenção pendente no momento.
                            </TableCell>
                          </TableRow>
                        ) : (
                          alerts.map((al) => {
                            const sev = ALERT_SEVERITY_BADGE[al.severity] || { label: al.severity, className: 'bg-slate-100 text-slate-800' }
                            const st = ALERT_STATUS_BADGE[al.status] || { label: al.status, className: 'bg-slate-100 text-slate-800' }
                            const vPlate = al.vehicle?.plate || al.externalVehicle?.placa || '—'

                            return (
                              <TableRow key={al.id}>
                                <TableCell>
                                  <Badge className={sev.className}>{sev.label}</Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="font-semibold text-slate-900 dark:text-slate-100">{vPlate}</div>
                                  <div className="text-xs text-slate-500">
                                    KM Atual: {al.vehicle?.currentKm ?? al.externalVehicle?.kmAtual ?? '—'}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="font-medium text-slate-900 dark:text-slate-100">{al.title}</div>
                                  <div className="text-xs text-slate-500">
                                    {al.plan ? `Plano: ${al.plan.name}` : al.checklistExecution ? 'Checklist NOK' : 'Sistema'}
                                  </div>
                                </TableCell>
                                <TableCell className="text-xs text-slate-600 dark:text-slate-400 max-w-xs truncate">
                                  {al.description || '—'}
                                </TableCell>
                                <TableCell>
                                  <Badge className={st.className}>{st.label}</Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  {al.status !== 'RESOLVED' && al.status !== 'DISMISSED' && canManageMaintenance ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleOpenTriage(al)}
                                      className="h-8 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                                    >
                                      Triar Alerta
                                    </Button>
                                  ) : (
                                    <span className="text-xs text-slate-400">Tratado</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            )
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ABA 3: PLANOS PREVENTIVOS (RF07) */}
            <TabsContent value="plans" className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Planos de Manutenção Preventiva
                  </h3>
                  <p className="text-sm text-slate-500">
                    Configuração de rotinas por veículo com intervalos de quilometragem e dias
                  </p>
                </div>
                {canManageMaintenance && (
                  <Button
                    size="sm"
                    onClick={() => setPlanModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Novo Plano Preventivo
                  </Button>
                )}
              </div>

              {/* TABELA DE PLANOS */}
              <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    Catálogo de Planos Ativos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <Table>
                      <TableHeader className="bg-slate-50 dark:bg-slate-900">
                        <TableRow>
                          <TableHead>Nome do Plano</TableHead>
                          <TableHead>Veículo</TableHead>
                          <TableHead>Intervalo KM</TableHead>
                          <TableHead>Intervalo Dias</TableHead>
                          <TableHead>Última Execução</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loadingPlans ? (
                          Array.from({ length: 4 }).map((_, idx) => (
                            <TableRow key={idx}>
                              <TableCell colSpan={7}>
                                <Skeleton className="h-8 w-full" />
                              </TableCell>
                            </TableRow>
                          ))
                        ) : plans.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                              Nenhum plano de manutenção preventiva cadastrado.
                            </TableCell>
                          </TableRow>
                        ) : (
                          plans.map((p) => {
                            const vPlate = p.vehicle?.plate || p.externalVehicle?.placa || '—'
                            const vKm = p.vehicle?.currentKm ?? p.externalVehicle?.kmAtual ?? 0

                            return (
                              <TableRow key={p.id}>
                                <TableCell>
                                  <div className="font-semibold text-slate-900 dark:text-slate-100">{p.name}</div>
                                  {p.description && <div className="text-xs text-slate-500">{p.description}</div>}
                                </TableCell>
                                <TableCell>
                                  <div className="font-medium text-slate-900 dark:text-slate-100">{vPlate}</div>
                                  <div className="text-xs text-slate-500">KM Atual: {vKm}</div>
                                </TableCell>
                                <TableCell className="text-sm">
                                  {p.intervalKm ? `${p.intervalKm.toLocaleString('pt-BR')} km` : '—'}
                                </TableCell>
                                <TableCell className="text-sm">
                                  {p.intervalDays ? `${p.intervalDays} dias` : '—'}
                                </TableCell>
                                <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                                  {p.lastExecutionKm != null || p.lastExecutionDate != null ? (
                                    <>
                                      {p.lastExecutionKm != null && <div>{p.lastExecutionKm.toLocaleString('pt-BR')} km</div>}
                                      {p.lastExecutionDate != null && (
                                        <div>{new Date(p.lastExecutionDate).toLocaleDateString('pt-BR')}</div>
                                      )}
                                    </>
                                  ) : (
                                    <span className="text-amber-600 font-medium">Base não informada</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Badge className={p.active ? 'bg-emerald-100 text-emerald-900' : 'bg-slate-100 text-slate-700'}>
                                    {p.active ? 'Ativo' : 'Inativo'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  {p.active && canManageMaintenance && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleDeletePlan(p)}
                                      className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                      Desativar
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            )
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* MODAL DE CONCLUSÃO DE MANUTENÇÃO (AC-02, AC-04) */}
      <Dialog open={completeModalOpen} onOpenChange={setCompleteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Concluir Ordem de Serviço</DialogTitle>
            <DialogDescription>
              Confirme a finalização do serviço para o veículo{' '}
              <strong className="text-slate-900 dark:text-slate-100">
                {selectedMaintenanceForComplete?.vehicle?.plate}
              </strong>
              .
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="finalCost">Custo Real Final (R$)</Label>
              <Input
                id="finalCost"
                type="number"
                min="0"
                step="0.01"
                placeholder="Ex: 450.00"
                value={finalCost}
                onChange={(e) => setFinalCost(e.target.value)}
              />
              <p className="text-xs text-slate-500">
                Custo estimado original: R${' '}
                {selectedMaintenanceForComplete?.estimatedCost != null
                  ? Number(selectedMaintenanceForComplete.estimatedCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
                  : '0,00'}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="completionObs">Observações do Serviço</Label>
              <Textarea
                id="completionObs"
                placeholder="Ex: Peças trocadas, garantia de 90 dias com fornecedor X..."
                value={completionObs}
                onChange={(e) => setCompletionObs(e.target.value)}
              />
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-xs text-blue-800 dark:text-blue-300">
              Ao concluir, os bloqueios desta manutenção serão resolvidos e a base dos planos preventivos será atualizada com os dados reais.
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteModalOpen(false)} disabled={completing}>
              Voltar
            </Button>
            <Button onClick={handleConfirmComplete} disabled={completing} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {completing ? 'Concluindo...' : 'Confirmar Conclusão'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DIÁRIO DE BORDO / NOTAS (AC-03) */}
      <Dialog open={notesModalOpen} onOpenChange={setNotesModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              Diário de Bordo da Manutenção
            </DialogTitle>
            <DialogDescription>
              {selectedMaintenanceForNotes?.vehicle?.plate} • {selectedMaintenanceForNotes?.description}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-3 py-2 pr-1">
            {loadingNotes ? (
              <div className="py-6 text-center text-sm text-slate-500">Carregando notas...</div>
            ) : notesList.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500 border border-dashed rounded-lg">
                Nenhum apontamento registrado ainda neste serviço.
              </div>
            ) : (
              notesList.map((n) => (
                <div key={n.id} className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {n.author?.name || 'Operador'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(n.createdAt).toLocaleDateString('pt-BR')} {new Date(n.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm text-slate-900 dark:text-slate-100 whitespace-pre-wrap">
                    {n.content}
                  </p>
                </div>
              ))
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <Label htmlFor="newNote" className="text-xs uppercase font-semibold text-slate-500">
              Novo Apontamento
            </Label>
            <div className="flex gap-2">
              <Input
                id="newNote"
                placeholder="Ex: Peça chegou da oficina, aguardando instalação..."
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleAddNote()
                  }
                }}
              />
              <Button
                onClick={handleAddNote}
                disabled={submittingNote || !newNoteContent.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL DE PEÇAS & COMPRAS (RF10, D08) */}
      <Dialog open={partsModalOpen} onOpenChange={setPartsModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between pr-4">
              <span className="flex items-center gap-2">
                <Package className="h-5 w-5 text-indigo-600" />
                Peças no Fluxo de Compras (RF10, D08)
              </span>
              {canRequestParts && !showNewPartForm && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowNewPartForm(true)}
                  className="h-8 text-xs gap-1 border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Solicitar Peça
                </Button>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedMaintenanceForParts?.vehicle?.plate} • {selectedMaintenanceForParts?.description}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
            {showNewPartForm && (
              <Card className="border-indigo-200 dark:border-indigo-900 bg-indigo-50/30 dark:bg-indigo-950/20">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm font-semibold text-indigo-900 dark:text-indigo-200 flex items-center justify-between">
                    <span>Nova Requisição de Peças</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowNewPartForm(false)}
                      className="h-6 w-6 p-0 text-slate-500"
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <form onSubmit={handleCreatePartsRequest} className="space-y-3">
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="md:col-span-2 space-y-1">
                        <Label htmlFor="partDesc" className="text-xs">Descrição da Peça *</Label>
                        <Input
                          id="partDesc"
                          placeholder="Ex: Pastilha de freio dianteira Bosch"
                          value={partDescription}
                          onChange={(e) => setPartDescription(e.target.value)}
                          required
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="partQty" className="text-xs">Quantidade *</Label>
                        <Input
                          id="partQty"
                          type="number"
                          min="1"
                          value={partQuantity}
                          onChange={(e) => setPartQuantity(e.target.value)}
                          required
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-1">
                        <Label htmlFor="partPrice" className="text-xs">Preço Unitário Estimado (R$)</Label>
                        <Input
                          id="partPrice"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0,00"
                          value={partEstimatedPrice}
                          onChange={(e) => setPartEstimatedPrice(e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="partJust" className="text-xs">Justificativa (Opcional)</Label>
                        <Input
                          id="partJust"
                          placeholder="Ex: Peça com desgaste excessivo"
                          value={partJustification}
                          onChange={(e) => setPartJustification(e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowNewPartForm(false)}
                        className="h-8 text-xs"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        disabled={submittingPart}
                        className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                      >
                        {submittingPart ? 'Criando Requisição...' : 'Enviar para Compras (DRAFT)'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {loadingParts ? (
              <div className="py-6 text-center text-sm text-slate-500">Carregando peças vinculadas...</div>
            ) : partsRequestsList.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500 border border-dashed rounded-lg">
                Nenhuma requisição de peças vinculada a esta manutenção.
              </div>
            ) : (
              <div className="space-y-3">
                {partsRequestsList.map((pr) => {
                  const badge = PURCHASE_STATUS_BADGE[pr.status] || {
                    label: pr.status,
                    className: 'bg-slate-100 text-slate-700',
                  }
                  return (
                    <div
                      key={pr.id}
                      className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                            #{pr.id.slice(0, 8)}
                          </span>
                          <Badge variant="outline" className={`text-xs ${badge.className}`}>
                            {badge.label}
                          </Badge>
                        </div>
                        <span className="text-slate-400">
                          {new Date(pr.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                      </div>

                      <div className="text-xs text-slate-600 dark:text-slate-400">
                        <span className="font-medium text-slate-700 dark:text-slate-300">Solicitante: </span>
                        {pr.requester?.user?.name || 'Operador'}
                        {pr.department?.name && ` (${pr.department.name})`}
                      </div>

                      {pr.justification && (
                        <p className="text-xs text-slate-500 italic">
                          "{pr.justification}"
                        </p>
                      )}

                      {/* Itens solicitados */}
                      {pr.items && pr.items.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                          <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Itens:
                          </div>
                          <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                            {pr.items.map((item, idx) => (
                              <li key={item.id || idx} className="flex justify-between items-center bg-white dark:bg-slate-800/60 p-1.5 rounded border border-slate-100 dark:border-slate-800">
                                <span>
                                  {item.product?.name || item.description || 'Item de Manutenção'}
                                </span>
                                <span className="font-mono text-slate-500">
                                  {item.quantity} {item.unit?.symbol || 'UN'}
                                  {item.estimatedUnitPrice ? ` • R$ ${Number(item.estimatedUnitPrice).toFixed(2)}` : ''}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPartsModalOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DE TRIAGEM DE ALERTA (AC-02, AC-03 / D05) */}
      <Dialog open={triageModalOpen} onOpenChange={setTriageModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Triagem do Alerta de Manutenção</DialogTitle>
            <DialogDescription>
              {selectedAlertForTriage?.title}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Ação Decisória *</Label>
              <Select
                value={triageAction}
                onValueChange={(val: any) => setTriageAction(val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPEN_MAINTENANCE">Criar Ordem de Serviço Agendada</SelectItem>
                  <SelectItem value="IN_REVIEW">Colocar em Análise Interna</SelectItem>
                  <SelectItem value="DISMISSED">Descartar Alerta (com Justificativa)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {triageAction === 'OPEN_MAINTENANCE' && (
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="trDate">Data Prevista</Label>
                  <Input
                    id="trDate"
                    type="datetime-local"
                    value={triageScheduledDate}
                    onChange={(e) => setTriageScheduledDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="trCost">Custo Previsto (R$)</Label>
                  <Input
                    id="trCost"
                    type="number"
                    min="0"
                    placeholder="0,00"
                    value={triageEstimatedCost}
                    onChange={(e) => setTriageEstimatedCost(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="triageReason">
                {triageAction === 'DISMISSED' ? 'Justificativa do Descarte *' : 'Observações / Motivo'}
              </Label>
              <Textarea
                id="triageReason"
                placeholder={
                  triageAction === 'DISMISSED'
                    ? 'Ex: Serviço já realizado na oficina semana passada comprovado por NF.'
                    : 'Ex: Agendar troca preventiva para próxima segunda-feira.'
                }
                value={triageReason}
                onChange={(e) => setTriageReason(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTriageModalOpen(false)} disabled={submittingTriage}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmTriage} disabled={submittingTriage} className="bg-blue-600 hover:bg-blue-700 text-white">
              {submittingTriage ? 'Salvando...' : 'Confirmar Triagem'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DE NOVO PLANO PREVENTIVO (RF07) */}
      <Dialog open={planModalOpen} onOpenChange={setPlanModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Plano de Manutenção Preventiva</DialogTitle>
            <DialogDescription>
              Defina as regras de disparo preditivo por quilometragem e/ou tempo para o veículo.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreatePlan} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pVeh">Veículo *</Label>
              <Select value={planVehicleId} onValueChange={setPlanVehicleId}>
                <SelectTrigger id="pVeh">
                  <SelectValue placeholder="Selecione o veículo" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.plate} • {v.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pName">Nome do Plano *</Label>
              <Input
                id="pName"
                placeholder="Ex: Troca de Óleo e Filtros (10.000 km)"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pDesc">Descrição do Plano</Label>
              <Input
                id="pDesc"
                placeholder="Ex: Óleo 15W40, filtro de óleo, ar e combustível"
                value={planDescription}
                onChange={(e) => setPlanDescription(e.target.value)}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pKm">Intervalo (KM)</Label>
                <Input
                  id="pKm"
                  type="number"
                  min="1"
                  placeholder="Ex: 10000"
                  value={planIntervalKm}
                  onChange={(e) => setPlanIntervalKm(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pDays">Intervalo (Dias)</Label>
                <Input
                  id="pDays"
                  type="number"
                  min="1"
                  placeholder="Ex: 180"
                  value={planIntervalDays}
                  onChange={(e) => setPlanIntervalDays(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pLastKm">Último KM Conhecido</Label>
                <Input
                  id="pLastKm"
                  type="number"
                  min="0"
                  placeholder="Ex: 50000"
                  value={planLastKm}
                  onChange={(e) => setPlanLastKm(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pLastDate">Última Data Conhecida</Label>
                <Input
                  id="pLastDate"
                  type="date"
                  value={planLastDate}
                  onChange={(e) => setPlanLastDate(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPlanModalOpen(false)} disabled={submittingPlan}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submittingPlan} className="bg-blue-600 hover:bg-blue-700 text-white">
                {submittingPlan ? 'Criando...' : 'Salvar Plano'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
