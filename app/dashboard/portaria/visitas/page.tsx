'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  Plus,
  RotateCw,
  Search,
  Eye,
  UserCheck,
  CheckCircle2,
  XCircle,
  LogIn,
  LogOut,
  Calendar,
  Clock,
  Car,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
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
  PortariaBranch,
  PortariaVisit,
  PortariaVisitType,
  PortariaGate,
} from '@/lib/portaria-api';

function getInitials(name?: string | null) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getVisitStatusBadge(status: string) {
  switch (status) {
    case 'SCHEDULED':
      return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/60';
    case 'ARRIVED':
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60';
    case 'APPROVED':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900/60';
    case 'IN_PROGRESS':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60';
    case 'COMPLETED':
      return 'bg-muted text-muted-foreground border-border';
    case 'CANCELLED':
      return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60';
    default:
      return 'bg-secondary text-secondary-foreground border-border';
  }
}

export default function PortariaVisitasPage() {
  const [loading, setLoading] = useState(false);
  const [visits, setVisits] = useState<PortariaVisit[]>([]);
  const [branches, setBranches] = useState<PortariaBranch[]>([]);
  const [visitTypes, setVisitTypes] = useState<PortariaVisitType[]>([]);
  const [gates, setGates] = useState<PortariaGate[]>([]);

  // Filtros
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [admissionFilter, setAdmissionFilter] = useState('ALL');

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Modais de Operação
  const [isNewVisitOpen, setIsNewVisitOpen] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<PortariaVisit | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [isCheckOutOpen, setIsCheckOutOpen] = useState(false);
  const [isAuthorizeOpen, setIsAuthorizeOpen] = useState(false);

  // Form Nova Visita
  const [newVisitForm, setNewVisitForm] = useState({
    branchId: '',
    visitTypeId: '',
    admissionType: 'SCHEDULED',
    fullName: '',
    phone: '',
    documentNumber: '',
    hostName: '',
    hostDepartment: '',
    expectedArrivalDate: new Date().toISOString().substring(0, 16),
    reason: '',
  });

  // Form Check-in
  const [checkInBadge, setCheckInBadge] = useState('');
  const [checkInGateId, setCheckInGateId] = useState('');

  // Form Check-out
  const [checkOutGateId, setCheckOutGateId] = useState('');
  const [itemsReturned, setItemsReturned] = useState(true);

  // Form Autorização
  const [authDecision, setAuthDecision] = useState<'APPROVED' | 'DENIED'>('APPROVED');
  const [authMethod, setAuthMethod] = useState('SYSTEM');
  const [authNotes, setAuthNotes] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ctx, visitsRes, gatesRes] = await Promise.all([
        portariaApi.getContext().catch(() => ({ branches: [], visitTypes: [] })),
        portariaApi.getVisits().catch(() => []),
        portariaApi.getGates().catch(() => []),
      ]);

      setBranches(ctx.branches || []);
      setVisitTypes(ctx.visitTypes || []);
      setVisits(visitsRes);
      setGates(gatesRes);

      if (ctx.branches?.length > 0 && !newVisitForm.branchId) {
        setNewVisitForm((prev) => ({
          ...prev,
          branchId: ctx.branches[0].id,
          visitTypeId: ctx.visitTypes?.[0]?.id || '',
        }));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  // Contagem de filtros ativos
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (search.trim()) count++;
    if (statusFilter !== 'ALL') count++;
    if (branchFilter !== 'ALL') count++;
    if (admissionFilter !== 'ALL') count++;
    return count;
  }, [search, statusFilter, branchFilter, admissionFilter]);

  const handleClearFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
    setBranchFilter('ALL');
    setAdmissionFilter('ALL');
    setCurrentPage(1);
  };

  // Filtragem
  const filteredVisits = useMemo(() => {
    return visits.filter((v) => {
      const p = v.participants?.[0];
      const matchesSearch =
        !search.trim() ||
        v.code.toLowerCase().includes(search.toLowerCase()) ||
        (p?.name && p.name.toLowerCase().includes(search.toLowerCase())) ||
        (v.hostName && v.hostName.toLowerCase().includes(search.toLowerCase()));

      const matchesStatus = statusFilter === 'ALL' || v.status === statusFilter;
      const matchesBranch = branchFilter === 'ALL' || v.branchId === branchFilter;
      const matchesAdmission = admissionFilter === 'ALL' || v.admissionType === admissionFilter;

      return matchesSearch && matchesStatus && matchesBranch && matchesAdmission;
    });
  }, [visits, search, statusFilter, branchFilter, admissionFilter]);

  // Estatísticas operacionais dos KPIs
  const stats = useMemo(() => {
    const total = visits.length;
    const waitingAction = visits.filter((v) => v.status === 'ARRIVED').length;
    const inProgress = visits.filter((v) => v.status === 'IN_PROGRESS').length;
    const completedToday = visits.filter((v) => v.status === 'COMPLETED').length;
    return { total, waitingAction, inProgress, completedToday };
  }, [visits]);

  // Paginação
  const totalPages = Math.max(1, Math.ceil(filteredVisits.length / pageSize));
  const paginatedVisits = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredVisits.slice(start, start + pageSize);
  }, [filteredVisits, currentPage, pageSize]);

  // Operações
  const handleCreateVisit = async () => {
    if (!newVisitForm.fullName.trim() || !newVisitForm.branchId || !newVisitForm.visitTypeId) return;
    try {
      await portariaApi.createVisit({
        branchId: newVisitForm.branchId,
        visitTypeId: newVisitForm.visitTypeId,
        mode: 'INDIVIDUAL',
        admissionType: newVisitForm.admissionType,
        expectedArrivalDate: new Date(newVisitForm.expectedArrivalDate).toISOString(),
        hostName: newVisitForm.hostName.trim() || undefined,
        hostDepartment: newVisitForm.hostDepartment.trim() || undefined,
        reason: newVisitForm.reason.trim() || undefined,
        participants: [
          {
            name: newVisitForm.fullName.trim(),
            documentHint: newVisitForm.documentNumber.trim() || undefined,
            role: 'VISITOR',
          },
        ],
      });
      setIsNewVisitOpen(false);
      void fetchData();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Erro ao agendar visita');
    }
  };

  const handleRecordArrival = async (visit: PortariaVisit) => {
    try {
      await portariaApi.recordArrival(visit.id);
      void fetchData();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Erro ao registrar chegada');
    }
  };

  const handleAuthorizeSubmit = async () => {
    if (!selectedVisit) return;
    try {
      await portariaApi.authorizeVisit(selectedVisit.id, {
        decision: authDecision,
        method: authMethod,
        notes: authNotes.trim() || undefined,
      });
      setIsAuthorizeOpen(false);
      void fetchData();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Erro ao registrar autorização');
    }
  };

  const handleCheckInSubmit = async () => {
    if (!selectedVisit) return;
    try {
      await portariaApi.checkIn({
        visitId: selectedVisit.id,
        participantId: selectedVisit.participants?.[0]?.id,
        badgeNumber: checkInBadge.trim() || undefined,
        gateId: checkInGateId || undefined,
      });
      setIsCheckInOpen(false);
      setCheckInBadge('');
      void fetchData();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Erro ao realizar entrada');
    }
  };

  const handleCheckOutSubmit = async () => {
    if (!selectedVisit) return;
    try {
      await portariaApi.checkOut({
        visitId: selectedVisit.id,
        participantId: selectedVisit.participants?.[0]?.id,
        gateId: checkOutGateId || undefined,
        itemsReturned,
      });
      setIsCheckOutOpen(false);
      void fetchData();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Erro ao registrar saída');
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* 1. CABEÇALHO TOCLOG */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Recepção e Visitas Individuais
          </h1>
          <p className="text-sm text-muted-foreground">
            Controle de agendamentos, recepção espontânea (walk-in), autorização e check-in/out.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => setIsNewVisitOpen(true)}
            size="sm"
            className="h-9 gap-1.5 font-semibold"
          >
            <Plus className="size-4" />
            <span>Nova visita</span>
          </Button>

          {/* Menu Flutuante de Filtro */}
          <FilterPopover
            activeCount={activeFilterCount}
            onClear={handleClearFilters}
            onApply={() => void fetchData()}
            contentClassName="sm:w-[480px]"
          >
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Palavra-chave
                </span>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    className="pl-9 h-9 text-sm"
                    placeholder="Código, visitante ou anfitrião..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Status
                  </span>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Todos os status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Todos os status</SelectItem>
                      <SelectItem value="SCHEDULED">Agendadas</SelectItem>
                      <SelectItem value="ARRIVED">Aguardando na Recepção</SelectItem>
                      <SelectItem value="APPROVED">Autorizadas</SelectItem>
                      <SelectItem value="IN_PROGRESS">Presentes no Local</SelectItem>
                      <SelectItem value="COMPLETED">Concluídas</SelectItem>
                      <SelectItem value="CANCELLED">Canceladas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Filial
                  </span>
                  <Select value={branchFilter} onValueChange={setBranchFilter}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Todas as filiais" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Todas as filiais</SelectItem>
                      {branches.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Modalidade de Admissão
                </span>
                <Select value={admissionFilter} onValueChange={setAdmissionFilter}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Todas as modalidades" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todas</SelectItem>
                    <SelectItem value="SCHEDULED">Agendada previamente</SelectItem>
                    <SelectItem value="WALK_IN">Espontânea (Walk-in)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </FilterPopover>

          {/* Botão Atualizar */}
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            onClick={() => void fetchData()}
            disabled={loading}
          >
            <RotateCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </Button>
        </div>
      </section>

      {/* 2. CARDS DE RESUMO (KPIs EM 4 COLUNAS) */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0 flex flex-row items-center justify-between pb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total de Visitas
            </span>
            <Calendar className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-0 pt-1">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {stats.total}
            </span>
          </CardContent>
        </Card>

        {/* Card com Ação Necessária (Chegadas aguardando decisão) */}
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0 flex flex-row items-center justify-between pb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Aguardando Recepção
            </span>
            <Clock className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-0 pt-1 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {stats.waitingAction}
            </span>
            {stats.waitingAction > 0 && (
              <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                Ação necessária
              </span>
            )}
          </CardContent>
        </Card>

        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0 flex flex-row items-center justify-between pb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Presentes no Local
            </span>
            <LogIn className="size-4 text-emerald-600 dark:text-emerald-400" />
          </CardHeader>
          <CardContent className="p-0 pt-1">
            <span className="text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {stats.inProgress}
            </span>
          </CardContent>
        </Card>

        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0 flex flex-row items-center justify-between pb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Concluídas Hoje
            </span>
            <CheckCircle2 className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-0 pt-1">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {stats.completedToday}
            </span>
          </CardContent>
        </Card>
      </section>

      {/* 3. TABELA RESPONSIVA SEM SCROLL HORIZONTAL (5 A 6 COLUNAS SEMÂNTICAS) */}
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">CÓDIGO</TableHead>
              <TableHead className="min-w-[220px]">VISITANTE / DOCUMENTO</TableHead>
              <TableHead className="min-w-[200px]">ANFITRIÃO / FILIAL</TableHead>
              <TableHead className="min-w-[180px]">STATUS / HORÁRIO</TableHead>
              <TableHead className="w-[120px]">MODALIDADE</TableHead>
              <TableHead className="w-[180px] text-right">AÇÕES</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedVisits.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  Nenhuma visita encontrada para os critérios informados.
                </TableCell>
              </TableRow>
            ) : (
              paginatedVisits.map((v) => {
                const participant = v.participants?.[0];
                const branch = branches.find((b) => b.id === v.branchId);

                return (
                  <TableRow key={v.id}>
                    <TableCell>
                      <span className="font-mono text-xs font-bold text-muted-foreground">
                        #{v.code}
                      </span>
                    </TableCell>

                    <TableCell>
                      <div className="space-y-0.5">
                        <span className="font-semibold text-foreground">
                          {participant?.name || 'Sem nome'}
                        </span>
                        {participant?.documentHint && (
                          <p className="text-xs text-muted-foreground">
                            Doc: {participant.documentHint}
                          </p>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2">
                        {v.hostName ? (
                          <>
                            <span className="flex size-6 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                              {getInitials(v.hostName)}
                            </span>
                            <div className="space-y-0.5 leading-none">
                              <span className="text-xs font-medium text-foreground">
                                {v.hostName}
                              </span>
                              <p className="text-[11px] text-muted-foreground">
                                {branch?.name || v.hostDepartment || 'Anfitrião'}
                              </p>
                            </div>
                          </>
                        ) : (
                          <span className="text-xs italic text-muted-foreground">
                            Sem anfitrião
                          </span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="space-y-1">
                        <span
                          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${getVisitStatusBadge(
                            v.status,
                          )}`}
                        >
                          {v.status === 'SCHEDULED' && 'Agendada'}
                          {v.status === 'ARRIVED' && 'Na Recepção'}
                          {v.status === 'APPROVED' && 'Autorizada'}
                          {v.status === 'IN_PROGRESS' && 'Presente'}
                          {v.status === 'COMPLETED' && 'Concluída'}
                          {v.status === 'CANCELLED' && 'Cancelada'}
                        </span>
                        <p className="text-[11px] text-muted-foreground">
                          {new Date(v.expectedArrivalDate).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </TableCell>

                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold tracking-wider ${
                          v.admissionType === 'WALK_IN'
                            ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300'
                            : 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/40 dark:text-slate-300'
                        }`}
                      >
                        {v.admissionType === 'WALK_IN' ? 'WALK-IN' : 'AGENDADA'}
                      </span>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Ações diretas compactas conforme status */}
                        {v.status === 'SCHEDULED' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2.5 text-xs font-semibold border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                            onClick={() => void handleRecordArrival(v)}
                          >
                            <UserCheck className="size-3.5 mr-1" />
                            Chegou
                          </Button>
                        )}

                        {v.status === 'ARRIVED' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2.5 text-xs font-semibold border-amber-600 text-amber-700 hover:bg-amber-600 hover:text-white dark:border-amber-500 dark:text-amber-400"
                            onClick={() => {
                              setSelectedVisit(v);
                              setIsAuthorizeOpen(true);
                            }}
                          >
                            <ShieldAlert className="size-3.5 mr-1" />
                            Decidir
                          </Button>
                        )}

                        {v.status === 'APPROVED' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2.5 text-xs font-semibold border-emerald-600 text-emerald-700 hover:bg-emerald-600 hover:text-white dark:border-emerald-500 dark:text-emerald-400"
                            onClick={() => {
                              setSelectedVisit(v);
                              setIsCheckInOpen(true);
                            }}
                          >
                            <LogIn className="size-3.5 mr-1" />
                            Entrada
                          </Button>
                        )}

                        {v.status === 'IN_PROGRESS' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2.5 text-xs font-semibold border-rose-600 text-rose-700 hover:bg-rose-600 hover:text-white dark:border-rose-500 dark:text-rose-400"
                            onClick={() => {
                              setSelectedVisit(v);
                              setIsCheckOutOpen(true);
                            }}
                          >
                            <LogOut className="size-3.5 mr-1" />
                            Saída
                          </Button>
                        )}

                        {/* Botão de Visualização */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="size-8 p-0 text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setSelectedVisit(v);
                            setIsDetailOpen(true);
                          }}
                        >
                          <Eye className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* 4. RODAPÉ COM PAGINAÇÃO INTEGRADA */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-6 py-4 border rounded-md bg-muted/10 text-xs text-muted-foreground">
        <div>
          Exibindo <span className="font-semibold text-foreground">{paginatedVisits.length}</span> de{' '}
          <span className="font-semibold text-foreground">{filteredVisits.length}</span> registros
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="size-8 p-0"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="size-4" />
          </Button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
            <Button
              key={pageNum}
              variant={pageNum === currentPage ? 'default' : 'outline'}
              size="sm"
              className={`size-8 p-0 font-medium ${
                pageNum === currentPage ? 'pointer-events-none' : ''
              }`}
              onClick={() => setCurrentPage(pageNum)}
            >
              {pageNum}
            </Button>
          ))}

          <Button
            variant="outline"
            size="sm"
            className="size-8 p-0"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {/* MODAL: NOVA VISITA / AGENDAMENTO OU WALK-IN */}
      <Dialog open={isNewVisitOpen} onOpenChange={setIsNewVisitOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Cadastrar Visita</DialogTitle>
            <DialogDescription>
              Crie um agendamento prévio ou recepcione um visitante walk-in na portaria.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Modalidade
                </Label>
                <Select
                  value={newVisitForm.admissionType}
                  onValueChange={(v) => setNewVisitForm({ ...newVisitForm, admissionType: v })}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SCHEDULED">Agendada</SelectItem>
                    <SelectItem value="WALK_IN">Espontânea (Walk-in)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Tipo de Visita
                </Label>
                <Select
                  value={newVisitForm.visitTypeId}
                  onValueChange={(v) => setNewVisitForm({ ...newVisitForm, visitTypeId: v })}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {visitTypes.map((vt) => (
                      <SelectItem key={vt.id} value={vt.id}>
                        {vt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Nome do Visitante
                </Label>
                <Input
                  placeholder="Nome completo"
                  value={newVisitForm.fullName}
                  onChange={(e) =>
                    setNewVisitForm({ ...newVisitForm, fullName: e.target.value })
                  }
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  CPF / Documento
                </Label>
                <Input
                  placeholder="000.000.000-00"
                  value={newVisitForm.documentNumber}
                  onChange={(e) =>
                    setNewVisitForm({ ...newVisitForm, documentNumber: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Filial de Acesso
                </Label>
                <Select
                  value={newVisitForm.branchId}
                  onValueChange={(v) => setNewVisitForm({ ...newVisitForm, branchId: v })}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Selecione a filial" />
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

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Horário Previsto
                </Label>
                <Input
                  type="datetime-local"
                  value={newVisitForm.expectedArrivalDate}
                  onChange={(e) =>
                    setNewVisitForm({ ...newVisitForm, expectedArrivalDate: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Anfitrião Interno
                </Label>
                <Input
                  placeholder="Nome do colaborador"
                  value={newVisitForm.hostName}
                  onChange={(e) =>
                    setNewVisitForm({ ...newVisitForm, hostName: e.target.value })
                  }
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Departamento
                </Label>
                <Input
                  placeholder="Ex: Logística, RH, TI"
                  value={newVisitForm.hostDepartment}
                  onChange={(e) =>
                    setNewVisitForm({ ...newVisitForm, hostDepartment: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Motivo da Visita
              </Label>
              <Input
                placeholder="Ex: Reunião comercial, entrega técnica, manutenção"
                value={newVisitForm.reason}
                onChange={(e) => setNewVisitForm({ ...newVisitForm, reason: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewVisitOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreateVisit}
              disabled={!newVisitForm.fullName.trim() || !newVisitForm.branchId}
            >
              Confirmar Cadastro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: AUTORIZAÇÃO / DECISÃO */}
      <Dialog open={isAuthorizeOpen} onOpenChange={setIsAuthorizeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Decisão de Autorização</DialogTitle>
            <DialogDescription>
              Registre a autorização ou recusa de acesso para o visitante na recepção.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Decisão
              </Label>
              <Select
                value={authDecision}
                onValueChange={(v) => setAuthDecision(v as any)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="APPROVED">Autorizar Acesso</SelectItem>
                  <SelectItem value="DENIED">Negar Entrada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Canal de Autorização
              </Label>
              <Select value={authMethod} onValueChange={setAuthMethod}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PHONE">Telefone / Ramal</SelectItem>
                  <SelectItem value="IN_PERSON">Presencial</SelectItem>
                  <SelectItem value="SYSTEM">Sistema Interno</SelectItem>
                  <SelectItem value="EMAIL">E-mail</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Observações / Justificativa
              </Label>
              <Input
                placeholder="Detalhes da ligação ou motivo da recusa"
                value={authNotes}
                onChange={(e) => setAuthNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAuthorizeOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAuthorizeSubmit}>Salvar Decisão</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: ENTRADA / CHECK-IN */}
      <Dialog open={isCheckInOpen} onOpenChange={setIsCheckInOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Entrada (Check-in)</DialogTitle>
            <DialogDescription>
              Vincule o crachá físico entregue e confirme o portão de acesso.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Número do Crachá Entregue
              </Label>
              <Input
                placeholder="Ex: CR-104, CR-042"
                value={checkInBadge}
                onChange={(e) => setCheckInBadge(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Portão de Entrada
              </Label>
              <Select value={checkInGateId} onValueChange={setCheckInGateId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Selecione o portão" />
                </SelectTrigger>
                <SelectContent>
                  {gates.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCheckInOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCheckInSubmit}>Confirmar Entrada</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: SAÍDA / CHECK-OUT */}
      <Dialog open={isCheckOutOpen} onOpenChange={setIsCheckOutOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Saída (Check-out)</DialogTitle>
            <DialogDescription>
              Confirme a devolução de crachás e encerramento da permanência no local.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Portão de Saída
              </Label>
              <Select value={checkOutGateId} onValueChange={setCheckOutGateId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Selecione o portão" />
                </SelectTrigger>
                <SelectContent>
                  {gates.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="modal-items-returned"
                checked={itemsReturned}
                onChange={(e) => setItemsReturned(e.target.checked)}
                className="size-4 rounded border-border"
              />
              <Label htmlFor="modal-items-returned" className="text-sm font-medium cursor-pointer">
                Crachá e itens temporários devolvidos
              </Label>
            </div>
            {!itemsReturned && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Uma ocorrência de extravio/pendência será gerada automaticamente na auditoria.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCheckOutOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCheckOutSubmit}>Confirmar Saída</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: DETALHES DA VISITA */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes da Visita #{selectedVisit?.code}</DialogTitle>
          </DialogHeader>

          {selectedVisit && (
            <div className="flex flex-col gap-3 py-2 text-sm">
              <div className="grid grid-cols-2 gap-2 border-b pb-2">
                <div>
                  <span className="text-xs text-muted-foreground">Visitante:</span>
                  <p className="font-semibold">{selectedVisit.participants?.[0]?.name}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Documento:</span>
                  <p>{selectedVisit.participants?.[0]?.documentHint || 'Não informado'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 border-b pb-2">
                <div>
                  <span className="text-xs text-muted-foreground">Anfitrião:</span>
                  <p>{selectedVisit.hostName || 'Não informado'}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Departamento:</span>
                  <p>{selectedVisit.hostDepartment || 'Geral'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 border-b pb-2">
                <div>
                  <span className="text-xs text-muted-foreground">Status Atual:</span>
                  <p className="font-semibold">{selectedVisit.status}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Chegada Prevista:</span>
                  <p>{new Date(selectedVisit.expectedArrivalDate).toLocaleString()}</p>
                </div>
              </div>

              {selectedVisit.reason && (
                <div>
                  <span className="text-xs text-muted-foreground">Motivo:</span>
                  <p className="text-xs bg-muted/30 p-2 rounded-md">{selectedVisit.reason}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setIsDetailOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
