"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Asset, AssetStatus } from "@/types/logistics"; // Will ensure types are exported
import { format } from "date-fns";
import { Loader2, Plus, ArrowRightLeft, FileText } from "lucide-react";
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

import { CreateAssetModal } from "./components/create-asset-modal";
import { MoveAssetModal } from "./components/move-asset-modal";

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  const fetchAssets = async () => {
    try {
      const res = await api.get("/logistics/assets");
      setAssets(res.data);
    } catch (error) {
      console.error("Failed to fetch assets", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const getStatusBadge = (status: AssetStatus) => {
      switch(status) {
          case AssetStatus.ACTIVE: return <Badge variant="default">Ativo</Badge>;
          case AssetStatus.IN_TRANSIT: return <Badge variant="secondary">Em Trânsito</Badge>;
          case AssetStatus.WRITEOFF_PENDING: return <Badge variant="destructive">Baixa Pendente</Badge>;
          case AssetStatus.WRITTEN_OFF: return <Badge variant="outline">Baixado</Badge>;
          default: return <Badge>{status}</Badge>;
      }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Gestão de Patrimônio</h1>
        <Button onClick={() => setCreateModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Novo Ativo
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listagem de Ativos</CardTitle>
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
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Filial Atual</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono font-bold text-xs">{item.code}</TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.category.name}</TableCell>
                    <TableCell>{item.branch?.name || "N/A"}</TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    <TableCell className="text-right">
                         <div className="flex justify-end gap-2">
                             <Button size="sm" variant="outline" onClick={() => {
                                 setSelectedAsset(item);
                                 setMoveModalOpen(true);
                             }}>
                                 <ArrowRightLeft className="h-4 w-4" />
                             </Button>
                             <Button size="sm" variant="ghost" onClick={() => alert("Details " + item.code)}>
                                 <FileText className="h-4 w-4" />
                             </Button>
                         </div>
                    </TableCell>
                  </TableRow>
                ))}
                {assets.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            Nenhum ativo encontrado.
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CreateAssetModal 
        open={createModalOpen} 
        onOpenChange={setCreateModalOpen} 
        onSuccess={fetchAssets} 
      />

      <MoveAssetModal
        asset={selectedAsset}
        open={moveModalOpen}
        onOpenChange={setMoveModalOpen}
        onSuccess={fetchAssets}
      />
    </div>
  );
}
