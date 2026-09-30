'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileCheck,
  Loader2,
  RotateCw,
  Search,
  XCircle,
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'

type PurchaseRequest = {
  id: string
  code: number
  status: string
  justification: string
  createdAt: string
  estimatedTotal?: number | string | null
  requester: { user: { name: string } }
  department?: { name?: string | null }
  items: Array<{
    id?: string
    product?: { name?: string | null }
    description?: string | null
    quantity: number
  }>
}

export default function ApprovalsPage() {
  const [requests, setRequests] = useState<PurchaseRequest[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('ALL')

  // Modais de Ação
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  // Paginação
  const [page, setPage] = useState(1)
  const pageSize = 10

  const [approveConfirm, setApproveConfirm] = useState<{
    open: boolean
    requestId: string | null
    requestNumber: number | null
  }>({
    open: false,
    requestId: null,
    requestNumber: null,
  })

  const fetchPending = async () => {
    try {
      setLoading(true)
      const { data } = await api.get<PurchaseRequest[]>('/purchase-requests/pending')
      setRequests(data)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível carregar as aprovações.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchPending()
  }, [])

  const executeApprove = async () => {
    if (!approveConfirm.requestId) return

    try {
      await api.patch(`/purchase-requests/${approveConfirm.requestId}/approve`)
      toast.success('Pedido aprovado com sucesso.')
      setApproveConfirm({ open: false, requestId: null, requestNumber: null })
      await fetchPending()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível aprovar o pedido.'))
    }
  }

  const handleReject = async () => {
    if (!rejectId || !reason.trim()) {
      toast.error('Informe o motivo da reprovação.')
      return
    }

    setActionLoading(true)
    try {
      await api.patch(`/purchase-requests/${rejectId}/reject`, {
        reason: reason.trim(),
      })
      toast.success('Pedido reprovado com sucesso.')
      setRejectId(null)
      setReason('')
      await fetchPending()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível reprovar o pedido.'))
    } finally {
      setActionLoading(false)
    }
  }

  const departmentOptions = useMemo(() => {
    const depts = new Set<string>()
    requests.forEach((r) => {
      if (r.department?.name) depts.add(r.department.name)
    })
    return Array.from(depts)
  }, [requests])

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (searchTerm.trim()) count++
    if (departmentFilter !== 'ALL') count++
    return count
  }, [searchTerm, departmentFilter])

  function handleClearFilters() {
    setSearchTerm('')
    setDepartmentFilter('ALL')
    setPage(1)
  }

  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      if (searchTerm.trim()) {
        const haystack = [
          request.justification,
          request.requester.user.name,
          request.department?.name ?? '',
          String(request.code),
        ]
          .join(' ')
          .toLowerCase()

        if (!haystack.includes(searchTerm.toLowerCase())) {
          return false
        }
      }

      if (departmentFilter !== 'ALL' && request.department?.name !== departmentFilter) {
        return false
      }

      return true
    })
  }, [requests, searchTerm, departmentFilter])

  const totalPages = Math.ceil(filteredRequests.length / pageSize) || 1

  const paginatedRequests = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredRequests.slice(start, start + pageSize)
  }, [filteredRequests, page, pageSize])

  useEffect(() => {
    if (page > totalPages) {
      setPage(1)
    }
  }, [totalPages, page])

  const metrics = useMemo(() => {
    const totalEstimated = requests.reduce((total, request) => {
      return total + Number(request.estimatedTotal || 0)
    }, 0)

    const deptsCount = new Set(requests.map((r) => r.department?.name).filter(Boolean)).size

    return {
      count: requests.length,
      totalEstimated,
      deptsCount,
    }
  }, [requests])

  return (
    <div className="app-page space-y-6">
      {/* 1. Cabeçalho Padronizado */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Aprovações de Compras
          </h1>
          <p className="text-sm text-muted-foreground">
            Revise solicitações da sua alçada, valide justificativas e decida sobre a aprovação.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Menu Flutuante de Filtro */}
          <FilterPopover
            activeCount={activeFilterCount}
            onClear={handleClearFilters}
            onApply={() => setPage(1)}
          >
            <div className="field-stack">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Palavra-chave
              </span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  className="pl-9 h-9 text-sm"
                  placeholder="Número, solicitante, justificativa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setPage(1)
                    }
                  }}
                />
              </div>
            </div>

            {departmentOptions.length > 0 && (
              <div className="field-stack">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Departamento
                </span>
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Todos os departamentos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos os departamentos</SelectItem>
                    {departmentOptions.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </FilterPopover>

          {/* Atualização */}
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            onClick={() => void fetchPending()}
            disabled={loading}
          >
            <RotateCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </Button>
        </div>
      </section>

      {/* 2. Cards de Indicadores (KPIs em 4 colunas) */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Card 1: Pendentes */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Pendentes de aprovação
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {metrics.count}
            </span>
            {metrics.count > 0 && (
              <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                Ação necessária
              </span>
            )}
          </CardContent>
        </Card>

        {/* Card 2: Volume Total Estimado */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Volume estimado
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2">
            <span className="text-2xl font-bold tracking-tight text-foreground">
              R${' '}
              {metrics.totalEstimated.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
              })}
            </span>
          </CardContent>
        </Card>

        {/* Card 3: Departamentos envolvidos */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Departamentos
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {metrics.deptsCount}
            </span>
          </CardContent>
        </Card>

        {/* Card 4: Status do Fluxo */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Próxima etapa
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2 flex items-baseline justify-between">
            <span className="text-base font-semibold text-muted-foreground">
              Cotação com compras
            </span>
            <FileCheck className="size-5 text-muted-foreground/60" />
          </CardContent>
        </Card>
      </section>

      {/* 3. Tabela Responsiva Sem Scroll Horizontal */}
      <Card className="app-section-card overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            Carregando pedidos pendentes de aprovação...
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 p-8 text-center">
            <FileCheck className="size-12 text-muted-foreground/50" />
            <div className="space-y-1">
              <p className="font-semibold text-foreground">Nenhum pedido pendente</p>
              <p className="text-sm text-muted-foreground">
                {activeFilterCount > 0
                  ? 'Nenhum resultado corresponde aos filtros aplicados.'
                  : 'Todas as solicitações de compra da sua alçada já foram avaliadas.'}
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
                  <TableHead className="min-w-[180px] text-xs font-semibold uppercase tracking-wider">
                    Solicitante / Depto
                  </TableHead>
                  <TableHead className="w-[160px] text-xs font-semibold uppercase tracking-wider">
                    Estimativa / Itens
                  </TableHead>
                  <TableHead className="w-[120px] text-xs font-semibold uppercase tracking-wider">
                    Data
                  </TableHead>
                  <TableHead className="w-[200px] text-right text-xs font-semibold uppercase tracking-wider">
                    Decisão
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
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {request.items.map((i) => `${Number(i.quantity)}x ${i.product?.name || i.description || 'Item'}`).join(', ')}
                        </p>
                      </div>
                    </TableCell>

                    {/* Solicitante / Depto */}
                    <TableCell>
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium text-foreground">
                          {request.requester.user.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {request.department?.name || 'Sem departamento'}
                        </p>
                      </div>
                    </TableCell>

                    {/* Estimativa / Itens */}
                    <TableCell>
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium text-foreground">
                          {request.estimatedTotal
                            ? `R$ ${Number(request.estimatedTotal).toLocaleString('pt-BR', {
                                minimumFractionDigits: 2,
                              })}`
                            : 'Não informada'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {request.items.length} {request.items.length === 1 ? 'item' : 'itens'}
                        </p>
                      </div>
                    </TableCell>

                    {/* Data */}
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(request.createdAt), 'dd/MM/yyyy')}
                    </TableCell>

                    {/* Decisão / Ações Compactas */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
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

                        <Button
                          size="sm"
                          className="h-8 px-2.5 text-xs font-semibold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() =>
                            setApproveConfirm({
                              open: true,
                              requestId: request.id,
                              requestNumber: request.code,
                            })
                          }
                        >
                          <CheckCircle2 className="size-3.5" />
                          <span>Aprovar</span>
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2.5 text-xs font-semibold gap-1 text-rose-700 hover:bg-rose-50 hover:text-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/40"
                          onClick={() => {
                            setRejectId(request.id)
                            setReason('')
                          }}
                        >
                          <XCircle className="size-3.5" />
                          <span>Reprovar</span>
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
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="size-4" />
              </Button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <Button
                  key={pageNum}
                  variant={pageNum === page ? 'default' : 'outline'}
                  size="icon-sm"
                  className={`size-8 font-medium ${pageNum === page ? 'pointer-events-none' : ''}`}
                  onClick={() => setPage(pageNum)}
                >
                  {pageNum}
                </Button>
              ))}

              <Button
                variant="outline"
                size="icon-sm"
                className="size-8"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Modal Centralizado de Confirmação de Aprovação */}
      <ConfirmDialog
        open={approveConfirm.open}
        onOpenChange={(open) =>
          setApproveConfirm((prev) => ({ ...prev, open }))
        }
        title="Aprovar Pedido de Compra"
        description={`Deseja aprovar a solicitação #${approveConfirm.requestNumber}? Ela seguirá para a etapa de cotações com fornecedores.`}
        confirmText="Confirmar Aprovação"
        onConfirm={executeApprove}
      />

      {/* Modal Centralizado de Reprovação com Justificativa */}
      <Dialog open={Boolean(rejectId)} onOpenChange={(open) => !open && setRejectId(null)}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Reprovar Pedido de Compra</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="field-stack">
              <Label htmlFor="reject-reason" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Motivo da reprovação (obrigatório)
              </Label>
              <Textarea
                id="reject-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explique o motivo da não aprovação para que o solicitante possa ajustar ou arquivar..."
                className="min-h-[110px] text-sm"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRejectId(null)}
              disabled={actionLoading}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleReject}
              disabled={actionLoading || !reason.trim()}
            >
              {actionLoading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Reprovando...
                </>
              ) : (
                'Reprovar pedido'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
