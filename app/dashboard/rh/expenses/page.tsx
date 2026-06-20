'use client'

import { useEffect, useMemo, useState } from "react"
import { FilterPopoverButton } from "@/components/filters/filter-popover-button"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  DATE_RANGE_PRESET_LABELS,
  DatePresetRangeFilter,
  type DatePresetRangeValue,
} from "@/components/filters/date-preset-range-filter"
import { useAuth } from "@/context/auth-context"
import { api } from "@/lib/api"
import { getApiErrorMessage } from "@/lib/api-error"
import { ExternalLink, Eye, Info, Loader2, Paperclip, Pencil, Plus, Receipt, Trash2 } from "lucide-react"
import { toast } from "sonner"

type EmployeeProfile = {
  id: string
  user: { name: string }
}

type ExpenseReport = {
  id: string
  origin: string
  location: string
  amount: number
  description: string | null
  receiptUrl: string | null
  date: string
  employeeId: string
  employee: { user: { name: string } }
}

const ORIGIN_LABELS: Record<string, string> = {
  MEAL: 'Refeicao',
  FUEL: 'Combustivel',
  LODGING: 'Hospedagem',
  TRANSPORT: 'Transporte',
  PARKING: 'Estacionamento',
  TOLL: 'Pedagio',
  OTHER: 'Outro',
}

const DEFAULT_FILTER: DatePresetRangeValue = {
  preset: 'current_month',
  dateFrom: '',
  dateTo: '',
}

const DEFAULT_FORM = {
  origin: 'MEAL',
  location: '',
  amount: '',
  description: '',
  date: new Date().toISOString().split('T')[0],
}

export default function ExpensesPage() {
  const { hasPermission } = useAuth()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [profile, setProfile] = useState<EmployeeProfile | null>(null)
  const [expenses, setExpenses] = useState<ExpenseReport[]>([])
  const [filter, setFilter] = useState(DEFAULT_FILTER)
  const [draftFilter, setDraftFilter] = useState(DEFAULT_FILTER)
  const [filterOpen, setFilterOpen] = useState(false)

  const [formOpen, setFormOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<ExpenseReport | null>(null)
  const [formState, setFormState] = useState(DEFAULT_FORM)
  const [receiptFile, setReceiptFile] = useState<File | null>(null)

  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const canManageExpenses = hasPermission('rh.expenses.manage')

  const total = useMemo(
    () => expenses.reduce((sum, expense) => sum + Number(expense.amount), 0),
    [expenses],
  )

  useEffect(() => {
    void fetchInitialData()
  }, [])

  async function fetchInitialData() {
    setLoading(true)
    try {
      const { data: currentProfile } = await api.get('/employees/me')
      setProfile(currentProfile)

      const effectiveFilter =
        filter.dateFrom && filter.dateTo
          ? filter
          : { ...filter, dateFrom: new Date().toISOString().slice(0, 8) + '01', dateTo: new Date().toISOString().split('T')[0] }

      setFilter(effectiveFilter)
      setDraftFilter(effectiveFilter)
      await fetchExpenses(effectiveFilter)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Nao foi possivel carregar a prestacao de contas.'))
    } finally {
      setLoading(false)
    }
  }

  async function fetchExpenses(nextFilter: DatePresetRangeValue) {
    const params = new URLSearchParams()
    if (nextFilter.dateFrom) params.set('dateFrom', nextFilter.dateFrom)
    if (nextFilter.dateTo) params.set('dateTo', nextFilter.dateTo)
    const query = params.toString()
    const url = query ? `/expense-reports/my?${query}` : '/expense-reports/my'
    const { data } = await api.get(url)
    setExpenses(data)
  }

  function resetForm() {
    setEditingExpense(null)
    setFormState({
      ...DEFAULT_FORM,
      date: new Date().toISOString().split('T')[0],
    })
    setReceiptFile(null)
  }

  function handleFilterOpenChange(open: boolean) {
    if (open) {
      setDraftFilter(filter)
    }
    setFilterOpen(open)
  }

  async function handleApplyFilter() {
    setFilter(draftFilter)
    setFilterOpen(false)
    await fetchExpenses(draftFilter)
  }

  async function handleClearFilter() {
    const clearedFilter = {
      ...DEFAULT_FILTER,
      dateFrom: new Date().toISOString().slice(0, 8) + '01',
      dateTo: new Date().toISOString().split('T')[0],
    }
    setDraftFilter(clearedFilter)
    setFilter(clearedFilter)
    setFilterOpen(false)
    await fetchExpenses(clearedFilter)
  }

  function openNewExpense() {
    resetForm()
    setFormOpen(true)
  }

  function openEditExpense(expense: ExpenseReport) {
    setEditingExpense(expense)
    setFormState({
      origin: expense.origin,
      location: expense.location,
      amount: `${Number(expense.amount)}`,
      description: expense.description || '',
      date: expense.date.split('T')[0],
    })
    setReceiptFile(null)
    setFormOpen(true)
  }

  async function uploadReceiptIfNeeded() {
    if (!receiptFile) {
      return editingExpense?.receiptUrl
    }

    const formData = new FormData()
    formData.append('file', receiptFile)
    const { data } = await api.post('/uploads/despesas', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data.url as string
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!profile) return

    setSubmitting(true)
    try {
      const receiptUrl = await uploadReceiptIfNeeded()
      const payload = {
        origin: formState.origin,
        location: formState.location.trim(),
        amount: Number(formState.amount),
        description: formState.description.trim() || undefined,
        receiptUrl: receiptUrl || undefined,
        date: formState.date,
      }

      if (editingExpense) {
        await api.patch(`/expense-reports/${editingExpense.id}`, payload)
        toast.success('Prestacao de contas atualizada.')
      } else {
        await api.post('/expense-reports', payload)
        toast.success('Prestacao de contas registrada.')
      }

      setFormOpen(false)
      resetForm()
      await fetchExpenses(filter)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Nao foi possivel salvar a prestacao de contas.'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.delete(`/expense-reports/${id}`)
      toast.success('Registro removido.')
      await fetchExpenses(filter)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Nao foi possivel remover o registro.'))
    }
  }

  function formatDate(value: string) {
    return new Date(value).toLocaleDateString('pt-BR')
  }

  function formatCurrency(value: number) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  function isDefaultCurrentMonthFilter(value: DatePresetRangeValue) {
    const today = new Date()
    const currentMonthStart = `${today.getFullYear()}-${`${today.getMonth() + 1}`.padStart(2, '0')}-01`
    const currentDay = today.toISOString().split('T')[0]

    return (
      value.preset === 'current_month' &&
      value.dateFrom === currentMonthStart &&
      value.dateTo === currentDay
    )
  }

  function buildFilterSummary(value: DatePresetRangeValue) {
    const presetLabel = DATE_RANGE_PRESET_LABELS[value.preset] || 'Periodo personalizado'
    const hasRange = Boolean(value.dateFrom && value.dateTo)

    return {
      title: presetLabel,
      detail: hasRange ? `${formatDate(value.dateFrom)} ate ${formatDate(value.dateTo)}` : 'Defina um intervalo para aplicar o filtro.',
      tooltip: hasRange
        ? [`Periodo: ${presetLabel}`, `Intervalo: ${formatDate(value.dateFrom)} ate ${formatDate(value.dateTo)}`]
        : [`Periodo: ${presetLabel}`],
      active: hasRange && !isDefaultCurrentMonthFilter(value),
    }
  }

  const isPdfPreview = previewUrl?.toLowerCase().includes('.pdf')
  const filterSummary = buildFilterSummary(filter)

  if (loading) {
    return (
      <div className="flex min-h-[280px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="app-page">
      <Card className="app-section-card">
        <CardContent className="px-0 py-0">
          <section className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[clamp(0.875rem,1.4vw,1rem)] font-semibold tracking-[-0.01em] text-foreground">
                  Recursos Humanos &gt; Prestacao de Contas
                </h1>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="rounded-full text-muted-foreground hover:text-foreground"
                      aria-label="Informacoes da funcionalidade"
                    >
                      <Info className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent sideOffset={8} className="max-w-80 px-3 py-2 text-left text-xs leading-relaxed">
                    Registre despesas, filtre periodos recorrentes rapidamente e visualize comprovantes sem sair do fluxo.
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="rounded-full px-3 py-1">
                  {filterSummary.title}
                </Badge>
                {filterSummary.active ? (
                  <Badge className="rounded-full px-3 py-1">Filtro aplicado</Badge>
                ) : null}
              </div>
              <p className="text-sm text-muted-foreground">{filterSummary.detail}</p>
            </div>

            <div className="flex flex-wrap items-center gap-3 xl:justify-end">
              <FilterPopoverButton
                title="Filtros"
                description="Refine o periodo dos lancamentos com presets rapidos ou um intervalo personalizado."
                active={filterSummary.active}
                activeSummary={filterSummary.tooltip}
                open={filterOpen}
                onOpenChange={handleFilterOpenChange}
                showClear={filterSummary.active}
                onClear={() => void handleClearFilter()}
                footer={
                  <Button type="button" onClick={() => void handleApplyFilter()}>
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
                  if (!open) resetForm()
                }}
              >
                <DialogTrigger asChild>
                  <Button className="h-12 gap-2 px-6 lg:min-w-[164px]" onClick={openNewExpense}>
                    <Plus className="h-4 w-4" />
                    Nova Despesa
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>
                      {editingExpense ? 'Editar prestacao de contas' : 'Registrar prestacao de contas'}
                    </DialogTitle>
                    <DialogDescription>
                      Informe a origem do gasto, o local, o valor e anexe um comprovante quando houver.
                    </DialogDescription>
                  </DialogHeader>

                  <form onSubmit={handleSubmit} className="space-y-6 py-2">
                    <section className="app-section-card space-y-5">
                      <div className="app-form-grid">
                        <div className="field-stack">
                          <Label htmlFor="expense-origin">Origem</Label>
                          <Select
                            value={formState.origin}
                            onValueChange={(value) => setFormState((current) => ({ ...current, origin: value }))}
                          >
                            <SelectTrigger id="expense-origin">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(ORIGIN_LABELS).map(([value, label]) => (
                                <SelectItem key={value} value={value}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="field-stack">
                          <Label htmlFor="expense-date">Data</Label>
                          <Input
                            id="expense-date"
                            type="date"
                            value={formState.date}
                            onChange={(event) => setFormState((current) => ({ ...current, date: event.target.value }))}
                            required
                          />
                        </div>
                        <div className="field-stack md:col-span-2">
                          <Label htmlFor="expense-location">Onde gastou</Label>
                          <Input
                            id="expense-location"
                            placeholder="Ex: restaurante, posto, hotel..."
                            value={formState.location}
                            onChange={(event) => setFormState((current) => ({ ...current, location: event.target.value }))}
                            required
                          />
                        </div>
                        <div className="field-stack">
                          <Label htmlFor="expense-amount">Valor</Label>
                          <Input
                            id="expense-amount"
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={formState.amount}
                            onChange={(event) => setFormState((current) => ({ ...current, amount: event.target.value }))}
                            required
                          />
                        </div>
                        <div className="field-stack md:col-span-2">
                          <Label htmlFor="expense-description">Descricao</Label>
                          <Textarea
                            id="expense-description"
                            placeholder="Adicione contexto para a analise do gasto."
                            value={formState.description}
                            onChange={(event) => setFormState((current) => ({ ...current, description: event.target.value }))}
                          />
                        </div>
                        <div className="field-stack md:col-span-2">
                          <Label htmlFor="expense-receipt">Comprovante</Label>
                          <Input
                            id="expense-receipt"
                            type="file"
                            accept="image/*,.pdf"
                            onChange={(event) => setReceiptFile(event.target.files?.[0] || null)}
                          />
                          {receiptFile ? (
                            <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                              <Paperclip className="h-3.5 w-3.5" />
                              {receiptFile.name}
                            </p>
                          ) : editingExpense?.receiptUrl ? (
                            <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                              <Paperclip className="h-3.5 w-3.5" />
                              Comprovante atual mantido
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </section>

                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={submitting}>
                        {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {editingExpense ? 'Salvar alteracoes' : 'Registrar despesa'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </section>
        </CardContent>
      </Card>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,250px)_minmax(0,250px)]">
        <Card className="app-section-card min-h-[132px]">
          <CardHeader className="px-0 pt-0">
            <CardDescription>Total de registros</CardDescription>
            <CardTitle className="text-3xl">{expenses.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="app-section-card relative min-h-[132px] overflow-hidden">
          <CardHeader className="px-0 pt-0">
            <CardDescription>Valor acumulado no periodo</CardDescription>
            <CardTitle className="text-3xl">{formatCurrency(total)}</CardTitle>
          </CardHeader>
          <Receipt className="pointer-events-none absolute bottom-4 right-4 h-14 w-14 text-muted/50" />
        </Card>
      </section>

      <Card className="app-section-card overflow-hidden">
        <CardHeader className="px-0 pt-0 pb-6">
          <div className="space-y-2">
            <CardTitle className="text-[2rem] leading-none tracking-[-0.03em]">Minhas despesas</CardTitle>
            <CardDescription>
              Acompanhe seus registros, revise comprovantes e ajuste informacoes quando necessario.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="rounded-[1.75rem] border border-border/70 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Local</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Comprovante</TableHead>
                  <TableHead className="text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-[280px]">
                      <div className="flex flex-col items-center justify-center gap-5 text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
                          <Receipt className="h-7 w-7" />
                        </div>
                        <p className="text-base text-muted-foreground">
                          Nenhum registro encontrado para o periodo selecionado.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>{formatDate(expense.date)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="rounded-full">
                          {ORIGIN_LABELS[expense.origin] || expense.origin}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">{expense.location}</p>
                          {expense.description ? (
                            <p className="text-xs text-muted-foreground">{expense.description}</p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{formatCurrency(Number(expense.amount))}</TableCell>
                      <TableCell>
                        {expense.receiptUrl ? (
                          <Button variant="ghost" size="sm" className="gap-2 px-0" onClick={() => setPreviewUrl(expense.receiptUrl)}>
                            <Eye className="h-4 w-4" />
                            Visualizar
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">Sem comprovante</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openEditExpense(expense)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {canManageExpenses || expense.employeeId === profile?.id ? (
                            <Button variant="ghost" size="icon" onClick={() => void handleDelete(expense.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          </CardContent>
      </Card>

      <Dialog open={!!previewUrl} onOpenChange={(open) => !open && setPreviewUrl(null)}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Visualizacao do comprovante</DialogTitle>
            <DialogDescription>
              Confira o anexo sem sair do fluxo de prestacao de contas.
            </DialogDescription>
          </DialogHeader>

          {previewUrl ? (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-2xl border border-border/70 bg-muted/20">
                {isPdfPreview ? (
                  <iframe src={previewUrl} title="Comprovante em PDF" className="h-[70vh] w-full" />
                ) : (
                  <img src={previewUrl} alt="Comprovante" className="max-h-[70vh] w-full object-contain" />
                )}
              </div>
              <div className="flex justify-end">
                <Button asChild variant="outline">
                  <a href={previewUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Abrir em nova aba
                  </a>
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
