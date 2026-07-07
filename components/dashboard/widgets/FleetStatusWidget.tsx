import { AlertTriangle, Car, CheckCircle } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type FleetStatusWidgetData = {
  totalVehicles?: number
  inMaintenance?: number
  available?: number
  inUse?: number
}

export function FleetStatusWidget({ data }: { data?: FleetStatusWidgetData }) {
  const stats = {
    totalVehicles: data?.totalVehicles ?? 0,
    inMaintenance: data?.inMaintenance ?? 0,
    available: data?.available ?? 0,
    inUse: data?.inUse ?? 0,
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Frota - Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="rounded-lg bg-slate-50 p-2">
            <Car className="mx-auto mb-1 h-5 w-5 text-blue-500" />
            <span className="text-xl font-bold">{stats.totalVehicles}</span>
            <span className="block text-[10px] text-muted-foreground">Total</span>
          </div>
          <div className="rounded-lg bg-green-50 p-2">
            <CheckCircle className="mx-auto mb-1 h-5 w-5 text-green-500" />
            <span className="text-xl font-bold">{stats.available}</span>
            <span className="block text-[10px] text-muted-foreground">Disponível</span>
          </div>
          <div className="rounded-lg bg-red-50 p-2">
            <AlertTriangle className="mx-auto mb-1 h-5 w-5 text-red-500" />
            <span className="text-xl font-bold">{stats.inMaintenance}</span>
            <span className="block text-[10px] text-muted-foreground">Oficina</span>
          </div>
          <div className="rounded-lg bg-sky-50 p-2">
            <Car className="mx-auto mb-1 h-5 w-5 text-sky-600" />
            <span className="text-xl font-bold">{stats.inUse}</span>
            <span className="block text-[10px] text-muted-foreground">Em uso</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
