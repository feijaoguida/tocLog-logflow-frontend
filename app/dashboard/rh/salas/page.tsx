'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Calendar,
  Clock,
  Edit,
  Loader2,
  MapPin,
  Monitor,
  Plus,
  RotateCw,
  Trash2,
  Users,
  Video,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'

interface MeetingRoom {
  id: string
  name: string
  capacity: number
  branch: { name: string }
  items: { id: string; name: string }[]
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
  const [saving, setSaving] = useState(false)

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    capacity: 10,
    branchId: '',
    status: 'ACTIVE',
    items: [] as string[],
  })

  useEffect(() => {
    void fetchRooms()
    void fetchItems()
  }, [])

  const fetchRooms = async () => {
    try {
      setLoading(true)
      const { data } = await api.get('/meeting-rooms')
      setRooms(data)
    } catch (e) {
      toast.error(getApiErrorMessage(e, 'Erro ao carregar salas.'))
    } finally {
      setLoading(false)
    }
  }

  const fetchItems = async () => {
    try {
      const { data } = await api.get('/meeting-rooms/items')
      setAvailableItems(data)
    } catch (e) {
      console.error(e)
    }
  }

  const handleCreateItem = async (name: string) => {
    try {
      const { data: newItem } = await api.post('/meeting-rooms/items', { name })
      setAvailableItems((prev) => [...prev, newItem])
      toggleItem(newItem.id)
      toast.success(`Item "${name}" criado com sucesso.`)
    } catch (e) {
      toast.error(getApiErrorMessage(e, 'Erro ao criar item de infraestrutura.'))
    }
  }

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error('Informe o nome da sala.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        ...formData,
        branchId: rooms.length > 0 ? rooms[0].branch?.name : 'default-branch-id',
      }

      await api.post('/meeting-rooms', payload)
      toast.success('Sala criada com sucesso.')
      setIsOpen(false)
      setFormData({
        name: '',
        capacity: 10,
        branchId: '',
        status: 'ACTIVE',
        items: [],
      })
      await fetchRooms()
    } catch (e) {
      toast.error(getApiErrorMessage(e, 'Erro ao salvar sala.'))
    } finally {
      setSaving(false)
    }
  }

  const toggleItem = (itemId: string) => {
    setFormData((prev) => {
      const exists = prev.items.includes(itemId)
      if (exists) return { ...prev, items: prev.items.filter((i) => i !== itemId) }
      return { ...prev, items: [...prev.items, itemId] }
    })
  }

  // KPIs
  const stats = useMemo(() => {
    const total = rooms.length
    const active = rooms.filter((r) => r.status === 'ACTIVE').length
    const totalCapacity = rooms.reduce((acc, r) => acc + (Number(r.capacity) || 0), 0)
    const avgCapacity = total > 0 ? Math.round(totalCapacity / total) : 0
    return { total, active, totalCapacity, avgCapacity }
  }, [rooms])

  return (
    <div className="app-page space-y-6">
      {/* 1. Cabeçalho Padronizado */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Gestão de Salas
          </h1>
          <p className="text-sm text-muted-foreground">
            Cadastre e gerencie as salas de reunião da empresa, infraestrutura audiovisual e disponibilidade.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => setIsOpen(true)}
            size="sm"
            className="h-9 gap-1.5 font-semibold"
          >
            <Plus className="size-4" />
            <span>Nova sala</span>
          </Button>

          <Button asChild variant="outline" size="sm" className="h-9 gap-1.5">
            <Link href="/dashboard/rh/agendas">
              <Calendar className="size-4" />
              <span>Ver agenda</span>
            </Link>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            onClick={() => void fetchRooms()}
            disabled={loading}
          >
            <RotateCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </Button>
        </div>
      </section>

      {/* 2. Cards de Resumo (KPIs em 4 colunas) */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Total de Salas */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total de Salas
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {stats.total}
            </span>
            <Video className="size-5 text-muted-foreground/60" />
          </CardContent>
        </Card>

        {/* Ativas */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Salas Ativas
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {stats.active}
            </span>
            <span className="text-xs font-semibold text-emerald-600">Disponíveis</span>
          </CardContent>
        </Card>

        {/* Capacidade Total */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Lugares Totais
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {stats.totalCapacity}
            </span>
            <Users className="size-5 text-muted-foreground/60" />
          </CardContent>
        </Card>

        {/* Média de Capacidade */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Média por Sala
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {stats.avgCapacity}
            </span>
            <span className="text-xs text-muted-foreground">Lugares</span>
          </CardContent>
        </Card>
      </section>

      {/* 3. Grid de Salas com Design TocLog */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.map((room) => (
            <Card
              key={room.id}
              className="app-section-card overflow-hidden group hover:shadow-xs transition-all"
            >
              <CardHeader className="p-5 pb-3 border-b border-border/70 bg-muted/20">
                <div className="flex justify-between items-start">
                  <div>
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium mb-2 ${
                        room.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60'
                          : 'bg-muted text-muted-foreground border-border'
                      }`}
                    >
                      {room.status === 'ACTIVE' ? 'Ativa' : 'Inativa'}
                    </span>
                    <CardTitle className="text-base font-bold text-foreground">
                      {room.name}
                    </CardTitle>
                    <p className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                      <MapPin className="size-3 text-muted-foreground/70" />
                      <span>
                        {typeof room.branch === 'object'
                          ? room.branch?.name
                          : 'Filial Central'}
                      </span>
                    </p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="size-4 text-primary" />
                    <span className="font-semibold text-foreground">
                      {room.capacity} Lugares
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="size-4 text-primary" />
                    <span>08:00 - 18:00</span>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                    Recursos & Equipamentos
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {room.items?.map((item) => (
                      <span
                        key={item.id}
                        className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-muted/40 px-2 py-0.5 text-xs text-foreground font-medium"
                      >
                        <Monitor className="size-3 text-muted-foreground" />
                        <span>{item.name}</span>
                      </span>
                    ))}
                    {(!room.items || room.items.length === 0) && (
                      <span className="text-xs text-muted-foreground italic">
                        Nenhum recurso cadastrado
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {rooms.length === 0 && (
            <div className="col-span-full text-center py-12 border-2 border-dashed border-border rounded-xl bg-muted/10">
              <div className="mx-auto size-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <MapPin className="size-6 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-base text-foreground">
                Nenhuma sala encontrada
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Sua empresa ainda não possui salas de reunião cadastradas.
              </p>
              <Button
                onClick={() => setIsOpen(true)}
                variant="outline"
                size="sm"
                className="mt-4"
              >
                Cadastrar primeira sala
              </Button>
            </div>
          )}
        </div>
      )}

      {/* 4. Modal de Nova Sala */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Sala de Reunião</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-3 rounded-lg border border-border bg-card p-4">
              <div className="space-y-1.5">
                <Label htmlFor="room-name">Nome da Sala *</Label>
                <Input
                  id="room-name"
                  placeholder="Ex: Sala de Inovação, Sala Diretoria"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="room-capacity">Capacidade (Lugares) *</Label>
                <Input
                  id="room-capacity"
                  type="number"
                  min="1"
                  value={formData.capacity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      capacity: parseInt(e.target.value) || 1,
                    })
                  }
                />
              </div>

              <div className="space-y-2 pt-2">
                <Label>Recursos e Itens Disponíveis</Label>

                <div className="flex flex-wrap gap-1.5 mb-2">
                  {formData.items.map((itemId) => {
                    const item = availableItems.find((i) => i.id === itemId)
                    if (!item) return null
                    return (
                      <span
                        key={itemId}
                        className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 pl-2 pr-1 py-0.5 text-xs font-medium text-foreground"
                      >
                        {item.name}
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="size-4 rounded-full hover:bg-muted ml-0.5 p-0"
                          onClick={() => toggleItem(itemId)}
                        >
                          <X className="size-2.5" />
                        </Button>
                      </span>
                    )
                  })}
                </div>

                <Command className="border rounded-md">
                  <CommandInput
                    placeholder="Digite para buscar ou criar item..."
                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                      if (e.key === 'Enter') {
                        const val = e.currentTarget.value
                        if (
                          val &&
                          !availableItems.find(
                            (i) => i.name.toLowerCase() === val.toLowerCase(),
                          )
                        ) {
                          e.preventDefault()
                          void handleCreateItem(val)
                        }
                      }
                    }}
                  />
                  <CommandList>
                    <CommandEmpty className="py-2 px-4 text-xs text-muted-foreground">
                      Pressione Enter para criar novo recurso.
                    </CommandEmpty>
                    <CommandGroup heading="Sugestões disponíveis">
                      {availableItems
                        .filter((i) => !formData.items.includes(i.id))
                        .map((item) => (
                          <CommandItem
                            key={item.id}
                            onSelect={() => toggleItem(item.id)}
                          >
                            <Monitor className="mr-2 size-4 text-muted-foreground" />
                            <span>{item.name}</span>
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Salvar sala
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
