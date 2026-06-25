'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { useAuth } from '@/context/auth-context'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'

type ImportBatchListItem = {
  id: string
  type: 'DEPARTMENTS' | 'EMPLOYEES'
  status: 'PREVIEW_READY' | 'COMPLETED' | 'FAILED'
  conflictPolicy: 'SKIP' | 'MERGE_UPDATE' | 'OVERWRITE'
  executionMode: 'PREVIEW_THEN_COMMIT' | 'DIRECT'
  employeeSourceMode?: 'EMPLOYEE_ONLY' | 'EMPLOYEE_WITH_DEPARTMENT' | null
  fileName: string
  summary?: {
    totalRows: number
    createdRows: number
    updatedRows: number
    skippedRows: number
    failedRows: number
    previewRows: number
  } | null
  errorMessage?: string | null
  createdAt: string
  updatedAt: string
}

type ImportBatchDetail = ImportBatchListItem & {
  report?: Array<{
    rowNumber: number
    entityType: 'department' | 'employee'
    entityLabel: string
    status: 'SUCCESS' | 'ERROR' | 'SKIPPED' | 'PREVIEW'
    action:
      | 'CREATE'
      | 'UPDATE'
      | 'SKIP'
      | 'WOULD_CREATE'
      | 'WOULD_UPDATE'
      | 'WOULD_SKIP'
    message: string
  }> | null
}

type ImportActionResponse = {
  batchId: string
  summary: NonNullable<ImportBatchListItem['summary']>
  report: NonNullable<ImportBatchDetail['report']>
  temporaryCredentials?: Array<{
    rowNumber: number
    email: string
    temporaryPassword: string
  }>
}

type TabKey = 'departments' | 'employees'

export default function HrImportsPage() {
  const { hasPermission } = useAuth()
  const canImportDepartments = hasPermission('rh.departments.import')
  const canImportEmployees = hasPermission('rh.employees.import')

  const [activeTab, setActiveTab] = useState<TabKey>('departments')
  const [conflictPolicy, setConflictPolicy] = useState<'SKIP' | 'MERGE_UPDATE' | 'OVERWRITE'>('MERGE_UPDATE')
  const [employeeSourceMode, setEmployeeSourceMode] = useState<'EMPLOYEE_ONLY' | 'EMPLOYEE_WITH_DEPARTMENT'>('EMPLOYEE_ONLY')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [history, setHistory] = useState<ImportBatchListItem[]>([])
  const [selectedBatch, setSelectedBatch] = useState<ImportBatchDetail | null>(null)
  const [temporaryCredentials, setTemporaryCredentials] = useState<ImportActionResponse['temporaryCredentials']>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const activePermission = useMemo(
    () => (activeTab === 'departments' ? canImportDepartments : canImportEmployees),
    [activeTab, canImportDepartments, canImportEmployees],
  )

  useEffect(() => {
    async function loadHistory() {
      try {
        const { data } = await api.get<ImportBatchListItem[]>('/hr-imports')
        setHistory(data)
      } catch (error) {
        toast.error(getApiErrorMessage(error, 'Nao foi possivel carregar o historico de importacoes.'))
      } finally {
        setLoadingHistory(false)
      }
    }

    void loadHistory()
  }, [])

  async function refreshHistory(selectBatchId?: string) {
    const { data } = await api.get<ImportBatchListItem[]>('/hr-imports')
    setHistory(data)

    if (selectBatchId) {
      await loadBatch(selectBatchId)
    }
  }

  async function loadBatch(batchId: string) {
    try {
      const { data } = await api.get<ImportBatchDetail>(`/hr-imports/${batchId}`)
      setSelectedBatch(data)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Nao foi possivel carregar os detalhes do lote.'))
    }
  }

  function buildFormData(mode: 'PREVIEW_THEN_COMMIT' | 'DIRECT') {
    if (!selectedFile) {
      throw new Error('Selecione um arquivo antes de continuar.')
    }

    const formData = new FormData()
    formData.append('file', selectedFile)
    formData.append('conflictPolicy', conflictPolicy)
    formData.append('executionMode', mode)
    if (activeTab === 'employees') {
      formData.append('employeeSourceMode', employeeSourceMode)
    }

    return formData
  }

  async function handleAction(mode: 'PREVIEW_THEN_COMMIT' | 'DIRECT') {
    if (!activePermission) {
      toast.error('Seu perfil nao possui permissao para esta importacao.')
      return
    }

    try {
      setSubmitting(true)
      const formData = buildFormData(mode)
      const endpoint =
        activeTab === 'departments'
          ? `/hr-imports/departments/${mode === 'PREVIEW_THEN_COMMIT' ? 'preview' : 'execute'}`
          : `/hr-imports/employees/${mode === 'PREVIEW_THEN_COMMIT' ? 'preview' : 'execute'}`

      const { data } = await api.post<ImportActionResponse>(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      setTemporaryCredentials(data.temporaryCredentials || [])
      await refreshHistory(data.batchId)
      toast.success(mode === 'PREVIEW_THEN_COMMIT' ? 'Preview gerado com sucesso.' : 'Importacao processada com sucesso.')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Nao foi possivel processar a importacao.'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCommit() {
    if (!selectedBatch || selectedBatch.status !== 'PREVIEW_READY') {
      toast.error('Selecione um lote em preview para confirmar.')
      return
    }

    try {
      setSubmitting(true)
      const { data } = await api.post<ImportActionResponse>(`/hr-imports/${selectedBatch.id}/commit`)
      setTemporaryCredentials(data.temporaryCredentials || [])
      await refreshHistory(data.batchId)
      toast.success('Preview confirmado e importacao executada com sucesso.')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Nao foi possivel confirmar o preview.'))
    } finally {
      setSubmitting(false)
    }
  }

  const filteredHistory = history.filter((item) =>
    activeTab === 'departments' ? item.type === 'DEPARTMENTS' : item.type === 'EMPLOYEES',
  )

  return (
    <div className="app-page">
      <MenuFunctionHeader
        title="Recursos Humanos > Importacoes"
        description="Importe departamentos e funcionarios por lote com preview opcional, politica de conflito configuravel, historico por usuario e relatorio por linha."
        actions={
          <>
            <Badge variant="outline" className="rounded-full px-4 py-2">
              CSV e XLSX
            </Badge>
            <Badge variant="outline" className="rounded-full px-4 py-2">
              Preview + Historico
            </Badge>
          </>
        }
      />

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabKey)} className="space-y-6">
        <TabsList className="grid w-full max-w-[480px] grid-cols-2">
          <TabsTrigger value="departments">Departamentos</TabsTrigger>
          <TabsTrigger value="employees">Funcionarios</TabsTrigger>
        </TabsList>

        <TabsContent value="departments" className="space-y-6">
          <ImportWorkspace
            activeTab="departments"
            activePermission={canImportDepartments}
            conflictPolicy={conflictPolicy}
            setConflictPolicy={setConflictPolicy}
            employeeSourceMode={employeeSourceMode}
            setEmployeeSourceMode={setEmployeeSourceMode}
            selectedFile={selectedFile}
            onFileChange={setSelectedFile}
            selectedBatch={selectedBatch}
            temporaryCredentials={temporaryCredentials}
            history={filteredHistory}
            loadingHistory={loadingHistory}
            submitting={submitting}
            onPreview={() => handleAction('PREVIEW_THEN_COMMIT')}
            onExecute={() => handleAction('DIRECT')}
            onCommit={handleCommit}
            onSelectBatch={loadBatch}
          />
        </TabsContent>

        <TabsContent value="employees" className="space-y-6">
          <ImportWorkspace
            activeTab="employees"
            activePermission={canImportEmployees}
            conflictPolicy={conflictPolicy}
            setConflictPolicy={setConflictPolicy}
            employeeSourceMode={employeeSourceMode}
            setEmployeeSourceMode={setEmployeeSourceMode}
            selectedFile={selectedFile}
            onFileChange={setSelectedFile}
            selectedBatch={selectedBatch}
            temporaryCredentials={temporaryCredentials}
            history={filteredHistory}
            loadingHistory={loadingHistory}
            submitting={submitting}
            onPreview={() => handleAction('PREVIEW_THEN_COMMIT')}
            onExecute={() => handleAction('DIRECT')}
            onCommit={handleCommit}
            onSelectBatch={loadBatch}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ImportWorkspace({
  activeTab,
  activePermission,
  conflictPolicy,
  setConflictPolicy,
  employeeSourceMode,
  setEmployeeSourceMode,
  selectedFile,
  onFileChange,
  selectedBatch,
  temporaryCredentials,
  history,
  loadingHistory,
  submitting,
  onPreview,
  onExecute,
  onCommit,
  onSelectBatch,
}: {
  activeTab: TabKey
  activePermission: boolean
  conflictPolicy: 'SKIP' | 'MERGE_UPDATE' | 'OVERWRITE'
  setConflictPolicy: (value: 'SKIP' | 'MERGE_UPDATE' | 'OVERWRITE') => void
  employeeSourceMode: 'EMPLOYEE_ONLY' | 'EMPLOYEE_WITH_DEPARTMENT'
  setEmployeeSourceMode: (value: 'EMPLOYEE_ONLY' | 'EMPLOYEE_WITH_DEPARTMENT') => void
  selectedFile: File | null
  onFileChange: (file: File | null) => void
  selectedBatch: ImportBatchDetail | null
  temporaryCredentials?: Array<{ rowNumber: number; email: string; temporaryPassword: string }>
  history: ImportBatchListItem[]
  loadingHistory: boolean
  submitting: boolean
  onPreview: () => Promise<void>
  onExecute: () => Promise<void>
  onCommit: () => Promise<void>
  onSelectBatch: (batchId: string) => Promise<void>
}) {
  const templateLinks =
    activeTab === 'departments'
      ? [
          { href: '/rh-imports/departments-sample.xlsx', label: 'Exemplo: departamentos' },
        ]
      : [
          { href: '/rh-imports/employees-only-sample.xlsx', label: 'Exemplo: funcionarios apenas' },
          { href: '/rh-imports/employees-with-department-sample.xlsx', label: 'Exemplo: funcionarios com departamento' },
        ]

  return (
    <div className="space-y-6">
      <Card className="app-section-card">
        <CardHeader>
          <CardTitle className="text-xl">Configurar lote</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {!activePermission ? (
            <div className="rounded-[20px] border border-warning/30 bg-warning/10 p-4 text-sm text-foreground">
              Seu perfil consegue acessar a area de RH, mas ainda nao possui a permissao especifica para importar este tipo de dado.
            </div>
          ) : null}

          <div className="app-form-grid">
            <div className="field-stack">
              <Label htmlFor="conflict-policy">Politica de conflito</Label>
              <Select value={conflictPolicy} onValueChange={(value) => setConflictPolicy(value as typeof conflictPolicy)}>
                <SelectTrigger id="conflict-policy">
                  <SelectValue placeholder="Selecione a politica" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MERGE_UPDATE">Atualizar campos preenchidos</SelectItem>
                  <SelectItem value="OVERWRITE">Sobrescrever registro existente</SelectItem>
                  <SelectItem value="SKIP">Ignorar existentes</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                `MERGE_UPDATE` preserva campos vazios; `OVERWRITE` permite limpar opcionais.
              </p>
            </div>

            {activeTab === 'employees' ? (
              <div className="field-stack">
                <Label htmlFor="employee-source-mode">Modo do arquivo de funcionarios</Label>
                <Select value={employeeSourceMode} onValueChange={(value) => setEmployeeSourceMode(value as typeof employeeSourceMode)}>
                  <SelectTrigger id="employee-source-mode">
                    <SelectValue placeholder="Selecione o modo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMPLOYEE_ONLY">Somente funcionario</SelectItem>
                    <SelectItem value="EMPLOYEE_WITH_DEPARTMENT">Funcionario com departamento completo</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  No segundo modo, o sistema cria o departamento se ele ainda nao existir.
                </p>
              </div>
            ) : null}

            <div className="field-stack md:col-span-2">
              <Label htmlFor="import-file">Arquivo da importacao</Label>
              <Input
                id="import-file"
                type="file"
                accept=".csv,.xlsx"
                onChange={(event) => onFileChange(event.target.files?.[0] || null)}
              />
              <p className="text-sm text-muted-foreground">
                Arquivos aceitos: `.csv` e `.xlsx`. Tamanho maximo configurado no backend: 5MB.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="button" disabled={!selectedFile || submitting || !activePermission} onClick={onPreview}>
              {submitting ? 'Processando...' : 'Gerar preview'}
            </Button>
            <Button type="button" variant="secondary" disabled={!selectedFile || submitting || !activePermission} onClick={onExecute}>
              {submitting ? 'Processando...' : 'Importar agora'}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={selectedBatch?.status !== 'PREVIEW_READY' || submitting}
              onClick={onCommit}
            >
              Confirmar preview selecionado
            </Button>
            {selectedFile ? (
              <Badge variant="outline" className="rounded-full px-3 py-2">
                Arquivo atual: {selectedFile.name}
              </Badge>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card className="app-section-card">
        <CardHeader>
          <CardTitle className="text-xl">Arquivos de exemplo</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {templateLinks.map((link) => (
            <Button key={link.href} asChild variant="outline">
              <a href={link.href} download>
                {link.label}
              </a>
            </Button>
          ))}
        </CardContent>
      </Card>

      {temporaryCredentials && temporaryCredentials.length > 0 ? (
        <Card className="app-section-card">
          <CardHeader>
            <CardTitle className="text-xl">Credenciais temporarias geradas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Estas senhas so aparecem neste retorno. Registre-as com cuidado antes de sair da tela.
            </p>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Linha</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Senha temporaria</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {temporaryCredentials.map((item) => (
                    <TableRow key={`${item.rowNumber}-${item.email}`}>
                      <TableCell>{item.rowNumber}</TableCell>
                      <TableCell>{item.email}</TableCell>
                      <TableCell className="font-mono text-sm">{item.temporaryPassword}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="app-section-card">
        <CardHeader>
          <CardTitle className="text-xl">Historico do usuario</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingHistory ? (
            <p className="text-sm text-muted-foreground">Carregando historico...</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum lote registrado para este tipo de importacao.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Arquivo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Conflito</TableHead>
                    <TableHead>Linhas</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="text-right">Acao</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.fileName}</TableCell>
                      <TableCell>{item.status}</TableCell>
                      <TableCell>{item.conflictPolicy}</TableCell>
                      <TableCell>{item.summary?.totalRows ?? '-'}</TableCell>
                      <TableCell>{new Date(item.createdAt).toLocaleString('pt-BR')}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" onClick={() => void onSelectBatch(item.id)}>
                          Ver detalhes
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedBatch ? (
        <Card className="app-section-card">
          <CardHeader>
            <CardTitle className="text-xl">Detalhes do lote selecionado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Badge variant="outline" className="rounded-full px-3 py-2">
                {selectedBatch.type}
              </Badge>
              <Badge variant="outline" className="rounded-full px-3 py-2">
                {selectedBatch.status}
              </Badge>
              <Badge variant="outline" className="rounded-full px-3 py-2">
                {selectedBatch.executionMode}
              </Badge>
              {selectedBatch.employeeSourceMode ? (
                <Badge variant="outline" className="rounded-full px-3 py-2">
                  {selectedBatch.employeeSourceMode}
                </Badge>
              ) : null}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <MetricCard label="Total" value={selectedBatch.summary?.totalRows ?? 0} />
              <MetricCard label="Criados" value={selectedBatch.summary?.createdRows ?? 0} />
              <MetricCard label="Atualizados" value={selectedBatch.summary?.updatedRows ?? 0} />
              <MetricCard label="Ignorados" value={selectedBatch.summary?.skippedRows ?? 0} />
              <MetricCard label="Erros" value={selectedBatch.summary?.failedRows ?? 0} />
              <MetricCard label="Preview" value={selectedBatch.summary?.previewRows ?? 0} />
            </div>

            <div className="overflow-x-auto rounded-2xl border border-border/70">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Linha</TableHead>
                    <TableHead>Entidade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Acao</TableHead>
                    <TableHead>Mensagem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedBatch.report?.length ? (
                    selectedBatch.report.map((item) => (
                      <TableRow key={`${item.rowNumber}-${item.entityLabel}`}>
                        <TableCell>{item.rowNumber}</TableCell>
                        <TableCell>{item.entityLabel}</TableCell>
                        <TableCell>{item.status}</TableCell>
                        <TableCell>{item.action}</TableCell>
                        <TableCell>{item.message}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                        O lote selecionado ainda nao possui relatorio detalhado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[20px] border border-border/70 bg-muted/35 p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-foreground">{value}</p>
    </div>
  )
}
