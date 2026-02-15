
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Car } from "lucide-react"

export function FleetVehicleListWidget({ data }: { data?: any[] }) {
    const vehicles = data || []

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Veículos Recentes</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 p-0">
                <div className="h-[200px] px-6 pb-4 overflow-y-auto custom-scrollbar">
                    <div className="space-y-3 pt-2">
                    {vehicles.length === 0 ? (
                         <p className="text-xs text-muted-foreground">Nenhum veículo encontrado.</p>
                    ) : (
                        vehicles.map((v: any) => (
                            <div key={v.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                                <div className="flex items-center gap-2">
                                    <div className="bg-slate-100 p-1 rounded">
                                        <Car className="h-3 w-3 text-slate-600" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-medium">{v.plate}</span>
                                        <span className="text-[10px] text-muted-foreground">{v.model}</span>
                                    </div>
                                </div>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                                    v.status === 'AVAILABLE' ? 'bg-green-100 text-green-700' :
                                    v.status === 'MAINTENANCE' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                                }`}>
                                    {v.status}
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
