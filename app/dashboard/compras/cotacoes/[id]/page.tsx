'use client'

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Plus, DollarSign, Trophy, FileCheck, ShoppingCart } from "lucide-react"
import { toast } from "sonner"
import { useParams, useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"

interface RequestItem {
    id: string
    quantity: number
    description: string
    product?: { name: string }
    unit: { symbol: string }
}

interface QuotationItem {
    id: string
    price: number
    deliveryTime?: string
    paymentConditions?: string
    requestItem: RequestItem
}

interface Quotation {
    id: string
    supplier: { id: string, name: string }
    status: string
    totalValue: number
    items: QuotationItem[]
}

interface PurchaseRequest {
    id: string
    code: number
    justification: string
    status: string
    items: RequestItem[]
}

export default function QuotationDetailPage() {
    const params = useParams()
    const router = useRouter()
    const requestId = params.id as string

    const [request, setRequest] = useState<PurchaseRequest | null>(null)
    const [quotations, setQuotations] = useState<Quotation[]>([])
    const [suppliers, setSuppliers] = useState<{id: string, name: string}[]>([])
    
    // UI States
    const [loading, setLoading] = useState(true)
    const [isAddOpen, setIsAddOpen] = useState(false)
    const [selectedSupplierId, setSelectedSupplierId] = useState("")
    const [createLoading, setCreateLoading] = useState(false)

    // Edit State
    const [isEditOpen, setIsEditOpen] = useState(false)
    const [editingQuote, setEditingQuote] = useState<Quotation | null>(null)
    const [editItems, setEditItems] = useState<{id: string, price: number, deliveryTime: string, paymentConditions: string}[]>([])
    const [savingQuote, setSavingQuote] = useState(false)

    const fetchData = async () => {
        try {
            setLoading(true)
            
            const [reqRes, quoteRes, supRes] = await Promise.all([
                api.get(`/purchase-requests/${requestId}`),
                api.get(`/quotations/request/${requestId}`),
                api.get('/suppliers')
            ])

            setRequest(reqRes.data)
            setQuotations(quoteRes.data)
            setSuppliers(supRes.data)

        } catch { toast.error("Erro ao carregar dados") }
        finally { setLoading(false) }
    }

    useEffect(() => { fetchData() }, [requestId])

    const handleCreateQuotation = async () => {
        if(!selectedSupplierId) return
        setCreateLoading(true)
        try {
            await api.post('/quotations', { requestId, supplierId: selectedSupplierId })
            toast.success("Cotação iniciada")
            setIsAddOpen(false)
            fetchData()
        } catch { toast.error("Erro ao criar cotação") }
        finally { setCreateLoading(false) }
    }

    const openEdit = (quote: Quotation) => {
        setEditingQuote(quote)
        setEditItems(quote.items.map(i => ({
            id: i.id,
            price: Number(i.price),
            deliveryTime: i.deliveryTime || "",
            paymentConditions: i.paymentConditions || ""
        })))
        setIsEditOpen(true)
    }

    const handleSaveValues = async () => {
        if (!editingQuote) return
        setSavingQuote(true)
        try {
            await api.patch(`/quotations/${editingQuote.id}`, { items: editItems })
            toast.success("Valores atualizados")
            setIsEditOpen(false)
            fetchData()
        } catch { toast.error("Erro ao atualizar valores") }
        finally { setSavingQuote(false) }
    }

    const updateEditItem = (index: number, field: string, value: any) => {
        const newItems = [...editItems]
        newItems[index] = { ...newItems[index], [field]: value }
        setEditItems(newItems)
    }

    const handleWin = async (id: string) => {
        if(!confirm("Definir esta cotação como VENCEDORA? Isso encerrará as outras.")) return
        try {
            await api.patch(`/quotations/${id}/win`)
            toast.success("Vencedor definido!")
            fetchData()
        } catch { toast.error("Erro ao definir vencedor") }
    }

    const handleGenerateOrder = async (quoteId: string) => {
        if(!confirm("Gerar Ordem de Compra agora?")) return
        try {
            await api.post(`/purchase-orders/generate/${quoteId}`)
            toast.success("Ordem de Compra Gerada!")
            router.push('/dashboard/compras/ordens')
        } catch { toast.error("Erro ao gerar ordem") }
    }

    if(loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin"/></div>
    if(!request) return <div>Requisição não encontrada</div>

    const winner = quotations.find(q => q.status === 'WON')

    return (
        <div className="flex flex-col gap-6 p-4">
             <div className="flex items-center justify-between">
                <div>
                     <Button variant="ghost" className="mb-2 pl-0 hover:bg-transparent" onClick={() => router.back()}>← Voltar</Button>
                    <h1 className="text-2xl font-bold tracking-tight">Processo de Cotação: #{request.code}</h1>
                    <p className="text-muted-foreground">{request.justification}</p>
                </div>
                {request.status !== 'ORDERED' && (
                    <Button onClick={() => setIsAddOpen(true)} className="gap-2"><Plus className="h-4 w-4"/> Adicionar Fornecedor</Button>
                )}
            </div>

            {/* Request Items Summary */}
            <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">Itens da Requisição</CardTitle></CardHeader>
                <CardContent>
                    <div className="flex gap-4 flex-wrap">
                        {request.items.map(i => (
                            <Badge key={i.id} variant="secondary" className="px-3 py-1">
                                {i.quantity}{i.unit.symbol} - {i.product?.name || i.description}
                            </Badge>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Quotations List */}
            <div className="grid grid-cols-1 gap-4">
                {quotations.map(quote => (
                    <Card key={quote.id} className={`border-l-4 ${quote.status === 'WON' ? 'border-l-green-500 bg-green-50/50' : quote.status === 'LOST' ? 'border-l-red-200 opacity-75' : 'border-l-blue-500'}`}>
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        {quote.supplier.name}
                                        {quote.status === 'WON' && <Badge className="bg-green-500"><Trophy className="h-3 w-3 mr-1"/> Vencedora</Badge>}
                                    </CardTitle>
                                    <div className="text-sm text-muted-foreground mt-1">
                                        Total: <span className="font-bold text-foreground">R$ {Number(quote.totalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {quote.status === 'OPEN' && (
                                        <>
                                            <Button size="sm" variant="outline" onClick={() => openEdit(quote)}><DollarSign className="h-4 w-4 mr-2"/> Preços</Button>
                                            <Button size="sm" variant="default" onClick={() => handleWin(quote.id)} disabled={Number(quote.totalValue) === 0}>
                                                <Trophy className="h-4 w-4 mr-2" /> Vencedor
                                            </Button>
                                        </>
                                    )}
                                    {quote.status === 'WON' && request.status !== 'ORDERED' && (
                                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => handleGenerateOrder(quote.id)}>
                                            <ShoppingCart className="h-4 w-4 mr-2"/> Gerar Ordem
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-xs text-muted-foreground grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                                {quote.items.map(qi => (
                                    <div key={qi.id} className="flex justify-between border-b pb-1">
                                        <span>{qi.requestItem.product?.name || qi.requestItem.description} ({qi.requestItem.quantity})</span>
                                        <span>R$ {Number(qi.price).toFixed(2)} / un</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {quotations.length === 0 && <div className="text-center py-12 bg-muted/10 rounded-lg border border-dashed">Nenhuma cotação iniciada. Adicione fornecedores.</div>}
            </div>

            {/* Add Supplier Dialog */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Iniciar Cotação</DialogTitle></DialogHeader>
                    <div className="py-4 space-y-4">
                        <Label>Selecione o Fornecedor</Label>
                        <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                            <SelectContent>
                                {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsAddOpen(false)}>Cancelar</Button>
                        <Button onClick={handleCreateQuotation} disabled={createLoading}>
                            {createLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Iniciar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Prices Dialog */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader><DialogTitle>Inserir Valores - {editingQuote?.supplier.name}</DialogTitle></DialogHeader>
                    <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                         {editItems.map((item, idx) => {
                             const originalItem = editingQuote?.items.find(i => i.id === item.id)
                             const prodName = originalItem?.requestItem.product?.name || originalItem?.requestItem.description
                             const qty = originalItem?.requestItem.quantity
                             
                             return (
                                 <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end border-b pb-4">
                                     <div className="md:col-span-4">
                                         <Label className="text-xs">{qty}x {prodName}</Label>
                                         <Input type="number" step="0.01" placeholder="Preço Unit." value={item.price} onChange={e => updateEditItem(idx, 'price', e.target.value)} />
                                     </div>
                                     <div className="md:col-span-4">
                                         <Label className="text-xs">Prazo Entrega</Label>
                                         <Input placeholder="Ex: 5 dias" value={item.deliveryTime} onChange={e => updateEditItem(idx, 'deliveryTime', e.target.value)} />
                                     </div>
                                     <div className="md:col-span-4">
                                         <Label className="text-xs">Pagamento</Label>
                                         <Input placeholder="Ex: 30 dias" value={item.paymentConditions} onChange={e => updateEditItem(idx, 'paymentConditions', e.target.value)} />
                                     </div>
                                 </div>
                             )
                         })}
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSaveValues} disabled={savingQuote}>
                            {savingQuote && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Salvar Valores
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
