
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ShoppingCart, FileText } from "lucide-react"

export function PurchasePendingWidget({ data }: { data?: any }) {
    const stats = data || { pendingRequests: 0, inQuotation: 0 }

    return (
         <Card className="h-full bg-slate-900 text-white border-none">
             <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-300">Compras Pendentes</CardTitle>
            </CardHeader>
            <CardContent>
                 <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <ShoppingCart className="h-4 w-4 text-slate-400" />
                            <span className="text-sm">Requisições</span>
                        </div>
                        <span className="text-2xl font-bold text-yellow-400">{stats.pendingRequests}</span>
                    </div>
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-slate-400" />
                            <span className="text-sm">Em Cotação</span>
                        </div>
                        <span className="text-xl font-bold text-blue-400">{stats.inQuotation}</span>
                    </div>
                 </div>
            </CardContent>
         </Card>
    )
}
