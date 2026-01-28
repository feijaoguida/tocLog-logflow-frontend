
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarClock } from "lucide-react"

export function HRVacationStatsWidget({ data }: { data?: any[] }) {
    // data = [{ name: 'User', endDate: '2023-01-01' }]
    const expiring = data || []

    return (
        <Card className="h-full">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Férias a Vencer/Terminar</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {expiring.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Nenhuma férias vencendo em breve.</p>
                    ) : (
                        expiring.map((v, i) => (
                            <div key={i} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <CalendarClock className="h-4 w-4 text-orange-500" />
                                    <span>{v.name}</span>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                    {new Date(v.endDate).toLocaleDateString()}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
