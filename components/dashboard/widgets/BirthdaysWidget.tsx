
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Cake, Trophy } from "lucide-react"
import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { Skeleton } from "@/components/ui/skeleton"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ScrollArea } from "@/components/ui/scroll-area"

export function BirthdaysWidget() {
    const [birthdays, setBirthdays] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            const { data } = await api.get('/dashboard/birthdays')
            setBirthdays(data)
        } catch (error) {
            console.error("Failed to fetch birthdays", error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) return <Skeleton className="h-full w-full" />

    const currentMonthName = format(new Date(), 'MMMM', { locale: ptBR })

    return (
        <Card className="h-full flex flex-col bg-transparent border-none shadow-none">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-pink-700 dark:text-pink-400 capitalize">
                    <Cake className="h-4 w-4" />
                    Aniversariantes de {currentMonthName}
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0">
                {birthdays.length === 0 ? (
                    <div className="flex h-full items-center justify-center p-4 text-muted-foreground text-sm text-center">
                        Ninguém soprando velinhas este mês! 🎈
                    </div>
                ) : (
                    <ScrollArea className="h-full">
                        <div className="p-2 space-y-2">
                            {birthdays.map((p) => {
                                const day = new Date(p.birthDate).getDate()
                                const isToday = day === new Date().getDate()
                                
                                return (
                                    <div key={p.id} className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${isToday ? 'bg-white shadow-sm ring-1 ring-pink-200 dark:bg-pink-900/40' : 'hover:bg-white/50'}`}>
                                        <div className="relative">
                                            <Avatar className="h-8 w-8 border-2 border-white shadow-sm">
                                                <AvatarImage src={p.avatarUrl} />
                                                <AvatarFallback className="text-xs bg-pink-100 text-pink-700">{p.name.substring(0,2).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            {isToday && (
                                                <div className="absolute -top-1 -right-1">
                                                    <span className="flex h-3 w-3 relative">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-pink-500"></span>
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate text-pink-950 dark:text-pink-100">{p.name}</p>
                                            <p className="text-xs text-pink-600/80 dark:text-pink-300/80">
                                                Dia {day} {isToday && "🎉 Hoje!"}
                                            </p>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </ScrollArea>
                )}
            </CardContent>
        </Card>
    )
}
