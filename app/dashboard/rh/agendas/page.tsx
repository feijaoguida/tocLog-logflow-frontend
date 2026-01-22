'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Clock, Calendar as CalendarIcon, Users, ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, getDay } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface Reservation {
    id: string
    title: string
    startTime: string
    endTime: string
    meetingRoom: { name: string }
    createdByUser: { name: string, avatarUrl?: string }
}

interface Room {
    id: string
    name: string
    capacity: number
}

export default function AgendaPage() {
    const [currentMonth, setCurrentMonth] = useState(new Date())
    const [selectedDate, setSelectedDate] = useState<Date | null>(null)
    const [reservations, setReservations] = useState<Reservation[]>([])
    const [rooms, setRooms] = useState<Room[]>([])
    const [isBookingOpen, setIsBookingOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    // Booking Form
    const [bookingData, setBookingData] = useState({
        meetingRoomId: '',
        title: '',
        startTime: '09:00',
        endTime: '10:00'
    })

    useEffect(() => {
        fetchRooms()
    }, [])

    useEffect(() => {
        fetchMonthReservations()
    }, [currentMonth])

    const fetchRooms = async () => {
         try {
            const token = localStorage.getItem('token')
            const res = await fetch('http://localhost:3000/meeting-rooms', { headers: { 'Authorization': `Bearer ${token}` } })
            if (res.ok) setRooms(await res.json())
        } catch (e) {}
    }

    const fetchMonthReservations = async () => {
        // Fetch all reservations for range of currentMonth
        // Ideally backend should support start/end range, for now fetching by date (daily) won't work for full month view without spamming API or changing API.
        // Let's modify logic: We'll fetch for the whole month if API supports it, or just MVP loop (inefficient but works for small scale).
        // Actually, the Service `findAll(date)` filters by single day.
        // We will improve Service to fallback to no-filter aka All, OR let's just make it simple:
        // Update Backend to accept startDate/endDate?
        // Or just fetch all active reservations and filter in frontend (easiest for now given complexity constraint).
        
        try {
            const token = localStorage.getItem('token')
            // Hack: Calling without date param returns ALL future reservations (logic in service: if date undefined, returns all? No, checked code: `if (roomId) ... if (date) ... else return all`). 
            // So if we pass nothing, it returns all. Let's rely on that for now.
            const res = await fetch(`http://localhost:3000/reservations`, { 
                headers: { 'Authorization': `Bearer ${token}` } 
            })
            if (res.ok) {
                setReservations(await res.json())
            }
        } catch (e) { toast.error("Erro ao carregar agenda") }
    }

    const handleDayClick = (day: Date) => {
        setSelectedDate(day)
        setIsBookingOpen(true)
    }

    const handleBook = async () => {
        if (!selectedDate || !bookingData.meetingRoomId) return
        
        try {
            const token = localStorage.getItem('token')
            const selectedDateStr = format(selectedDate, 'yyyy-MM-dd')
            const start = new Date(`${selectedDateStr}T${bookingData.startTime}:00`)
            const end = new Date(`${selectedDateStr}T${bookingData.endTime}:00`)

            const res = await fetch('http://localhost:3000/reservations', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({
                    meetingRoomId: bookingData.meetingRoomId,
                    title: bookingData.title,
                    startTime: start.toISOString(),
                    endTime: end.toISOString()
                })
            })

            if (res.ok) {
                toast.success("Sala reservada com sucesso!")
                setIsBookingOpen(false)
                fetchMonthReservations()
            } else {
                const err = await res.json()
                toast.error(err.message || "Erro ao reservar (Conflito?)")
            }
        } catch (e) { toast.error("Falha na requisição") }
    }

    // Calendar Grid Logic
    const daysInMonth = eachDayOfInterval({
        start: startOfMonth(currentMonth),
        end: endOfMonth(currentMonth)
    })

    const startingDayIndex = getDay(startOfMonth(currentMonth)) // 0 (Sun) - 6 (Sat)
    
    // Get reservations for a specific day
    const getReservationsForDay = (day: Date) => {
        return reservations.filter(r => isSameDay(new Date(r.startTime), day))
    }

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                     <h1 className="text-3xl font-bold tracking-tight">Agenda de Salas</h1>
                     <p className="text-muted-foreground">Visualize e gerencie a ocupação das salas.</p>
                </div>
                <div className="flex items-center gap-4">
                     <div className="flex items-center rounded-md border bg-card shadow-sm">
                         <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                             <ChevronLeft className="w-4 h-4" />
                         </Button>
                         <div className="w-40 text-center font-medium">
                             {format(currentMonth, 'MMMM yyyy', { locale: ptBR }).toUpperCase()}
                         </div>
                         <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                             <ChevronRight className="w-4 h-4" />
                         </Button>
                     </div>
                     <Button onClick={() => handleDayClick(new Date())} className="gap-2">
                         <Plus className="w-4 h-4" /> Nova Reserva
                     </Button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="bg-card rounded-xl border shadow-sm flex-1 flex flex-col overflow-hidden">
                {/* Weekday Headers */}
                <div className="grid grid-cols-7 border-b bg-muted/40">
                    {['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map(day => (
                        <div key={day} className="p-3 text-center text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                            {day}
                        </div>
                    ))}
                </div>
                
                {/* Days */}
                <div className="grid grid-cols-7 grid-rows-5 flex-1 p-2 gap-2 overflow-y-auto">
                    {/* Empty slots for previous month */}
                    {Array.from({ length: startingDayIndex }).map((_, i) => (
                        <div key={`empty-${i}`} className="bg-muted/10 rounded-lg opacity-50"></div>
                    ))}
                    
                    {daysInMonth.map(day => {
                        const dayReservations = getReservationsForDay(day)
                        const isTodayDay = isToday(day)
                        
                        return (
                            <div 
                                key={day.toISOString()} 
                                className={`border rounded-xl p-2 flex flex-col gap-2 hover:border-primary/50 transition-colors cursor-pointer min-h-[100px] ${isTodayDay ? 'bg-blue-50/50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800' : 'bg-card'}`}
                                onClick={() => handleDayClick(day)}
                            >
                                <div className="flex justify-between items-start">
                                    <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full ${isTodayDay ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>
                                        {format(day, 'd')}
                                    </span>
                                    {dayReservations.length > 0 && (
                                        <div className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full dark:bg-emerald-900/30 dark:text-emerald-400">
                                            {dayReservations.length} agend.
                                        </div>
                                    )}
                                </div>
                                
                                <div className="flex-1 space-y-1 overflow-hidden">
                                    {dayReservations.slice(0, 3).map(res => (
                                        <div key={res.id} className="text-xs bg-muted p-1 rounded border truncate flex items-center gap-1" title={res.title}>
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></div>
                                            <span className="font-medium text-foreground">{format(new Date(res.startTime), 'HH:mm')}</span>
                                            <span className="text-muted-foreground truncate">{res.title}</span>
                                        </div>
                                    ))}
                                    {dayReservations.length > 3 && (
                                        <div className="text-xs text-center text-muted-foreground hover:text-foreground">
                                            + {dayReservations.length - 3} mais...
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Booking Dialog */}
            <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reservar Sala - {selectedDate && format(selectedDate, "d 'de' MMMM", { locale: ptBR })}</DialogTitle>
                        <DialogDescription>Selecione a sala e o horário desejado.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Assunto da Reunião</Label>
                            <Input placeholder="Ex: Daily Scrum" value={bookingData.title} onChange={e => setBookingData({...bookingData, title: e.target.value})} />
                        </div>
                        <div className="grid gap-2">
                            <Label>Sala</Label>
                            <Select onValueChange={v => setBookingData({...bookingData, meetingRoomId: v})}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione uma sala" />
                                </SelectTrigger>
                                <SelectContent>
                                    {rooms.map(room => (
                                        <SelectItem key={room.id} value={room.id}>{room.name} ({room.capacity} lug.)</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                             <div className="grid gap-2">
                                <Label>Início</Label>
                                <Input type="time" value={bookingData.startTime} onChange={e => setBookingData({...bookingData, startTime: e.target.value})} />
                            </div>
                            <div className="grid gap-2">
                                <Label>Fim</Label>
                                <Input type="time" value={bookingData.endTime} onChange={e => setBookingData({...bookingData, endTime: e.target.value})} />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsBookingOpen(false)}>Cancelar</Button>
                        <Button onClick={handleBook}>Confirmar Reserva</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
