'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  Car,
  Plus,
  RotateCw,
  Search,
  ShieldAlert,
  Building2,
  Truck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Filter,
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

interface VehicleItem {
  id: string;
  plate: string;
  country?: string | null;
  vehicleType?: string | null;
  brand?: string | null;
  model?: string | null;
  color?: string | null;
  isCompanyVehicle: boolean;
  companyVehicleId?: string | null;
  driverVisitorId?: string | null;
  driverVisitor?: {
    id: string;
    fullName: string;
    documentNumber?: string | null;
  } | null;
  createdAt: string;
}

export default function PortariaVeiculosPage() {
  const [vehicles, setVehicles] = useState<VehicleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [classificationFilter, setClassificationFilter] = useState<'ALL' | 'COMPANY' | 'THIRD_PARTY'>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Modal Novo Veículo
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formPlate, setFormPlate] = useState('');
  const [formType, setFormType] = useState('CAR');
  const [formBrand, setFormBrand] = useState('');
  const [formModel, setFormModel] = useState('');
  const [formColor, setFormColor] = useState('');
  const [formIsCompany, setFormIsCompany] = useState(false);

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await portariaApi.getVehicles({
        search: search || undefined,
        isCompanyVehicle: classificationFilter === 'ALL' ? undefined : classificationFilter === 'COMPANY',
        vehicleType: typeFilter === 'ALL' ? undefined : typeFilter,
      });
      setVehicles(res.data || res || []);
    } catch (err) {
      console.error('Erro ao carregar veículos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [classificationFilter, typeFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPlate.trim()) return;

    try {
      setSubmitting(true);
      await portariaApi.createVehicle({
        plate: formPlate.trim().toUpperCase(),
        vehicleType: formType,
        brand: formBrand.trim() || undefined,
        model: formModel.trim() || undefined,
        color: formColor.trim() || undefined,
        isCompanyVehicle: formIsCompany,
      });

      setDialogOpen(false);
      setFormPlate('');
      setFormBrand('');
      setFormModel('');
      setFormColor('');
      setFormIsCompany(false);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao cadastrar veículo');
    } finally {
      setSubmitting(false);
    }
  };

  // KPIs
  const totalVehicles = vehicles.length;
  const companyVehicles = useMemo(
    () => vehicles.filter((v) => v.isCompanyVehicle).length,
    [vehicles]
  );
  const thirdPartyVehicles = totalVehicles - companyVehicles;
  const trucksAndCargo = useMemo(
    () => vehicles.filter((v) => ['TRUCK', 'VAN'].includes(v.vehicleType || '')).length,
    [vehicles]
  );

  // Filtro local adicional se houver busca digitada
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const matchSearch =
        !search ||
        v.plate.toLowerCase().includes(search.toLowerCase()) ||
        (v.model && v.model.toLowerCase().includes(search.toLowerCase())) ||
        (v.brand && v.brand.toLowerCase().includes(search.toLowerCase())) ||
        (v.driverVisitor?.fullName &&
          v.driverVisitor.fullName.toLowerCase().includes(search.toLowerCase()));

      return matchSearch;
    });
  }, [vehicles, search]);

  const totalPages = Math.max(1, Math.ceil(filteredVehicles.length / pageSize));
  const paginatedVehicles = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredVehicles.slice(start, start + pageSize);
  }, [filteredVehicles, currentPage]);

  const activeFiltersCount =
    (classificationFilter !== 'ALL' ? 1 : 0) + (typeFilter !== 'ALL' ? 1 : 0);

  const getVehicleTypeLabel = (type?: string | null) => {
    switch (type) {
      case 'CAR':
        return 'Automóvel';
      case 'MOTORCYCLE':
        return 'Motocicleta';
      case 'TRUCK':
        return 'Caminhão';
      case 'VAN':
        return 'Van / Utilitário';
      case 'BUS':
        return 'Ônibus';
      default:
        return 'Outro';
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* 1. Header Padrão TocLog */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Veículos e Frotas
          </h1>
          <p className="text-sm text-muted-foreground">
            Controle e identificação de veículos visitantes, prestadores e frota interna
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
              setClassificationFilter('ALL');
              setTypeFilter('ALL');
              setSearch('');
            }}
          >
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Classificação</Label>
                <Select
                  value={classificationFilter}
                  onValueChange={(val: any) => setClassificationFilter(val)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todas as classificações</SelectItem>
                    <SelectItem value="COMPANY">Frota da Empresa</SelectItem>
                    <SelectItem value="THIRD_PARTY">Terceiros / Visitantes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Tipo de Veículo</Label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Todos os tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos os tipos</SelectItem>
                    <SelectItem value="CAR">Automóvel</SelectItem>
                    <SelectItem value="MOTORCYCLE">Motocicleta</SelectItem>
                    <SelectItem value="TRUCK">Caminhão</SelectItem>
                    <SelectItem value="VAN">Van / Utilitário</SelectItem>
                    <SelectItem value="BUS">Ônibus</SelectItem>
                    <SelectItem value="OTHER">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </FilterPopover>

          <Button
            size="sm"
            onClick={() => setDialogOpen(true)}
            className="h-9 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Cadastrar Veículo
          </Button>
        </div>
      </div>

      {/* 2. Quatro Cards de Indicadores (TocLog KPI Pattern) */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="border border-border/60 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total de Veículos
            </span>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-foreground">
              {totalVehicles}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Registrados no sistema da portaria
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Frota Própria
            </span>
            <Building2 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
              {companyVehicles}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Veículos da empresa vinculados
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Terceiros & Visitantes
            </span>
            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
              Atenção
            </span>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-amber-700 dark:text-amber-400">
              {thirdPartyVehicles}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Exigem checagem de condutor e visita
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Carga e Utilitários
            </span>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-foreground">
              {trucksAndCargo}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Caminhões e furgões autorizados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 3. Tabela Semântica 5-6 Colunas sem Scroll Horizontal */}
      <Card className="border border-border/60 shadow-xs">
        <div className="p-4 border-b border-border/40">
          <form onSubmit={handleSearchSubmit} className="flex max-w-sm items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por placa, modelo, marca ou condutor..."
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
                <TableHead className="w-[140px] text-xs font-semibold">Placa / País</TableHead>
                <TableHead className="min-w-[180px] text-xs font-semibold">Veículo / Modelo</TableHead>
                <TableHead className="w-[160px] text-xs font-semibold">Classificação</TableHead>
                <TableHead className="min-w-[180px] text-xs font-semibold">Último Condutor / Documento</TableHead>
                <TableHead className="w-[140px] text-xs font-semibold">Tipo</TableHead>
                <TableHead className="w-[110px] text-right text-xs font-semibold">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-xs text-muted-foreground">
                    Carregando veículos...
                  </TableCell>
                </TableRow>
              ) : paginatedVehicles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-xs text-muted-foreground">
                    Nenhum veículo encontrado para os filtros selecionados.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedVehicles.map((vehicle) => {
                  return (
                    <TableRow key={vehicle.id} className="hover:bg-muted/30 transition-colors">
                      {/* Col 1: Placa */}
                      <TableCell className="font-mono text-xs font-bold text-foreground">
                        <span className="inline-block rounded-md border border-border/80 bg-muted/60 px-2 py-0.5">
                          {vehicle.plate}
                        </span>
                        {vehicle.country && vehicle.country !== 'BRA' && (
                          <span className="ml-1 text-[10px] text-muted-foreground">
                            ({vehicle.country})
                          </span>
                        )}
                      </TableCell>

                      {/* Col 2: Modelo / Marca / Cor */}
                      <TableCell className="text-xs">
                        <div className="font-medium text-foreground">
                          {vehicle.brand || ''} {vehicle.model || 'Não especificado'}
                        </div>
                        {vehicle.color && (
                          <div className="text-[11px] text-muted-foreground">
                            Cor: {vehicle.color}
                          </div>
                        )}
                      </TableCell>

                      {/* Col 3: Classificação (Empresa vs Terceiro) */}
                      <TableCell className="text-xs">
                        {vehicle.isCompanyVehicle ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-400">
                            <Building2 className="h-3 w-3" />
                            Frota da Empresa
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                            <Car className="h-3 w-3" />
                            Terceiro / Visitante
                          </span>
                        )}
                      </TableCell>

                      {/* Col 4: Condutor */}
                      <TableCell className="text-xs">
                        {vehicle.driverVisitor ? (
                          <div>
                            <div className="font-medium text-foreground">
                              {vehicle.driverVisitor.fullName}
                            </div>
                            {vehicle.driverVisitor.documentNumber && (
                              <div className="text-[11px] text-muted-foreground">
                                Doc: {vehicle.driverVisitor.documentNumber}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">Não vinculado</span>
                        )}
                      </TableCell>

                      {/* Col 5: Tipo */}
                      <TableCell className="text-xs">
                        <span className="inline-block rounded-md bg-secondary/60 px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
                          {getVehicleTypeLabel(vehicle.vehicleType)}
                        </span>
                      </TableCell>

                      {/* Col 6: Ações */}
                      <TableCell className="text-right text-xs">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs font-medium text-primary hover:text-primary/80"
                          onClick={() => {
                            alert(
                              `Veículo: ${vehicle.plate}\nMarca/Modelo: ${vehicle.brand || ''} ${vehicle.model || ''}\nClassificação: ${vehicle.isCompanyVehicle ? 'Frota Própria' : 'Terceiro'}`
                            );
                          }}
                        >
                          Detalhes
                        </Button>
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
            Mostrando {filteredVehicles.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} a{' '}
            {Math.min(currentPage * pageSize, filteredVehicles.length)} de {filteredVehicles.length}{' '}
            veículos
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

      {/* 4. Modal Cadastrar Veículo */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Veículo</DialogTitle>
            <DialogDescription>
              Informe os dados do veículo para identificação na portaria.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateVehicle} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Placa do Veículo *</Label>
              <Input
                placeholder="Ex: ABC1D23"
                value={formPlate}
                onChange={(e) => setFormPlate(e.target.value.toUpperCase())}
                className="font-mono text-xs uppercase"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tipo de Veículo</Label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CAR">Automóvel</SelectItem>
                    <SelectItem value="MOTORCYCLE">Motocicleta</SelectItem>
                    <SelectItem value="TRUCK">Caminhão</SelectItem>
                    <SelectItem value="VAN">Van / Utilitário</SelectItem>
                    <SelectItem value="BUS">Ônibus</SelectItem>
                    <SelectItem value="OTHER">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Cor</Label>
                <Input
                  placeholder="Ex: Prata, Branco"
                  value={formColor}
                  onChange={(e) => setFormColor(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Marca</Label>
                <Input
                  placeholder="Ex: Toyota, Volvo"
                  value={formBrand}
                  onChange={(e) => setFormBrand(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Modelo</Label>
                <Input
                  placeholder="Ex: Corolla, FH 540"
                  value={formModel}
                  onChange={(e) => setFormModel(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="isCompanyVehicleCheck"
                checked={formIsCompany}
                onChange={(e) => setFormIsCompany(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="isCompanyVehicleCheck" className="text-xs font-medium cursor-pointer">
                Este veículo pertence à frota da própria empresa (Decisão D07)
              </Label>
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDialogOpen(false)}
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
                {submitting ? 'Salvando...' : 'Salvar Veículo'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
