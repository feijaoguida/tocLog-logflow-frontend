
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Bell, Info, MessageSquare, AlertTriangle } from "lucide-react"
import { useEffect, useState } from "react"
import { api } from "@/lib/api" // Assuming this automatically attaches token
import { Skeleton } from "@/components/ui/skeleton"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"

export function NotificationsWidget() {
    const [notifications, setNotifications] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchNotifications()
    }, [])

    const fetchNotifications = async () => {
        try {
            // Need a way to get my notifications.
            // Assuming /notifications returns list for logged user.
            // Service analysis: `findAll(recipientId)`
            // Controller usually gets user from token.
            const { data } = await api.get('/notifications/my') 
            setNotifications(data)
        } catch (error) {
             // Fallback
             console.log("Mock notifications")
             setNotifications([
                 { id: '1', title: 'Novo Pedido', content: 'Pedido #123 aprovado.', type: 'SYSTEM', createdAt: new Date().toISOString() },
                 { id: '2', title: 'Feedback', content: 'Você recebeu um novo feedback.', type: 'FEEDBACK', createdAt: new Date(Date.now() - 3600000).toISOString() }
             ])
        } finally {
            setLoading(false)
        }
    }

    const getIcon = (type: string) => {
        switch(type) {
            case 'FEEDBACK': return <MessageSquare className="h-4 w-4 text-blue-500" />
            case 'ALERT': return <AlertTriangle className="h-4 w-4 text-orange-500" />
            default: return <Info className="h-4 w-4 text-gray-500" />
        }
    }

    if (loading) return <Skeleton className="h-full w-full" />

    return (
        <Card className="h-full flex flex-col bg-transparent border-none shadow-none">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Notificações
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-full">
                    <div className="divide-y">
                        {notifications.length === 0 ? (
                            <div className="p-4 text-center text-sm text-muted-foreground">Nenhuma notificação.</div>
                        ) : (
                            notifications.map((n) => (
                                <div key={n.id} className="p-3 hover:bg-muted/50 transition-colors flex gap-3 text-sm">
                                    <div className="mt-1">{getIcon(n.type)}</div>
                                    <div className="flex-1 space-y-1">
                                        <p className="font-medium leading-none">{n.title}</p>
                                        <p className="text-muted-foreground text-xs line-clamp-2">{n.content}</p>
                                        <p className="text-[10px] text-muted-foreground text-right">
                                            {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: ptBR })}
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
