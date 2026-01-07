'use client'

import { useState, useEffect } from "react"
import { useAuth } from "@/context/auth-context"
import { Maintenance, Vehicle } from "@/types/fleet"
import { api } from "@/lib/api"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, Wrench, Calendar, CheckSquare } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

const STATUS_MAP: Record<string, { label: string, variant: "default" | "secondary" | "destructive" | "outline" | "success" }> = {
    'SCHEDULED': { label: 'Agendada', variant: 'outline' },
    'IN_PROGRESS': { label: 'Em Andamento', variant: 'secondary' },
    'COMPLETED': { label: 'Concluída', variant: 'success' },
    'CANCELLED': { label: 'Cancelada', variant: 'destructive' },
}

const TYPE_MAP: Record<string, string> = {
    'PREVENTIVE': 'Preventiva',
    'CORRECTIVE': 'Corretiva'
}

export default function MaintenancePage() {
    const { token, hasPermission } = useAuth()
    const router = useRouter()
    const [maintenances, setMaintenances] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    // Modal State
    const [open, setOpen] = useState(false)
    const [vehicles, setVehicles] = useState<Vehicle[]>([])
    
    // Form State
    const [vehicleId, setVehicleId] = useState('')
    const [type, setType] = useState('PREVENTIVE')
    const [origin, setOrigin] = useState('EXTERNAL')
    const [description, setDescription] = useState('')
    const [scheduledDate, setScheduledDate] = useState('')
    const [estimatedCost, setEstimatedCost] = useState('')
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        if (!token) return
        fetchMaintenances()
        fetchVehicles()
    }, [token])

    const fetchMaintenances = async () => {
         try {
             const res = await api.get('/fleet/maintenance')
             setMaintenances(res.data)
         } catch (e) { console.error(e) } 
         finally { setLoading(false) }
    }

    const fetchVehicles = async () => {
        try {
            const res = await api.get('/fleet/vehicles')
            setVehicles(res.data)
        } catch (e) { console.error(e) }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)
        try {
            await api.post('/fleet/maintenance', {
                vehicleId,
                type,
                origin,
                description,
                scheduledDate: new Date(scheduledDate).toISOString(),
                estimatedCost: estimatedCost ? parseFloat(estimatedCost) : undefined
            })
            setOpen(false)
            fetchMaintenances() // Refresh list
            // Reset form
            setVehicleId('')
            setDescription('')
            setEstimatedCost('')
        } catch (error: any) {
            alert(error.response?.data?.message || 'Erro ao agendar manutenção')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Manutenções</h1>
                    <p className="text-muted-foreground">Agendamento e controle de manutenções da frota.</p>
                </div>
                {hasPermission('fleet.maintenance.manage') && (
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" /> Nova Manutenção
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px]">
                            <DialogHeader>
                                <DialogTitle>Agendar Manutenção</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Veículo</Label>
                                    <Select value={vehicleId} onValueChange={setVehicleId} required>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione o veículo" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {vehicles.map(v => (
                                                <SelectItem key={v.id} value={v.id}>{v.plate} - {v.model}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                     <div className="space-y-2">
                                        <Label>Tipo</Label>
                                        <Select value={type} onValueChange={setType}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="PREVENTIVE">Preventiva</SelectItem>
                                                <SelectItem value="CORRECTIVE">Corretiva</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Origem</Label>
                                        <Select value={origin} onValueChange={setOrigin}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="INTERNAL">Interna</SelectItem>
                                                <SelectItem value="EXTERNAL">Externa (Fornecedor)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Descrição / Serviço</Label>
                                    <Textarea required value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: Troca de óleo, pastilhas..." />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Data Agendada</Label>
                                        <Input type="datetime-local" required value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Custo Estimado (R$)</Label>
                                        <Input type="number" min="0" step="0.01" value={estimatedCost} onChange={e => setEstimatedCost(e.target.value)} />
                                    </div>
                                </div>
                                <div className="flex justify-end pt-4">
                                    <Button type="submit" disabled={submitting}>
                                        {submitting ? 'Salvando...' : 'Agendar'}
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Histórico e Agendamentos</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Veículo</TableHead>
                                <TableHead>Serviço</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Data Agendada</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Custo</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center h-24">Carregando...</TableCell>
                                </TableRow>
                            ) : maintenances.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">Nenhuma manutenção registrada.</TableCell>
                                </TableRow>
                            ) : (
                                maintenances.map((m: any) => (
                                    <TableRow key={m.id}>
                                        <TableCell className="font-medium">{m.vehicle.plate}</TableCell>
                                        <TableCell>{m.description}</TableCell>
                                        <TableCell>{TYPE_MAP[m.type] || m.type}</TableCell>
                                        <TableCell>{new Date(m.scheduledDate).toLocaleDateString('pt-BR')}</TableCell>
                                        <TableCell>
                                            <Badge variant={STATUS_MAP[m.status]?.variant as any}>
                                                {STATUS_MAP[m.status]?.label || m.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {m.finalCost 
                                                ? `R$ ${m.finalCost.toFixed(2)}` 
                                                : m.estimatedCost ? `Est. R$ ${m.estimatedCost.toFixed(2)}` : '-'}
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
