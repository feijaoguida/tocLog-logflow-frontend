
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Warehouse } from "lucide-react"

export function LogisticsAssetsWidget({ data }: { data?: any }) {
    const stats = data || { totalAssets: 0 }

    return (
        <Card className="h-full">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Ativos Logísticos</CardTitle>
            </CardHeader>
            <CardContent>
                 <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                        <span className="text-2xl font-bold">{stats.totalAssets}</span>
                        <span className="text-xs text-muted-foreground">Total Cadastrado</span>
                    </div>
                    <Warehouse className="h-8 w-8 text-slate-500 opacity-50" />
                </div>
            </CardContent>
        </Card>
    )
}
