'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, Ban, Truck } from "lucide-react";

// Mock data until API integration
const drivers = [
  { id: '1', nome: 'João Silva', documento: '12345678901', telefone: '11999998888', status: 'PENDENTE_APROVACAO', vehicles: [] },
  { id: '2', nome: 'Maria Oliveira', documento: '98765432100', telefone: '11977776666', status: 'ATIVO', vehicles: [{ placa: 'ABC-1234', tipo: 'TRUCK' }] },
];

export default function ExternalDriversPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Motoristas Externos</h1>
        <Button>Novo Motorista</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listagem de Motoristas</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Veículos</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {drivers.map((driver) => (
                <TableRow key={driver.id}>
                  <TableCell className="font-medium">{driver.nome}</TableCell>
                  <TableCell>{driver.documento}</TableCell>
                  <TableCell>{driver.telefone}</TableCell>
                  <TableCell>
                    <Badge variant={driver.status === 'ATIVO' ? 'default' : 'secondary'}>
                      {driver.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{driver.vehicles.length} Veículos</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                       {driver.status === 'PENDENTE_APROVACAO' && (
                         <Button size="icon" variant="outline" className="h-8 w-8 text-green-600">
                           <Check className="h-4 w-4" />
                         </Button>
                       )}
                       <Button size="icon" variant="outline" className="h-8 w-8 text-destructive">
                         <Ban className="h-4 w-4" />
                       </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
