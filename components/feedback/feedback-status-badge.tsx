import { Badge } from '@/components/ui/badge'

const STATUS_META = {
  OPEN: { label: 'Aberto', tone: 'border-amber-200 bg-amber-50 text-amber-700' },
  IN_REVIEW: { label: 'Em analise', tone: 'border-sky-200 bg-sky-50 text-sky-700' },
  ANSWERED: { label: 'Respondido', tone: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  CLOSED: { label: 'Concluido', tone: 'border-slate-200 bg-slate-100 text-slate-700' },
} as const

export function FeedbackStatusBadge({ status }: { status: keyof typeof STATUS_META | string }) {
  const meta = STATUS_META[status as keyof typeof STATUS_META] ?? {
    label: status,
    tone: 'border-slate-200 bg-slate-100 text-slate-700',
  }

  return <Badge className={`rounded-full px-3 py-1 text-xs font-semibold ${meta.tone}`}>{meta.label}</Badge>
}
