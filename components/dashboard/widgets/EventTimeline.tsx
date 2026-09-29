'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Award,
  Ban,
  CheckCircle2,
  Clock,
  FilePlus,
  Layers,
  PackageCheck,
  Send,
  ShoppingCart,
  Truck,
  XCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export type TimelineEvent = {
  id: string
  action: string
  description?: string | null
  createdAt: string
  metadata?: Record<string, any> | null
}

export interface EventTimelineProps {
  events?: TimelineEvent[]
  emptyMessage?: string
}

const ACTION_CONFIG: Record<
  string,
  { label: string; icon: any; colorClass: string; badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  REQUEST_CREATED: {
    label: 'Rascunho Criado',
    icon: FilePlus,
    colorClass: 'bg-blue-500 text-white',
  },
  REQUEST_SUBMITTED: {
    label: 'Enviado para Aprovação',
    icon: Send,
    colorClass: 'bg-amber-500 text-white',
  },
  REQUEST_APPROVED_BY_DEPARTMENT: {
    label: 'Aprovado pelo Gestor',
    icon: CheckCircle2,
    colorClass: 'bg-emerald-600 text-white',
  },
  REQUEST_REJECTED_BY_DEPARTMENT: {
    label: 'Reprovado pelo Gestor',
    icon: XCircle,
    colorClass: 'bg-rose-600 text-white',
  },
  REQUEST_QUOTATION_STARTED: {
    label: 'Cotação Iniciada',
    icon: Layers,
    colorClass: 'bg-sky-600 text-white',
  },
  REQUEST_QUOTATION_WINNER_SELECTED: {
    label: 'Vencedor Homologado',
    icon: Award,
    colorClass: 'bg-emerald-600 text-white',
  },
  REQUEST_ORDER_OPEN: {
    label: 'Ordem de Compra Criada',
    icon: ShoppingCart,
    colorClass: 'bg-blue-600 text-white',
  },
  REQUEST_ORDER_SENT: {
    label: 'Ordem Enviada ao Fornecedor',
    icon: Truck,
    colorClass: 'bg-indigo-600 text-white',
  },
  REQUEST_ORDER_CONFIRMED: {
    label: 'Recebimento Confirmado',
    icon: PackageCheck,
    colorClass: 'bg-emerald-600 text-white',
  },
  REQUEST_ORDER_PARTIALLY_RECEIVED: {
    label: 'Recebimento Parcial',
    icon: PackageCheck,
    colorClass: 'bg-amber-500 text-white',
  },
  REQUEST_ORDER_CANCELLED: {
    label: 'Ordem Cancelada',
    icon: Ban,
    colorClass: 'bg-rose-600 text-white',
  },
  QUOTATION_CREATED: {
    label: 'Cotação Registrada',
    icon: FilePlus,
    colorClass: 'bg-sky-500 text-white',
  },
  QUOTATION_CANCELLED: {
    label: 'Cotação Cancelada',
    icon: Ban,
    colorClass: 'bg-rose-500 text-white',
  },
}

export function EventTimeline({
  events = [],
  emptyMessage = 'Nenhum evento registrado nesta requisição.',
}: EventTimelineProps) {
  if (!events || events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center text-sm text-muted-foreground border border-dashed rounded-lg">
        <Clock className="h-8 w-8 mb-2 opacity-50" />
        <p>{emptyMessage}</p>
      </div>
    )
  }

  // Ordenar cronologicamente inverso (mais recentes primeiro)
  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
      {sortedEvents.map((evt, idx) => {
        const config = ACTION_CONFIG[evt.action] || {
          label: evt.action.replace(/_/g, ' '),
          icon: Clock,
          colorClass: 'bg-slate-500 text-white',
        }
        const Icon = config.icon

        let formattedDate = ''
        try {
          formattedDate = format(new Date(evt.createdAt), "dd 'de' MMMM 'às' HH:mm", {
            locale: ptBR,
          })
        } catch {
          formattedDate = new Date(evt.createdAt).toLocaleString('pt-BR')
        }

        return (
          <div key={evt.id || idx} className="relative group">
            {/* Timeline bullet / icon */}
            <div
              className={`absolute -left-[30px] top-0.5 flex h-7 w-7 items-center justify-center rounded-full ring-4 ring-background shadow-sm ${config.colorClass}`}
            >
              <Icon className="h-3.5 w-3.5" />
            </div>

            <div className="rounded-lg border bg-card p-3 shadow-xs transition-colors hover:bg-accent/20">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <span className="font-semibold text-sm text-foreground">
                  {config.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formattedDate}
                </span>
              </div>

              {evt.description && (
                <p className="text-xs text-muted-foreground mb-1">
                  {evt.description}
                </p>
              )}

              {evt.metadata && Object.keys(evt.metadata).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {evt.metadata.reason && (
                    <Badge variant="outline" className="text-[10px] text-rose-600 border-rose-200 bg-rose-50">
                      Motivo: {String(evt.metadata.reason)}
                    </Badge>
                  )}
                  {evt.metadata.totalValue && (
                    <Badge variant="secondary" className="text-[10px]">
                      Valor: R$ {Number(evt.metadata.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </Badge>
                  )}
                  {evt.metadata.priority && (
                    <Badge variant="outline" className="text-[10px]">
                      Prioridade: {String(evt.metadata.priority)}
                    </Badge>
                  )}
                  {evt.metadata.itemCount && (
                    <Badge variant="outline" className="text-[10px]">
                      Itens: {String(evt.metadata.itemCount)}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
