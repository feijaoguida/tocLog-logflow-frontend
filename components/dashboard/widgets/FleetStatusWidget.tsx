
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Car, AlertTriangle, CheckCircle } from "lucide-react"

export function FleetStatusWidget({ data }: { data?: any }) {
    const stats = data || { totalVehicles: 0, inMaintenance: 0, available: 0 }

    return (
        <Card className="h-full">
             <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Frota - Status</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="flex flex-col items-center p-2 bg-slate-50 rounded-lg">
                        <Car className="h-5 w-5 text-blue-500 mb-1" />
                        <span className="text-xl font-bold">{stats.totalVehicles}</span>
                        <span className="text-[10px] text-muted-foreground">Total</span>
                    </div>
                     <div className="flex flex-col items-center p-2 bg-red-50 rounded-lg">
                         <AlertTriangle className="h-5 w-5 text-red-500 mb-1" />
                        <span className="text-xl font-bold">{stats.inMaintenance}</span>
                        <span className="text-[10px] text-muted-foreground">Oficina</span>
                    </div>
                     <div className="flex flex-col items-center p-2 bg-green-50 rounded-lg">
                         <CheckCircle className="h-5 w-5 text-green-500 mb-1" />
                        <span className="text-xl font-bold">{stats.available}</span>
                        <span className="text-[10px] text-muted-foreground">Disponível</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
