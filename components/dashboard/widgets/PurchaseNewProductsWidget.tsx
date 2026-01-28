
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Package } from "lucide-react"

export function PurchaseNewProductsWidget({ data }: { data?: any[] }) {
    const products = data || []
    return (
        <Card className="h-full">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Novos Produtos</CardTitle>
            </CardHeader>
             <CardContent className="space-y-2">
                {products.length === 0 ? <p className="text-xs text-muted-foreground">Sem produtos recentes.</p> : 
                    products.map((p: any) => (
                        <div key={p.id} className="flex items-center gap-2 text-sm">
                            <Package className="h-4 w-4 text-slate-400" />
                            <div className="flex flex-col min-w-0">
                                <span className="font-medium truncate">{p.name}</span>
                                <span className="text-[10px] text-muted-foreground">{p.code}</span>
                            </div>
                        </div>
                    ))
                }
            </CardContent>
        </Card>
    )
}
