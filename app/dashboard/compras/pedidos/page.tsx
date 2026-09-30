'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ChevronLeft,
  ChevronRight,
  Edit,
  Eye,
  Plus,
  RotateCw,
  Search,
  Send,
  ShoppingBag,
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
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
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'

type PurchaseRequestItem = {
  id: string
  quantity: number | string
  product?: { name?: string | null } | null
  description?: string | null
}

type PurchaseRequest = {
  id: string
  code: number
  status: string
  justification: string
  observation?: string | null
  createdAt: string
  estimatedTotal?: number | string | null
  items: PurchaseRequestItem[]
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Rascunho',
  PENDING: 'Aguardando aprovação',
  APPROVED: 'Aprovado',
  REJECTED: 'Reprovado',
  IN_QUOTATION: 'Em cotação',
  ORDERED: 'Ordem gerada',
}

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'Todos os status' },
  { value: 'DRAFT', label: 'Rascunhos' },
  { value: 'PENDING', label: 'Aguardando aprovação' },
  { value: 'APPROVED', label: 'Aprovados' },
  { value: 'IN_QUOTATION', label: 'Em cotação' },
  { value: 'ORDERED', label: 'Ordem gerada' },
  { value: 'REJECTED', label: 'Reprovados' },
]

function getStatusBadgeStyle(status: string) {
  switch (status) {
    case 'PENDING':
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60'
    case 'APPROVED':
    case 'ORDERED':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60'
    case 'IN_QUOTATION':
      return 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900/60'
    case 'REJECTED':
      return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60'
    case 'DRAFT':
    default:
      return 'bg-muted text-muted-foreground border-border'
  }
}

export default function PurchaseRequestsPage() {
  const [requests, setRequests] = useState<PurchaseRequest[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [onlyDrafts, setOnlyDrafts] = useState(false)

  // Paginação
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    title: string
    description?: string
    confirmText?: string
    action?: () => Promise<void>
  }>({
    open: false,
    title: '',
  })

  const fetchRequests = async () => {
    try {
      setLoading(true)
      const { data } = await api.get<PurchaseRequest[]>('/purchase-requests/my')
      setRequests(data)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível carregar os pedidos.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchRequests()
  }, [])

  const handleSubmitRequest = (id: string, code: number) => {
    setConfirmDialog({
      open: true,
      title: 'Enviar Pedido para Aprovação',
      description: `Deseja submeter a requisição #${code} para aprovação departamental? Uma vez enviada, a edição ficará restrita.`,
      confirmText: 'Enviar para Aprovação',
      action: async () => {
        try {
          await api.patch(`/purchase-requests/${id}/submit`)
          toast.success('Pedido enviado para aprovação com sucesso.')
          await fetchRequests()
        } catch (error) {
          toast.error(getApiErrorMessage(error, 'Não foi possível enviar o pedido.'))
        }
      },
    })
  }

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (search.trim()) count++
    if (statusFilter !== 'ALL') count++
    if (onlyDrafts) count++
    return count
  }, [search, statusFilter, onlyDrafts])

  function handleClearFilters() {
    setSearch('')
    setStatusFilter('ALL')
    setOnlyDrafts(false)
    setCurrentPage(1)
  }

  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      if (search.trim()) {
        const q = search.toLowerCase()
        const matchCode = request.code.toString().includes(q)
        const matchJustification = request.justification.toLowerCase().includes(q)
        const matchObs = (request.observation || '').toLowerCase().includes(q)
        if (!matchCode && !matchJustification && !matchObs) {
          return false
        }
      }

      if (statusFilter !== 'ALL' && request.status !== statusFilter) {
        return false
      }

      if (onlyDrafts && request.status !== 'DRAFT') {
        return false
      }

      return true
    })
  }, [requests, search, statusFilter, onlyDrafts])

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
    return {
      total: requests.length,
      drafts: requests.filter((request) => request.status === 'DRAFT').length,
      pending: requests.filter((request) => request.status === 'PENDING').length,
      approved: requests.filter((request) =>
        ['APPROVED', 'IN_QUOTATION', 'ORDERED'].includes(request.status),
      ).length,
    }
  }, [requests])

  return (
    <div className="app-page space-y-6">
      {/* 1. Cabeçalho Padronizado */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Meus Pedidos de Compra
          </h1>
          <p className="text-sm text-muted-foreground">
            Crie novas solicitações, envie para aprovação e acompanhe o andamento dos seus suprimentos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm" className="h-9 gap-1.5 font-semibold">
            <Link href="/dashboard/compras/pedidos/new">
              <Plus className="size-4" />
              <span>Novo pedido</span>
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
                  placeholder="Número ou justificativa..."
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

            <div className="flex items-center gap-4 pt-1">
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <Checkbox
                  checked={onlyDrafts}
                  onCheckedChange={(val) => setOnlyDrafts(Boolean(val))}
                />
                <span>Apenas rascunhos</span>
              </label>
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
        {/* Card 1: Total */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total de pedidos
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {stats.total}
            </span>
          </CardContent>
        </Card>

        {/* Card 2: Rascunhos */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Rascunhos
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {stats.drafts}
            </span>
          </CardContent>
        </Card>

        {/* Card 3: Em aprovação com Tag âmbar */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Em aprovação
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {stats.pending}
            </span>
            {stats.pending > 0 && (
              <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                Ação necessária
              </span>
            )}
          </CardContent>
        </Card>

        {/* Card 4: Aprovadas / Concluídas */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Aprovadas / Cotação
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2">
            <span className="text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {stats.approved}
            </span>
          </CardContent>
        </Card>
      </section>

      {/* 3. Tabela Responsiva Sem Scroll Horizontal */}
      <Card className="app-section-card overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            Carregando seus pedidos de compra...
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 p-8 text-center">
            <ShoppingBag className="size-12 text-muted-foreground/50" />
            <div className="space-y-1">
              <p className="font-semibold text-foreground">Nenhum pedido encontrado</p>
              <p className="text-sm text-muted-foreground">
                {activeFilterCount > 0
                  ? 'Nenhum resultado corresponde aos filtros aplicados.'
                  : 'Você ainda não registrou nenhum pedido de compra.'}
              </p>
            </div>
            {activeFilterCount > 0 ? (
              <Button variant="outline" size="sm" onClick={handleClearFilters} className="mt-2">
                Limpar filtros
              </Button>
            ) : (
              <Button asChild size="sm" className="mt-2">
                <Link href="/dashboard/compras/pedidos/new">
                  <Plus className="size-4 mr-1.5" />
                  Abrir primeiro pedido
                </Link>
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
                  <TableHead className="w-[140px] text-xs font-semibold uppercase tracking-wider">
                    Estimativa
                  </TableHead>
                  <TableHead className="w-[180px] text-xs font-semibold uppercase tracking-wider">
                    Status / Data
                  </TableHead>
                  <TableHead className="w-[140px] text-right text-xs font-semibold uppercase tracking-wider">
                    Ações
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
                          href={`/dashboard/compras/pedidos/${request.id}`}
                          className="font-semibold text-foreground text-sm hover:underline line-clamp-1"
                        >
                          {request.justification}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {request.items.length}{' '}
                          {request.items.length === 1 ? 'item solicitado' : 'itens solicitados'}
                        </p>
                      </div>
                    </TableCell>

                    {/* Estimativa */}
                    <TableCell className="font-medium text-sm">
                      {request.estimatedTotal
                        ? Number(request.estimatedTotal).toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })
                        : <span className="text-muted-foreground italic text-xs">Não informada</span>}
                    </TableCell>

                    {/* Status & Data */}
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
                          {format(new Date(request.createdAt), 'dd/MM/yyyy HH:mm')}
                        </p>
                      </div>
                    </TableCell>

                    {/* Ações */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Botão Ver Detalhe */}
                        <Button
                          asChild
                          variant="ghost"
                          size="icon-sm"
                          className="text-muted-foreground hover:text-foreground"
                          title="Ver detalhes do pedido"
                        >
                          <Link href={`/dashboard/compras/pedidos/${request.id}`}>
                            <Eye className="size-4" />
                          </Link>
                        </Button>

                        {/* Ações específicas para rascunho */}
                        {request.status === 'DRAFT' && (
                          <>
                            <Button
                              asChild
                              variant="ghost"
                              size="icon-sm"
                              className="text-muted-foreground hover:text-foreground"
                              title="Editar rascunho"
                            >
                              <Link href={`/dashboard/compras/pedidos/${request.id}/edit`}>
                                <Edit className="size-4" />
                              </Link>
                            </Button>

                            <Button
                              size="sm"
                              className="h-8 px-2.5 text-xs font-semibold gap-1"
                              onClick={() => handleSubmitRequest(request.id, request.code)}
                            >
                              <Send className="size-3" />
                              <span>Enviar</span>
                            </Button>
                          </>
                        )}
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

      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog((s) => ({ ...s, open }))}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmText={confirmDialog.confirmText}
        onConfirm={async () => {
          if (confirmDialog.action) {
            await confirmDialog.action()
          }
          setConfirmDialog((s) => ({ ...s, open: false }))
        }}
      />
    </div>
  )
}
