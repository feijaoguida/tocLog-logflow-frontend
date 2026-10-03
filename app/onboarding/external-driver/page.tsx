'use client'

import React, { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Lock,
  LogOut,
  ShieldAlert,
  ShieldCheck,
  Truck,
  UserCheck,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

import { api } from '@/lib/api'
import { useAuth } from '@/context/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-error'

const selfRegistrationSchema = z.object({
  token: z.string().min(1, 'Token de registro é obrigatório'),
  nome: z.string().min(3, 'Nome deve ter ao menos 3 caracteres'),
  documento: z
    .string()
    .min(11, 'CPF deve ter 11 dígitos numéricos')
    .max(14, 'CPF inválido')
    .transform((val) => val.replace(/\D/g, '')),
  telefone: z.string().min(10, 'Telefone com DDD é obrigatório'),
  email: z.string().email('E-mail válido obrigatório'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  cnhNumber: z.string().optional(),
  cnhCategory: z.string().optional(),
  cnhExpiresAt: z.string().optional(),
  rntrcCode: z.string().optional(),
  rntrcStatus: z.string().optional(),
  // Veículo opcional
  vehicleTipo: z.string().optional(),
  vehiclePlaca: z.string().optional(),
  vehicleCapacidadePeso: z.string().optional(),
  vehicleCapacidadeVolume: z.string().optional(),
  vehicleRenavam: z.string().optional(),
  vehicleBodyType: z.string().optional(),
})

type SelfRegistrationData = z.infer<typeof selfRegistrationSchema>

type DriverStatusRecord = {
  id: string
  nome: string
  documento: string
  status: 'PENDENTE_APROVACAO' | 'ATIVO' | 'BLOQUEADO'
  cnhExpiresAt?: string | null
  rntrcCode?: string | null
  vehicles?: Array<{
    id: string
    placa: string
    tipo: string
    status: string
  }>
}

function OnboardingContent() {
  const searchParams = useSearchParams()
  const initialToken = searchParams.get('token') || ''

  const { user, logout, isAuthenticated } = useAuth()
  const [driverProfile, setDriverProfile] = useState<DriverStatusRecord | null>(null)
  const [loadingStatus, setLoadingStatus] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [registeredSuccess, setRegisteredSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SelfRegistrationData>({
    resolver: zodResolver(selfRegistrationSchema),
    defaultValues: {
      token: initialToken,
      nome: '',
      documento: '',
      telefone: '',
      email: '',
      password: '',
      cnhNumber: '',
      cnhCategory: '',
      cnhExpiresAt: '',
      rntrcCode: '',
      rntrcStatus: 'ATIVO',
      vehicleTipo: '',
      vehiclePlaca: '',
      vehicleCapacidadePeso: '',
      vehicleCapacidadeVolume: '',
      vehicleRenavam: '',
      vehicleBodyType: '',
    },
  })

  // Carregar dados de status se o usuário já estiver logado
  useEffect(() => {
    if (isAuthenticated) {
      void loadDriverStatus()
    }
  }, [isAuthenticated])

  async function loadDriverStatus() {
    setLoadingStatus(true)
    try {
      const { data } = await api.get<DriverStatusRecord>('/external-fleet/drivers/me')
      setDriverProfile(data)
    } catch {
      // Se não for motorista parceiro, apenas não exibe detalhes
      setDriverProfile(null)
    } finally {
      setLoadingStatus(false)
    }
  }

  async function onSubmit(data: SelfRegistrationData) {
    setIsSubmitting(true)
    try {
      const payload = {
        token: data.token,
        email: data.email,
        password: data.password,
        nome: data.nome,
        documento: data.documento,
        telefone: data.telefone,
        cnhNumber: data.cnhNumber || undefined,
        cnhCategory: data.cnhCategory || undefined,
        cnhExpiresAt: data.cnhExpiresAt || undefined,
        rntrcCode: data.rntrcCode || undefined,
        rntrcStatus: data.rntrcStatus || undefined,
        vehicleTipo: data.vehicleTipo || undefined,
        vehiclePlaca: data.vehiclePlaca || undefined,
        vehicleCapacidadePeso: data.vehicleCapacidadePeso ? Number(data.vehicleCapacidadePeso) : undefined,
        vehicleCapacidadeVolume: data.vehicleCapacidadeVolume ? Number(data.vehicleCapacidadeVolume) : undefined,
        vehicleRenavam: data.vehicleRenavam || undefined,
        vehicleBodyType: data.vehicleBodyType || undefined,
      }

      await api.post('/external-fleet/public/register', payload)
      setRegisteredSuccess(true)
      toast.success('Cadastro realizado com sucesso!')
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Erro ao processar cadastro de parceiro.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  // 1. Tela de Sucesso após submissão de cadastro público
  if (registeredSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-muted/30">
        <Card className="w-full max-w-lg text-center shadow-lg border-primary/20">
          <CardHeader className="space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">Cadastro Recebido com Sucesso!</CardTitle>
            <CardDescription className="text-base">
              Suas informações foram registradas na fila de homologação. Nossa equipe operacional analisará sua CNH, RNTRC e veículo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-left">
            <div className="rounded-xl border bg-card p-4 space-y-2 text-sm">
              <div className="flex items-center gap-2 font-semibold text-foreground">
                <Clock className="h-4 w-4 text-amber-500" />
                <span>Status Atual: Aguardando Homologação</span>
              </div>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Você já pode fazer login no sistema para acompanhar a análise. Enquanto seu cadastro estiver pendente, as operações de rota e viagens permanecerão restritas (D07/D11).
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center gap-3">
            <Button asChild className="w-full sm:w-auto">
              <Link href="/login">Ir para a Tela de Login</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  // 2. Tela de Motorista Logado em Onboarding / Pendente de Aprovação (AC-01 / D11)
  if (isAuthenticated) {
    const isPending = driverProfile?.status === 'PENDENTE_APROVACAO' || user?.isOnboardingOnly
    const isBlocked = driverProfile?.status === 'BLOQUEADO'

    return (
      <div className="flex min-h-screen flex-col bg-muted/20">
        <header className="border-b bg-background/95 backdrop-blur px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
              TL
            </div>
            <div>
              <h1 className="font-semibold text-sm leading-none">TocLog · Portal do Parceiro</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Homologação e Governança de Terceiros</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden sm:inline">{user?.email}</span>
            <Button variant="outline" size="sm" onClick={logout} className="gap-1.5 text-xs">
              <LogOut className="h-3.5 w-3.5" />
              Sair
            </Button>
          </div>
        </header>

        <main className="flex-1 container max-w-4xl py-8 px-4">
          <div className="space-y-6">
            {/* Banner de Status */}
            {isPending ? (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900/40">
                  <Clock className="h-6 w-6 animate-pulse" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-amber-950 dark:text-amber-100">
                      Cadastro em Análise Operacional
                    </h2>
                    <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-300">
                      Pendente de Aprovação
                    </Badge>
                  </div>
                  <p className="text-sm text-amber-900/80 dark:text-amber-200/80 leading-relaxed">
                    Seu perfil de terceiro foi criado com sucesso e está sob conferência do gestor de frotas. Rotas e manifestos de carga só ficam liberados após a validação cadastral independente (AC-01/AC-02).
                  </p>
                </div>
              </div>
            ) : isBlocked ? (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-destructive">Acesso Bloqueado</h2>
                    <Badge variant="destructive">Bloqueado</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Sua operação foi temporariamente suspensa pela empresa ou por pendência regulatória (CNH/RNTRC/bloqueio administrativo). Entre em contato com a gestão de transportes.
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 p-6 flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div className="flex-1 space-y-1">
                  <h2 className="text-lg font-semibold text-emerald-950 dark:text-emerald-100">Parceiro Homologado e Ativo</h2>
                  <p className="text-sm text-emerald-900/80 dark:text-emerald-200/80">
                    Seu cadastro foi aprovado pela operação. Você pode receber viagens e carregar mercadorias.
                  </p>
                </div>
                <Button asChild size="sm" className="shrink-0">
                  <Link href="/dashboard">Acessar Painel</Link>
                </Button>
              </div>
            )}

            {/* Checklist de Itens da Homologação */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Itens Submetidos para Validação
                </CardTitle>
                <CardDescription>
                  Critérios técnicos conferidos pela expedição e segurança patrimonial antes de qualquer expedição.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border p-3 flex items-start gap-3">
                    <UserCheck className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <div className="text-xs font-medium text-muted-foreground">Motorista</div>
                      <div className="font-semibold text-sm">{driverProfile?.nome || user?.name}</div>
                      <div className="text-xs text-muted-foreground">CPF: {driverProfile?.documento || 'Registrado'}</div>
                    </div>
                  </div>

                  <div className="rounded-xl border p-3 flex items-start gap-3">
                    <Truck className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <div className="text-xs font-medium text-muted-foreground">Veículo Associado</div>
                      {driverProfile?.vehicles && driverProfile.vehicles.length > 0 ? (
                        <>
                          <div className="font-semibold text-sm font-mono">{driverProfile.vehicles[0].placa}</div>
                          <div className="text-xs text-muted-foreground">{driverProfile.vehicles[0].tipo} · {driverProfile.vehicles[0].status}</div>
                        </>
                      ) : (
                        <div className="text-sm text-muted-foreground">Sem veículo próprio registrado</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-muted/40 p-4 text-xs text-muted-foreground flex items-start gap-3">
                  <Lock className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                  <p>
                    <strong>Garantia de Isolamento:</strong> Motoristas terceiros não possuem acesso a rotas alheias, funcionários internos ou configurações fiscais. Somente ordens expressamente atribuídas estarão visíveis após aprovação (AC-01/D11).
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    )
  }

  // 3. Formulário Público de Autosserviço (com Token) (D07, RF12, AC-01)
  return (
    <div className="flex min-h-screen flex-col bg-muted/30 py-8 px-4 sm:px-6">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-black text-xl shadow-md">
            TL
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Autosserviço de Motorista Parceiro
          </h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Cadastre seus dados e do seu veículo para iniciar o processo de homologação operacional TocLog.
          </p>
        </div>

        <Card className="shadow-lg border-primary/10">
          <CardHeader>
            <CardTitle className="text-lg">Formulário de Homologação</CardTitle>
            <CardDescription>
              Campos marcados com * são obrigatórios. Todos os registros passam por auditoria de segurança.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Token da Empresa */}
              <div className="space-y-2">
                <Label htmlFor="token">Código / Token de Convite da Empresa *</Label>
                <Input
                  id="token"
                  placeholder="Insira o token fornecido pela transportadora"
                  {...register('token')}
                  className={errors.token ? 'border-destructive' : ''}
                />
                {errors.token ? (
                  <p className="text-xs text-destructive">{errors.token.message}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Token gerado nas configurações de frota da empresa para permitir autosserviço (D07).
                  </p>
                )}
              </div>

              {/* Credenciais de Acesso */}
              <div className="rounded-xl border bg-muted/20 p-4 space-y-4">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Lock className="h-4 w-4 text-primary" />
                  Credenciais de Acesso ao Sistema
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail para Login *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="motorista@email.com"
                      {...register('email')}
                      className={errors.email ? 'border-destructive' : ''}
                    />
                    {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Senha de Acesso *</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      {...register('password')}
                      className={errors.password ? 'border-destructive' : ''}
                    />
                    {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
                  </div>
                </div>
              </div>

              {/* Dados do Motorista */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-primary" />
                  Dados Pessoais e Habilitação
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="nome">Nome Completo *</Label>
                    <Input
                      id="nome"
                      placeholder="Nome completo conforme documento"
                      {...register('nome')}
                      className={errors.nome ? 'border-destructive' : ''}
                    />
                    {errors.nome && <p className="text-xs text-destructive">{errors.nome.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="documento">CPF (11 dígitos) *</Label>
                    <Input
                      id="documento"
                      placeholder="000.000.000-00"
                      maxLength={14}
                      {...register('documento')}
                      className={errors.documento ? 'border-destructive' : ''}
                    />
                    {errors.documento && <p className="text-xs text-destructive">{errors.documento.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telefone">WhatsApp / Telefone *</Label>
                    <Input
                      id="telefone"
                      placeholder="(11) 99999-9999"
                      {...register('telefone')}
                      className={errors.telefone ? 'border-destructive' : ''}
                    />
                    {errors.telefone && <p className="text-xs text-destructive">{errors.telefone.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cnhNumber">Número da CNH</Label>
                    <Input id="cnhNumber" placeholder="Ex: 01234567890" {...register('cnhNumber')} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cnhCategory">Categoria CNH</Label>
                    <Select onValueChange={(val) => setValue('cnhCategory', val)}>
                      <SelectTrigger id="cnhCategory">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="B">B - Automóvel</SelectItem>
                        <SelectItem value="C">C - Caminhão leve</SelectItem>
                        <SelectItem value="D">D - Ônibus / Van</SelectItem>
                        <SelectItem value="E">E - Carreta / Articulado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cnhExpiresAt">Validade da CNH</Label>
                    <Input id="cnhExpiresAt" type="date" {...register('cnhExpiresAt')} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rntrcCode">Registro RNTRC</Label>
                    <Input id="rntrcCode" placeholder="Ex: 12345678" {...register('rntrcCode')} />
                  </div>
                </div>
              </div>

              {/* Dados do Veículo */}
              <div className="space-y-4 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Truck className="h-4 w-4 text-primary" />
                    Dados do Veículo do Parceiro (Opcional)
                  </h3>
                  <span className="text-xs text-muted-foreground">Pode ser preenchido depois</span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="vehicleTipo">Tipo de Veículo</Label>
                    <Select onValueChange={(val) => setValue('vehicleTipo', val)}>
                      <SelectTrigger id="vehicleTipo">
                        <SelectValue placeholder="Selecione o tipo..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TRUCK">Caminhão Pesado / Toco</SelectItem>
                        <SelectItem value="VAN">Van / Utilitário / Fiorino</SelectItem>
                        <SelectItem value="CAR">Carro Comercial</SelectItem>
                        <SelectItem value="MOTO">Motocicleta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vehiclePlaca">Placa</Label>
                    <Input
                      id="vehiclePlaca"
                      placeholder="ABC-1234 ou ABC1D23"
                      className="uppercase font-mono"
                      maxLength={8}
                      {...register('vehiclePlaca')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vehicleCapacidadePeso">Capacidade de Carga (kg)</Label>
                    <Input
                      id="vehicleCapacidadePeso"
                      type="number"
                      placeholder="Ex: 4000"
                      {...register('vehicleCapacidadePeso')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vehicleCapacidadeVolume">Volume (m³)</Label>
                    <Input
                      id="vehicleCapacidadeVolume"
                      type="number"
                      step="0.1"
                      placeholder="Ex: 30"
                      {...register('vehicleCapacidadeVolume')}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Button type="submit" disabled={isSubmitting} className="w-full text-base py-5">
                  {isSubmitting ? 'Enviando Cadastro...' : 'Enviar Cadastro para Homologação'}
                </Button>
              </div>
            </form>
          </CardContent>
          <CardFooter className="border-t bg-muted/10 justify-between text-xs text-muted-foreground py-3">
            <span>Já possui cadastro ativo?</span>
            <Link href="/login" className="text-primary hover:underline font-medium">
              Fazer Login
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

export default function ExternalDriverOnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  )
}
