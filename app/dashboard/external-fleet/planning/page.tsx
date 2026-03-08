'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MapPin, Truck, ArrowRightLeft, Route, Package, Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export default function LoadAssemblyPage() {
  const [unassigned, setUnassigned] = useState<any[]>([]);
  const [selectedToAssign, setSelectedToAssign] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [freights, setFreights] = useState<any[]>([]);
  
  // Options
  const [cities, setCities] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  
  // Modals
  const [isMerchModalOpen, setIsMerchModalOpen] = useState(false);
  const [isFreightModalOpen, setIsFreightModalOpen] = useState(false);

  // Forms
  const [newMerch, setNewMerch] = useState({ tipo: 'ENTREGA', peso: '', volume: '' });
  const [newFreightData, setNewFreightData] = useState({
    tipo: 'ENTREGA',
    cidadeId: '',
    veiculoId: '',
    motoristaId: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [merchRes, freightsRes, optionsRes] = await Promise.all([
        api.get('/external-fleet/merchandises/unassigned'),
        api.get('/external-fleet/freights'),
        api.get('/external-fleet/freights/options')
      ]);
      setUnassigned(merchRes.data);
      setFreights(freightsRes.data.filter((f: any) => f.status === 'RASCUNHO' || f.status === 'PLANEJADO'));
      setCities(optionsRes.data.cities);
      setDrivers(optionsRes.data.drivers);
      setVehicles(optionsRes.data.vehicles);
    } catch (error) {
      toast.error('Erro ao buscar dados.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateFreight = async () => {
    if (!newFreightData.cidadeId) return toast.error('Selecione uma cidade');
    try {
      await api.post('/external-fleet/freights', newFreightData);
      toast.success('Frete criado com sucesso!');
      setNewFreightData({ tipo: 'ENTREGA', cidadeId: '', veiculoId: '', motoristaId: '' });
      setIsFreightModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error('Erro ao criar frete');
    }
  };

  const handleCreateMerch = async () => {
    if (!newMerch.peso || !newMerch.volume) return toast.error('Preencha peso e volume');
    try {
      await api.post('/external-fleet/merchandises', {
        tipo: newMerch.tipo,
        peso: Number(newMerch.peso),
        volume: Number(newMerch.volume)
      });
      toast.success('Pedido criado com sucesso!');
      setNewMerch({ tipo: 'ENTREGA', peso: '', volume: '' });
      setIsMerchModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error('Erro ao criar pedido');
    }
  }

  const assignToFreight = async (freightId: string) => {
    if (selectedToAssign.length === 0) return toast.error('Selecione pelo menos 1 pedido');
    try {
      await api.post(`/external-fleet/freights/${freightId}/assign-merchandises`, {
        merchandiseIds: selectedToAssign
      });
      toast.success('Pedidos vinculados com sucesso!');
      setSelectedToAssign([]);
      fetchData();
    } catch(error) {
      toast.error('Erro ao vincular pedidos');
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 w-full max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Montagem de Carga</h1>
          <p className="text-muted-foreground">Distribua os pedidos pendentes para os fretes e inicie as rotas.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-140px)]">
        
        {/* Lado Esquerdo: Pedidos Livres */}
        <Card className="flex flex-col h-full overflow-hidden">
          <CardHeader className="bg-muted/30 pb-4">
            <div className="flex justify-between items-start">
               <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Package className="w-5 h-5" /> 
                    Pedidos Livres (Aguardando Despacho)
                    <Badge variant="secondary" className="ml-2">{unassigned.length}</Badge>
                  </CardTitle>
                  <CardDescription>Selecione um ou mais pedidos para alocar.</CardDescription>
               </div>
               <Button size="sm" onClick={() => setIsMerchModalOpen(true)}>
                  <Plus className="w-4 h-4 mr-1"/> Cadastrar Pedido
               </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            <ScrollArea className="h-full">
              {loading ? (
                 <div className="p-8 text-center text-muted-foreground">Carregando...</div>
              ) : unassigned.length === 0 ? (
                 <div className="p-8 text-center text-muted-foreground border-t border-dashed m-4 rounded-lg">Nenhum pedido pendente de alocação.</div>
              ) : (
                <div className="divide-y relative">
                  {unassigned.map(item => {
                    const isSelected = selectedToAssign.includes(item.id);
                    return (
                      <div 
                        key={item.id} 
                        className={`p-4 hover:bg-muted/50 cursor-pointer transition-colors ${isSelected ? 'bg-primary/5 border-l-4 border-l-primary' : ''}`}
                        onClick={() => {
                          if (isSelected) setSelectedToAssign(prev => prev.filter(id => id !== item.id));
                          else setSelectedToAssign(prev => [...prev, item.id]);
                        }}
                      >
                         <div className="flex justify-between items-start mb-2">
                           <div className="font-medium text-sm flex items-center gap-2">
                             {item.tipo}
                           </div>
                           <Badge variant="outline">{item.peso} kg • {item.volume} m³</Badge>
                         </div>
                         <div className="text-xs text-muted-foreground space-y-1">
                           <div className="flex items-center gap-1">
                             <MapPin className="w-3 h-3"/> Origem: {item.originClient?.nome || item.originWarehouse?.nome || 'Avulsa'}
                           </div>
                           <div className="flex items-center gap-1">
                             <MapPin className="w-3 h-3"/> Destino: {item.destClient?.nome || item.destWarehouse?.nome || 'Avulsa'}
                           </div>
                         </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Lado Direito: Fretes Em Rascunho */}
        <div className="flex flex-col gap-4 h-full overflow-hidden">
          
          <Card className="flex-shrink-0">
             <CardHeader className="pb-2">
               <CardTitle className="text-sm font-medium">Gestão de Ferramentas de Rota</CardTitle>
             </CardHeader>
             <CardContent className="flex gap-2">
               <Button onClick={() => setIsFreightModalOpen(true)} variant="secondary" className="w-full">
                  <Route className="w-4 h-4 mr-2"/>
                  Criar Novo Rascunho de Frete
               </Button>
             </CardContent>
          </Card>

          <Card className="flex-1 overflow-hidden flex flex-col">
            <CardHeader className="bg-muted/30 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Truck className="w-5 h-5" /> 
                Fretes em Edição
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0">
               <ScrollArea className="h-full">
                 <div className="p-4 space-y-4">
                   {freights.map(freight => {
                     const loadMerchs = freight.merchandises || [];
                     const totalWeight = loadMerchs.reduce((acc:any, curr:any) => acc + Number(curr.peso), 0);
                     return (
                       <Card key={freight.id} className="border-2 border-muted">
                          <CardHeader className="p-4 pb-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <CardTitle className="text-md flex items-center gap-2">
                                  {freight.cidade?.nome || 'Sem Cidade'} - {freight.tipo}
                                </CardTitle>
                                <CardDescription className="text-xs mt-1">
                                  Veículo: {freight.veiculo?.placa || 'Não definido'} • Motorista: {freight.motorista?.nome || 'Não definido'}
                                </CardDescription>
                              </div>
                              <Badge>{freight.status}</Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="p-4 pt-0">
                            <div className="text-sm text-muted-foreground mb-3 bg-muted/30 p-2 rounded">
                               {loadMerchs.length} itens embarcados • {totalWeight} kg
                            </div>
                            
                            <Button 
                              size="sm" 
                              className="w-full"
                              disabled={selectedToAssign.length === 0}
                              onClick={() => assignToFreight(freight.id)}
                            >
                               <ArrowRightLeft className="w-4 h-4 mr-2" />
                               Despachar {selectedToAssign.length} Pedidos Secionados
                            </Button>
                          </CardContent>
                       </Card>
                     )
                   })}
                 </div>
               </ScrollArea>
            </CardContent>
          </Card>

        </div>
      </div>

      {/* Modal Criar Pedido Avulso */}
      <Dialog open={isMerchModalOpen} onOpenChange={setIsMerchModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Pedido Avulso</DialogTitle>
            <DialogDescription>Cadastre rapidamente uma mercadoria para entrar na fila de despacho.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Tipo</Label>
              <Select value={newMerch.tipo} onValueChange={(val) => setNewMerch({...newMerch, tipo: val})}>
                <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ENTREGA">Entrega</SelectItem>
                  <SelectItem value="COLETA">Coleta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Peso (kg)</Label>
              <Input type="number" value={newMerch.peso} onChange={e => setNewMerch({...newMerch, peso: e.target.value})} placeholder="Ex: 50" />
            </div>
            <div className="grid gap-2">
              <Label>Volume (m³)</Label>
              <Input type="number" value={newMerch.volume} onChange={e => setNewMerch({...newMerch, volume: e.target.value})} placeholder="Ex: 2.5" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMerchModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateMerch}>Cadastrar Pedido</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Criar Frete Rascunho */}
      <Dialog open={isFreightModalOpen} onOpenChange={setIsFreightModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Rascunho de Frete</DialogTitle>
            <DialogDescription>Crie a base do frete e defina o direcionamento. Você alocará os pedidos depois.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Tipo</Label>
              <Select value={newFreightData.tipo} onValueChange={(val) => setNewFreightData({...newFreightData, tipo: val})}>
                <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ENTREGA">Entrega</SelectItem>
                  <SelectItem value="COLETA">Coleta</SelectItem>
                  <SelectItem value="MISTO">Misto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Cidade Destino</Label>
              <Select value={newFreightData.cidadeId} onValueChange={(val) => setNewFreightData({...newFreightData, cidadeId: val})}>
                <SelectTrigger><SelectValue placeholder="Selecione a cidade" /></SelectTrigger>
                <SelectContent>
                  {cities.map(c => <SelectItem key={c.id} value={c.id}>{c.nome} - {c.uf}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Veículo (Opcional por enquanto)</Label>
              <Select value={newFreightData.veiculoId} onValueChange={(val) => setNewFreightData({...newFreightData, veiculoId: val})}>
                <SelectTrigger><SelectValue placeholder="Selecione o veículo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={""}>Não definir agora</SelectItem>
                  {vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.placa} ({v.tipo})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Motorista (Opcional por enquanto)</Label>
              <Select value={newFreightData.motoristaId} onValueChange={(val) => setNewFreightData({...newFreightData, motoristaId: val})}>
                <SelectTrigger><SelectValue placeholder="Selecione o motorista" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={""}>Não definir agora</SelectItem>
                  {drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFreightModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateFreight}>Criar Frete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
