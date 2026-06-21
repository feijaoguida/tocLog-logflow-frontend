'use client'

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Loader2, Printer } from "lucide-react"
import { api } from "@/lib/api"
import { PurchaseRequestTimeline } from "@/components/dashboard/widgets/PurchaseRequestTimeline"
import { Separator } from "@/components/ui/separator"
import { format } from "date-fns"

import { QuotationsList } from "@/components/dashboard/widgets/QuotationsList"
import { QuotationForm } from "@/components/dashboard/widgets/QuotationForm"
import { toast } from "sonner"

export default function RequestDetailsPage() {
    const params = useParams()
    const router = useRouter()
    const [req, setReq] = useState<any>(null)
    const [quotations, setQuotations] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    // Quotation Form State
    const [isQuoteFormOpen, setIsQuoteFormOpen] = useState(false)
    const [editingQuote, setEditingQuote] = useState<any>(null)

    useEffect(() => {
        if(params.id) {
            fetchDetails()
            fetchQuotations()
        }
    }, [params.id])

    const fetchDetails = async () => {
        try {
            const { data } = await api.get(`/purchase-requests/${params.id}`)
            setReq(data)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const fetchQuotations = async () => {
        try {
            const { data } = await api.get(`/quotations/request/${params.id}`)
            setQuotations(data)
        } catch {}
    }

    const handleSetWinner = async (quoteId: string) => {
        if(!confirm("Confirmar esta cotação como vencedora?")) return
        try {
            await api.patch(`/quotations/${quoteId}/win`)
            toast.success("Cotação aprovada!")
            fetchQuotations()
            fetchDetails() // Refresh status
        } catch { toast.error("Erro ao aprovar cotação") }
    }

    const handleGenerateOrder = async (quoteId: string) => {
        if(!confirm("Gerar Ordem de Compra para esta cotação?")) return
        try {
             await api.post(`/purchase-orders/generate/${quoteId}`)
             toast.success("Ordem de Compra gerada!")
             router.push('/dashboard/compras/ordens') // Redirect to orders list
        } catch { toast.error("Erro ao gerar ordem") }
    }

    if(loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin h-8 w-8 text-primary"/></div>
    if(!req) return <div>Requisição não encontrada</div>

    return (
        <div className="container mx-auto py-6 max-w-5xl space-y-6">
            <Button variant="ghost" onClick={() => router.back()} className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4"/> Voltar
            </Button>

            <div className="flex items-start justify-between">
                <div>
                   <h1 className="text-3xl font-bold tracking-tight mb-2">Requisição #{req.code}</h1> 
                   <div className="flex items-center gap-3">
                        <span className="text-muted-foreground">Criado em {format(new Date(req.createdAt), "dd/MM/yyyy HH:mm")} por {req.requester?.user?.name || "N/A"}</span>
                   </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline"><Printer className="mr-2 h-4 w-4"/> Imprimir</Button>
                </div>
            </div>

            {/* TIMELINE */}
            <Card>
                <CardContent>
                    <PurchaseRequestTimeline 
                        status={req.status} 
                        createdAt={req.createdAt}
                        approvalDate={req.approvalDate}
                        rejectedDate={req.updatedAt} 
                    />
                </CardContent>
            </Card>

            {/* QUOTATIONS SECTION (Only if approved or further) */}
            {['PENDING', 'APPROVED', 'IN_QUOTATION', 'ORDERED', 'COMPLETED'].includes(req.status) && (
                <div className="space-y-4">
                    <QuotationsList 
                        quotations={quotations}
                        requestId={req.id}
                        isRequestApproved={req.status !== 'PENDING' && req.status !== 'REJECTED' && req.status !== 'DRAFT'} 
                        onAddClick={() => { setEditingQuote(null); setIsQuoteFormOpen(true) }}
                        onEditClick={(q) => { setEditingQuote(q); setIsQuoteFormOpen(true) }}
                        onSetWinner={handleSetWinner}
                        onGenerateOrder={handleGenerateOrder}
                    />
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* LEFT COL: Items & Justification */}
                <div className="md:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Itens Solicitados</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="divide-y">
                                {req.items.map((item: any) => (
                                    <div key={item.id} className="py-4 flex justify-between items-start">
                                        <div>
                                            <p className="font-medium text-lg">{item.product?.name || item.description}</p>
                                            <p className="text-sm text-muted-foreground">{item.observation}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold">{item.quantity} {item.unit?.symbol || "unid"}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Detalhes</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <h4 className="font-medium mb-1">Justificativa</h4>
                                <p className="text-muted-foreground">{req.justification}</p>
                            </div>
                            {req.observation && (
                                <div>
                                    <h4 className="font-medium mb-1">Observações</h4>
                                    <p className="text-muted-foreground">{req.observation}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* RIGHT COL: Status & Info */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Status</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span>Situação Atual</span>
                                <Badge>{req.status}</Badge>
                            </div>
                            <Separator />
                            <div className="text-sm space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Valor Estimado</span>
                                    <span className="font-medium">R$ {Number(req.estimatedTotal || 0).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Departamento</span>
                                    <span>{req.department?.name}</span>
                                </div>
                            </div>
                            
                            {req.approvedBy && (
                                <div className="bg-green-50 p-3 rounded-md text-sm text-green-800 border border-green-200 mt-4">
                                    <p className="font-medium">Aprovado por:</p>
                                    <p>{req.approvedBy.user?.name}</p>
                                    <p className="text-xs mt-1">{format(new Date(req.approvalDate), "dd/MM/yyyy")}</p>
                                </div>
                            )}

                            {req.status === 'REJECTED' && req.rejectionReason && (
                                <div className="bg-red-50 p-3 rounded-md text-sm text-red-800 border border-red-200 mt-4">
                                    <p className="font-medium">Motivo da Reprovação:</p>
                                    <p>{req.rejectionReason}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
            {/* FORM DIALOG */}
            <QuotationForm 
                open={isQuoteFormOpen} 
                onOpenChange={setIsQuoteFormOpen}
                requestId={req.id}
                requestItems={req.items}
                quotationId={editingQuote?.id}
                onSuccess={() => { fetchQuotations(); fetchDetails() }}
            />
        </div>
    )
}
