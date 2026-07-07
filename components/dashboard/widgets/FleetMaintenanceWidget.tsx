import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowRight, Check, Wrench } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'

type VehicleMaintenanceRecord = {
  id: string
  plate: string
  model: string
  status: 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'BLOCKED'
}

export function FleetMaintenanceWidget() {
  const [vehicles, setVehicles] = useState<VehicleMaintenanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    void loadVehicles()
  }, [])

  async function loadVehicles() {
    try {
      setLoadError(null)
      const { data } = await api.get<VehicleMaintenanceRecord[]>('/fleet/vehicles?status=MAINTENANCE')
      setVehicles(data)
    } catch (error) {
      setLoadError(getApiErrorMessage(error, 'Não foi possível carregar a frota em manutenção.'))
      setVehicles([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <Skeleton className="h-full w-full rounded-3xl" />
  }

  const count = vehicles.length

  return (
    <Card className="flex h-full flex-col border-none bg-transparent shadow-none">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-red-600 dark:text-red-400">
            <Wrench className="h-4 w-4" />
            Em manutenção
          </CardTitle>
          <Badge variant={count > 0 ? 'destructive' : 'secondary'}>{count}</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        {loadError ? (
          <div className="flex h-full flex-col justify-center gap-2 p-4 text-sm text-muted-foreground">
            <p>{loadError}</p>
          </div>
        ) : count === 0 ? (
          <div className="flex h-full flex-col items-center justify-center p-4 text-muted-foreground">
            <Check className="mb-2 h-8 w-8 text-green-500 opacity-50" />
            <span className="text-sm">Toda a frota operante.</span>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="divide-y">
              {vehicles.map((vehicle) => (
                <div
                  key={vehicle.id}
                  className="flex items-center justify-between p-3 transition-colors hover:bg-muted/50"
                >
                  <div>
                    <p className="text-sm font-semibold">{vehicle.plate}</p>
                    <p className="text-xs text-muted-foreground">{vehicle.model}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className="border-red-200 bg-red-50 text-[10px] text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
                  >
                    Oficina
                  </Badge>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
      {count > 0 ? (
        <div className="border-t bg-muted/20 p-2">
          <Button variant="ghost" size="sm" className="h-7 w-full text-xs" asChild>
            <Link href="/dashboard/fleet/maintenance">
              Ver detalhes
              <ArrowRight className="ml-2 h-3 w-3" />
            </Link>
          </Button>
        </div>
      ) : null}
    </Card>
  )
}
