'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { useAuth } from '@/context/auth-context';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Coins,
  Cpu,
  Database,
  Filter,
  RefreshCw,
  Search,
  Trash2,
  Zap,
} from 'lucide-react';

interface AiUsageKpis {
  totalExecutions: number;
  completedExecutions: number;
  failedExecutions: number;
  cancelledExecutions: number;
  totalTokens: number;
  promptTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  activeConversations: number;
}

interface ExecutionLogItem {
  id: string;
  clientRequestId: string | null;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  provider: string | null;
  model: string | null;
  promptTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  estimatedCost: number | null;
  errorSanitized: string | null;
  createdAt: string;
  requesterUser: {
    id: string;
    name: string;
    email: string;
  };
  conversation: {
    id: string;
    title: string | null;
    contextType: string | null;
  };
  toolInvocations: Array<{
    id: string;
    toolName: string;
    status: string;
    createdAt: string;
  }>;
}

export default function AiUsagePage() {
  const { user } = useAuth();
  const [kpis, setKpis] = useState<AiUsageKpis | null>(null);
  const [logs, setLogs] = useState<ExecutionLogItem[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filtros
  const [filterProvider, setFilterProvider] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const [isPurging, startPurging] = useTransition();
  const [isRecovering, startRecovering] = useTransition();

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filterProvider !== 'ALL') params.append('provider', filterProvider);
      if (filterStatus !== 'ALL') params.append('status', filterStatus);
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());

      const [metricsRes, logsRes] = await Promise.all([
        api.get(`/ai/usage/metrics?${params.toString()}`),
        api.get(`/ai/usage/logs?${params.toString()}`),
      ]);

      setKpis(metricsRes.data.kpis);
      setLogs(logsRes.data.items || []);
      setTotalLogs(logsRes.data.total || 0);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao carregar dados de consumo e auditoria.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.companyId, filterProvider, filterStatus, page]);

  const handlePurge = () => {
    if (
      !confirm(
        'Deseja executar a purga de retenção agora? Mensagens e execuções mais antigas que a janela configurada serão apagadas permanentemente conforme as diretrizes de governança.',
      )
    ) {
      return;
    }

    startPurging(async () => {
      try {
        setError(null);
        const res = await api.post('/ai/usage/purge', {});
        setSuccess(
          `Purga concluída com sucesso. Mensagens removidas: ${res.data.purgedMessages}, Execuções removidas: ${res.data.purgedRuns} (${res.data.retentionDays} dias de retenção).`,
        );
        await fetchData();
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Falha ao executar purga de retenção.');
      }
    });
  };

  const handleRecover = () => {
    startRecovering(async () => {
      try {
        setError(null);
        const res = await api.post('/ai/usage/recover', {});
        if (res.data.recoveredCount > 0) {
          setSuccess(`${res.data.recoveredCount} execuções órfãs/travadas foram recuperadas e saneadas com sucesso.`);
        } else {
          setSuccess('Nenhuma execução órfã ou travada detectada no momento.');
        }
        await fetchData();
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Falha ao executar rotina de recuperação.');
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Consumo, Auditoria e Governança de IA
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Métricas consolidadas de tokens, estimativas de custo e trilha de auditoria sem exposição de conteúdo confidencial.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRecover}
            disabled={isRecovering}
            className="text-xs gap-1.5"
            title="Recupera execuções travadas em RUNNING por timeout"
          >
            <RefreshCw className={`size-3.5 ${isRecovering ? 'animate-spin' : ''}`} />
            <span>Saneamento</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handlePurge}
            disabled={isPurging}
            className="text-xs gap-1.5 border-rose-200 dark:border-rose-900 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
            title="Executar limpeza imediata com base na política de retenção"
          >
            <Trash2 className="size-3.5 text-rose-500" />
            <span>Purga de Retenção</span>
          </Button>
        </div>
      </div>

      {/* Alertas */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-rose-600" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700 font-bold">
            ✕
          </button>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-emerald-600" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="text-emerald-500 hover:text-emerald-700 font-bold">
            ✕
          </button>
        </div>
      )}

      {/* 4 Cards de KPIs no padrão TocLog */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Execuções */}
        <Card className="p-4 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Execuções Realizadas</span>
            <Activity className="size-4 text-primary" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {kpis?.totalExecutions ?? 0}
            </span>
            <span className="text-xs text-slate-400">runs</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800/80">
            <span className="text-emerald-600 font-medium">{kpis?.completedExecutions ?? 0} concluídas</span>
            <span>•</span>
            <span className="text-rose-500 font-medium">{kpis?.failedExecutions ?? 0} falhas</span>
          </div>
        </Card>

        {/* KPI 2: Tokens Consumidos */}
        <Card className="p-4 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Tokens Consumidos</span>
            <Zap className="size-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {((kpis?.totalTokens ?? 0) / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k
            </span>
            <span className="text-xs text-slate-400">tokens</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800/80">
            <span>In: {((kpis?.promptTokens ?? 0) / 1000).toFixed(1)}k</span>
            <span>•</span>
            <span>Out: {((kpis?.outputTokens ?? 0) / 1000).toFixed(1)}k</span>
          </div>
        </Card>

        {/* KPI 3: Custo Estimado */}
        <Card className="p-4 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Custo Estimado (USD)</span>
            <Coins className="size-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              ${kpis?.estimatedCostUsd?.toFixed(4) ?? '0.0000'}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/80">
            Estimativa prudencial por modelo (AC-01)
          </div>
        </Card>

        {/* KPI 4: Conversas Ativas */}
        <Card className="p-4 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Conversas no Acervo</span>
            <Database className="size-4 text-blue-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {kpis?.activeConversations ?? 0}
            </span>
            <span className="text-xs text-slate-400">conversas</span>
          </div>
          <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/80">
            Isoladas por tenant da empresa
          </div>
        </Card>
      </div>

      {/* Barra de Filtros */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Filtros de Auditoria:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span>Provedor:</span>
            <select
              value={filterProvider}
              onChange={(e) => {
                setFilterProvider(e.target.value);
                setPage(1);
              }}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="ALL">Todos os Provedores</option>
              <option value="OPENAI">OpenAI</option>
              <option value="ANTHROPIC">Anthropic</option>
              <option value="GEMINI">Google Gemini</option>
              <option value="OPENROUTER">OpenRouter</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span>Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setPage(1);
              }}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="ALL">Todos os Status</option>
              <option value="COMPLETED">Concluídas</option>
              <option value="FAILED">Falhas</option>
              <option value="RUNNING">Em Andamento</option>
              <option value="CANCELLED">Canceladas</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabela de Trilha de Auditoria Sanitizada (AC-02) */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-sm">
            <RefreshCw className="size-6 animate-spin mx-auto mb-2 text-primary" />
            <p>Carregando trilha de auditoria...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-sm">
            <Activity className="size-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">Nenhuma execução registrada</p>
            <p className="text-xs text-slate-400 mt-1">
              As execuções de assistentes e ferramentas aparecerão aqui com metadados sanitizados.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Data / Hora</th>
                  <th className="py-3 px-4">Usuário</th>
                  <th className="py-3 px-4">Provedor / Modelo</th>
                  <th className="py-3 px-4">Contexto</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Tokens (In / Out)</th>
                  <th className="py-3 px-4 text-right">Custo Est.</th>
                  <th className="py-3 px-4 text-right">Ferramentas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-slate-100">
                      <div className="truncate max-w-[160px]" title={log.requesterUser.email}>
                        {log.requesterUser.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-normal truncate max-w-[160px]">
                        {log.requesterUser.email}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {log.provider || 'PADRÃO'}
                      </div>
                      <div className="font-mono text-[10px] text-slate-400">
                        {log.model || 'auto'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-medium border border-slate-200 dark:border-slate-700">
                        {log.conversation.contextType || 'GERAL'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {log.status === 'COMPLETED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          Concluído
                        </span>
                      ) : log.status === 'FAILED' ? (
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
                          title={log.errorSanitized || 'Erro na execução'}
                        >
                          Falhou
                        </span>
                      ) : log.status === 'RUNNING' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                          <span className="size-1.5 rounded-full bg-blue-500 animate-pulse" />
                          Executando
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-300 dark:border-slate-700">
                          {log.status}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono">
                      {log.totalTokens !== null ? (
                        <span>
                          {log.promptTokens || 0} / {log.outputTokens || 0}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-800 dark:text-slate-200">
                      ${log.estimatedCost !== null ? log.estimatedCost.toFixed(4) : '0.0000'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {log.toolInvocations.length > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-slate-600 dark:text-slate-300">
                          {log.toolInvocations.length} tool(s)
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px]">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginação */}
        {totalLogs > pageSize && (
          <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex items-center justify-between text-xs text-slate-500">
            <span>
              Mostrando {logs.length} de {totalLogs} registros de auditoria
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="text-xs h-7 px-2"
              >
                Anterior
              </Button>
              <span className="font-medium text-slate-700 dark:text-slate-300">Página {page}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page * pageSize >= totalLogs}
                className="text-xs h-7 px-2"
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
