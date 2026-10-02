'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  Plus,
  RotateCw,
  Search,
  Eye,
  Shield,
  DoorOpen,
  MapPin,
  Settings,
  AlertTriangle,
  CheckCircle2,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { FilterPopover } from '@/components/ui/filter-popover';
import {
  portariaApi,
  PortariaAccessArea,
  PortariaBranch,
  PortariaGate,
  PortariaSetting,
  PortariaVisitType,
} from '@/lib/portaria-api';

export default function PortariaConfiguracoesPage() {
  const [activeTab, setActiveTab] = useState<'types' | 'areas' | 'gates' | 'settings'>('types');
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState<PortariaBranch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');

  // Dados
  const [visitTypes, setVisitTypes] = useState<PortariaVisitType[]>([]);
  const [areas, setAreas] = useState<PortariaAccessArea[]>([]);
  const [gates, setGates] = useState<PortariaGate[]>([]);
  const [setting, setSetting] = useState<PortariaSetting | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActiveOnly, setFilterActiveOnly] = useState(true);

  // Modais
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [isAreaModalOpen, setIsAreaModalOpen] = useState(false);
  const [isGateModalOpen, setIsGateModalOpen] = useState(false);

  // Formulário Tipo
  const [typeForm, setTypeForm] = useState({
    name: '',
    description: '',
    requiresApproval: false,
    requiresInternalAccess: true,
    requiresEscort: false,
    requiresChecklist: false,
    requiresPhoto: true,
    requiresDocument: true,
    defaultToleranceBeforeMinutes: 60,
    defaultToleranceAfterMinutes: 120,
  });

  // Formulário Área
  const [areaForm, setAreaForm] = useState({
    branchId: '',
    name: '',
    code: '',
    description: '',
    requiresEpi: false,
    requiresEscort: false,
    requiresSafetyTerm: false,
    requiresChecklist: false,
  });

  // Formulário Portão
  const [gateForm, setGateForm] = useState({
    branchId: '',
    name: '',
    code: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ctx, typesRes, areasRes, gatesRes, settingsRes] = await Promise.all([
        portariaApi.getContext().catch(() => ({ branches: [] })),
        portariaApi.getVisitTypes().catch(() => []),
        portariaApi.getAreas().catch(() => []),
        portariaApi.getGates().catch(() => []),
        portariaApi.getSettings().catch(() => null),
      ]);

      setBranches(ctx.branches || []);
      setVisitTypes(typesRes);
      setAreas(areasRes);
      setGates(gatesRes);
      setSetting(settingsRes);

      if (ctx.branches?.length > 0 && !areaForm.branchId) {
        setAreaForm((prev) => ({ ...prev, branchId: ctx.branches[0].id }));
        setGateForm((prev) => ({ ...prev, branchId: ctx.branches[0].id }));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  // Filtros aplicados
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchTerm.trim()) count++;
    if (selectedBranchId !== 'ALL') count++;
    if (!filterActiveOnly) count++;
    return count;
  }, [searchTerm, selectedBranchId, filterActiveOnly]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedBranchId('ALL');
    setFilterActiveOnly(true);
  };

  // Filtragem
  const filteredTypes = useMemo(() => {
    return visitTypes.filter((t) => {
      const matchesSearch =
        !searchTerm.trim() ||
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.description && t.description.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesActive = !filterActiveOnly || t.active;
      return matchesSearch && matchesActive;
    });
  }, [visitTypes, searchTerm, filterActiveOnly]);

  const filteredAreas = useMemo(() => {
    return areas.filter((a) => {
      const matchesSearch =
        !searchTerm.trim() ||
        a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.code && a.code.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesBranch = selectedBranchId === 'ALL' || a.branchId === selectedBranchId;
      const matchesActive = !filterActiveOnly || a.active;
      return matchesSearch && matchesBranch && matchesActive;
    });
  }, [areas, searchTerm, selectedBranchId, filterActiveOnly]);

  const filteredGates = useMemo(() => {
    return gates.filter((g) => {
      const matchesSearch =
        !searchTerm.trim() ||
        g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (g.code && g.code.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesBranch = selectedBranchId === 'ALL' || g.branchId === selectedBranchId;
      const matchesActive = !filterActiveOnly || g.active;
      return matchesSearch && matchesBranch && matchesActive;
    });
  }, [gates, searchTerm, selectedBranchId, filterActiveOnly]);

  // Ações de criação
  const handleCreateType = async () => {
    if (!typeForm.name.trim()) return;
    try {
      await portariaApi.createVisitType(typeForm);
      setIsTypeModalOpen(false);
      setTypeForm({
        name: '',
        description: '',
        requiresApproval: false,
        requiresInternalAccess: true,
        requiresEscort: false,
        requiresChecklist: false,
        requiresPhoto: true,
        requiresDocument: true,
        defaultToleranceBeforeMinutes: 60,
        defaultToleranceAfterMinutes: 120,
      });
      void fetchData();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Erro ao criar tipo de visita');
    }
  };

  const handleCreateArea = async () => {
    if (!areaForm.name.trim() || !areaForm.branchId) return;
    try {
      await portariaApi.createArea(areaForm);
      setIsAreaModalOpen(false);
      setAreaForm({
        branchId: branches[0]?.id || '',
        name: '',
        code: '',
        description: '',
        requiresEpi: false,
        requiresEscort: false,
        requiresSafetyTerm: false,
        requiresChecklist: false,
      });
      void fetchData();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Erro ao criar área');
    }
  };

  const handleCreateGate = async () => {
    if (!gateForm.name.trim() || !gateForm.branchId) return;
    try {
      await portariaApi.createGate(gateForm);
      setIsGateModalOpen(false);
      setGateForm({
        branchId: branches[0]?.id || '',
        name: '',
        code: '',
      });
      void fetchData();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Erro ao criar portão');
    }
  };

  const handleSaveSettings = async () => {
    if (!setting) return;
    try {
      await portariaApi.updateSettings({
        toleranceBeforeMinutes: Number(setting.toleranceBeforeMinutes),
        toleranceAfterMinutes: Number(setting.toleranceAfterMinutes),
        allowWalkIn: Boolean(setting.allowWalkIn),
        requireApprovalForWalkIn: Boolean(setting.requireApprovalForWalkIn),
        autoCloseAfterHours: Number(setting.autoCloseAfterHours),
        enableVisualAlertAfterHours: Number(setting.enableVisualAlertAfterHours),
        badgeReturnMandatory: Boolean(setting.badgeReturnMandatory),
        retentionMonths: Number(setting.retentionMonths),
      });
      alert('Configurações operacionais atualizadas com sucesso!');
      void fetchData();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Erro ao atualizar configurações');
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* 1. CABEÇALHO TOCLOG */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Configurações da Portaria
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestão de tipos de visita, áreas internas, portões físicos e regras operacionais de acesso.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeTab === 'types' && (
            <Button
              onClick={() => setIsTypeModalOpen(true)}
              size="sm"
              className="h-9 gap-1.5 font-semibold"
            >
              <Plus className="size-4" />
              <span>Novo tipo</span>
            </Button>
          )}

          {activeTab === 'areas' && (
            <Button
              onClick={() => setIsAreaModalOpen(true)}
              size="sm"
              className="h-9 gap-1.5 font-semibold"
            >
              <Plus className="size-4" />
              <span>Nova área</span>
            </Button>
          )}

          {activeTab === 'gates' && (
            <Button
              onClick={() => setIsGateModalOpen(true)}
              size="sm"
              className="h-9 gap-1.5 font-semibold"
            >
              <Plus className="size-4" />
              <span>Novo portão</span>
            </Button>
          )}

          {/* Menu Flutuante de Filtro */}
          <FilterPopover
            activeCount={activeFilterCount}
            onClear={handleClearFilters}
            onApply={() => void fetchData()}
            contentClassName="sm:w-[420px]"
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
                    placeholder="Buscar por nome ou código..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Filial
                </span>
                <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
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

              <div className="flex items-center gap-2 pt-2">
                <Switch
                  id="active-filter"
                  checked={filterActiveOnly}
                  onCheckedChange={setFilterActiveOnly}
                />
                <Label htmlFor="active-filter" className="text-sm font-medium cursor-pointer">
                  Apenas registros ativos
                </Label>
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
              Tipos de Visita
            </span>
            <Shield className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-0 pt-1">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {visitTypes.length}
            </span>
          </CardContent>
        </Card>

        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0 flex flex-row items-center justify-between pb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Áreas Cadastradas
            </span>
            <MapPin className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-0 pt-1 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {areas.length}
            </span>
            {areas.filter((a) => a.requiresEpi).length > 0 && (
              <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                {areas.filter((a) => a.requiresEpi).length} exigem EPI
              </span>
            )}
          </CardContent>
        </Card>

        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0 flex flex-row items-center justify-between pb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Portões de Acesso
            </span>
            <DoorOpen className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-0 pt-1">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {gates.length}
            </span>
          </CardContent>
        </Card>

        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0 flex flex-row items-center justify-between pb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tolerância Padrão
            </span>
            <Settings className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-0 pt-1">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {setting?.toleranceBeforeMinutes ?? 60}m / {setting?.toleranceAfterMinutes ?? 120}m
            </span>
          </CardContent>
        </Card>
      </section>

      {/* 3. ABAS OPERACIONAIS E TABELAS SEM SCROLL HORIZONTAL */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-4 max-w-lg mb-4">
          <TabsTrigger value="types">Tipos de Visita</TabsTrigger>
          <TabsTrigger value="areas">Áreas & EPI</TabsTrigger>
          <TabsTrigger value="gates">Portões</TabsTrigger>
          <TabsTrigger value="settings">Parâmetros Gerais</TabsTrigger>
        </TabsList>

        {/* ABA 1: TIPOS DE VISITA */}
        <TabsContent value="types" className="mt-0">
          <div className="rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">STATUS</TableHead>
                  <TableHead className="min-w-[240px]">TIPO DE VISITA / DESCRIÇÃO</TableHead>
                  <TableHead className="min-w-[200px]">EXIGÊNCIAS</TableHead>
                  <TableHead className="min-w-[160px]">TOLERÂNCIA</TableHead>
                  <TableHead className="w-[120px] text-right">AÇÕES</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTypes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-28 text-center text-muted-foreground">
                      Nenhum tipo de visita encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTypes.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${
                            t.active
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60'
                              : 'bg-muted text-muted-foreground border-border'
                          }`}
                        >
                          {t.active ? 'ATIVO' : 'INATIVO'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <span className="font-semibold text-foreground">{t.name}</span>
                          {t.description && (
                            <p className="text-xs text-muted-foreground">{t.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {t.requiresApproval && (
                            <span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                              Aprovação
                            </span>
                          )}
                          {t.requiresEscort && (
                            <span className="rounded-md bg-blue-500/10 px-1.5 py-0.5 text-[11px] font-medium text-blue-700 dark:text-blue-400">
                              Acompanhante
                            </span>
                          )}
                          {t.requiresChecklist && (
                            <span className="rounded-md bg-purple-500/10 px-1.5 py-0.5 text-[11px] font-medium text-purple-700 dark:text-purple-400">
                              Checklist
                            </span>
                          )}
                          {t.requiresPhoto && (
                            <span className="rounded-md bg-slate-500/10 px-1.5 py-0.5 text-[11px] font-medium text-slate-700 dark:text-slate-400">
                              Foto
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-medium text-muted-foreground">
                          -{t.defaultToleranceBeforeMinutes}m / +{t.defaultToleranceAfterMinutes}m
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-xs font-semibold"
                          onClick={() => alert(`Configurações de ${t.name}`)}
                        >
                          <Eye className="size-4 mr-1 text-muted-foreground" />
                          Ver
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ABA 2: ÁREAS E SEGURANÇA */}
        <TabsContent value="areas" className="mt-0">
          <div className="rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">CÓDIGO</TableHead>
                  <TableHead className="min-w-[240px]">ÁREA / FILIAL</TableHead>
                  <TableHead className="min-w-[220px]">REQUISITOS DE ACESSO</TableHead>
                  <TableHead className="w-[120px]">STATUS</TableHead>
                  <TableHead className="w-[120px] text-right">AÇÕES</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAreas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-28 text-center text-muted-foreground">
                      Nenhuma área cadastrada para os filtros informados.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAreas.map((a) => {
                    const branch = branches.find((b) => b.id === a.branchId);
                    return (
                      <TableRow key={a.id}>
                        <TableCell>
                          <span className="font-mono text-xs font-bold text-muted-foreground">
                            {a.code || '—'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            <span className="font-semibold text-foreground">{a.name}</span>
                            <p className="text-xs text-muted-foreground">
                              {branch?.name || a.branchId}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {a.requiresEpi && (
                              <span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                                EPI Obrigatório
                              </span>
                            )}
                            {a.requiresEscort && (
                              <span className="rounded-md bg-blue-500/10 px-1.5 py-0.5 text-[11px] font-medium text-blue-700 dark:text-blue-400">
                                Acompanhante
                              </span>
                            )}
                            {a.requiresSafetyTerm && (
                              <span className="rounded-md bg-purple-500/10 px-1.5 py-0.5 text-[11px] font-medium text-purple-700 dark:text-purple-400">
                                Termo
                              </span>
                            )}
                            {a.requiresChecklist && (
                              <span className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                                Checklist
                              </span>
                            )}
                            {!a.requiresEpi &&
                              !a.requiresEscort &&
                              !a.requiresSafetyTerm &&
                              !a.requiresChecklist && (
                                <span className="text-xs text-muted-foreground">Sem restrição</span>
                              )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${
                              a.active
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60'
                                : 'bg-muted text-muted-foreground border-border'
                            }`}
                          >
                            {a.active ? 'ATIVO' : 'INATIVO'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs font-semibold"
                            onClick={() => alert(`Área ${a.name}`)}
                          >
                            <Eye className="size-4 mr-1 text-muted-foreground" />
                            Ver
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ABA 3: PORTÕES */}
        <TabsContent value="gates" className="mt-0">
          <div className="rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">CÓDIGO</TableHead>
                  <TableHead className="min-w-[240px]">PORTÃO / FILIAL</TableHead>
                  <TableHead className="w-[140px]">STATUS</TableHead>
                  <TableHead className="w-[120px] text-right">AÇÕES</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-28 text-center text-muted-foreground">
                      Nenhum portão físico cadastrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredGates.map((g) => {
                    const branch = branches.find((b) => b.id === g.branchId);
                    return (
                      <TableRow key={g.id}>
                        <TableCell>
                          <span className="font-mono text-xs font-bold text-muted-foreground">
                            {g.code || '—'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            <span className="font-semibold text-foreground">{g.name}</span>
                            <p className="text-xs text-muted-foreground">
                              {branch?.name || g.branchId}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${
                              g.active
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60'
                                : 'bg-muted text-muted-foreground border-border'
                            }`}
                          >
                            {g.active ? 'ATIVO' : 'INATIVO'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs font-semibold"
                            onClick={() => alert(`Portão ${g.name}`)}
                          >
                            <Eye className="size-4 mr-1 text-muted-foreground" />
                            Ver
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ABA 4: PARÂMETROS GERAIS */}
        <TabsContent value="settings" className="mt-0">
          <Card className="p-6">
            <div className="flex flex-col gap-6 max-w-2xl">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Políticas Operacionais e Retenção
                </h3>
                <p className="text-sm text-muted-foreground">
                  Ajuste as tolerâncias de entrada, regras de walk-in e políticas de segurança física.
                </p>
              </div>

              {setting && (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Tolerância Prévia (minutos)
                      </Label>
                      <Input
                        type="number"
                        value={setting.toleranceBeforeMinutes}
                        onChange={(e) =>
                          setSetting({
                            ...setting,
                            toleranceBeforeMinutes: Number(e.target.value),
                          })
                        }
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Tolerância Posterior (minutos)
                      </Label>
                      <Input
                        type="number"
                        value={setting.toleranceAfterMinutes}
                        onChange={(e) =>
                          setSetting({
                            ...setting,
                            toleranceAfterMinutes: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Alerta Visual de Permanência (horas)
                      </Label>
                      <Input
                        type="number"
                        value={setting.enableVisualAlertAfterHours}
                        onChange={(e) =>
                          setSetting({
                            ...setting,
                            enableVisualAlertAfterHours: Number(e.target.value),
                          })
                        }
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Retenção de Evidências (meses)
                      </Label>
                      <Input
                        type="number"
                        value={setting.retentionMonths}
                        onChange={(e) =>
                          setSetting({
                            ...setting,
                            retentionMonths: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 pt-2">
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <Label className="text-sm font-medium">Permitir Acesso Espontâneo (Walk-in)</Label>
                        <p className="text-xs text-muted-foreground">
                          Habilita visitantes sem agendamento prévio na recepção.
                        </p>
                      </div>
                      <Switch
                        checked={setting.allowWalkIn}
                        onCheckedChange={(v) => setSetting({ ...setting, allowWalkIn: v })}
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <Label className="text-sm font-medium">Aprovação Obrigatória para Walk-in</Label>
                        <p className="text-xs text-muted-foreground">
                          Exige contato e aceite do anfitrião interno antes da liberação física.
                        </p>
                      </div>
                      <Switch
                        checked={setting.requireApprovalForWalkIn}
                        onCheckedChange={(v) =>
                          setSetting({ ...setting, requireApprovalForWalkIn: v })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <Label className="text-sm font-medium">Devolução Obrigatória de Crachás</Label>
                        <p className="text-xs text-muted-foreground">
                          Exige conferência de devolução de crachás e itens na saída.
                        </p>
                      </div>
                      <Switch
                        checked={setting.badgeReturnMandatory}
                        onCheckedChange={(v) =>
                          setSetting({ ...setting, badgeReturnMandatory: v })
                        }
                      />
                    </div>
                  </div>

                  <div className="pt-4">
                    <Button onClick={handleSaveSettings} className="font-semibold">
                      Salvar Alterações
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODAL CRIAÇÃO: TIPO DE VISITA */}
      <Dialog open={isTypeModalOpen} onOpenChange={setIsTypeModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Tipo de Visita</DialogTitle>
            <DialogDescription>
              Cadastre uma nova modalidade de acesso com suas respectivas exigências de segurança.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Nome da Modalidade
              </Label>
              <Input
                placeholder="Ex: Prestador de Serviços, Cliente, Auditoria"
                value={typeForm.name}
                onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Descrição
              </Label>
              <Input
                placeholder="Finalidade desta categoria"
                value={typeForm.description}
                onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <div className="flex items-center gap-2">
                <Switch
                  id="modal-req-app"
                  checked={typeForm.requiresApproval}
                  onCheckedChange={(v) => setTypeForm({ ...typeForm, requiresApproval: v })}
                />
                <Label htmlFor="modal-req-app" className="text-xs cursor-pointer">
                  Exige Aprovação
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="modal-req-escort"
                  checked={typeForm.requiresEscort}
                  onCheckedChange={(v) => setTypeForm({ ...typeForm, requiresEscort: v })}
                />
                <Label htmlFor="modal-req-escort" className="text-xs cursor-pointer">
                  Acompanhante Obrigatório
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="modal-req-check"
                  checked={typeForm.requiresChecklist}
                  onCheckedChange={(v) => setTypeForm({ ...typeForm, requiresChecklist: v })}
                />
                <Label htmlFor="modal-req-check" className="text-xs cursor-pointer">
                  Exige Checklist
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="modal-req-photo"
                  checked={typeForm.requiresPhoto}
                  onCheckedChange={(v) => setTypeForm({ ...typeForm, requiresPhoto: v })}
                />
                <Label htmlFor="modal-req-photo" className="text-xs cursor-pointer">
                  Exige Fotografia
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTypeModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateType} disabled={!typeForm.name.trim()}>
              Criar Tipo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL CRIAÇÃO: ÁREA */}
      <Dialog open={isAreaModalOpen} onOpenChange={setIsAreaModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Área Interna</DialogTitle>
            <DialogDescription>
              Defina uma área física de acesso e seus requisitos específicos de segurança (EPI, Termos).
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Filial
              </Label>
              <Select
                value={areaForm.branchId}
                onValueChange={(v) => setAreaForm({ ...areaForm, branchId: v })}
              >
                <SelectTrigger className="h-9">
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

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2 flex flex-col gap-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Nome da Área
                </Label>
                <Input
                  placeholder="Ex: Galpão Logístico"
                  value={areaForm.name}
                  onChange={(e) => setAreaForm({ ...areaForm, name: e.target.value })}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Código
                </Label>
                <Input
                  placeholder="GLP-01"
                  value={areaForm.code}
                  onChange={(e) => setAreaForm({ ...areaForm, code: e.target.value })}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Descrição ou Instruções
              </Label>
              <Input
                placeholder="Instruções de segurança na entrada"
                value={areaForm.description}
                onChange={(e) => setAreaForm({ ...areaForm, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <div className="flex items-center gap-2">
                <Switch
                  id="modal-area-epi"
                  checked={areaForm.requiresEpi}
                  onCheckedChange={(v) => setAreaForm({ ...areaForm, requiresEpi: v })}
                />
                <Label htmlFor="modal-area-epi" className="text-xs cursor-pointer">
                  Exige EPI
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="modal-area-escort"
                  checked={areaForm.requiresEscort}
                  onCheckedChange={(v) => setAreaForm({ ...areaForm, requiresEscort: v })}
                />
                <Label htmlFor="modal-area-escort" className="text-xs cursor-pointer">
                  Exige Acompanhante
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="modal-area-term"
                  checked={areaForm.requiresSafetyTerm}
                  onCheckedChange={(v) => setAreaForm({ ...areaForm, requiresSafetyTerm: v })}
                />
                <Label htmlFor="modal-area-term" className="text-xs cursor-pointer">
                  Exige Termo de Segurança
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="modal-area-check"
                  checked={areaForm.requiresChecklist}
                  onCheckedChange={(v) => setAreaForm({ ...areaForm, requiresChecklist: v })}
                />
                <Label htmlFor="modal-area-check" className="text-xs cursor-pointer">
                  Exige Checklist
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAreaModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateArea} disabled={!areaForm.name.trim() || !areaForm.branchId}>
              Criar Área
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL CRIAÇÃO: PORTÃO */}
      <Dialog open={isGateModalOpen} onOpenChange={setIsGateModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Portão de Acesso</DialogTitle>
            <DialogDescription>
              Cadastre um ponto físico de entrada ou saída controlado pela portaria.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Filial
              </Label>
              <Select
                value={gateForm.branchId}
                onValueChange={(v) => setGateForm({ ...gateForm, branchId: v })}
              >
                <SelectTrigger className="h-9">
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

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2 flex flex-col gap-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Nome do Portão
                </Label>
                <Input
                  placeholder="Ex: Portão Principal, Portão Cargas"
                  value={gateForm.name}
                  onChange={(e) => setGateForm({ ...gateForm, name: e.target.value })}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Código
                </Label>
                <Input
                  placeholder="P-01"
                  value={gateForm.code}
                  onChange={(e) => setGateForm({ ...gateForm, code: e.target.value })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGateModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateGate} disabled={!gateForm.name.trim() || !gateForm.branchId}>
              Criar Portão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
