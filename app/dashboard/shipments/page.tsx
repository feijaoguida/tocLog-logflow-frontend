'use client'

import { useEffect, useMemo, useState } from 'react'
import { PackageCheck, PackageOpen, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'

import { MenuFunctionHeader } from '@/components/layout/menu-function-header'
import { WorkspaceStateCard } from '@/components/layout/workspace-state-card'
import { useAuth } from '@/context/auth-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  if (!trimmed) {
    return undefined
  }

  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null
  }

  return parsed
}

function getShipmentReadinessIssues(shipment: ShipmentRecord) {
  const issues: string[] = []

  if (!shipment.recipientName?.trim()) {
    issues.push('Destinatário não informado')
  }

  if (!shipment.recipientDocument?.trim()) {
    issues.push('Documento do destinatário ausente')
  }

  if (!shipment.fiscalDocumentType?.trim()) {
    issues.push('Tipo fiscal ausente')
  }

  if (!shipment.fiscalDocumentNumber?.trim()) {
    issues.push('Número fiscal ausente')
  }

  if (!shipment.fiscalDocumentKey?.trim()) {
    issues.push('Chave fiscal ausente')
  }

  return issues
}

export default function ShipmentsPage() {
  const { hasPermission } = useAuth()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [savingShipment, setSavingShipment] = useState(false)
  const [savingVolume, setSavingVolume] = useState(false)
  const [savingConference, setSavingConference] = useState(false)
  const [shipments, setShipments] = useState<ShipmentRecord[]>([])
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null)
  const [conferenceNotes, setConferenceNotes] = useState('')
  const [markReadyToRoute, setMarkReadyToRoute] = useState(true)
  const [volumeDrafts, setVolumeDrafts] = useState<Record<string, VolumeConferenceDraft>>({})
  const [volumeForm, setVolumeForm] = useState(EMPTY_VOLUME_FORM)

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
  const canViewCargo = hasPermission('shipments.cargo.view')
  const canManageCargo = hasPermission('shipments.cargo.create')

  useEffect(() => {
    if (!canViewCargo) {
      setLoading(false)
      return
    }

    void loadShipments()
  }, [canViewCargo])

  const selectedShipment = useMemo(
    () => shipments.find((shipment) => shipment.id === selectedShipmentId) ?? null,
    [shipments, selectedShipmentId],
  )

  useEffect(() => {
    if (!selectedShipment) {
      setConferenceNotes('')
      setVolumeDrafts({})
      return
    }

    const nextDrafts: Record<string, VolumeConferenceDraft> = {}

    for (const volume of selectedShipment.volumes) {
      nextDrafts[volume.id] = {
        status:
          volume.status === 'CANCELLED'
            ? 'PENDING'
            : volume.status,
        note: volume.metadata?.conferenceNote ?? '',
      }
    }

    setVolumeDrafts(nextDrafts)
    setConferenceNotes('')
  }, [selectedShipmentId, selectedShipment])

  async function loadShipments(showLoadingState = true) {
    if (showLoadingState) {
      setLoading(true)
    } else {
      setRefreshing(true)
    }

    try {
      setLoadError(null)
      const { data } = await api.get<ShipmentRecord[]>('/shipments')
      setShipments(data)
      setSelectedShipmentId((current) =>
        current && data.some((shipment) => shipment.id === current)
          ? current
          : data[0]?.id ?? null,
      )
    } catch (error) {
      const message = getApiErrorMessage(error, 'Não foi possível carregar as cargas.')
      setLoadError(message)
      if (showLoadingState) {
        setShipments([])
        setSelectedShipmentId(null)
      }
      toast.error(message)
    } finally {
      if (showLoadingState) {
        setLoading(false)
      } else {
        setRefreshing(false)
      }
    }
  }

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
      toast.success('Carga criada com sucesso.')
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
      await loadShipments()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível criar a carga.'))
    } finally {
      setSavingShipment(false)
    }
  }

  async function handleAddVolume() {
    if (!selectedShipment) {
      toast.error('Selecione uma carga antes de adicionar volumes.')
      return
    }

    if (!volumeForm.code.trim()) {
      toast.error('Informe o código do volume antes de salvar.')
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
      toast.success('Volume adicionado com sucesso.')
      setVolumeForm(EMPTY_VOLUME_FORM)
      await loadShipments()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível adicionar o volume.'))
    } finally {
      setSavingVolume(false)
    }
  }

  async function handleConferenceShipment() {
    if (!selectedShipment) {
      toast.error('Selecione uma carga antes de concluir a conferência.')
      return
    }

    if (selectedShipment.volumes.length === 0) {
      toast.error('Cadastre ao menos um volume antes de conferir a carga.')
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
      toast.success('Conferência registrada com sucesso.')
      await loadShipments()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível concluir a conferência da carga.'))
    } finally {
      setSavingConference(false)
    }
  }

  function setVolumeDraft(
    volumeId: string,
    patch: Partial<VolumeConferenceDraft>,
  ) {
    setVolumeDrafts((current) => ({
      ...current,
      [volumeId]: {
        status: current[volumeId]?.status ?? 'PENDING',
        note: current[volumeId]?.note ?? '',
        ...patch,
      },
    }))
  }

  const summary = {
    total: shipments.length,
    ready: shipments.filter((shipment) => shipment.status === 'READY_TO_ROUTE').length,
    issues: shipments.filter((shipment) => ['DIVERGENT', 'DAMAGED'].includes(shipment.status)).length,
  }

  return (
    <div className="app-page">
      <MenuFunctionHeader
        title="Cargas e Rotas > Cargas"
        description="Entrada, conferência e liberação operacional das cargas antes da montagem de rota."
        actions={
          <div className="flex items-center gap-2">
            {canManageCargo ? (
              <Badge variant="outline" className="rounded-full px-4 py-2">
                Operação logística
              </Badge>
            ) : (
              <Badge variant="outline" className="rounded-full px-4 py-2">
                Modo leitura
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={() => void loadShipments(false)} disabled={loading || refreshing}>
              {refreshing ? 'Atualizando...' : 'Atualizar leitura'}
            </Button>
          </div>
        }
      />

      {!canViewCargo ? (
        <WorkspaceStateCard title="Acesso restrito">
          <p>Este perfil não pode visualizar a workspace de cargas.</p>
        </WorkspaceStateCard>
      ) : (
        <>
      {canViewCargo && !canManageCargo ? (
        <WorkspaceStateCard title="Modo leitura" tone="warning">
          <p>
            Este perfil pode revisar cargas, volumes, ocorrências e a prontidão documental da
            operação, mas não pode criar carga, adicionar volume nem alterar a conferência.
          </p>
          <p>
            Use esta tela como trilha operacional de acompanhamento e acione um perfil com gestão
            quando for preciso registrar carga nova ou mudar a preparação para despacho.
          </p>
        </WorkspaceStateCard>
      ) : null}

      {loadError ? (
        <WorkspaceStateCard
          title="Falha de leitura"
          tone="danger"
          actions={
            <Button variant="outline" onClick={() => void loadShipments(false)} disabled={refreshing}>
              {refreshing ? 'Atualizando...' : 'Tentar novamente'}
            </Button>
          }
        >
          <p>{loadError}</p>
        </WorkspaceStateCard>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="app-section-card">
          <CardHeader>
            <CardDescription>Total de cargas</CardDescription>
            <CardTitle className="text-3xl">{summary.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="app-section-card">
          <CardHeader>
            <CardDescription>Prontas para rota</CardDescription>
            <CardTitle className="text-3xl">{summary.ready}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="app-section-card">
          <CardHeader>
            <CardDescription>Com divergência ou avaria</CardDescription>
            <CardTitle className="text-3xl">{summary.issues}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <Card className="app-section-card">
          <CardHeader>
            <CardTitle className="text-xl">Cargas cadastradas</CardTitle>
            <CardDescription>
              Selecione uma carga para cadastrar volumes, conferir e registrar divergências.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-2xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Prontidão documental</TableHead>
                    <TableHead>Volumes</TableHead>
                    <TableHead>Ocorrências</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 4 }).map((_, index) => (
                      <TableRow key={index}>
                        <TableCell colSpan={7}>
                          <Skeleton className="h-8 w-full rounded-xl" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : shipments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                        Nenhuma carga cadastrada neste tenant.
                      </TableCell>
                    </TableRow>
                  ) : (
                    shipments.map((shipment) => {
                      const readinessIssues = getShipmentReadinessIssues(shipment)

                      return (
                        <TableRow
                          key={shipment.id}
                          className={shipment.id === selectedShipmentId ? 'bg-muted/40' : ''}
                          onClick={() => setSelectedShipmentId(shipment.id)}
                        >
                          <TableCell className="font-medium">{shipment.code}</TableCell>
                          <TableCell>{shipment.sourceReference || shipment.sourceType || 'MANUAL'}</TableCell>
                          <TableCell>{shipment.clientName || 'Não informado'}</TableCell>
                          <TableCell>
                            <Badge variant={getShipmentBadgeVariant(shipment.status)}>
                              {shipment.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-2">
                              <Badge variant={readinessIssues.length === 0 ? 'success' : 'warning'}>
                                {readinessIssues.length === 0 ? 'Pronta para despacho' : `${readinessIssues.length} pendência(s)`}
                              </Badge>
                              <div className="text-xs text-muted-foreground">
                                {readinessIssues.length === 0 ? 'Destinatário e base fiscal preenchidos.' : readinessIssues[0]}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{shipment.volumes.length}</TableCell>
                          <TableCell>{shipment.occurrences.length}</TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="app-section-card">
            <CardHeader>
              <CardTitle className="text-xl">
                {canManageCargo ? 'Nova carga manual' : 'Acesso de visualização'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {canManageCargo ? (
                <>
              <div className="field-stack">
                <Label htmlFor="shipment-code">Código</Label>
                <Input id="shipment-code" value={code} onChange={(event) => setCode(event.target.value)} placeholder="SHIP-0001" />
              </div>

              <div className="field-stack">
                <Label htmlFor="shipment-source-type">Origem</Label>
                <Input id="shipment-source-type" value={sourceType} onChange={(event) => setSourceType(event.target.value)} placeholder="MANUAL / ERP / NOTFIS" />
              </div>

              <div className="field-stack">
                <Label htmlFor="shipment-source-reference">Referência</Label>
                <Input id="shipment-source-reference" value={sourceReference} onChange={(event) => setSourceReference(event.target.value)} placeholder="Pedido, NF-e ou importação" />
              </div>

              <div className="field-stack">
                <Label htmlFor="shipment-client">Cliente</Label>
                <Input id="shipment-client" value={clientName} onChange={(event) => setClientName(event.target.value)} />
              </div>

              <div className="field-stack">
                <Label htmlFor="shipment-recipient">Destinatário</Label>
                <Input id="shipment-recipient" value={recipientName} onChange={(event) => setRecipientName(event.target.value)} />
              </div>

              <div className="field-stack">
                <Label htmlFor="shipment-recipient-document">Documento do destinatário</Label>
                <Input
                  id="shipment-recipient-document"
                  value={recipientDocument}
                  onChange={(event) => setRecipientDocument(event.target.value)}
                  placeholder="CPF / CNPJ / documento interno"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="field-stack">
                  <Label htmlFor="shipment-fiscal-type">Tipo de documento fiscal</Label>
                  <Input
                    id="shipment-fiscal-type"
                    value={fiscalDocumentType}
                    onChange={(event) => setFiscalDocumentType(event.target.value)}
                    placeholder="NFE / CTE / MDFE"
                  />
                </div>
                <div className="field-stack">
                  <Label htmlFor="shipment-fiscal-number">Número do documento</Label>
                  <Input
                    id="shipment-fiscal-number"
                    value={fiscalDocumentNumber}
                    onChange={(event) => setFiscalDocumentNumber(event.target.value)}
                    placeholder="123456"
                  />
                </div>
              </div>

              <div className="field-stack">
                <Label htmlFor="shipment-fiscal-key">Chave fiscal</Label>
                <Input
                  id="shipment-fiscal-key"
                  value={fiscalDocumentKey}
                  onChange={(event) => setFiscalDocumentKey(event.target.value)}
                  placeholder="Chave NF-e / CT-e"
                />
              </div>

              <div className="field-stack">
                <Label htmlFor="shipment-fiscal-issued-at">Emissão do documento</Label>
                <Input
                  id="shipment-fiscal-issued-at"
                  type="datetime-local"
                  value={fiscalDocumentIssuedAt}
                  onChange={(event) => setFiscalDocumentIssuedAt(event.target.value)}
                />
              </div>

              <div className="field-stack">
                <Label htmlFor="shipment-notes">Observações</Label>
                <Textarea id="shipment-notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
              </div>

              <Button onClick={handleCreateShipment} disabled={savingShipment} className="w-full">
                {savingShipment ? 'Salvando...' : 'Criar carga'}
              </Button>
                </>
              ) : (
                <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
                  Este perfil pode revisar cargas, volumes, status e ocorrências, mas não abrir novas cargas nem concluir conferências.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="app-section-card">
            <CardHeader>
              <CardTitle className="text-xl">Workspace de conferência</CardTitle>
              <CardDescription>
                {selectedShipment
                  ? `Carga selecionada: ${selectedShipment.code}`
                  : 'Selecione uma carga na tabela para iniciar a conferência.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!selectedShipment ? (
                <div className="flex min-h-40 items-center justify-center rounded-2xl border border-dashed text-sm text-muted-foreground">
                  Escolha uma carga para cadastrar volumes e conferir a entrada.
                </div>
              ) : (
                <>
                  <div className="grid gap-3 rounded-2xl border p-4 md:grid-cols-2">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Cliente</p>
                      <p className="font-medium">{selectedShipment.clientName || 'Não informado'}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Destinatário</p>
                      <p className="font-medium">{selectedShipment.recipientName || 'Não informado'}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Status atual</p>
                      <div className="mt-1">
                        <Badge variant={getShipmentBadgeVariant(selectedShipment.status)}>
                          {selectedShipment.status}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Volumes / ocorrências</p>
                      <p className="font-medium">
                        {selectedShipment.volumes.length} volumes • {selectedShipment.occurrences.length} ocorrências
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Documento fiscal</p>
                      <p className="font-medium">
                        {selectedShipment.fiscalDocumentType || 'Sem tipo'} • {selectedShipment.fiscalDocumentNumber || 'Sem número'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Chave / destinatário</p>
                      <p className="font-medium">
                        {selectedShipment.fiscalDocumentKey || 'Sem chave'} • {selectedShipment.recipientDocument || 'Sem documento'}
                      </p>
                    </div>
                  </div>

                  {getShipmentReadinessIssues(selectedShipment).length > 0 ? (
                    <div className="rounded-2xl border border-amber-500/40 bg-amber-50/60 p-4">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4 text-amber-700" />
                        <p className="font-medium text-amber-950">Pendências antes do despacho</p>
                      </div>
                      <p className="mt-2 text-sm text-amber-950/80">
                        Esta carga ainda não está documentalmente pronta para políticas que exigem destinatário e base fiscal antes da saída.
                      </p>
                      <ul className="mt-3 space-y-2 text-sm text-amber-950/80">
                        {getShipmentReadinessIssues(selectedShipment).map((issue) => (
                          <li key={issue}>• {issue}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-50/60 p-4">
                      <div className="flex items-center gap-2">
                        <PackageCheck className="h-4 w-4 text-emerald-700" />
                        <p className="font-medium text-emerald-950">Base documental pronta</p>
                      </div>
                      <p className="mt-2 text-sm text-emerald-950/80">
                        Destinatário, documento de recepção e dados fiscais mínimos já estão preenchidos para a leitura operacional da saída.
                      </p>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <PackageOpen className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-semibold">Adicionar volume</h3>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="field-stack">
                        <Label htmlFor="volume-code">Código do volume</Label>
                        <Input
                          id="volume-code"
                          value={volumeForm.code}
                          onChange={(event) => setVolumeForm((current) => ({ ...current, code: event.target.value }))}
                          placeholder="VOL-0001"
                          disabled={!canManageCargo}
                        />
                      </div>
                      <div className="field-stack">
                        <Label htmlFor="volume-description">Descrição</Label>
                        <Input
                          id="volume-description"
                          value={volumeForm.description}
                          onChange={(event) => setVolumeForm((current) => ({ ...current, description: event.target.value }))}
                          placeholder="Caixa / pallet / item"
                          disabled={!canManageCargo}
                        />
                      </div>
                      <div className="field-stack">
                        <Label htmlFor="volume-weight">Peso (kg)</Label>
                        <Input
                          id="volume-weight"
                          type="number"
                          value={volumeForm.weight}
                          onChange={(event) => setVolumeForm((current) => ({ ...current, weight: event.target.value }))}
                          disabled={!canManageCargo}
                        />
                      </div>
                      <div className="field-stack">
                        <Label htmlFor="volume-cubage">Cubagem (m³)</Label>
                        <Input
                          id="volume-cubage"
                          type="number"
                          value={volumeForm.volume}
                          onChange={(event) => setVolumeForm((current) => ({ ...current, volume: event.target.value }))}
                          disabled={!canManageCargo}
                        />
                      </div>
                    </div>
                    {canManageCargo ? (
                      <Button onClick={handleAddVolume} disabled={savingVolume}>
                        {savingVolume ? 'Salvando volume...' : 'Adicionar volume'}
                      </Button>
                    ) : (
                      <div className="rounded-2xl border border-dashed p-3 text-sm text-muted-foreground">
                        Este perfil não pode adicionar volumes.
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <PackageCheck className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-semibold">Conferir volumes</h3>
                    </div>

                    {selectedShipment.volumes.length === 0 ? (
                      <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
                        Cadastre volumes para liberar a conferência desta carga.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {selectedShipment.volumes.map((volume) => (
                          <div key={volume.id} className="rounded-2xl border p-4">
                            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
                              <div className="space-y-2">
                                <div className="font-medium">{volume.code}</div>
                                <div className="text-sm text-muted-foreground">
                                  {volume.description || 'Sem descrição'} • {Number(volume.weight || 0)} kg • {Number(volume.volume || 0)} m³
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Status atual: {volume.status}
                                </div>
                                <div className="field-stack">
                                  <Label>Observação da conferência</Label>
                                  <Textarea
                                    value={volumeDrafts[volume.id]?.note || ''}
                                    onChange={(event) =>
                                      setVolumeDraft(volume.id, { note: event.target.value })
                                    }
                                    placeholder="Descreva divergência, avaria ou observação operacional."
                                    rows={3}
                                    disabled={!canManageCargo}
                                  />
                                </div>
                              </div>

                              <div className="field-stack">
                                <Label>Resultado</Label>
                                <Select
                                  value={volumeDrafts[volume.id]?.status || 'PENDING'}
                                  onValueChange={(value: ShipmentVolumeRecord['status']) =>
                                    setVolumeDraft(volume.id, { status: value })
                                  }
                                  disabled={!canManageCargo}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="CONFERRED">Conferido</SelectItem>
                                    <SelectItem value="DIVERGENT">Divergente</SelectItem>
                                    <SelectItem value="DAMAGED">Avariado</SelectItem>
                                    <SelectItem value="PENDING">Pendente</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                        ))}

                        <div className="rounded-2xl border p-4 space-y-4">
                          <div className="field-stack">
                            <Label htmlFor="conference-notes">Observação geral da conferência</Label>
                            <Textarea
                              id="conference-notes"
                              value={conferenceNotes}
                              onChange={(event) => setConferenceNotes(event.target.value)}
                              placeholder="Resumo da conferência, pendências ou liberação especial."
                              rows={3}
                              disabled={!canManageCargo}
                            />
                          </div>

                          <div className="field-stack">
                            <Label>Liberar para rota após conferência</Label>
                            <Select
                              value={markReadyToRoute ? 'yes' : 'no'}
                              onValueChange={(value) => setMarkReadyToRoute(value === 'yes')}
                              disabled={!canManageCargo}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="yes">Sim, marcar como READY_TO_ROUTE se não houver pendência</SelectItem>
                                <SelectItem value="no">Não, manter apenas como CONFERRED</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {canManageCargo ? (
                            <Button onClick={handleConferenceShipment} disabled={savingConference}>
                              {savingConference ? 'Concluindo conferência...' : 'Concluir conferência'}
                            </Button>
                          ) : (
                            <div className="rounded-2xl border border-dashed p-3 text-sm text-muted-foreground">
                              Este perfil pode revisar a conferência, mas não registrar o resultado.
                            </div>
                          )}
                        </div>

                        {selectedShipment.occurrences.length > 0 ? (
                          <div className="rounded-2xl border p-4 space-y-3">
                            <div className="flex items-center gap-2">
                              <ShieldAlert className="h-4 w-4 text-amber-600" />
                              <h3 className="font-semibold">Ocorrências recentes</h3>
                            </div>
                            <div className="space-y-3">
                              {selectedShipment.occurrences.slice(0, 5).map((occurrence) => (
                                <div key={occurrence.id} className="rounded-xl bg-muted/40 p-3">
                                  <div className="flex items-center justify-between gap-3">
                                    <span className="text-sm font-medium">{occurrence.occurrenceType}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {new Intl.DateTimeFormat('pt-BR', {
                                        dateStyle: 'short',
                                        timeStyle: 'short',
                                      }).format(new Date(occurrence.createdAt))}
                                    </span>
                                  </div>
                                  <p className="mt-1 text-sm text-muted-foreground">{occurrence.description}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
        </>
      )}
    </div>
  )
}

function getShipmentBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'DIVERGENT' || status === 'DAMAGED') {
    return 'destructive'
  }

  if (status === 'READY_TO_ROUTE' || status === 'DELIVERED') {
    return 'default'
  }

  if (status === 'CONFERRED' || status === 'RECEIVED') {
    return 'outline'
  }

  return 'secondary'
}
