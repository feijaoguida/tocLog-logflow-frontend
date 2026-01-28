
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export function PurchaseRecentOrdersWidget({ data }: { data?: any[] }) {
    const orders = data || []
    return (
        <Card className="h-full">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Últimos Pedidos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                {orders.length === 0 ? <p className="text-xs text-muted-foreground">Sem pedidos recentes.</p> : 
                    orders.map((o: any) => (
                        <div key={o.id} className="flex justify-between items-center text-sm border-b pb-1 last:border-0">
                            <div>
                                <p className="font-medium">{o.supplier?.name || 'Fornecedor'}</p>
                                <p className="text-[10px] text-muted-foreground">#{o.code || o.id.slice(0,8)}</p>
                            </div>
                            <Badge variant="secondary" className="text-[10px]">{o.status}</Badge>
                        </div>
                    ))
                }
            </CardContent>
        </Card>
    )
}
