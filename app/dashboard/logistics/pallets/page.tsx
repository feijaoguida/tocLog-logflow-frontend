"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PalletBalance, PalletOwnerType } from "@/types/logistics";
import { format } from "date-fns";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

import { PalletMovementModal } from "./components/pallet-movement-modal";

export default function PalletsPage() {
  const [balances, setBalances] = useState<PalletBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchBalances = async () => {
    try {
      const res = await api.get("/logistics/pallets/balances");
      setBalances(res.data);
    } catch (error) {
      console.error("Failed to fetch pallet balances", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalances();
  }, []);

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Gestão de Paletes</h1>
        <Button onClick={() => setModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Registrar Movimentação
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Saldo Atual por Filial</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Filial</TableHead>
                  <TableHead>Proprietário</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Quantidade</TableHead>
                  <TableHead>Última Atualização</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {balances.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.branch.name}</TableCell>
                    <TableCell>
                      <Badge variant={item.ownerType === PalletOwnerType.OWN ? "default" : "secondary"}>
                        {item.ownerType === "OWN" ? "Próprio" : "Terceiro"}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.client?.name || "-"}</TableCell>
                    <TableCell className="text-right text-lg font-bold">
                        {item.quantity}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(item.updatedAt), "dd/MM/yyyy HH:mm")}
                    </TableCell>
                  </TableRow>
                ))}
                {balances.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            Nenhum registro encontrado.
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      <PalletMovementModal 
        open={modalOpen} 
        onOpenChange={setModalOpen} 
        onSuccess={fetchBalances} 
      />
    </div>
  );
}
