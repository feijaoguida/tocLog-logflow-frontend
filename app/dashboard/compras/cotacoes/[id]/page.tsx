'use client'

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Plus, DollarSign, Trophy, ShoppingCart, Ban } from "lucide-react"
import { toast } from "sonner"
import { useParams, useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"
import { getApiErrorMessage } from "@/lib/api-error"

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
    const [suppliers, setSuppliers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    // Modals
    const [isAddOpen, setIsAddOpen] = useState(false)
    const [isEditOpen, setIsEditOpen] = useState(false)
    const [selectedSupplierId, setSelectedSupplierId] = useState("")
    const [createLoading, setCreateLoading] = useState(false)

    // Edit Values State
    const [editingQuote, setEditingQuote] = useState<Quotation | null>(null)
    const [editItems, setEditItems] = useState<{ id: string, price: number, deliveryTime: string, paymentConditions: string }[]>([])
    const [savingQuote, setSavingQuote] = useState(false)

    // Confirm dialog
    const [confirmDialog, setConfirmDialog] = useState<{
        open: boolean
        title: string
        description?: string
        confirmText?: string
        variant?: 'default' | 'destructive'
        action?: () => Promise<void>
    }>({ open: false, title: '' })

    const fetchData = async () => {
        try {
            setLoading(true)
            const [reqRes, quotesRes, supRes] = await Promise.all([
                api.get(`/purchase-requests/${requestId}`),
                api.get(`/quotations/request/${requestId}`),
                api.get('/suppliers')
            ])
            setRequest(reqRes.data)
            setQuotations(quotesRes.data)
            setSuppliers(supRes.data)
        } catch (error) {
            toast.error(getApiErrorMessage(error, "Erro ao carregar dados da cotação"))
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if(requestId) fetchData()
    }, [requestId])

    const handleCreateQuotation = async () => {
        if(!selectedSupplierId) return toast.error("Selecione um fornecedor")
        setCreateLoading(true)
        try {
            await api.post('/quotations', {
                requestId,
                supplierId: selectedSupplierId
            })
            toast.success("Cotação iniciada!")
            setIsAddOpen(false)
            setSelectedSupplierId("")
            fetchData()
        } catch (error) {
            toast.error(getApiErrorMessage(error, "Erro ao criar cotação"))
        } finally {
            setCreateLoading(false)
        }
    }

    const openEditModal = (quote: Quotation) => {
        setEditingQuote(quote)
        setEditItems(quote.items.map(i => ({
            id: i.id,
            price: i.price,
            deliveryTime: i.deliveryTime || '',
            paymentConditions: i.paymentConditions || ''
        })))
        setIsEditOpen(true)
    }

    const handleSaveValues = async () => {
        if(!editingQuote) return
        setSavingQuote(true)
        try {
            await api.patch(`/quotations/${editingQuote.id}`, {
                items: editItems.map(i => ({
                    id: i.id,
                    price: Number(i.price),
                    deliveryTime: i.deliveryTime,
                    paymentConditions: i.paymentConditions
                }))
            })
            toast.success("Valores salvos!")
            setIsEditOpen(false)
            fetchData()
        } catch (error) {
            toast.error(getApiErrorMessage(error, "Erro ao salvar valores"))
        } finally {
            setSavingQuote(false)
        }
    }

    const updateEditItem = (index: number, field: string, value: any) => {
        const newItems = [...editItems]
        newItems[index] = { ...newItems[index], [field]: value }
        setEditItems(newItems)
    }

    const handleWin = (id: string) => {
        setConfirmDialog({
            open: true,
            title: 'Definir Cotação Vencedora',
            description: 'Deseja definir esta cotação como VENCEDORA? Isso encerrará as outras cotações abertas.',
            confirmText: 'Definir Vencedora',
            action: async () => {
                try {
                    await api.patch(`/quotations/${id}/win`)
                    toast.success("Vencedor definido!")
                    fetchData()
                } catch (error) {
                    toast.error(getApiErrorMessage(error, "Erro ao definir vencedor"))
                }
            }
        })
    }

    const handleGenerateOrder = (quoteId: string) => {
        setConfirmDialog({
            open: true,
            title: 'Gerar Ordem de Compra',
            description: 'Deseja emitir a Ordem de Compra para esta cotação agora?',
            confirmText: 'Gerar Ordem',
            action: async () => {
                try {
                    await api.post(`/purchase-orders/generate/${quoteId}`)
                    toast.success("Ordem de Compra Gerada!")
                    router.push('/dashboard/compras/ordens')
                } catch (error) {
                    toast.error(getApiErrorMessage(error, "Erro ao gerar ordem"))
                }
            }
        })
    }

    const handleCancelQuotation = (quoteId: string) => {
        setConfirmDialog({
            open: true,
            title: 'Cancelar Cotação',
            description: 'Deseja realmente cancelar esta cotação? Ela não poderá mais ser homologada.',
            confirmText: 'Cancelar Cotação',
            variant: 'destructive',
            action: async () => {
                try {
                    await api.delete(`/quotations/${quoteId}`)
                    toast.success("Cotação cancelada com sucesso.")
                    fetchData()
                } catch (error) {
                    toast.error(getApiErrorMessage(error, "Não foi possível cancelar a cotação."))
                }
            }
        })
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
                    <Button onClick={() => setIsAddOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" /> Nova Cotação (Fornecedor)
                    </Button>
                )}
            </div>

            {winner && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 p-4 rounded-lg flex items-center justify-between">
                    <div>
                        <h3 className="font-semibold text-lg flex items-center gap-2"><Trophy className="h-5 w-5"/> Cotação Vencedora: {winner.supplier.name}</h3>
                        <p className="text-sm opacity-90">Valor Total: R$ {Number(winner.totalValue).toFixed(2)}</p>
                    </div>
                    {request.status !== 'ORDERED' && (
                        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleGenerateOrder(winner.id)}>
                            <ShoppingCart className="mr-2 h-4 w-4"/> Gerar Ordem de Compra
                        </Button>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {quotations.map(quote => (
                    <Card key={quote.id} className={quote.status === 'WON' ? 'border-emerald-500' : quote.status === 'CANCELLED' ? 'opacity-60 border-dashed' : ''}>
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle>{quote.supplier.name}</CardTitle>
                                    <CardDescription>
                                        Status: 
                                        <Badge
                                          variant={
                                            quote.status === 'WON' ? 'default' :
                                            quote.status === 'CANCELLED' ? 'destructive' :
                                            quote.status === 'LOST' ? 'secondary' : 'outline'
                                          }
                                          className="ml-2"
                                        >
                                            {quote.status === 'PENDING' ? 'Em Preenchimento' :
                                             quote.status === 'WON' ? 'Vencedora' :
                                             quote.status === 'LOST' ? 'Perdida' :
                                             quote.status === 'CANCELLED' ? 'Cancelada' : quote.status}
                                        </Badge>
                                    </CardDescription>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-bold">R$ {Number(quote.totalValue || 0).toFixed(2)}</div>
                                </div>
                            </div>
                            <div className="flex justify-between items-center pt-2">
                                <div className="flex gap-2">
                                    {quote.status === 'PENDING' && (
                                        <>
                                            <Button size="sm" variant="outline" onClick={() => openEditModal(quote)}>
                                                <DollarSign className="h-4 w-4 mr-2" /> Inserir Preços
                                            </Button>
                                            <Button size="sm" variant="default" onClick={() => handleWin(quote.id)} disabled={Number(quote.totalValue) === 0}>
                                                <Trophy className="h-4 w-4 mr-2" /> Vencedor
                                            </Button>
                                            <Button size="sm" variant="outline" className="text-rose-600 hover:bg-rose-50" onClick={() => handleCancelQuotation(quote.id)}>
                                                <Ban className="h-4 w-4 mr-1" /> Cancelar
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

            <ConfirmDialog
                open={confirmDialog.open}
                onOpenChange={(open) => setConfirmDialog(s => ({ ...s, open }))}
                title={confirmDialog.title}
                description={confirmDialog.description}
                confirmText={confirmDialog.confirmText}
                variant={confirmDialog.variant}
                onConfirm={async () => {
                    if (confirmDialog.action) {
                        await confirmDialog.action()
                    }
                    setConfirmDialog(s => ({ ...s, open: false }))
                }}
            />
        </div>
    )
}
