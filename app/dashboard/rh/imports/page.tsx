'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  Eye,
  Layers,
  Users,
  Building2,
  Clock,
  Play,
} from 'lucide-react'

import { useAuth } from '@/context/auth-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
  const [refreshing, setRefreshing] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const activePermission = useMemo(
    () => (activeTab === 'departments' ? canImportDepartments : canImportEmployees),
    [activeTab, canImportDepartments, canImportEmployees],
  )

  const loadHistory = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true)
      const { data } = await api.get<ImportBatchListItem[]>('/hr-imports')
      setHistory(data)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível carregar o histórico de importações.'))
    } finally {
      setLoadingHistory(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
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
      toast.error(getApiErrorMessage(error, 'Não foi possível carregar os detalhes do lote.'))
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
      toast.error('Seu perfil não possui permissão para esta importação.')
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
      toast.success(mode === 'PREVIEW_THEN_COMMIT' ? 'Preview gerado com sucesso.' : 'Importação processada com sucesso.')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível processar a importação.'))
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
      toast.success('Preview confirmado e importação executada com sucesso.')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível confirmar o preview.'))
    } finally {
      setSubmitting(false)
    }
  }

  const filteredHistory = history.filter((item) =>
    activeTab === 'departments' ? item.type === 'DEPARTMENTS' : item.type === 'EMPLOYEES',
  )

  // 4 KPIs
  const totalBatches = history.length
  const completedBatches = history.filter((b) => b.status === 'COMPLETED').length
  const previewReadyBatches = history.filter((b) => b.status === 'PREVIEW_READY').length
  const failedBatches = history.filter((b) => b.status === 'FAILED').length

  return (
    <div className="space-y-6">
      {/* 1. Standard Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Importações de RH
            </h1>
            <Badge variant="outline" className="border-border/60 bg-muted/40 text-xs font-normal">
              CSV & XLSX
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Importe departamentos e colaboradores em lote com suporte a preview, controle de conflitos e histórico.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadHistory(true)}
            disabled={loadingHistory || refreshing}
            className="h-8 gap-1.5"
          >
            <RotateCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* 2. 4 KPI Summary Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="p-4 shadow-sm border-border/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total de Lotes
            </span>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-2">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {totalBatches}
            </span>
          </div>
          <span className="mt-1 block text-xs text-muted-foreground">
            Lotes processados no sistema
          </span>
        </Card>

        <Card className="p-4 shadow-sm border-border/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Concluídos
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2">
            <span className="text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {completedBatches}
            </span>
          </div>
          <span className="mt-1 block text-xs text-muted-foreground">
            Importações efetivadas com sucesso
          </span>
        </Card>

        <Card className="p-4 shadow-sm border-border/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Aguardando Confirmação
            </span>
            <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {previewReadyBatches}
            </span>
            {previewReadyBatches > 0 && (
              <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-400 text-[10px] px-1.5 py-0">
                Preview pronto
              </Badge>
            )}
          </div>
          <span className="mt-1 block text-xs text-muted-foreground">
            Lotes em modo preview
          </span>
        </Card>

        <Card className="p-4 shadow-sm border-border/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Falhas / Erros
            </span>
            <AlertCircle className="h-4 w-4 text-rose-500" />
          </div>
          <div className="mt-2">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {failedBatches}
            </span>
          </div>
          <span className="mt-1 block text-xs text-muted-foreground">
            Lotes com falha de execução
          </span>
        </Card>
      </div>

      {/* 3. Main Workspace Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabKey)} className="space-y-6">
        <TabsList className="grid w-full max-w-[420px] grid-cols-2">
          <TabsTrigger value="departments" className="gap-2">
            <Building2 className="h-4 w-4" />
            Departamentos
          </TabsTrigger>
          <TabsTrigger value="employees" className="gap-2">
            <Users className="h-4 w-4" />
            Colaboradores
          </TabsTrigger>
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
          { href: '/rh-imports/departments-sample.xlsx', label: 'Planilha Exemplo: Departamentos (.xlsx)' },
        ]
      : [
          { href: '/rh-imports/employees-only-sample.xlsx', label: 'Planilha Exemplo: Somente Funcionários (.xlsx)' },
          { href: '/rh-imports/employees-with-department-sample.xlsx', label: 'Planilha Exemplo: Funcionários com Departamentos (.xlsx)' },
        ]

  const getStatusBadge = (status: ImportBatchListItem['status']) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-400 text-xs">
            Concluído
          </Badge>
        )
      case 'PREVIEW_READY':
        return (
          <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-400 text-xs">
            Preview Pronto
          </Badge>
        )
      case 'FAILED':
        return (
          <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400 text-xs">
            Falhou
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getConflictPolicyLabel = (policy: ImportBatchListItem['conflictPolicy']) => {
    switch (policy) {
      case 'MERGE_UPDATE':
        return 'Atualizar preenchidos'
      case 'OVERWRITE':
        return 'Sobrescrever completo'
      case 'SKIP':
        return 'Ignorar existentes'
      default:
        return policy
    }
  }

  return (
    <div className="space-y-6">
      {/* Configure Card */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <UploadCloud className="h-5 w-5 text-muted-foreground" />
            Configurar e Submeter Lote
          </CardTitle>
          <CardDescription>
            Selecione o arquivo e a política de tratamento de registros já existentes no sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!activePermission ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <p className="font-medium">Acesso restrito para importação</p>
                <p className="text-xs mt-0.5 text-amber-800 dark:text-amber-300">
                  Seu usuário possui acesso ao painel de RH, mas não possui permissão explícita para importar este tipo de registro. Contate o administrador.
                </p>
              </div>
            </div>
          ) : null}

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="conflict-policy" className="text-sm font-medium">
                Política de conflito para registros duplicados
              </Label>
              <Select value={conflictPolicy} onValueChange={(value) => setConflictPolicy(value as typeof conflictPolicy)}>
                <SelectTrigger id="conflict-policy" className="h-9">
                  <SelectValue placeholder="Selecione a política" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MERGE_UPDATE">Atualizar campos preenchidos (Merge)</SelectItem>
                  <SelectItem value="OVERWRITE">Sobrescrever registro existente completo</SelectItem>
                  <SelectItem value="SKIP">Ignorar existentes (Não alterar)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Merge Update:</span> preserva campos já cadastrados quando a planilha estiver em branco.
              </p>
            </div>

            {activeTab === 'employees' ? (
              <div className="space-y-2">
                <Label htmlFor="employee-source-mode" className="text-sm font-medium">
                  Modo de estrutura do arquivo
                </Label>
                <Select value={employeeSourceMode} onValueChange={(value) => setEmployeeSourceMode(value as typeof employeeSourceMode)}>
                  <SelectTrigger id="employee-source-mode" className="h-9">
                    <SelectValue placeholder="Selecione o modo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMPLOYEE_ONLY">Somente funcionário (departamento já existente)</SelectItem>
                    <SelectItem value="EMPLOYEE_WITH_DEPARTMENT">Funcionário com criação de departamento</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Selecione se novos departamentos referenciados devem ser criados automaticamente.
                </p>
              </div>
            ) : null}

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="import-file" className="text-sm font-medium">
                Arquivo de dados (.csv ou .xlsx)
              </Label>
              <div className="flex items-center gap-4">
                <Input
                  id="import-file"
                  type="file"
                  accept=".csv,.xlsx"
                  onChange={(event) => onFileChange(event.target.files?.[0] || null)}
                  className="cursor-pointer file:cursor-pointer file:text-foreground h-9"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Formatos suportados: planilhas Excel (.xlsx) e arquivos delimitados (.csv). Tamanho máximo permitido: 5MB.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-border/60 pt-4">
            <Button
              type="button"
              size="sm"
              disabled={!selectedFile || submitting || !activePermission}
              onClick={onPreview}
              className="gap-1.5"
            >
              {submitting ? (
                <>
                  <RotateCw className="h-3.5 w-3.5 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Eye className="h-3.5 w-3.5" />
                  Gerar Preview
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!selectedFile || submitting || !activePermission}
              onClick={onExecute}
              className="gap-1.5"
            >
              <Play className="h-3.5 w-3.5" />
              Importar Diretamente
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={selectedBatch?.status !== 'PREVIEW_READY' || submitting}
              onClick={onCommit}
              className="gap-1.5"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Confirmar Preview Selecionado
            </Button>
            {selectedFile ? (
              <Badge variant="outline" className="border-border/60 bg-muted/30 text-xs font-normal">
                {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </Badge>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* Sample Templates Card */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
            Modelos de Planilha para Download
          </CardTitle>
          <CardDescription className="text-xs">
            Baixe o modelo pré-formatado com as colunas esperadas para preenchimento.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {templateLinks.map((link) => (
            <Button key={link.href} asChild variant="outline" size="sm" className="h-8 gap-1.5">
              <a href={link.href} download>
                <Download className="h-3.5 w-3.5 text-muted-foreground" />
                {link.label}
              </a>
            </Button>
          ))}
        </CardContent>
      </Card>

      {/* Temporary Credentials */}
      {temporaryCredentials && temporaryCredentials.length > 0 ? (
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900/60 dark:bg-amber-950/20 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              Credenciais Temporárias Geradas
            </CardTitle>
            <CardDescription className="text-amber-800/80 dark:text-amber-300/80 text-xs">
              Atenção: Estas senhas provisórias são exibidas apenas nesta resposta. Copie e armazene com segurança.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-xl border border-amber-200 dark:border-amber-900/60 bg-background">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Linha</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Senha Provisória</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {temporaryCredentials.map((item) => (
                    <TableRow key={`${item.rowNumber}-${item.email}`}>
                      <TableCell className="font-mono text-xs">{item.rowNumber}</TableCell>
                      <TableCell className="font-medium text-xs">{item.email}</TableCell>
                      <TableCell className="font-mono text-xs text-foreground bg-muted/40 px-2 py-1 rounded">
                        {item.temporaryPassword}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Batch History Table */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                Histórico de Importações
              </CardTitle>
              <CardDescription>
                Acompanhe o status de cada lote processado ou pendente de confirmação.
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs">
              {history.length} {history.length === 1 ? 'lote' : 'lotes'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loadingHistory ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Carregando histórico de importações...
            </div>
          ) : history.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Nenhum lote registrado para este tipo de importação.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Arquivo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Política Conflito</TableHead>
                  <TableHead>Total Linhas</TableHead>
                  <TableHead>Data de Criação</TableHead>
                  <TableHead className="w-[120px] text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((item) => {
                  const isSelected = selectedBatch?.id === item.id
                  return (
                    <TableRow key={item.id} className={isSelected ? 'bg-muted/40' : ''}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="font-medium text-foreground text-xs">{item.fileName}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {getConflictPolicyLabel(item.conflictPolicy)}
                      </TableCell>
                      <TableCell className="text-xs font-semibold">
                        {item.summary?.totalRows ?? '-'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(item.createdAt).toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant={isSelected ? 'secondary' : 'ghost'}
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={() => void onSelectBatch(item.id)}
                        >
                          <Eye className="h-3 w-3" />
                          Detalhes
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Selected Batch Details */}
      {selectedBatch ? (
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Layers className="h-5 w-5 text-muted-foreground" />
                  Detalhes do Lote Selecionado
                </CardTitle>
                <CardDescription className="text-xs">
                  {selectedBatch.fileName} &bull; Criado em {new Date(selectedBatch.createdAt).toLocaleString('pt-BR')}
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-xs">
                  {selectedBatch.type === 'DEPARTMENTS' ? 'Departamentos' : 'Colaboradores'}
                </Badge>
                {getStatusBadge(selectedBatch.status)}
                {selectedBatch.status === 'PREVIEW_READY' && (
                  <Button
                    size="sm"
                    className="h-7 text-xs gap-1.5"
                    disabled={submitting}
                    onClick={onCommit}
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    Confirmar Importação
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Metric counters */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <div className="rounded-xl border border-border/60 bg-muted/20 p-3 text-center">
                <span className="text-xs text-muted-foreground">Total Linhas</span>
                <p className="mt-1 text-xl font-bold text-foreground">{selectedBatch.summary?.totalRows ?? 0}</p>
              </div>
              <div className="rounded-xl border border-emerald-200/50 bg-emerald-50/30 dark:border-emerald-900/40 dark:bg-emerald-950/20 p-3 text-center">
                <span className="text-xs text-emerald-700 dark:text-emerald-400">Criados</span>
                <p className="mt-1 text-xl font-bold text-emerald-700 dark:text-emerald-400">{selectedBatch.summary?.createdRows ?? 0}</p>
              </div>
              <div className="rounded-xl border border-sky-200/50 bg-sky-50/30 dark:border-sky-900/40 dark:bg-sky-950/20 p-3 text-center">
                <span className="text-xs text-sky-700 dark:text-sky-400">Atualizados</span>
                <p className="mt-1 text-xl font-bold text-sky-700 dark:text-sky-400">{selectedBatch.summary?.updatedRows ?? 0}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/20 p-3 text-center">
                <span className="text-xs text-muted-foreground">Ignorados</span>
                <p className="mt-1 text-xl font-bold text-foreground">{selectedBatch.summary?.skippedRows ?? 0}</p>
              </div>
              <div className="rounded-xl border border-rose-200/50 bg-rose-50/30 dark:border-rose-900/40 dark:bg-rose-950/20 p-3 text-center">
                <span className="text-xs text-rose-600 dark:text-rose-400">Erros</span>
                <p className="mt-1 text-xl font-bold text-rose-600 dark:text-rose-400">{selectedBatch.summary?.failedRows ?? 0}</p>
              </div>
              <div className="rounded-xl border border-amber-200/50 bg-amber-50/30 dark:border-amber-900/40 dark:bg-amber-950/20 p-3 text-center">
                <span className="text-xs text-amber-700 dark:text-amber-400">Preview</span>
                <p className="mt-1 text-xl font-bold text-amber-700 dark:text-amber-400">{selectedBatch.summary?.previewRows ?? 0}</p>
              </div>
            </div>

            {/* Detailed Row Report Table */}
            <div className="overflow-hidden rounded-xl border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Linha</TableHead>
                    <TableHead>Entidade</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                    <TableHead className="w-28">Ação</TableHead>
                    <TableHead>Mensagem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedBatch.report?.length ? (
                    selectedBatch.report.map((item) => (
                      <TableRow key={`${item.rowNumber}-${item.entityLabel}`}>
                        <TableCell className="font-mono text-xs">{item.rowNumber}</TableCell>
                        <TableCell className="font-medium text-xs text-foreground">{item.entityLabel}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              item.status === 'SUCCESS'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                                : item.status === 'ERROR'
                                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400'
                                  : item.status === 'PREVIEW'
                                    ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-400'
                                    : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {item.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">{item.action}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{item.message}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-xs text-muted-foreground">
                        O lote selecionado ainda não possui relatório detalhado por linha.
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
