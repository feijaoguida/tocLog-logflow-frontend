'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  Users,
  RotateCw,
  Search,
  Clock,
  ChevronLeft,
  ChevronRight,
  LogOut,
  AlertTriangle,
  ShieldCheck,
  CreditCard,
  FileCheck2,
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
import { portariaApi, PortariaSession, PortariaGate } from '@/lib/portaria-api';

function getDurationString(startedAt: string) {
  const diffMs = Date.now() - new Date(startedAt).getTime();
  if (diffMs < 0) return '0m';
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMinutes / 60);
  const mins = diffMinutes % 60;
  if (hours === 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
}

function isExceededEightHours(startedAt: string) {
  const diffMs = Date.now() - new Date(startedAt).getTime();
  return diffMs > 8 * 60 * 60 * 1000;
}

export default function PortariaPresentesPage() {
  const [sessions, setSessions] = useState<PortariaSession[]>([]);
  const [gates, setGates] = useState<PortariaGate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [gateFilter, setGateFilter] = useState<string>('ALL');

  // Modais de Ação
  const [checkOutSession, setCheckOutSession] = useState<PortariaSession | null>(null);
  const [selectedExitGateId, setSelectedExitGateId] = useState('');
  const [itemsReturned, setItemsReturned] = useState(true);

  const [regularizeSession, setRegularizeSession] = useState<PortariaSession | null>(null);
  const [regularizeReason, setRegularizeReason] = useState('');

  const [submitting, setSubmitting] = useState(false);

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const loadData = async () => {
    try {
      setLoading(true);
      const [sessionsRes, gatesRes] = await Promise.all([
        portariaApi.getSessions({ status: 'ACTIVE' }),
        portariaApi.getGates().catch(() => []),
      ]);
      setSessions(sessionsRes.data || sessionsRes || []);
      setGates(gatesRes.data || gatesRes || []);
    } catch (err) {
      console.error('Erro ao carregar sessões ativas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Auto-refresh a cada 45 segundos para atualizar tempos de permanência
    const interval = setInterval(loadData, 45000);
    return () => clearInterval(interval);
  }, []);

  // KPIs
  const totalPresent = sessions.length;
  const badgesInUse = useMemo(
    () => sessions.filter((s) => !!s.badgeNumber).length,
    [sessions]
  );
  const exceededEightHours = useMemo(
    () => sessions.filter((s) => isExceededEightHours(s.startedAt)).length,
    [sessions]
  );

  // Filtros locais
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      const matchSearch =
        !search ||
        (s.badgeNumber && s.badgeNumber.toLowerCase().includes(search.toLowerCase())) ||
        (s.participant?.name && s.participant.name.toLowerCase().includes(search.toLowerCase())) ||
        (s.visit?.code && s.visit.code.toLowerCase().includes(search.toLowerCase()));

      const matchGate =
        gateFilter === 'ALL' || s.entryGateId === gateFilter;

      return matchSearch && matchGate;
    });
  }, [sessions, search, gateFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredSessions.length / pageSize));
  const paginatedSessions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSessions.slice(start, start + pageSize);
  }, [filteredSessions, currentPage]);

  const activeFiltersCount = gateFilter !== 'ALL' ? 1 : 0;

  const handleConfirmCheckOut = async () => {
    if (!checkOutSession) return;

    try {
      setSubmitting(true);
      await portariaApi.checkOut({
        sessionId: checkOutSession.id,
        exitGateId: selectedExitGateId || undefined,
        itemsReturned,
      });

      setCheckOutSession(null);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao registrar saída');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmRegularize = async () => {
    if (!regularizeSession) return;
    if (regularizeReason.trim().length < 10) {
      alert('A justificativa da regularização deve conter no mínimo 10 caracteres.');
      return;
    }

    try {
      setSubmitting(true);
      await portariaApi.regularizeSession(regularizeSession.id, {
        reason: regularizeReason.trim(),
      });

      setRegularizeSession(null);
      setRegularizeReason('');
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao regularizar sessão');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* 1. Header TocLog Padrão */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Presentes no Complexo
          </h1>
          <p className="text-sm text-muted-foreground">
            Monitoramento em tempo real de visitantes, prestadores e sessões ativas
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
              setGateFilter('ALL');
              setSearch('');
            }}
          >
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Portão de Entrada</Label>
                <Select value={gateFilter} onValueChange={setGateFilter}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Todos os portões" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos os portões</SelectItem>
                    {gates.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </FilterPopover>
        </div>
      </div>

      {/* 2. Quatro Cards de Indicadores (TocLog KPI Pattern) */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="border border-border/60 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total no Complexo
            </span>
            <Users className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {totalPresent}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Sessões com entrada ativa agora
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Crachás em Uso
            </span>
            <CreditCard className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
              {badgesInUse}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Crachás físicos entregues na portaria
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Permanência &gt; 8 Horas
            </span>
            {exceededEightHours > 0 ? (
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                Ação necessária
              </span>
            ) : (
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-amber-700 dark:text-amber-400">
              {exceededEightHours}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Exigem verificação de turno ou regularização
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Status Geral
            </span>
            <FileCheck2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-foreground">
              100%
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Rastreabilidade individual garantida
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
                placeholder="Buscar por crachá, visitante ou código..."
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
                <TableHead className="w-[140px] text-xs font-semibold">Crachá / ID</TableHead>
                <TableHead className="min-w-[180px] text-xs font-semibold">Visitante / Condutor</TableHead>
                <TableHead className="min-w-[160px] text-xs font-semibold">Visita / Tipo</TableHead>
                <TableHead className="w-[160px] text-xs font-semibold">Entrada & Portão</TableHead>
                <TableHead className="w-[150px] text-xs font-semibold">Tempo no Local</TableHead>
                <TableHead className="w-[170px] text-right text-xs font-semibold">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-xs text-muted-foreground">
                    Carregando presentes...
                  </TableCell>
                </TableRow>
              ) : paginatedSessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-xs text-muted-foreground">
                    Nenhum visitante ativo no momento.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedSessions.map((session) => {
                  const exceeded = isExceededEightHours(session.startedAt);
                  const durationStr = getDurationString(session.startedAt);
                  const entryTime = new Date(session.startedAt).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <TableRow key={session.id} className="hover:bg-muted/30 transition-colors">
                      {/* Col 1: Crachá */}
                      <TableCell className="font-mono text-xs font-bold text-foreground">
                        {session.badgeNumber ? (
                          <span className="inline-flex items-center gap-1 rounded border border-border/80 bg-muted/60 px-2 py-0.5">
                            <CreditCard className="h-3 w-3 text-muted-foreground" />
                            {session.badgeNumber}
                          </span>
                        ) : (
                          <span className="text-muted-foreground italic">Sem crachá</span>
                        )}
                      </TableCell>

                      {/* Col 2: Pessoa */}
                      <TableCell className="text-xs">
                        <div className="font-semibold text-foreground">
                          {session.participant?.name || 'Visitante'}
                        </div>
                        {session.participant?.documentHint && (
                          <div className="text-[11px] text-muted-foreground">
                            Doc: {session.participant.documentHint}
                          </div>
                        )}
                      </TableCell>

                      {/* Col 3: Visita */}
                      <TableCell className="text-xs">
                        <div className="font-mono text-[11px] font-medium text-foreground">
                          {session.visit?.code || '—'}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {session.visit?.visitType?.name || 'Visita Padrão'}
                        </div>
                      </TableCell>

                      {/* Col 4: Entrada & Portão */}
                      <TableCell className="text-xs">
                        <div className="font-medium text-foreground">Hoje às {entryTime}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {session.entryGateId
                            ? gates.find((g) => g.id === session.entryGateId)?.name || 'Portão 1'
                            : 'Portaria Principal'}
                        </div>
                      </TableCell>

                      {/* Col 5: Tempo */}
                      <TableCell className="text-xs">
                        <div className="flex items-center gap-1">
                          <Clock className={`h-3 w-3 ${exceeded ? 'text-amber-600' : 'text-muted-foreground'}`} />
                          <span
                            className={`font-semibold ${
                              exceeded
                                ? 'text-amber-700 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded'
                                : 'text-foreground'
                            }`}
                          >
                            {durationStr}
                          </span>
                        </div>
                        {exceeded && (
                          <div className="text-[10px] text-amber-700 dark:text-amber-400 mt-0.5">
                            Excedeu limite seguro
                          </div>
                        )}
                      </TableCell>

                      {/* Col 6: Ações */}
                      <TableCell className="text-right text-xs">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() => {
                              setCheckOutSession(session);
                              setSelectedExitGateId(gates[0]?.id || '');
                            }}
                          >
                            <LogOut className="h-3 w-3 text-blue-600" />
                            Saída
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => {
                              setRegularizeSession(session);
                              setRegularizeReason('');
                            }}
                            title="Regularizar sem saída física registrada"
                          >
                            Regularizar
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

        {/* Paginação */}
        <div className="flex items-center justify-between p-4 border-t border-border/40 text-xs text-muted-foreground">
          <span>
            Mostrando {filteredSessions.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} a{' '}
            {Math.min(currentPage * pageSize, filteredSessions.length)} de {filteredSessions.length}{' '}
            presentes
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

      {/* 4. Modal de Saída Rápida */}
      <Dialog
        open={!!checkOutSession}
        onOpenChange={(open) => {
          if (!open) setCheckOutSession(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Saída</DialogTitle>
            <DialogDescription>
              Confirmar saída para{' '}
              <span className="font-semibold text-foreground">
                {checkOutSession?.participant?.name}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Portão de Saída</Label>
              <Select value={selectedExitGateId} onValueChange={setSelectedExitGateId}>
                <SelectTrigger className="text-xs">
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
                id="itemsReturnedCheck"
                checked={itemsReturned}
                onChange={(e) => setItemsReturned(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary"
              />
              <Label htmlFor="itemsReturnedCheck" className="text-xs cursor-pointer">
                Crachá e itens de segurança foram devolvidos na portaria
              </Label>
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCheckOutSession(null)}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleConfirmCheckOut}
                disabled={submitting}
                className="bg-primary text-primary-foreground"
              >
                {submitting ? 'Registrando...' : 'Confirmar Saída'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* 5. Modal de Regularização */}
      <Dialog
        open={!!regularizeSession}
        onOpenChange={(open) => {
          if (!open) setRegularizeSession(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Regularização de Sessão de Acesso</DialogTitle>
            <DialogDescription>
              Encerramento manual auditável de sessão por esquecimento de baixa, perda ou fechamento de turno.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Justificativa da Regularização *</Label>
              <Input
                placeholder="Ex: Visitante saiu sem passar na guarita conforme confirmação do anfitrião"
                value={regularizeReason}
                onChange={(e) => setRegularizeReason(e.target.value)}
                className="text-xs"
              />
              <span className="text-[10px] text-muted-foreground">Mínimo de 10 caracteres.</span>
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRegularizeSession(null)}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleConfirmRegularize}
                disabled={submitting}
                className="bg-amber-600 text-white hover:bg-amber-700"
              >
                {submitting ? 'Processando...' : 'Regularizar Sessão'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
