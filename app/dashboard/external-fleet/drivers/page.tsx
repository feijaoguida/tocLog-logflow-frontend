'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { User, CheckCircle, XCircle, Truck, Plus, Pencil } from 'lucide-react';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-error';
import { toast } from 'sonner';

export default function ExternalDrivers() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<any>(null);
  const [formData, setFormData] = useState({ nome: '', documento: '', telefone: '', email: '' });

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/external-fleet/drivers');
      setDrivers(data);
    } catch (error) {
      toast.error('Erro ao buscar motoristas.');
    } finally {
       setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      await api.patch(`/external-fleet/drivers/${id}/approve`);
      toast.success('Motorista aprovado!');
      fetchDrivers();
    } catch {
      toast.error('Erro ao aprovar');
    }
  }

  const handleBlock = async (id: string) => {
    try {
      if (!confirm('Deseja realmente inativar este motorista?')) return;
      await api.patch(`/external-fleet/drivers/${id}/block`);
      toast.success('Motorista inativado!');
      fetchDrivers();
    } catch {
      toast.error('Erro ao inativar');
    }
  }

  const handleSave = async () => {
    try {
      if (editingDriver) {
        await api.patch(`/external-fleet/drivers/${editingDriver.id}`, formData);
        toast.success('Motorista atualizado com sucesso!');
      } else {
        await api.post('/external-fleet/drivers', formData);
        toast.success('Motorista criado com sucesso!');
      }
      setIsModalOpen(false);
      setEditingDriver(null);
      setFormData({ nome: '', documento: '', telefone: '', email: '' });
      fetchDrivers();
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, 'Erro ao salvar motorista'));
    }
  }

  const openCreateModal = () => {
    setEditingDriver(null);
    setFormData({ nome: '', documento: '', telefone: '', email: '' });
    setIsModalOpen(true);
  }

  const openEditModal = (driver: any) => {
    setEditingDriver(driver);
    setFormData({ nome: driver.nome, documento: driver.documento, telefone: driver.telefone, email: driver.email || '' });
    setIsModalOpen(true);
  }

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'ATIVO': return <Badge className="bg-green-600">Ativo</Badge>;
      case 'PENDENTE_APROVACAO': return <Badge variant="secondary">Pendente</Badge>;
      case 'BLOQUEADO': return <Badge variant="destructive">Inativo / Bloqueado</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 w-full max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Motoristas Terceirizados</h1>
          <p className="text-muted-foreground">Gerencie o cadastro de motoristas e veículos externos.</p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Motorista
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="w-5 h-5"/> Lista de Motoristas
          </CardTitle>
          <CardDescription>Aprove, gerencie ou inative motoristas autônomos.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Identificação</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Veículos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center">Carregando...</TableCell></TableRow>
              ) : drivers.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center">Nenhum motorista cadastrado.</TableCell></TableRow>
              ) : (
                drivers.map(driver => (
                  <TableRow key={driver.id}>
                    <TableCell>
                      <div className="font-medium">{driver.nome}</div>
                      <div className="text-xs text-muted-foreground">CPF: {driver.documento.slice(0,3)}.{driver.documento.slice(3,6)}.{driver.documento.slice(6,9)}-{driver.documento.slice(9,11)}</div>
                    </TableCell>
                    <TableCell>{driver.telefone}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-muted-foreground" />
                        {driver.vehicles?.length || 0} vinculados
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(driver.status)}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="icon" variant="outline" onClick={() => openEditModal(driver)} title="Editar">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      
                      {driver.status === 'PENDENTE_APROVACAO' && (
                        <Button size="icon" variant="outline" className="text-green-600" onClick={() => handleApprove(driver.id)} title="Aprovar">
                           <CheckCircle className="w-4 h-4"/>
                        </Button>
                      )}
                      {driver.status !== 'BLOQUEADO' && (
                        <Button size="icon" variant="outline" className="text-destructive" onClick={() => handleBlock(driver.id)} title="Inativar">
                           <XCircle className="w-4 h-4"/>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDriver ? 'Editar Motorista' : 'Novo Motorista'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="nome">Nome Completo</Label>
              <Input id="nome" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} placeholder="João da Silva" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="documento">CPF (Somente números)</Label>
              <Input id="documento" value={formData.documento} onChange={e => setFormData({...formData, documento: e.target.value})} placeholder="12345678901" maxLength={11} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input id="telefone" value={formData.telefone} onChange={e => setFormData({...formData, telefone: e.target.value})} placeholder="11912345678" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email (Opcional)</Label>
              <Input id="email" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="joao@email.com" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
