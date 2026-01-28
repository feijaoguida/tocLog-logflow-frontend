
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ClipboardCheck } from "lucide-react"

export function FleetChecklistWidget({ data }: { data?: any }) {
    const stats = data || { totalChecklists: 0, expired: 0 }
    
    return (
        <Card className="h-full">
             <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Checklists</CardTitle>
            </CardHeader>
            <CardContent>
                 <div className="flex items-end justify-between mb-2">
                     <div>
                        <span className="text-2xl font-bold">{stats.totalChecklists}</span>
                        <p className="text-xs text-muted-foreground">Execuções Totais</p>
                     </div>
                     <ClipboardCheck className="h-8 w-8 text-blue-200" />
                 </div>
                 {stats.expired > 0 && (
                     <div className="bg-red-50 text-red-600 text-xs p-2 rounded flex justify-between">
                         <span>Vencidos/Atenção</span>
                         <span className="font-bold">{stats.expired}</span>
                     </div>
                 )}
            </CardContent>
        </Card>
    )
}
