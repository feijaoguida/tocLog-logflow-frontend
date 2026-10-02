'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  Users,
  Plus,
  RotateCw,
  Search,
  UserCheck,
  Building,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  LogIn,
  LogOut,
  AlertTriangle,
  ArrowRightLeft,
  ShieldCheck,
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
import { portariaApi, PortariaGroup, PortariaGate } from '@/lib/portaria-api';

export default function PortariaGruposPage() {
  const [groups, setGroups] = useState<PortariaGroup[]>([]);
  const [gates, setGates] = useState<PortariaGate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modais de Operação
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [batchActionGroup, setBatchActionGroup] = useState<PortariaGroup | null>(null);
  const [batchType, setBatchType] = useState<'CHECK_IN' | 'CHECK_OUT'>('CHECK_IN');
  const [leaderChangeGroup, setLeaderChangeGroup] = useState<PortariaGroup | null>(null);

  // Estados de formulários
  const [submitting, setSubmitting] = useState(false);
  const [formGroupName, setFormGroupName] = useState('');
  const [formInstitution, setFormInstitution] = useState('');
  const [formExpectedCount, setFormExpectedCount] = useState(5);
  const [formLeaderName, setFormLeaderName] = useState('');
  const [formEscortUserId, setFormEscortUserId] = useState('');

  // Troca de Líder
  const [newLeaderParticipantId, setNewLeaderParticipantId] = useState('');
  const [leaderChangeReason, setLeaderChangeReason] = useState('');

  // Lote Check-in / Check-out
  const [selectedGateId, setSelectedGateId] = useState('');
  const [batchBadges, setBatchBadges] = useState<{ [participantId: string]: string }>({});

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const loadData = async () => {
    try {
      setLoading(true);
      const [groupsRes, gatesRes] = await Promise.all([
        portariaApi.getGroups(),
        portariaApi.getGates().catch(() => []),
      ]);
      setGroups(groupsRes.data || groupsRes || []);
      setGates(gatesRes.data || gatesRes || []);
    } catch (err) {
      console.error('Erro ao carregar dados de grupos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // KPIs
  const totalGroups = groups.length;
  const inProgressGroups = useMemo(
    () => groups.filter((g) => g.status === 'IN_PROGRESS').length,
    [groups]
  );
  const totalPresentParticipants = useMemo(() => {
    return groups.reduce((acc, g) => acc + (g.summary?.present || 0), 0);
  }, [groups]);
  const completedGroupsToday = useMemo(
    () => groups.filter((g) => g.status === 'COMPLETED').length,
    [groups]
  );

  // Filtros locais
  const filteredGroups = useMemo(() => {
    return groups.filter((g) => {
      const matchSearch =
        !search ||
        g.name.toLowerCase().includes(search.toLowerCase()) ||
        (g.institution && g.institution.toLowerCase().includes(search.toLowerCase())) ||
        (g.visit?.code && g.visit.code.toLowerCase().includes(search.toLowerCase()));

      const matchStatus = statusFilter === 'ALL' || g.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [groups, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredGroups.length / pageSize));
  const paginatedGroups = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredGroups.slice(start, start + pageSize);
  }, [filteredGroups, currentPage]);

  const activeFiltersCount = statusFilter !== 'ALL' ? 1 : 0;

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formGroupName.trim()) return;

    try {
      setSubmitting(true);
      // Cria visita coletiva e grupo
      await portariaApi.createGroup({
        name: formGroupName.trim(),
        institution: formInstitution.trim() || undefined,
        expectedParticipants: Number(formExpectedCount) || 1,
        leaderName: formLeaderName.trim() || undefined,
        internalEscortUserId: formEscortUserId.trim() || undefined,
      });

      setCreateDialogOpen(false);
      setFormGroupName('');
      setFormInstitution('');
      setFormLeaderName('');
      setFormEscortUserId('');
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao cadastrar grupo');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenBatchModal = (group: PortariaGroup, type: 'CHECK_IN' | 'CHECK_OUT') => {
    setBatchActionGroup(group);
    setBatchType(type);
    setSelectedGateId(gates[0]?.id || '');
    // Pré-preenche badges vazios
    const initialBadges: { [id: string]: string } = {};
    group.participants?.forEach((p) => {
      initialBadges[p.id] = '';
    });
    setBatchBadges(initialBadges);
  };

  const handleExecuteBatch = async () => {
    if (!batchActionGroup) return;

    try {
      setSubmitting(true);
      if (batchType === 'CHECK_IN') {
        const items = batchActionGroup.participants
          .filter((p) => p.status === 'APPROVED' || p.status === 'ARRIVED')
          .map((p) => ({
            participantId: p.id,
            badgeNumber: batchBadges[p.id] || undefined,
          }));

        if (items.length === 0) {
          alert('Nenhum participante apto para check-in neste grupo.');
          return;
        }

        await portariaApi.batchCheckIn(batchActionGroup.id, {
          gateId: selectedGateId || undefined,
          items,
        });
      } else {
        const participantIds = batchActionGroup.participants
          .filter((p) => p.status === 'IN_PROGRESS')
          .map((p) => p.id);

        if (participantIds.length === 0) {
          alert('Nenhum participante com sessão ativa para saída.');
          return;
        }

        await portariaApi.batchCheckOut(batchActionGroup.id, {
          gateId: selectedGateId || undefined,
          participantIds,
        });
      }

      setBatchActionGroup(null);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao executar operação em lote');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteGroup = async (group: PortariaGroup) => {
    if (group.summary && group.summary.present > 0) {
      alert(
        `Não é possível encerrar o grupo: ainda existem ${group.summary.present} participantes dentro do complexo!`
      );
      return;
    }

    if (!confirm(`Deseja realmente finalizar o grupo "${group.name}"?`)) return;

    try {
      setLoading(true);
      await portariaApi.completeGroup(group.id);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao finalizar grupo');
    } finally {
      setLoading(false);
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
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            Confirmado
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
            Encerrado
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-semibold text-red-700 dark:text-red-400">
            Cancelado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary/80 px-2 py-0.5 text-xs font-semibold text-secondary-foreground">
            Rascunho
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
            Grupos e Delegações
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestão coletiva de excursões, delegações técnicas e equipes de prestação de serviços
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
                <Label className="text-xs font-semibold text-muted-foreground">Status do Grupo</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos os status</SelectItem>
                    <SelectItem value="IN_PROGRESS">Em Andamento</SelectItem>
                    <SelectItem value="CONFIRMED">Confirmado</SelectItem>
                    <SelectItem value="COMPLETED">Encerrado</SelectItem>
                    <SelectItem value="DRAFT">Rascunho</SelectItem>
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
            Novo Grupo
          </Button>
        </div>
      </div>

      {/* 2. Quatro Cards de Indicadores (TocLog KPI Pattern) */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="border border-border/60 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Grupos Ativos
            </span>
            <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:text-blue-400">
              No Local
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
              {inProgressGroups}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Grupos com visitas em andamento
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Pessoas Presentes
            </span>
            <Users className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {totalPresentParticipants}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Membros de grupos com sessão aberta
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total de Grupos
            </span>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-foreground">
              {totalGroups}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Cadastrados no período
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Encerrados Hoje
            </span>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-foreground">
              {completedGroupsToday}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Visitas coletivas concluídas com sucesso
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
                placeholder="Buscar por grupo, instituição ou código..."
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
                <TableHead className="w-[180px] text-xs font-semibold">Grupo / Código</TableHead>
                <TableHead className="min-w-[160px] text-xs font-semibold">Instituição / Empresa</TableHead>
                <TableHead className="min-w-[180px] text-xs font-semibold">Líder & Acompanhante</TableHead>
                <TableHead className="w-[180px] text-xs font-semibold">Ocupação / Membros</TableHead>
                <TableHead className="w-[130px] text-xs font-semibold">Status</TableHead>
                <TableHead className="w-[180px] text-right text-xs font-semibold">Ações em Lote</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-xs text-muted-foreground">
                    Carregando grupos...
                  </TableCell>
                </TableRow>
              ) : paginatedGroups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-xs text-muted-foreground">
                    Nenhum grupo encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedGroups.map((group) => {
                  const presentCount = group.summary?.present || 0;
                  const totalExpected = group.expectedParticipants || group.participants?.length || 1;
                  const hasPendingExit = presentCount > 0;

                  return (
                    <TableRow key={group.id} className="hover:bg-muted/30 transition-colors">
                      {/* Col 1: Grupo */}
                      <TableCell className="text-xs">
                        <div className="font-semibold text-foreground">{group.name}</div>
                        {group.visit?.code && (
                          <div className="font-mono text-[11px] text-muted-foreground">
                            {group.visit.code}
                          </div>
                        )}
                      </TableCell>

                      {/* Col 2: Instituição */}
                      <TableCell className="text-xs">
                        <div className="font-medium text-foreground">
                          {group.institution || 'Não informada'}
                        </div>
                      </TableCell>

                      {/* Col 3: Líder / Acompanhante */}
                      <TableCell className="text-xs">
                        <div className="flex items-center gap-1.5 font-medium text-foreground">
                          <UserCheck className="h-3.5 w-3.5 text-primary" />
                          <span>
                            {group.participants?.find((p) => p.isResponsible)?.name || 'Líder a definir'}
                          </span>
                        </div>
                        {group.internalEscortUserId && (
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            Escolta Interna Obrigatória
                          </div>
                        )}
                      </TableCell>

                      {/* Col 4: Ocupação */}
                      <TableCell className="text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-foreground">
                            {presentCount} presentes / {totalExpected} previstos
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-primary"
                            style={{
                              width: `${Math.min(100, Math.round((presentCount / Math.max(1, totalExpected)) * 100))}%`,
                            }}
                          />
                        </div>
                      </TableCell>

                      {/* Col 5: Status */}
                      <TableCell className="text-xs">{getStatusBadge(group.status)}</TableCell>

                      {/* Col 6: Ações */}
                      <TableCell className="text-right text-xs">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Entrada em Lote */}
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() => handleOpenBatchModal(group, 'CHECK_IN')}
                            title="Entrada Coletiva de Membros"
                          >
                            <LogIn className="h-3 w-3 text-emerald-600" />
                            Entrada
                          </Button>

                          {/* Saída em Lote */}
                          {hasPendingExit && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs gap-1"
                              onClick={() => handleOpenBatchModal(group, 'CHECK_OUT')}
                              title="Saída Coletiva de Membros"
                            >
                              <LogOut className="h-3 w-3 text-blue-600" />
                              Saída
                            </Button>
                          )}

                          {/* Encerrar */}
                          {group.status !== 'COMPLETED' && group.status !== 'CANCELLED' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-muted-foreground hover:text-foreground"
                              onClick={() => handleCompleteGroup(group)}
                            >
                              Encerrar
                            </Button>
                          )}
                        </div>
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
            Mostrando {filteredGroups.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} a{' '}
            {Math.min(currentPage * pageSize, filteredGroups.length)} de {filteredGroups.length} grupos
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

      {/* 4. Modal Cadastrar Novo Grupo */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Grupo ou Delegação</DialogTitle>
            <DialogDescription>
              Crie uma visita coletiva para delegações, excursões ou equipes terceirizadas.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateGroup} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nome do Grupo *</Label>
              <Input
                placeholder="Ex: Delegação Técnica Senai"
                value={formGroupName}
                onChange={(e) => setFormGroupName(e.target.value)}
                className="text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Instituição ou Empresa</Label>
              <Input
                placeholder="Ex: Senai Campinas / Logística Integrada"
                value={formInstitution}
                onChange={(e) => setFormInstitution(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Qtd. Prevista de Pessoas</Label>
                <Input
                  type="number"
                  min={1}
                  max={200}
                  value={formExpectedCount}
                  onChange={(e) => setFormExpectedCount(Number(e.target.value))}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Nome do Líder do Grupo</Label>
                <Input
                  placeholder="Ex: Carlos Silva"
                  value={formLeaderName}
                  onChange={(e) => setFormLeaderName(e.target.value)}
                  className="text-xs"
                />
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
                {submitting ? 'Criando...' : 'Criar Grupo'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 5. Modal Executar Operação em Lote */}
      <Dialog
        open={!!batchActionGroup}
        onOpenChange={(open) => {
          if (!open) setBatchActionGroup(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {batchType === 'CHECK_IN' ? 'Entrada Coletiva (Check-in)' : 'Saída Coletiva (Check-out)'}
            </DialogTitle>
            <DialogDescription>
              Grupo: <span className="font-semibold text-foreground">{batchActionGroup?.name}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Portão de Acesso</Label>
              <Select value={selectedGateId} onValueChange={setSelectedGateId}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Selecione o portão" />
                </SelectTrigger>
                <SelectContent>
                  {gates.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name} ({g.code || 'Principal'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Membros Selecionados para Operação</Label>
              <div className="max-h-60 overflow-y-auto rounded-md border border-border/60 p-2 space-y-2">
                {batchActionGroup?.participants?.map((p) => {
                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between gap-2 p-1.5 rounded-sm hover:bg-muted/40 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{p.name}</span>
                        {p.isResponsible && (
                          <span className="rounded-full bg-primary/10 px-1.5 py-0.2 text-[10px] font-semibold text-primary">
                            Líder
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground">({p.status})</span>
                      </div>

                      {batchType === 'CHECK_IN' && (
                        <div className="w-32">
                          <Input
                            placeholder="Nº Crachá"
                            value={batchBadges[p.id] || ''}
                            onChange={(e) =>
                              setBatchBadges((prev) => ({
                                ...prev,
                                [p.id]: e.target.value,
                              }))
                            }
                            className="h-7 text-xs font-mono"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setBatchActionGroup(null)}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleExecuteBatch}
                disabled={submitting}
                className={
                  batchType === 'CHECK_IN'
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }
              >
                {submitting
                  ? 'Processando...'
                  : batchType === 'CHECK_IN'
                    ? 'Confirmar Entrada em Lote'
                    : 'Confirmar Saída em Lote'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
