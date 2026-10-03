'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  MoreHorizontal,
  PackageCheck,
  PackageOpen,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Truck,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

import { MenuFunctionHeader } from '@/components/layout/menu-function-header'
import { WorkspaceStateCard } from '@/components/layout/workspace-state-card'
import { useAuth } from '@/context/auth-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { FilterPopover } from '@/components/ui/filter-popover'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'

type ShipmentVolumeRecord = {
  id: string
  code: string
  description?: string | null
  weight?: number | null
  volume?: number | null
  status: 'PENDING' | 'CONFERRED' | 'DIVERGENT' | 'DAMAGED' | 'CANCELLED'
  metadata?: {
    conferenceNote?: string | null
  } | null
}

type ShipmentOccurrenceRecord = {
  id: string
  occurrenceType: string
  description: string
  severity?: string | null
  createdAt: string
}

type ShipmentRecord = {
  id: string
  code: string
  sourceType?: string | null
  sourceReference?: string | null
  clientName?: string | null
  recipientName?: string | null
  recipientDocument?: string | null
  fiscalDocumentType?: string | null
  fiscalDocumentNumber?: string | null
  fiscalDocumentKey?: string | null
  fiscalDocumentIssuedAt?: string | null
  status: string
  totalWeight?: number | null
  totalVolume?: number | null
  notes?: string | null
  volumes: ShipmentVolumeRecord[]
  occurrences: ShipmentOccurrenceRecord[]
}

type VolumeConferenceDraft = {
  status: ShipmentVolumeRecord['status']
  note: string
}

const EMPTY_VOLUME_FORM = {
  code: '',
  description: '',
  weight: '',
  volume: '',
}

function parseOptionalPositiveNumber(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed) || parsed < 0) return null
  return parsed
}

function getShipmentReadinessIssues(shipment: ShipmentRecord) {
  const issues: string[] = []
  if (!shipment.recipientName?.trim()) issues.push('Destinatário não informado')
  if (!shipment.recipientDocument?.trim()) issues.push('Documento do destinatário ausente')
  if (!shipment.fiscalDocumentType?.trim()) issues.push('Tipo fiscal ausente')
  if (!shipment.fiscalDocumentNumber?.trim()) issues.push('Número fiscal ausente')
  if (!shipment.fiscalDocumentKey?.trim()) issues.push('Chave fiscal ausente')
  return issues
}

function getShipmentBadgeVariant(status: string): 'default' | 'secondary' | 'outline' | 'destructive' {
  switch (status) {
    case 'DELIVERED':
      return 'default'
    case 'READY_TO_ROUTE':
    case 'IN_TRANSIT':
      return 'secondary'
    case 'DIVERGENT':
    case 'DAMAGED':
    case 'CANCELLED':
      return 'destructive'
    default:
      return 'outline'
  }
}

export default function ShipmentsPage() {
  const { hasPermission } = useAuth()
  const canViewCargo = hasPermission('shipments.cargo.view')
  const canManageCargo = hasPermission('shipments.cargo.create')

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Data
  const [shipments, setShipments] = useState<ShipmentRecord[]>([])
  const [selectedShipment, setSelectedShipment] = useState<ShipmentRecord | null>(null)

  // Filters & Pagination
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [page, setPage] = useState(1)
  const pageSize = 10

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [conferenceModalOpen, setConferenceModalOpen] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)

  // Form states: Nova Carga
  const [savingShipment, setSavingShipment] = useState(false)
  const [code, setCode] = useState('')
  const [sourceType, setSourceType] = useState('MANUAL')
  const [sourceReference, setSourceReference] = useState('')
  const [clientName, setClientName] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [recipientDocument, setRecipientDocument] = useState('')
  const [fiscalDocumentType, setFiscalDocumentType] = useState('NFE')
  const [fiscalDocumentNumber, setFiscalDocumentNumber] = useState('')
  const [fiscalDocumentKey, setFiscalDocumentKey] = useState('')
  const [fiscalDocumentIssuedAt, setFiscalDocumentIssuedAt] = useState('')
  const [notes, setNotes] = useState('')

  // Form states: Volumes & Conferência
  const [volumeForm, setVolumeForm] = useState(EMPTY_VOLUME_FORM)
  const [savingVolume, setSavingVolume] = useState(false)
  const [volumeDrafts, setVolumeDrafts] = useState<Record<string, VolumeConferenceDraft>>({})
  const [conferenceNotes, setConferenceNotes] = useState('')
  const [markReadyToRoute, setMarkReadyToRoute] = useState(true)
  const [savingConference, setSavingConference] = useState(false)

  async function loadShipments(showLoadingState = true) {
    if (showLoadingState) setLoading(true)
    else setRefreshing(true)
    setLoadError(null)

    try {
      const { data } = await api.get<ShipmentRecord[]>('/shipments')
      setShipments(data || [])
      if (selectedShipment) {
        const updated = data.find((s) => s.id === selectedShipment.id)
        if (updated) setSelectedShipment(updated)
      }
    } catch (error) {
      const message = getApiErrorMessage(error, 'Não foi possível carregar as cargas.')
      setLoadError(message)
      toast.error(message)
    } finally {
      if (showLoadingState) setLoading(false)
      else setRefreshing(false)
    }
  }

  useEffect(() => {
    if (canViewCargo) {
      void loadShipments(true)
    } else {
      setLoading(false)
    }
  }, [canViewCargo])

  // KPIs
  const summary = useMemo(() => {
    const total = shipments.length
    const ready = shipments.filter((s) => s.status === 'READY_TO_ROUTE').length
    const inTransit = shipments.filter((s) => ['IN_TRANSIT', 'DISPATCHED'].includes(s.status)).length
    const issues = shipments.filter((s) => ['DIVERGENT', 'DAMAGED'].includes(s.status)).length
    return { total, ready, inTransit, issues }
  }, [shipments])

  // Filtered List
  const filteredShipments = useMemo(() => {
    return shipments.filter((s) => {
      const matchesSearch =
        !searchTerm.trim() ||
        s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.clientName && s.clientName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.recipientName && s.recipientName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.sourceReference && s.sourceReference.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [shipments, searchTerm, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredShipments.length / pageSize))
  const paginatedShipments = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredShipments.slice(start, start + pageSize)
  }, [filteredShipments, page, pageSize])

  const activeFilterCount = (searchTerm.trim() ? 1 : 0) + (statusFilter !== 'ALL' ? 1 : 0)

  // Handle Nova Carga
  async function handleCreateShipment() {
    if (!code.trim()) {
      toast.error('Informe o código da carga antes de salvar.')
      return
    }

    setSavingShipment(true)
    try {
      await api.post('/shipments', {
        code: code.trim(),
        sourceType: sourceType.trim() || undefined,
        sourceReference: sourceReference.trim() || undefined,
        clientName: clientName.trim() || undefined,
        recipientName: recipientName.trim() || undefined,
        recipientDocument: recipientDocument.trim() || undefined,
        fiscalDocumentType: fiscalDocumentType.trim() || undefined,
        fiscalDocumentNumber: fiscalDocumentNumber.trim() || undefined,
        fiscalDocumentKey: fiscalDocumentKey.trim() || undefined,
        fiscalDocumentIssuedAt: fiscalDocumentIssuedAt || undefined,
        notes: notes.trim() || undefined,
      })
      toast.success('Carga cadastrada com sucesso.')
      setCode('')
      setSourceType('MANUAL')
      setSourceReference('')
      setClientName('')
      setRecipientName('')
      setRecipientDocument('')
      setFiscalDocumentType('NFE')
      setFiscalDocumentNumber('')
      setFiscalDocumentKey('')
      setFiscalDocumentIssuedAt('')
      setNotes('')
      setCreateModalOpen(false)
      await loadShipments(false)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Erro ao criar carga.'))
    } finally {
      setSavingShipment(false)
    }
  }

  // Handle Open Conferência
  function handleOpenConference(shipment: ShipmentRecord) {
    setSelectedShipment(shipment)
    const nextDrafts: Record<string, VolumeConferenceDraft> = {}
    for (const volume of shipment.volumes) {
      nextDrafts[volume.id] = {
        status: volume.status === 'CANCELLED' ? 'PENDING' : volume.status,
        note: volume.metadata?.conferenceNote ?? '',
      }
    }
    setVolumeDrafts(nextDrafts)
    setConferenceNotes('')
    setVolumeForm(EMPTY_VOLUME_FORM)
    setConferenceModalOpen(true)
  }

  // Handle Adicionar Volume
  async function handleAddVolume() {
    if (!selectedShipment) return
    if (!volumeForm.code.trim()) {
      toast.error('Informe o código do volume.')
      return
    }

    const parsedWeight = parseOptionalPositiveNumber(volumeForm.weight)
    if (parsedWeight === null) {
      toast.error('Informe um peso válido maior ou igual a zero.')
      return
    }

    const parsedVolume = parseOptionalPositiveNumber(volumeForm.volume)
    if (parsedVolume === null) {
      toast.error('Informe uma cubagem válida maior ou igual a zero.')
      return
    }

    setSavingVolume(true)
    try {
      await api.post(`/shipments/${selectedShipment.id}/volumes`, {
        code: volumeForm.code.trim(),
        description: volumeForm.description.trim() || undefined,
        weight: parsedWeight,
        volume: parsedVolume,
      })
      toast.success('Volume adicionado.')
      setVolumeForm(EMPTY_VOLUME_FORM)
      await loadShipments(false)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Erro ao adicionar volume.'))
    } finally {
      setSavingVolume(false)
    }
  }

  // Handle Salvar Conferência
  async function handleSaveConference() {
    if (!selectedShipment) return
    if (selectedShipment.volumes.length === 0) {
      toast.error('Cadastre ao menos um volume antes de concluir a conferência.')
      return
    }

    setSavingConference(true)
    try {
      await api.post(`/shipments/${selectedShipment.id}/conference`, {
        volumes: selectedShipment.volumes.map((volume) => ({
          volumeId: volume.id,
          status: volumeDrafts[volume.id]?.status ?? 'PENDING',
          note: volumeDrafts[volume.id]?.note || undefined,
        })),
        notes: conferenceNotes || undefined,
        markReadyToRoute,
      })
      toast.success('Conferência registrada com sucesso!')
      setConferenceModalOpen(false)
      await loadShipments(false)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Erro ao salvar conferência.'))
    } finally {
      setSavingConference(false)
    }
  }

  function handleOpenDetail(shipment: ShipmentRecord) {
    setSelectedShipment(shipment)
    setDetailModalOpen(true)
  }

  return (
    <div className="app-page">
      <MenuFunctionHeader
        title="Cargas e Rotas > Cargas"
        description="Entrada fiscal, conferência volumétrica com registro de divergências e liberação para rotas."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadShipments(false)}
              disabled={loading || refreshing}
              className="gap-1.5"
            >
              <RefreshCw className={`size-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Atualizando...' : 'Atualizar'}</span>
            </Button>
            {canManageCargo && (
              <Button size="sm" onClick={() => setCreateModalOpen(true)} className="gap-1.5">
                <Plus className="size-4" />
                <span>Nova Carga</span>
              </Button>
            )}
          </div>
        }
      />

      {!canViewCargo ? (
        <WorkspaceStateCard title="Acesso restrito">
          <p>Você não possui permissão para visualizar a listagem de cargas.</p>
        </WorkspaceStateCard>
      ) : (
        <>
          {loadError && (
            <WorkspaceStateCard title="Falha ao carregar dados" tone="danger">
              <p>{loadError}</p>
            </WorkspaceStateCard>
          )}

          {/* 4 KPIs responsivos padrão TocLog (U2) */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="app-section-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription>Total de Cargas</CardDescription>
                <PackageCheck className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <CardTitle className="text-3xl font-bold">{summary.total}</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Cargas cadastradas no tenant</p>
              </CardContent>
            </Card>

            <Card className="app-section-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription>Prontas para Rota</CardDescription>
                <CheckCircle2 className="size-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <CardTitle className="text-3xl font-bold text-emerald-600">{summary.ready}</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Conferência e fiscal validados</p>
              </CardContent>
            </Card>

            <Card className="app-section-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription>Em Trânsito / Rota</CardDescription>
                <Truck className="size-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <CardTitle className="text-3xl font-bold text-blue-600">{summary.inTransit}</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Alocadas e em viagem ativa</p>
              </CardContent>
            </Card>

            <Card className="app-section-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription>Com Divergência / Avaria</CardDescription>
                <AlertTriangle className="size-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <CardTitle className="text-3xl font-bold text-amber-600">{summary.issues}</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Exigem exceção ou reparo</p>
              </CardContent>
            </Card>
          </div>

          {/* Filtros Flutuantes TocLog (U3) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-xl border border-border">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código, cliente ou destinatário..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setPage(1)
                }}
                className="pl-9"
              />
              {searchTerm && (
                <button
                  onClick={() => {
                    setSearchTerm('')
                    setPage(1)
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <FilterPopover
                activeCount={activeFilterCount}
                onClear={() => {
                  setSearchTerm('')
                  setStatusFilter('ALL')
                  setPage(1)
                }}
                title="Filtros de Cargas"
              >
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Status da Carga</Label>
                    <Select
                      value={statusFilter}
                      onValueChange={(val) => {
                        setStatusFilter(val)
                        setPage(1)
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Todos os status</SelectItem>
                        <SelectItem value="DRAFT">Rascunho (DRAFT)</SelectItem>
                        <SelectItem value="RECEIVED">Recebida (RECEIVED)</SelectItem>
                        <SelectItem value="READY_TO_ROUTE">Pronta para Rota</SelectItem>
                        <SelectItem value="IN_TRANSIT">Em Trânsito</SelectItem>
                        <SelectItem value="DELIVERED">Entregue</SelectItem>
                        <SelectItem value="DIVERGENT">Com Divergência</SelectItem>
                        <SelectItem value="DAMAGED">Com Avaria</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </FilterPopover>

              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('')
                    setStatusFilter('ALL')
                    setPage(1)
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Limpar ({activeFilterCount})
                </Button>
              )}
            </div>
          </div>

          {/* Tabela completa em largura inteira padrão TocLog (U1 & U4) */}
          <Card className="app-section-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold">Listagem de Cargas</CardTitle>
              <CardDescription>
                Exibindo {paginatedShipments.length} de {filteredShipments.length} cargas cadastradas.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 sm:p-6 sm:pt-0">
              <div className="rounded-xl border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[140px]">Código</TableHead>
                      <TableHead>Origem / Ref</TableHead>
                      <TableHead>Cliente / Destinatário</TableHead>
                      <TableHead className="w-[130px]">Status</TableHead>
                      <TableHead>Prontidão & Volumes</TableHead>
                      <TableHead className="text-right w-[110px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={6}>
                            <Skeleton className="h-8 w-full rounded-md" />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : paginatedShipments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-28 text-center text-muted-foreground">
                          Nenhuma carga encontrada para os critérios informados.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedShipments.map((shipment) => {
                        const readinessIssues = getShipmentReadinessIssues(shipment)
                        const isReady = readinessIssues.length === 0

                        return (
                          <TableRow key={shipment.id} className="hover:bg-muted/30 transition-colors">
                            <TableCell className="font-semibold text-foreground">
                              {shipment.code}
                            </TableCell>

                            <TableCell>
                              <div className="text-xs">
                                <span className="font-medium text-foreground">{shipment.sourceType || 'MANUAL'}</span>
                                {shipment.sourceReference && (
                                  <span className="text-muted-foreground block">Ref: {shipment.sourceReference}</span>
                                )}
                              </div>
                            </TableCell>

                            <TableCell>
                              <div className="text-xs space-y-0.5">
                                <span className="font-medium text-foreground block">{shipment.clientName || 'Cliente Geral'}</span>
                                <span className="text-muted-foreground block">Dest: {shipment.recipientName || 'Não informado'}</span>
                              </div>
                            </TableCell>

                            <TableCell>
                              <Badge variant={getShipmentBadgeVariant(shipment.status)}>
                                {shipment.status}
                              </Badge>
                            </TableCell>

                            <TableCell>
                              <div className="space-y-1 text-xs">
                                <div className="flex items-center gap-2">
                                  <Badge variant={isReady ? 'secondary' : 'destructive'} className="text-[10px] py-0 px-1.5">
                                    {isReady ? 'Fiscal OK' : `${readinessIssues.length} pendência(s)`}
                                  </Badge>
                                  <span className="text-muted-foreground">
                                    {shipment.volumes?.length || 0} volume(s)
                                  </span>
                                </div>
                                {shipment.occurrences && shipment.occurrences.length > 0 && (
                                  <span className="text-[10px] text-amber-700 block">
                                    {shipment.occurrences.length} ocorrência(s)
                                  </span>
                                )}
                              </div>
                            </TableCell>

                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="size-8">
                                    <MoreHorizontal className="size-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem onClick={() => handleOpenDetail(shipment)}>
                                    <FileText className="size-4 mr-2" />
                                    <span>Ver detalhes</span>
                                  </DropdownMenuItem>

                                  {canManageCargo && (
                                    <DropdownMenuItem onClick={() => handleOpenConference(shipment)}>
                                      <PackageCheck className="size-4 mr-2" />
                                      <span>Conferência de volumes</span>
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Paginação Real TocLog (U7) */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2 py-4 border-t mt-4">
                <div className="text-xs text-muted-foreground">
                  Página {page} de {totalPages} ({filteredShipments.length} registros no total)
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="h-8 gap-1 text-xs"
                  >
                    <ChevronLeft className="size-3.5" />
                    <span>Anterior</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="h-8 gap-1 text-xs"
                  >
                    <span>Próxima</span>
                    <ChevronRight className="size-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* --- MODAL 1: NOVA CARGA (U6) --- */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Cadastrar Nova Carga</DialogTitle>
            <DialogDescription>
              Informe os dados fiscais e cadastrais da remessa.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 max-h-[65vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Código da Carga *</Label>
                <Input
                  placeholder="Ex: SHP-2026-001"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Origem</Label>
                <Input
                  placeholder="Ex: MANUAL ou WMS"
                  value={sourceType}
                  onChange={(e) => setSourceType(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Nome do Cliente</Label>
                <Input
                  placeholder="Ex: Magazine Luiza"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Referência Externa</Label>
                <Input
                  placeholder="Ex: PED-98765"
                  value={sourceReference}
                  onChange={(e) => setSourceReference(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Destinatário Final</Label>
                <Input
                  placeholder="Nome do recebedor"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">CPF / CNPJ Destinatário</Label>
                <Input
                  placeholder="Documento com pontuação"
                  value={recipientDocument}
                  onChange={(e) => setRecipientDocument(e.target.value)}
                />
              </div>
            </div>

            <div className="border-t pt-3 space-y-3">
              <h4 className="text-xs font-semibold text-foreground">Base Fiscal Obrigatória</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Tipo Fiscal</Label>
                  <Input
                    placeholder="Ex: NFE"
                    value={fiscalDocumentType}
                    onChange={(e) => setFiscalDocumentType(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Número da NF</Label>
                  <Input
                    placeholder="Ex: 10423"
                    value={fiscalDocumentNumber}
                    onChange={(e) => setFiscalDocumentNumber(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Chave de Acesso NF-e (44 dígitos)</Label>
                <Input
                  placeholder="35260612345678000199550010000012341000012345"
                  value={fiscalDocumentKey}
                  onChange={(e) => setFiscalDocumentKey(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Observações</Label>
              <Textarea
                placeholder="Instruções de manuseio ou transporte..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateShipment} disabled={savingShipment}>
              {savingShipment ? 'Salvando...' : 'Cadastrar Carga'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- MODAL 2: CONFERÊNCIA DE VOLUMES (U6) --- */}
      <Dialog open={conferenceModalOpen} onOpenChange={setConferenceModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Conferência de Volumes — Carga {selectedShipment?.code}</DialogTitle>
            <DialogDescription>
              Confira os volumes físicos, registre divergências/avarias ou adicione novos volumes.
            </DialogDescription>
          </DialogHeader>

          {selectedShipment && (
            <div className="space-y-4 py-2 max-h-[65vh] overflow-y-auto pr-1 text-xs">
              {/* Adicionar Volume Inline */}
              <div className="border rounded-lg p-3 bg-muted/20 space-y-3">
                <h4 className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                  <Plus className="size-3.5" />
                  <span>Adicionar Volume</span>
                </h4>
                <div className="grid grid-cols-4 gap-2">
                  <Input
                    placeholder="Código (Ex: VOL-01)"
                    value={volumeForm.code}
                    onChange={(e) => setVolumeForm({ ...volumeForm, code: e.target.value.toUpperCase() })}
                    className="h-8 text-xs"
                  />
                  <Input
                    placeholder="Descrição"
                    value={volumeForm.description}
                    onChange={(e) => setVolumeForm({ ...volumeForm, description: e.target.value })}
                    className="h-8 text-xs"
                  />
                  <Input
                    placeholder="Peso (kg)"
                    type="number"
                    value={volumeForm.weight}
                    onChange={(e) => setVolumeForm({ ...volumeForm, weight: e.target.value })}
                    className="h-8 text-xs"
                  />
                  <Input
                    placeholder="Volume (m³)"
                    type="number"
                    value={volumeForm.volume}
                    onChange={(e) => setVolumeForm({ ...volumeForm, volume: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="flex justify-end">
                  <Button size="sm" variant="secondary" onClick={handleAddVolume} disabled={savingVolume} className="h-7 text-xs">
                    {savingVolume ? 'Adicionando...' : 'Adicionar Volume'}
                  </Button>
                </div>
              </div>

              {/* Lista de Volumes para Conferência */}
              <div className="space-y-2">
                <h4 className="font-semibold text-xs text-foreground">
                  Volumes Cadastrados ({selectedShipment.volumes.length})
                </h4>
                {selectedShipment.volumes.length === 0 ? (
                  <p className="text-muted-foreground italic">Nenhum volume cadastrado para esta carga.</p>
                ) : (
                  selectedShipment.volumes.map((vol) => (
                    <div key={vol.id} className="p-3 border rounded-lg bg-card space-y-2">
                      <div className="flex items-center justify-between font-medium">
                        <span>{vol.code} • {vol.description || 'Volume padrão'}</span>
                        <div className="flex items-center gap-2">
                          <Select
                            value={volumeDrafts[vol.id]?.status ?? vol.status}
                            onValueChange={(val: any) =>
                              setVolumeDrafts((prev) => ({
                                ...prev,
                                [vol.id]: {
                                  status: val,
                                  note: prev[vol.id]?.note || '',
                                },
                              }))
                            }
                          >
                            <SelectTrigger className="h-7 text-xs w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PENDING">Pendente</SelectItem>
                              <SelectItem value="CONFERRED">Conferido OK</SelectItem>
                              <SelectItem value="DIVERGENT">Divergente</SelectItem>
                              <SelectItem value="DAMAGED">Avariado</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <Input
                        placeholder="Observações da conferência deste volume..."
                        value={volumeDrafts[vol.id]?.note ?? ''}
                        onChange={(e) =>
                          setVolumeDrafts((prev) => ({
                            ...prev,
                            [vol.id]: {
                              status: prev[vol.id]?.status ?? 'PENDING',
                              note: e.target.value,
                            },
                          }))
                        }
                        className="h-7 text-xs"
                      />
                    </div>
                  ))
                )}
              </div>

              {/* Notas e Opção de Promover */}
              <div className="space-y-3 pt-2 border-t">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Observação Geral da Conferência</Label>
                  <Textarea
                    placeholder="Resumo geral da conferência..."
                    value={conferenceNotes}
                    onChange={(e) => setConferenceNotes(e.target.value)}
                    rows={2}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="markReady"
                    checked={markReadyToRoute}
                    onCheckedChange={(checked) => setMarkReadyToRoute(Boolean(checked))}
                  />
                  <Label htmlFor="markReady" className="text-xs cursor-pointer">
                    Promover automaticamente para status &quot;Pronta para Rota&quot; se volumes conferidos
                  </Label>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setConferenceModalOpen(false)}>
              Fechar
            </Button>
            <Button onClick={handleSaveConference} disabled={savingConference}>
              {savingConference ? 'Salvando...' : 'Salvar Conferência'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- MODAL 3: DETALHES DA CARGA (U6) --- */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Carga — {selectedShipment?.code}</DialogTitle>
            <DialogDescription>
              Status: {selectedShipment?.status} • Cliente: {selectedShipment?.clientName || 'Geral'}
            </DialogDescription>
          </DialogHeader>

          {selectedShipment && (
            <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-1 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-muted/20 rounded-lg border">
                <div>
                  <span className="text-muted-foreground block">Destinatário:</span>
                  <span className="font-semibold text-foreground">{selectedShipment.recipientName || 'Não informado'}</span>
                  <span className="text-muted-foreground block mt-1">Doc: {selectedShipment.recipientDocument || 'N/I'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Documento Fiscal:</span>
                  <span className="font-semibold text-foreground">{selectedShipment.fiscalDocumentType} {selectedShipment.fiscalDocumentNumber || ''}</span>
                  <span className="text-muted-foreground block mt-1 truncate" title={selectedShipment.fiscalDocumentKey || ''}>
                    Chave: {selectedShipment.fiscalDocumentKey || 'Não informada'}
                  </span>
                </div>
              </div>

              {/* Ocorrências */}
              <div>
                <h4 className="font-semibold text-sm mb-2 text-foreground">Histórico de Ocorrências</h4>
                {selectedShipment.occurrences && selectedShipment.occurrences.length > 0 ? (
                  <div className="space-y-2">
                    {selectedShipment.occurrences.map((occ) => (
                      <div key={occ.id} className="p-3 border rounded-lg bg-card space-y-1">
                        <div className="flex justify-between font-medium">
                          <span className="text-destructive font-semibold">{occ.occurrenceType}</span>
                          <span className="text-muted-foreground">{new Date(occ.createdAt).toLocaleDateString('pt-BR')}</span>
                        </div>
                        <p className="text-foreground">{occ.description}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground italic">Nenhuma ocorrência registrada nesta carga.</p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailModalOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
