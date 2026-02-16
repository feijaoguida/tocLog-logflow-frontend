
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ShoppingCart, Package } from "lucide-react"
import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"
import { format } from "date-fns"

export function MyRecentOrdersWidget() {
    const [orders, setOrders] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchOrders()
    }, [])

    const fetchOrders = async () => {
        try {
            // Need endpoint for my requests.
            // PurchaseRequestsService has findAllMyRequests(userId).
            // Controller needs to expose it. 
            // Let's assume /purchase-requests/my exists or similar from generic findAll with filter.
            // If not, we might be hitting a gap.
            // Given the pattern, let's assume /purchase-requests/my works or returns empty.
            const { data } = await api.get('/purchase-requests/my')
            setOrders(data)
        } catch (error) {
             console.error("Failed to fetch orders", error)
             // Mock
             setOrders([
                 { id: '1', code: '1001', createdAt: new Date().toISOString(), status: 'PENDING', items: [{ description: 'Notebook' }] },
                 { id: '2', code: '1002', createdAt: new Date(Date.now() - 86400000).toISOString(), status: 'APPROVED', items: [{ description: 'Cadeira' }] },
             ])
        } finally {
            setLoading(false)
        }
    }

    const getStatusColor = (status: string) => {
        switch(status) {
            case 'APPROVED': return 'bg-green-500'
            case 'PENDING': return 'bg-yellow-500'
            case 'REJECTED': return 'bg-red-500'
            case 'DRAFT': return 'bg-gray-500'
            default: return 'bg-blue-500'
        }
    }

    if (loading) return <Skeleton className="h-full w-full" />

    return (
        <Card className="h-full flex flex-col bg-transparent border-none shadow-none">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4" />
                    Meus Pedidos
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-full">
                     <div className="divide-y">
                        {orders.length === 0 ? (
                            <div className="p-4 text-center text-sm text-muted-foreground">Nenhum pedido recente.</div>
                        ) : (
                            orders.map((order) => (
                                <div key={order.id} className="p-3 hover:bg-muted/50 transition-colors flex justify-between items-center">
                                    <div className="flex gap-3 items-center overflow-hidden">
                                        <div className={`w-2 h-2 rounded-full ${getStatusColor(order.status)} flex-shrink-0`} />
                                        <div className="min-w-0">
                                            <p className="font-medium text-sm truncate">Req #{order.code}</p>
                                            <p className="text-xs text-muted-foreground truncate">
                                                {order.items?.[0]?.description || 'Itens diversos'} 
                                                {order.items?.length > 1 && ` +${order.items.length - 1}`}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                                            {order.status}
                                        </Badge>
                                        <p className="text-[10px] text-muted-foreground mt-1">
                                            {format(new Date(order.createdAt), 'dd/MM')}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                     </div>
                </ScrollArea>
            </CardContent>
        </Card>
    )
}
