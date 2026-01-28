
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export function PurchaseStatusWidget({ data, title }: { data?: any[], title: string }) {
    const chartData = data || []
    
    return (
        <Card className="h-full flex flex-col">
             <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-[150px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={60}
                            fill="#8884d8"
                            paddingAngle={5}
                            dataKey="count"
                            nameKey="status"
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                    </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2 justify-center mt-2">
                    {chartData.map((entry, index) => (
                         <div key={index} className="flex items-center gap-1 text-[10px]">
                             <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                             <span>{entry.status}: {entry.count}</span>
                         </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
