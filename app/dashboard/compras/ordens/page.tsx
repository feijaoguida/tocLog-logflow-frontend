'use client'

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { Truck, CheckCircle, Ban, FileText } from "lucide-react"
import { toast } from "sonner"

interface PurchaseOrder {
    id: string
    code?: number // If auto-increment exists, otherwise UUID or slice
    totalValue: number
    status: string
    createdAt: string
    supplier: { name: string }
    quotation: {
        request: { code: number }
    }
}

export default function PurchaseOrdersPage() {
    const [orders, setOrders] = useState<PurchaseOrder[]>([])
    const [loading, setLoading] = useState(true)

    const fetchOrders = async () => {
        try {
            setLoading(true)
            const token = localStorage.getItem('token')
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://162.215.222.208:4000'}/purchase-orders`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if(res.ok) setOrders(await res.json())
        } catch { toast.error("Erro ao carregar ordens") }
        finally { setLoading(false) }
    }

    useEffect(() => { fetchOrders() }, [])

    const updateStatus = async (id: string, status: string) => {
        if(!confirm(`Alterar status para ${status}?`)) return
        try {
             const token = localStorage.getItem('token')
            await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://162.215.222.208:4000'}/purchase-orders/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ status })
            })
            toast.success("Status atualizado")
            fetchOrders()
        } catch { toast.error("Erro ao atualizar") }
    }

    return (
        <div className="flex flex-1 flex-col gap-4 p-4">
             <div className="flex items-center justify-between">
                <div>
                     <h1 className="text-2xl font-bold tracking-tight">Ordens de Compra</h1>
                    <p className="text-muted-foreground">Gerencie os pedidos enviados aos fornecedores.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {orders.map(po => (
                    <Card key={po.id} className="relative">
                        <CardHeader className="pb-2">
                             <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        Fornecedor: {po.supplier.name}
                                    </CardTitle>
                                    <div className="text-sm text-muted-foreground mt-1">
                                        Ref. Pedido #{po.quotation.request.code}
                                    </div>
                                </div>
                                <Badge variant={po.status === 'CONFIRMED' ? 'default' : po.status === 'CANCELLED' ? 'destructive' : 'outline'}>
                                    {po.status}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="text-2xl font-bold">
                                    R$ {Number(po.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    Emitido em: {format(new Date(po.createdAt), "dd/MM/yyyy HH:mm")}
                                </div>
                                
                                <div className="flex gap-2 pt-2 border-t">
                                    {po.status === 'OPEN' && (
                                        <Button size="sm" className="w-full" onClick={() => updateStatus(po.id, 'SENT')}>
                                            <FileText className="h-3.5 w-3.5 mr-2"/> Marcar Enviado
                                        </Button>
                                    )}
                                    {po.status === 'SENT' && (
                                        <Button size="sm" className="w-full bg-green-600 hover:bg-green-700" onClick={() => updateStatus(po.id, 'CONFIRMED')}>
                                            <CheckCircle className="h-3.5 w-3.5 mr-2"/> Confirmar Recebimento
                                        </Button>
                                    )}
                                     {po.status !== 'CANCELLED' && po.status !== 'CONFIRMED' && (
                                        <Button size="sm" variant="ghost" className="text-red-500" onClick={() => updateStatus(po.id, 'CANCELLED')}>
                                            <Ban className="h-4 w-4"/>
                                        </Button>
                                     )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                 {!loading && orders.length === 0 && <div className="col-span-full text-center py-10 text-muted-foreground">Nenhuma ordem de compra gerada.</div>}
            </div>
        </div>
    )
}
