'use client'

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash2, Loader2, Eye, Send, FileText, CheckCircle, XCircle } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"

interface Product { id: string, name: string, unit: { symbol: string } }
interface Unit { id: string, symbol: string }

interface RequestItem {
    id?: string
    productId?: string
    description?: string
    quantity: number
    unitId?: string
    observation?: string
    productName?: string // Helper for UI
    unitSymbol?: string // Helper for UI
}

interface PurchaseRequest {
    id: string
    code: number
    status: string
    justification: string
    createdAt: string
    items: any[]
}

export default function MyRequestsPage() {
    const [requests, setRequests] = useState<PurchaseRequest[]>([])
    const [loading, setLoading] = useState(true)

    // Form
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [formLoading, setFormLoading] = useState(false)
    
    // Catalogs
    const [products, setProducts] = useState<Product[]>([])
    const [units, setUnits] = useState<Unit[]>([])

    // New Request State
    const [justification, setJustification] = useState("")
    const [observation, setObservation] = useState("")
    const [items, setItems] = useState<RequestItem[]>([])

    const fetchData = async () => {
        try {
            setLoading(true)
            const token = localStorage.getItem('token')
            const headers = { 'Authorization': `Bearer ${token}` }
            const [reqRes, prodRes, unitRes] = await Promise.all([
                fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://162.215.222.208:4000'}/purchase-requests/my`, { headers }),
                fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://162.215.222.208:4000'}/products`, { headers }),
                fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://162.215.222.208:4000'}/products/units/all`, { headers })
            ])
            if(reqRes.ok) setRequests(await reqRes.json())
            if(prodRes.ok) setProducts(await prodRes.json())
            if(unitRes.ok) setUnits(await unitRes.json())
        } catch { toast.error("Erro ao carregar dados") }
        finally { setLoading(false) }
    }

    useEffect(() => { fetchData() }, [])

    const handleAddItem = () => {
        setItems([...items, { quantity: 1 }])
    }

    const handleRemoveItem = (index: number) => {
        const newItems = [...items]
        newItems.splice(index, 1)
        setItems(newItems)
    }

    const updateItem = (index: number, field: keyof RequestItem, value: any) => {
        const newItems = [...items]
        newItems[index] = { ...newItems[index], [field]: value }
        
        // Auto-set unit if product selected
        if(field === 'productId') {
            const p = products.find(prod => prod.id === value)
            if(p) {
                newItems[index].productName = p.name
                newItems[index].unitSymbol = p.unit.symbol
            }
        }
        setItems(newItems)
    }

    const handleSubmit = async () => {
        if(!justification) return toast.error("Justificativa obrigatória")
        if(items.length === 0) return toast.error("Adicione pelo menos um item")

        setFormLoading(true)
        try {
            const token = localStorage.getItem('token')
            const payload = {
                justification,
                observation,
                items: items.map(i => ({
                    productId: i.productId,
                    description: i.description,
                    quantity: Number(i.quantity),
                    unitId: i.unitId,
                    observation: i.observation
                }))
            }

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://162.215.222.208:4000'}/purchase-requests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            })

            if(!res.ok) throw new Error()
            
            toast.success("Pedido criado (Rascunho)")
            setIsFormOpen(false)
            fetchData()
            resetForm()
        } catch { toast.error("Erro ao criar pedido") }
        finally { setFormLoading(false) }
    }

    const handleSubmitRequest = async (id: string) => {
        if(!confirm("Enviar pedido para aprovação?")) return
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://162.215.222.208:4000'}/purchase-requests/${id}/submit`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if(!res.ok) throw new Error()
            toast.success("Pedido enviado para aprovação")
            fetchData()
        } catch { toast.error("Erro ao enviar pedido") }
    }

    const resetForm = () => {
        setJustification(""); setObservation(""); setItems([])
    }

    const getStatusBadge = (status: string) => {
        switch(status) {
            case 'DRAFT': return <Badge variant="secondary">Rascunho</Badge>
            case 'PENDING': return <Badge className="bg-yellow-500 hover:bg-yellow-600">Aprovação</Badge>
            case 'APPROVED': return <Badge className="bg-green-500 hover:bg-green-600">Aprovado</Badge>
            case 'REJECTED': return <Badge variant="destructive">Reprovado</Badge>
            case 'IN_QUOTATION': return <Badge className="bg-blue-500">Em Cotação</Badge>
            default: return <Badge variant="outline">{status}</Badge>
        }
    }

    return (
        <div className="flex flex-1 flex-col gap-4 p-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Meus Pedidos de Compra</h1>
                    <p className="text-muted-foreground">Crie e acompanhe suas solicitações.</p>
                </div>
                <Button onClick={() => { resetForm(); setIsFormOpen(true) }} className="gap-2">
                    <Plus className="h-4 w-4"/> Novo Pedido
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {requests.map(req => (
                    <Card key={req.id} className="relative hover:border-primary/50 transition-all">
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <CardTitle className="flex items-center gap-2">
                                        Pedido #{req.code}
                                        {getStatusBadge(req.status)}
                                    </CardTitle>
                                    <span className="text-xs text-muted-foreground">{format(new Date(req.createdAt), "dd/MM/yyyy HH:mm")}</span>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2 text-sm">
                                <div><span className="font-medium">Justificativa:</span> {req.justification}</div>
                                <div><span className="font-medium">Itens:</span> {req.items.length}</div>
                            </div>
                            {req.status === 'DRAFT' && (
                                <div className="mt-4 flex gap-2">
                                    <Button size="sm" className="w-full gap-2" variant="default" onClick={() => handleSubmitRequest(req.id)}>
                                        <Send className="h-3.5 w-3.5"/> Enviar
                                    </Button>
                                    {/* Edit button could go here */}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
                {!loading && requests.length === 0 && <div className="col-span-full text-center text-muted-foreground py-10">Nenhum pedido encontrado.</div>}
            </div>

            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
                    <DialogHeader className="p-6 pb-2 border-b bg-muted/40">
                        <DialogTitle>Novo Pedido de Compra</DialogTitle>
                    </DialogHeader>
                    
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label>Justificativa do Pedido <span className="text-red-500">*</span></Label>
                                <Input value={justification} onChange={e => setJustification(e.target.value)} placeholder="Ex: Reposição de estoque de escritório" />
                            </div>
                            <div className="grid gap-2">
                                <Label>Observações Gerais</Label>
                                <Textarea value={observation} onChange={e => setObservation(e.target.value)} placeholder="Instruções adicionais..." />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between border-b pb-2">
                                <h3 className="font-medium">Itens do Pedido</h3>
                                <Button variant="outline" size="sm" onClick={handleAddItem}><Plus className="h-4 w-4 mr-2"/> Adicionar Item</Button>
                            </div>

                            {items.map((item, idx) => (
                                <div key={idx} className="grid gap-4 p-4 border rounded-lg bg-muted/10 relative">
                                    <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-red-500 h-6 w-6" onClick={() => handleRemoveItem(idx)}>
                                        <Trash2 className="h-4 w-4"/>
                                    </Button>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label>Produto (Catálogo)</Label>
                                            <Select value={item.productId} onValueChange={(v) => updateItem(idx, 'productId', v)}>
                                                <SelectTrigger><SelectValue placeholder="Selecione um produto..." /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="custom">-- Outro / Não Cadastrado --</SelectItem>
                                                    {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        {(!item.productId || item.productId === 'custom') && (
                                            <div className="grid gap-2">
                                                <Label>Descrição do Item</Label>
                                                <Input value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} placeholder="Descreva o produto..." />
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="grid gap-2">
                                            <Label>Quantidade</Label>
                                            <Input type="number" min="0" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>Unidade</Label>
                                            <Select value={item.unitId} onValueChange={(v) => updateItem(idx, 'unitId', v)} disabled={!!item.productId && item.productId !== 'custom'}>
                                                <SelectTrigger><SelectValue placeholder={item.unitSymbol || "Unid."} /></SelectTrigger>
                                                <SelectContent>
                                                    {units.map(u => <SelectItem key={u.id} value={u.id}>{u.symbol}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>Obs. Item</Label>
                                            <Input value={item.observation} onChange={e => updateItem(idx, 'observation', e.target.value)} placeholder="Cor, tamanho..." />
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {items.length === 0 && <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">Nenhum item adicionado.</div>}
                        </div>
                    </div>

                    <DialogFooter className="p-6 pt-2 border-t bg-muted/40">
                        <Button variant="ghost" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSubmit} disabled={formLoading}>
                            {formLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Salvar Rascunho
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
