'use client'

import { useState, useEffect } from "react"
import { useAuth } from "@/context/auth-context"
import { Checklist } from "@/types/fleet"
import { api } from "@/lib/api"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, FileCheck } from "lucide-react"

const TYPE_MAP: Record<string, string> = {
    'DELIVERY': 'Saída / Entrega',
    'RECEIVEMENT': 'Retorno / Recebimento',
    'MAINTENANCE_EXIT': 'Saída p/ Manutenção',
    'PERIODIC': 'Periódico',
    'CORRECTIVE': 'Corretivo'
}

export default function ChecklistsPage() {
    const { token, hasPermission } = useAuth()
    const router = useRouter()
    const [checklists, setChecklists] = useState<Checklist[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!token) return
        const fetchChecklists = async () => {
             try {
                 const res = await api.get('/fleet/checklists')
                 setChecklists(res.data)
             } catch (e) {
                 console.error(e)
             } finally {
                 setLoading(false)
             }
        }
        fetchChecklists()
    }, [token])

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Checklists</h1>
                    <p className="text-muted-foreground">Histórico de inspeções de veículos.</p>
                </div>
                {hasPermission('fleet.checklists.execute') && (
                    <Button onClick={() => router.push('/dashboard/fleet/checklists/new')}>
                        <Plus className="mr-2 h-4 w-4" /> Novo Checklist
                    </Button>
                )}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Histórico Recente</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Veículo</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Responsável</TableHead>
                                <TableHead>Data</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center h-24">Carregando...</TableCell>
                                </TableRow>
                            ) : checklists.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">Nenhum registro encontrado.</TableCell>
                                </TableRow>
                            ) : (
                                checklists.map((list: any) => (
                                    <TableRow key={list.id}>
                                        <TableCell className="font-medium">{list.vehicle.plate}</TableCell>
                                        <TableCell>{TYPE_MAP[list.type] || list.type}</TableCell>
                                        <TableCell>
                                            {list.driver?.user?.name || '-'}
                                        </TableCell>
                                        <TableCell>{new Date(list.startedAt).toLocaleDateString('pt-BR')} {new Date(list.startedAt).toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit'})}</TableCell>
                                        <TableCell>
                                            <Badge variant={list.status === 'FINISHED' ? 'default' : 'secondary'}>
                                                {list.status === 'FINISHED' ? 'Concluído' : 'Em Aberto'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm">Ver</Button>
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
