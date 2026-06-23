'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { MenuFunctionHeader } from '@/components/layout/menu-function-header'
import { Badge } from '@/components/ui/badge'
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

  useEffect(() => {
    async function loadSettings() {
      try {
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
          getApiErrorMessage(error, 'Nao foi possivel carregar as configuracoes de compras.'),
        )
      } finally {
        setLoading(false)
      }
    }

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
      toast.success('Configuracoes de compras atualizadas com sucesso.')
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, 'Nao foi possivel salvar as configuracoes de compras.'),
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
      toast.success('Configuracoes do departamento atualizadas com sucesso.')
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          'Nao foi possivel salvar as configuracoes do departamento.',
        ),
      )
    } finally {
      setDepartmentSaving(false)
    }
  }

  const selectedDepartment =
    departmentSettings.find((department) => department.departmentId === selectedDepartmentId) ?? null

  return (
    <div className="app-page">
      <MenuFunctionHeader
        title="Compras > Configuracoes"
        description="Area de governanca do fluxo procure-to-pay. As decisoes desta tela ficam persistidas por empresa e orientam a aprovacao e os parametros operacionais do modulo."
        actions={
          <Badge variant="outline" className="rounded-full px-4 py-2">
            Governanca por empresa
          </Badge>
        }
      />

      <Tabs defaultValue="approval" className="space-y-6">
        <TabsList className="grid w-full max-w-[720px] grid-cols-3">
          <TabsTrigger value="approval">Aprovacao</TabsTrigger>
          <TabsTrigger value="quotations">Cotacoes</TabsTrigger>
          <TabsTrigger value="departments">Departamentos</TabsTrigger>
        </TabsList>

        <TabsContent value="approval" className="space-y-6">
          <Card className="app-section-card">
            <CardHeader>
              <CardTitle className="text-xl">Roteamento de aprovacao da requisicao</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="field-stack">
                <Label htmlFor="approval-mode">Modo base</Label>
                {loading ? (
                  <Skeleton className="h-10 w-full rounded-xl" />
                ) : (
                  <Select
                    value={approvalMode}
                    onValueChange={(value) =>
                      setApprovalMode(value as ProcurementSettingsRecord['approvalMode'])
                    }
                  >
                    <SelectTrigger id="approval-mode">
                      <SelectValue placeholder="Selecione o modo de aprovacao" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="department-manager">Gestor do departamento</SelectItem>
                      <SelectItem value="delegated-approver">Aprovador delegado</SelectItem>
                      <SelectItem value="manager-with-hierarchy">
                        Gestor com escalonamento hierarquico
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
                <p className="text-sm leading-6 text-muted-foreground">
                  O fluxo atual do backend já passa a respeitar esta escolha no envio da requisição.
                </p>
              </div>

              {approvalMode === 'delegated-approver' ? (
                <div className="field-stack">
                  <Label htmlFor="delegated-approver">Aprovador delegado</Label>
                  {loading ? (
                    <Skeleton className="h-10 w-full rounded-xl" />
                  ) : (
                    <Select value={delegatedApproverId} onValueChange={setDelegatedApproverId}>
                      <SelectTrigger id="delegated-approver">
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
                  <p className="text-sm leading-6 text-muted-foreground">
                    Use este modo quando a empresa quiser centralizar a aprovacao inicial em um comprador
                    ou responsavel fixo.
                  </p>
                </div>
              ) : null}

              <div className="field-stack max-w-sm">
                <Label htmlFor="hierarchy-threshold">Escalonar acima de</Label>
                {loading ? (
                  <Skeleton className="h-10 w-full rounded-xl" />
                ) : (
                  <Input
                    id="hierarchy-threshold"
                    type="number"
                    min={0}
                    step="0.01"
                    value={hierarchyThreshold}
                    onChange={(event) => setHierarchyThreshold(event.target.value)}
                  />
                )}
                <p className="text-sm leading-6 text-muted-foreground">
                  Este valor define quando a regra de hierarquia sobe para o gestor acima, caso o modo
                  configurado use escalonamento.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button onClick={handleSave} disabled={loading || saving}>
                  {saving ? 'Salvando...' : 'Salvar configuracoes'}
                </Button>
                <Badge variant="outline" className="rounded-full px-3 py-2">
                  Aprovacao configuravel ativa
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quotations" className="space-y-6">
          <Card className="app-section-card">
            <CardHeader>
              <CardTitle className="text-xl">Politica de cotacoes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="field-stack max-w-sm">
                <Label htmlFor="minimum-quotation-count">Quantidade minima de cotacoes</Label>
                {loading ? (
                  <Skeleton className="h-10 w-full rounded-xl" />
                ) : (
                  <Input
                    id="minimum-quotation-count"
                    type="number"
                    min={1}
                    max={10}
                    value={minimumQuotationCount}
                    onChange={(event) => setMinimumQuotationCount(event.target.value)}
                  />
                )}
                <p className="text-sm leading-6 text-muted-foreground">
                  A escolha da cotacao vencedora já passa a bloquear processos abaixo desta quantidade.
                </p>
              </div>

              <div className="flex items-start justify-between rounded-[20px] border border-border/70 bg-muted/35 p-4">
                <div className="space-y-1">
                  <p className="font-medium">Excecao para urgencia</p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Este parametro já fica salvo por empresa e prepara a proxima camada de tratamento
                    diferenciado para urgencias no fluxo de cotacao.
                  </p>
                </div>
                <Switch
                  checked={allowUrgentQuotationWaiver}
                  onCheckedChange={setAllowUrgentQuotationWaiver}
                  disabled={loading}
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <Button onClick={handleSave} disabled={loading || saving}>
                  {saving ? 'Salvando...' : 'Salvar configuracoes'}
                </Button>
                <Badge variant="outline" className="rounded-full px-3 py-2">
                  Base para proxima onda de governanca
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="departments" className="space-y-6">
          <Card className="app-section-card">
            <CardHeader>
              <CardTitle className="text-xl">Overrides por departamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="field-stack">
                <Label htmlFor="department-select">Departamento</Label>
                {loading ? (
                  <Skeleton className="h-10 w-full rounded-xl" />
                ) : (
                  <Select value={selectedDepartmentId} onValueChange={setSelectedDepartmentId}>
                    <SelectTrigger id="department-select">
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
                {selectedDepartment ? (
                  <p className="text-sm leading-6 text-muted-foreground">
                    Filial: {selectedDepartment.branchName}
                    {selectedDepartment.headManagerName
                      ? ` · Gestor atual: ${selectedDepartment.headManagerName}`
                      : ''}
                  </p>
                ) : null}
              </div>

              <div className="flex items-start justify-between rounded-[20px] border border-border/70 bg-muted/35 p-4">
                <div className="space-y-1">
                  <p className="font-medium">Herdar configuracao da empresa</p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Quando ativo, este departamento usa exatamente a governanca global da empresa.
                  </p>
                </div>
                <Switch
                  checked={departmentInheritFromCompany}
                  onCheckedChange={setDepartmentInheritFromCompany}
                  disabled={loading || !selectedDepartment}
                />
              </div>

              <div className={departmentInheritFromCompany ? 'pointer-events-none opacity-60' : ''}>
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="field-stack">
                    <Label htmlFor="department-approval-mode">Modo base</Label>
                    <Select
                      value={departmentApprovalMode}
                      onValueChange={(value) =>
                        setDepartmentApprovalMode(
                          value as ProcurementSettingsRecord['approvalMode'],
                        )
                      }
                      disabled={loading || departmentInheritFromCompany}
                    >
                      <SelectTrigger id="department-approval-mode">
                        <SelectValue placeholder="Selecione o modo de aprovacao" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="department-manager">Gestor do departamento</SelectItem>
                        <SelectItem value="delegated-approver">Aprovador delegado</SelectItem>
                        <SelectItem value="manager-with-hierarchy">
                          Gestor com escalonamento hierarquico
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {departmentApprovalMode === 'delegated-approver' ? (
                    <div className="field-stack">
                      <Label htmlFor="department-delegated-approver">Aprovador delegado</Label>
                      <Select
                        value={departmentDelegatedApproverId}
                        onValueChange={setDepartmentDelegatedApproverId}
                        disabled={loading || departmentInheritFromCompany}
                      >
                        <SelectTrigger id="department-delegated-approver">
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
                  ) : null}

                  <div className="field-stack">
                    <Label htmlFor="department-threshold">Escalonar acima de</Label>
                    <Input
                      id="department-threshold"
                      type="number"
                      min={0}
                      step="0.01"
                      value={departmentHierarchyThreshold}
                      onChange={(event) => setDepartmentHierarchyThreshold(event.target.value)}
                      disabled={loading || departmentInheritFromCompany}
                    />
                  </div>

                  <div className="field-stack">
                    <Label htmlFor="department-minimum-quotations">
                      Quantidade minima de cotacoes
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
                    />
                  </div>
                </div>

                <div className="mt-6 flex items-start justify-between rounded-[20px] border border-border/70 bg-muted/35 p-4">
                  <div className="space-y-1">
                    <p className="font-medium">Excecao para urgencia</p>
                    <p className="text-sm leading-6 text-muted-foreground">
                      Mantem um parametro proprio do departamento para a proxima camada de enforcement.
                    </p>
                  </div>
                  <Switch
                    checked={departmentAllowUrgentQuotationWaiver}
                    onCheckedChange={setDepartmentAllowUrgentQuotationWaiver}
                    disabled={loading || departmentInheritFromCompany}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={handleDepartmentSave}
                  disabled={loading || departmentSaving || !selectedDepartment}
                >
                  {departmentSaving ? 'Salvando...' : 'Salvar configuracoes do departamento'}
                </Button>
                <Badge variant="outline" className="rounded-full px-3 py-2">
                  {departmentInheritFromCompany
                    ? 'Herdando da empresa'
                    : 'Override local ativo'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
