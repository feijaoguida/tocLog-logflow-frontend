
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign } from "lucide-react"

export function PurchaseSumsWidget({ data }: { data?: any }) {
    const stats = data || { totalConfirmed: 0 }
    
    const formatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalConfirmed)

    return (
        <Card className="h-full">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Compras - Total (Confirmado)</CardTitle>
            </CardHeader>
            <CardContent>
                 <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                        <span className="text-lg font-bold text-green-600">{formatted}</span>
                    </div>
                    <DollarSign className="h-6 w-6 text-green-500 opacity-50" />
                </div>
            </CardContent>
        </Card>
    )
}
