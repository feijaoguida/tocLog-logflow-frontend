import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

type FeedbackVisibilityNoteProps = {
  isOneToOne: boolean
  visibleToHr: boolean
}

export function FeedbackVisibilityNote({
  isOneToOne,
  visibleToHr,
}: FeedbackVisibilityNoteProps) {
  if (!isOneToOne) {
    return null
  }

  const label = visibleToHr ? 'RH tambem visualiza' : 'RH nao visualiza'
  const description = visibleToHr
    ? 'Este feedback 1 para 1 esta visivel para RH porque foi marcado como denuncia ou porque houve autorizacao explicita de override.'
    : 'Este feedback 1 para 1 permanece restrito entre remetente e destinatario. RH nao acompanha esta conversa.'

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className={`rounded-full px-3 py-1 text-xs ${visibleToHr ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-slate-200 bg-slate-100 text-slate-700'}`}
        >
          {label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent sideOffset={8} className="max-w-80 px-3 py-2 text-left text-xs leading-relaxed">
        {description}
      </TooltipContent>
    </Tooltip>
  )
}
