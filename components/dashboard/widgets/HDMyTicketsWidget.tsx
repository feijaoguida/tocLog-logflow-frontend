
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Ticket } from "lucide-react"

export function HDMyTicketsWidget({ data }: { data?: any }) {
    const stats = data || { count: 0 }

    return (
        <Card className="h-full bg-gradient-to-br from-violet-500 to-purple-600 text-white border-none">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-violet-100">Meus Chamados</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-4">
                    <Ticket className="h-8 w-8 text-white/80" />
                    <div>
                        <div className="text-3xl font-bold">{stats.count}</div>
                        <div className="text-xs text-violet-200">Abertos / Em Andamento</div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
