'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { useAuth } from '@/context/auth-context';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AiMarkdownRenderer } from '@/components/ai/ai-markdown-renderer';

interface KnowledgeDocItem {
  id: string;
  title: string;
  module: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  version: number;
  chunksCount: number;
  revisionsCount?: number;
  createdAt: string;
  updatedAt: string;
}

interface KnowledgeDocDetail extends KnowledgeDocItem {
  revisions?: Array<{
    id: string;
    revision: number;
    content: string;
    createdAt: string;
  }>;
}

export default function AiKnowledgePage() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<KnowledgeDocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filters
  const [filterModule, setFilterModule] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog State (Create / Edit)
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<KnowledgeDocDetail | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formModule, setFormModule] = useState('GERAL');
  const [formContent, setFormContent] = useState('');
  const [formPublishNow, setFormPublishNow] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [isSaving, startSaving] = useTransition();

  // Dialog State (History / Revision viewer)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyDoc, setHistoryDoc] = useState<KnowledgeDocDetail | null>(null);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (filterModule !== 'ALL') params.append('module', filterModule);
      if (filterStatus !== 'ALL') params.append('status', filterStatus);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const res = await api.get(`/ai/knowledge?${params.toString()}`);
      setDocuments(res.data.items || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao carregar acervo de conhecimento.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [user?.companyId, filterModule, filterStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDocuments();
  };

  const handleOpenCreate = () => {
    setEditingDoc(null);
    setFormTitle('');
    setFormModule('GERAL');
    setFormContent('# Procedimento Operacional\n\nDescreva detalhadamente as regras e orientações...');
    setFormPublishNow(false);
    setActiveTab('editor');
    setIsDialogOpen(true);
  };

  const handleOpenEdit = async (doc: KnowledgeDocItem) => {
    try {
      setError(null);
      const res = await api.get(`/ai/knowledge/${doc.id}`);
      const detail: KnowledgeDocDetail = res.data;
      setEditingDoc(detail);
      setFormTitle(detail.title);
      setFormModule(detail.module || 'GERAL');
      const latestContent = detail.revisions?.[0]?.content || '';
      setFormContent(latestContent);
      setFormPublishNow(detail.status === 'PUBLISHED');
      setActiveTab('editor');
      setIsDialogOpen(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao carregar documento para edição.');
    }
  };

  const handleOpenHistory = async (doc: KnowledgeDocItem) => {
    try {
      setError(null);
      const res = await api.get(`/ai/knowledge/${doc.id}`);
      setHistoryDoc(res.data);
      setIsHistoryOpen(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao carregar histórico do documento.');
    }
  };

  const handleSave = () => {
    if (!formTitle.trim()) {
      setError('O título do documento é obrigatório.');
      return;
    }
    if (!formContent.trim()) {
      setError('O conteúdo markdown do documento é obrigatório.');
      return;
    }

    startSaving(async () => {
      try {
        setError(null);
        if (editingDoc) {
          await api.put(`/ai/knowledge/${editingDoc.id}`, {
            title: formTitle.trim(),
            module: formModule === 'GERAL' ? null : formModule,
            content: formContent,
            publishNow: formPublishNow,
          });
          setSuccess('Documento e nova revisão salvos com sucesso.');
        } else {
          await api.post('/ai/knowledge', {
            title: formTitle.trim(),
            module: formModule === 'GERAL' ? null : formModule,
            content: formContent,
            publishNow: formPublishNow,
          });
          setSuccess('Novo documento criado no acervo de IA.');
        }
        setIsDialogOpen(false);
        await fetchDocuments();
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Falha ao salvar documento de conhecimento.');
      }
    });
  };

  const handlePublish = async (docId: string) => {
    try {
      setError(null);
      await api.post(`/ai/knowledge/${docId}/publish`, {});
      setSuccess('Documento publicado e fatiado em chunks no índice de busca.');
      await fetchDocuments();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Falha ao publicar documento.');
    }
  };

  const handleArchive = async (docId: string) => {
    if (!confirm('Deseja realmente arquivar este documento? Ele será desindexado da busca da IA imediatamente.')) {
      return;
    }
    try {
      setError(null);
      await api.post(`/ai/knowledge/${docId}/archive`, {});
      setSuccess('Documento arquivado com sucesso.');
      await fetchDocuments();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Falha ao arquivar documento.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header com Ações */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Bases de Conhecimento e Normas
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Documentação corporativa indexada com rastreabilidade de revisões para grounding dos assistentes de IA.
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="bg-primary hover:bg-primary/90 text-white shrink-0">
          <span className="material-symbols-outlined text-sm mr-2">add</span>
          Novo Documento
        </Button>
      </div>

      {/* Alertas */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-rose-600">error</span>
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
            <span className="material-symbols-outlined text-emerald-600">check_circle</span>
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="text-emerald-500 hover:text-emerald-700 font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Filtros e Busca */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
          <Input
            placeholder="Buscar por título ou assunto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-sm"
          />
          <Button type="submit" variant="secondary" className="shrink-0 text-sm">
            <span className="material-symbols-outlined text-sm mr-1">search</span>
            Buscar
          </Button>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span>Módulo:</span>
            <select
              value={filterModule}
              onChange={(e) => setFilterModule(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="ALL">Todos os Módulos</option>
              <option value="GERAL">Geral / Normas</option>
              <option value="PROCUREMENT">Compras</option>
              <option value="HELPDESK">Helpdesk</option>
              <option value="PORTARIA">Portaria</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span>Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="ALL">Todos os Status</option>
              <option value="PUBLISHED">Publicados</option>
              <option value="DRAFT">Rascunhos</option>
              <option value="ARCHIVED">Arquivados</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabela de Documentos */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-sm">
            <span className="material-symbols-outlined animate-spin text-2xl mb-2 text-primary">progress_activity</span>
            <p>Carregando acervo de conhecimento...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-sm">
            <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-700 mb-2">menu_book</span>
            <p className="font-semibold text-slate-700 dark:text-slate-300">Nenhum documento encontrado</p>
            <p className="text-xs text-slate-400 mt-1">
              Cadastre manuais, diretrizes operacionais e regras para permitir que a IA cite fontes confiáveis.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Documento</th>
                  <th className="py-3 px-4">Módulo</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Versão</th>
                  <th className="py-3 px-4 text-center">Trechos Indexados</th>
                  <th className="py-3 px-4">Última Atualização</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-slate-400 text-lg">description</span>
                        <span className="truncate max-w-[280px]" title={doc.title}>
                          {doc.title}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-medium border border-slate-200 dark:border-slate-700">
                        {doc.module || 'GERAL'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {doc.status === 'PUBLISHED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Publicado
                        </span>
                      ) : doc.status === 'DRAFT' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                          Rascunho
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-300 dark:border-slate-700">
                          Arquivado
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="font-mono text-slate-600 dark:text-slate-400 font-semibold">
                        v{doc.version}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="font-mono text-slate-600 dark:text-slate-400">
                        {doc.chunksCount} chunks
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                      {new Date(doc.updatedAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenHistory(doc)}
                          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Histórico de Revisões"
                        >
                          <span className="material-symbols-outlined text-base">history</span>
                        </button>
                        <button
                          onClick={() => handleOpenEdit(doc)}
                          className="p-1.5 text-primary hover:text-primary/80 rounded-lg hover:bg-primary/10"
                          title="Editar e Adicionar Revisão"
                        >
                          <span className="material-symbols-outlined text-base">edit</span>
                        </button>
                        {doc.status !== 'PUBLISHED' && (
                          <button
                            onClick={() => handlePublish(doc.id)}
                            className="p-1.5 text-emerald-600 hover:text-emerald-700 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                            title="Publicar e Reindexar"
                          >
                            <span className="material-symbols-outlined text-base">publish</span>
                          </button>
                        )}
                        {doc.status !== 'ARCHIVED' && (
                          <button
                            onClick={() => handleArchive(doc.id)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            title="Arquivar (Desindexar da IA)"
                          >
                            <span className="material-symbols-outlined text-base">archive</span>
                          </button>
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

      {/* Dialog: Criar / Editar Documento */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">menu_book</span>
              {editingDoc ? `Editar Documento: ${editingDoc.title} (v${editingDoc.version})` : 'Novo Documento de Conhecimento'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              {editingDoc
                ? 'Ao salvar modificações no conteúdo, uma nova revisão imutável será registrada.'
                : 'Cadastre o conteúdo inicial em Markdown estruturado para fatiamento de embeddings semânticos.'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                  Título do Documento *
                </label>
                <Input
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Ex: Política de Alçadas de Compras e Suprimentos"
                  className="bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 block">
                  Módulo de Domínio
                </label>
                <select
                  value={formModule}
                  onChange={(e) => setFormModule(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  <option value="GERAL">Geral / Corporativo</option>
                  <option value="PROCUREMENT">Compras (Procurement)</option>
                  <option value="HELPDESK">Helpdesk / TI</option>
                  <option value="PORTARIA">Portaria e Controle de Acesso</option>
                </select>
              </div>
            </div>

            {/* Alternância Editor vs Live Preview */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-950">
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab('editor')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                      activeTab === 'editor'
                        ? 'bg-primary text-white'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    Editor Markdown
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('preview')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                      activeTab === 'preview'
                        ? 'bg-primary text-white'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    Pré-visualização Renderizada
                  </button>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  {formContent.length} caracteres
                </span>
              </div>

              {activeTab === 'editor' ? (
                <textarea
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  rows={14}
                  className="w-full p-3 font-mono text-xs text-slate-800 dark:text-slate-200 bg-transparent resize-y focus:outline-none"
                  placeholder="Escreva as diretrizes, procedimentos e orientações da empresa em formato Markdown..."
                />
              ) : (
                <div className="p-4 max-h-[380px] overflow-y-auto bg-white dark:bg-slate-900/60">
                  <AiMarkdownRenderer content={formContent || '*Nenhum conteúdo para pré-visualização.*'} />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="publishNowCheckbox"
                checked={formPublishNow}
                onChange={(e) => setFormPublishNow(e.target.checked)}
                className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
              />
              <label htmlFor="publishNowCheckbox" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                Publicar imediatamente e atualizar o índice de busca semântica para este documento.
              </label>
            </div>
          </div>

          <DialogFooter className="border-t border-slate-100 dark:border-slate-800 pt-3">
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="bg-primary hover:bg-primary/90 text-white">
              {isSaving ? 'Salvando...' : editingDoc ? 'Salvar Nova Revisão' : 'Criar Documento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Histórico de Revisões */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">history</span>
              Revisões do Documento: {historyDoc?.title}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              Histórico de revisões com auditoria de integridade para grounding do assistente.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-3 py-2 divide-y divide-slate-100 dark:divide-slate-800">
            {historyDoc?.revisions?.map((rev) => (
              <div key={rev.id} className="pt-3 first:pt-0 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-primary font-mono">Revisão #{rev.revision}</span>
                    {rev.revision === historyDoc.version && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold">
                        Atual
                      </span>
                    )}
                  </div>
                  <span className="text-slate-400 text-[11px]">
                    {new Date(rev.createdAt).toLocaleString('pt-BR')}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono text-slate-700 dark:text-slate-300 max-h-32 overflow-y-auto">
                  {rev.content.slice(0, 300)}...
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="border-t border-slate-100 dark:border-slate-800 pt-3">
            <Button variant="secondary" onClick={() => setIsHistoryOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
