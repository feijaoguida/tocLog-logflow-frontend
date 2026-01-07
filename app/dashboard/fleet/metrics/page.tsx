'use client'

import { useState, useEffect } from "react"
import { useAuth } from "@/context/auth-context"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Car, Wrench, AlertCircle, Calendar } from "lucide-react"

export default function FleetDashboardPage() {
    const { token } = useAuth()
    const [metrics, setMetrics] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!token) return
        api.get('/fleet/vehicles/dashboard/metrics')
           .then(res => setMetrics(res.data))
           .catch(console.error)
           .finally(() => setLoading(false))
    }, [token])

    if (loading) return <div className="p-8">Carregando indicadores...</div>
    if (!metrics) return <div className="p-8">Erro ao carregar dados.</div>

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Dashboard de Frotas</h1>
                <p className="text-muted-foreground">Indicadores e alertas operacionais.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total de Veículos</CardTitle>
                        <Car className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.total}</div>
                        <p className="text-xs text-muted-foreground">
                            {metrics.statusDetails?.AVAILABLE || 0} Disponíveis
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Em Manutenção</CardTitle>
                        <Wrench className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.statusDetails?.MAINTENANCE || 0}</div>
                        <p className="text-xs text-muted-foreground">Veículos indisponíveis</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Manutenções Ativas</CardTitle>
                        <AlertCircle className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.activeMaintenances}</div>
                        <p className="text-xs text-muted-foreground">Agendadas ou em andamento</p>
                    </CardContent>
                </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Em Uso</CardTitle>
                        <Car className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.statusDetails?.IN_USE || 0}</div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Próximas Manutenções (7 dias)</CardTitle>
                        <CardDescription>Veículos que requerem atenção em breve.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {metrics.upcomingMaintenances.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Nenhuma manutenção próxima.</p>
                        ) : (
                            <div className="space-y-4">
                                {metrics.upcomingMaintenances.map((m: any) => (
                                    <div key={m.id} className="flex items-center justify-between border-b pb-2 last:pb-0 last:border-0">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-orange-100 p-2 rounded-full">
                                                <Calendar className="h-4 w-4 text-orange-600" />
                                            </div>
                                            <div>
                                                <p className="font-medium">{m.vehicle.plate}</p>
                                                <p className="text-xs text-muted-foreground">{m.description}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-medium">{new Date(m.scheduledDate).toLocaleDateString('pt-BR')}</p>
                                            <p className="text-xs text-muted-foreground">{m.type}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
