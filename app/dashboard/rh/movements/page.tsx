'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'
import { toast } from 'sonner'

type MovementRecord = {
  id: string
  type: string
  prevValue?: string | null
  newValue?: string | null
  reason?: string | null
  createdAt: string
  employee?: {
    id: string
    user?: {
      name?: string
      email?: string
    }
  }
  author?: {
    id: string
    user?: {
      name?: string
    }
  }
}

const MOVEMENT_META: Record<string, { label: string; icon: string; tone: string }> = {
  SALARY: { label: 'Salario', icon: 'payments', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  DEPARTMENT: { label: 'Departamento', icon: 'apartment', tone: 'bg-blue-50 text-blue-700 border-blue-200' },
  BRANCH: { label: 'Filial', icon: 'storefront', tone: 'bg-sky-50 text-sky-700 border-sky-200' },
  ROLE: { label: 'Cargo / Funcao', icon: 'badge', tone: 'bg-violet-50 text-violet-700 border-violet-200' },
  MANAGER: { label: 'Gestor', icon: 'supervisor_account', tone: 'bg-amber-50 text-amber-700 border-amber-200' },
  STATUS: { label: 'Status', icon: 'flag', tone: 'bg-zinc-100 text-zinc-700 border-zinc-200' },
  VACATION_REQUEST: { label: 'Solicitacao de Ferias', icon: 'beach_access', tone: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200' },
  VACATION_UPDATE: { label: 'Edicao de Ferias', icon: 'edit_calendar', tone: 'bg-pink-50 text-pink-700 border-pink-200' },
  VACATION_MANAGER_APPROVAL: { label: 'Aprovacao da Gestao', icon: 'fact_check', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  VACATION_MANAGER_REJECTION: { label: 'Reprovacao da Gestao', icon: 'gpp_bad', tone: 'bg-rose-50 text-rose-700 border-rose-200' },
  VACATION_HR_CONFIRMATION: { label: 'Confirmacao do RH', icon: 'task_alt', tone: 'bg-teal-50 text-teal-700 border-teal-200' },
  VACATION_HR_REJECTION: { label: 'Reprovacao do RH', icon: 'cancel', tone: 'bg-rose-50 text-rose-700 border-rose-200' },
  VACATION_HR_CANCELLATION: { label: 'Cancelamento do RH', icon: 'event_busy', tone: 'bg-orange-50 text-orange-700 border-orange-200' },
  VACATION_DELETE: { label: 'Remocao de Solicitacao', icon: 'delete', tone: 'bg-stone-100 text-stone-700 border-stone-200' },
}

function getMovementMeta(type: string) {
  return (
    MOVEMENT_META[type] || {
      label: type,
      icon: 'swap_horiz',
      tone: 'bg-slate-100 text-slate-700 border-slate-200',
    }
  )
}

export default function EmployeeMovementsPage() {
  const [movements, setMovements] = useState<MovementRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

  useEffect(() => {
    const fetchMovements = async () => {
      try {
        const { data } = await api.get('/movements')
        setMovements(data)
      } catch (error) {
        toast.error(
          getApiErrorMessage(error, 'Nao foi possivel carregar a movimentacao do colaborador.'),
        )
      } finally {
        setLoading(false)
      }
    }

    fetchMovements()
  }, [])

  const availableTypes = useMemo(
    () => Array.from(new Set(movements.map((movement) => movement.type))).sort(),
    [movements],
  )

  const filteredMovements = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase('pt-BR')

    return movements.filter((movement) => {
      const employeeName = movement.employee?.user?.name?.toLocaleLowerCase('pt-BR') || ''
      const authorName = movement.author?.user?.name?.toLocaleLowerCase('pt-BR') || ''
      const reason = movement.reason?.toLocaleLowerCase('pt-BR') || ''
      const prevValue = movement.prevValue?.toLocaleLowerCase('pt-BR') || ''
      const newValue = movement.newValue?.toLocaleLowerCase('pt-BR') || ''

      const matchesSearch =
        normalizedSearch.length === 0 ||
        employeeName.includes(normalizedSearch) ||
        authorName.includes(normalizedSearch) ||
        reason.includes(normalizedSearch) ||
        prevValue.includes(normalizedSearch) ||
        newValue.includes(normalizedSearch)

      const matchesType = typeFilter === 'all' || movement.type === typeFilter

      return matchesSearch && matchesType
    })
  }, [movements, searchTerm, typeFilter])

  const summary = useMemo(() => {
    const vacationEvents = movements.filter((movement) => movement.type.startsWith('VACATION_')).length
    const salaryEvents = movements.filter((movement) => movement.type === 'SALARY').length

    return {
      total: movements.length,
      vacationEvents,
      salaryEvents,
    }
  }, [movements])

  return (
    <div className="app-page">
      <section className="app-page-header">
        <div className="space-y-2">
          <p className="app-kicker">Recursos Humanos</p>
          <h1 className="app-title">Movimentacao do Colaborador</h1>
          <p className="app-subtitle">
            Acompanhe transferencias, alteracoes de cargo, salario, gestor e eventos de ferias
            em um ledger unico para auditoria e retomada.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="app-section-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Eventos registrados</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight">{summary.total}</p>
          </CardContent>
        </Card>
        <Card className="app-section-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Eventos de ferias</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight">{summary.vacationEvents}</p>
          </CardContent>
        </Card>
        <Card className="app-section-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Alteracoes salariais</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight">{summary.salaryEvents}</p>
          </CardContent>
        </Card>
      </section>

      <Card className="app-section-card">
        <CardHeader className="space-y-1">
          <CardTitle>Historico centralizado</CardTitle>
          <p className="text-sm text-muted-foreground">
            Use os filtros para localizar quem mudou, o que mudou e qual foi a justificativa.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="app-toolbar flex flex-col gap-3 md:flex-row md:items-end">
            <div className="field-stack min-w-[260px] flex-1">
              <label htmlFor="movement-search" className="text-sm font-medium">
                Buscar por colaborador, responsavel ou motivo
              </label>
              <Input
                id="movement-search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Ex.: salario, ferias, Joao, transferencia..."
              />
            </div>
            <div className="field-stack min-w-[220px]">
              <label htmlFor="movement-type" className="text-sm font-medium">
                Tipo de movimentacao
              </label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger id="movement-type">
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  {availableTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {getMovementMeta(type).label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-dashed border-border/80 px-6 py-12 text-center text-sm text-muted-foreground">
              Carregando movimentacoes...
            </div>
          ) : filteredMovements.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border/80 px-6 py-12 text-center">
              <p className="text-sm font-medium text-foreground">Nenhuma movimentacao encontrada.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Ajuste os filtros ou execute uma alteracao na ficha do colaborador para iniciar o ledger.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredMovements.map((movement) => {
                const meta = getMovementMeta(movement.type)
                const employeeName = movement.employee?.user?.name || 'Colaborador'
                const authorName = movement.author?.user?.name || 'Sistema'
                const createdAt = new Date(movement.createdAt)

                return (
                  <article
                    key={movement.id}
                    className="rounded-3xl border border-border/80 bg-card/90 p-5 shadow-sm"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <span className="material-symbols-outlined text-[20px]">{meta.icon}</span>
                          </span>
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h2 className="text-base font-semibold text-foreground">{employeeName}</h2>
                              <Badge variant="outline" className={meta.tone}>
                                {meta.label}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Registrado por <span className="font-medium text-foreground">{authorName}</span>
                            </p>
                          </div>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="rounded-2xl border border-border/70 bg-muted/30 p-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                              Origem
                            </p>
                            <p className="mt-2 text-sm text-foreground">
                              {movement.prevValue || 'Nao informado'}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-border/70 bg-muted/30 p-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                              Destino
                            </p>
                            <p className="mt-2 text-sm text-foreground">
                              {movement.newValue || 'Nao informado'}
                            </p>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-border/70 bg-background p-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            Motivo
                          </p>
                          <p className="mt-2 text-sm text-foreground">
                            {movement.reason || 'Sem justificativa registrada.'}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-border/70 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                        <p className="font-medium text-foreground">
                          {createdAt.toLocaleDateString('pt-BR')}
                        </p>
                        <p>{createdAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
