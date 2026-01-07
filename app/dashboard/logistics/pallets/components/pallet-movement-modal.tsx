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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { MovementType, PalletOwnerType } from "@/types/logistics";
import { toast } from "sonner"; // Assuming sonner or useToast

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function PalletMovementModal({ open, onOpenChange, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);

  const { register, handleSubmit, setValue, watch, reset } = useForm({
    defaultValues: {
      type: MovementType.ENTRY,
      quantity: 1,
      originBranchId: "",
      destBranchId: "",
      ownerType: PalletOwnerType.OWN,
      clientId: "",
      observation: "",
    },
  });

  const type = watch("type");
  const ownerType = watch("ownerType");

  useEffect(() => {
    if (open) {
      fetchDependencies();
    }
  }, [open]);

  const fetchDependencies = async () => {
    try {
      const [branchesRes, clientsRes] = await Promise.all([
        api.get("/logistics/pallets/branches"),
        api.get("/logistics/pallets/clients"),
      ]);
      setBranches(branchesRes.data);
      setClients(clientsRes.data);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao carregar dados auxiliares");
    }
  };

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      // Validate
      if (data.type === MovementType.TRANSFER && data.originBranchId === data.destBranchId) {
          toast.error("Origem e Destino devem ser diferentes");
          return;
      }
      
      // Cleanup empty strings
      const payload = { ...data };
      if (!payload.clientId) delete payload.clientId;
      if (!payload.originBranchId) delete payload.originBranchId;
      if (!payload.destBranchId) delete payload.destBranchId;

      await api.post("/logistics/pallets/movements", payload);
      toast.success("Movimentação registrada com sucesso!");
      reset();
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Erro ao registrar movimentação");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nova Movimentação de Paletes</DialogTitle>
          <DialogDescription>
            Registre entradas, saídas, transferências ou ajustes.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Movimento</Label>
              <Select
                value={type}
                onValueChange={(val) => setValue("type", val as MovementType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={MovementType.ENTRY}>Entrada (Compra/Recebimento)</SelectItem>
                  <SelectItem value={MovementType.EXIT}>Saída (Consumo/Baixa)</SelectItem>
                  <SelectItem value={MovementType.TRANSFER}>Transferência entre Filiais</SelectItem>
                  <SelectItem value={MovementType.ADJUSTMENT}>Ajuste de Estoque</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Quantidade</Label>
              <Input
                type="number"
                min={1}
                {...register("quantity", { valueAsNumber: true, min: 1 })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Proprietário</Label>
              <Select
                value={ownerType}
                onValueChange={(val) => setValue("ownerType", val as PalletOwnerType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PalletOwnerType.OWN}>Próprio (TocLog)</SelectItem>
                  <SelectItem value={PalletOwnerType.CLIENT}>Terceiro (Cliente)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {ownerType === PalletOwnerType.CLIENT && (
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select onValueChange={(val) => setValue("clientId", val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Branch Selection Logic based on Type */}
          {(type === MovementType.EXIT || type === MovementType.TRANSFER || type === MovementType.ADJUSTMENT) && (
            <div className="space-y-2">
              <Label>Filial de Origem (Onde está o palete?)</Label>
              <Select onValueChange={(val) => setValue("originBranchId", val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a origem..." />
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
          )}

          {(type === MovementType.ENTRY || type === MovementType.TRANSFER) && (
            <div className="space-y-2">
              <Label>Filial de Destino (Para onde vai?)</Label>
              <Select onValueChange={(val) => setValue("destBranchId", val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o destino..." />
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
          )}

          <div className="space-y-2">
            <Label>Observação</Label>
            <Textarea {...register("observation")} placeholder="Detalhes adicionais..." />
          </div>

          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Registrar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
