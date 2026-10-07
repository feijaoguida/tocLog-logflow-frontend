'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Code2,
  Copy,
  Eye,
  FileCode2,
  Loader2,
  RotateCw,
  Search,
  Server,
  ShieldAlert,
  Smartphone,
  Terminal,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useAuth } from '@/context/auth-context'
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
import { FilterPopover } from '@/components/ui/filter-popover'
import { PageHeader } from '@/components/layout/page-header'

export type ErrorLogSource = 'FRONTEND' | 'BACKEND' | 'MOBILE'

export interface ErrorLogItem {
  id: string
  source: ErrorLogSource
  userId: string | null
  userName: string | null
  companyId: string | null
  module: string | null
  screen: string | null
  action: string | null
  errorMessage: string
  originalError: string | null
  stackTrace: string | null
  statusCode: number | null
  requestPayload: Record<string, unknown> | unknown[] | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

function getInitials(name?: string | null) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr)
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return dateStr
  }
}

function getSourceBadge(source: ErrorLogSource) {
  switch (source) {
    case 'BACKEND':
      return {
        label: 'Backend',
        icon: Server,
        className:
          'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/60',
      }
    case 'FRONTEND':
      return {
        label: 'Frontend',
        icon: Code2,
        className:
          'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/60',
      }
    case 'MOBILE':
      return {
        label: 'Mobile',
        icon: Smartphone,
        className:
          'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60',
      }
    default:
      return {
        label: source,
        icon: AlertTriangle,
        className: 'bg-muted text-muted-foreground border-border',
      }
  }
}

function getStatusBadge(code?: number | null) {
  if (!code) {
    return 'bg-muted text-muted-foreground border-border'
  }
  if (code >= 500) {
    return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60'
  }
  if (code >= 400) {
    return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60'
  }
  return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60'
}

export default function ErrorLogsPage() {
  const { hasPermission, isLoading: authLoading } = useAuth()

  const [logs, setLogs] = useState<ErrorLogItem[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const limit = 20
  const [loading, setLoading] = useState(false)

  // Filtros
  const [search, setSearch] = useState('')
  const [source, setSource] = useState<string>('ALL')
  const [moduleFilter, setModuleFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Detalhes & Purge Modais
  const [selectedLog, setSelectedLog] = useState<ErrorLogItem | null>(null)
  const [isPurgeDialogOpen, setIsPurgeDialogOpen] = useState(false)
  const [purgeDays, setPurgeDays] = useState('180')
  const [purging, setPurging] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const canView = hasPermission('system.error_logs.view')
  const canManage = hasPermission('system.error_logs.manage')

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (search.trim()) count++
    if (source !== 'ALL') count++
    if (moduleFilter.trim()) count++
    if (startDate) count++
    if (endDate) count++
    return count
  }, [search, source, moduleFilter, startDate, endDate])

  const fetchLogs = useCallback(
    async (targetPage = page) => {
      if (!canView) return
      setLoading(true)
      try {
        const params: Record<string, string | number> = {
          page: targetPage,
          limit,
        }

        if (search.trim()) params.search = search.trim()
        if (source !== 'ALL') params.source = source
        if (moduleFilter.trim()) params.module = moduleFilter.trim()
        if (startDate) params.startDate = new Date(startDate).toISOString()
        if (endDate) {
          const end = new Date(endDate)
          end.setHours(23, 59, 59, 999)
          params.endDate = end.toISOString()
        }

        const res = await api.get('/error-logs', { params })
        setLogs(res.data?.items || [])
        setTotal(res.data?.total || 0)
        setTotalPages(res.data?.totalPages || 1)
        setPage(res.data?.page || 1)
      } catch {
        toast.error('Erro ao carregar lista de logs de erro.')
      } finally {
        setLoading(false)
      }
    },
    [canView, page, search, source, moduleFilter, startDate, endDate, limit],
  )

  useEffect(() => {
    if (canView) {
      void fetchLogs(1)
    }
  }, [canView, fetchLogs])

  const handleClearFilters = () => {
    setSearch('')
    setSource('ALL')
    setModuleFilter('')
    setStartDate('')
    setEndDate('')
    setPage(1)
    setTimeout(() => {
      void fetchLogs(1)
    }, 0)
  }

  const handleApplyFilters = () => {
    setPage(1)
    void fetchLogs(1)
  }

  const handlePurge = async () => {
    const days = parseInt(purgeDays, 10)
    if (isNaN(days) || days < 7) {
      toast.error('Informe um valor de retenção válido (mínimo 7 dias).')
      return
    }

    setPurging(true)
    try {
      const res = await api.delete('/error-logs/purge', {
        params: { retentionDays: days },
      })
      toast.success(
        `${res.data?.deleted ?? 0} registros antigos expurgados com sucesso.`,
      )
      setIsPurgeDialogOpen(false)
      void fetchLogs(1)
    } catch {
      toast.error('Erro ao expurgar registros de erro.')
    } finally {
      setPurging(false)
    }
  }

  const handleCopy = (key: string, text: string) => {
    void navigator.clipboard.writeText(text)
    setCopiedKey(key)
    toast.success('Copiado para a área de transferência')
    setTimeout(() => {
      setCopiedKey(null)
    }, 2000)
  }

  const handleCopyFullLog = (log: ErrorLogItem) => {
    const lines: string[] = [
      `=== LOG DE ERRO [${log.source}] ===`,
      `ID: ${log.id}`,
      `Data/Hora: ${formatDate(log.createdAt)}`,
      `Status HTTP: ${log.statusCode ?? 'N/A'}`,
      `Módulo: ${log.module || 'N/A'}`,
      `Ação: ${log.action || 'N/A'}`,
      `Tela: ${log.screen || 'N/A'}`,
      `Usuário: ${log.userName || 'Anônimo'} (${log.userId || 'ID N/A'})`,
    ]

    if (log.companyId) {
      lines.push(`Empresa ID: ${log.companyId}`)
    }

    lines.push('', `--- MENSAGEM DO ERRO ---`, log.errorMessage)

    if (log.originalError) {
      lines.push('', `--- ERRO ORIGINAL / CAUSA RAIZ ---`, log.originalError)
    }

    if (log.stackTrace) {
      lines.push('', `--- STACK TRACE ---`, log.stackTrace)
    }

    if (log.requestPayload) {
      lines.push(
        '',
        `--- PAYLOAD DA REQUISIÇÃO ---`,
        JSON.stringify(log.requestPayload, null, 2),
      )
    }

    if (log.metadata) {
      lines.push(
        '',
        `--- METADADOS ---`,
        JSON.stringify(log.metadata, null, 2),
      )
    }

    lines.push('', `=== FIM DO LOG ===`)

    handleCopy('full', lines.join('\n'))
  }

  // Estatísticas rápidas da lista atual
  const stats = useMemo(() => {
    const backendCount = logs.filter((l) => l.source === 'BACKEND').length
    const frontendCount = logs.filter((l) => l.source === 'FRONTEND').length
    const mobileCount = logs.filter((l) => l.source === 'MOBILE').length
    return {
      total,
      backend: backendCount,
      frontend: frontendCount,
      mobile: mobileCount,
    }
  }, [logs, total])

  if (authLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <ShieldAlert className="size-12 text-destructive" />
        <h2 className="text-xl font-bold">Acesso Não Autorizado</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          Você não possui permissão para visualizar os registros de logs de erro
          do sistema (<code>system.error_logs.view</code>).
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Cabeçalho */}
      <PageHeader
        eyebrow="Sistema & Governança"
        title="Logs de Erro"
        description="Monitoramento centralizado de exceções e falhas capturadas no Frontend, Backend e Mobile."
        actions={
          <>
            {canManage && (
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10"
                onClick={() => setIsPurgeDialogOpen(true)}
              >
                <Trash2 className="size-4" />
                <span>Expurgar Antigos</span>
              </Button>
            )}

            {/* Menu Flutuante de Filtro */}
            <FilterPopover
              activeCount={activeFilterCount}
              onClear={handleClearFilters}
              onApply={handleApplyFilters}
              contentClassName="sm:w-[480px]"
            >
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Palavra-chave
                  </span>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      className="pl-9 h-9 text-sm"
                      placeholder="Buscar por mensagem de erro ou causa..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleApplyFilters()
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Origem
                    </span>
                    <Select value={source} onValueChange={setSource}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Todas as origens" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Todas as origens</SelectItem>
                        <SelectItem value="BACKEND">Backend</SelectItem>
                        <SelectItem value="FRONTEND">Frontend</SelectItem>
                        <SelectItem value="MOBILE">Mobile</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Módulo
                    </span>
                    <Input
                      className="h-9 text-sm"
                      placeholder="Ex: ai, email, auth..."
                      value={moduleFilter}
                      onChange={(e) => setModuleFilter(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Data Inicial
                    </span>
                    <Input
                      type="date"
                      className="h-9 text-sm"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Data Final
                    </span>
                    <Input
                      type="date"
                      className="h-9 text-sm"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </FilterPopover>

            {/* Atualização */}
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5"
              onClick={() => void fetchLogs(page)}
              disabled={loading}
            >
              <RotateCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Atualizar</span>
            </Button>
          </>
        }
      />

      {/* 2. KPI Summary Cards */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Registrado
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {stats.total}
            </span>
            <span className="text-xs text-muted-foreground">ocorrências</span>
          </CardContent>
        </Card>

        <Card className="p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0 flex flex-row items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Backend
            </span>
            <Server className="size-4 text-purple-600 dark:text-purple-400" />
          </CardHeader>
          <CardContent className="p-0 pt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {stats.backend}
            </span>
            <span className="text-xs text-muted-foreground">nesta página</span>
          </CardContent>
        </Card>

        <Card className="p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0 flex flex-row items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Frontend
            </span>
            <Code2 className="size-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent className="p-0 pt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {stats.frontend}
            </span>
            <span className="text-xs text-muted-foreground">nesta página</span>
          </CardContent>
        </Card>

        <Card className="p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0 flex flex-row items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Mobile
            </span>
            <Smartphone className="size-4 text-emerald-600 dark:text-emerald-400" />
          </CardHeader>
          <CardContent className="p-0 pt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {stats.mobile}
            </span>
            <span className="text-xs text-muted-foreground">nesta página</span>
          </CardContent>
        </Card>
      </section>

      {/* 3. Tabela Responsiva Sem Scroll Horizontal */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[170px]">Data / Hora</TableHead>
                <TableHead className="w-[160px]">Origem & Módulo</TableHead>
                <TableHead className="w-[180px]">Usuário & Tela</TableHead>
                <TableHead className="min-w-[320px]">
                  Mensagem & Detalhe
                </TableHead>
                <TableHead className="w-[80px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && logs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-32 text-center text-muted-foreground"
                  >
                    <Loader2 className="mx-auto size-6 animate-spin text-primary" />
                    <p className="mt-2 text-xs">Carregando logs de erro...</p>
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-32 text-center text-muted-foreground"
                  >
                    <AlertCircle className="mx-auto size-6 text-muted-foreground/60" />
                    <p className="mt-2 text-sm font-medium">
                      Nenhum registro de erro encontrado.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Ajuste os filtros ou aguarde novas ocorrências do sistema.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => {
                  const sourceConfig = getSourceBadge(log.source)
                  const SourceIcon = sourceConfig.icon

                  return (
                    <TableRow
                      key={log.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors select-none"
                      onClick={() => setSelectedLog(log)}
                    >
                      {/* Data / Hora */}
                      <TableCell className="align-top">
                        <div className="font-mono text-xs font-semibold text-foreground">
                          {formatDate(log.createdAt)}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          ID: #{log.id.slice(0, 8)}
                        </div>
                      </TableCell>

                      {/* Origem & Módulo */}
                      <TableCell className="align-top">
                        <div className="space-y-1">
                          <span
                            className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${sourceConfig.className}`}
                          >
                            <SourceIcon className="size-3" />
                            <span>{sourceConfig.label}</span>
                          </span>
                          <div className="text-xs text-muted-foreground font-medium truncate">
                            {log.module ? `Mod: ${log.module}` : 'Módulo não inf.'}
                          </div>
                        </div>
                      </TableCell>

                      {/* Usuário & Tela */}
                      <TableCell className="align-top">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                              {getInitials(log.userName)}
                            </span>
                            <span className="text-xs font-medium text-foreground truncate">
                              {log.userName || (
                                <span className="italic text-muted-foreground">
                                  Anônimo
                                </span>
                              )}
                            </span>
                          </div>
                          {log.screen && (
                            <div
                              className="text-[11px] text-muted-foreground truncate max-w-[170px]"
                              title={log.screen}
                            >
                              {log.screen}
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* Mensagem & Status */}
                      <TableCell className="align-top">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {log.statusCode && (
                              <span
                                className={`inline-flex items-center rounded-md border px-1.5 py-0.2 text-[10px] font-bold ${getStatusBadge(log.statusCode)}`}
                              >
                                {log.statusCode}
                              </span>
                            )}
                            <span className="text-xs font-semibold text-foreground break-all line-clamp-1">
                              {log.errorMessage}
                            </span>
                          </div>

                          {log.originalError && (
                            <div className="text-[11px] font-mono text-muted-foreground/80 line-clamp-1 truncate max-w-xl">
                              {log.originalError}
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* Ações */}
                      <TableCell
                        className="align-top text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-foreground"
                          onClick={() => setSelectedLog(log)}
                          title="Visualizar detalhes do erro"
                        >
                          <Eye className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* 4. Rodapé com Paginação */}
        <div className="flex flex-col gap-3 border-t bg-muted/10 px-6 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div>
            Exibindo{' '}
            <span className="font-semibold text-foreground">{logs.length}</span>{' '}
            de{' '}
            <span className="font-semibold text-foreground">{total}</span>{' '}
            registros
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              disabled={page <= 1 || loading}
              onClick={() => {
                const next = Math.max(1, page - 1)
                setPage(next)
                void fetchLogs(next)
              }}
            >
              <ChevronLeft className="size-4" />
            </Button>

            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const pageNum = i + 1
              return (
                <Button
                  key={pageNum}
                  variant={pageNum === page ? 'default' : 'outline'}
                  size="icon"
                  className={`size-8 font-medium ${pageNum === page ? 'pointer-events-none' : ''}`}
                  onClick={() => {
                    setPage(pageNum)
                    void fetchLogs(pageNum)
                  }}
                >
                  {pageNum}
                </Button>
              )
            })}

            <Button
              variant="outline"
              size="icon"
              className="size-8"
              disabled={page >= totalPages || loading}
              onClick={() => {
                const next = Math.min(totalPages, page + 1)
                setPage(next)
                void fetchLogs(next)
              }}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* 5. Modal de Detalhes do Log */}
      <Dialog
        open={Boolean(selectedLog)}
        onOpenChange={(open) => !open && setSelectedLog(null)}
      >
        <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
          {selectedLog && (
            <>
              <DialogHeader className="p-6 pb-4 border-b border-border/60 bg-muted/10 shrink-0 text-left pr-12">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <DialogTitle className="text-lg font-bold">
                        Ocorrência de Erro
                      </DialogTitle>
                      <span
                        className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold ${getSourceBadge(selectedLog.source).className}`}
                      >
                        {getSourceBadge(selectedLog.source).label}
                      </span>
                      {selectedLog.statusCode && (
                        <span
                          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-bold ${getStatusBadge(selectedLog.statusCode)}`}
                        >
                          HTTP {selectedLog.statusCode}
                        </span>
                      )}
                    </div>
                    <DialogDescription className="font-mono text-xs mt-1">
                      ID: {selectedLog.id} · Ocorrido em{' '}
                      {formatDate(selectedLog.createdAt)}
                    </DialogDescription>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 self-start sm:self-center shrink-0 text-xs font-medium"
                    onClick={() => handleCopyFullLog(selectedLog)}
                  >
                    {copiedKey === 'full' ? (
                      <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                    <span>
                      {copiedKey === 'full'
                        ? 'Copiado para Memória'
                        : 'Copiar Erro Completo'}
                    </span>
                  </Button>
                </div>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto p-6 space-y-5 text-sm">
                {/* Metadados de Contexto */}
                <div className="grid grid-cols-2 gap-3 rounded-lg border border-border/60 bg-muted/20 p-3 sm:grid-cols-4 text-xs">
                  <div>
                    <span className="text-muted-foreground block font-medium">
                      Módulo
                    </span>
                    <span className="font-semibold text-foreground">
                      {selectedLog.module || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block font-medium">
                      Ação
                    </span>
                    <span className="font-semibold text-foreground">
                      {selectedLog.action || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block font-medium">
                      Usuário
                    </span>
                    <span className="font-semibold text-foreground">
                      {selectedLog.userName || 'Anônimo'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block font-medium">
                      Tela / Rota
                    </span>
                    <span
                      className="font-semibold text-foreground truncate block"
                      title={selectedLog.screen || ''}
                    >
                      {selectedLog.screen || '—'}
                    </span>
                  </div>
                </div>

                {/* Mensagem para o Usuário */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Mensagem Apresentada
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 gap-1 px-2 text-xs"
                      onClick={() =>
                        handleCopy('message', selectedLog.errorMessage)
                      }
                    >
                      {copiedKey === 'message' ? (
                        <Check className="size-3 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Copy className="size-3" />
                      )}
                      <span>Copiar</span>
                    </Button>
                  </div>
                  <div className="max-h-40 overflow-y-auto rounded-md border border-border bg-background p-3 text-sm font-medium text-foreground whitespace-pre-wrap break-all">
                    {selectedLog.errorMessage}
                  </div>
                </div>

                {/* Erro Original / Causa Técnica */}
                {selectedLog.originalError && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Terminal className="size-3.5 text-primary" />
                        Causa Raiz / Erro Original
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 gap-1 px-2 text-xs"
                        onClick={() =>
                          handleCopy('original', selectedLog.originalError || '')
                        }
                      >
                        {copiedKey === 'original' ? (
                          <Check className="size-3 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Copy className="size-3" />
                        )}
                        <span>Copiar</span>
                      </Button>
                    </div>
                    <pre className="max-h-48 overflow-y-auto rounded-md border border-border bg-muted/40 p-3 font-mono text-xs text-foreground whitespace-pre-wrap break-all">
                      {selectedLog.originalError}
                    </pre>
                  </div>
                )}

                {/* Stack Trace */}
                {selectedLog.stackTrace && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <FileCode2 className="size-3.5 text-primary" />
                        Stack Trace
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 gap-1 px-2 text-xs"
                        onClick={() =>
                          handleCopy('stack', selectedLog.stackTrace || '')
                        }
                      >
                        {copiedKey === 'stack' ? (
                          <Check className="size-3 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Copy className="size-3" />
                        )}
                        <span>Copiar</span>
                      </Button>
                    </div>
                    <pre className="max-h-64 overflow-y-auto rounded-md border border-border bg-muted/50 p-3 font-mono text-[11px] leading-relaxed text-foreground whitespace-pre-wrap break-all">
                      {selectedLog.stackTrace}
                    </pre>
                  </div>
                )}

                {/* Request Payload */}
                {selectedLog.requestPayload && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Payload da Requisição
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 gap-1 px-2 text-xs"
                        onClick={() =>
                          handleCopy(
                            'payload',
                            JSON.stringify(
                              selectedLog.requestPayload,
                              null,
                              2,
                            ),
                          )
                        }
                      >
                        {copiedKey === 'payload' ? (
                          <Check className="size-3 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Copy className="size-3" />
                        )}
                        <span>Copiar JSON</span>
                      </Button>
                    </div>
                    <pre className="max-h-48 overflow-y-auto rounded-md border border-border bg-muted/30 p-3 font-mono text-xs text-foreground whitespace-pre-wrap break-all">
                      {JSON.stringify(selectedLog.requestPayload, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Metadados Adicionais */}
                {selectedLog.metadata && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Metadados / Ambiente
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 gap-1 px-2 text-xs"
                        onClick={() =>
                          handleCopy(
                            'metadata',
                            JSON.stringify(selectedLog.metadata, null, 2),
                          )
                        }
                      >
                        {copiedKey === 'metadata' ? (
                          <Check className="size-3 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Copy className="size-3" />
                        )}
                        <span>Copiar JSON</span>
                      </Button>
                    </div>
                    <pre className="max-h-40 overflow-y-auto rounded-md border border-border bg-muted/20 p-3 font-mono text-[11px] text-muted-foreground whitespace-pre-wrap break-all">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              <DialogFooter className="p-4 px-6 border-t border-border/60 bg-muted/10 shrink-0 flex items-center justify-between sm:justify-between w-full">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs font-medium"
                  onClick={() => handleCopyFullLog(selectedLog)}
                >
                  {copiedKey === 'full' ? (
                    <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                  <span>
                    {copiedKey === 'full'
                      ? 'Copiado para memória!'
                      : 'Copiar Erro Completo'}
                  </span>
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSelectedLog(null)}>
                  Fechar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* 6. Modal de Confirmação de Expurgo */}
      <Dialog open={isPurgeDialogOpen} onOpenChange={setIsPurgeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <Trash2 className="size-5" />
              <DialogTitle>Expurgar Registros Antigos</DialogTitle>
            </div>
            <DialogDescription>
              Esta rotina removerá permanentemente os registros de erros
              armazenados no banco de dados anteriores ao período informado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="purge-days">
                Remover registros com mais de (dias):
              </Label>
              <Input
                id="purge-days"
                type="number"
                min="7"
                max="3650"
                value={purgeDays}
                onChange={(e) => setPurgeDays(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Recomendado: 180 dias. Mínimo permitido: 7 dias.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPurgeDialogOpen(false)}
              disabled={purging}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handlePurge}
              disabled={purging}
            >
              {purging && <Loader2 className="mr-2 size-4 animate-spin" />}
              Confirmar Expurgo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
