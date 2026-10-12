'use client'

import React, { useState } from 'react'
import { toast } from 'sonner'
import {
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'

export interface SyncPlanItem {
  id: string
  resource: 'departments' | 'positions' | 'employees' | string
  externalId: string
  action: 'CREATE' | 'UPDATE' | 'UNCHANGED' | 'CONFLICT' | 'SKIP'
  status: 'PLANNED' | 'APPLIED' | 'FAILED' | 'CONFLICT' | 'SKIPPED'
  internalId?: string | null
  issueCode?: string | null
  auditSummary?: string | null
  diff?: Record<string, { from: unknown; to: unknown }>
}

export interface SyncPlanSummary {
  runId: string
  connectionId: string
  provider: string
  mode: 'PREVIEW' | 'APPLY'
  status: 'PREVIEW_READY' | 'SUCCEEDED' | 'PARTIAL' | 'FAILED' | 'EXPIRED'
  configurationRevision: number
  totalItems: number
  createCount: number
  updateCount: number
  unchangedCount: number
  conflictCount: number
  skipCount: number
  createdAt: string
  items: SyncPlanItem[]
}

interface SyncPreviewProps {
  plan: SyncPlanSummary
  onAppliedSuccess: () => void
  onRefreshRequested: () => void
  canApply: boolean
}

export function SyncPreview({
  plan,
  onAppliedSuccess,
  onRefreshRequested,
  canApply,
}: SyncPreviewProps) {
  const [filterAction, setFilterAction] = useState<string>('ALL')
  const [filterResource, setFilterResource] = useState<string>('ALL')
  const [applying, setApplying] = useState<boolean>(false)
  const [applied, setApplied] = useState<boolean>(false)

  const isStaleOrExpired = plan.status === 'EXPIRED' || plan.status === 'FAILED'

  const filteredItems = plan.items.filter((item) => {
    if (filterAction !== 'ALL' && item.action !== filterAction) return false
    if (filterResource !== 'ALL' && item.resource !== filterResource) return false
    return true
  })

  const handleApply = async () => {
    if (applying || applied) return

    setApplying(true)
    try {
      const idempotencyKey = `apply:${plan.runId}:${Date.now()}`
      await api.post(
        `/integrations/connections/${plan.connectionId}/sync-runs/${plan.runId}/apply`,
        {
          idempotencyKey,
          expectedConfigurationRevision: plan.configurationRevision,
        },
      )
      setApplied(true)
      toast.success('Plano de sincronização aplicado com sucesso!')
      onAppliedSuccess()
    } catch (err: unknown) {
      toast.error(
        getApiErrorMessage(
          err,
          'Falha ao aplicar plano. Se as configurações foram alteradas, gere uma nova prévia.',
        ),
      )
    } finally {
      setApplying(false)
    }
  }

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'CREATE':
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">CRIAR</Badge>
      case 'UPDATE':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">ATUALIZAR</Badge>
      case 'UNCHANGED':
        return <Badge variant="secondary">INALTERADO</Badge>
      case 'CONFLICT':
        return <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/20">CONFLITO</Badge>
      case 'SKIP':
        return <Badge variant="outline">IGNORADO</Badge>
      default:
        return <Badge variant="outline">{action}</Badge>
    }
  }

  const maskCpf = (cpfText?: string | null): string => {
    if (!cpfText) return '—'
    const cleaned = cpfText.replace(/\D/g, '')
    if (cleaned.length === 11) {
      return `***.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-**`
    }
    return '***.***.***-**'
  }

  return (
    <div className="space-y-6">
      {/* ALERTA DE STATUS EXPIRADO OU STALE */}
      {isStaleOrExpired && (
        <div className="border border-amber-500/30 bg-amber-500/10 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="size-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                Prévia Desatualizada ou Expirada
              </p>
              <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
                A configuração ou os dados de origem foram modificados desde a geração deste plano.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5"
            onClick={onRefreshRequested}
          >
            <RefreshCw className="size-3.5" />
            <span>Gerar Nova Prévia</span>
          </Button>
        </div>
      )}

      {/* CARDS RESUMO DO PLANO */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Card className="p-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
            Total Itens
          </span>
          <span className="text-2xl font-bold">{plan.totalItems}</span>
        </Card>
        <Card className="p-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 block">
            Novos (+Criação)
          </span>
          <span className="text-2xl font-bold text-emerald-600">{plan.createCount}</span>
        </Card>
        <Card className="p-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-600 block">
            Atualizações
          </span>
          <span className="text-2xl font-bold text-blue-600">{plan.updateCount}</span>
        </Card>
        <Card className="p-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
            Inalterados
          </span>
          <span className="text-2xl font-bold text-muted-foreground">{plan.unchangedCount}</span>
        </Card>
        <Card className="p-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-600 block">
            Conflitos
          </span>
          <span className="text-2xl font-bold text-rose-600">{plan.conflictCount}</span>
        </Card>
      </div>

      {/* BARRA DE AÇÃO E FILTROS */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Select value={filterAction} onValueChange={setFilterAction}>
            <SelectTrigger className="h-8 text-xs w-[140px]">
              <SelectValue placeholder="Ação planejada" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas as ações</SelectItem>
              <SelectItem value="CREATE">Criar</SelectItem>
              <SelectItem value="UPDATE">Atualizar</SelectItem>
              <SelectItem value="UNCHANGED">Inalterado</SelectItem>
              <SelectItem value="CONFLICT">Conflito</SelectItem>
              <SelectItem value="SKIP">Ignorado</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterResource} onValueChange={setFilterResource}>
            <SelectTrigger className="h-8 text-xs w-[140px]">
              <SelectValue placeholder="Recurso" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos os recursos</SelectItem>
              <SelectItem value="departments">Departamentos</SelectItem>
              <SelectItem value="positions">Cargos</SelectItem>
              <SelectItem value="employees">Funcionários</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {canApply && (
          <Button
            size="sm"
            onClick={() => void handleApply()}
            disabled={applying || applied || isStaleOrExpired || plan.totalItems === 0}
            className="h-9 gap-1.5 font-semibold"
          >
            <CheckCircle2 className="size-4" />
            <span>
              {applying
                ? 'Aplicando Plano...'
                : applied
                  ? 'Plano Aplicado'
                  : 'Confirmar e Aplicar Plano'}
            </span>
          </Button>
        )}
      </div>

      {/* TABELA DE ITENS DA PRÉVIA */}
      <Card className="border-border/60 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Recurso</TableHead>
                <TableHead className="w-[130px]">ID Externo</TableHead>
                <TableHead className="w-[110px]">Ação</TableHead>
                <TableHead>Resumo de Alterações / Diff</TableHead>
                <TableHead className="w-[180px]">Instrução / Conflito</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-28 text-center text-muted-foreground">
                    Nenhum item encontrado com os filtros selecionados.
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/30">
                    <TableCell>
                      <span className="font-semibold text-xs capitalize">{item.resource}</span>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{item.externalId}</TableCell>
                    <TableCell>{getActionBadge(item.action)}</TableCell>
                    <TableCell>
                      <div className="text-xs space-y-1">
                        <span className="font-medium block text-foreground">
                          {item.auditSummary ?? 'Sem resumo fornecido'}
                        </span>
                        {item.diff && Object.keys(item.diff).length > 0 && (
                          <div className="text-[11px] text-muted-foreground bg-muted/30 p-2 rounded border space-y-0.5">
                            {Object.entries(item.diff).map(([key, val]) => (
                              <div key={key} className="flex items-center gap-1.5 font-mono">
                                <span className="text-muted-foreground font-semibold">{key}:</span>
                                <span className="line-through text-rose-500/80">
                                  {key.toLowerCase().includes('cpf') ? maskCpf(String(val.from)) : String(val.from ?? '—')}
                                </span>
                                <ArrowRight className="size-3 text-muted-foreground" />
                                <span className="text-emerald-600 font-semibold">
                                  {key.toLowerCase().includes('cpf') ? maskCpf(String(val.to)) : String(val.to ?? '—')}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.action === 'CONFLICT' ? (
                        <div className="flex items-center gap-1.5 text-rose-600 text-xs font-semibold">
                          <ShieldAlert className="size-4 shrink-0" />
                          <span>{item.issueCode ?? 'Requer ação manual'}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Pronto para aplicação</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}
