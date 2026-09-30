'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  DoorOpen,
  Loader2,
  Plus,
  RotateCw,
  Users,
  Video,
} from 'lucide-react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isSameDay,
  isToday,
  startOfMonth,
  subMonths,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'

interface Reservation {
  id: string
  title: string
  startTime: string
  endTime: string
  meetingRoom: { name: string }
  createdByUser: { name: string; avatarUrl?: string }
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
  const [loading, setLoading] = useState(true)
  const [bookingLoading, setBookingLoading] = useState(false)

  // Booking Form
  const [bookingData, setBookingData] = useState({
    meetingRoomId: '',
    title: '',
    startTime: '09:00',
    endTime: '10:00',
  })

  useEffect(() => {
    void fetchRooms()
  }, [])

  useEffect(() => {
    void fetchMonthReservations()
  }, [currentMonth])

  const fetchRooms = async () => {
    try {
      const { data } = await api.get('/meeting-rooms')
      setRooms(data)
    } catch (e) {
      console.error(e)
    }
  }

  const fetchMonthReservations = async () => {
    try {
      setLoading(true)
      const { data } = await api.get('/reservations')
      setReservations(data)
    } catch (e) {
      toast.error(getApiErrorMessage(e, 'Erro ao carregar agenda de salas.'))
    } finally {
      setLoading(false)
    }
  }

  const handleDayClick = (day: Date) => {
    setSelectedDate(day)
    setIsBookingOpen(true)
  }

  const handleBook = async () => {
    if (!selectedDate || !bookingData.meetingRoomId) {
      toast.error('Selecione uma sala e a data desejada.')
      return
    }
    if (!bookingData.title.trim()) {
      toast.error('Informe o assunto da reunião.')
      return
    }

    setBookingLoading(true)
    try {
      const selectedDateStr = format(selectedDate, 'yyyy-MM-dd')
      const start = new Date(`${selectedDateStr}T${bookingData.startTime}:00`)
      const end = new Date(`${selectedDateStr}T${bookingData.endTime}:00`)

      await api.post('/reservations', {
        meetingRoomId: bookingData.meetingRoomId,
        title: bookingData.title,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      })

      toast.success('Sala reservada com sucesso.')
      setIsBookingOpen(false)
      setBookingData({
        meetingRoomId: '',
        title: '',
        startTime: '09:00',
        endTime: '10:00',
      })
      await fetchMonthReservations()
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Erro ao reservar sala. Verifique possíveis conflitos.'
      toast.error(msg)
    } finally {
      setBookingLoading(false)
    }
  }

  // Calendar Grid Logic
  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  })

  const startingDayIndex = getDay(startOfMonth(currentMonth))

  const getReservationsForDay = (day: Date) => {
    return reservations.filter((r) => isSameDay(new Date(r.startTime), day))
  }

  // KPIs
  const stats = useMemo(() => {
    const totalReservations = reservations.length
    const todayReservations = reservations.filter((r) =>
      isToday(new Date(r.startTime)),
    ).length
    const availableRooms = rooms.length
    return { totalReservations, todayReservations, availableRooms }
  }, [reservations, rooms])

  return (
    <div className="app-page space-y-6">
      {/* 1. Cabeçalho Padronizado */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Agenda de Salas
          </h1>
          <p className="text-sm text-muted-foreground">
            Visualize a grade mensal de reservas, verifique horários disponíveis e agende salas corporativas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => handleDayClick(new Date())}
            size="sm"
            className="h-9 gap-1.5 font-semibold"
          >
            <Plus className="size-4" />
            <span>Nova reserva</span>
          </Button>

          <Button asChild variant="outline" size="sm" className="h-9 gap-1.5">
            <Link href="/dashboard/rh/salas">
              <DoorOpen className="size-4" />
              <span>Gerenciar salas</span>
            </Link>
          </Button>

          {/* Seletor de Mês */}
          <div className="flex items-center rounded-md border border-border bg-card shadow-2xs h-9">
            <Button
              variant="ghost"
              size="icon-sm"
              className="size-8"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <div className="min-w-32 text-center text-xs font-semibold uppercase tracking-wider text-foreground">
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              className="size-8"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>

          {/* Atualização */}
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            onClick={() => void fetchMonthReservations()}
            disabled={loading}
          >
            <RotateCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </Button>
        </div>
      </section>

      {/* 2. Cards de Resumo (KPIs em 4 colunas) */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Total do Mês */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total de Reservas
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {stats.totalReservations}
            </span>
            <CalendarIcon className="size-5 text-muted-foreground/60" />
          </CardContent>
        </Card>

        {/* Hoje */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Reuniões Hoje
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {stats.todayReservations}
            </span>
            <Clock className="size-5 text-emerald-500/60" />
          </CardContent>
        </Card>

        {/* Salas Disponíveis */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Salas Ativas
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {stats.availableRooms}
            </span>
            <Video className="size-5 text-muted-foreground/60" />
          </CardContent>
        </Card>

        {/* Mês em Foco */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Período em Foco
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2 flex items-baseline justify-between">
            <span className="text-sm font-bold tracking-tight text-foreground uppercase">
              {format(currentMonth, 'MMMM / yyyy', { locale: ptBR })}
            </span>
            <span className="text-xs text-muted-foreground">Grade Ativa</span>
          </CardContent>
        </Card>
      </section>

      {/* 3. Grade do Calendário */}
      <Card className="app-section-card overflow-hidden">
        {/* Cabeçalho dos dias da semana */}
        <div className="grid grid-cols-7 border-b border-border/80 bg-muted/30">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
            <div
              key={day}
              className="py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Grid dos Dias */}
        <div className="grid grid-cols-7 gap-px bg-border/60 p-px min-h-[480px]">
          {/* Espaços vazios do início do mês */}
          {Array.from({ length: startingDayIndex }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="bg-muted/10 min-h-[96px] p-2 opacity-40 select-none"
            />
          ))}

          {daysInMonth.map((day) => {
            const dayReservations = getReservationsForDay(day)
            const isTodayDay = isToday(day)

            return (
              <div
                key={day.toISOString()}
                className={`bg-card p-2 flex flex-col gap-1.5 transition-colors cursor-pointer min-h-[100px] hover:bg-muted/30 ${
                  isTodayDay ? 'ring-1 ring-inset ring-primary/40 bg-primary/5' : ''
                }`}
                onClick={() => handleDayClick(day)}
              >
                <div className="flex justify-between items-center">
                  <span
                    className={`text-xs font-bold size-6 flex items-center justify-center rounded-full ${
                      isTodayDay
                        ? 'bg-primary text-primary-foreground'
                        : 'text-foreground'
                    }`}
                  >
                    {format(day, 'd')}
                  </span>
                  {dayReservations.length > 0 && (
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-full dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60">
                      {dayReservations.length} res.
                    </span>
                  )}
                </div>

                <div className="flex-1 space-y-1 overflow-hidden">
                  {dayReservations.slice(0, 3).map((res) => (
                    <div
                      key={res.id}
                      className="text-[11px] bg-muted/60 px-1.5 py-0.5 rounded border border-border/60 truncate flex items-center gap-1"
                      title={`${res.meetingRoom?.name || 'Sala'} • ${res.title}`}
                    >
                      <span className="size-1.5 rounded-full bg-primary shrink-0" />
                      <span className="font-semibold text-foreground">
                        {format(new Date(res.startTime), 'HH:mm')}
                      </span>
                      <span className="text-muted-foreground truncate">{res.title}</span>
                    </div>
                  ))}
                  {dayReservations.length > 3 && (
                    <div className="text-[10px] text-center text-muted-foreground font-medium pt-0.5">
                      + {dayReservations.length - 3} mais
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* 4. Modal de Nova Reserva */}
      <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Reservar Sala •{' '}
              {selectedDate && format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
            </DialogTitle>
            <DialogDescription>
              Selecione a sala de reunião e o horário de início e término.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-3 rounded-lg border border-border bg-card p-4">
              <div className="space-y-1.5">
                <Label htmlFor="booking-title">Assunto da Reunião *</Label>
                <Input
                  id="booking-title"
                  placeholder="Ex: Alinhamento de Metas, Daily Scrum"
                  value={bookingData.title}
                  onChange={(e) =>
                    setBookingData({ ...bookingData, title: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="booking-room">Sala de Reunião *</Label>
                <Select
                  value={bookingData.meetingRoomId}
                  onValueChange={(v) =>
                    setBookingData({ ...bookingData, meetingRoomId: v })
                  }
                >
                  <SelectTrigger id="booking-room">
                    <SelectValue placeholder="Selecione a sala" />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.name} ({room.capacity} lugares)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="booking-start">Início *</Label>
                  <Input
                    id="booking-start"
                    type="time"
                    value={bookingData.startTime}
                    onChange={(e) =>
                      setBookingData({ ...bookingData, startTime: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="booking-end">Fim *</Label>
                  <Input
                    id="booking-end"
                    type="time"
                    value={bookingData.endTime}
                    onChange={(e) =>
                      setBookingData({ ...bookingData, endTime: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsBookingOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleBook} disabled={bookingLoading}>
              {bookingLoading ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : null}
              Confirmar reserva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
