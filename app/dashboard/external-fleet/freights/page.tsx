'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MapPin, Package, Truck, ArrowRight } from "lucide-react";

// Mock data
const freights = [
  { id: '1', cidade: 'São Paulo - SP', tipo: 'COLETA', status: 'RASCUNHO', veiculo: null, motorista: null },
  { id: '2', cidade: 'Campinas - SP', tipo: 'ENTREGA', status: 'EM_ANDAMENTO', veiculo: 'ABC-1234', motorista: 'João Silva' },
];

export default function FreightsPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Gestão de Fretes</h1>
        <Button>Criar Frete</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fretes Ativos</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12</div>
            </CardContent>
          </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fretes Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Cidade</TableHead>
                <TableHead>Motorista/Veículo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {freights.map((freight) => (
                <TableRow key={freight.id}>
                  <TableCell className="font-medium">#{freight.id}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {freight.tipo === 'COLETA' ? <Package className="h-4 w-4 text-blue-500" /> : <ArrowRight className="h-4 w-4 text-green-500" />}
                      {freight.tipo}
                    </div>
                  </TableCell>
                  <TableCell>{freight.cidade}</TableCell>
                  <TableCell>
                    {freight.motorista ? (
                        <div className="flex flex-col">
                            <span className="text-sm font-medium">{freight.motorista}</span>
                            <span className="text-xs text-muted-foreground">{freight.veiculo}</span>
                        </div>
                    ) : (
                        <span className="text-muted-foreground italic">Não atribuído</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={freight.status === 'EM_ANDAMENTO' ? 'default' : 'outline'}>
                      {freight.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">Detalhes</Button>
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
