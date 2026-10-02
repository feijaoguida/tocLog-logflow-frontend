'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Users,
  ShieldAlert,
  Car,
  Calendar,
  Clock,
  ArrowRight,
  RotateCw,
  Plus,
  LogIn,
  LogOut,
  Building2,
  FileCheck2,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  portariaApi,
  PortariaVisit,
  PortariaSession,
} from '@/lib/portaria-api';

export default function PortariaDashboardPage() {
  const [visits, setVisits] = useState<PortariaVisit[]>([]);
  const [activeSessions, setActiveSessions] = useState<PortariaSession[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [visitsRes, sessionsRes] = await Promise.all([
        portariaApi.getVisits({ pageSize: 15 }),
        portariaApi.getSessions({ status: 'ACTIVE' }),
      ]);
      setVisits(visitsRes.data || visitsRes || []);
      setActiveSessions(sessionsRes.data || sessionsRes || []);
    } catch (err) {
      console.error('Erro ao carregar dados da portaria:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // KPIs
  const totalPresent = activeSessions.length;
  const visitsToday = visits.length;
  const pendingArrivalOrApproval = useMemo(
    () => visits.filter((v) => v.status === 'ARRIVED' || v.status === 'SCHEDULED').length,
    [visits]
  );
  const inProgressVisits = useMemo(
    () => visits.filter((v) => v.status === 'IN_PROGRESS').length,
    [visits]
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:text-blue-400">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" />
            No Local
          </span>
        );
      case 'ARRIVED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
            Chegou / Aguardando
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            Autorizado
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
            Concluído
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary/80 px-2 py-0.5 text-xs font-semibold text-secondary-foreground">
            {status}
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
            Painel Operacional da Portaria
          </h1>
          <p className="text-sm text-muted-foreground">
            Visão consolidada do turno, controle de fluxo e liberação de acessos em tempo real
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadDashboardData}
            disabled={loading}
            className="h-9 gap-1.5"
          >
            <RotateCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>

          <Link href="/dashboard/portaria/visitas">
            <Button size="sm" className="h-9 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4" />
              Nova Visita / Agendamento
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. Quatro Cards de Indicadores (TocLog KPI Pattern) */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="border border-border/60 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Presentes Agora
            </span>
            <Users className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {totalPresent}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Pessoas com sessão ativa no complexo
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Visitas Hoje
            </span>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-foreground">
              {visitsToday}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Agendamentos e entradas do turno
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Aguardando Entrada
            </span>
            {pendingArrivalOrApproval > 0 && (
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                Ação necessária
              </span>
            )}
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-amber-700 dark:text-amber-400">
              {pendingArrivalOrApproval}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Chegadas registradas ou autorizações
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Em Andamento
            </span>
            <Building2 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
              {inProgressVisits}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Visitas que estão ocorrendo no momento
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 3. Atalhos Operacionais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/dashboard/portaria/presentes" className="group">
          <Card className="border border-border/60 hover:border-primary/50 transition-all cursor-pointer h-full">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                    Ver Presentes
                  </div>
                  <div className="text-xs text-muted-foreground">Crachás e sessões</div>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/portaria/veiculos" className="group">
          <Card className="border border-border/60 hover:border-primary/50 transition-all cursor-pointer h-full">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-500/10 p-2 text-blue-600">
                  <Car className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                    Veículos & Frotas
                  </div>
                  <div className="text-xs text-muted-foreground">Placas e condutores</div>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/portaria/grupos" className="group">
          <Card className="border border-border/60 hover:border-primary/50 transition-all cursor-pointer h-full">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-purple-500/10 p-2 text-purple-600">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                    Grupos & Delegações
                  </div>
                  <div className="text-xs text-muted-foreground">Operações em lote</div>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/portaria/ocorrencias" className="group">
          <Card className="border border-border/60 hover:border-primary/50 transition-all cursor-pointer h-full">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-red-500/10 p-2 text-red-600">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                    Ocorrências
                  </div>
                  <div className="text-xs text-muted-foreground">Bloqueios de segurança</div>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* 4. Tabela de Movimentações Recentes (TocLog Pattern) */}
      <Card className="border border-border/60 shadow-xs">
        <div className="p-4 border-b border-border/40 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Visitas Recentes</h2>
            <p className="text-xs text-muted-foreground">Últimos registros de entrada e permanência</p>
          </div>
          <Link href="/dashboard/portaria/visitas">
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
              Ver todas as visitas
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-[140px] text-xs font-semibold">Código / Visita</TableHead>
                <TableHead className="min-w-[180px] text-xs font-semibold">Visitante Principal</TableHead>
                <TableHead className="min-w-[160px] text-xs font-semibold">Tipo & Anfitrião</TableHead>
                <TableHead className="w-[150px] text-xs font-semibold">Horário Previsto</TableHead>
                <TableHead className="w-[140px] text-xs font-semibold">Status</TableHead>
                <TableHead className="w-[100px] text-right text-xs font-semibold">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-28 text-center text-xs text-muted-foreground">
                    Carregando movimentações...
                  </TableCell>
                </TableRow>
              ) : visits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-28 text-center text-xs text-muted-foreground">
                    Nenhuma visita registrada no turno.
                  </TableCell>
                </TableRow>
              ) : (
                visits.slice(0, 8).map((visit) => {
                  const mainVisitor = visit.participants?.find((p) => p.isResponsible) || visit.participants?.[0];
                  return (
                    <TableRow key={visit.id} className="hover:bg-muted/30 transition-colors">
                      {/* Col 1 */}
                      <TableCell className="font-mono text-xs font-bold text-foreground">
                        {visit.code}
                      </TableCell>

                      {/* Col 2 */}
                      <TableCell className="text-xs">
                        <div className="font-semibold text-foreground">
                          {mainVisitor?.name || 'Não informado'}
                        </div>
                        {mainVisitor?.documentHint && (
                          <div className="text-[11px] text-muted-foreground">
                            Doc: {mainVisitor.documentHint}
                          </div>
                        )}
                      </TableCell>

                      {/* Col 3 */}
                      <TableCell className="text-xs">
                        <div className="font-medium text-foreground">
                          {visit.visitType?.name || 'Visita Padrão'}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          Anfitrião: {visit.hostName || 'Recepção'}
                        </div>
                      </TableCell>

                      {/* Col 4 */}
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(visit.expectedArrivalDate).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>

                      {/* Col 5 */}
                      <TableCell className="text-xs">{getStatusBadge(visit.status)}</TableCell>

                      {/* Col 6 */}
                      <TableCell className="text-right text-xs">
                        <Link href="/dashboard/portaria/visitas">
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-primary">
                            Ver
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
