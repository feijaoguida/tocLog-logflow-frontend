'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, FileText, Loader2, ShoppingCart, Truck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
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
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'

interface SupplierOrderPreview {
  supplierId: string
  supplierName: string
  itemsCount: number
  itemsSubtotal: number
  freightCost: number
  orderTotal: number
}

interface BatchOrderEmissionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  requestId: string
  supplierOrders: SupplierOrderPreview[]
  onSuccess: () => Promise<void>
}

export function BatchOrderEmissionModal({
  open,
  onOpenChange,
  requestId,
  supplierOrders,
  onSuccess,
}: BatchOrderEmissionModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [defaultEntryNumber, setDefaultEntryNumber] = useState('')
  const [generalObservation, setGeneralObservation] = useState('')
  const [supplierEntryNumbers, setSupplierEntryNumbers] = useState<
    Record<string, string>
  >({})

  const formatBrl = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  const grandTotal = supplierOrders.reduce((sum, s) => sum + s.orderTotal, 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const payload = {
        defaultEntryNumber: defaultEntryNumber.trim() || undefined,
        generalObservation: generalObservation.trim() || undefined,
        supplierConfigs: supplierOrders.map((s) => ({
          supplierId: s.supplierId,
          entryNumber:
            supplierEntryNumbers[s.supplierId]?.trim() ||
            defaultEntryNumber.trim() ||
            undefined,
        })),
      }

      await api.post(`/purchase-orders/generate-multi/${requestId}`, payload)

      toast.success(
        `${supplierOrders.length} Ordem(ns) de Compra emitida(s) com sucesso!`,
      )
      onOpenChange(false)
      await onSuccess()
      router.push('/dashboard/compras/ordens')
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, 'Erro ao emitir ordens de compra em lote.'),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <ShoppingCart className="size-5 text-emerald-600" />
              Emissão em Lote de Ordens de Compra
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Confirme a geração atômica de {supplierOrders.length} Ordem(ns) de
              Compra a partir do cenário homologado.
            </DialogDescription>
          </DialogHeader>

          {/* Espelho das OCs a serem geradas */}
          <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Ordens que serão emitidas:
            </span>

            <div className="divide-y divide-border/40 max-h-48 overflow-y-auto pr-1">
              {supplierOrders.map((s, idx) => (
                <div
                  key={s.supplierId}
                  className="py-2 flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <span className="font-bold text-foreground">
                      #{idx + 1} — {s.supplierName}
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      {s.itemsCount} iten(s) • Frete:{' '}
                      {s.freightCost > 0 ? formatBrl(s.freightCost) : 'Grátis'}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="font-bold text-primary text-sm">
                      {formatBrl(s.orderTotal)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-border/40 pt-2 flex justify-between items-baseline">
              <span className="text-xs font-bold text-foreground uppercase">
                Total Geral do Pacote:
              </span>
              <span className="text-lg font-bold text-foreground">
                {formatBrl(grandTotal)}
              </span>
            </div>
          </div>

          {/* Campos Contábeis e Observações */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="defaultEntryNumber" className="text-xs font-medium">
                Nº de Lançamento Padrão (Opcional)
              </Label>
              <Input
                id="defaultEntryNumber"
                placeholder="Ex: LAN-2026-0042"
                value={defaultEntryNumber}
                onChange={(e) => setDefaultEntryNumber(e.target.value)}
                className="h-8 text-xs font-mono"
              />
              <p className="text-[10px] text-muted-foreground">
                Aplicado a todas as ordens deste pacote se não especificado individualmente.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="generalObservation" className="text-xs font-medium">
                Observações das Ordens
              </Label>
              <Input
                id="generalObservation"
                placeholder="Ex: Compra aprovada conforme cotação unificada"
                value={generalObservation}
                onChange={(e) => setGeneralObservation(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading || supplierOrders.length === 0}
              className="gap-1.5 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {loading && <Loader2 className="size-4 animate-spin" />}
              <span>Confirmar e Emitir {supplierOrders.length} OCs</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
