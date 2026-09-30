'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileStack,
  ReceiptText,
  RotateCw,
  Search,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { FilterPopover } from '@/components/ui/filter-popover'
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
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'

type PurchaseRequest = {
  id: string
  code: number
  status: string
  justification: string
  createdAt: string
  department?: { name?: string | null } | null
  requester?: { user?: { name?: string | null } | null } | null
}

const STATUS_LABELS: Record<string, string> = {
  APPROVED: 'Aguardando cotação',
  IN_QUOTATION: 'Em cotação',
  ORDERED: 'Ordem gerada',
}

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'Todos os status' },
  { value: 'APPROVED', label: 'Aguardando cotação' },
  { value: 'IN_QUOTATION', label: 'Em cotação' },
  { value: 'ORDERED', label: 'Ordem gerada' },
]

function getStatusBadgeStyle(status: string) {
  switch (status) {
    case 'APPROVED':
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60'
    case 'IN_QUOTATION':
      return 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900/60'
    case 'ORDERED':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60'
    default:
      return 'bg-muted text-muted-foreground border-border'
  }
}

export default function QuotationsIndexPage() {
  const [requests, setRequests] = useState<PurchaseRequest[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  // Paginação
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  const fetchRequests = async () => {
    try {
      setLoading(true)
      const { data } = await api.get<PurchaseRequest[]>('/purchase-requests/buyer/pending')
      setRequests(data)
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, 'Não foi possível carregar a fila de cotações.'),
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchRequests()
  }, [])

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (search.trim()) count++
    if (statusFilter !== 'ALL') count++
    return count
  }, [search, statusFilter])

  function handleClearFilters() {
    setSearch('')
    setStatusFilter('ALL')
    setCurrentPage(1)
  }

  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      if (search.trim()) {
        const q = search.toLowerCase()
        const matchCode = request.code.toString().includes(q)
        const matchJustification = request.justification.toLowerCase().includes(q)
        const matchRequester = (request.requester?.user?.name || '').toLowerCase().includes(q)
        const matchDepartment = (request.department?.name || '').toLowerCase().includes(q)
        if (!matchCode && !matchJustification && !matchRequester && !matchDepartment) {
          return false
        }
      }

      if (statusFilter !== 'ALL' && request.status !== statusFilter) {
        return false
      }

      return true
    })
  }, [requests, search, statusFilter])

  const totalPages = Math.ceil(filteredRequests.length / pageSize) || 1

  const paginatedRequests = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredRequests.slice(start, start + pageSize)
  }, [filteredRequests, currentPage, pageSize])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1)
    }
  }, [totalPages, currentPage])

  const stats = useMemo(() => {
    const awaiting = requests.filter((request) => request.status === 'APPROVED').length
    const quoting = requests.filter((request) => request.status === 'IN_QUOTATION').length
    const ordered = requests.filter((request) => request.status === 'ORDERED').length

    return {
      total: requests.length,
      awaiting,
      quoting,
      ordered,
    }
  }, [requests])

  return (
    <div className="app-page space-y-6">
      {/* 1. Cabeçalho Padronizado */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Fila Operacional de Cotações
          </h1>
          <p className="text-sm text-muted-foreground">
            Organize a fila de requisições aprovadas, abra cotações com fornecedores e homologue propostas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm" className="h-9 gap-1.5 font-medium">
            <Link href="/dashboard/compras/ordens">
              <span>Revisar ordens</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>

          {/* Filtro Flutuante */}
          <FilterPopover
            activeCount={activeFilterCount}
            onClear={handleClearFilters}
            onApply={() => setCurrentPage(1)}
          >
            <div className="field-stack">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Palavra-chave
              </span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  className="pl-9 h-9 text-sm"
                  placeholder="Número, justificativa, solicitante..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setCurrentPage(1)
                    }
                  }}
                />
              </div>
            </div>

            <div className="field-stack">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Status
              </span>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </FilterPopover>

          {/* Botão de Atualizar */}
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            onClick={() => void fetchRequests()}
            disabled={loading}
          >
            <RotateCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </Button>
        </div>
      </section>

      {/* 2. Cards de Resumo (KPIs em 4 colunas) */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Card 1: Fila Total */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Fila total
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {stats.total}
            </span>
            <FileStack className="size-5 text-muted-foreground/60" />
          </CardContent>
        </Card>

        {/* Card 2: Aguardando abertura com tag âmbar */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Aguardando cotação
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {stats.awaiting}
            </span>
            {stats.awaiting > 0 && (
              <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                Ação necessária
              </span>
            )}
          </CardContent>
        </Card>

        {/* Card 3: Em cotação */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Em cotação
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {stats.quoting}
            </span>
          </CardContent>
        </Card>

        {/* Card 4: Ordens geradas */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Ordens geradas
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2">
            <span className="text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {stats.ordered}
            </span>
          </CardContent>
        </Card>
      </section>

      {/* 3. Tabela Responsiva Sem Scroll Horizontal */}
      <Card className="app-section-card overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            Carregando fila de cotações...
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 p-8 text-center">
            <ReceiptText className="size-12 text-muted-foreground/50" />
            <div className="space-y-1">
              <p className="font-semibold text-foreground">Nenhuma requisição na fila</p>
              <p className="text-sm text-muted-foreground">
                {activeFilterCount > 0
                  ? 'Nenhum resultado corresponde aos filtros aplicados.'
                  : 'Assim que pedidos forem aprovados pela gestão, eles surgirão nesta área para cotação.'}
              </p>
            </div>
            {activeFilterCount > 0 && (
              <Button variant="outline" size="sm" onClick={handleClearFilters} className="mt-2">
                Limpar filtros
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[80px] text-xs font-semibold uppercase tracking-wider">
                    ID
                  </TableHead>
                  <TableHead className="min-w-[240px] text-xs font-semibold uppercase tracking-wider">
                    Pedido / Justificativa
                  </TableHead>
                  <TableHead className="min-w-[200px] text-xs font-semibold uppercase tracking-wider">
                    Solicitante / Depto
                  </TableHead>
                  <TableHead className="w-[180px] text-xs font-semibold uppercase tracking-wider">
                    Status / Entrada
                  </TableHead>
                  <TableHead className="w-[140px] text-right text-xs font-semibold uppercase tracking-wider">
                    Ação
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRequests.map((request) => (
                  <TableRow key={request.id} className="transition-colors">
                    {/* ID */}
                    <TableCell className="font-semibold text-muted-foreground text-sm">
                      #{request.code}
                    </TableCell>

                    {/* Pedido / Justificativa */}
                    <TableCell>
                      <div className="space-y-0.5">
                        <Link
                          href={`/dashboard/compras/cotacoes/${request.id}`}
                          className="font-semibold text-foreground text-sm hover:underline line-clamp-1"
                        >
                          {request.justification}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          Processo de suprimento
                        </p>
                      </div>
                    </TableCell>

                    {/* Solicitante / Depto */}
                    <TableCell>
                      <div className="space-y-0.5">
                        <div className="text-sm font-medium text-foreground">
                          {request.requester?.user?.name || 'Não informado'}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {request.department?.name || 'Sem departamento'}
                        </p>
                      </div>
                    </TableCell>

                    {/* Status / Entrada */}
                    <TableCell>
                      <div className="space-y-1">
                        <div>
                          <span
                            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${getStatusBadgeStyle(
                              request.status,
                            )}`}
                          >
                            {STATUS_LABELS[request.status] || request.status}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Entrada: {format(new Date(request.createdAt), 'dd/MM/yyyy')}
                        </p>
                      </div>
                    </TableCell>

                    {/* Ação */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          asChild
                          variant="ghost"
                          size="icon-sm"
                          className="text-muted-foreground hover:text-foreground"
                          title="Visualizar cotação"
                        >
                          <Link href={`/dashboard/compras/cotacoes/${request.id}`}>
                            <Eye className="size-4" />
                          </Link>
                        </Button>

                        <Button asChild size="sm" className="h-8 px-3 text-xs font-semibold gap-1">
                          <Link href={`/dashboard/compras/cotacoes/${request.id}`}>
                            <span>Abrir</span>
                            <ArrowRight className="size-3" />
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* 4. Rodapé com Paginação Integrada */}
        {!loading && filteredRequests.length > 0 && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-6 py-4 border-t bg-muted/10 text-xs text-muted-foreground">
            <div>
              Exibindo <span className="font-semibold text-foreground">{paginatedRequests.length}</span> de{' '}
              <span className="font-semibold text-foreground">{filteredRequests.length}</span> registros
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon-sm"
                className="size-8"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="size-4" />
              </Button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <Button
                  key={pageNum}
                  variant={pageNum === currentPage ? 'default' : 'outline'}
                  size="icon-sm"
                  className={`size-8 font-medium ${pageNum === currentPage ? 'pointer-events-none' : ''}`}
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </Button>
              ))}

              <Button
                variant="outline"
                size="icon-sm"
                className="size-8"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
