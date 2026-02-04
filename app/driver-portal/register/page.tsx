'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

// Define the validation schema
const formSchema = z.object({
  nome: z.string().min(3, { message: 'Nome deve ter pelo menos 3 caracteres.' }),
  documento: z.string().min(11, { message: 'CPF inválido.' }).max(14, { message: 'CPF inválido.' }),
  telefone: z.string().min(10, { message: 'Telefone inválido.' }),
  email: z.string().email({ message: 'Email inválido.' }).optional(),
  
  // Conditionally used for Vehicle step, but let's keep it simple flat for now or use separate schemas
  vehicleTipo: z.string().min(1, { message: 'Selecione o tipo do veículo.' }),
  vehiclePlaca: z.string().min(7, { message: 'Placa inválida.' }),
  vehicleCapacidadePeso: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, { message: 'Peso inválido' }),
  vehicleCapacidadeVolume: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, { message: 'Volume inválido' }),
});

export default function RegisterPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Define form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: '',
      documento: '',
      telefone: '',
      email: '',
      vehicleTipo: '',
      vehiclePlaca: '',
      vehicleCapacidadePeso: '',
      vehicleCapacidadeVolume: '',
    },
  });

  // Handle submit
  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    
    try {
      // 1. Create Driver
      const driverRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://162.215.222.208:4000'}/external-fleet/drivers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            nome: values.nome,
            documento: values.documento,
            telefone: values.telefone,
            email: values.email
        })
      });

      if (!driverRes.ok) {
         const error = await driverRes.json();
         throw new Error(error.message || 'Erro ao cadastrar motorista');
      }
      
      const driverData = await driverRes.json();
      const driverId = driverData.id;

      // 2. Create Vehicle
      const vehicleRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://162.215.222.208:4000'}/external-fleet/vehicles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
           tipo: values.vehicleTipo,
           placa: values.vehiclePlaca,
           capacidadePeso: Number(values.vehicleCapacidadePeso),
           capacidadeVolume: Number(values.vehicleCapacidadeVolume),
           driverId: driverId
        })
      });

      if (!vehicleRes.ok) {
        // Warning: Driver created but vehicle failed. In real world we might want transactions or cleanup.
        const error = await vehicleRes.json();
        throw new Error(error.message || 'Erro ao cadastrar veículo');
      }

      setIsSuccess(true);
      toast.success('Cadastro realizado com sucesso!');
      
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Ocorreu um erro ao enviar o cadastro.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSuccess) {
      return (
          <div className="container flex items-center justify-center min-h-[80vh]">
              <Card className="w-full max-w-md text-center">
                  <CardHeader>
                      <div className="flex justify-center mb-4">
                          <CheckCircle2 className="h-16 w-16 text-green-500" />
                      </div>
                      <CardTitle>Cadastro Recebido!</CardTitle>
                      <CardDescription>
                          Seus dados foram enviados para análise. <br/>
                          Entraremos em contato via WhatsApp/Telefone assim que seu cadastro for aprovado.
                      </CardDescription>
                  </CardHeader>
                  <CardFooter className="justify-center">
                      <Button variant="outline" onClick={() => window.location.reload()}>Voltar</Button>
                  </CardFooter>
              </Card>
          </div>
      )
  }

  return (
    <div className="container flex items-center justify-center min-h-[80vh] py-10">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Cadastro de Motorista Parceiro</CardTitle>
          <CardDescription>
            Preencha seus dados e do seu veículo para começar a realizar entregas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              <div className="space-y-4">
                  <h3 className="text-lg font-medium">Dados Pessoais</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="nome"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome Completo</FormLabel>
                            <FormControl>
                              <Input placeholder="João da Silva" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="documento"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CPF (apenas números)</FormLabel>
                            <FormControl>
                              <Input placeholder="12345678900" {...field} maxLength={11} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="telefone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Telefone / WhatsApp</FormLabel>
                            <FormControl>
                              <Input placeholder="11999999999" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email (Opcional)</FormLabel>
                            <FormControl>
                              <Input placeholder="joao@email.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                  </div>
              </div>

              <div className="space-y-4">
                  <h3 className="text-lg font-medium">Dados do Veículo</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <FormField
                        control={form.control}
                        name="vehicleTipo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo de Veículo</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="MOTO">Moto</SelectItem>
                                <SelectItem value="CAR">Carro Utilitário</SelectItem>
                                <SelectItem value="VAN">Van / Fiorino</SelectItem>
                                <SelectItem value="TRUCK">Caminhão</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="vehiclePlaca"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Placa</FormLabel>
                            <FormControl>
                              <Input placeholder="ABC-1234" {...field} className="uppercase" maxLength={8} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                       <FormField
                        control={form.control}
                        name="vehicleCapacidadePeso"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Capacidade (Kg)</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="ex: 1000" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                       <FormField
                        control={form.control}
                        name="vehicleCapacidadeVolume"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Capacidade (m³)</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="ex: 5.5" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                  </div>
              </div>

              <div className="flex justify-end pt-4">
                 <Button type="submit" className="w-full md:w-auto" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Enviar Cadastro
                 </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
