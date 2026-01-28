
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Box } from "lucide-react"

export function LogisticsPalletWidget({ data }: { data?: any }) {
    const stats = data || { totalPallets: 0 }

    return (
        <Card className="h-full">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Logística - Pallets</CardTitle>
            </CardHeader>
            <CardContent>
                 <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                        <span className="text-2xl font-bold">{stats.totalPallets}</span>
                        <span className="text-xs text-muted-foreground">Saldo Total</span>
                    </div>
                    <Box className="h-8 w-8 text-amber-600 opacity-50" />
                </div>
            </CardContent>
        </Card>
    )
}
