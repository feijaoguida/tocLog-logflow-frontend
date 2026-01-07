"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Asset } from "@/types/logistics";

interface Props {
  asset: Asset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function MoveAssetModal({ asset, open, onOpenChange, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);

  const { register, handleSubmit, setValue, reset } = useForm({
    defaultValues: {
      toBranchId: "",
      observation: "",
    },
  });

  useEffect(() => {
    if (open) {
      fetchBranches();
      reset();
    }
  }, [open, reset]);

  const fetchBranches = async () => {
    try {
      const res = await api.get("/logistics/pallets/branches"); // Reuse
      setBranches(res.data);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao carregar filiais");
    }
  };

  const onSubmit = async (data: any) => {
    if (!asset) return;
    setLoading(true);
    try {
        if (data.toBranchId === asset.branchId) {
            toast.error("O ativo já está nesta filial!");
            setLoading(false);
            return;
        }

      await api.post(`/logistics/assets/${asset.id}/move`, data);
      toast.success("Ativo movimentado com sucesso!");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Erro ao movimentar ativo");
    } finally {
      setLoading(false);
    }
  };

  if (!asset) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Movimentar Ativo: {asset.code}</DialogTitle>
          <DialogDescription>
             Transferir <strong>{asset.name}</strong> da filial <strong>{asset.branch?.name}</strong> para:
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
            <div className="space-y-2">
            <Label>Filial de Destino</Label>
            <Select onValueChange={(val) => setValue("toBranchId", val)}>
                <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                {branches
                    .filter(b => b.id !== asset.branchId) // Exclude current branch
                    .map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                    {b.name}
                    </SelectItem>
                ))}
                </SelectContent>
            </Select>
            </div>

            <div className="space-y-2">
                <Label>Observação</Label>
                <Textarea {...register("observation")} placeholder="Motivo da transferência..." />
            </div>

          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Movimentar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
