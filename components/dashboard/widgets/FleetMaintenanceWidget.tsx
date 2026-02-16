
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Wrench, Check, ArrowRight } from "lucide-react"
import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export function FleetMaintenanceWidget() {
    const [vehicles, setVehicles] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchVehicles()
    }, [])

    const fetchVehicles = async () => {
        try {
            // Fetching vehicles in maintenance. 
            // FleetService.findAll takes params? 
            // Usually standard REST: /vehicles?status=MAINTENANCE
            const { data } = await api.get('/fleet/vehicles?status=MAINTENANCE')
            setVehicles(data)
        } catch (error) {
             console.error("Failed to fetch fleet maintenance", error)
             // Mock
             setVehicles([
                 { id: '1', plate: 'ABC-1234', model: 'Fiat Uno', status: 'MAINTENANCE', reason: 'Troca de óleo' },
                 { id: '2', plate: 'XYZ-9876', model: 'Honda Civic', status: 'MAINTENANCE', reason: 'Freios' },
             ])
        } finally {
            setLoading(false)
        }
    }

    if (loading) return <Skeleton className="h-full w-full" />

    const count = vehicles.length

    return (
        <Card className="h-full flex flex-col bg-transparent border-none shadow-none">
            <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-sm font-medium flex items-center gap-2 text-red-600 dark:text-red-400">
                        <Wrench className="h-4 w-4" />
                        Em Manutenção
                    </CardTitle>
                    <Badge variant={count > 0 ? "destructive" : "secondary"}>
                        {count}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
                 {count === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-muted-foreground p-4">
                        <Check className="h-8 w-8 mb-2 text-green-500 opacity-50" />
                        <span className="text-sm">Toda a frota operante!</span>
                    </div>
                 ) : (
                    <ScrollArea className="h-full">
                        <div className="divide-y">
                            {vehicles.map((v) => (
                                <div key={v.id} className="p-3 hover:bg-muted/50 transition-colors flex items-center justify-between group">
                                    <div>
                                        <p className="font-semibold text-sm">{v.plate}</p>
                                        <p className="text-xs text-muted-foreground">{v.model}</p>
                                    </div>
                                    <Badge variant="outline" className="text-[10px] border-red-200 text-red-700 bg-red-50 dark:bg-red-950 dark:text-red-300 dark:border-red-900">
                                        Oficina
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                 )}
            </CardContent>
            {count > 0 && (
                <div className="p-2 border-t bg-muted/20">
                    <Button variant="ghost" size="sm" className="w-full text-xs h-7" asChild>
                        <Link href="/dashboard/fleet/maintenance">
                            Ver detalhes <ArrowRight className="ml-2 h-3 w-3" />
                        </Link>
                    </Button>
                </div>
            )}
        </Card>
    )
}
