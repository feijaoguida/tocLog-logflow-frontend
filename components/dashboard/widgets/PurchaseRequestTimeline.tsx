'use client'

import { CheckCircle2, Circle, Clock3, DollarSign, FileText, PackageCheck, XCircle } from 'lucide-react'

type TimelineProps = {
  status: string
  createdAt: string
  approvalDate?: string | null
  rejectedDate?: string | null
}

const STEP_FLOW = ['DRAFT', 'PENDING', 'APPROVED', 'IN_QUOTATION', 'ORDERED'] as const

const STEP_META: Record<
  (typeof STEP_FLOW)[number],
  { label: string; icon: typeof FileText }
> = {
  DRAFT: { label: 'Rascunho', icon: FileText },
  PENDING: { label: 'Aprovacao', icon: Clock3 },
  APPROVED: { label: 'Aprovado', icon: CheckCircle2 },
  IN_QUOTATION: { label: 'Cotacao', icon: DollarSign },
  ORDERED: { label: 'Ordem gerada', icon: PackageCheck },
}

export function PurchaseRequestTimeline({
  status,
  createdAt,
  approvalDate,
  rejectedDate,
}: TimelineProps) {
  const currentIndex = STEP_FLOW.findIndex((step) => step === status)
  const isRejected = status === 'REJECTED'

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start gap-4">
        {STEP_FLOW.map((step, index) => {
          const meta = STEP_META[step]
          const Icon = meta.icon

          const state = isRejected
            ? step === 'DRAFT'
              ? 'completed'
              : step === 'PENDING'
                ? 'rejected'
                : 'inactive'
            : index < currentIndex
              ? 'completed'
              : index === currentIndex
                ? 'current'
                : 'inactive'

          const circleClass =
            state === 'completed'
              ? 'border-transparent bg-emerald-500 text-white'
              : state === 'current'
                ? 'border-transparent bg-primary text-primary-foreground ring-4 ring-primary/10'
                : state === 'rejected'
                  ? 'border-transparent bg-rose-500 text-white ring-4 ring-rose-200'
                  : 'border-border bg-background text-muted-foreground'

          return (
            <div key={step} className="flex min-w-[112px] flex-1 items-start gap-3">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border ${circleClass}`}>
                {state === 'rejected' ? <XCircle className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">{meta.label}</p>
                <p className="text-xs text-muted-foreground">
                  {step === 'DRAFT'
                    ? new Date(createdAt).toLocaleDateString('pt-BR')
                    : step === 'APPROVED' && approvalDate
                      ? new Date(approvalDate).toLocaleDateString('pt-BR')
                      : step === 'PENDING' && rejectedDate && isRejected
                        ? new Date(rejectedDate).toLocaleDateString('pt-BR')
                        : 'Aguardando'}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {isRejected ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          O fluxo foi interrompido na etapa de aprovacao.
        </div>
      ) : null}
    </div>
  )
}
