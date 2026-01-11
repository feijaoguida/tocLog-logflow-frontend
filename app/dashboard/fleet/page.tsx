'use client'

import { useState, useEffect } from "react"
import { useAuth } from "@/context/auth-context"
import { Vehicle } from "@/types/fleet"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Search, Car, Filter } from "lucide-react"
import Link from "next/link"
import { api } from "@/lib/api"
import { useRouter } from "next/navigation"

const STATUS_MAP: Record<string, { label: string, variant: "default" | "secondary" | "destructive" | "outline" | "success" }> = {
    'AVAILABLE': { label: 'Disponível', variant: 'success' }, // Assuming success variant exists or fallback to default
    'IN_USE': { label: 'Em Uso', variant: 'secondary' },
    'MAINTENANCE': { label: 'Manutenção', variant: 'destructive' },
    'BLOCKED': { label: 'Bloqueado', variant: 'destructive' },
}

export default function FleetPage() {
    const { isAuthenticated, hasPermission } = useAuth()
    const router = useRouter()
    const [vehicles, setVehicles] = useState<Vehicle[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        if (!isAuthenticated) return

        const fetchVehicles = async () => {
            try {
                const res = await api.get('/fleet/vehicles')
                setVehicles(res.data)
            } catch (error) {
                console.error("Error fetching vehicles:", error)
            } finally {
                setLoading(false)
            }
        }

        fetchVehicles()
    }, [isAuthenticated])

    const filteredVehicles = vehicles.filter(v => 
        v.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.model.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Gestão de Frotas</h1>
                    <p className="text-muted-foreground">Gerencie seus veículos, checklists e manutenções.</p>
                </div>
                {hasPermission('fleet.vehicles.manage') && (
                    <Button onClick={() => router.push('/dashboard/fleet/new')}>
                        <Plus className="mr-2 h-4 w-4" /> Novo Veículo
                    </Button>
                )}
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total de Veículos</CardTitle>
                        <Car className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{vehicles.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Em Uso</CardTitle>
                        <Car className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{vehicles.filter(v => v.status === 'IN_USE').length}</div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Em Manutenção</CardTitle>
                        <Car className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-destructive">{vehicles.filter(v => v.status === 'MAINTENANCE').length}</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Meus Veículos</CardTitle>
                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <div className="relative w-full md:w-64">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    placeholder="Buscar placa ou modelo..." 
                                    className="pl-8"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <Button variant="outline" size="icon">
                                <Filter className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Placa</TableHead>
                                <TableHead>Modelo / Ano</TableHead>
                                <TableHead>Categoria</TableHead>
                                <TableHead>KM Atual</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center h-24">Carregando...</TableCell>
                                </TableRow>
                            ) : filteredVehicles.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">Nenhum veículo encontrado.</TableCell>
                                </TableRow>
                            ) : (
                                filteredVehicles.map((vehicle) => (
                                    <TableRow key={vehicle.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/dashboard/fleet/${vehicle.id}`)}>
                                        <TableCell className="font-medium">{vehicle.plate}</TableCell>
                                        <TableCell>{vehicle.model} <span className="text-muted-foreground text-xs">({vehicle.year})</span></TableCell>
                                        <TableCell>{vehicle.category?.name || '-'}</TableCell>
                                        <TableCell>{vehicle.currentKm.toLocaleString()} km</TableCell>
                                        <TableCell>
                                            <Badge variant={STATUS_MAP[vehicle.status]?.variant as any || 'default'}>
                                                {STATUS_MAP[vehicle.status]?.label || vehicle.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm">Detalhes</Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
