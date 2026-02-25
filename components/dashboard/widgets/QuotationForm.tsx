
import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, Plus, Trash2 } from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"

interface QuotationFormProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    requestId: string
    requestItems: any[]
    quotationId?: string // If editing
    onSuccess: () => void
}

export function QuotationForm({ open, onOpenChange, requestId, requestItems, quotationId, onSuccess }: QuotationFormProps) {
    const [loading, setLoading] = useState(false)
    const [initLoading, setInitLoading] = useState(false)
    
    // Header Fields
    const [supplierId, setSupplierId] = useState("")
    const [paymentTerms, setPaymentTerms] = useState("")
    const [freightCost, setFreightCost] = useState(0)
    const [validityDate, setValidityDate] = useState("")
    
    // Items
    const [quoteItems, setQuoteItems] = useState<any[]>([])

    // Suppliers Catalog
    const [suppliers, setSuppliers] = useState<any[]>([])

    useEffect(() => {
        if(open) {
            fetchSuppliers()
            if(quotationId) loadQuotation()
            else initNew()
        }
    }, [open, quotationId])

    const fetchSuppliers = async () => {
        try {
            const { data } = await api.get('/suppliers') // Assuming this endpoint exists
            setSuppliers(data)
        } catch {}
    }

    const initNew = () => {
        setSupplierId("")
        setPaymentTerms("")
        setFreightCost(0)
        setValidityDate("")
        // Init items with 0 price based on requestItems
        setQuoteItems(requestItems.map(ri => ({
            requestItemId: ri.id,
            description: ri.product?.name || ri.description,
            quantity: ri.quantity,
            price: 0,
            discount: 0,
            brand: "",
            deliveryTime: ""
        })))
    }

    const loadQuotation = async () => {
        setInitLoading(true)
        try {
            const { data } = await api.get(`/quotations/${quotationId}`)
            setSupplierId(data.supplierId)
            setPaymentTerms(data.paymentTerms || "")
            setFreightCost(Number(data.freightCost || 0))
            setValidityDate(data.validityDate ? data.validityDate.split('T')[0] : "")
            
            // Map existing items
            setQuoteItems(data.items.map((qi: any) => ({
                id: qi.id,
                requestItemId: qi.requestItemId,
                description: qi.requestItem?.product?.name || qi.requestItem?.description,
                quantity: qi.requestItem?.quantity,
                price: Number(qi.price),
                discount: Number(qi.discount || 0),
                brand: qi.brand || "",
                deliveryTime: qi.deliveryTime || ""
            })))

        } catch { toast.error("Erro ao carregar cotação") }
        finally { setInitLoading(false) }
    }

    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...quoteItems]
        newItems[index] = { ...newItems[index], [field]: value }
        setQuoteItems(newItems)
    }

    const handleSubmit = async () => {
        if(!supplierId) return toast.error("Selecione um fornecedor")

        setLoading(true)
        try {
            // If new, create first then update values
            let qId = quotationId

            if(!qId) {
                const { data } = await api.post('/quotations', { requestId, supplierId })
                qId = data.id
            }

            // Prepare Payload for Update
            const payload = {
                freightCost: Number(freightCost),
                paymentTerms,
                validityDate: validityDate ? new Date(validityDate).toISOString() : undefined,
                items: quoteItems.map(qi => ({
                    id: qi.id, // Only for existing items? No, create returns items with IDs. 
                    // Actually, if we just created, we need to map the returned items to our form items to get the IDs.
                    // This is tricky. Ideally `create` returns the simplified structure.
                    // Simplify: create returns full obj. We find the matching item by requestItemId.
                    price: Number(qi.price),
                    discount: Number(qi.discount),
                    brand: qi.brand,
                    deliveryTime: qi.deliveryTime,
                    paymentConditions: qi.paymentConditions
                }))
            }
            
            // IF NEW, we need to get the proper Item IDs from the created quotation.
            // The logic above in `handleSubmit` for new quotes is flawed because `quoteItems` has `requestItemId` but not `quotationItemId`.
            // FIX: If new, we Create, then we use the created object to match IDs, then we Update.
            
            if (!quotationId && qId) {
                // Fetch the newly created quote to get item IDs
                 const { data: newQuote } = await api.get(`/quotations/${qId}`)
                 payload.items = newQuote.items.map((nqi: any) => {
                     // Find the form item that corresponds to this quotation item (via requestItem)
                     const formItem = quoteItems.find(fi => fi.requestItemId === nqi.requestItemId)
                     return {
                         id: nqi.id,
                         price: Number(formItem?.price || 0),
                         discount: Number(formItem?.discount || 0),
                         brand: formItem?.brand,
                         deliveryTime: formItem?.deliveryTime
                     }
                 })
            } 
            
            await api.patch(`/quotations/${qId}`, payload)
            toast.success("Cotação salva com sucesso")
            onSuccess()
            onOpenChange(false)

        } catch (e) { 
            console.error(e)
            toast.error("Erro ao salvar cotação") 
        }
        finally { setLoading(false) }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{quotationId ? 'Editar Cotação' : 'Nova Cotação de Fornecedor'}</DialogTitle>
                </DialogHeader>
                
                {initLoading ? <div className="h-40 flex items-center justify-center"><Loader2 className="animate-spin"/></div> : (
                    <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                        {/* Header */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-muted/20 rounded-lg">
                            <div className="md:col-span-2">
                                <Label>Fornecedor</Label>
                                <Select value={supplierId} onValueChange={setSupplierId} disabled={!!quotationId}>
                                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                    <SelectContent>
                                        {suppliers.length === 0 && <SelectItem value="none" disabled>Nenhum fornecedor cadastrado</SelectItem>}
                                        {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.cnpj})</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Validade da Proposta</Label>
                                <Input type="date" value={validityDate} onChange={e => setValidityDate(e.target.value)} />
                            </div>
                            <div>
                                <Label>Condições Pagto.</Label>
                                <Input placeholder="ex: 30 dias" value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} />
                            </div>
                            <div>
                                <Label>Frete (R$)</Label>
                                <Input type="number" value={freightCost} onChange={e => setFreightCost(Number(e.target.value))} />
                            </div>
                        </div>

                        {/* Items Table */}
                        <div className="border rounded-lg overflow-hidden">
                             <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Item</TableHead>
                                            <TableHead className="w-24">Qtd</TableHead>
                                            <TableHead className="w-32">Marca</TableHead>
                                            <TableHead className="w-32">Preço Unit.</TableHead>
                                            <TableHead className="w-28">Desc.</TableHead>
                                            <TableHead className="w-32">Entrada (Dias)</TableHead>
                                            <TableHead className="w-32 text-right">Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {quoteItems.map((item, idx) => {
                                            const total = (item.price * item.quantity) - item.discount
                                            return (
                                                <TableRow key={idx}>
                                                    <TableCell className="font-medium">{item.description}</TableCell>
                                                    <TableCell>{item.quantity}</TableCell>
                                                    <TableCell><Input className="h-8" placeholder="Marca" value={item.brand} onChange={e => updateItem(idx, 'brand', e.target.value)}/></TableCell>
                                                    <TableCell><Input className="h-8" type="number" placeholder="0.00" value={item.price} onChange={e => updateItem(idx, 'price', e.target.value)}/></TableCell>
                                                    <TableCell><Input className="h-8" type="number" placeholder="0.00" value={item.discount} onChange={e => updateItem(idx, 'discount', e.target.value)}/></TableCell>
                                                    <TableCell><Input className="h-8" placeholder="Dias" value={item.deliveryTime} onChange={e => updateItem(idx, 'deliveryTime', e.target.value)}/></TableCell>
                                                    <TableCell className="text-right font-bold text-green-700">R$ {(total > 0 ? total : 0).toFixed(2)}</TableCell>
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                             </Table>
                        </div>
                    </div>
                )}

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} 
                        Salvar Cotação
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
