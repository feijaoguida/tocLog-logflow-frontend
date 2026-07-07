import { ClipboardCheck } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type FleetChecklistWidgetData = {
  totalChecklists?: number
  openChecklists?: number
}

export function FleetChecklistWidget({ data }: { data?: FleetChecklistWidgetData }) {
  const stats = {
    totalChecklists: data?.totalChecklists ?? 0,
    openChecklists: data?.openChecklists ?? 0,
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Checklists
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-2 flex items-end justify-between">
          <div>
            <span className="text-2xl font-bold">{stats.totalChecklists}</span>
            <p className="text-xs text-muted-foreground">Execuções totais</p>
          </div>
          <ClipboardCheck className="h-8 w-8 text-blue-200" />
        </div>
        {stats.openChecklists > 0 ? (
          <div className="flex justify-between rounded bg-amber-50 p-2 text-xs text-amber-700">
            <span>Checklists em aberto</span>
            <span className="font-bold">{stats.openChecklists}</span>
          </div>
        ) : (
          <div className="rounded bg-green-50 p-2 text-xs text-green-700">
            Nenhum checklist em aberto no momento.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
