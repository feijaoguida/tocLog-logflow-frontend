
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy } from "lucide-react"

export function HDTopStatsWidget({ data, title }: { data?: any[], title: string }) {
    const list = data || []
    return (
        <Card className="h-full">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    {list.length === 0 ? <p className="text-xs text-muted-foreground">Sem dados.</p> :
                        list.map((item: any, index) => (
                            <div key={index} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    {index === 0 && <Trophy className="h-3 w-3 text-yellow-500" />}
                                    <span>{item.name}</span>
                                </div>
                                <span className="font-bold">{item.count}</span>
                            </div>
                        ))
                    }
                </div>
            </CardContent>
        </Card>
    )
}
