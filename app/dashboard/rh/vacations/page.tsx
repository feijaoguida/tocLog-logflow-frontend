'use client'

import { useEffect, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Loader2, Plus, Check, X, Calendar } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { api } from "@/lib/api"

// Interfaces
interface Vacation {
    id: string
    startDate: string
    endDate: string
    note: string
    status: 'REQUESTED' | 'MANAGER_APPROVED' | 'MANAGER_REJECTED' | 'HR_CONFIRMED' | 'HR_REJECTED'
    employee: {
        user: { name: string }
    }
    createdAt: string
}

interface EmployeeProfile {
    id: string
    userId: string
    user: { name: string }
    // Add other fields if needed to determine Manager status
}

export default function VacationsPage() {
    const [activeTab, setActiveTab] = useState("my-requests")
    const [loading, setLoading] = useState(false)

    // Data
    const [myVacations, setMyVacations] = useState<Vacation[]>([])
    const [teamVacations, setTeamVacations] = useState<Vacation[]>([])
    const [hrVacations, setHrVacations] = useState<Vacation[]>([]) 
    
    // Auth/Context
    const [myProfile, setMyProfile] = useState<EmployeeProfile | null>(null)

    // Forms
    const [isRequestOpen, setIsRequestOpen] = useState(false)
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")
    const [note, setNote] = useState("")
    const [requestLoading, setRequestLoading] = useState(false)

    // Helper: Badge Color
    const getStatusBadge = (status: string) => {
        switch(status) {
            case 'REQUESTED': return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">Aguardando Gestor</Badge>
            case 'MANAGER_APPROVED': return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">Aguardando RH</Badge>
            case 'HR_CONFIRMED': return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">Confirmado</Badge>
            case 'MANAGER_REJECTED': return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">Rejeitado (Gestor)</Badge>
            case 'HR_REJECTED': return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">Rejeitado (RH)</Badge>
            default: return <Badge variant="outline">{status}</Badge>
        }
    }

    // Helper: Dates
    const formatDate = (d: string) => new Date(d).toLocaleDateString('pt-BR')

    // Initial Load
    useEffect(() => {
        fetchInitialData()
    }, [])

    const fetchInitialData = async () => {
        setLoading(true)
        try {
            // 1. Get Me (Auth Profile -> find Employee)
            const { data: user } = await api.get('/auth/profile')
            
            // B. Get All Employees (Inefficient but works for now) -> Optimization: Endpoint /employees/me
            const { data: employees } = await api.get('/employees')
            const me: EmployeeProfile | undefined = employees.find((e: EmployeeProfile) => e.userId === user.userId || e.user.name === user.name); 
            
            if(me) {
                setMyProfile(me)
                // C. Fetch My Vacations
                fetchMyVacations(me.id)
                // D. Fetch Team Vacations
                fetchAllVacations(me.id)
            }

        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }

    const fetchMyVacations = async (myEmployeeId: string) => {
        try {
             const { data } = await api.get(`/vacations?employeeId=${myEmployeeId}`)
             setMyVacations(data)
        } catch(e) {}
    }

    const fetchAllVacations = async (myEmployeeId: string) => {
         try {
             const { data: all } = await api.get('/vacations') // Get ALL
             
             // FILTER TEAM: Where employee.directManagerId == me.id (Need this data in Vacation include)
             // My generic findAll includes employee.user but maybe not directManagerId.
             // Let's assume for now I see EVERYTHING in Team tab to demonstrate. 
             // Real filter: all.filter(v => v.employee.directManagerId === myEmployeeId)
             // Since I don't have that field easily, I'll filter items that are NOT mine for Team view (and status REQUESTED).
             
             const others = all.filter((v: Vacation) => v.employee?.user?.name !== myProfile?.user?.name) // weak check
             const pendingManager = others.filter((v: Vacation) => v.status === 'REQUESTED')
             setTeamVacations(pendingManager)

             const pendingHR = all.filter((v: Vacation) => v.status === 'MANAGER_APPROVED')
             setHrVacations(pendingHR)
        } catch(e) {}
    }

    const handleRequest = async (e: React.FormEvent) => {
        e.preventDefault()
        if(!myProfile) return toast.error("Perfil não identificado")
        setRequestLoading(true)
        try {
            await api.post('/vacations', {
                employeeId: myProfile.id,
                startDate,
                endDate,
                note
            })
            toast.success("Férias solicitadas!")
            setIsRequestOpen(false)
            fetchMyVacations(myProfile.id)
        } catch (e: any) {
            const msg = e.response?.data?.message || "Erro ao solicitar"
            toast.error(msg)
        } finally {
            setRequestLoading(false)
        }
    }

    const handleAction = async (id: string, newStatus: string) => {
        try {
            await api.patch(`/vacations/${id}/status`, { status: newStatus })
            toast.success("Status atualizado")
            // Refresh
            if(myProfile) fetchAllVacations(myProfile.id)
            if(myProfile) fetchMyVacations(myProfile.id) // In case I approved my own?
        } catch (e) {
            toast.error("Erro ao atualizar status")
        }
    }

    if(loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-8 w-8" /></div>

    return (
        <div className="flex flex-1 flex-col gap-4 p-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">Central de Férias</h1>
                <Dialog open={isRequestOpen} onOpenChange={setIsRequestOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2"><Plus className="h-4 w-4" /> Solicitar Férias</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Nova Solicitação</DialogTitle>
                            <DialogDescription>Infome o período desejado.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleRequest} className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Início</Label>
                                    <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required />
                                </div>
                                <div className="space-y-2">
                                    <Label>Fim</Label>
                                    <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Observação</Label>
                                <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Ex: Viagem marcada..." />
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={requestLoading}>Solicitar</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Tabs defaultValue="my-requests" className="w-full" onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="my-requests">Minhas Solicitações</TabsTrigger>
                    <TabsTrigger value="team">Gestão de Equipe ({teamVacations.length})</TabsTrigger>
                    <TabsTrigger value="hr">Administração RH ({hrVacations.length})</TabsTrigger>
                </TabsList>
                
                {/* MY REQUESTS */}
                <TabsContent value="my-requests">
                    <Card>
                        <CardHeader className="pt-6"><CardTitle>Meus Pedidos</CardTitle><CardDescription>Histórico de solicitações.</CardDescription></CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Período</TableHead>
                                        <TableHead>Dias</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Obs</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {myVacations.map(v => (
                                        <TableRow key={v.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                                    {formatDate(v.startDate)} - {formatDate(v.endDate)}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {Math.ceil((new Date(v.endDate).getTime() - new Date(v.startDate).getTime()) / (1000 * 3600 * 24))} dias
                                            </TableCell>
                                            <TableCell>{getStatusBadge(v.status)}</TableCell>
                                            <TableCell className="text-muted-foreground text-sm truncate max-w-[200px]">{v.note}</TableCell>
                                        </TableRow>
                                    ))}
                                    {myVacations.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">Nenhuma solicitação encontrada.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TEAM MANAGEMENT */}
                <TabsContent value="team">
                    <Card>
                        <CardHeader className="pt-6"><CardTitle>Aprovações Pendentes (Gestor)</CardTitle><CardDescription>Solicitações da sua equipe aguardando parecer.</CardDescription></CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Funcionário</TableHead>
                                        <TableHead>Período</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {teamVacations.map(v => (
                                        <TableRow key={v.id}>
                                            <TableCell className="font-medium">{v.employee.user.name}</TableCell>
                                            <TableCell>{formatDate(v.startDate)} - {formatDate(v.endDate)}</TableCell>
                                            <TableCell>{getStatusBadge(v.status)}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button size="sm" variant="outline" className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200" onClick={() => handleAction(v.id, 'MANAGER_APPROVED')}>
                                                        <Check className="h-4 w-4 mr-1" /> Aprovar
                                                    </Button>
                                                    <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200" onClick={() => handleAction(v.id, 'MANAGER_REJECTED')}>
                                                        <X className="h-4 w-4 mr-1" /> Rejeitar
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                     {teamVacations.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">Nenhuma solicitação pendente.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* HR ADMIN */}
                <TabsContent value="hr">
                    <Card>
                        <CardHeader className="pt-6"><CardTitle>Confirmação RH</CardTitle><CardDescription>Solicitações aprovadas por gestores aguardando processamento.</CardDescription></CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Funcionário</TableHead>
                                        <TableHead>Período</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {hrVacations.map(v => (
                                        <TableRow key={v.id}>
                                            <TableCell className="font-medium">{v.employee.user.name}</TableCell>
                                            <TableCell>{formatDate(v.startDate)} - {formatDate(v.endDate)}</TableCell>
                                            <TableCell>{getStatusBadge(v.status)}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button size="sm" variant="outline" className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200" onClick={() => handleAction(v.id, 'HR_CONFIRMED')}>
                                                        <Check className="h-4 w-4 mr-1" /> Confirmar
                                                    </Button>
                                                    <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200" onClick={() => handleAction(v.id, 'HR_REJECTED')}>
                                                        <X className="h-4 w-4 mr-1" /> Rejeitar
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                     {hrVacations.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">Nenhuma solicitação pendente para o RH.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
