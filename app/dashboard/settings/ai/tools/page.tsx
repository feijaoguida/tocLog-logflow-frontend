'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Wrench,
  Plus,
  FileCode2,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  Shield,
  Clock,
  Sparkles,
} from 'lucide-react';

interface ToolItem {
  id: string;
  companyId: string;
  key: string;
  name: string;
  description: string;
  operationId: string;
  operationVersion: number;
  active: boolean;
  currentRevisionId: string | null;
  latestRevision?: {
    id: string;
    revision: number;
    fixedInputs: any;
    exposedInputs: any;
    outputFields: any;
    limits: any;
    published: boolean;
    revoked: boolean;
  } | null;
  createdAt: string;
  updatedAt: string;
}

interface ApprovedOperation {
  id: string;
  name: string;
  description: string;
  module: string;
  requiredPermissions: string[];
  parameters: Array<{
    name: string;
    type: string;
    required: boolean;
    description: string;
  }>;
  allowedOutputFields: Array<{
    name: string;
    type: string;
    description: string;
  }>;
  defaultLimits: {
    timeoutMs: number;
    maxRows?: number;
    maxOutputBytes: number;
  };
}

export default function AiToolsPage() {
  const { user } = useAuth();
  const [tools, setTools] = useState<ToolItem[]>([]);
  const [operations, setOperations] = useState<ApprovedOperation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filter
  const [searchQuery, setSearchQuery] = useState('');

  // Dialogs
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isSimulateOpen, setIsSimulateOpen] = useState(false);

  // Create Form State
  const [formKey, setFormKey] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formOperationId, setFormOperationId] = useState('');
  const [formFixedParams, setFormFixedParams] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Import JSON State
  const [importJsonText, setImportJsonText] = useState('');
  const [importPublishNow, setImportPublishNow] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Simulate State
  const [selectedToolForSim, setSelectedToolForSim] = useState<ToolItem | null>(null);
  const [simArguments, setSimArguments] = useState<Record<string, string>>({});
  const [simResult, setSimResult] = useState<any | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const fetchToolsAndOperations = async () => {
    try {
      setLoading(true);
      setError(null);
      const [toolsRes, opsRes] = await Promise.all([
        api.get('/ai/tools/definitions'),
        api.get('/ai/tools/operations'),
      ]);
      setTools(toolsRes.data || []);
      setOperations(opsRes.data || []);
      if (opsRes.data?.length > 0 && !formOperationId) {
        setFormOperationId(opsRes.data[0].id);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao carregar ferramentas de IA.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchToolsAndOperations();
  }, [user?.companyId]);

  const handleOpenCreate = () => {
    setFormKey('');
    setFormDescription('');
    setFormFixedParams({});
    if (operations.length > 0) {
      setFormOperationId(operations[0].id);
    }
    setIsCreateOpen(true);
  };

  const handleCreateTool = async () => {
    if (!formKey.trim()) {
      setError('O identificador da ferramenta é obrigatório.');
      return;
    }
    if (!formOperationId) {
      setError('Selecione uma operação homologada.');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      const op = operations.find((o) => o.id === formOperationId);

      const fixedClean: Record<string, any> = {};
      Object.entries(formFixedParams).forEach(([k, v]) => {
        if (v.trim()) fixedClean[k] = v.trim();
      });

      const exposed = (op?.parameters || [])
        .filter((p) => fixedClean[p.name] === undefined)
        .map((p) => ({
          name: p.name,
          type: p.type,
          required: p.required,
          description: p.description,
        }));

      await api.post('/ai/tools/definitions', {
        name: formKey.trim(),
        description: formDescription.trim() || op?.description || '',
        manifest: {
          operationKey: formOperationId,
          name: formKey.trim(),
          description: formDescription.trim() || op?.description || '',
          fixedParameters: fixedClean,
          exposedParameters: exposed,
          resultProjection: op?.allowedOutputFields?.map((f) => f.name) || [],
        },
      });

      setSuccess(`Ferramenta '${formKey}' criada com sucesso como rascunho.`);
      setIsCreateOpen(false);
      await fetchToolsAndOperations();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Falha ao criar ferramenta configurável.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenImport = () => {
    setImportJsonText(
      JSON.stringify(
        {
          operationKey: 'procurement.purchase-summary',
          name: 'resumo_compras_diretoria',
          description: 'Consulta indicadores financeiros de compras filtrados por departamento.',
          fixedParameters: {
            departamentoId: 'dept-diretoria',
          },
          exposedParameters: [
            {
              name: 'termo',
              type: 'string',
              required: false,
              description: 'Busca opcional por item ou fornecedor',
            },
          ],
          resultProjection: ['totais.totalOrdensDistintas', 'totais.valorTotalItens'],
        },
        null,
        2,
      ),
    );
    setImportPublishNow(false);
    setIsImportOpen(true);
  };

  const handleConfirmImport = async () => {
    try {
      setIsImporting(true);
      setError(null);
      let parsed: any;
      try {
        parsed = JSON.parse(importJsonText);
      } catch (e) {
        setError('O JSON informado é inválido. Verifique a sintaxe.');
        return;
      }

      await api.post('/ai/tools/import', {
        manifest: parsed,
        publishNow: importPublishNow,
      });

      setSuccess(`Manifesto '${parsed.name}' importado com sucesso.`);
      setIsImportOpen(false);
      await fetchToolsAndOperations();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Falha ao importar manifesto declarativo.');
    } finally {
      setIsImporting(false);
    }
  };

  const handlePublish = async (toolId: string) => {
    try {
      setError(null);
      await api.post(`/ai/tools/definitions/${toolId}/publish`, {});
      setSuccess('Revisão da ferramenta publicada com sucesso e liberada para os assistentes.');
      await fetchToolsAndOperations();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Falha ao publicar ferramenta.');
    }
  };

  const handleRevoke = async (toolId: string) => {
    if (!confirm('Deseja realmente revogar esta ferramenta? Ela será bloqueada para todos os assistentes imediatamente.')) {
      return;
    }
    try {
      setError(null);
      await api.post(`/ai/tools/definitions/${toolId}/revoke`, {});
      setSuccess('Ferramenta revogada com sucesso.');
      await fetchToolsAndOperations();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Falha ao revogar ferramenta.');
    }
  };

  const handleOpenSimulate = (tool: ToolItem) => {
    setSelectedToolForSim(tool);
    setSimArguments({});
    setSimResult(null);
    setIsSimulateOpen(true);
  };

  const handleRunSimulation = async () => {
    if (!selectedToolForSim) return;
    try {
      setIsSimulating(true);
      setError(null);
      const res = await api.post(`/ai/tools/definitions/${selectedToolForSim.id}/simulate`, {
        arguments: simArguments,
      });
      setSimResult(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Falha ao executar simulação da ferramenta.');
    } finally {
      setIsSimulating(false);
    }
  };

  const filteredTools = tools.filter(
    (t) =>
      t.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.operationId.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Wrench className="size-5 text-primary" />
            Ferramentas Configuráveis
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Crie, publique e audite ferramentas corporativas com base nas operações homologadas pela engenharia.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={handleOpenImport}
            className="shrink-0 text-xs md:text-sm border-slate-200 dark:border-slate-800"
          >
            <FileCode2 className="size-4 mr-2 text-primary" />
            Importar Manifesto JSON
          </Button>
          <Button onClick={handleOpenCreate} className="bg-primary hover:bg-primary/90 text-white shrink-0 text-xs md:text-sm">
            <Plus className="size-4 mr-2" />
            Nova Ferramenta
          </Button>
        </div>
      </div>

      {/* Alertas */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700 font-bold">✕</button>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="text-emerald-500 hover:text-emerald-700 font-bold">✕</button>
        </div>
      )}

      {/* Card Informativo de Segurança */}
      <Card className="p-4 bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex items-start gap-3">
        <Shield className="size-5 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-slate-800 dark:text-slate-200">
            Governança e Defesa contra Injeção de Ferramentas (AC-01 / AC-04)
          </p>
          <p className="mt-0.5">
            Ferramentas configuráveis utilizam exclusivamente parâmetros fixos e projeções sobre operações pré-aprovadas. Nenhuma execução arbitrária de código, SQL livre ou requisições HTTP externas é permitida.
          </p>
        </div>
      </Card>

      {/* Barra de Filtros */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nome ou operação..."
            className="pl-9 text-xs h-9"
          />
        </div>
        <Button variant="ghost" size="sm" onClick={fetchToolsAndOperations} className="text-xs">
          <RefreshCw className="size-3.5 mr-1" /> Atualizar
        </Button>
      </div>

      {/* Tabela de Ferramentas */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            <RefreshCw className="size-5 animate-spin mx-auto mb-2 text-primary" />
            <p>Carregando ferramentas de IA...</p>
          </div>
        ) : filteredTools.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            <Wrench className="size-8 mx-auto mb-2 text-slate-400" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">Nenhuma ferramenta encontrada</p>
            <p className="text-xs text-slate-400 mt-1">
              Crie uma nova ferramenta sobre as operações homologadas ou importe um manifesto JSON.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Identificador da Ferramenta</th>
                  <th className="py-3 px-4">Operação Base</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Revisão</th>
                  <th className="py-3 px-4">Atualizado em</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                {filteredTools.map((tool) => (
                  <tr key={tool.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-900 dark:text-slate-100">
                      <div className="flex flex-col">
                        <span className="text-primary font-bold">{tool.key}</span>
                        <span className="text-[11px] text-slate-400 font-sans truncate max-w-xs">{tool.description}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-mono border border-slate-200 dark:border-slate-700">
                        {tool.operationId}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {tool.active && tool.currentRevisionId ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Publicada
                        </span>
                      ) : !tool.active ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                          Revogada
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                          Rascunho
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono">
                      rev {tool.latestRevision?.revision || 1}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {new Date(tool.updatedAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenSimulate(tool)}
                          className="h-7 px-2 text-xs text-primary hover:bg-primary/10"
                          title="Simular execução sob a identidade atual"
                        >
                          <Play className="size-3.5 mr-1" /> Simular
                        </Button>
                        {(!tool.currentRevisionId || !tool.active) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePublish(tool.id)}
                            className="h-7 px-2 text-xs text-emerald-600 hover:bg-emerald-50"
                          >
                            Publicar
                          </Button>
                        )}
                        {tool.active && tool.currentRevisionId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRevoke(tool.id)}
                            className="h-7 px-2 text-xs text-rose-600 hover:bg-rose-50"
                          >
                            Revogar
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dialog: Nova Ferramenta */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-xl p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Plus className="size-5 text-primary" /> Nova Ferramenta Configurável
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Parametrize uma ferramenta segura a partir do catálogo oficial homologado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold">Identificador da Ferramenta (snake_case) *</label>
              <Input
                value={formKey}
                onChange={(e) => setFormKey(e.target.value)}
                placeholder="ex: consultar_ordens_compras_sp"
                className="text-xs font-mono h-9"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold">Operação Homologada Base *</label>
              <select
                value={formOperationId}
                onChange={(e) => setFormOperationId(e.target.value)}
                className="w-full h-9 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                {operations.map((op) => (
                  <option key={op.id} value={op.id}>
                    {op.name} ({op.id})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold">Descrição para o Modelo de IA</label>
              <Input
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Instrua o assistente sobre quando chamar esta ferramenta..."
                className="text-xs h-9"
              />
            </div>

            {/* Parâmetros Fixos */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Parâmetros Fixos Opcionais (Imutáveis pelo Modelo)
              </span>
              <p className="text-[11px] text-slate-400">
                Valores fixados aqui não podem ser sobrescritos pelo modelo durante a execução.
              </p>
              {operations
                .find((o) => o.id === formOperationId)
                ?.parameters.map((param) => (
                  <div key={param.name} className="flex items-center gap-2 text-xs">
                    <span className="font-mono text-slate-500 w-32 shrink-0">{param.name}:</span>
                    <Input
                      value={formFixedParams[param.name] || ''}
                      onChange={(e) =>
                        setFormFixedParams({
                          ...formFixedParams,
                          [param.name]: e.target.value,
                        })
                      }
                      placeholder={`Valor fixo opcional (${param.description})`}
                      className="text-xs h-8 flex-1"
                    />
                  </div>
                ))}
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="ghost" onClick={() => setIsCreateOpen(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button onClick={handleCreateTool} disabled={isSaving} className="bg-primary hover:bg-primary/90 text-white">
              {isSaving ? 'Salvando...' : 'Criar Rascunho'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Importar Manifesto JSON */}
      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent className="max-w-2xl p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <FileCode2 className="size-5 text-primary" /> Importação Declarativa de Manifesto JSON
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Cole o manifesto JSON validado contra o esquema fechado da engenharia. A empresa é vinculada automaticamente à sua sessão.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <textarea
              value={importJsonText}
              onChange={(e) => setImportJsonText(e.target.value)}
              rows={12}
              className="w-full p-3 font-mono text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="importPublishCheck"
                checked={importPublishNow}
                onChange={(e) => setImportPublishNow(e.target.checked)}
                className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
              />
              <label htmlFor="importPublishCheck" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                Publicar imediatamente após importação (requer permissão ai.tools.publish)
              </label>
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="ghost" onClick={() => setIsImportOpen(false)} disabled={isImporting}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmImport} disabled={isImporting} className="bg-primary hover:bg-primary/90 text-white">
              {isImporting ? 'Importando...' : 'Confirmar Importação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Simulação de Execução */}
      <Dialog open={isSimulateOpen} onOpenChange={setIsSimulateOpen}>
        <DialogContent className="max-w-2xl p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Play className="size-5 text-primary" /> Simulação de Ferramenta: {selectedToolForSim?.key}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Executa simulação sob a identidade do seu usuário atual ({user?.email}) com verificação estrita de permissões de domínio.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-1">
              <p>
                <span className="font-semibold">Operação:</span> {selectedToolForSim?.operationId}
              </p>
              <p>
                <span className="font-semibold">Revisão:</span> rev {selectedToolForSim?.latestRevision?.revision || 1}
              </p>
              <p>
                <span className="font-semibold">Parâmetros Fixos:</span>{' '}
                <code className="font-mono">{JSON.stringify(selectedToolForSim?.latestRevision?.fixedInputs || {})}</code>
              </p>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold">Argumentos de Teste (Expostos)</span>
              {selectedToolForSim?.latestRevision?.exposedInputs?.length === 0 ? (
                <p className="text-xs text-slate-400">Esta ferramenta não possui parâmetros variáveis expostos.</p>
              ) : (
                selectedToolForSim?.latestRevision?.exposedInputs?.map((inp: any) => (
                  <div key={inp.name} className="flex items-center gap-2 text-xs">
                    <span className="font-mono text-slate-500 w-32 shrink-0">{inp.name}:</span>
                    <Input
                      value={simArguments[inp.name] || ''}
                      onChange={(e) =>
                        setSimArguments({
                          ...simArguments,
                          [inp.name]: e.target.value,
                        })
                      }
                      placeholder={inp.description || inp.type}
                      className="text-xs h-8 flex-1"
                    />
                  </div>
                ))
              )}
            </div>

            {simResult && (
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="size-3.5" /> Execução Concluída com Sucesso
                  </span>
                  <span className="text-slate-400 font-mono">{simResult.latencyMs} ms</span>
                </div>
                <div className="p-3 bg-slate-950 text-slate-200 rounded-xl font-mono text-[11px] max-h-48 overflow-y-auto">
                  <pre>{JSON.stringify(simResult, null, 2)}</pre>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button variant="ghost" onClick={() => setIsSimulateOpen(false)}>
              Fechar
            </Button>
            <Button
              onClick={handleRunSimulation}
              disabled={isSimulating}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              {isSimulating ? 'Executando...' : 'Executar Simulação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
