'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Award,
  BadgeCheck,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  GraduationCap,
  History,
  Info,
  Laptop,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Smartphone,
  UserCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'

type SkillRecord = { name?: string }
type CertificationRecord = {
  name?: string
  institution?: string
  startDate?: string
  completionDate?: string
  inProgress?: boolean
  issueDate?: string
}
type CourseRecord = {
  name?: string
  institution?: string
  startDate?: string
  completionDate?: string
  inProgress?: boolean
}
type ExperienceRecord = {
  role?: string
  company?: string
  startDate?: string
  endDate?: string
  description?: string
}
type HistoryRecord = {
  type?: string
  actionType?: string
  date?: string
  effectiveDate?: string
  oldSalary?: string
  newSalary?: string
  oldDisplay?: string
  newDisplay?: string
  changedBy?: { user?: { name?: string } }
}
type EmployeeRecord = {
  id: string
  avatarUrl?: string
  registration?: string
  legacyRole?: string
  city?: string
  state?: string
  address?: string
  phone?: string
  birthDate?: string
  admissionDate?: string
  skills?: string | SkillRecord[]
  certifications?: string | CertificationRecord[]
  courses?: string | CourseRecord[]
  experiences?: string | ExperienceRecord[]
  branch?: { name?: string }
  role?: { name?: string }
  user?: { name?: string; email?: string }
}

function parseJsonArray<T>(value?: string | T[]): T[] {
  if (!value) return []
  return typeof value === 'string' ? (JSON.parse(value) as T[]) : value
}

function getInitials(name?: string | null) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function EmployeeProfilePage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [employee, setEmployee] = useState<EmployeeRecord | null>(null)
  const [history, setHistory] = useState<HistoryRecord[]>([])

  useEffect(() => {
    const fetchEmployeeData = async () => {
      try {
        const [empRes, histRes] = await Promise.all([
          api.get(`/employees/${id}`),
          api.get(`/employees/${id}/history`),
        ])
        setEmployee(empRes.data)
        setHistory(histRes.data)
      } catch (error) {
        toast.error('Erro ao carregar os dados do perfil.')
        console.error(error)
        router.push('/dashboard/rh/employees')
      } finally {
        setLoading(false)
      }
    }
    if (id) void fetchEmployeeData()
  }, [id, router])

  if (loading) {
    return (
      <div className="flex min-h-[300px] w-full items-center justify-center p-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!employee) return null

  const skills = parseJsonArray<SkillRecord>(employee.skills)
  const certifications = parseJsonArray<CertificationRecord>(employee.certifications)
  const courses = parseJsonArray<CourseRecord>(employee.courses)
  const experiences = parseJsonArray<ExperienceRecord>(employee.experiences)

  const displayRole = employee.role?.name || employee.legacyRole || 'Cargo não definido'
  const location = [employee.city, employee.state].filter(Boolean).join(', ') || employee.branch?.name

  return (
    <div className="app-page space-y-6">
      {/* 1. Breadcrumb e Ações */}
      <section className="space-y-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link
            href="/dashboard/rh/employees"
            className="transition hover:text-foreground"
          >
            Funcionários
          </Link>
          <ChevronRight className="size-3 text-muted-foreground/60" />
          <span className="font-medium text-foreground">{employee.user?.name}</span>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Perfil do Colaborador
            </h1>
            <p className="text-sm text-muted-foreground">
              Visão 360° com dados cadastrais, histórico de evolução funcional e competências.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-9 gap-1.5"
            >
              <Link href={`/dashboard/rh/employees/${id}/edit`}>
                <Pencil className="size-4" />
                <span>Editar perfil</span>
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-9 gap-1.5"
            >
              <Link href="/dashboard/rh/employees">
                <ArrowLeft className="size-4" />
                <span>Voltar</span>
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Header / Top Profile Card */}
      <Card className="app-section-card overflow-hidden">
        <CardContent className="p-0">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-6 gap-6">
            <div className="flex items-center gap-6">
              <Avatar className="size-20 sm:size-24 border-2 border-border shadow-xs shrink-0 rounded-2xl">
                <AvatarImage
                  src={employee.avatarUrl || ''}
                  className="object-cover rounded-2xl"
                />
                <AvatarFallback className="text-2xl bg-muted text-muted-foreground rounded-2xl font-bold">
                  {getInitials(employee.user?.name)}
                </AvatarFallback>
              </Avatar>

              <div className="space-y-1">
                <h2 className="text-2xl font-bold text-foreground tracking-tight">
                  {employee.user?.name}
                </h2>
                <p className="text-sm font-semibold text-primary">{displayRole}</p>

                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <BadgeCheck className="size-3.5" />
                    <span>
                      Matrícula: {employee.registration || employee.id.split('-')[0].toUpperCase()}
                    </span>
                  </div>
                  {location && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="size-3.5" />
                      <span>{location}</span>
                    </div>
                  )}
                  {employee.user?.email && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="size-3.5" />
                      <span>{employee.user.email}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2 w-full md:w-auto">
              <Button
                asChild
                size="sm"
                className="flex-1 md:flex-none h-9 gap-1.5 font-semibold"
              >
                <Link href={`/dashboard/rh/employees/${id}/edit`}>
                  <Pencil className="size-4" />
                  <span>Editar</span>
                </Link>
              </Button>
            </div>
          </div>

          <div className="px-6 border-t border-border/70 bg-muted/20">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="bg-transparent border-b border-border/70 w-full justify-start h-12 p-0 rounded-none overflow-x-auto flex-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <TabsTrigger
                  value="overview"
                  className="h-12 px-5 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none font-medium text-xs"
                >
                  Visão Geral
                </TabsTrigger>
                <TabsTrigger
                  value="journey"
                  className="h-12 px-5 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none font-medium text-xs text-muted-foreground"
                >
                  Jornada & Movimentações
                </TabsTrigger>
                <TabsTrigger
                  value="documents"
                  className="h-12 px-5 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none font-medium text-xs text-muted-foreground"
                >
                  Documentos
                </TabsTrigger>
                <TabsTrigger
                  value="payroll"
                  className="h-12 px-5 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none font-medium text-xs text-muted-foreground"
                >
                  Folha de Pagamento
                </TabsTrigger>
                <TabsTrigger
                  value="performance"
                  className="h-12 px-5 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none font-medium text-xs text-muted-foreground"
                >
                  Desempenho
                </TabsTrigger>
              </TabsList>

              {/* OVERVIEW TAB CONTENT */}
              <TabsContent value="overview" className="p-0 border-none outline-none mt-6 pb-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column (Wider on large screens) */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Personal Details */}
                    <Card className="app-section-card shadow-xs">
                      <CardHeader className="pb-3 flex flex-row items-center justify-between">
                        <CardTitle className="text-base font-semibold">Dados Pessoais & Contato</CardTitle>
                        <Info className="size-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-4">
                          <div>
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                              E-mail
                            </span>
                            <span className="text-sm font-medium text-foreground">
                              {employee.user?.email || '-'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                              Telefone
                            </span>
                            <span className="text-sm font-medium text-foreground">
                              {employee.phone || '-'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                              Data de Nascimento
                            </span>
                            <span className="text-sm font-medium text-foreground">
                              {employee.birthDate
                                ? new Date(employee.birthDate).toLocaleDateString('pt-BR')
                                : '-'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                              Data de Admissão
                            </span>
                            <span className="text-sm font-medium text-foreground">
                              {employee.admissionDate
                                ? new Date(employee.admissionDate).toLocaleDateString('pt-BR')
                                : '-'}
                            </span>
                          </div>
                          <div className="sm:col-span-2">
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                              Endereço Residencial
                            </span>
                            <span className="text-sm font-medium text-foreground">
                              {employee.address || '-'}{' '}
                              {employee.city ? `, ${employee.city}` : ''}{' '}
                              {employee.state ? `, ${employee.state}` : ''}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Professional History */}
                    <Card className="app-section-card shadow-xs">
                      <CardHeader className="pb-3 border-b border-border/70 mb-4">
                        <CardTitle className="text-base font-semibold">
                          Histórico Profissional
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {experiences.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-4 italic">
                            Nenhum histórico profissional registrado.
                          </p>
                        ) : (
                          <div className="space-y-6">
                            {experiences.map((exp, index: number) => (
                              <div key={index} className="flex items-start gap-4">
                                <div className="mt-1 flex size-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary shrink-0">
                                  <Briefcase className="size-4" />
                                </div>
                                <div className="flex-1 space-y-1">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                    <h4 className="font-semibold text-sm text-foreground">
                                      {exp.role}
                                    </h4>
                                    <span className="inline-flex items-center rounded-md border border-border bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground whitespace-nowrap">
                                      {exp.startDate} - {exp.endDate || 'Atual'}
                                    </span>
                                  </div>
                                  <p className="text-xs font-semibold text-primary">
                                    {exp.company}
                                  </p>
                                  {exp.description && (
                                    <p className="text-xs text-muted-foreground pt-1 leading-relaxed">
                                      {exp.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-6">
                    {/* Skills & Expertise */}
                    <Card className="app-section-card shadow-xs">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold">
                          Competências Técnicas
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {skills.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-2 italic">
                            Nenhuma competência registrada.
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {skills.map((skill, idx: number) => (
                              <Badge
                                key={idx}
                                variant="secondary"
                                className="px-2.5 py-0.5 text-xs font-medium"
                              >
                                {skill.name || '-'}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Certifications */}
                    <Card className="app-section-card shadow-xs">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold">
                          Certificações
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {certifications.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-2 italic">
                            Nenhuma certificação registrada.
                          </p>
                        ) : (
                          certifications.map((cert, idx: number) => (
                            <div key={idx} className="flex gap-3 items-start">
                              <div className="mt-0.5 flex size-6 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 shrink-0">
                                <Award className="size-3.5" />
                              </div>
                              <div>
                                <h4 className="text-sm font-semibold text-foreground leading-tight">
                                  {cert.name}
                                </h4>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {cert.institution || 'Instituição não informada'}
                                </p>
                                <p className="text-[11px] text-muted-foreground/70 mt-1">
                                  {cert.startDate
                                    ? `Início: ${new Date(cert.startDate).toLocaleDateString('pt-BR')}`
                                    : cert.issueDate
                                      ? `Emitido em ${cert.issueDate}`
                                      : 'Data não informada'}
                                  {' · '}
                                  {cert.inProgress
                                    ? 'Em andamento'
                                    : cert.completionDate
                                      ? `Conclusão: ${new Date(cert.completionDate).toLocaleDateString('pt-BR')}`
                                      : 'Conclusão não informada'}
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                      </CardContent>
                    </Card>

                    {/* Cursos */}
                    <Card className="app-section-card shadow-xs">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold">
                          Cursos e Treinamentos
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {courses.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-2 italic">
                            Nenhum curso registrado.
                          </p>
                        ) : (
                          courses.map((course, idx: number) => (
                            <div
                              key={idx}
                              className="rounded-lg border border-border/70 bg-muted/20 p-3"
                            >
                              <div className="flex items-center gap-2">
                                <GraduationCap className="size-4 text-muted-foreground" />
                                <h4 className="text-xs font-semibold text-foreground">
                                  {course.name || '-'}
                                </h4>
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {course.institution || 'Instituição não informada'}
                              </p>
                            </div>
                          ))
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              {/* JOURNEY TAB CONTENT */}
              <TabsContent value="journey" className="p-0 border-none outline-none mt-6 pb-8">
                <Card className="app-section-card shadow-xs">
                  <CardHeader className="pb-3 border-b border-border/70 mb-4">
                    <CardTitle className="text-base font-semibold">
                      Linha do Tempo e Evolução Funcional
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="max-w-3xl">
                      {history.length === 0 ? (
                        <div className="py-12 text-center flex flex-col items-center justify-center">
                          <History className="size-8 text-muted-foreground/60 mb-2" />
                          <p className="text-sm text-foreground font-medium">
                            Nenhuma movimentação registrada.
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Alterações de cargo, salário ou departamento aparecerão aqui.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {history.map((event, idx) => {
                            const isSalary = event.type === 'SALARY'
                            const eventDate = new Date(
                              event.date || event.effectiveDate || Date.now(),
                            )
                            const authorName = event.changedBy?.user?.name || 'Sistema'

                            let title = 'Movimentação'
                            let details = ''

                            if (isSalary) {
                              title = 'Atualização Salarial'
                              const oSal = parseFloat(event.oldSalary || '0').toLocaleString(
                                'pt-BR',
                                { style: 'currency', currency: 'BRL' },
                              )
                              const nSal = parseFloat(event.newSalary || '0').toLocaleString(
                                'pt-BR',
                                { style: 'currency', currency: 'BRL' },
                              )
                              details = `${oSal} ➔ ${nSal}`
                            } else {
                              if (event.actionType === 'ROLE') title = 'Mudança de Cargo'
                              else if (event.actionType === 'DEPT')
                                title = 'Transferência de Departamento'
                              else if (event.actionType === 'BRANCH')
                                title = 'Transferência de Filial'
                              else if (event.actionType === 'MANAGER')
                                title = 'Mudança de Gestor Direto'

                              details = `${event.oldDisplay || 'Não Definido'} ➔ ${
                                event.newDisplay || 'Não Definido'
                              }`
                            }

                            return (
                              <div key={idx} className="flex items-start gap-4">
                                <div
                                  className={`mt-1 flex size-8 items-center justify-center rounded-full border border-border shrink-0 ${
                                    isSalary
                                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                                      : 'bg-primary/10 text-primary'
                                  }`}
                                >
                                  <History className="size-4" />
                                </div>
                                <div className="flex-1 space-y-1">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                    <h4 className="font-semibold text-sm text-foreground">
                                      {title}
                                    </h4>
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                                      {eventDate.toLocaleDateString('pt-BR')} às{' '}
                                      {eventDate.toLocaleTimeString('pt-BR', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </span>
                                  </div>
                                  <div className="rounded-md border border-border/70 bg-muted/20 p-2.5 mt-1.5">
                                    <p className="text-xs font-semibold text-foreground">
                                      {details}
                                    </p>
                                  </div>
                                  <p className="text-[11px] text-muted-foreground mt-1">
                                    Registrado por{' '}
                                    <span className="font-medium text-foreground">
                                      {authorName}
                                    </span>
                                  </p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Placeholders for GED, Payroll, Performance */}
              <TabsContent
                value="documents"
                className="p-12 text-center text-muted-foreground border border-dashed border-border rounded-xl mt-6"
              >
                Módulo Integrado ao GED (em breve)
              </TabsContent>
              <TabsContent
                value="payroll"
                className="p-12 text-center text-muted-foreground border border-dashed border-border rounded-xl mt-6"
              >
                Dados e recibos de contracheque protegido por ABAC (em breve)
              </TabsContent>
              <TabsContent
                value="performance"
                className="p-12 text-center text-muted-foreground border border-dashed border-border rounded-xl mt-6"
              >
                Histórico de Avaliações de Desempenho e Feedback (em breve)
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
