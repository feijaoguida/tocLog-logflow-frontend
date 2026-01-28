
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { User } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export function HDRecentTicketsWidget({ data }: { data?: any[] }) {
    const tickets = data || []
    return (
        <Card className="h-full">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Últimos Chamados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                 {tickets.length === 0 ? <p className="text-xs text-muted-foreground">Nenhum chamado recente.</p> : 
                    tickets.map((t: any) => (
                        <div key={t.id} className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs">{t.requester?.user?.name.slice(0,2).toUpperCase() || 'U'}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col min-w-0">
                                <span className="text-sm font-medium truncate">{t.subtitle || t.title || 'Chamado sem título'}</span>
                                <span className="text-[10px] text-muted-foreground">aberto por {t.requester?.user?.name}</span>
                            </div>
                        </div>
                    ))
                }
            </CardContent>
        </Card>
    )
}
