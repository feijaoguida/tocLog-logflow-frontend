'use client'

import { useEffect, useState } from 'react'
import { RotateCw, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'

type ProcurementSettingsRecord = {
  approvalMode: 'department-manager' | 'delegated-approver' | 'manager-with-hierarchy'
  delegatedApproverId: string | null
  hierarchyThreshold: number
  minimumQuotationCount: number
  allowUrgentQuotationWaiver: boolean
  delegatedApprover: {
    id: string
    name: string
    departmentName: string | null
  } | null
}

type ApproverOption = {
  id: string
  name: string
  departmentName: string | null
}

type DepartmentSettingsRecord = {
  departmentId: string
  departmentName: string
  branchName: string
  headManagerName: string | null
  inheritFromCompany: boolean
  settings: ProcurementSettingsRecord
}

export default function ProcurementSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [approvers, setApprovers] = useState<ApproverOption[]>([])
  const [departmentSettings, setDepartmentSettings] = useState<DepartmentSettingsRecord[]>([])
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('none')
  const [approvalMode, setApprovalMode] =
    useState<ProcurementSettingsRecord['approvalMode']>('department-manager')
  const [delegatedApproverId, setDelegatedApproverId] = useState<string>('none')
  const [hierarchyThreshold, setHierarchyThreshold] = useState('5000')
  const [minimumQuotationCount, setMinimumQuotationCount] = useState('1')
  const [allowUrgentQuotationWaiver, setAllowUrgentQuotationWaiver] = useState(true)
  const [departmentSaving, setDepartmentSaving] = useState(false)
  const [departmentInheritFromCompany, setDepartmentInheritFromCompany] = useState(true)
  const [departmentApprovalMode, setDepartmentApprovalMode] =
    useState<ProcurementSettingsRecord['approvalMode']>('department-manager')
  const [departmentDelegatedApproverId, setDepartmentDelegatedApproverId] = useState<string>('none')
  const [departmentHierarchyThreshold, setDepartmentHierarchyThreshold] = useState('5000')
  const [departmentMinimumQuotationCount, setDepartmentMinimumQuotationCount] = useState('1')
  const [departmentAllowUrgentQuotationWaiver, setDepartmentAllowUrgentQuotationWaiver] = useState(true)

  async function loadSettings() {
    try {
      setLoading(true)
      const [{ data: settings }, { data: approverOptions }, { data: departments }] = await Promise.all([
        api.get<ProcurementSettingsRecord>('/procurement-settings'),
        api.get<ApproverOption[]>('/procurement-settings/approvers'),
        api.get<DepartmentSettingsRecord[]>('/procurement-settings/departments'),
      ])

      setApprovalMode(settings.approvalMode)
      setDelegatedApproverId(settings.delegatedApproverId ?? 'none')
      setHierarchyThreshold(String(settings.hierarchyThreshold))
      setMinimumQuotationCount(String(settings.minimumQuotationCount))
      setAllowUrgentQuotationWaiver(settings.allowUrgentQuotationWaiver)
      setApprovers(approverOptions)
      setDepartmentSettings(departments)
      if (departments.length > 0) {
        setSelectedDepartmentId(departments[0].departmentId)
      }
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, 'Não foi possível carregar as configurações de compras.'),
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadSettings()
  }, [])

  useEffect(() => {
    if (selectedDepartmentId === 'none') {
      return
    }

    const selectedDepartment = departmentSettings.find(
      (department) => department.departmentId === selectedDepartmentId,
    )

    if (!selectedDepartment) {
      return
    }

    setDepartmentInheritFromCompany(selectedDepartment.inheritFromCompany)
    setDepartmentApprovalMode(selectedDepartment.settings.approvalMode)
    setDepartmentDelegatedApproverId(selectedDepartment.settings.delegatedApproverId ?? 'none')
    setDepartmentHierarchyThreshold(String(selectedDepartment.settings.hierarchyThreshold))
    setDepartmentMinimumQuotationCount(String(selectedDepartment.settings.minimumQuotationCount))
    setDepartmentAllowUrgentQuotationWaiver(
      selectedDepartment.settings.allowUrgentQuotationWaiver,
    )
  }, [departmentSettings, selectedDepartmentId])

  async function handleSave() {
    setSaving(true)

    try {
      await api.patch('/procurement-settings', {
        approvalMode,
        delegatedApproverId:
          approvalMode === 'delegated-approver' && delegatedApproverId !== 'none'
            ? delegatedApproverId
            : null,
        hierarchyThreshold: Number(hierarchyThreshold || 0),
        minimumQuotationCount: Number(minimumQuotationCount || 1),
        allowUrgentQuotationWaiver,
      })
      toast.success('Configurações de compras atualizadas com sucesso.')
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, 'Não foi possível salvar as configurações de compras.'),
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleDepartmentSave() {
    if (selectedDepartmentId === 'none') {
      toast.error('Selecione um departamento para configurar.')
      return
    }

    setDepartmentSaving(true)

    try {
      await api.patch(`/procurement-settings/departments/${selectedDepartmentId}`, {
        inheritFromCompany: departmentInheritFromCompany,
        approvalMode: departmentApprovalMode,
        delegatedApproverId:
          departmentApprovalMode === 'delegated-approver' &&
          departmentDelegatedApproverId !== 'none'
            ? departmentDelegatedApproverId
            : null,
        hierarchyThreshold: Number(departmentHierarchyThreshold || 0),
        minimumQuotationCount: Number(departmentMinimumQuotationCount || 1),
        allowUrgentQuotationWaiver: departmentAllowUrgentQuotationWaiver,
      })

      const { data } = await api.get<DepartmentSettingsRecord[]>(
        '/procurement-settings/departments',
      )
      setDepartmentSettings(data)
      toast.success('Configurações do departamento atualizadas com sucesso.')
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          'Não foi possível salvar as configurações do departamento.',
        ),
      )
    } finally {
      setDepartmentSaving(false)
    }
  }

  const selectedDepartment =
    departmentSettings.find((department) => department.departmentId === selectedDepartmentId) ?? null

  return (
    <div className="app-page space-y-6">
      {/* 1. Cabeçalho Padronizado */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Configurações de Compras
            </h1>
            <span className="inline-flex items-center rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              <ShieldCheck className="size-3 mr-1" />
              Governança Corporativa
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Defina as regras de aprovação, alçadas financeiras, requisitos de cotação e exceções departamentais.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            onClick={() => void loadSettings()}
            disabled={loading}
          >
            <RotateCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </Button>
        </div>
      </section>

      {/* 2. Abas de Configuração */}
      <Tabs defaultValue="approval" className="space-y-6">
        <TabsList className="bg-muted/60 p-1">
          <TabsTrigger value="approval" className="text-xs font-medium">
            Roteamento de Aprovação
          </TabsTrigger>
          <TabsTrigger value="quotations" className="text-xs font-medium">
            Política de Cotações
          </TabsTrigger>
          <TabsTrigger value="departments" className="text-xs font-medium">
            Regras Departamentais
          </TabsTrigger>
        </TabsList>

        {/* Aba 1: Aprovação */}
        <TabsContent value="approval" className="space-y-6">
          <Card className="app-section-card p-6">
            <CardHeader className="p-0 mb-6">
              <CardTitle className="text-lg">Roteamento padrão de requisições</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Define para quem a solicitação de compra é direcionada assim que o solicitante envia o pedido.
              </p>
            </CardHeader>
            <CardContent className="p-0 space-y-5">
              <div className="field-stack max-w-lg">
                <Label htmlFor="approval-mode" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Modo de aprovação
                </Label>
                {loading ? (
                  <Skeleton className="h-9 w-full rounded-md" />
                ) : (
                  <Select
                    value={approvalMode}
                    onValueChange={(value) =>
                      setApprovalMode(value as ProcurementSettingsRecord['approvalMode'])
                    }
                  >
                    <SelectTrigger id="approval-mode" className="h-9 text-sm">
                      <SelectValue placeholder="Selecione o modo de aprovação" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="department-manager">Gestor direto do departamento</SelectItem>
                      <SelectItem value="delegated-approver">Aprovador delegado fixo</SelectItem>
                      <SelectItem value="manager-with-hierarchy">
                        Gestor com escalonamento hierárquico
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
                <p className="text-xs text-muted-foreground">
                  O fluxo operacional do backend valida automaticamente este direcionamento no envio de cada pedido.
                </p>
              </div>

              {approvalMode === 'delegated-approver' && (
                <div className="field-stack max-w-lg">
                  <Label htmlFor="delegated-approver" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Aprovador delegado
                  </Label>
                  {loading ? (
                    <Skeleton className="h-9 w-full rounded-md" />
                  ) : (
                    <Select value={delegatedApproverId} onValueChange={setDelegatedApproverId}>
                      <SelectTrigger id="delegated-approver" className="h-9 text-sm">
                        <SelectValue placeholder="Selecione um aprovador" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Selecione um aprovador</SelectItem>
                        {approvers.map((approver) => (
                          <SelectItem key={approver.id} value={approver.id}>
                            {approver.name}
                            {approver.departmentName ? ` · ${approver.departmentName}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Centraliza a decisão de compras em um único colaborador responsável pela triagem de pedidos.
                  </p>
                </div>
              )}

              <div className="field-stack max-w-sm">
                <Label htmlFor="hierarchy-threshold" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Escalonar alçada acima de (R$)
                </Label>
                {loading ? (
                  <Skeleton className="h-9 w-full rounded-md" />
                ) : (
                  <Input
                    id="hierarchy-threshold"
                    type="number"
                    min={0}
                    step="0.01"
                    value={hierarchyThreshold}
                    onChange={(event) => setHierarchyThreshold(event.target.value)}
                    className="h-9 text-sm"
                  />
                )}
                <p className="text-xs text-muted-foreground">
                  Quando o pedido exceder este limite, a aprovação é escalonada na hierarquia gerencial.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-3 border-t">
                <Button size="sm" onClick={handleSave} disabled={loading || saving} className="font-semibold">
                  {saving ? 'Salvando...' : 'Salvar configurações'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba 2: Cotações */}
        <TabsContent value="quotations" className="space-y-6">
          <Card className="app-section-card p-6">
            <CardHeader className="p-0 mb-6">
              <CardTitle className="text-lg">Política de cotações mínimas</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Critérios de compliance para homologação e emissão de ordens de compra.
              </p>
            </CardHeader>
            <CardContent className="p-0 space-y-5">
              <div className="field-stack max-w-sm">
                <Label htmlFor="minimum-quotation-count" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Quantidade mínima de cotações
                </Label>
                {loading ? (
                  <Skeleton className="h-9 w-full rounded-md" />
                ) : (
                  <Input
                    id="minimum-quotation-count"
                    type="number"
                    min={1}
                    max={10}
                    value={minimumQuotationCount}
                    onChange={(event) => setMinimumQuotationCount(event.target.value)}
                    className="h-9 text-sm"
                  />
                )}
                <p className="text-xs text-muted-foreground">
                  O sistema exigirá este número mínimo de propostas preenchidas antes de homologar a vencedora.
                </p>
              </div>

              <div className="flex items-start justify-between rounded-lg border bg-muted/20 p-4 max-w-xl">
                <div className="space-y-1 pr-4">
                  <p className="text-sm font-semibold text-foreground">Dispensar cotação em caso de urgência</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Permite homologar cotação direta sem cumprir a quantidade mínima quando a requisição for classificada como Urgente.
                  </p>
                </div>
                <Switch
                  checked={allowUrgentQuotationWaiver}
                  onCheckedChange={setAllowUrgentQuotationWaiver}
                  disabled={loading}
                />
              </div>

              <div className="flex items-center gap-3 pt-3 border-t">
                <Button size="sm" onClick={handleSave} disabled={loading || saving} className="font-semibold">
                  {saving ? 'Salvando...' : 'Salvar política de cotações'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba 3: Departamentos */}
        <TabsContent value="departments" className="space-y-6">
          <Card className="app-section-card p-6">
            <CardHeader className="p-0 mb-6">
              <CardTitle className="text-lg">Exceções e regras por departamento</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Configure políticas personalizadas para áreas específicas ou mantenha a herança da empresa.
              </p>
            </CardHeader>
            <CardContent className="p-0 space-y-5">
              <div className="field-stack max-w-lg">
                <Label htmlFor="department-select" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Departamento a configurar
                </Label>
                {loading ? (
                  <Skeleton className="h-9 w-full rounded-md" />
                ) : (
                  <Select value={selectedDepartmentId} onValueChange={setSelectedDepartmentId}>
                    <SelectTrigger id="department-select" className="h-9 text-sm">
                      <SelectValue placeholder="Selecione o departamento" />
                    </SelectTrigger>
                    <SelectContent>
                      {departmentSettings.map((department) => (
                        <SelectItem key={department.departmentId} value={department.departmentId}>
                          {department.departmentName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {selectedDepartment && (
                  <p className="text-xs text-muted-foreground">
                    Filial: {selectedDepartment.branchName}
                    {selectedDepartment.headManagerName
                      ? ` · Gestor: ${selectedDepartment.headManagerName}`
                      : ''}
                  </p>
                )}
              </div>

              <div className="flex items-start justify-between rounded-lg border bg-muted/20 p-4 max-w-xl">
                <div className="space-y-1 pr-4">
                  <p className="text-sm font-semibold text-foreground">Herdar governança global da empresa</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Quando ativo, o departamento segue automaticamente as configurações gerais da empresa.
                  </p>
                </div>
                <Switch
                  checked={departmentInheritFromCompany}
                  onCheckedChange={setDepartmentInheritFromCompany}
                  disabled={loading || !selectedDepartment}
                />
              </div>

              <div className={departmentInheritFromCompany ? 'pointer-events-none opacity-50 space-y-4' : 'space-y-4'}>
                <div className="grid gap-4 md:grid-cols-2 max-w-2xl">
                  <div className="field-stack">
                    <Label htmlFor="department-approval-mode" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Modo de aprovação local
                    </Label>
                    <Select
                      value={departmentApprovalMode}
                      onValueChange={(value) =>
                        setDepartmentApprovalMode(
                          value as ProcurementSettingsRecord['approvalMode'],
                        )
                      }
                      disabled={loading || departmentInheritFromCompany}
                    >
                      <SelectTrigger id="department-approval-mode" className="h-9 text-sm">
                        <SelectValue placeholder="Selecione o modo de aprovação" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="department-manager">Gestor do departamento</SelectItem>
                        <SelectItem value="delegated-approver">Aprovador delegado</SelectItem>
                        <SelectItem value="manager-with-hierarchy">
                          Gestor com escalonamento
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {departmentApprovalMode === 'delegated-approver' && (
                    <div className="field-stack">
                      <Label htmlFor="department-delegated-approver" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Aprovador delegado
                      </Label>
                      <Select
                        value={departmentDelegatedApproverId}
                        onValueChange={setDepartmentDelegatedApproverId}
                        disabled={loading || departmentInheritFromCompany}
                      >
                        <SelectTrigger id="department-delegated-approver" className="h-9 text-sm">
                          <SelectValue placeholder="Selecione um aprovador" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Selecione um aprovador</SelectItem>
                          {approvers.map((approver) => (
                            <SelectItem key={approver.id} value={approver.id}>
                              {approver.name}
                              {approver.departmentName ? ` · ${approver.departmentName}` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="field-stack">
                    <Label htmlFor="department-threshold" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Escalonar acima de (R$)
                    </Label>
                    <Input
                      id="department-threshold"
                      type="number"
                      min={0}
                      step="0.01"
                      value={departmentHierarchyThreshold}
                      onChange={(event) => setDepartmentHierarchyThreshold(event.target.value)}
                      disabled={loading || departmentInheritFromCompany}
                      className="h-9 text-sm"
                    />
                  </div>

                  <div className="field-stack">
                    <Label htmlFor="department-minimum-quotations" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Mínimo de cotações
                    </Label>
                    <Input
                      id="department-minimum-quotations"
                      type="number"
                      min={1}
                      max={10}
                      value={departmentMinimumQuotationCount}
                      onChange={(event) =>
                        setDepartmentMinimumQuotationCount(event.target.value)
                      }
                      disabled={loading || departmentInheritFromCompany}
                      className="h-9 text-sm"
                    />
                  </div>
                </div>

                <div className="flex items-start justify-between rounded-lg border bg-muted/20 p-4 max-w-xl">
                  <div className="space-y-1 pr-4">
                    <p className="text-sm font-semibold text-foreground">Dispensar em caso de urgência</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Permite exceção de cotação única no departamento para urgências.
                    </p>
                  </div>
                  <Switch
                    checked={departmentAllowUrgentQuotationWaiver}
                    onCheckedChange={setDepartmentAllowUrgentQuotationWaiver}
                    disabled={loading || departmentInheritFromCompany}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3 border-t">
                <Button
                  size="sm"
                  onClick={handleDepartmentSave}
                  disabled={loading || departmentSaving || !selectedDepartment}
                  className="font-semibold"
                >
                  {departmentSaving ? 'Salvando...' : 'Salvar configurações do departamento'}
                </Button>
                <span className="text-xs text-muted-foreground">
                  {departmentInheritFromCompany
                    ? 'Departamento herdando da empresa'
                    : 'Regras personalizadas ativas'}
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
