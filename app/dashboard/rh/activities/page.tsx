'use client'

import { useEffect, useMemo, useState } from "react"
import { FilterPopoverButton } from "@/components/filters/filter-popover-button"
import {
  DATE_RANGE_PRESET_LABELS,
  DatePresetRangeFilter,
  type DatePresetRangeValue,
} from "@/components/filters/date-preset-range-filter"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { MenuFunctionHeader } from "@/components/layout/menu-function-header"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/context/auth-context"
import { api } from "@/lib/api"
import { getApiErrorMessage } from "@/lib/api-error"
import { cn } from "@/lib/utils"
import { Clock3, Coffee, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react"
import { toast } from "sonner"

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
  LUNCH: 'Almoco',
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
  const [filterOpen, setFilterOpen] = useState(false)
  const [categorySearch, setCategorySearch] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [editingActivity, setEditingActivity] = useState<DailyActivity | null>(null)
  const [activityForm, setActivityForm] = useState(DEFAULT_ACTIVITY_FORM)

  const [categoryOpen, setCategoryOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<ActivityCategory | null>(null)
  const [categoryName, setCategoryName] = useState('')

  const today = new Date().toISOString().split('T')[0]
  const canManageActivities = hasPermission('rh.activities.manage')
  const canViewTeam =
    canManageActivities ||
    !!profile?.scopes.managesDepartments ||
    !!profile?.scopes.managesSubordinates ||
    !!profile?.scopes.managesTeams

  const filteredCategories = useMemo(() => {
    const normalized = categorySearch.trim().toLowerCase()
    if (!normalized) return categories
    return categories.filter((category) =>
      category.name.toLowerCase().includes(normalized),
    )
  }, [categories, categorySearch])

  useEffect(() => {
    void fetchInitialData()
  }, [])

  async function fetchInitialData() {
    setLoading(true)
    try {
      const { data: currentProfile } = await api.get('/employees/me')
      setProfile(currentProfile)

      await Promise.all([
        fetchCategories(currentProfile.branchId),
        fetchMyActivities(currentProfile.id, filter.dateFrom, filter.dateTo),
        canViewTeamForProfile(currentProfile)
          ? fetchTeamActivities(filter.dateFrom, filter.dateTo)
          : Promise.resolve(setTeamActivities([])),
      ])
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Nao foi possivel carregar as atividades.'))
    } finally {
      setLoading(false)
    }
  }

  function canViewTeamForProfile(currentProfile: EmployeeProfile) {
    return (
      canManageActivities ||
      currentProfile.scopes.managesDepartments ||
      currentProfile.scopes.managesSubordinates ||
      currentProfile.scopes.managesTeams
    )
  }

  async function fetchMyActivities(employeeId: string, from?: string, to?: string) {
    const params = new URLSearchParams()
    if (from) params.set('dateFrom', from)
    if (to) params.set('dateTo', to)

    const query = params.toString()
    const url = query ? `/daily-activities/my?${query}` : '/daily-activities/my'
    const { data } = await api.get(url)
    setMyActivities(data)
    return data as DailyActivity[]
  }

  async function fetchTeamActivities(from?: string, to?: string) {
    const params = new URLSearchParams()
    if (from) params.set('dateFrom', from)
    if (to) params.set('dateTo', to)

    const query = params.toString()
    const url = query ? `/daily-activities/team?${query}` : '/daily-activities/team'
    const { data } = await api.get(url)
    setTeamActivities(data)
    return data as DailyActivity[]
  }

  async function fetchCategories(branchId: string) {
    const { data } = await api.get(`/daily-activities/categories?branchId=${branchId}`)
    setCategories(data)
    return data as ActivityCategory[]
  }

  function resetActivityForm() {
    setEditingActivity(null)
    setCategorySearch('')
    setActivityForm({
      ...DEFAULT_ACTIVITY_FORM,
      date: new Date().toISOString().split('T')[0],
    })
  }

  function resetCategoryForm() {
    setEditingCategory(null)
    setCategoryName('')
  }

  function openNewActivity() {
    resetActivityForm()
    setFormOpen(true)
  }

  function openEditActivity(activity: DailyActivity) {
    setEditingActivity(activity)
    setCategorySearch(activity.category?.name || '')
    setActivityForm({
      date: activity.date.split('T')[0],
      startTime: activity.startTime,
      endTime: activity.endTime,
      categoryId: activity.category?.id || '',
      manualDescription: activity.manualDescription || '',
      observation: activity.observation || '',
      breaks: activity.breaks.map((activityBreak) => ({
        type: activityBreak.type,
        startTime: activityBreak.startTime,
        endTime: activityBreak.endTime,
      })),
    })
    setFormOpen(true)
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

  function updateActivityField<Field extends keyof typeof activityForm>(
    field: Field,
    value: (typeof activityForm)[Field],
  ) {
    setActivityForm((current) => ({ ...current, [field]: value }))
  }

  function addBreak() {
    updateActivityField('breaks', [
      ...activityForm.breaks,
      { type: 'LUNCH', startTime: '12:00', endTime: '13:00' },
    ])
  }

  function updateBreak(index: number, field: keyof BreakForm, value: string) {
    updateActivityField(
      'breaks',
      activityForm.breaks.map((item, currentIndex) =>
        currentIndex === index ? { ...item, [field]: value } : item,
      ),
    )
  }

  function removeBreak(index: number) {
    updateActivityField(
      'breaks',
      activityForm.breaks.filter((_, currentIndex) => currentIndex !== index),
    )
  }

  function handleFilterOpenChange(open: boolean) {
    if (open) {
      setDraftFilter(filter)
    }
    setFilterOpen(open)
  }

  async function applyFilters() {
    if (!profile) return

    try {
      setFilter(draftFilter)
      setFilterOpen(false)
      await fetchMyActivities(profile.id, draftFilter.dateFrom, draftFilter.dateTo)
      if (canViewTeam) {
        await fetchTeamActivities(draftFilter.dateFrom, draftFilter.dateTo)
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Nao foi possivel aplicar os filtros.'))
    }
  }

  async function clearFilters() {
    if (!profile) return

    setDraftFilter(DEFAULT_FILTER)
    setFilter(DEFAULT_FILTER)
    setFilterOpen(false)

    try {
      await fetchMyActivities(profile.id)
      if (canViewTeam) {
        await fetchTeamActivities()
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Nao foi possivel limpar os filtros.'))
    }
  }

  async function handleSubmitActivity(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!profile) return

    if (!activityForm.categoryId && !activityForm.manualDescription.trim()) {
      toast.error('Selecione uma atividade do catalogo ou descreva manualmente.')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        date: activityForm.date,
        startTime: activityForm.startTime,
        endTime: activityForm.endTime,
        categoryId: activityForm.categoryId || undefined,
        manualDescription: activityForm.manualDescription.trim() || undefined,
        observation: activityForm.observation.trim() || undefined,
        breaks: activityForm.breaks.length > 0 ? activityForm.breaks : undefined,
      }

      if (editingActivity) {
        await api.patch(`/daily-activities/${editingActivity.id}`, payload)
        toast.success('Atividade atualizada.')
      } else {
        await api.post('/daily-activities', payload)
        toast.success('Atividade registrada.')
      }

      setFormOpen(false)
      resetActivityForm()
      await fetchMyActivities(profile.id, filter.dateFrom, filter.dateTo)
      if (canViewTeam) {
        await fetchTeamActivities(filter.dateFrom, filter.dateTo)
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Nao foi possivel salvar a atividade.'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteActivity(activityId: string) {
    if (!profile) return

    try {
      await api.delete(`/daily-activities/${activityId}`)
      toast.success('Atividade removida.')
      await fetchMyActivities(profile.id, filter.dateFrom, filter.dateTo)
      if (canViewTeam) {
        await fetchTeamActivities(filter.dateFrom, filter.dateTo)
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Nao foi possivel remover a atividade.'))
    }
  }

  async function handleSubmitCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!profile) return

    setCategorySubmitting(true)
    try {
      const payload = {
        name: categoryName.trim(),
        branchId: profile.branchId,
      }

      if (editingCategory) {
        await api.patch(`/daily-activities/categories/${editingCategory.id}`, payload)
        toast.success('Tipo de atividade atualizado.')
      } else {
        await api.post('/daily-activities/categories', payload)
        toast.success('Tipo de atividade cadastrado.')
      }

      setCategoryOpen(false)
      resetCategoryForm()
      await fetchCategories(profile.branchId)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Nao foi possivel salvar o catalogo de atividades.'))
    } finally {
      setCategorySubmitting(false)
    }
  }

  function formatDate(value: string) {
    return new Date(value).toLocaleDateString('pt-BR')
  }

  function buildFilterSummary(value: DatePresetRangeValue) {
    const presetLabel = DATE_RANGE_PRESET_LABELS[value.preset] || 'Periodo personalizado'
    const hasRange = Boolean(value.dateFrom && value.dateTo)

    return {
      active: hasRange,
      tooltip: hasRange
        ? [`Periodo: ${presetLabel}`, `Intervalo: ${formatDate(value.dateFrom)} ate ${formatDate(value.dateTo)}`]
        : [],
    }
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
        title="Recursos Humanos > Atividades"
        description="Registre a rotina diaria, acompanhe a equipe quando houver escopo de gestao e mantenha o catalogo de atividades organizado."
        actions={
          <>
            <FilterPopoverButton
              title="Filtros"
              description="Refine o periodo para revisar os registros individuais e, quando houver permissao, os registros da equipe."
              active={buildFilterSummary(filter).active}
              activeSummary={buildFilterSummary(filter).tooltip}
              open={filterOpen}
              onOpenChange={handleFilterOpenChange}
              showClear={buildFilterSummary(filter).active}
              onClear={() => void clearFilters()}
              footer={
                <Button type="button" onClick={() => void applyFilters()}>
                  Aplicar
                </Button>
              }
            >
              <DatePresetRangeFilter
                value={draftFilter}
                onChange={setDraftFilter}
                className="gap-4"
                presetFieldClassName="min-w-0"
                dateFieldClassName="min-w-0 max-w-none"
              />
            </FilterPopoverButton>

            <Dialog
              open={formOpen}
              onOpenChange={(open) => {
                setFormOpen(open)
                if (!open) resetActivityForm()
              }}
            >
              <DialogTrigger asChild>
                <Button className="gap-2" onClick={openNewActivity}>
                  <Plus className="h-4 w-4" />
                  Nova Atividade
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingActivity ? 'Editar atividade' : 'Registrar atividade do dia'}
                </DialogTitle>
                <DialogDescription>
                  Informe o periodo, selecione um tipo do catalogo ou descreva a atividade
                  manualmente e registre observacoes relevantes.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmitActivity} className="space-y-6 py-2">
                <section className="app-section-card space-y-5">
                  <div className="space-y-1">
                    <h2 className="section-title">Dados principais</h2>
                    <p className="text-sm text-muted-foreground">
                      O registro fica vinculado ao seu perfil atual e aparece no historico
                      de acompanhamento.
                    </p>
                  </div>

                  <div className="app-form-grid">
                    <div className="field-stack">
                      <Label htmlFor="activity-date">Data</Label>
                      <Input
                        id="activity-date"
                        type="date"
                        max={today}
                        value={activityForm.date}
                        onChange={(event) => updateActivityField('date', event.target.value)}
                        required
                      />
                    </div>
                    <div className="field-stack">
                      <Label htmlFor="activity-start-time">Hora inicial</Label>
                      <Input
                        id="activity-start-time"
                        type="time"
                        value={activityForm.startTime}
                        onChange={(event) => updateActivityField('startTime', event.target.value)}
                        required
                      />
                    </div>
                    <div className="field-stack">
                      <Label htmlFor="activity-end-time">Hora final</Label>
                      <Input
                        id="activity-end-time"
                        type="time"
                        value={activityForm.endTime}
                        onChange={(event) => updateActivityField('endTime', event.target.value)}
                        required
                      />
                    </div>
                    <div className="field-stack md:col-span-2">
                      <Label htmlFor="activity-search">Atividade do catalogo</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="activity-search"
                          placeholder="Buscar atividade cadastrada..."
                          className="pl-9"
                          value={categorySearch}
                          onChange={(event) => setCategorySearch(event.target.value)}
                        />
                      </div>
                      <div className="grid gap-2 rounded-2xl border border-border/70 bg-muted/30 p-3">
                        {filteredCategories.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            Nenhuma atividade do catalogo encontrada para este filtro.
                          </p>
                        ) : (
                          filteredCategories.map((category) => (
                            <button
                              key={category.id}
                              type="button"
                              onClick={() => {
                                setCategorySearch(category.name)
                                updateActivityField('categoryId', category.id)
                                updateActivityField('manualDescription', '')
                              }}
                              className={cn(
                                "rounded-xl border px-3 py-2 text-left text-sm transition hover:border-primary/50 hover:bg-background",
                                activityForm.categoryId === category.id
                                  ? "border-primary bg-background shadow-sm"
                                  : "border-transparent",
                              )}
                            >
                              {category.name}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                    <div className="field-stack md:col-span-2">
                      <Label htmlFor="activity-manual-description">Descricao manual</Label>
                      <Input
                        id="activity-manual-description"
                        placeholder="Ex: reuniao externa com cliente, acompanhamento de carga..."
                        value={activityForm.manualDescription}
                        onChange={(event) => {
                          updateActivityField('manualDescription', event.target.value)
                          if (event.target.value.trim()) {
                            updateActivityField('categoryId', '')
                          }
                        }}
                      />
                    </div>
                    <div className="field-stack md:col-span-2">
                      <Label htmlFor="activity-observation">Observacao</Label>
                      <Textarea
                        id="activity-observation"
                        placeholder="Registre detalhes adicionais relevantes para o historico."
                        value={activityForm.observation}
                        onChange={(event) => updateActivityField('observation', event.target.value)}
                      />
                    </div>
                  </div>
                </section>

                <section className="app-section-card space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <h2 className="section-title">Intervalos</h2>
                      <p className="text-sm text-muted-foreground">
                        Use este bloco quando precisar detalhar pausas relevantes dentro do periodo.
                      </p>
                    </div>
                    <Button type="button" variant="outline" size="sm" className="gap-2" onClick={addBreak}>
                      <Coffee className="h-4 w-4" />
                      Adicionar intervalo
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {activityForm.breaks.length === 0 ? (
                      <p className="rounded-2xl border border-dashed border-border/70 px-4 py-5 text-sm text-muted-foreground">
                        Nenhum intervalo informado.
                      </p>
                    ) : (
                      activityForm.breaks.map((activityBreak, index) => (
                        <div key={`${activityBreak.type}-${index}`} className="grid gap-3 rounded-2xl border border-border/70 bg-muted/25 p-4 md:grid-cols-[1fr_1fr_1fr_auto]">
                          <div className="field-stack">
                            <Label>Tipo</Label>
                            <Select
                              value={activityBreak.type}
                              onValueChange={(value) => updateBreak(index, 'type', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(BREAK_TYPE_LABELS).map(([value, label]) => (
                                  <SelectItem key={value} value={value}>
                                    {label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="field-stack">
                            <Label>Inicio</Label>
                            <Input
                              type="time"
                              value={activityBreak.startTime}
                              onChange={(event) => updateBreak(index, 'startTime', event.target.value)}
                            />
                          </div>
                          <div className="field-stack">
                            <Label>Fim</Label>
                            <Input
                              type="time"
                              value={activityBreak.endTime}
                              onChange={(event) => updateBreak(index, 'endTime', event.target.value)}
                            />
                          </div>
                          <div className="flex items-end">
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeBreak(index)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {editingActivity ? 'Salvar alteracoes' : 'Registrar atividade'}
                  </Button>
                </DialogFooter>
              </form>
              </DialogContent>
            </Dialog>
          </>
        }
      />

      <Tabs defaultValue="my-activities" className="space-y-4">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="my-activities">Meus Registros</TabsTrigger>
          <TabsTrigger value="team" disabled={!canViewTeam}>
            Equipe
          </TabsTrigger>
          <TabsTrigger value="catalog">Catalogo de Atividades</TabsTrigger>
        </TabsList>

        <TabsContent value="my-activities">
          <Card className="app-section-card">
            <CardHeader className="px-0 pt-0">
              <CardTitle>Meus registros</CardTitle>
              <CardDescription>
                Historico das atividades que voce registrou no periodo selecionado.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Horario</TableHead>
                    <TableHead>Atividade</TableHead>
                    <TableHead>Intervalos</TableHead>
                    <TableHead className="text-right">Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myActivities.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                        Nenhuma atividade registrada no periodo.
                      </TableCell>
                    </TableRow>
                  ) : (
                    myActivities.map((activity) => (
                      <TableRow key={activity.id}>
                        <TableCell>{formatDate(activity.date)}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-2">
                            <Clock3 className="h-3.5 w-3.5 text-muted-foreground" />
                            {activity.startTime} - {activity.endTime}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium">
                              {activity.category?.name || activity.manualDescription || '-'}
                            </p>
                            {activity.observation ? (
                              <p className="text-xs text-muted-foreground">{activity.observation}</p>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            {activity.breaks.length === 0 ? (
                              <span className="text-xs text-muted-foreground">Nenhum</span>
                            ) : (
                              activity.breaks.map((activityBreak) => (
                                <Badge key={activityBreak.id} variant="outline" className="rounded-full">
                                  {BREAK_TYPE_LABELS[activityBreak.type]} {activityBreak.startTime}-{activityBreak.endTime}
                                </Badge>
                              ))
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => openEditActivity(activity)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => void handleDeleteActivity(activity.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
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

        <TabsContent value="team">
          <Card className="app-section-card">
            <CardHeader className="px-0 pt-0">
              <CardTitle>Atividades da equipe</CardTitle>
              <CardDescription>
                Visao consolidada dos registros acessiveis pelo seu escopo atual de gestao.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Horario</TableHead>
                    <TableHead>Atividade</TableHead>
                    <TableHead>Intervalos</TableHead>
                    <TableHead className="text-right">Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamActivities.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                        Nenhum registro de equipe encontrado para o escopo atual.
                      </TableCell>
                    </TableRow>
                  ) : (
                    teamActivities.map((activity) => (
                      <TableRow key={activity.id}>
                        <TableCell className="font-medium">{activity.employee.user.name}</TableCell>
                        <TableCell>{formatDate(activity.date)}</TableCell>
                        <TableCell>{activity.startTime} - {activity.endTime}</TableCell>
                        <TableCell>{activity.category?.name || activity.manualDescription || '-'}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            {activity.breaks.length === 0 ? (
                              <span className="text-xs text-muted-foreground">Nenhum</span>
                            ) : (
                              activity.breaks.map((activityBreak) => (
                                <Badge key={activityBreak.id} variant="outline" className="rounded-full">
                                  {BREAK_TYPE_LABELS[activityBreak.type]} {activityBreak.startTime}-{activityBreak.endTime}
                                </Badge>
                              ))
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => openEditActivity(activity)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
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

        <TabsContent value="catalog">
          <Card className="app-section-card">
            <CardHeader className="px-0 pt-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle>Catalogo de Atividades</CardTitle>
                  <CardDescription>
                    Tipos reutilizaveis para acelerar o registro diario e manter consistencia nos dados.
                  </CardDescription>
                </div>

                {canManageActivities ? (
                  <Dialog
                    open={categoryOpen}
                    onOpenChange={(open) => {
                      setCategoryOpen(open)
                      if (!open) resetCategoryForm()
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button className="gap-2" size="sm" onClick={openNewCategory}>
                        <Plus className="h-4 w-4" />
                        Nova categoria de atividade
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>
                          {editingCategory ? 'Editar tipo de atividade' : 'Cadastrar tipo de atividade'}
                        </DialogTitle>
                        <DialogDescription>
                          Use nomes curtos e claros para facilitar a selecao do time no momento do registro.
                        </DialogDescription>
                      </DialogHeader>

                      <form onSubmit={handleSubmitCategory} className="space-y-6 py-2">
                        <section className="app-section-card space-y-5">
                          <div className="field-stack">
                            <Label htmlFor="activity-category-name">Nome da categoria</Label>
                            <Input
                              id="activity-category-name"
                              placeholder="Ex: visita a cliente, conferencia operacional..."
                              value={categoryName}
                              onChange={(event) => setCategoryName(event.target.value)}
                              required
                            />
                          </div>
                        </section>

                        <DialogFooter>
                          <Button type="button" variant="outline" onClick={() => setCategoryOpen(false)}>
                            Cancelar
                          </Button>
                          <Button type="submit" disabled={categorySubmitting}>
                            {categorySubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {editingCategory ? 'Salvar categoria' : 'Cadastrar categoria'}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                        Nenhuma categoria cadastrada para esta filial.
                      </TableCell>
                    </TableRow>
                  ) : (
                    categories.map((category) => (
                      <TableRow key={category.id}>
                        <TableCell className="font-medium">{category.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="rounded-full">
                            {category.active ? 'Ativa' : 'Inativa'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {canManageActivities ? (
                            <Button variant="ghost" size="icon" onClick={() => openEditCategory(category)}>
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
      </Tabs>
    </div>
  )
}
