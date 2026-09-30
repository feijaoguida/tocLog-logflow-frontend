'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Calendar,
  CreditCard,
  DollarSign,
  ExternalLink,
  Eye,
  FileText,
  Loader2,
  Paperclip,
  Pencil,
  Plus,
  Receipt,
  RotateCw,
  Search,
  Trash2,
  TrendingUp,
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
import { Textarea } from '@/components/ui/textarea'
import { FilterPopover } from '@/components/ui/filter-popover'
import { TablePagination } from '@/components/ui/table-pagination'
import {
  DATE_RANGE_PRESET_LABELS,
  DatePresetRangeFilter,
  type DatePresetRangeValue,
} from '@/components/filters/date-preset-range-filter'
import { useAuth } from '@/context/auth-context'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'

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
  MEAL: 'Refeição',
  FUEL: 'Combustível',
  LODGING: 'Hospedagem',
  TRANSPORT: 'Transporte',
  PARKING: 'Estacionamento',
  TOLL: 'Pedágio',
  OTHER: 'Outro',
}

const ORIGIN_BADGE_STYLES: Record<string, string> = {
  MEAL: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60',
  FUEL: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900/60',
  LODGING: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900/60',
  TRANSPORT: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60',
  PARKING: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-900/60',
  TOLL: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-800',
  OTHER: 'bg-muted text-muted-foreground border-border',
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

function getInitials(name?: string | null) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function ExpensesPage() {
  const { hasPermission } = useAuth()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [profile, setProfile] = useState<EmployeeProfile | null>(null)
  const [expenses, setExpenses] = useState<ExpenseReport[]>([])
  const [filter, setFilter] = useState(DEFAULT_FILTER)
  const [draftFilter, setDraftFilter] = useState(DEFAULT_FILTER)

  const [formOpen, setFormOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<ExpenseReport | null>(null)
  const [formState, setFormState] = useState(DEFAULT_FORM)
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const canManageExpenses = hasPermission('rh.expenses.manage')

  const total = useMemo(
    () => expenses.reduce((sum, expense) => sum + Number(expense.amount), 0),
    [expenses],
  )

  const average = useMemo(
    () => (expenses.length > 0 ? total / expenses.length : 0),
    [expenses, total],
  )

  const withReceiptCount = useMemo(
    () => expenses.filter((e) => Boolean(e.receiptUrl)).length,
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
      await fetchExpenses(DEFAULT_FILTER)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Erro ao carregar perfil do colaborador.'))
    } finally {
      setLoading(false)
    }
  }

  async function fetchExpenses(currentFilter: DatePresetRangeValue) {
    try {
      const params = new URLSearchParams()
      if (currentFilter.dateFrom) params.set('dateFrom', currentFilter.dateFrom)
      if (currentFilter.dateTo) params.set('dateTo', currentFilter.dateTo)

      const endpoint = params.toString()
        ? `/expense-reports?${params.toString()}`
        : '/expense-reports'
      const { data } = await api.get(endpoint)
      setExpenses(data)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível carregar as despesas.'))
    }
  }

  function resetForm() {
    setEditingExpense(null)
    setFormState(DEFAULT_FORM)
    setReceiptFile(null)
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
      amount: String(expense.amount),
      description: expense.description || '',
      date: expense.date.split('T')[0],
    })
    setReceiptFile(null)
    setFormOpen(true)
  }

  async function handleApplyFilter() {
    setFilter(draftFilter)
    setCurrentPage(1)
    await fetchExpenses(draftFilter)
  }

  async function handleClearFilter() {
    setDraftFilter(DEFAULT_FILTER)
    setFilter(DEFAULT_FILTER)
    setCurrentPage(1)
    await fetchExpenses(DEFAULT_FILTER)
  }

  async function uploadReceipt() {
    if (!receiptFile) return null
    const formData = new FormData()
    formData.append('file', receiptFile)

    const { data } = await api.post('/uploads/comprovantes', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data.url as string
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!profile) return

    setSubmitting(true)
    try {
      let receiptUrl = editingExpense?.receiptUrl || null
      if (receiptFile) {
        receiptUrl = await uploadReceipt()
      }

      const payload = {
        employeeId: profile.id,
        origin: formState.origin,
        location: formState.location.trim(),
        amount: Number(formState.amount),
        description: formState.description.trim() || undefined,
        receiptUrl: receiptUrl || undefined,
        date: formState.date,
      }

      if (editingExpense) {
        await api.patch(`/expense-reports/${editingExpense.id}`, payload)
        toast.success('Prestação de contas atualizada.')
      } else {
        await api.post('/expense-reports', payload)
        toast.success('Prestação de contas registrada com sucesso.')
      }

      setFormOpen(false)
      resetForm()
      await fetchExpenses(filter)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível salvar a prestação de contas.'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Deseja realmente excluir este lançamento?')) return
    try {
      await api.delete(`/expense-reports/${id}`)
      toast.success('Lançamento removido com sucesso.')
      await fetchExpenses(filter)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível remover o registro.'))
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

  const paginatedExpenses = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return expenses.slice(start, start + pageSize)
  }, [expenses, currentPage, pageSize])

  const isPdfPreview = previewUrl?.toLowerCase().includes('.pdf')

  return (
    <div className="app-page space-y-6">
      {/* 1. Cabeçalho Padronizado */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Prestação de Contas
          </h1>
          <p className="text-sm text-muted-foreground">
            Controle de despesas corporativas, reembolsos e conciliação de comprovantes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={openNewExpense}
            size="sm"
            className="h-9 gap-1.5 font-semibold"
          >
            <Plus className="size-4" />
            <span>Nova despesa</span>
          </Button>

          {/* Filtro Flutuante com Preset de Período */}
          <FilterPopover
            activeCount={Boolean(filter.dateFrom && filter.dateTo) ? 1 : 0}
            onClear={() => void handleClearFilter()}
            onApply={() => void handleApplyFilter()}
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
            onClick={() => void fetchExpenses(filter)}
            disabled={loading}
          >
            <RotateCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </Button>
        </div>
      </section>

      {/* 2. Cards de Resumo (KPIs em 4 colunas) */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Total em Reais */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Lançado
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {formatCurrency(total)}
            </span>
            <DollarSign className="size-5 text-emerald-600 dark:text-emerald-400" />
          </CardContent>
        </Card>

        {/* Quantidade de lançamentos */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Lançamentos
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {expenses.length}
            </span>
            <Receipt className="size-5 text-muted-foreground/60" />
          </CardContent>
        </Card>

        {/* Média por despesa */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Ticket Médio
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {formatCurrency(average)}
            </span>
            <TrendingUp className="size-5 text-muted-foreground/60" />
          </CardContent>
        </Card>

        {/* Com Comprovante */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Com Comprovante
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {withReceiptCount}
            </span>
            <Paperclip className="size-5 text-muted-foreground/60" />
          </CardContent>
        </Card>
      </section>

      {/* 3. Tabela Sem Scroll Horizontal */}
      <Card className="app-section-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/80 hover:bg-transparent">
                  <TableHead className="w-[120px] font-semibold text-foreground text-xs uppercase tracking-wider pl-6">
                    Data
                  </TableHead>
                  <TableHead className="min-w-[200px] font-semibold text-foreground text-xs uppercase tracking-wider">
                    Colaborador / Local
                  </TableHead>
                  <TableHead className="w-[150px] font-semibold text-foreground text-xs uppercase tracking-wider">
                    Categoria
                  </TableHead>
                  <TableHead className="min-w-[200px] font-semibold text-foreground text-xs uppercase tracking-wider">
                    Descrição
                  </TableHead>
                  <TableHead className="w-[120px] font-semibold text-foreground text-xs uppercase tracking-wider">
                    Comprovante
                  </TableHead>
                  <TableHead className="w-[130px] font-semibold text-foreground text-xs uppercase tracking-wider">
                    Valor
                  </TableHead>
                  <TableHead className="w-[100px] font-semibold text-foreground text-xs uppercase tracking-wider text-right pr-6">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedExpenses.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      Nenhuma despesa encontrada para o período selecionado.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedExpenses.map((expense) => {
                    const badgeStyle =
                      ORIGIN_BADGE_STYLES[expense.origin] ||
                      'bg-muted text-muted-foreground border-border'
                    const originLabel = ORIGIN_LABELS[expense.origin] || expense.origin

                    return (
                      <TableRow
                        key={expense.id}
                        className="border-b border-border/60 hover:bg-muted/40 transition-colors"
                      >
                        <TableCell className="pl-6 text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(expense.date)}
                        </TableCell>

                        <TableCell>
                          <div className="font-semibold text-sm text-foreground">
                            {expense.employee.user.name}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {expense.location}
                          </span>
                        </TableCell>

                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${badgeStyle}`}
                          >
                            {originLabel}
                          </span>
                        </TableCell>

                        <TableCell className="text-xs text-muted-foreground">
                          {expense.description || '-'}
                        </TableCell>

                        <TableCell>
                          {expense.receiptUrl ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 gap-1 px-2 text-xs text-primary hover:bg-primary/10"
                              onClick={() => setPreviewUrl(expense.receiptUrl)}
                            >
                              <Paperclip className="size-3.5" />
                              <span>Ver anexo</span>
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">
                              Sem anexo
                            </span>
                          )}
                        </TableCell>

                        <TableCell className="font-semibold text-sm text-foreground whitespace-nowrap">
                          {formatCurrency(Number(expense.amount))}
                        </TableCell>

                        <TableCell className="text-right pr-6">
                          <div className="inline-flex items-center justify-end gap-1">
                            {(canManageExpenses || expense.employeeId === profile?.id) && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  className="size-8 text-muted-foreground hover:text-foreground"
                                  onClick={() => openEditExpense(expense)}
                                  title="Editar despesa"
                                >
                                  <Pencil className="size-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  className="size-8 text-destructive/80 hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => void handleDelete(expense.id)}
                                  title="Excluir despesa"
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>

            <div className="border-t border-border/70 px-4">
              <TablePagination
                page={currentPage}
                pageSize={pageSize}
                totalItems={expenses.length}
                onPageChange={setCurrentPage}
                onPageSizeChange={(newSize) => {
                  setPageSize(newSize)
                  setCurrentPage(1)
                }}
                pageSizeOptions={[5, 10, 20, 50]}
              />
            </div>
          </>
        )}
      </Card>

      {/* 4. Modal de Nova / Editar Despesa */}
      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) resetForm()
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editingExpense ? 'Editar Prestação de Contas' : 'Nova Despesa Corporativa'}
            </DialogTitle>
            <DialogDescription>
              Informe o tipo de gasto, o valor, a data e anexe a nota ou cupom fiscal.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="space-y-4 rounded-lg border border-border bg-card p-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="expense-origin">Categoria *</Label>
                  <Select
                    value={formState.origin}
                    onValueChange={(value) =>
                      setFormState((prev) => ({ ...prev, origin: value }))
                    }
                  >
                    <SelectTrigger id="expense-origin">
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ORIGIN_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="expense-amount">Valor (R$) *</Label>
                  <Input
                    id="expense-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    value={formState.amount}
                    onChange={(e) =>
                      setFormState((prev) => ({ ...prev, amount: e.target.value }))
                    }
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="expense-date">Data da Despesa *</Label>
                  <Input
                    id="expense-date"
                    type="date"
                    value={formState.date}
                    onChange={(e) =>
                      setFormState((prev) => ({ ...prev, date: e.target.value }))
                    }
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="expense-location">Local / Estabelecimento *</Label>
                  <Input
                    id="expense-location"
                    placeholder="Ex: Restaurante Central, Posto Ipiranga"
                    value={formState.location}
                    onChange={(e) =>
                      setFormState((prev) => ({ ...prev, location: e.target.value }))
                    }
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="expense-desc">Descrição / Justificativa</Label>
                <Textarea
                  id="expense-desc"
                  placeholder="Finalidade operacional desta despesa..."
                  value={formState.description}
                  onChange={(e) =>
                    setFormState((prev) => ({ ...prev, description: e.target.value }))
                  }
                  rows={2}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="expense-file">Comprovante (Nota Fiscal / Cupom / Recibo)</Label>
                <Input
                  id="expense-file"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) =>
                    setReceiptFile(e.target.files?.[0] || null)
                  }
                />
              </div>
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
                {editingExpense ? 'Salvar alterações' : 'Registrar despesa'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 5. Modal de Visualização de Comprovante */}
      <Dialog
        open={Boolean(previewUrl)}
        onOpenChange={(open) => {
          if (!open) setPreviewUrl(null)
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Visualização do Comprovante</DialogTitle>
          </DialogHeader>

          <div className="flex max-h-[70vh] items-center justify-center overflow-auto rounded-lg border border-border bg-muted/20 p-4">
            {previewUrl ? (
              isPdfPreview ? (
                <iframe
                  src={previewUrl}
                  title="Comprovante em PDF"
                  className="h-[500px] w-full rounded-md border"
                />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={previewUrl}
                  alt="Comprovante de despesa"
                  className="max-h-[500px] w-auto rounded-md object-contain"
                />
              )
            ) : null}
          </div>

          <DialogFooter>
            {previewUrl && (
              <Button asChild variant="outline" size="sm">
                <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-1.5 size-4" />
                  Abrir em nova aba
                </a>
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPreviewUrl(null)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
