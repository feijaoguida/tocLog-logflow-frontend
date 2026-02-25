'use client'

// [IMPORTS START]
import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash2, Loader2, Eye, Send, FileText, PackagePlus, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { api } from "@/lib/api"
// [IMPORTS END]

interface Product { id: string, name: string, unit: { id: string, symbol: string } }
interface Category { id: string, name: string }
interface Unit { id: string, symbol: string, name: string }

interface RequestItem {
    id?: string
    productId?: string
    description?: string
    quantity: number
    unitId?: string
    observation?: string
    productName?: string 
    unitSymbol?: string 
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
    const [categories, setCategories] = useState<Category[]>([])

    // New Request State
    const [justification, setJustification] = useState("")
    const [observation, setObservation] = useState("")
    const [items, setItems] = useState<RequestItem[]>([])

    // Quick Product State
    const [isQuickProdOpen, setIsQuickProdOpen] = useState(false)
    const [qpName, setQpName] = useState("")
    const [qpCategory, setQpCategory] = useState("")
    const [qpUnit, setQpUnit] = useState("")
    const [qpLoading, setQpLoading] = useState(false)

    const fetchData = async () => {
        try {
            setLoading(true)
            const [reqRes, prodRes, unitRes, catRes] = await Promise.all([
                api.get('/purchase-requests/my'),
                api.get('/products'),
                api.get('/products/units/all'),
                api.get('/products/categories/all')
            ])
            
            setRequests(reqRes.data)
            setProducts(prodRes.data)
            setUnits(unitRes.data)
            setCategories(catRes.data)
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
                newItems[index].unitId = p.unit.id // Auto-select unit
            }
        }
        setItems(newItems)
    }

    const [editingId, setEditingId] = useState<string | null>(null)

    const handleEdit = (request: PurchaseRequest) => {
        setEditingId(request.id)
        setJustification(request.justification)
        // @ts-ignore
        setObservation(request.observation || "") 
        setItems(request.items.map(i => ({
            id: i.id,
            productId: i.productId,
            quantity: i.quantity,
            description: i.description,
            unitId: i.unitId,
            observation: i.observation,
            productName: i.product?.name,
            unitSymbol: i.unit?.symbol
        })))
        setIsFormOpen(true)
    }

    const handleSubmit = async () => {
        if(!justification) return toast.error("Justificativa obrigatória")
        if(items.length === 0) return toast.error("Adicione pelo menos um item")

        setFormLoading(true)
        try {
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

            if (editingId) {
                await api.patch(`/purchase-requests/${editingId}`, payload)
                toast.success("Pedido atualizado")
            } else {
                await api.post('/purchase-requests', payload)
                toast.success("Pedido criado (Rascunho)")
            }
            
            setIsFormOpen(false)
            fetchData()
            resetForm()
        } catch { toast.error("Erro ao salvar pedido") }
        finally { setFormLoading(false) }
    }

    const handleSubmitRequest = async (id: string) => {
        if(!confirm("Enviar pedido para aprovação?")) return
        try {
            await api.patch(`/purchase-requests/${id}/submit`)
            toast.success("Pedido enviado para aprovação")
            fetchData()
        } catch { toast.error("Erro ao enviar pedido") }
    }

    const handleQuickProduct = async () => {
        if(!qpName || !qpCategory || !qpUnit) return toast.error("Preencha todos os campos")
        setQpLoading(true)
        try {
            // Create Product
            const { data } = await api.post('/products', {
                name: qpName,
                description: "Cadastro Rápido via Pedido",
                categoryId: qpCategory,
                unitId: qpUnit
            })
            
            toast.success("Produto cadastrado!")
            
            // Refresh products
            const prodRes = await api.get('/products')
            setProducts(prodRes.data)
            
            // Auto-select in last adding item if possible
            // ... (optional logic)

            setIsQuickProdOpen(false)
            setQpName(""); setQpCategory(""); setQpUnit("")

        } catch { toast.error("Erro ao criar produto") }
        finally { setQpLoading(false) }
    }

    const resetForm = () => {
        setEditingId(null)
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
                    <Card key={req.id} className="relative hover:border-primary/50 transition-all flex flex-col">
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
                        <CardContent className="flex-1">
                            <div className="space-y-2 text-sm">
                                <div className="line-clamp-2"><span className="font-medium">Justificativa:</span> {req.justification}</div>
                                <div><span className="font-medium">Itens:</span> {req.items.length}</div>
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-col gap-2 pt-2 border-t">
                             <Link href={`/dashboard/compras/pedidos/${req.id}`} className="w-full">
                                <Button size="sm" variant="outline" className="w-full">
                                    <Eye className="h-3.5 w-3.5 mr-2"/> Detalhes
                                </Button>
                             </Link>
                             {req.status === 'DRAFT' && (
                                <div className="flex gap-2 w-full">
                                    <Button size="sm" className="flex-1 gap-2" variant="default" onClick={() => handleSubmitRequest(req.id)}>
                                        <Send className="h-3.5 w-3.5"/> Enviar
                                    </Button>
                                    <Button size="sm" variant="ghost" className="flex-1" onClick={(e) => { e.preventDefault(); handleEdit(req) }}>
                                        <FileText className="h-3.5 w-3.5 mr-2"/> Editar
                                    </Button>
                                </div>
                             )}
                        </CardFooter>
                    </Card>
                ))}
                {!loading && requests.length === 0 && <div className="col-span-full text-center text-muted-foreground py-10">Nenhum pedido encontrado.</div>}
            </div>

            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="max-w-7xl max-h-[90vh] flex flex-col p-0 bg-background">
                    <DialogHeader className="p-6 pb-2 border-b bg-muted/40">
                        <DialogTitle>{editingId ? 'Editar Pedido' : 'Novo Pedido de Compra'}</DialogTitle>
                    </DialogHeader>
                    
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {/* Header Inputs */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="grid gap-2">
                                <Label>Justificativa do Pedido <span className="text-red-500">*</span></Label>
                                <Input value={justification} onChange={e => setJustification(e.target.value)} placeholder="Ex: Reposição de estoque de escritório" />
                            </div>
                            <div className="grid gap-2">
                                <Label>Observações Gerais</Label>
                                <Input value={observation} onChange={e => setObservation(e.target.value)} placeholder="Instruções adicionais..." />
                            </div>
                        </div>

                        {/* Items Section */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between border-b pb-2">
                                <h3 className="font-medium">Itens do Pedido ({items.length})</h3>
                                <div className="flex gap-2">
                                    <Button variant="secondary" size="sm" onClick={() => setIsQuickProdOpen(true)}>
                                        <PackagePlus className="h-4 w-4 mr-2"/> Cadastrar Produto
                                    </Button>
                                    <Button variant="default" size="sm" onClick={handleAddItem}>
                                        <Plus className="h-4 w-4 mr-2"/> Adicionar Item
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                {/* Table Headerish */}
                                {items.length > 0 && (
                                    <div className="hidden md:flex gap-4 text-xs font-medium text-muted-foreground px-4">
                                        <div className="flex-[3]">Produto / Descrição</div>
                                        <div className="w-24">Qtd.</div>
                                        <div className="w-32">Unidade</div>
                                        <div className="flex-[2]">Observação</div>
                                        <div className="w-10"></div>
                                    </div>
                                )}

                                {items.map((item, idx) => (
                                    <div key={idx} className="flex flex-col md:flex-row gap-2 md:gap-4 p-4 border rounded-lg bg-muted/10 items-end md:items-center">
                                        
                                        {/* Product / Description */}
                                        <div className="flex-1 w-full md:w-auto grid gap-2">
                                            <div className="md:hidden text-xs text-muted-foreground">Produto</div>
                                            <div className="flex gap-2">
                                                 <Select value={item.productId} onValueChange={(v) => updateItem(idx, 'productId', v)}>
                                                    <SelectTrigger className="flex-1 min-w-[200px]"><SelectValue placeholder="Selecione um produto..." /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="custom">-- Outro / Não Cadastrado --</SelectItem>
                                                        {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            {(!item.productId || item.productId === 'custom') && (
                                                <Input className="mt-1" value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} placeholder="Descreva o produto..." />
                                            )}
                                        </div>

                                        {/* Qty */}
                                        <div className="w-full md:w-24 grid gap-2">
                                            <div className="md:hidden text-xs text-muted-foreground">Qtd.</div>
                                            <Input type="number" min="0" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} />
                                        </div>

                                        {/* Unit */}
                                        <div className="w-full md:w-32 grid gap-2">
                                            <div className="md:hidden text-xs text-muted-foreground">Unid.</div>
                                            <Select value={item.unitId} onValueChange={(v) => updateItem(idx, 'unitId', v)} disabled={!!item.productId && item.productId !== 'custom'}>
                                                <SelectTrigger><SelectValue placeholder={item.unitSymbol || "Unid."} /></SelectTrigger>
                                                <SelectContent>
                                                    {units.map(u => <SelectItem key={u.id} value={u.id}>{u.symbol}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Observation */}
                                        <div className="flex-1 w-full md:w-auto grid gap-2">
                                            <div className="md:hidden text-xs text-muted-foreground">Obs.</div>
                                            <Input value={item.observation} onChange={e => updateItem(idx, 'observation', e.target.value)} placeholder="Cor, tamanho..." />
                                        </div>

                                        {/* Delete */}
                                        <Button variant="ghost" size="icon" className="text-red-500 shrink-0" onClick={() => handleRemoveItem(idx)}>
                                            <Trash2 className="h-4 w-4"/>
                                        </Button>
                                    </div>
                                ))}
                                {items.length === 0 && <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">Nenhum item adicionado.</div>}
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="p-6 pt-2 border-t bg-muted/40 pb-6">
                        <Button variant="ghost" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSubmit} disabled={formLoading}>
                            {formLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Salvar Pedido
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* QUICK PRODUCT DIALOG */}
            <Dialog open={isQuickProdOpen} onOpenChange={setIsQuickProdOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Cadastro Rápido de Produto</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Nome do Produto</Label>
                            <Input value={qpName} onChange={e => setQpName(e.target.value)} placeholder="Ex: Cadeira" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Categoria</Label>
                                <Select value={qpCategory} onValueChange={setQpCategory}>
                                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                    <SelectContent>
                                        {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>Unidade</Label>
                                <Select value={qpUnit} onValueChange={setQpUnit}>
                                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                    <SelectContent>
                                        {units.map(u => <SelectItem key={u.id} value={u.id}>{u.symbol} - {u.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsQuickProdOpen(false)}>Cancelar</Button>
                        <Button onClick={handleQuickProduct} disabled={qpLoading}>
                            {qpLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Cadastrar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
