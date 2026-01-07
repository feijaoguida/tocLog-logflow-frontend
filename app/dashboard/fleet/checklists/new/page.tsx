'use client'

import { useState, useEffect } from "react"
import { useAuth } from "@/context/auth-context"
import { Vehicle } from "@/types/fleet"
import { api } from "@/lib/api"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle2, ChevronRight, AlertTriangle, Truck } from "lucide-react"

export default function NewChecklistPage() {
    const { token } = useAuth()
    const router = useRouter()
    const searchParams = useSearchParams()
    
    // Step Control
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)

    // Data Selection
    const [vehicles, setVehicles] = useState<Vehicle[]>([])
    const [selectedVehicleId, setSelectedVehicleId] = useState<string>(searchParams.get('vehicleId') || '')
    const [checklistType, setChecklistType] = useState<string>('DELIVERY')

    // Execution Draft
    const [executionId, setExecutionId] = useState<string | null>(null)
    const [executionData, setExecutionData] = useState<any>(null) // Holds items
    const [currentKm, setCurrentKm] = useState<number>(0)
    
    // Items State
    const [itemsStatus, setItemsStatus] = useState<Record<string, string>>({}) // itemId -> status
    const [observations, setObservations] = useState('')

    // Fetch Vehicles
    useEffect(() => {
        if(!token) return
        api.get('/fleet/vehicles').then(res => setVehicles(res.data)).catch(console.error)
    }, [token])

    // Step 1: Start Checklist (Create Draft)
    const handleStart = async () => {
         setLoading(true)
         try {
             const res = await api.post('/fleet/checklists/start', {
                 vehicleId: selectedVehicleId,
                 type: checklistType,
             })
             setExecutionId(res.data.id)
             setExecutionData(res.data)
             
             // Initialize items map
             const initialStatus: Record<string, string> = {}
             res.data.items.forEach((item: any) => {
                 initialStatus[item.itemId] = 'OK' // item.itemId here is probably execution item ID or ref. 
                 // Backend service:
                 // create: template.items.map(item => ({ itemId: item.id ... }))
                 // Response includes { id: "exec_item_id", itemId: "tmpl_item_id", name: "...", status: "OK" }
                 // We need to submit "items: [{ itemId: ..., status: ... }]"
                 // Service logic: "Try to find by ID (if DTO has execution item ID) ... checklistExecutionItem.updateMany ... where itemId: item.itemId"
                 // My service logic was ambiguous. It tries to match `itemId` from DTO to... `itemId` column in ExecItem? Or `id` column?
                 // "Matching template item ref? Or ID."
                 // Let's use the `checklistExecutionItem.itemId` (Template Item ID) as the key if that's what backend expects, 
                 // OR `id` (Unique Execution Item ID) if backend was `where: { id: item.itemId }`.
                 // Looking at Service again: `updateMany ... where: { checklistId: id, itemId: item.itemId }`.
                 // `itemId` in schema is the relation to Template Item.
                 // So we should send the Template Item ID.
                 
                 initialStatus[item.itemId] = 'OK' 
             })
             setItemsStatus(initialStatus)
             setCurrentKm(res.data.km)

             setStep(2)
         } catch (error: any) {
             alert(error.response?.data?.message || 'Erro ao iniciar checklist')
         } finally {
             setLoading(false)
         }
    }

    // Submit
    const handleSubmit = async () => {
        if (!executionId) return
        setLoading(true)
        
        // Prepare Items
        const itemsPayload = Object.entries(itemsStatus).map(([tmplItemId, status]) => ({
            itemId: tmplItemId,
            status,
            observation: '' // TODO: Add per-item obs
        }))

        try {
            await api.post(`/fleet/checklists/${executionId}/submit`, {
                km: Number(currentKm),
                observations,
                items: itemsPayload
            })
            router.push('/dashboard/fleet/checklists')
        } catch (error: any) {
             alert(error.response?.data?.message || 'Erro ao finalizar checklist')
        } finally {
            setLoading(false)
        }
    }

    if (step === 1) {
        return (
            <div className="max-w-md mx-auto py-8 px-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Iniciar Checklist</CardTitle>
                        <CardDescription>Selecione o veículo e o tipo de inspeção.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Veículo</Label>
                            <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {vehicles.map(v => (
                                        <SelectItem key={v.id} value={v.id}>{v.plate} - {v.model}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Tipo</Label>
                             <Select value={checklistType} onValueChange={setChecklistType}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="DELIVERY">Saída / Entrega</SelectItem>
                                    <SelectItem value="RECEIVEMENT">Retorno / Recebimento</SelectItem>
                                    <SelectItem value="MAINTENANCE_EXIT">Saída p/ Manutenção</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full" onClick={handleStart} disabled={!selectedVehicleId || loading}>
                            {loading ? 'Iniciando...' : 'Iniciar Inspeção'} <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        )
    }

    return (
        <div className="max-w-lg mx-auto py-8 px-4 space-y-6">
             <div className="flex items-center justify-between">
                 <div>
                    <h2 className="text-xl font-bold">Checklist em Andamento</h2>
                    <p className="text-sm text-muted-foreground">{executionData?.vehicle?.plate} • {checklistType}</p>
                 </div>
                 <Badge variant="outline" className="h-8">Passo 2 de 2</Badge>
             </div>

             <Card>
                 <CardHeader>
                     <CardTitle>Atualização de KM</CardTitle>
                 </CardHeader>
                 <CardContent>
                     <div className="space-y-2">
                         <Label>Quilometragem Atual</Label>
                         <Input 
                            type="number" 
                            value={currentKm} 
                            onChange={(e) => setCurrentKm(Number(e.target.value))} 
                         />
                         <p className="text-xs text-muted-foreground">Anterior: {executionData?.km}</p>
                     </div>
                 </CardContent>
             </Card>

             <Card>
                 <CardHeader>
                     <CardTitle>Itens de Inspeção</CardTitle>
                 </CardHeader>
                 <CardContent className="space-y-6">
                     {executionData?.items?.map((item: any) => (
                         <div key={item.id} className="flex items-center justify-between border-b pb-4 last:pb-0 last:border-0">
                             <div className="grid gap-1">
                                 <span className="font-medium">{item.name}</span>
                                 <span className="text-xs text-muted-foreground">Categoria: Geral</span>
                             </div>
                             <div className="flex gap-2">
                                 {/* Status Toggles */}
                                 <Button 
                                    size="sm" 
                                    variant={itemsStatus[item.itemId] === 'OK' ? 'default' : 'outline'}
                                    className={itemsStatus[item.itemId] === 'OK' ? 'bg-green-600 hover:bg-green-700' : ''}
                                    onClick={() => setItemsStatus(prev => ({ ...prev, [item.itemId]: 'OK' }))}
                                 >
                                     OK
                                 </Button>
                                 <Button 
                                    size="sm" 
                                    variant={itemsStatus[item.itemId] === 'NOK' ? 'destructive' : 'outline'}
                                    onClick={() => setItemsStatus(prev => ({ ...prev, [item.itemId]: 'NOK' }))}
                                 >
                                     <AlertTriangle className="h-4 w-4" />
                                 </Button>
                             </div>
                         </div>
                     ))}
                 </CardContent>
             </Card>

             <Card>
                 <CardHeader>
                     <CardTitle>Observações Finais</CardTitle>
                 </CardHeader>
                 <CardContent>
                     <Textarea 
                        placeholder="Alguma avaria ou observação importante?" 
                        value={observations}
                        onChange={(e) => setObservations(e.target.value)}
                     />
                 </CardContent>
                 <CardFooter>
                     <Button className="w-full" size="lg" onClick={handleSubmit} disabled={loading}>
                         {loading ? 'Finalizando...' : 'Finalizar Checklist'} <CheckCircle2 className="ml-2 h-4 w-4" />
                     </Button>
                 </CardFooter>
             </Card>
        </div>
    )
}

function Badge({ children, variant, className }: any) {
    return <div className={`badge ${className}`}>{children}</div>
}
