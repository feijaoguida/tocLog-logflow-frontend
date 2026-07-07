import { Car } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type FleetVehicleListItem = {
  id: string
  plate: string
  model: string
  status: 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'BLOCKED'
}

const STATUS_LABEL: Record<FleetVehicleListItem['status'], string> = {
  AVAILABLE: 'Disponível',
  IN_USE: 'Em uso',
  MAINTENANCE: 'Oficina',
  BLOCKED: 'Bloqueado',
}

const STATUS_CLASSNAME: Record<FleetVehicleListItem['status'], string> = {
  AVAILABLE: 'bg-green-100 text-green-700',
  IN_USE: 'bg-blue-100 text-blue-700',
  MAINTENANCE: 'bg-red-100 text-red-700',
  BLOCKED: 'bg-amber-100 text-amber-700',
}

export function FleetVehicleListWidget({ data }: { data?: FleetVehicleListItem[] }) {
  const vehicles = data ?? []

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Veículos recentes
        </CardTitle>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 p-0">
        <div className="custom-scrollbar h-[200px] overflow-y-auto px-6 pb-4">
          <div className="space-y-3 pt-2">
            {vehicles.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Nenhum veículo encontrado neste tenant.
              </p>
            ) : (
              vehicles.map((vehicle) => (
                <div
                  key={vehicle.id}
                  className="flex items-center justify-between border-b pb-2 text-sm last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <div className="rounded bg-slate-100 p-1">
                      <Car className="h-3 w-3 text-slate-600" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium">{vehicle.plate}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {vehicle.model}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] ${STATUS_CLASSNAME[vehicle.status]}`}
                  >
                    {STATUS_LABEL[vehicle.status]}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
