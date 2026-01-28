
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, UserMinus, UserPlus } from "lucide-react"

export function HRStatsWidget({ data }: { data?: any }) {
    // data = { totalEmployees: 106, onVacation: 5, newHires: 2 }
    const stats = data || { totalEmployees: 0, onVacation: 0, newHires: 0 }

    return (
        <Card className="h-full">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">RH - Visão Geral</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-slate-500" />
                            <span className="text-sm">Total</span>
                        </div>
                        <span className="font-bold">{stats.totalEmployees}</span>
                    </div>
                    <div className="flex items-center justify-between">
                         <div className="flex items-center gap-2">
                            <UserMinus className="h-4 w-4 text-orange-500" />
                            <span className="text-sm">Férias</span>
                        </div>
                        <span className="font-bold">{stats.onVacation}</span>
                    </div>
                    <div className="flex items-center justify-between">
                         <div className="flex items-center gap-2">
                            <UserPlus className="h-4 w-4 text-green-500" />
                            <span className="text-sm">Admissões (30d)</span>
                        </div>
                        <span className="font-bold">{stats.newHires}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
