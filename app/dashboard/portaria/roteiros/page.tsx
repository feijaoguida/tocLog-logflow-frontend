'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  MapPin,
  Plus,
  RotateCw,
  Search,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
  AlertTriangle,
  Play,
  SkipForward,
  CheckCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { FilterPopover } from '@/components/ui/filter-popover';
import {
  portariaApi,
  PortariaRoute,
  PortariaAccessArea,
  PortariaBranch,
} from '@/lib/portaria-api';

export default function PortariaRoteirosPage() {
  const [routes, setRoutes] = useState<PortariaRoute[]>([]);
  const [areas, setAreas] = useState<PortariaAccessArea[]>([]);
  const [branches, setBranches] = useState<PortariaBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modais
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [skipDialogOpen, setSkipDialogOpen] = useState(false);
  const [selectedRouteForSkip, setSelectedRouteForSkip] = useState<{
    routeId: string;
    stopId: string;
  } | null>(null);
  const [skipReason, setSkipReason] = useState('');

  // Formulário Novo Roteiro
  const [submitting, setSubmitting] = useState(false);
  const [formBranchId, setFormBranchId] = useState('');
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formSelectedAreaIds, setFormSelectedAreaIds] = useState<string[]>([]);

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const loadData = async () => {
    try {
      setLoading(true);
      const [routesRes, areasRes, contextRes] = await Promise.all([
        portariaApi.getRoutes(),
        portariaApi.getAreas(),
        portariaApi.getContext().catch(() => ({ branches: [] })),
      ]);
      setRoutes(routesRes.data || routesRes || []);
      setAreas(areasRes.data || areasRes || []);
      const bList = contextRes.branches || [];
      setBranches(bList);
      if (bList.length > 0 && !formBranchId) {
        setFormBranchId(bList[0].id);
      }
    } catch (err) {
      console.error('Erro ao carregar roteiros:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // KPIs
  const totalRoutes = routes.length;
  const inProgressRoutes = useMemo(
    () => routes.filter((r) => r.status === 'IN_PROGRESS').length,
    [routes]
  );
  const completedRoutes = useMemo(
    () => routes.filter((r) => r.status === 'COMPLETED').length,
    [routes]
  );
  const criticalAreaRoutes = useMemo(() => {
    return routes.filter((r) =>
      r.stops?.some((s) => s.requiresEpi || s.requiresEscort || s.requiresSafetyTerm)
    ).length;
  }, [routes]);

  // Filtros locais
  const filteredRoutes = useMemo(() => {
    return routes.filter((r) => {
      const matchSearch =
        !search ||
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        (r.description && r.description.toLowerCase().includes(search.toLowerCase()));

      const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [routes, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRoutes.length / pageSize));
  const paginatedRoutes = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRoutes.slice(start, start + pageSize);
  }, [filteredRoutes, currentPage]);

  const activeFiltersCount = statusFilter !== 'ALL' ? 1 : 0;

  const handleCreateRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formBranchId || formSelectedAreaIds.length === 0) {
      alert('Preencha o nome, unidade e selecione pelo menos uma área.');
      return;
    }

    try {
      setSubmitting(true);
      const stops = formSelectedAreaIds.map((areaId, idx) => {
        const area = areas.find((a) => a.id === areaId);
        return {
          areaId,
          order: idx + 1,
          requiresEpi: area?.requiresEpi ?? false,
          requiresEscort: area?.requiresEscort ?? false,
          requiresSafetyTerm: area?.requiresSafetyTerm ?? false,
          requiresChecklist: area?.requiresChecklist ?? false,
        };
      });

      await portariaApi.createRoute({
        branchId: formBranchId,
        name: formName.trim(),
        description: formDescription.trim() || undefined,
        stops,
      });

      setCreateDialogOpen(false);
      setFormName('');
      setFormDescription('');
      setFormSelectedAreaIds([]);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao criar roteiro');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartStop = async (routeId: string, stopId: string) => {
    try {
      setLoading(true);
      await portariaApi.startRouteStop(routeId, stopId);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao iniciar etapa');
      setLoading(false);
    }
  };

  const handleCompleteStop = async (routeId: string, stopId: string) => {
    try {
      setLoading(true);
      await portariaApi.completeRouteStop(routeId, stopId);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao concluir etapa');
      setLoading(false);
    }
  };

  const handleConfirmSkipStop = async () => {
    if (!selectedRouteForSkip || !skipReason.trim()) {
      alert('Justificativa é obrigatória para pular uma etapa.');
      return;
    }

    try {
      setSubmitting(true);
      await portariaApi.skipRouteStop(
        selectedRouteForSkip.routeId,
        selectedRouteForSkip.stopId,
        skipReason.trim()
      );
      setSkipDialogOpen(false);
      setSelectedRouteForSkip(null);
      setSkipReason('');
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao pular etapa');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:text-blue-400">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" />
            Em Andamento
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            Concluído
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary/80 px-2 py-0.5 text-xs font-semibold text-secondary-foreground">
            Pendente
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* 1. Header TocLog Padrão */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Roteiros e Áreas Restritas
          </h1>
          <p className="text-sm text-muted-foreground">
            Controle de etapas obrigatórias, fluxo entre setores e conformidade de segurança
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="h-9 gap-1.5"
          >
            <RotateCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>

          <FilterPopover
            activeCount={activeFiltersCount}
            onClear={() => {
              setStatusFilter('ALL');
              setSearch('');
            }}
          >
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Status do Roteiro</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos os status</SelectItem>
                    <SelectItem value="IN_PROGRESS">Em Andamento</SelectItem>
                    <SelectItem value="PENDING">Pendente</SelectItem>
                    <SelectItem value="COMPLETED">Concluído</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </FilterPopover>

          <Button
            size="sm"
            onClick={() => setCreateDialogOpen(true)}
            className="h-9 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Novo Roteiro
          </Button>
        </div>
      </div>

      {/* 2. Quatro Cards de Indicadores (TocLog KPI Pattern) */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="border border-border/60 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Roteiros Ativos
            </span>
            <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:text-blue-400">
              Operando
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
              {inProgressRoutes}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Com etapas em execução neste turno
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Cadastrado
            </span>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-foreground">
              {totalRoutes}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Itinerários parametrizados na unidade
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Exigem Segurança Crítica
            </span>
            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
              EPI / Escolta
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-amber-700 dark:text-amber-400">
              {criticalAreaRoutes}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Paradas com exigência de EPI ou escolta
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Concluídos
            </span>
            <CheckCheck className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {completedRoutes}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Todas as etapas finalizadas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 3. Tabela Semântica 5-6 Colunas */}
      <Card className="border border-border/60 shadow-xs">
        <div className="p-4 border-b border-border/40">
          <div className="flex max-w-sm items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por roteiro ou descrição..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 pl-9 text-xs"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-[180px] text-xs font-semibold">Roteiro / Título</TableHead>
                <TableHead className="min-w-[180px] text-xs font-semibold">Paradas / Sequência</TableHead>
                <TableHead className="min-w-[160px] text-xs font-semibold">Próxima Etapa</TableHead>
                <TableHead className="w-[160px] text-xs font-semibold">Requisitos</TableHead>
                <TableHead className="w-[120px] text-xs font-semibold">Status</TableHead>
                <TableHead className="w-[180px] text-right text-xs font-semibold">Controle de Etapa</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-xs text-muted-foreground">
                    Carregando roteiros...
                  </TableCell>
                </TableRow>
              ) : paginatedRoutes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-xs text-muted-foreground">
                    Nenhum roteiro cadastrado.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedRoutes.map((route) => {
                  const stops = route.stops || [];
                  const activeStop = stops.find((s) => s.status === 'IN_PROGRESS');
                  const nextPendingStop = stops.find((s) => s.status === 'PENDING');
                  const currentOrNextStop = activeStop || nextPendingStop;

                  return (
                    <TableRow key={route.id} className="hover:bg-muted/30 transition-colors">
                      {/* Col 1: Roteiro */}
                      <TableCell className="text-xs">
                        <div className="font-semibold text-foreground">{route.name}</div>
                        {route.description && (
                          <div className="text-[11px] text-muted-foreground line-clamp-1">
                            {route.description}
                          </div>
                        )}
                      </TableCell>

                      {/* Col 2: Paradas */}
                      <TableCell className="text-xs">
                        <div className="flex items-center gap-1 flex-wrap">
                          {stops.map((s, idx) => (
                            <React.Fragment key={s.id}>
                              <span
                                className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                                  s.status === 'COMPLETED'
                                    ? 'bg-emerald-500/10 text-emerald-700'
                                    : s.status === 'IN_PROGRESS'
                                      ? 'bg-blue-500/15 text-blue-700 font-bold'
                                      : s.status === 'SKIPPED'
                                        ? 'bg-muted text-muted-foreground line-through'
                                        : 'bg-secondary/60 text-secondary-foreground'
                                }`}
                              >
                                {s.area?.name || `Área ${s.order}`}
                              </span>
                              {idx < stops.length - 1 && (
                                <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      </TableCell>

                      {/* Col 3: Próxima Etapa */}
                      <TableCell className="text-xs">
                        {currentOrNextStop ? (
                          <div>
                            <div className="font-medium text-foreground">
                              {currentOrNextStop.area?.name}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {currentOrNextStop.status === 'IN_PROGRESS'
                                ? 'Em andamento nesta parada'
                                : 'Aguardando liberação'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">Todas finalizadas</span>
                        )}
                      </TableCell>

                      {/* Col 4: Requisitos */}
                      <TableCell className="text-xs">
                        <div className="flex flex-col gap-0.5">
                          {currentOrNextStop?.requiresEpi && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 dark:text-amber-400">
                              <AlertTriangle className="h-3 w-3" />
                              Exige EPI
                            </span>
                          )}
                          {currentOrNextStop?.requiresEscort && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-700 dark:text-blue-400">
                              <ShieldAlert className="h-3 w-3" />
                              Exige Escolta
                            </span>
                          )}
                          {!currentOrNextStop?.requiresEpi && !currentOrNextStop?.requiresEscort && (
                            <span className="text-[11px] text-muted-foreground">Acesso Livre</span>
                          )}
                        </div>
                      </TableCell>

                      {/* Col 5: Status */}
                      <TableCell className="text-xs">{getStatusBadge(route.status)}</TableCell>

                      {/* Col 6: Controle */}
                      <TableCell className="text-right text-xs">
                        {currentOrNextStop && (
                          <div className="flex items-center justify-end gap-1.5">
                            {currentOrNextStop.status === 'PENDING' ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs gap-1"
                                onClick={() => handleStartStop(route.id, currentOrNextStop.id)}
                              >
                                <Play className="h-3 w-3 text-blue-600" />
                                Iniciar
                              </Button>
                            ) : currentOrNextStop.status === 'IN_PROGRESS' ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs gap-1"
                                onClick={() => handleCompleteStop(route.id, currentOrNextStop.id)}
                              >
                                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                Concluir
                              </Button>
                            ) : null}

                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                setSelectedRouteForSkip({
                                  routeId: route.id,
                                  stopId: currentOrNextStop.id,
                                });
                                setSkipDialogOpen(true);
                              }}
                              title="Pular etapa com justificativa"
                            >
                              <SkipForward className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Paginação */}
        <div className="flex items-center justify-between p-4 border-t border-border/40 text-xs text-muted-foreground">
          <span>
            Mostrando {filteredRoutes.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} a{' '}
            {Math.min(currentPage * pageSize, filteredRoutes.length)} de {filteredRoutes.length} roteiros
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2">
              {currentPage} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* 4. Modal Novo Roteiro */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Roteiro de Acesso</DialogTitle>
            <DialogDescription>
              Defina a sequência de setores autorizados para esta visita ou grupo.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateRoute} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Unidade Operacional</Label>
              <Select value={formBranchId} onValueChange={setFormBranchId}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Selecione a unidade" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Título do Roteiro *</Label>
              <Input
                placeholder="Ex: Roteiro Manutenção Elétrica Subestação"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Descrição ou Orientações</Label>
              <Input
                placeholder="Ex: Acesso permitido apenas acompanhado pela engenharia"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Selecione as Áreas (na ordem de visitação)</Label>
              <div className="max-h-40 overflow-y-auto rounded-md border border-border/60 p-2 space-y-1.5">
                {areas.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhuma área restrita cadastrada.</p>
                ) : (
                  areas.map((area) => {
                    const isSelected = formSelectedAreaIds.includes(area.id);
                    return (
                      <div
                        key={area.id}
                        className="flex items-center gap-2 p-1 text-xs cursor-pointer hover:bg-muted/40 rounded"
                        onClick={() => {
                          if (isSelected) {
                            setFormSelectedAreaIds(formSelectedAreaIds.filter((id) => id !== area.id));
                          } else {
                            setFormSelectedAreaIds([...formSelectedAreaIds, area.id]);
                          }
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="h-3.5 w-3.5 rounded border-gray-300"
                        />
                        <span className="font-medium text-foreground">{area.name}</span>
                        {area.requiresEpi && (
                          <span className="rounded bg-amber-500/10 px-1 text-[10px] text-amber-700">
                            EPI
                          </span>
                        )}
                        {area.requiresEscort && (
                          <span className="rounded bg-blue-500/10 px-1 text-[10px] text-blue-700">
                            Escolta
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCreateDialogOpen(false)}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="bg-primary text-primary-foreground"
              >
                {submitting ? 'Salvando...' : 'Salvar Roteiro'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 5. Modal Pular Parada com Justificativa */}
      <Dialog open={skipDialogOpen} onOpenChange={setSkipDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pular Etapa de Roteiro</DialogTitle>
            <DialogDescription>
              Esta ação registra um desvio de percurso auditável. Informe a justificativa operacional.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Justificativa Operacional *</Label>
              <Input
                placeholder="Ex: Área em manutenção emergencial / reprogramado pelo anfitrião"
                value={skipReason}
                onChange={(e) => setSkipReason(e.target.value)}
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSkipDialogOpen(false)}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleConfirmSkipStop}
                disabled={submitting}
                className="bg-amber-600 text-white hover:bg-amber-700"
              >
                {submitting ? 'Registrando...' : 'Confirmar Desvio'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
