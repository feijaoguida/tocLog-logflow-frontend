'use client'

import React from 'react'
import {
  AlertTriangle,
  Award,
  Check,
  CheckCircle2,
  DollarSign,
  Mail,
  Package,
  Printer,
  Sparkles,
  TrendingDown,
  Truck,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export interface MatrixItemSupplier {
  quotationId: string
  quotationItemId: string
  supplierId: string
  supplierName: string
  price: number
  discount: number
  effectiveUnitPrice?: number
  netUnitPrice?: number
  deliveryDays?: number | null
  deliveryTime?: number | null
  status: string
  isLowestPrice: boolean
  isOverBudget?: boolean
  isWinner: boolean
  awardedQuantity?: number | null
  allocationNotes?: string | null
}

export interface MatrixItem {
  requestItemId: string
  description: string
  quantity: number
  unitSymbol: string
  estimatedUnitPrice?: number | null
  orderedQuantity: number
  closedQuantity: number
  availableBalance: number
  suppliers?: MatrixItemSupplier[]
  offers?: MatrixItemSupplier[]
}

export interface MatrixSupplierHeader {
  supplierId: string
  supplierName: string
  cnpj?: string | null
  quotationId: string
  quotationStatus: string
  freightCost: number
  minOrderValue?: number | null
  itemsQuotedCount: number
}

export interface ComparisonMatrixData {
  requestId: string
  requestStatus: string
  items: MatrixItem[]
  suppliers: MatrixSupplierHeader[]
}

export interface ItemAllocation {
  quotationItemId: string
  requestItemId: string
  supplierId: string
  awardedQuantity: number
  isWinner: boolean
  notes?: string
}

interface QuotationComparisonMatrixProps {
  matrix: ComparisonMatrixData
  allocations: ItemAllocation[]
  onAllocationsChange: (allocations: ItemAllocation[]) => void
  disabled?: boolean
  onEditPrices?: (quotationId: string) => void
  onPrintSheet?: (quotationId: string) => void
  onSendEmail?: (quotationId: string) => void
}

export function QuotationComparisonMatrix({
  matrix,
  allocations,
  onAllocationsChange,
  disabled = false,
  onEditPrices,
  onPrintSheet,
  onSendEmail,
}: QuotationComparisonMatrixProps) {
  const { items, suppliers } = matrix

  // Localiza alocação atual para um item de cotação específico
  const getAllocation = (quotationItemId: string) => {
    return allocations.find((a) => a.quotationItemId === quotationItemId)
  }

  // Soma alocações ativas para um requestItemId
  const getItemAllocatedTotal = (requestItemId: string) => {
    return allocations
      .filter((a) => a.requestItemId === requestItemId && a.isWinner)
      .reduce((sum, a) => sum + Number(a.awardedQuantity || 0), 0)
  }

  // Define um vencedor integral (100% da quantidade disponível)
  const handleSelectSoleWinner = (
    item: MatrixItem,
    supplierQuote: MatrixItemSupplier,
  ) => {
    if (disabled) return

    // Remove qualquer alocação anterior para este requestItemId
    const otherAllocations = allocations.filter(
      (a) => a.requestItemId !== item.requestItemId,
    )

    // Se já estava selecionado exclusivamente, desmarca
    const currentAlloc = getAllocation(supplierQuote.quotationItemId)
    if (currentAlloc && currentAlloc.isWinner && currentAlloc.awardedQuantity === item.availableBalance) {
      onAllocationsChange(otherAllocations)
      return
    }

    const newAlloc: ItemAllocation = {
      quotationItemId: supplierQuote.quotationItemId,
      requestItemId: item.requestItemId,
      supplierId: supplierQuote.supplierId,
      awardedQuantity: item.availableBalance,
      isWinner: true,
      notes: 'Alocado integralmente via matriz comparativa',
    }

    onAllocationsChange([...otherAllocations, newAlloc])
  }

  // Atualiza quantidade fracionada
  const handleQuantityChange = (
    item: MatrixItem,
    supplierQuote: MatrixItemSupplier,
    qty: number,
  ) => {
    if (disabled) return
    const sanitizedQty = Math.max(0, qty)

    const existingIndex = allocations.findIndex(
      (a) => a.quotationItemId === supplierQuote.quotationItemId,
    )

    if (sanitizedQty === 0) {
      if (existingIndex >= 0) {
        const next = [...allocations]
        next.splice(existingIndex, 1)
        onAllocationsChange(next)
      }
      return
    }

    const newAlloc: ItemAllocation = {
      quotationItemId: supplierQuote.quotationItemId,
      requestItemId: item.requestItemId,
      supplierId: supplierQuote.supplierId,
      awardedQuantity: sanitizedQty,
      isWinner: sanitizedQty > 0,
      notes: 'Alocação fracionada via matriz',
    }

    if (existingIndex >= 0) {
      const next = [...allocations]
      next[existingIndex] = newAlloc
      onAllocationsChange(next)
    } else {
      onAllocationsChange([...allocations, newAlloc])
    }
  }

  const formatBrl = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  return (
    <div className="w-full space-y-4">
      <div className="overflow-x-auto rounded-lg border border-border/60 bg-card shadow-xs">
        <Table className="min-w-[850px] border-collapse text-left">
          <TableHeader className="bg-muted/40">
            <TableRow className="border-b border-border/60">
              {/* Coluna 1: Item da Requisição (Sticky à esquerda) */}
              <TableHead className="w-[320px] p-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground sticky left-0 bg-card/95 backdrop-blur z-20 border-r border-border/60 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)]">
                Item & Demanda
              </TableHead>

              {/* Colunas: Fornecedores Participantes */}
              {suppliers.map((sup) => (
                <TableHead
                  key={sup.supplierId}
                  className="min-w-[210px] w-[220px] p-3.5 text-xs font-semibold tracking-wider border-l border-border/40"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-foreground text-sm truncate" title={sup.supplierName}>
                        {sup.supplierName}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground font-normal">
                      <span className="flex items-center gap-1 text-muted-foreground/80">
                        <Package className="size-3" />
                        {sup.itemsQuotedCount}/{items.length} cotados
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-medium text-foreground/80">
                        <Truck className="size-3 text-muted-foreground" />
                        {sup.freightCost > 0 ? formatBrl(sup.freightCost) : 'Frete Grátis'}
                      </span>
                    </div>

                    {/* Barra de Ações Rápidas por Fornecedor */}
                    <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-border/40">
                      {onEditPrices && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="h-6 px-2 text-[10px] font-semibold gap-1 bg-muted/80 hover:bg-muted"
                          onClick={() => onEditPrices(sup.quotationId)}
                          title="Lançar ou editar preços deste fornecedor"
                        >
                          <DollarSign className="size-3 text-emerald-600 dark:text-emerald-400" />
                          <span>Preços</span>
                        </Button>
                      )}

                      <div className="flex items-center gap-1 ml-auto">
                        {onPrintSheet && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground gap-1"
                            onClick={() => onPrintSheet(sup.quotationId)}
                            title="Imprimir Ficha de Cotação (RFQ)"
                          >
                            <Printer className="size-3" />
                            <span className="hidden sm:inline">Ficha</span>
                          </Button>
                        )}
                        {onSendEmail && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                            onClick={() => onSendEmail(sup.quotationId)}
                            title="Enviar Ficha de Cotação por E-mail"
                          >
                            <Mail className="size-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody className="divide-y divide-border/40">
            {items.map((item) => {
              const allocatedTotal = getItemAllocatedTotal(item.requestItemId)
              const isOverAllocated = allocatedTotal > item.availableBalance
              const isFullyAllocated = allocatedTotal === item.availableBalance

              return (
                <TableRow key={item.requestItemId} className="hover:bg-muted/20 transition-colors">
                  {/* Dados do Item (Sticky à esquerda) */}
                  <TableCell className="p-4 align-top sticky left-0 bg-card z-10 border-r border-border/60 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)]">
                    <div className="space-y-1.5">
                      <p className="font-semibold text-foreground text-sm leading-snug">
                        {item.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="rounded bg-muted px-1.5 py-0.5 font-medium text-foreground/90">
                          Demanda: {item.quantity} {item.unitSymbol}
                        </span>

                        {item.availableBalance < item.quantity && (
                          <span className="rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 font-medium">
                            Saldo: {item.availableBalance}
                          </span>
                        )}

                        {item.estimatedUnitPrice ? (
                          <span className="text-muted-foreground/80">
                            Ref: {formatBrl(item.estimatedUnitPrice)}
                          </span>
                        ) : null}
                      </div>

                      {/* Barra de Progresso de Alocação */}
                      <div className="pt-1">
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="text-muted-foreground">Alocado:</span>
                          <span
                            className={`font-semibold ${
                              isOverAllocated
                                ? 'text-destructive'
                                : isFullyAllocated
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-foreground'
                            }`}
                          >
                            {allocatedTotal} de {item.availableBalance} {item.unitSymbol}
                          </span>
                        </div>

                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all rounded-full ${
                              isOverAllocated
                                ? 'bg-destructive'
                                : isFullyAllocated
                                  ? 'bg-emerald-500'
                                  : 'bg-primary/70'
                            }`}
                            style={{
                              width: `${Math.min(
                                100,
                                (allocatedTotal / (item.availableBalance || 1)) * 100,
                              )}%`,
                            }}
                          />
                        </div>

                        {isOverAllocated && (
                          <p className="text-[11px] text-destructive flex items-center gap-1 mt-1 font-medium">
                            <AlertTriangle className="size-3" />
                            Quantidade excede o saldo da demanda!
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>

                  {/* Células por Fornecedor */}
                  {suppliers.map((sup) => {
                    const itemSuppliers = item.suppliers || item.offers || []
                    const supQuote = itemSuppliers.find((s) => s.supplierId === sup.supplierId)
                    if (!supQuote || supQuote.status === 'DENIED') {
                      return (
                        <TableCell
                          key={sup.supplierId}
                          className="p-4 align-top border-l border-border/40 text-muted-foreground/60 italic text-xs bg-muted/5"
                        >
                          <div className="flex flex-col items-center justify-center py-4 text-center">
                            <span className="text-muted-foreground/40 font-mono text-xs">
                              {supQuote?.status === 'DENIED' ? 'Recusado' : 'Não cotou'}
                            </span>
                          </div>
                        </TableCell>
                      )
                    }

                    const alloc = getAllocation(supQuote.quotationItemId)
                    const isSelected = !!alloc?.isWinner && (alloc?.awardedQuantity || 0) > 0
                    const unitPrice =
                      supQuote.effectiveUnitPrice ??
                      supQuote.netUnitPrice ??
                      Math.max(0, supQuote.price - (supQuote.discount || 0))

                    return (
                      <TableCell
                        key={sup.supplierId}
                        className={`p-4 align-top border-l border-border/40 transition-colors ${
                          isSelected
                            ? 'bg-emerald-500/10 border-l-emerald-500/40'
                            : 'hover:bg-muted/10'
                        }`}
                      >
                        <div className="space-y-2.5">
                          {/* Preços e Badges */}
                          <div className="flex items-start justify-between gap-1">
                            <div>
                              <span className="text-base font-bold text-foreground block tracking-tight">
                                {formatBrl(unitPrice)}
                              </span>
                              {supQuote.discount > 0 && (
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium line-through">
                                  {formatBrl(supQuote.price)}
                                </span>
                              )}
                            </div>

                            <div className="flex flex-col items-end gap-1">
                              {supQuote.isLowestPrice && unitPrice > 0 && (
                                <Badge
                                  variant="outline"
                                  className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 text-[10px] px-1.5 py-0 h-4 font-semibold gap-1"
                                >
                                  <Sparkles className="size-2.5" />
                                  Menor Preço
                                </Badge>
                              )}

                              {supQuote.isOverBudget && (
                                <Badge
                                  variant="outline"
                                  className="bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800 text-[10px] px-1.5 py-0 h-4 font-medium"
                                >
                                  Acima do Orçado
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Subtotal da Linha se Alocado */}
                          {isSelected && (
                            <div className="rounded bg-background/80 border border-emerald-500/30 p-1.5 text-[11px] flex justify-between items-center text-foreground font-medium">
                              <span className="text-muted-foreground text-[10px]">Subtotal:</span>
                              <span className="font-bold text-emerald-700 dark:text-emerald-300">
                                {formatBrl((alloc?.awardedQuantity || 0) * unitPrice)}
                              </span>
                            </div>
                          )}

                          {/* Controles de Seleção e Fracionamento */}
                          {!disabled && (
                            <div className="pt-1 flex flex-col gap-1.5">
                              <Button
                                type="button"
                                size="sm"
                                variant={isSelected ? 'default' : 'outline'}
                                className={`w-full h-7 text-xs font-medium gap-1.5 ${
                                  isSelected
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                    : 'hover:border-emerald-500/50'
                                }`}
                                onClick={() => handleSelectSoleWinner(item, supQuote)}
                              >
                                {isSelected ? (
                                  <>
                                    <Check className="size-3" />
                                    <span>Vencedor</span>
                                  </>
                                ) : (
                                  <>
                                    <Award className="size-3" />
                                    <span>Escolher</span>
                                  </>
                                )}
                              </Button>

                              {/* Input de Fracionamento Rápido */}
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-muted-foreground font-medium whitespace-nowrap">
                                  Qtd:
                                </span>
                                <Input
                                  type="number"
                                  min="0"
                                  max={item.availableBalance}
                                  value={alloc?.awardedQuantity ?? ''}
                                  placeholder="0"
                                  onChange={(e) =>
                                    handleQuantityChange(
                                      item,
                                      supQuote,
                                      parseFloat(e.target.value) || 0,
                                    )
                                  }
                                  className="h-6 text-xs text-center px-1 font-semibold"
                                />
                                <span className="text-[10px] text-muted-foreground">
                                  {item.unitSymbol}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    )
                  })}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
