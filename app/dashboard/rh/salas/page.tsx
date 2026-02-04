'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Edit, Trash, MapPin, Users, Monitor, Clock, X } from "lucide-react"
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"

interface MeetingRoom {
    id: string
    name: string
    capacity: number
    branch: { name: string }
    items: { id: string, name: string }[]
    status: string
}

interface RoomItem {
    id: string
    name: string
}

export default function RoomsManagementPage() {
    const [rooms, setRooms] = useState<MeetingRoom[]>([])
    const [availableItems, setAvailableItems] = useState<RoomItem[]>([])
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(true)
    
    // Form State
    const [formData, setFormData] = useState({
        name: '',
        capacity: 10,
        branchId: '', // Ideally fetched or selected
        status: 'ACTIVE',
        items: [] as string[]
    })

    useEffect(() => {
        fetchRooms()
        fetchItems()
    }, [])

    const fetchRooms = async () => {
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://162.215.222.208:4000'}/meeting-rooms`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                setRooms(data)
            }
        } catch (e) { toast.error("Erro ao carregar salas") }
        finally { setLoading(false) }
    }

    const fetchItems = async () => {
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://162.215.222.208:4000'}/meeting-rooms/items`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                setAvailableItems(await res.json())
            }
        } catch (e) {}
    }

    const handleCreateItem = async (name: string) => {
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://162.215.222.208:4000'}/meeting-rooms/items`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ name })
            })
            if (res.ok) {
                const newItem = await res.json()
                setAvailableItems(prev => [...prev, newItem])
                toggleItem(newItem.id)
                toast.success(`Item "${name}" criado!`)
            }
        } catch (e) { toast.error("Erro ao criar item") }
    }

    const handleCreate = async () => {
        try {
            const token = localStorage.getItem('token')
            // Hardcoding branchId for MVP since we don't have selector yet in this view
            const payload = {
                ...formData,
                branchId: rooms.length > 0 ? rooms[0].branch?.name : 'default-branch-id' // Fallback
            }
            
            // Actually call Backend
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://162.215.222.208:4000'}/meeting-rooms`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify(payload)
            })

            if (res.ok) {
                toast.success("Sala criada com sucesso!")
                setIsOpen(false)
                fetchRooms()
            } else {
                toast.error("Erro ao criar sala")
            }
        } catch (e) { toast.error("Erro de conexão") }
    }
    
    const toggleItem = (itemId: string) => {
        setFormData(prev => {
            const exists = prev.items.includes(itemId)
            if (exists) return { ...prev, items: prev.items.filter(i => i !== itemId) }
            return { ...prev, items: [...prev.items, itemId] }
        })
    }

    return (
        <div className="space-y-6 p-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Gestão de Salas</h1>
                    <p className="text-muted-foreground">Cadastre e gerencie as salas de reunião da empresa.</p>
                </div>
                <Button onClick={() => setIsOpen(true)} className="gap-2">
                    <Plus className="w-4 h-4" /> Nova Sala
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rooms.map(room => (
                    <Card key={room.id} className="overflow-hidden group hover:shadow-lg transition-all">
                        <CardHeader className="bg-muted/30 pb-4 border-b">
                            <div className="flex justify-between items-start">
                                <div>
                                    <Badge variant={room.status === 'ACTIVE' ? 'default' : 'secondary'} className="mb-2">
                                        {room.status}
                                    </Badge>
                                    <CardTitle>{room.name}</CardTitle>
                                    <CardDescription className="flex items-center gap-1 mt-1">
                                        <MapPin className="w-3 h-3" /> {typeof room.branch === 'object' ? room.branch?.name : 'Filial'}
                                    </CardDescription>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="icon" className="h-8 w-8"><Edit className="w-4 h-4" /></Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash className="w-4 h-4" /></Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Users className="w-4 h-4" />
                                    <span>{room.capacity} Lugares</span>
                                </div>
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Clock className="w-4 h-4" />
                                    <span>08:00 - 18:00</span>
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <span className="text-xs font-semibold text-muted-foreground uppercase">Itens Disponíveis</span>
                                <div className="flex flex-wrap gap-2">
                                    {room.items?.map(item => (
                                        <Badge key={item.id} variant="secondary" className="gap-1 font-normal bg-slate-100 text-slate-600">
                                            <Monitor className="w-3 h-3" /> {item.name}
                                        </Badge>
                                    ))}
                                    {(!room.items || room.items.length === 0) && <span className="text-xs text-muted-foreground italic">Nenhum item cadastrado</span>}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                
                {rooms.length === 0 && !loading && (
                     <div className="col-span-full text-center py-12 border-2 border-dashed rounded-xl bg-muted/20">
                         <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                             <MapPin className="w-6 h-6 text-muted-foreground" />
                         </div>
                         <h3 className="font-semibold text-lg">Nenhuma sala encontrada</h3>
                         <p className="text-muted-foreground">Sua empresa ainda não possui salas cadastradas.</p>
                         <Button onClick={() => setIsOpen(true)} variant="link" className="mt-2">Cadastrar primeira sala</Button>
                     </div>
                )}
            </div>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Nova Sala de Reunião</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Nome da Sala</Label>
                            <Input id="name" placeholder="Ex: Sala de Inovação" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                             <div className="grid gap-2">
                                <Label htmlFor="capacity">Capacidade</Label>
                                <Input id="capacity" type="number" value={formData.capacity} onChange={e => setFormData({...formData, capacity: parseInt(e.target.value)})} />
                            </div>
                        </div>
                        
                        <div className="space-y-3 pt-2">
                            <Label>Itens Disponíveis</Label>
                            
                            <div className="flex flex-wrap gap-2 mb-2">
                                {formData.items.map(itemId => {
                                    const item = availableItems.find(i => i.id === itemId)
                                    if (!item) return null
                                    return (
                                        <Badge key={itemId} variant="secondary" className="gap-1 pl-2 pr-1 py-1">
                                            {item.name}
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-4 w-4 rounded-full hover:bg-muted ml-1"
                                                onClick={() => toggleItem(itemId)}
                                            >
                                                <X className="w-3 h-3" />
                                            </Button>
                                        </Badge>
                                    )
                                })}
                            </div>

                            <Command className="border rounded-md">
                                <CommandInput 
                                    placeholder="Digite para buscar ou criar item..." 
                                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                                        if (e.key === 'Enter') {
                                            const val = e.currentTarget.value
                                            if (val && !availableItems.find(i => i.name.toLowerCase() === val.toLowerCase())) {
                                                e.preventDefault()
                                                handleCreateItem(val)
                                            }
                                        }
                                    }}
                                />
                                <CommandList>
                                    <CommandEmpty className="py-2 px-4 text-sm text-muted-foreground">
                                        Pressione Enter para criar.
                                    </CommandEmpty>
                                    <CommandGroup heading="Sugestões">
                                        {availableItems.filter(i => !formData.items.includes(i.id)).map(item => (
                                            <CommandItem
                                                key={item.id}
                                                onSelect={() => {
                                                    toggleItem(item.id)
                                                }}
                                            >
                                                <Monitor className="mr-2 h-4 w-4" />
                                                {item.name}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
                        <Button onClick={handleCreate}>Salvar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

