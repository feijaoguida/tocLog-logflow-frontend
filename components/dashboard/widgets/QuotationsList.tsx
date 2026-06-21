
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CheckCircle, Trophy, Plus, FileText, ShoppingCart } from "lucide-react"
import { format } from "date-fns"

interface Quotation {
    id: string
    supplier: { name: string, cnpj: string }
    totalValue?: number
    validityDate?: string
    paymentTerms?: string
    freightCost?: number
    status: string
    items: any[]
}

interface QuotationsListProps {
    quotations: Quotation[]
    requestId: string
    onAddClick: () => void
    onEditClick: (quote: Quotation) => void
    onSetWinner: (quoteId: string) => void
    onGenerateOrder: (quoteId: string) => void
    isRequestApproved?: boolean // Only approved requests can have quotes logic
}

export function QuotationsList({ quotations, requestId, onAddClick, onEditClick, onSetWinner, onGenerateOrder, isRequestApproved }: QuotationsListProps) {
    if (!quotations || quotations.length === 0) {
        return (
            <div className="text-center py-10 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground mb-4">Nenhuma cotação registrada.</p>
                <Button onClick={onAddClick} disabled={!isRequestApproved}>
                    <Plus className="h-4 w-4 mr-2"/> Registrar Cotação
                </Button>
            </div>
        )
    }

    // Comparison View (can be toggled, but for MVP standard table is fine)
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Propostas Recebidas ({quotations.length})</h3>
                <Button size="sm" onClick={onAddClick} disabled={!isRequestApproved} variant="outline">
                    <Plus className="h-4 w-4 mr-2"/> Nova Cotação
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {quotations.map(quote => (
                    <Card key={quote.id} className={`relative ${quote.status === 'WON' ? 'border-green-500 bg-green-50/30' : ''}`}>
                        {quote.status === 'WON' && (
                            <div className="absolute top-2 right-2 text-green-600">
                                <Trophy className="h-5 w-5"/>
                            </div>
                        )}
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base truncate">{quote.supplier.name}</CardTitle>
                            <p className="text-xs text-muted-foreground">CNPJ: {quote.supplier.cnpj}</p>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="text-2xl font-bold">R$ {Number(quote.totalValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                            
                            <div className="space-y-1 text-sm text-muted-foreground">
                                <div className="flex justify-between"><span>Frete:</span> <span>R$ {Number(quote.freightCost || 0).toFixed(2)}</span></div>
                                <div className="flex justify-between"><span>Pagamento:</span> <span>{quote.paymentTerms || "N/A"}</span></div>
                                <div className="flex justify-between"><span>Validade:</span> <span>{quote.validityDate ? format(new Date(quote.validityDate), 'dd/MM/yyyy') : "N/A"}</span></div>
                            </div>
                            
                            <div className="flex flex-col gap-2 pt-2">
                                <Button variant="outline" size="sm" onClick={() => onEditClick(quote)}>
                                    <FileText className="h-4 w-4 mr-2"/> Ver Detalhes
                                </Button>
                                
                                {quote.status === 'PENDING' && (
                                    <Button variant="default" size="sm" className="w-full bg-green-600 hover:bg-green-700" onClick={() => onSetWinner(quote.id)}>
                                        <CheckCircle className="h-4 w-4 mr-2"/> Aprovar esta Cotação
                                    </Button>
                                )}

                                {quote.status === 'WON' && (
                                     <Button variant="default" size="sm" className="w-full" onClick={() => onGenerateOrder(quote.id)}>
                                        <ShoppingCart className="h-4 w-4 mr-2"/> Gerar Ordem de Compra
                                     </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
