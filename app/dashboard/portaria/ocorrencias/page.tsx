'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  ShieldAlert,
  Plus,
  RotateCw,
  Search,
  CheckCircle2,
  Clock,
  ChevronLeft,
  ChevronRight,
  Trash2,
  AlertTriangle,
  FileWarning,
  UserX,
  Car,
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
import { portariaApi } from '@/lib/portaria-api';

interface BlockItem {
  id: string;
  targetType: 'DOCUMENT' | 'PLATE' | 'VISITOR';
  documentNumber?: string | null;
  plate?: string | null;
  visitorId?: string | null;
  reason: string;
  active: boolean;
  expiresAt?: string | null;
  createdAt: string;
}

export default function PortariaOcorrenciasPage() {
  const [blocks, setBlocks] = useState<BlockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Modal Novo Bloqueio
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formTargetType, setFormTargetType] = useState<'DOCUMENT' | 'PLATE'>('DOCUMENT');
  const [formIdentifier, setFormIdentifier] = useState('');
  const [formReason, setFormReason] = useState('');
  const [formExpiresAt, setFormExpiresAt] = useState('');

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await portariaApi.getBlocks({
        search: search || undefined,
        targetType: typeFilter === 'ALL' ? undefined : typeFilter,
      });
      setBlocks(res.data || res || []);
    } catch (err) {
      console.error('Erro ao carregar bloqueios/ocorrências:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [typeFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleCreateBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formIdentifier.trim() || !formReason.trim()) return;

    try {
      setSubmitting(true);
      await portariaApi.createBlock({
        targetType: formTargetType,
        documentNumber: formTargetType === 'DOCUMENT' ? formIdentifier.trim() : undefined,
        plate: formTargetType === 'PLATE' ? formIdentifier.trim().toUpperCase() : undefined,
        reason: formReason.trim(),
        expiresAt: formExpiresAt ? new Date(formExpiresAt).toISOString() : undefined,
      });

      setCreateDialogOpen(false);
      setFormIdentifier('');
      setFormReason('');
      setFormExpiresAt('');
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao registrar bloqueio');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveBlock = async (block: BlockItem) => {
    if (!confirm('Deseja desativar este bloqueio de segurança?')) return;

    try {
      setLoading(true);
      await portariaApi.deleteBlock(block.id);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao remover bloqueio');
      setLoading(false);
    }
  };

  // KPIs
  const totalBlocks = blocks.length;
  const activeBlocks = useMemo(() => blocks.filter((b) => b.active).length, [blocks]);
  const documentBlocks = useMemo(
    () => blocks.filter((b) => b.targetType === 'DOCUMENT').length,
    [blocks]
  );
  const vehicleBlocks = useMemo(
    () => blocks.filter((b) => b.targetType === 'PLATE').length,
    [blocks]
  );

  // Filtros locais
  const filteredBlocks = useMemo(() => {
    return blocks.filter((b) => {
      const matchSearch =
        !search ||
        (b.documentNumber && b.documentNumber.includes(search)) ||
        (b.plate && b.plate.toLowerCase().includes(search.toLowerCase())) ||
        b.reason.toLowerCase().includes(search.toLowerCase());

      const matchType = typeFilter === 'ALL' || b.targetType === typeFilter;
      return matchSearch && matchType;
    });
  }, [blocks, search, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredBlocks.length / pageSize));
  const paginatedBlocks = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredBlocks.slice(start, start + pageSize);
  }, [filteredBlocks, currentPage]);

  const activeFiltersCount = typeFilter !== 'ALL' ? 1 : 0;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* 1. Header TocLog Padrão */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Ocorrências e Bloqueios
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestão de restrições de segurança, listas de impedimento e incidentes operacionais
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
              setTypeFilter('ALL');
              setSearch('');
            }}
          >
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Tipo de Alvo</Label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Todos os tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos os alvos</SelectItem>
                    <SelectItem value="DOCUMENT">CPF / Documento</SelectItem>
                    <SelectItem value="PLATE">Placa de Veículo</SelectItem>
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
            Registrar Bloqueio
          </Button>
        </div>
      </div>

      {/* 2. Quatro Cards de Indicadores (TocLog KPI Pattern) */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="border border-border/60 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Bloqueios Ativos
            </span>
            <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-semibold text-red-700 dark:text-red-400">
              Impedimento
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-red-700 dark:text-red-400">
              {activeBlocks}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Acessos impedidos ativamente na guarita
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Documentos / CPFs
            </span>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-foreground">
              {documentBlocks}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Pessoas físicas com restrição de entrada
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Veículos Bloqueados
            </span>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-foreground">
              {vehicleBlocks}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Placas com impedimento de cancela
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Registrado
            </span>
            <FileWarning className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-foreground">
              {totalBlocks}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Histórico consolidado da unidade
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 3. Tabela Semântica 5-6 Colunas */}
      <Card className="border border-border/60 shadow-xs">
        <div className="p-4 border-b border-border/40">
          <form onSubmit={handleSearchSubmit} className="flex max-w-sm items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por documento, placa ou motivo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 pl-9 text-xs"
              />
            </div>
            <Button type="submit" variant="secondary" size="sm" className="h-9 text-xs">
              Buscar
            </Button>
          </form>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-[140px] text-xs font-semibold">Tipo / Alvo</TableHead>
                <TableHead className="min-w-[180px] text-xs font-semibold">Identificador</TableHead>
                <TableHead className="min-w-[220px] text-xs font-semibold">Motivo do Bloqueio</TableHead>
                <TableHead className="w-[140px] text-xs font-semibold">Validade</TableHead>
                <TableHead className="w-[120px] text-xs font-semibold">Status</TableHead>
                <TableHead className="w-[110px] text-right text-xs font-semibold">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-xs text-muted-foreground">
                    Carregando bloqueios...
                  </TableCell>
                </TableRow>
              ) : paginatedBlocks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-xs text-muted-foreground">
                    Nenhum bloqueio de segurança registrado.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedBlocks.map((block) => {
                  return (
                    <TableRow key={block.id} className="hover:bg-muted/30 transition-colors">
                      {/* Col 1: Tipo */}
                      <TableCell className="text-xs">
                        {block.targetType === 'PLATE' ? (
                          <span className="inline-flex items-center gap-1 rounded bg-secondary px-2 py-0.5 font-medium">
                            <Car className="h-3 w-3" />
                            Veículo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-secondary px-2 py-0.5 font-medium">
                            <UserX className="h-3 w-3" />
                            Documento
                          </span>
                        )}
                      </TableCell>

                      {/* Col 2: Identificador */}
                      <TableCell className="font-mono text-xs font-bold text-foreground">
                        {block.targetType === 'PLATE' ? (
                          <span className="rounded border border-border/80 bg-muted/60 px-2 py-0.5">
                            {block.plate}
                          </span>
                        ) : (
                          <span>{block.documentNumber || '—'}</span>
                        )}
                      </TableCell>

                      {/* Col 3: Motivo */}
                      <TableCell className="text-xs">
                        <div className="font-medium text-foreground">{block.reason}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          Registrado em {new Date(block.createdAt).toLocaleDateString('pt-BR')}
                        </div>
                      </TableCell>

                      {/* Col 4: Validade */}
                      <TableCell className="text-xs text-muted-foreground">
                        {block.expiresAt
                          ? new Date(block.expiresAt).toLocaleDateString('pt-BR')
                          : 'Permanente'}
                      </TableCell>

                      {/* Col 5: Status */}
                      <TableCell className="text-xs">
                        {block.active ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-semibold text-red-700 dark:text-red-400">
                            Ativo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                            Inativo
                          </span>
                        )}
                      </TableCell>

                      {/* Col 6: Ações */}
                      <TableCell className="text-right text-xs">
                        {block.active && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleRemoveBlock(block)}
                            title="Desativar bloqueio"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
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
            Mostrando {filteredBlocks.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} a{' '}
            {Math.min(currentPage * pageSize, filteredBlocks.length)} de {filteredBlocks.length}{' '}
            bloqueios
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

      {/* 4. Modal Registrar Bloqueio */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Bloqueio de Segurança</DialogTitle>
            <DialogDescription>
              Impeça o acesso de visitantes ou veículos com histórico de infração ou pendência.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateBlock} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Tipo de Restrição</Label>
              <Select
                value={formTargetType}
                onValueChange={(val: any) => setFormTargetType(val)}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DOCUMENT">Documento / CPF</SelectItem>
                  <SelectItem value="PLATE">Placa de Veículo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                {formTargetType === 'DOCUMENT' ? 'Número do Documento (CPF / RG) *' : 'Placa do Veículo *'}
              </Label>
              <Input
                placeholder={formTargetType === 'DOCUMENT' ? 'Ex: 123.456.789-00' : 'Ex: ABC1D23'}
                value={formIdentifier}
                onChange={(e) => setFormIdentifier(e.target.value)}
                className="text-xs font-mono uppercase"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Motivo do Bloqueio *</Label>
              <Input
                placeholder="Ex: Infração de segurança grave / perda de crachá reincidente"
                value={formReason}
                onChange={(e) => setFormReason(e.target.value)}
                className="text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Expiração (Opcional - Deixe vazio se permanente)</Label>
              <Input
                type="date"
                value={formExpiresAt}
                onChange={(e) => setFormExpiresAt(e.target.value)}
                className="text-xs"
              />
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
                className="bg-red-600 text-white hover:bg-red-700"
              >
                {submitting ? 'Salvando...' : 'Aplicar Bloqueio'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
