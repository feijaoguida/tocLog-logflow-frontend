'use client'

import React, { useMemo } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  DollarSign,
  Layers,
  Save,
  ShoppingCart,
  Truck,
  Users,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ComparisonMatrixData,
  ItemAllocation,
} from './quotation-comparison-matrix'

interface QuotationScenarioPanelProps {
  matrix: ComparisonMatrixData
  allocations: ItemAllocation[]
  onSaveAllocations: () => Promise<void>
  onOpenBatchModal: () => void
  saving?: boolean
  disabled?: boolean
}

export function QuotationScenarioPanel({
  matrix,
  allocations,
  onSaveAllocations,
  onOpenBatchModal,
  saving = false,
  disabled = false,
}: QuotationScenarioPanelProps) {
  const { items, suppliers } = matrix

  // Cálculo detalhado do cenário em tempo real
  const scenarioSummary = useMemo(() => {
    const supplierBreakdown: Array<{
      supplierId: string
      supplierName: string
      itemsCount: number
      itemsSubtotal: number
      freightCost: number
      orderTotal: number
      minOrderValue?: number | null
      belowMinOrder: boolean
    }> = []

    let grandTotal = 0
    let totalItemsAllocatedCount = 0

    for (const sup of suppliers) {
      const supAllocations = allocations.filter(
        (a) => a.supplierId === sup.supplierId && a.isWinner && a.awardedQuantity > 0,
      )

      if (supAllocations.length === 0) continue

      let itemsSubtotal = 0
      for (const alloc of supAllocations) {
        const itemObj = items.find((it) => it.requestItemId === alloc.requestItemId)
        const itemSuppliers = itemObj?.suppliers || itemObj?.offers || []
        const quoteObj = itemSuppliers.find(
          (s) => s.quotationItemId === alloc.quotationItemId,
        )
        const unitPrice = quoteObj
          ? (quoteObj.effectiveUnitPrice ??
             quoteObj.netUnitPrice ??
             Math.max(0, quoteObj.price - (quoteObj.discount || 0)))
          : 0
        itemsSubtotal += alloc.awardedQuantity * unitPrice
      }

      const freight = sup.freightCost || 0
      const orderTotal = itemsSubtotal + freight
      const belowMinOrder = !!(
        sup.minOrderValue && itemsSubtotal < sup.minOrderValue
      )

      supplierBreakdown.push({
        supplierId: sup.supplierId,
        supplierName: sup.supplierName,
        itemsCount: supAllocations.length,
        itemsSubtotal,
        freightCost: freight,
        orderTotal,
        minOrderValue: sup.minOrderValue,
        belowMinOrder,
      })

      grandTotal += orderTotal
      totalItemsAllocatedCount += supAllocations.length
    }

    // Validação de cobertura dos itens da requisição
    const itemCoverage = items.map((it) => {
      const allocatedQty = allocations
        .filter((a) => a.requestItemId === it.requestItemId && a.isWinner)
        .reduce((sum, a) => sum + (a.awardedQuantity || 0), 0)

      return {
        requestItemId: it.requestItemId,
        description: it.description,
        demandQty: it.availableBalance,
        allocatedQty,
        isComplete: allocatedQty === it.availableBalance,
        isOver: allocatedQty > it.availableBalance,
        isUnder: allocatedQty < it.availableBalance,
      }
    })

    const hasOverAllocation = itemCoverage.some((c) => c.isOver)
    const allItemsComplete = itemCoverage.every((c) => c.isComplete)

    return {
      supplierBreakdown,
      grandTotal,
      selectedSuppliersCount: supplierBreakdown.length,
      hasOverAllocation,
      allItemsComplete,
      itemCoverage,
    }
  }, [matrix, allocations])

  const formatBrl = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  const {
    supplierBreakdown,
    grandTotal,
    selectedSuppliersCount,
    hasOverAllocation,
    allItemsComplete,
  } = scenarioSummary

  return (
    <Card className="app-section-card border-border/80 shadow-sm transition-all">
      <CardHeader className="p-4 pb-2 border-b border-border/40">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <Layers className="size-4 text-primary" />
            <CardTitle className="text-sm font-bold tracking-tight text-foreground">
              Simulador do Cenário de Compra
            </CardTitle>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={`text-xs font-semibold ${
                hasOverAllocation
                  ? 'border-destructive text-destructive bg-destructive/10'
                  : allItemsComplete
                    ? 'border-emerald-500 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : 'border-amber-500 text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300'
              }`}
            >
              {hasOverAllocation
                ? 'Quantidade excedida'
                : allItemsComplete
                  ? '100% da Demanda Alocada'
                  : 'Alocação Parcial'}
            </Badge>

            <span className="text-xs text-muted-foreground font-medium">
              {selectedSuppliersCount} fornecedor(es) selecionado(s)
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Resumo por Fornecedor Selecionado */}
        {supplierBreakdown.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {supplierBreakdown.map((s) => (
              <div
                key={s.supplierId}
                className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between border-b border-border/40 pb-1.5">
                  <span className="font-bold text-foreground truncate max-w-[150px]" title={s.supplierName}>
                    {s.supplierName}
                  </span>
                  <Badge variant="secondary" className="text-[10px] h-4 font-medium px-1.5">
                    {s.itemsCount} iten(s)
                  </Badge>
                </div>

                <div className="space-y-1 text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Itens:</span>
                    <span className="font-semibold text-foreground">
                      {formatBrl(s.itemsSubtotal)}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="flex items-center gap-1">
                      <Truck className="size-3" /> Frete:
                    </span>
                    <span className="font-medium text-foreground">
                      {s.freightCost > 0 ? formatBrl(s.freightCost) : 'Grátis'}
                    </span>
                  </div>

                  <div className="flex justify-between border-t border-border/40 pt-1 text-xs">
                    <span className="font-bold text-foreground">Ordem Total:</span>
                    <span className="font-bold text-primary">
                      {formatBrl(s.orderTotal)}
                    </span>
                  </div>

                  {s.belowMinOrder && (
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1 pt-1 font-medium">
                      <AlertTriangle className="size-3" />
                      Abaixo do pedido mínimo ({formatBrl(s.minOrderValue || 0)})
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center text-muted-foreground text-xs italic">
            Nenhum fornecedor selecionado. Clique em &ldquo;Escolher&rdquo; ou digite quantidades na matriz acima para compor o cenário.
          </div>
        )}

        {/* Rodapé do Painel com Total Geral e Ações */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-border/40 pt-3">
          <div>
            <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">
              Custo Total Estimado da Compra
            </p>
            <p className="text-2xl font-bold tracking-tight text-foreground">
              {formatBrl(grandTotal)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!disabled && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5 font-medium"
                  disabled={saving || supplierBreakdown.length === 0}
                  onClick={onSaveAllocations}
                >
                  <Save className="size-4" />
                  <span>{saving ? 'Salvando...' : 'Salvar Alocações'}</span>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  className="h-9 gap-1.5 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={
                    saving ||
                    supplierBreakdown.length === 0 ||
                    hasOverAllocation
                  }
                  onClick={onOpenBatchModal}
                >
                  <ShoppingCart className="size-4" />
                  <span>Emitir {selectedSuppliersCount} Ordem(ns) em Lote</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
