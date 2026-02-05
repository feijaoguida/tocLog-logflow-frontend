'use client'

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, CheckCircle, XCircle, Clock } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { api } from "@/lib/api"

interface PurchaseRequest {
    id: string
    code: number
    status: string
    justification: string
    createdAt: string
    requester: { user: { name: string } }
    items: { product?: { name: string }, description?: string, quantity: number }[]
}

export default function ApprovalsPage() {
    const [requests, setRequests] = useState<PurchaseRequest[]>([])
    const [loading, setLoading] = useState(true)
    const [rejectId, setRejectId] = useState<string | null>(null)
    const [reason, setReason] = useState("")
    const [actionLoading, setActionLoading] = useState(false)

    const fetchPending = async () => {
        try {
            setLoading(true)
            const { data } = await api.get('/purchase-requests/pending')
            setRequests(data)
        } catch { toast.error("Erro ao carregar aprovações") }
        finally { setLoading(false) }
    }

    useEffect(() => { fetchPending() }, [])

    const handleApprove = async (id: string) => {
        if(!confirm("Aprovar este pedido?")) return
        try {
            await api.patch(`/purchase-requests/${id}/approve`)
            toast.success("Pedido Aprovado!")
            fetchPending()
        } catch { toast.error("Erro ao aprovar") }
    }

    const handleReject = async () => {
        if(!rejectId || !reason) return
        setActionLoading(true)
        try {
            await api.patch(`/purchase-requests/${rejectId}/reject`, { reason })
            toast.success("Pedido Reprovado.")
            setRejectId(null)
            setReason("")
            fetchPending()
        } catch { toast.error("Erro ao reprovar") }
        finally { setActionLoading(false) }
    }

    return (
        <div className="flex flex-1 flex-col gap-4 p-4">
             <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Aprovações Pendentes</h1>
                    <p className="text-muted-foreground">Gerencie as solicitações do seu departamento.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {requests.map(req => (
                    <Card key={req.id} className="border-l-4 border-l-yellow-500">
                        <CardHeader className="pb-2">
                             <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <CardTitle className="flex items-center gap-2">
                                        Pedido #{req.code}
                                        <Badge variant="outline" className="ml-2 font-normal text-muted-foreground">{format(new Date(req.createdAt), "dd/MM/yyyy")}</Badge>
                                    </CardTitle>
                                    <div className="text-sm text-muted-foreground">Solicitado por <span className="font-medium text-foreground">{req.requester.user.name}</span></div>
                                </div>
                                <div className="flex gap-2">
                                    <Button size="sm" variant="outline" className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200" onClick={() => handleApprove(req.id)}>
                                        <CheckCircle className="mr-2 h-4 w-4"/> Aprovar
                                    </Button>
                                    <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200" onClick={() => setRejectId(req.id)}>
                                        <XCircle className="mr-2 h-4 w-4"/> Reprovar
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                             <div className="bg-muted/30 p-4 rounded-lg space-y-3">
                                <div className="text-sm"><span className="font-semibold">Justificativa:</span> {req.justification}</div>
                                <div className="space-y-1">
                                    <span className="text-sm font-semibold">Itens:</span>
                                    <ul className="text-sm text-muted-foreground list-disc pl-5">
                                        {req.items.map((item, i) => (
                                            <li key={i}>
                                                {item.quantity}x {item.product?.name || item.description || "Item N/A"}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                             </div>
                        </CardContent>
                    </Card>
                ))}
                {!loading && requests.length === 0 && (
                    <div className="py-12 text-center text-muted-foreground bg-muted/10 rounded-lg border border-dashed flex flex-col items-center">
                        <CheckCircle className="h-10 w-10 mb-2 opacity-20 text-green-500"/>
                        <p>Tudo certo! Nenhuma aprovação pendente.</p>
                    </div>
                )}
            </div>

            <Dialog open={!!rejectId} onOpenChange={(open) => !open && setRejectId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reprovar Pedido</DialogTitle>
                        <DialogDescription>A justificativa será enviada para o solicitante.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Textarea 
                            value={reason} 
                            onChange={e => setReason(e.target.value)} 
                            placeholder="Motivo da reprovação..." 
                            className="min-h-[100px]"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setRejectId(null)}>Cancelar</Button>
                        <Button variant="destructive" onClick={handleReject} disabled={actionLoading || !reason}>
                            {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Confirmar Reprovação
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
