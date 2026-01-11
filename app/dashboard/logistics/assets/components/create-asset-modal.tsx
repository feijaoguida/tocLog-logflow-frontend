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
import { toast } from "sonner"; // Assuming sonner

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateAssetModal({ open, onOpenChange, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  const { register, handleSubmit, setValue, reset } = useForm({
    defaultValues: {
      name: "",
      description: "",
      categoryId: "",
      branchId: "",
      invoiceNumber: "",
      purchaseValue: 0,
    },
  });

  useEffect(() => {
    if (open) {
      fetchDependencies();
    }
  }, [open]);

  const fetchDependencies = async () => {
    try {
      // Need endpoints for Asset Categories. 
      // I didn't create GET /logistics/assets/categories yet in backend.
      // But branches I have from PalletsController? Or I reused it.
      // Can reuse /logistics/pallets/branches (it just returns all branches).
      const [branchesRes] = await Promise.all([
        api.get("/logistics/pallets/branches"),
      ]);
       setBranches(branchesRes.data);
       // setCategories(catsRes.data);
       
       // Temporary: Mock categories or fetch if I implemented it.
       // I did NOT implement categories endpoint in AssetsController.
       // I should fix that. For now I'll mock or leave empty and implement backend next.
    } catch (e) {
      console.error(e);
      toast.error("Erro ao carregar dados auxiliares");
    }
  };

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      await api.post("/logistics/assets", data);
      toast.success("Ativo cadastrado com sucesso!");
      reset();
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Erro ao cadastrar ativo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Novo Ativo</DialogTitle>
          <DialogDescription>
            Cadastrar novo item de patrimônio. Código será gerado automaticamente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome do Item</Label>
              <Input {...register("name", { required: true })} placeholder="Ex: Notebook Dell" />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                <Label>Categoria</Label>
                {/* Need categories */}
                <Select onValueChange={(val) => setValue("categoryId", val)}>
                    <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                        {/* Empty for now - need backend support */}
                        <SelectItem value="MOCK">Mobiliário (Mock)</SelectItem>
                    </SelectContent>
                </Select>
                </div>

                <div className="space-y-2">
                <Label>Filial de Origem</Label>
                <Select onValueChange={(val) => setValue("branchId", val)}>
                    <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
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
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Nota Fiscal</Label>
                    <Input {...register("invoiceNumber")} />
                </div>
                 <div className="space-y-2">
                    <Label>Valor Compra</Label>
                    <Input type="number" step="0.01" {...register("purchaseValue", { valueAsNumber: true })} />
                </div>
            </div>

            <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea {...register("description")} />
            </div>

          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cadastrar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
