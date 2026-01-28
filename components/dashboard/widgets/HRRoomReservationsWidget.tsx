
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DoorOpen } from "lucide-react"

export function HRRoomReservationsWidget({ data }: { data?: any }) {
    const stats = data || { totalRooms: 0, reservationsToday: 0 }

    return (
        <Card className="h-full">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Salas de Reunião</CardTitle>
            </CardHeader>
            <CardContent>
                 <div className="flex items-center justify-between mb-4">
                    <div className="flex flex-col">
                        <span className="text-2xl font-bold">{stats.reservationsToday}</span>
                        <span className="text-xs text-muted-foreground">Reservas Hoje</span>
                    </div>
                    <DoorOpen className="h-8 w-8 text-blue-500 opacity-50" />
                </div>
                <div className="text-xs text-muted-foreground">
                    Total de Salas: {stats.totalRooms}
                </div>
            </CardContent>
        </Card>
    )
}
