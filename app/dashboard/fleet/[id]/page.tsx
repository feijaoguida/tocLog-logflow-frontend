'use client'

import { useState, useEffect } from "react"
import { useAuth } from "@/context/auth-context"
import { Vehicle, VehicleTimelineEvent } from "@/types/fleet"
import { useParams, useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Calendar, Gauge, Wrench, FileCheck, User } from "lucide-react"

const STATUS_MAP: Record<string, { label: string, variant: "default" | "secondary" | "destructive" | "outline" | "success" }> = {
    'AVAILABLE': { label: 'Disponível', variant: 'success' },
    'IN_USE': { label: 'Em Uso', variant: 'secondary' },
    'MAINTENANCE': { label: 'Manutenção', variant: 'destructive' },
    'BLOCKED': { label: 'Bloqueado', variant: 'destructive' },
}

interface TimelineItemProps {
    event: VehicleTimelineEvent
}

const TimelineItem = ({ event }: TimelineItemProps) => {
    const getIcon = (type: string) => {
        switch(type) {
            case 'CHECKLIST': return <FileCheck className="h-4 w-4 text-blue-500" />
            case 'MAINTENANCE': return <Wrench className="h-4 w-4 text-orange-500" />
            case 'KM_UPDATE': return <Gauge className="h-4 w-4 text-green-500" />
            case 'DRIVER_ASSIGNMENT': return <User className="h-4 w-4 text-purple-500" />
            default: return <Calendar className="h-4 w-4 text-gray-500" />
        }
    }

    return (
        <div className="flex gap-4 pb-8 relative last:pb-0">
            {/* Connector Line */}
            <div className="absolute left-[19px] top-8 bottom-0 w-[2px] bg-border last:hidden"></div>
            
            <div className="z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-background shadow-sm">
                {getIcon(event.eventType)}
            </div>
            <div className="flex flex-col gap-1 w-full">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{event.eventType.replace('_', ' ')}</span>
                    <span className="text-xs text-muted-foreground">{new Date(event.eventDate).toLocaleString('pt-BR')}</span>
                </div>
                <p className="text-sm text-muted-foreground">{event.description}</p>
                {event.actor && (
                     <div className="flex items-center gap-2 mt-1">
                        {event.actor.avatarUrl && <img src={event.actor.avatarUrl} alt="avatar" className="h-4 w-4 rounded-full" />}
                        <span className="text-xs text-muted-foreground">por {event.actor.name}</span>
                     </div>
                )}
            </div>
        </div>
    )
}

export default function VehicleDetailsPage() {
    const { token } = useAuth()
    const router = useRouter()
    const { id } = useParams()
    
    // Type definition extended with relations
    interface DetailedVehicle extends Vehicle {
        timeline: VehicleTimelineEvent[];
        checklists: any[];
        maintenances: any[];
    }

    const [vehicle, setVehicle] = useState<DetailedVehicle | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!token || !id) return

        const fetchDetails = async () => {
            try {
                const res = await api.get(`/fleet/vehicles/${id}`)
                setVehicle(res.data)
            } catch (error) {
                console.error(error)
            } finally {
                setLoading(false)
            }
        }
        fetchDetails()
    }, [token, id])

    if (loading) return <div className="p-8 text-center">Carregando detalhes...</div>
    if (!vehicle) return <div className="p-8 text-center">Veículo não encontrado.</div>

    return (
        <div className="space-y-6">
             {/* Header */}
             <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                     <div className="flex items-center gap-2">
                         <h1 className="text-2xl font-bold tracking-tight">{vehicle.plate}</h1>
                         <Badge variant={STATUS_MAP[vehicle.status]?.variant as any}>{STATUS_MAP[vehicle.status]?.label}</Badge>
                     </div>
                     <p className="text-muted-foreground">{vehicle.model} • {vehicle.category?.name || 'Sem Categoria'} • {vehicle.year}</p>
                </div>
             </div>

             <div className="grid gap-6 md:grid-cols-3">
                 {/* Main Info */}
                 <div className="md:col-span-2 space-y-6">
                     <Card>
                         <CardHeader>
                             <CardTitle>Linha do Tempo</CardTitle>
                             <CardDescription>Histórico completo de eventos do veículo.</CardDescription>
                         </CardHeader>
                         <CardContent>
                             <div className="relative pl-2">
                                 {vehicle.timeline.map((event) => (
                                     <TimelineItem key={event.id} event={event} />
                                 ))}
                                 {vehicle.timeline.length === 0 && <p className="text-center text-muted-foreground">Nenhum evento registrado.</p>}
                             </div>
                         </CardContent>
                     </Card>
                 </div>

                 {/* Sidebar Info */}
                 <div className="space-y-6">
                      <Card>
                          <CardHeader>
                              <CardTitle>Dados Técnicos</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                              <div className="flex justify-between items-center border-b pb-2">
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                      <Gauge className="h-4 w-4" /> Quilometragem
                                  </div>
                                  <span className="font-medium text-lg">{vehicle.currentKm.toLocaleString()} km</span>
                              </div>
                              <div className="flex justify-between items-center border-b pb-2">
                                  <span className="text-sm text-muted-foreground">Combustível</span>
                                  <span className="font-medium">{vehicle.fuelType}</span>
                              </div>
                              <div className="flex justify-between items-center border-b pb-2">
                                  <span className="text-sm text-muted-foreground">Cor</span>
                                  <span className="font-medium">{vehicle.color}</span>
                              </div>
                               <div className="flex justify-between items-center pt-2">
                                  <span className="text-sm text-muted-foreground">Filial</span>
                                  <span className="font-medium">{(vehicle as any).branch?.name}</span>
                              </div>
                          </CardContent>
                      </Card>

                      <Card>
                          <CardHeader>
                              <CardTitle>Ações Rápidas</CardTitle>
                          </CardHeader>
                          <CardContent className="flex flex-col gap-2">
                              {/* TODO: Implement actions */}
                              <Button variant="outline" className="w-full justify-start">
                                  <FileCheck className="mr-2 h-4 w-4" /> Novo Checklist
                              </Button>
                              <Button variant="outline" className="w-full justify-start">
                                  <Wrench className="mr-2 h-4 w-4" /> Agendar Manutenção
                              </Button>
                          </CardContent>
                      </Card>
                 </div>
             </div>
        </div>
    )
}
