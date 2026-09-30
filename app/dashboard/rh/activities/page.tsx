'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Calendar,
  CheckCircle2,
  Clock3,
  Coffee,
  FolderTree,
  ListTodo,
  Loader2,
  Pencil,
  Plus,
  RotateCw,
  Search,
  Trash2,
  Users,
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
  DialogTrigger,
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
import { FilterPopover } from '@/components/ui/filter-popover'
import {
  DATE_RANGE_PRESET_LABELS,
  DatePresetRangeFilter,
  type DatePresetRangeValue,
} from '@/components/filters/date-preset-range-filter'
import { useAuth } from '@/context/auth-context'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'
import { cn } from '@/lib/utils'

type EmployeeProfile = {
  id: string
  branchId: string
  user: { name: string }
  scopes: {
    managesSubordinates: boolean
    managesDepartments: boolean
    managesTeams: boolean
  }
}

type ActivityCategory = {
  id: string
  name: string
  active: boolean
}

type BreakType = 'LUNCH' | 'DINNER' | 'SNACK' | 'OTHER'

type BreakForm = {
  type: BreakType
  startTime: string
  endTime: string
}

type DailyActivity = {
  id: string
  employeeId: string
  date: string
  startTime: string
  endTime: string
  manualDescription: string | null
  observation: string | null
  category: ActivityCategory | null
  breaks: { id: string; type: BreakType; startTime: string; endTime: string }[]
  employee: { user: { name: string } }
}

const BREAK_TYPE_LABELS: Record<BreakType, string> = {
  LUNCH: 'Almoço',
  DINNER: 'Jantar',
  SNACK: 'Lanche',
  OTHER: 'Outro',
}

const DEFAULT_ACTIVITY_FORM = {
  date: new Date().toISOString().split('T')[0],
  startTime: '07:00',
  endTime: '17:00',
  categoryId: '',
  manualDescription: '',
  observation: '',
  breaks: [] as BreakForm[],
}

const DEFAULT_FILTER: DatePresetRangeValue = {
  preset: 'current_month',
  dateFrom: '',
  dateTo: '',
}

export default function ActivitiesPage() {
  const { hasPermission } = useAuth()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [categorySubmitting, setCategorySubmitting] = useState(false)

  const [profile, setProfile] = useState<EmployeeProfile | null>(null)
  const [myActivities, setMyActivities] = useState<DailyActivity[]>([])
  const [teamActivities, setTeamActivities] = useState<DailyActivity[]>([])
  const [categories, setCategories] = useState<ActivityCategory[]>([])

  const [filter, setFilter] = useState(DEFAULT_FILTER)
  const [draftFilter, setDraftFilter] = useState(DEFAULT_FILTER)

  const [formOpen, setFormOpen] = useState(false)
  const [editingActivity, setEditingActivity] = useState<DailyActivity | null>(null)
  const [activityForm, setActivityForm] = useState(DEFAULT_ACTIVITY_FORM)
  const [categorySearch, setCategorySearch] = useState('')

  const [categoryOpen, setCategoryOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<ActivityCategory | null>(null)
  const [categoryName, setCategoryName] = useState('')

  const canManageActivities = hasPermission('rh.activities.manage')
  const canViewTeam = Boolean(
    profile &&
      (profile.scopes.managesSubordinates ||
        profile.scopes.managesDepartments ||
        profile.scopes.managesTeams),
  )

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    void fetchInitialData()
  }, [])

  async function fetchInitialData() {
    setLoading(true)
    try {
      const { data: currentProfile } = await api.get('/employees/me')
      setProfile(currentProfile)

      const requests: Promise<unknown>[] = [
        fetchActivities(DEFAULT_FILTER, false),
        api
          .get(`/activity-categories?branchId=${currentProfile.branchId}`)
          .then((res) => setCategories(res.data)),
      ]

      const canViewTeamInitial = Boolean(
        currentProfile.scopes.managesSubordinates ||
          currentProfile.scopes.managesDepartments ||
          currentProfile.scopes.managesTeams,
      )

      if (canViewTeamInitial) {
        requests.push(fetchActivities(DEFAULT_FILTER, true))
      }

      await Promise.all(requests)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Erro ao carregar atividades.'))
    } finally {
      setLoading(false)
    }
  }

  async function fetchActivities(
    currentFilter: DatePresetRangeValue,
    isTeam: boolean,
  ) {
    try {
      const params = new URLSearchParams()
      if (currentFilter.dateFrom) params.set('dateFrom', currentFilter.dateFrom)
      if (currentFilter.dateTo) params.set('dateTo', currentFilter.dateTo)

      const endpoint = isTeam ? '/daily-activities/team' : '/daily-activities/me'
      const url = params.toString() ? `${endpoint}?${params.toString()}` : endpoint
      const { data } = await api.get(url)

      if (isTeam) setTeamActivities(data)
      else setMyActivities(data)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível carregar as atividades.'))
    }
  }

  async function refreshCurrentData(activeFilter: DatePresetRangeValue) {
    const promises = [fetchActivities(activeFilter, false)]
    if (canViewTeam) promises.push(fetchActivities(activeFilter, true))
    await Promise.all(promises)
  }

  function resetActivityForm() {
    setEditingActivity(null)
    setActivityForm(DEFAULT_ACTIVITY_FORM)
    setCategorySearch('')
  }

  function openNewActivity() {
    resetActivityForm()
    setFormOpen(true)
  }

  function openEditActivity(activity: DailyActivity) {
    setEditingActivity(activity)
    setActivityForm({
      date: activity.date.split('T')[0],
      startTime: activity.startTime,
      endTime: activity.endTime,
      categoryId: activity.category?.id || '',
      manualDescription: activity.manualDescription || '',
      observation: activity.observation || '',
      breaks: activity.breaks.map((b) => ({
        type: b.type,
        startTime: b.startTime,
        endTime: b.endTime,
      })),
    })
    setCategorySearch(activity.category?.name || '')
    setFormOpen(true)
  }

  function updateActivityField<K extends keyof typeof DEFAULT_ACTIVITY_FORM>(
    field: K,
    value: (typeof DEFAULT_ACTIVITY_FORM)[K],
  ) {
    setActivityForm((prev) => ({ ...prev, [field]: value }))
  }

  function addBreak() {
    updateActivityField('breaks', [
      ...activityForm.breaks,
      { type: 'LUNCH', startTime: '12:00', endTime: '13:00' },
    ])
  }

  function updateBreak(
    index: number,
    field: keyof BreakForm,
    value: string,
  ) {
    const updated = [...activityForm.breaks]
    updated[index] = { ...updated[index], [field]: value }
    updateActivityField('breaks', updated)
  }

  function removeBreak(index: number) {
    updateActivityField(
      'breaks',
      activityForm.breaks.filter((_, i) => i !== index),
    )
  }

  async function handleSubmitActivity(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!profile) return

    if (!activityForm.categoryId && !activityForm.manualDescription.trim()) {
      toast.error('Selecione uma atividade do catálogo ou preencha a descrição manual.')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        employeeId: profile.id,
        date: activityForm.date,
        startTime: activityForm.startTime,
        endTime: activityForm.endTime,
        categoryId: activityForm.categoryId || undefined,
        manualDescription: activityForm.manualDescription.trim() || undefined,
        observation: activityForm.observation.trim() || undefined,
        breaks: activityForm.breaks.map((b) => ({
          type: b.type,
          startTime: b.startTime,
          endTime: b.endTime,
        })),
      }

      if (editingActivity) {
        await api.patch(`/daily-activities/${editingActivity.id}`, payload)
        toast.success('Atividade atualizada com sucesso.')
      } else {
        await api.post('/daily-activities', payload)
        toast.success('Atividade registrada com sucesso.')
      }

      setFormOpen(false)
      resetActivityForm()
      await refreshCurrentData(filter)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível salvar a atividade.'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteActivity(id: string) {
    if (!confirm('Deseja realmente excluir este registro de atividade?')) return
    try {
      await api.delete(`/daily-activities/${id}`)
      toast.success('Atividade excluída com sucesso.')
      await refreshCurrentData(filter)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível excluir a atividade.'))
    }
  }

  function resetCategoryForm() {
    setEditingCategory(null)
    setCategoryName('')
  }

  function openNewCategory() {
    resetCategoryForm()
    setCategoryOpen(true)
  }

  function openEditCategory(category: ActivityCategory) {
    setEditingCategory(category)
    setCategoryName(category.name)
    setCategoryOpen(true)
  }

  async function handleSubmitCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!profile) return

    setCategorySubmitting(true)
    try {
      if (editingCategory) {
        await api.patch(`/activity-categories/${editingCategory.id}`, {
          name: categoryName.trim(),
        })
        toast.success('Categoria atualizada.')
      } else {
        await api.post('/activity-categories', {
          branchId: profile.branchId,
          name: categoryName.trim(),
        })
        toast.success('Categoria cadastrada.')
      }

      setCategoryOpen(false)
      resetCategoryForm()
      const { data } = await api.get(`/activity-categories?branchId=${profile.branchId}`)
      setCategories(data)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível salvar a categoria.'))
    } finally {
      setCategorySubmitting(false)
    }
  }

  const filteredCategories = useMemo(() => {
    return categories.filter((c) =>
      c.name.toLowerCase().includes(categorySearch.toLowerCase()),
    )
  }, [categories, categorySearch])

  function formatDate(value: string) {
    return new Date(value).toLocaleDateString('pt-BR')
  }

  const totalBreaks = useMemo(() => {
    return myActivities.reduce((acc, a) => acc + (a.breaks?.length || 0), 0)
  }, [myActivities])

  return (
    <div className="app-page space-y-6">
      {/* 1. Cabeçalho Padronizado */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Atividades Diárias
          </h1>
          <p className="text-sm text-muted-foreground">
            Acompanhe apontamentos de horas, tarefas do dia a dia e catálogo operacional por função.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={openNewActivity}
            size="sm"
            className="h-9 gap-1.5 font-semibold"
          >
            <Plus className="size-4" />
            <span>Nova atividade</span>
          </Button>

          {/* Filtro Flutuante de Período */}
          <FilterPopover
            activeCount={Boolean(filter.dateFrom && filter.dateTo) ? 1 : 0}
            onClear={async () => {
              setDraftFilter(DEFAULT_FILTER)
              setFilter(DEFAULT_FILTER)
              await refreshCurrentData(DEFAULT_FILTER)
            }}
            onApply={async () => {
              setFilter(draftFilter)
              await refreshCurrentData(draftFilter)
            }}
            contentClassName="sm:w-[420px]"
          >
            <DatePresetRangeFilter
              value={draftFilter}
              onChange={setDraftFilter}
              className="gap-3"
              presetFieldClassName="min-w-0"
              dateFieldClassName="min-w-0 max-w-none"
            />
          </FilterPopover>

          {/* Atualização */}
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            onClick={() => void refreshCurrentData(filter)}
            disabled={loading}
          >
            <RotateCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </Button>
        </div>
      </section>

      {/* 2. Cards de Resumo (KPIs em 4 colunas) */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Meus Registros */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Meus Registros
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {myActivities.length}
            </span>
            <ListTodo className="size-5 text-muted-foreground/60" />
          </CardContent>
        </Card>

        {/* Atividades da Equipe */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Equipe (Gestão)
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {teamActivities.length}
            </span>
            <Users className="size-5 text-primary/70" />
          </CardContent>
        </Card>

        {/* Total de Pausas */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Pausas / Intervalos
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
              {totalBreaks}
            </span>
            <Coffee className="size-5 text-amber-500/60" />
          </CardContent>
        </Card>

        {/* Categorias no Catálogo */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tipos no Catálogo
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {categories.length}
            </span>
            <FolderTree className="size-5 text-emerald-500/60" />
          </CardContent>
        </Card>
      </section>

      {/* 3. Abas Operacionais */}
      <Tabs defaultValue="my-activities" className="space-y-4">
        <TabsList className="bg-muted/40 p-1">
          <TabsTrigger value="my-activities" className="text-xs font-medium">
            Meus Registros ({myActivities.length})
          </TabsTrigger>
          <TabsTrigger
            value="team"
            disabled={!canViewTeam}
            className="text-xs font-medium"
          >
            Equipe ({teamActivities.length})
          </TabsTrigger>
          <TabsTrigger value="catalog" className="text-xs font-medium">
            Catálogo de Atividades ({categories.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Meus Registros */}
        <TabsContent value="my-activities">
          <Card className="app-section-card overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border/80 hover:bg-transparent">
                    <TableHead className="w-[120px] font-semibold text-foreground text-xs uppercase tracking-wider pl-6">
                      Data
                    </TableHead>
                    <TableHead className="w-[140px] font-semibold text-foreground text-xs uppercase tracking-wider">
                      Horário
                    </TableHead>
                    <TableHead className="min-w-[240px] font-semibold text-foreground text-xs uppercase tracking-wider">
                      Atividade / Descrição
                    </TableHead>
                    <TableHead className="min-w-[180px] font-semibold text-foreground text-xs uppercase tracking-wider">
                      Intervalos
                    </TableHead>
                    <TableHead className="w-[100px] font-semibold text-foreground text-xs uppercase tracking-wider text-right pr-6">
                      Ações
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myActivities.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="py-10 text-center text-sm text-muted-foreground"
                      >
                        Nenhuma atividade registrada no período.
                      </TableCell>
                    </TableRow>
                  ) : (
                    myActivities.map((activity) => (
                      <TableRow
                        key={activity.id}
                        className="border-b border-border/60 hover:bg-muted/40 transition-colors"
                      >
                        <TableCell className="pl-6 text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(activity.date)}
                        </TableCell>

                        <TableCell>
                          <span className="inline-flex items-center gap-1.5 text-xs text-foreground font-medium">
                            <Clock3 className="size-3.5 text-muted-foreground" />
                            {activity.startTime} - {activity.endTime}
                          </span>
                        </TableCell>

                        <TableCell>
                          <div className="space-y-0.5">
                            <p className="font-semibold text-sm text-foreground">
                              {activity.category?.name ||
                                activity.manualDescription ||
                                '-'}
                            </p>
                            {activity.observation && (
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {activity.observation}
                              </p>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex flex-wrap gap-1.5">
                            {activity.breaks.length === 0 ? (
                              <span className="text-xs text-muted-foreground italic">
                                Nenhum
                              </span>
                            ) : (
                              activity.breaks.map((b) => (
                                <span
                                  key={b.id}
                                  className="inline-flex items-center rounded-md border border-border bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground"
                                >
                                  {BREAK_TYPE_LABELS[b.type]} {b.startTime}-{b.endTime}
                                </span>
                              ))
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="text-right pr-6">
                          <div className="inline-flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="size-8 text-muted-foreground hover:text-foreground"
                              onClick={() => openEditActivity(activity)}
                              title="Editar atividade"
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="size-8 text-destructive/80 hover:text-destructive hover:bg-destructive/10"
                              onClick={() => void handleDeleteActivity(activity.id)}
                              title="Excluir atividade"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        {/* Tab 2: Equipe */}
        <TabsContent value="team">
          <Card className="app-section-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/80 hover:bg-transparent">
                  <TableHead className="min-w-[200px] font-semibold text-foreground text-xs uppercase tracking-wider pl-6">
                    Colaborador
                  </TableHead>
                  <TableHead className="w-[120px] font-semibold text-foreground text-xs uppercase tracking-wider">
                    Data
                  </TableHead>
                  <TableHead className="w-[140px] font-semibold text-foreground text-xs uppercase tracking-wider">
                    Horário
                  </TableHead>
                  <TableHead className="min-w-[220px] font-semibold text-foreground text-xs uppercase tracking-wider">
                    Atividade
                  </TableHead>
                  <TableHead className="min-w-[180px] font-semibold text-foreground text-xs uppercase tracking-wider">
                    Intervalos
                  </TableHead>
                  <TableHead className="w-[80px] font-semibold text-foreground text-xs uppercase tracking-wider text-right pr-6">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamActivities.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      Nenhum registro de equipe encontrado no período.
                    </TableCell>
                  </TableRow>
                ) : (
                  teamActivities.map((activity) => (
                    <TableRow
                      key={activity.id}
                      className="border-b border-border/60 hover:bg-muted/40 transition-colors"
                    >
                      <TableCell className="pl-6 font-semibold text-sm text-foreground">
                        {activity.employee.user.name}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(activity.date)}
                      </TableCell>
                      <TableCell className="text-xs text-foreground font-medium">
                        {activity.startTime} - {activity.endTime}
                      </TableCell>
                      <TableCell className="text-sm text-foreground font-medium">
                        {activity.category?.name ||
                          activity.manualDescription ||
                          '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          {activity.breaks.length === 0 ? (
                            <span className="text-xs text-muted-foreground italic">
                              Nenhum
                            </span>
                          ) : (
                            activity.breaks.map((b) => (
                              <span
                                key={b.id}
                                className="inline-flex items-center rounded-md border border-border bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground"
                              >
                                {BREAK_TYPE_LABELS[b.type]} {b.startTime}-{b.endTime}
                              </span>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="size-8 text-muted-foreground hover:text-foreground"
                          onClick={() => openEditActivity(activity)}
                          title="Editar atividade"
                        >
                          <Pencil className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Tab 3: Catálogo de Atividades */}
        <TabsContent value="catalog">
          <Card className="app-section-card overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border/70">
              <div>
                <h3 className="font-semibold text-sm text-foreground">
                  Catálogo de Atividades Padronizadas
                </h3>
                <p className="text-xs text-muted-foreground">
                  Categorias reutilizáveis para garantir dados uniformes no apontamento diário.
                </p>
              </div>

              {canManageActivities && (
                <Button
                  size="sm"
                  className="h-8 gap-1.5 font-semibold"
                  onClick={openNewCategory}
                >
                  <Plus className="size-3.5" />
                  <span>Nova categoria</span>
                </Button>
              )}
            </div>

            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/80 hover:bg-transparent">
                  <TableHead className="min-w-[240px] font-semibold text-foreground text-xs uppercase tracking-wider pl-6">
                    Nome da Categoria
                  </TableHead>
                  <TableHead className="w-[120px] font-semibold text-foreground text-xs uppercase tracking-wider">
                    Status
                  </TableHead>
                  <TableHead className="w-[100px] font-semibold text-foreground text-xs uppercase tracking-wider text-right pr-6">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      Nenhuma categoria cadastrada para esta filial.
                    </TableCell>
                  </TableRow>
                ) : (
                  categories.map((c) => (
                    <TableRow
                      key={c.id}
                      className="border-b border-border/60 hover:bg-muted/40 transition-colors"
                    >
                      <TableCell className="pl-6 font-semibold text-sm text-foreground">
                        {c.name}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${
                            c.active
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60'
                              : 'bg-muted text-muted-foreground border-border'
                          }`}
                        >
                          {c.active ? 'Ativa' : 'Inativa'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        {canManageActivities ? (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="size-8 text-muted-foreground hover:text-foreground"
                            onClick={() => openEditCategory(c)}
                            title="Editar categoria"
                          >
                            <Pencil className="size-4" />
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">
                            Leitura
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
      </Tabs>

      {/* 4. Modal de Nova / Editar Atividade */}
      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) resetActivityForm()
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingActivity ? 'Editar Atividade' : 'Registrar Atividade do Dia'}
            </DialogTitle>
            <DialogDescription>
              Informe o período trabalhado, a atividade executada e eventuais intervalos.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitActivity} className="space-y-4 py-2">
            <div className="space-y-4 rounded-lg border border-border bg-card p-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="act-date">Data *</Label>
                  <Input
                    id="act-date"
                    type="date"
                    max={today}
                    value={activityForm.date}
                    onChange={(e) => updateActivityField('date', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="act-start">Início *</Label>
                  <Input
                    id="act-start"
                    type="time"
                    value={activityForm.startTime}
                    onChange={(e) => updateActivityField('startTime', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="act-end">Fim *</Label>
                  <Input
                    id="act-end"
                    type="time"
                    value={activityForm.endTime}
                    onChange={(e) => updateActivityField('endTime', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="act-search">Atividade do Catálogo</Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="act-search"
                    placeholder="Buscar tipo cadastrado..."
                    className="pl-9 h-9 text-sm"
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                  />
                </div>

                <div className="max-h-32 overflow-y-auto grid gap-1.5 rounded-lg border border-border/70 bg-muted/20 p-2 mt-1.5">
                  {filteredCategories.length === 0 ? (
                    <p className="text-xs text-muted-foreground p-1">
                      Nenhuma atividade encontrada no catálogo.
                    </p>
                  ) : (
                    filteredCategories.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setCategorySearch(c.name)
                          updateActivityField('categoryId', c.id)
                          updateActivityField('manualDescription', '')
                        }}
                        className={cn(
                          'rounded-md px-2.5 py-1.5 text-left text-xs font-medium transition-colors',
                          activityForm.categoryId === c.id
                            ? 'bg-primary text-primary-foreground font-semibold'
                            : 'hover:bg-muted text-foreground',
                        )}
                      >
                        {c.name}
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="act-manual">Ou Descrição Manual</Label>
                <Input
                  id="act-manual"
                  placeholder="Ex: Reunião externa com cliente, acompanhamento..."
                  value={activityForm.manualDescription}
                  onChange={(e) => {
                    updateActivityField('manualDescription', e.target.value)
                    if (e.target.value.trim()) {
                      updateActivityField('categoryId', '')
                    }
                  }}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="act-obs">Observação / Contexto</Label>
                <Textarea
                  id="act-obs"
                  placeholder="Detalhes adicionais relevantes..."
                  value={activityForm.observation}
                  onChange={(e) => updateActivityField('observation', e.target.value)}
                  rows={2}
                />
              </div>
            </div>

            {/* Bloco de Intervalos */}
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-sm text-foreground">Intervalos</h4>
                  <p className="text-xs text-muted-foreground">Pausas para refeição, lanche ou descanso.</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                  onClick={addBreak}
                >
                  <Coffee className="size-3.5" />
                  <span>Adicionar pausa</span>
                </Button>
              </div>

              {activityForm.breaks.length === 0 ? (
                <p className="text-xs text-muted-foreground italic border border-dashed rounded-md p-3 text-center">
                  Nenhum intervalo informado para este período.
                </p>
              ) : (
                <div className="space-y-2">
                  {activityForm.breaks.map((b, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center rounded-md border border-border/70 bg-muted/20 p-2"
                    >
                      <Select
                        value={b.type}
                        onValueChange={(val) => updateBreak(i, 'type', val)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(BREAK_TYPE_LABELS).map(([val, lbl]) => (
                            <SelectItem key={val} value={val}>
                              {lbl}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Input
                        type="time"
                        value={b.startTime}
                        onChange={(e) => updateBreak(i, 'startTime', e.target.value)}
                        className="h-8 text-xs"
                      />

                      <Input
                        type="time"
                        value={b.endTime}
                        onChange={(e) => updateBreak(i, 'endTime', e.target.value)}
                        className="h-8 text-xs"
                      />

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="size-8 text-destructive hover:bg-destructive/10"
                        onClick={() => removeBreak(i)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : null}
                {editingActivity ? 'Salvar alterações' : 'Registrar atividade'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 5. Modal de Nova / Editar Categoria */}
      <Dialog
        open={categoryOpen}
        onOpenChange={(open) => {
          setCategoryOpen(open)
          if (!open) resetCategoryForm()
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Editar Categoria' : 'Nova Categoria de Atividade'}
            </DialogTitle>
            <DialogDescription>
              Informe o nome padrão para a atividade do catálogo.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitCategory} className="space-y-4 py-2">
            <div className="space-y-1.5 rounded-lg border border-border bg-card p-4">
              <Label htmlFor="cat-name">Nome da Categoria *</Label>
              <Input
                id="cat-name"
                placeholder="Ex: Visita a cliente, Conferência..."
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                required
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCategoryOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={categorySubmitting}>
                {categorySubmitting ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : null}
                {editingCategory ? 'Salvar categoria' : 'Cadastrar categoria'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
