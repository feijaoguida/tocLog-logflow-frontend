'use client'

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { useRouter } from "next/navigation"
import { Loader2, ArrowRight } from "lucide-react"
import { toast } from "sonner"

interface PurchaseRequest {
    id: string
    code: number
    status: string
    justification: string
    createdAt: string
    department: { name: string }
    requester: { user: { name: string } }
}

export default function QuotationsIndexPage() {
    const [requests, setRequests] = useState<PurchaseRequest[]>([])
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    useEffect(() => {
        const fetchRequests = async () => {
            try {
                const token = localStorage.getItem('token')
                // Reusing pending endpoint or creating a new specific one? 
                // We need Requests that are APPROVED or IN_QUOTATION.
                // The 'pending' endpoint was for Manager Pending Approval.
                // We need a Buyer endpoint. Ideally "Find All Approved or In Quotation".
                // I didn't create that specific endpoint, but 'pending' on service logic was tailored for manager.
                // I should add a endpoint for Buyers.
                // For now, let's assume I can filter via a new endpoint or reusing existing logic if modified.
                // Let's create a quick valid endpoint logic through direct fetch if possible or just use what we have?
                // Actually, I missed creating a "findAllForPurchasing" endpoint.
                // I will add it to the backend quickly or just filter on client if I fetch all? 
                // Fetching all might be heavy. 
                // Let's add a proper endpoint to PurchaseRequestsController: `GET /purchase-requests/processing`
                
                // Oops, I can't edit backend easily without restart/build cycle.
                // Let's try to reuse 'pending' if I can, but 'pending' checks managerId.
                // I will update backend to include `GET /purchase-requests/in-progress` for Buyers.
                
                // Creating the endpoint in the File Write below.
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://162.215.222.208:4000'}/purchase-requests/buyer/pending`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                if(res.ok) setRequests(await res.json())
            } catch { toast.error("Erro ao carregar requisições") }
            finally { setLoading(false) }
        }
        fetchRequests()
    }, [])

    return (
        <div className="flex flex-1 flex-col gap-4 p-4">
             <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Gestão de Cotações</h1>
                    <p className="text-muted-foreground">Selecione uma requisição aprovada para iniciar ou gerenciar cotações.</p>
                </div>
            </div>

            <div className="grid gap-4">
                {requests.map(req => (
                    <Card key={req.id} className="cursor-pointer hover:border-primary/50 transition-all" onClick={() => router.push(`/dashboard/compras/cotacoes/${req.id}`)}>
                         <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-base font-medium">
                                #{req.code} - {req.justification}
                            </CardTitle>
                            <Badge variant={req.status === 'APPROVED' ? 'default' : 'secondary'}>
                                {req.status === 'APPROVED' ? 'Aprovado / Aguardando Cotação' : 'Em Cotação'}
                            </Badge>
                        </CardHeader>
                        <CardContent>
                            <div className="flex justify-between items-center text-sm text-muted-foreground mt-2">
                                <div>
                                    Solicitante: <span className="font-medium text-foreground">{req.requester.user.name}</span> ({req.department.name})
                                </div>
                                <div className="flex items-center gap-2">
                                    {format(new Date(req.createdAt), "dd/MM/yyyy")}
                                    <ArrowRight className="h-4 w-4"/>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {!loading && requests.length === 0 && <div className="text-center py-10 text-muted-foreground">Nenhuma requisição aguardando cotação.</div>}
            </div>
        </div>
    )
}
