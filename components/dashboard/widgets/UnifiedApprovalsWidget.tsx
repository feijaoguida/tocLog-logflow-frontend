
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Check, X, FileText, Calendar, ExternalLink } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"

export function UnifiedApprovalsWidget() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            const { data } = await api.get('/dashboard/approvals')
            setData(data)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <Card className="h-full flex flex-col">
                <CardHeader>
                    <CardTitle>Central de Aprovações</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 p-4">
                    <Skeleton className="h-full w-full" />
                </CardContent>
            </Card>
        )
    }

    const purchaseRequests = data?.purchaseRequests || []
    const vacationRequests = data?.vacationRequests || []
    const totalPending = purchaseRequests.length + vacationRequests.length

    return (
        <Card className="h-full flex flex-col bg-transparent border-none shadow-none">
             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                    Central de Aprovações
                </CardTitle>
                {totalPending > 0 ? (
                    <Badge variant="destructive">{totalPending} Pendentes</Badge>
                ) : (
                    <Badge variant="secondary">Nada Pendente</Badge>
                )}
            </CardHeader>
            <CardContent className="flex-1 p-0">
                {totalPending === 0 ? (
                    <div className="flex h-full items-center justify-center text-muted-foreground p-4">
                        <div className="text-center">
                            <Check className="mx-auto h-8 w-8 mb-2 opacity-50" />
                            <p>Tudo em dia!</p>
                        </div>
                    </div>
                ) : (
                    <ScrollArea className="h-[calc(100%-10px)]">
                        <div className="space-y-1 p-2">
                            {/* Purchase Requests */}
                            {purchaseRequests.map((req: any) => (
                                <div key={req.id} className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-accent transition-colors">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                                            <FileText className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                                        </div>
                                        <div className="truncate">
                                            <p className="text-sm font-medium truncate">Compra #{req.code}</p>
                                            <p className="text-xs text-muted-foreground truncate">{req.requester.user.name}</p>
                                        </div>
                                    </div>
                                    <Button size="sm" variant="ghost" asChild>
                                        <Link href={`/dashboard/compras/aprovacoes?id=${req.id}`}>
                                            <ExternalLink className="h-4 w-4" />
                                        </Link>
                                    </Button>
                                </div>
                            ))}

                            {/* Vacation Requests */}
                            {vacationRequests.map((req: any) => (
                                <div key={req.id} className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-accent transition-colors">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="h-8 w-8 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center flex-shrink-0">
                                            <Calendar className="h-4 w-4 text-orange-600 dark:text-orange-300" />
                                        </div>
                                        <div className="truncate">
                                            <p className="text-sm font-medium truncate">Férias</p>
                                            <p className="text-xs text-muted-foreground truncate">{req.employee.user.name}</p>
                                        </div>
                                    </div>
                                     <Button size="sm" variant="ghost" asChild>
                                        <Link href={`/dashboard/rh/vacations/approvals?id=${req.id}`}>
                                            <ExternalLink className="h-4 w-4" />
                                        </Link>
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                )}
            </CardContent>
        </Card>
    )
}
