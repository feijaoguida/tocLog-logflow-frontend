'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft,
  Calendar,
  FileCheck,
  FileText,
  Gauge,
  Plus,
  ShieldAlert,
  User,
  Wrench,
  Ban,
  AlertTriangle,
  RotateCw,
} from 'lucide-react'
import { toast } from 'sonner'

import { WorkspaceStateCard } from '@/components/layout/workspace-state-card'
import { useAuth } from '@/context/auth-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
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
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'

interface ResourceDetail {
  id: string
  origin: 'INTERNAL' | 'EXTERNAL'
  plate: string
  brand?: string | null
  model?: string | null
  year?: number | null
  color?: string | null
  fuelType?: string
  currentKm: number
  capacityKg?: number
  status: string
  branch?: { id: string; name: string } | null
  department?: { id: string; name: string } | null
  driver?: { id: string; name: string; cpf?: string; phone?: string } | null
  documents: Array<{
    id: string
    type: string
    documentNumber?: string
    status: string
    issuedAt?: string
    expiresAt?: string
    notes?: string
  }>
  fines: Array<{
    id: string
    infractionCode?: string
    description: string
    amount: number
    infractionDate: string
    dueDate?: string
    status: string
  }>
  blocks?: Array<{
    id: string
    reason: string
    type: string
    startDate: string
    endDate?: string
  }>
  maintenances?: Array<{
    id: string
    type: string
    description: string
    status: string
    startDate: string
  }>
  checklists?: Array<{
    id: string
    status: string
    createdAt: string
  }>
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  AVAILABLE: {
    label: 'Disponível',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60',
  },
  ATIVO: {
    label: 'Ativo',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60',
  },
  IN_USE: {
    label: 'Em uso',
    className: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900/60',
  },
  MAINTENANCE: {
    label: 'Em manutenção',
    className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60',
  },
  BLOCKED: {
    label: 'Bloqueado',
    className: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60',
  },
  PENDENTE_APROVACAO: {
    label: 'Pendente Aprovação',
    className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60',
  },
  SUSPENSO: {
    label: 'Suspenso',
    className: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60',
  },
}

export default function VehicleDetailsPage() {
  const { hasPermission } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const params = useParams<{ id: string }>()
  const resourceId = Array.isArray(params?.id) ? params.id[0] : params?.id
  const originParam = (searchParams.get('origin')?.toUpperCase() === 'EXTERNAL' ? 'EXTERNAL' : 'INTERNAL') as 'INTERNAL' | 'EXTERNAL'

  const canViewVehicles = hasPermission('fleet.vehicles.view')
  const canManageVehicles = hasPermission('fleet.vehicles.manage')
  const canViewDocs = hasPermission('fleet.documents.view')
  const canManageDocs = hasPermission('fleet.documents.manage')
  const canViewFines = hasPermission('fleet.fines.view')
  const canManageFines = hasPermission('fleet.fines.manage')

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [resource, setResource] = useState<ResourceDetail | null>(null)

  // Document modal state
  const [openDocModal, setOpenDocModal] = useState(false)
  const [submittingDoc, setSubmittingDoc] = useState(false)
  const [docType, setDocType] = useState('CRLV')
  const [docNumber, setDocNumber] = useState('')
  const [docExpiresAt, setDocExpiresAt] = useState('')

  // Fine modal state
  const [openFineModal, setOpenFineModal] = useState(false)
  const [submittingFine, setSubmittingFine] = useState(false)
  const [fineCode, setFineCode] = useState('')
  const [fineDesc, setFineDesc] = useState('')
  const [fineAmount, setFineAmount] = useState('195.23')
  const [fineDate, setFineDate] = useState(new Date().toISOString().substring(0, 10))

  // KM modal state
  const [openKmModal, setOpenKmModal] = useState(false)
  const [newKmValue, setNewKmValue] = useState('')
  const [submittingKm, setSubmittingKm] = useState(false)

  useEffect(() => {
    if (!canViewVehicles || !resourceId) {
      setLoading(false)
      return
    }

    void loadResourceDetail()
  }, [canViewVehicles, resourceId, originParam])

  async function loadResourceDetail(showLoadingState = true) {
    if (!resourceId) return

    if (showLoadingState) setLoading(true)
    else setRefreshing(true)

    try {
      setLoadError(null)
      const { data } = await api.get<ResourceDetail>(`/fleet/resources/${originParam}/${resourceId}`)
      setResource(data)
    } catch (error) {
      const message = getApiErrorMessage(error, 'Não foi possível carregar os detalhes do veículo.')
      setLoadError(message)
      setResource(null)
      toast.error(message)
    } finally {
      if (showLoadingState) setLoading(false)
      else setRefreshing(false)
    }
  }

  async function handleCreateDoc(e: React.FormEvent) {
    e.preventDefault()
    if (!docType || !resource) return

    setSubmittingDoc(true)
    try {
      await api.post('/fleet/vehicle-documents', {
        vehicleId: resource.origin === 'INTERNAL' ? resource.id : undefined,
        externalVehicleId: resource.origin === 'EXTERNAL' ? resource.id : undefined,
        type: docType,
        documentNumber: docNumber.trim() || undefined,
        expiresAt: docExpiresAt ? new Date(docExpiresAt).toISOString() : undefined,
      })

      toast.success('Documento cadastrado com sucesso!')
      setOpenDocModal(false)
      setDocNumber('')
      setDocExpiresAt('')
      void loadResourceDetail(false)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Falha ao cadastrar documento.'))
    } finally {
      setSubmittingDoc(false)
    }
  }

  async function handleCreateFine(e: React.FormEvent) {
    e.preventDefault()
    if (!fineDesc || !resource) return

    setSubmittingFine(true)
    try {
      await api.post('/fleet/vehicle-fines', {
        vehicleId: resource.origin === 'INTERNAL' ? resource.id : undefined,
        externalVehicleId: resource.origin === 'EXTERNAL' ? resource.id : undefined,
        infractionCode: fineCode.trim() || undefined,
        description: fineDesc.trim(),
        amount: parseFloat(fineAmount) || 0,
        infractionDate: new Date(fineDate).toISOString(),
      })

      toast.success('Multa lançada com sucesso!')
      setOpenFineModal(false)
      setFineCode('')
      setFineDesc('')
      void loadResourceDetail(false)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Falha ao registrar multa.'))
    } finally {
      setSubmittingFine(false)
    }
  }

  async function handleUpdateKm(e: React.FormEvent) {
    e.preventDefault()
    if (!resource) return
    const parsedKm = parseInt(newKmValue, 10)
    if (isNaN(parsedKm) || parsedKm < resource.currentKm) {
      toast.error(`A quilometragem deve ser um número maior ou igual ao odômetro atual (${resource.currentKm} km).`)
      return
    }

    setSubmittingKm(true)
    try {
      await api.patch(`/fleet/resources/${resource.origin}/${resource.id}/km`, {
        km: parsedKm,
      })
      toast.success('Odômetro atualizado com sucesso!')
      setOpenKmModal(false)
      void loadResourceDetail(false)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Falha ao atualizar odômetro.'))
    } finally {
      setSubmittingKm(false)
    }
  }

  if (!canViewVehicles) {
    return (
      <WorkspaceStateCard title="Acesso restrito">
        <p>Seu perfil não possui permissão para visualizar detalhes da frota.</p>
      </WorkspaceStateCard>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-24 w-full rounded-lg" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-[420px] rounded-lg lg:col-span-2" />
          <Skeleton className="h-[420px] rounded-lg" />
        </div>
      </div>
    )
  }

  if (loadError || !resource) {
    return (
      <div className="p-6">
        <WorkspaceStateCard
          title="Veículo não localizado"
          tone="danger"
          actions={
            <Button variant="ghost" onClick={() => router.push('/dashboard/fleet')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para o catálogo
            </Button>
          }
        >
          <p>{loadError || 'O registro solicitado não pertence a este tenant ou foi excluído.'}</p>
        </WorkspaceStateCard>
      </div>
    )
  }

  const statusBadge = STATUS_BADGE[resource.status] || {
    label: resource.status,
    className: 'bg-muted text-muted-foreground',
  }

  return (
    <div className="app-page space-y-6 p-4 md:p-6">
      {/* 1. Header padrão TocLog */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/fleet')}>
              <ArrowLeft className="mr-1 h-4 w-4" />
              Frota
            </Button>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm font-semibold">{resource.plate}</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <span>{resource.plate}</span>
            <Badge className={statusBadge.className}>{statusBadge.label}</Badge>
            <Badge variant="outline">
              {resource.origin === 'INTERNAL' ? 'Frota Própria' : 'Parceiro (Terceiro)'}
            </Badge>
          </h1>
          <p className="text-sm text-muted-foreground">
            {resource.brand ? `${resource.brand} ` : ''}
            {resource.model || 'Sem modelo informado'} • {resource.year || 'Ano N/I'} •{' '}
            {resource.color || 'Cor N/I'} • Odômetro: {resource.currentKm.toLocaleString('pt-BR')} km
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canManageVehicles && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setNewKmValue(resource.currentKm.toString())
                setOpenKmModal(true)
              }}
            >
              <Gauge className="size-4 mr-1" />
              Atualizar KM
            </Button>
          )}

          {canManageDocs && (
            <Button size="sm" variant="outline" onClick={() => setOpenDocModal(true)}>
              <Plus className="size-4 mr-1" />
              + Documento
            </Button>
          )}

          {canManageFines && (
            <Button size="sm" variant="outline" onClick={() => setOpenFineModal(true)}>
              <Plus className="size-4 mr-1" />
              + Multa
            </Button>
          )}

          <Button asChild size="sm" variant="outline">
            <Link href={`/dashboard/fleet/maintenance?vehicleId=${resource.id}`}>
              <Wrench className="size-4 mr-1" />
              Manutenção
            </Link>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadResourceDetail(false)}
            disabled={refreshing}
          >
            <RotateCw className={`size-4 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Atualizando...' : 'Atualizar'}
          </Button>
        </div>
      </section>

      {/* 2. Conteúdo em Abas (Geral, Documentos, Multas, Operação) */}
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-4 md:w-auto">
          <TabsTrigger value="general">Dados Gerais</TabsTrigger>
          <TabsTrigger value="documents">
            Documentos ({resource.documents?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="fines">
            Multas ({resource.fines?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="history">Operação & Histórico</TabsTrigger>
        </TabsList>

        {/* TAB 1: DADOS GERAIS */}
        <TabsContent value="general" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="app-section-card p-4">
              <CardHeader className="p-0 pb-3">
                <CardTitle className="text-base font-semibold">Especificações do Veículo</CardTitle>
              </CardHeader>
              <CardContent className="p-0 space-y-2 text-sm">
                <DetailRow label="Placa" value={resource.plate} />
                <DetailRow label="Marca" value={resource.brand || 'Não informada'} />
                <DetailRow label="Modelo" value={resource.model || 'Não informado'} />
                <DetailRow label="Ano de Fabricação" value={resource.year?.toString() || 'Não informado'} />
                <DetailRow label="Cor Predominante" value={resource.color || 'Não informada'} />
                <DetailRow label="Combustível" value={resource.fuelType || 'Não informado'} />
                <DetailRow
                  label="Capacidade de Carga"
                  value={resource.capacityKg ? `${resource.capacityKg.toLocaleString('pt-BR')} kg` : 'Não informada'}
                />
                <DetailRow
                  label="Odômetro Atual"
                  value={`${resource.currentKm.toLocaleString('pt-BR')} km`}
                />
              </CardContent>
            </Card>

            <Card className="app-section-card p-4">
              <CardHeader className="p-0 pb-3">
                <CardTitle className="text-base font-semibold">Alocação e Vínculos</CardTitle>
              </CardHeader>
              <CardContent className="p-0 space-y-2 text-sm">
                <DetailRow
                  label="Origem Operacional"
                  value={resource.origin === 'INTERNAL' ? 'Frota Própria' : 'Frota Parceira (Terceiro)'}
                />
                {resource.origin === 'INTERNAL' ? (
                  <>
                    <DetailRow label="Filial Vinculada" value={resource.branch?.name || 'Filial Principal'} />
                    <DetailRow label="Departamento" value={resource.department?.name || 'Geral'} />
                  </>
                ) : (
                  <>
                    <DetailRow label="Motorista Parceiro" value={resource.driver?.name || 'Não vinculado'} />
                    <DetailRow label="CPF Motorista" value={resource.driver?.cpf || 'N/A'} />
                    <DetailRow label="Telefone de Contato" value={resource.driver?.phone || 'N/A'} />
                  </>
                )}
                <DetailRow label="Status no Sistema" value={statusBadge.label} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 2: DOCUMENTOS */}
        <TabsContent value="documents" className="mt-4">
          <Card className="app-section-card">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-semibold">Documentos Regulatórios</CardTitle>
                <CardDescription>
                  CRLV, Apólices de Seguro, ANTT e laudos vinculados a este veículo.
                </CardDescription>
              </div>
              {canManageDocs && (
                <Button size="sm" onClick={() => setOpenDocModal(true)}>
                  <Plus className="size-4 mr-1" /> Novo Documento
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Número / Identificador</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Observações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!resource.documents || resource.documents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                          Nenhum documento registrado para este veículo.
                        </TableCell>
                      </TableRow>
                    ) : (
                      resource.documents.map((doc) => (
                        <TableRow key={doc.id}>
                          <TableCell className="font-medium">{doc.type}</TableCell>
                          <TableCell>{doc.documentNumber || 'Não informado'}</TableCell>
                          <TableCell>
                            {doc.expiresAt
                              ? new Date(doc.expiresAt).toLocaleDateString('pt-BR')
                              : 'Indeterminado'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={doc.status === 'VALID' ? 'outline' : 'destructive'}>
                              {doc.status === 'VALID' ? 'Válido' : doc.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {doc.notes || '—'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: MULTAS */}
        <TabsContent value="fines" className="mt-4">
          <Card className="app-section-card">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-semibold">Gestão de Infrações e Multas</CardTitle>
                <CardDescription>
                  Controle de autuações, valores e vencimentos de infrações de trânsito.
                </CardDescription>
              </div>
              {canManageFines && (
                <Button size="sm" onClick={() => setOpenFineModal(true)}>
                  <Plus className="size-4 mr-1" /> Registrar Multa
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Descrição da Infração</TableHead>
                      <TableHead>Data da Ocorrência</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!resource.fines || resource.fines.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                          Nenhuma multa ou infração vinculada a este veículo.
                        </TableCell>
                      </TableRow>
                    ) : (
                      resource.fines.map((fine) => (
                        <TableRow key={fine.id}>
                          <TableCell className="font-medium">{fine.infractionCode || 'S/C'}</TableCell>
                          <TableCell>{fine.description}</TableCell>
                          <TableCell>
                            {new Date(fine.infractionDate).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell className="font-semibold">
                            R$ {Number(fine.amount).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={fine.status === 'PAID' ? 'secondary' : 'outline'}>
                              {fine.status === 'PENDING' ? 'Pendente' : fine.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: OPERAÇÃO & HISTÓRICO */}
        <TabsContent value="history" className="mt-4 space-y-4">
          <Card className="app-section-card p-4">
            <CardHeader className="p-0 pb-3">
              <CardTitle className="text-base font-semibold">Resumo Operacional do Recurso</CardTitle>
            </CardHeader>
            <CardContent className="p-0 grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border p-3 flex items-center gap-3">
                <FileCheck className="size-5 text-sky-600" />
                <div>
                  <div className="text-xs text-muted-foreground">Checklists Realizados</div>
                  <div className="text-lg font-bold">{resource.checklists?.length || 0}</div>
                </div>
              </div>
              <div className="rounded-xl border p-3 flex items-center gap-3">
                <Wrench className="size-5 text-amber-600" />
                <div>
                  <div className="text-xs text-muted-foreground">Manutenções Registradas</div>
                  <div className="text-lg font-bold">{resource.maintenances?.length || 0}</div>
                </div>
              </div>
              <div className="rounded-xl border p-3 flex items-center gap-3">
                <Ban className="size-5 text-destructive" />
                <div>
                  <div className="text-xs text-muted-foreground">Bloqueios Históricos</div>
                  <div className="text-lg font-bold">{resource.blocks?.length || 0}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal: Adicionar Documento */}
      <Dialog open={openDocModal} onOpenChange={setOpenDocModal}>
        <DialogContent className="sm:max-w-[420px]">
          <form onSubmit={handleCreateDoc}>
            <DialogHeader>
              <DialogTitle>Vincular Documento</DialogTitle>
              <DialogDescription>
                Adicionar documento regulatório ao veículo {resource.plate}.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 py-3">
              <div className="space-y-1">
                <Label htmlFor="docType">Tipo do Documento *</Label>
                <Select value={docType} onValueChange={setDocType}>
                  <SelectTrigger id="docType">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CRLV">CRLV</SelectItem>
                    <SelectItem value="SEGURO">Apólice de Seguro</SelectItem>
                    <SelectItem value="ANTT">Registro ANTT</SelectItem>
                    <SelectItem value="CRONOTACOGRAFO">Laudo Cronotacógrafo</SelectItem>
                    <SelectItem value="OUTRO">Outro Documento</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="docNumber">Número do Documento</Label>
                <Input
                  id="docNumber"
                  placeholder="Ex: 123456789"
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="docExpiresAt">Data de Validade / Vencimento</Label>
                <Input
                  id="docExpiresAt"
                  type="date"
                  value={docExpiresAt}
                  onChange={(e) => setDocExpiresAt(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenDocModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submittingDoc}>
                {submittingDoc ? 'Salvando...' : 'Salvar Documento'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Lançar Multa */}
      <Dialog open={openFineModal} onOpenChange={setOpenFineModal}>
        <DialogContent className="sm:max-w-[440px]">
          <form onSubmit={handleCreateFine}>
            <DialogHeader>
              <DialogTitle>Lançar Notificação de Multa</DialogTitle>
              <DialogDescription>
                Registrar infração aplicada ao veículo {resource.plate}.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 py-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="fineCode">Código da Infração</Label>
                  <Input
                    id="fineCode"
                    placeholder="Ex: 745-50"
                    value={fineCode}
                    onChange={(e) => setFineCode(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="fineAmount">Valor (R$) *</Label>
                  <Input
                    id="fineAmount"
                    type="number"
                    step="0.01"
                    value={fineAmount}
                    onChange={(e) => setFineAmount(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="fineDesc">Descrição da Infração *</Label>
                <Input
                  id="fineDesc"
                  placeholder="Ex: Excesso de velocidade acima de 20%"
                  value={fineDesc}
                  onChange={(e) => setFineDesc(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="fineDate">Data da Infração *</Label>
                <Input
                  id="fineDate"
                  type="date"
                  value={fineDate}
                  onChange={(e) => setFineDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenFineModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submittingFine}>
                {submittingFine ? 'Salvando...' : 'Registrar Multa'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Atualizar Quilometragem (KM) */}
      <Dialog open={openKmModal} onOpenChange={setOpenKmModal}>
        <DialogContent className="sm:max-w-[400px]">
          <form onSubmit={handleUpdateKm}>
            <DialogHeader>
              <DialogTitle>Atualizar Odômetro (KM)</DialogTitle>
              <DialogDescription>
                Informe o novo valor do odômetro para o veículo {resource.plate}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="kmValue">Quilometragem Atual (km) *</Label>
                <Input
                  id="kmValue"
                  type="number"
                  min={resource.currentKm}
                  placeholder={`Mínimo: ${resource.currentKm}`}
                  value={newKmValue}
                  onChange={(e) => setNewKmValue(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Odômetro registrado anteriormente: {resource.currentKm.toLocaleString('pt-BR')} km
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenKmModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submittingKm}>
                {submittingKm ? 'Salvando...' : 'Salvar KM'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b pb-1.5 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  )
}
