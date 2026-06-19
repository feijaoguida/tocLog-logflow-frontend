"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

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
    return typeof value === "string" ? (JSON.parse(value) as T[]) : value
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
                    api.get(`/employees/${id}/history`)
                ])
                setEmployee(empRes.data)
                setHistory(histRes.data)
            } catch (error) {
                toast.error("Erro ao carregar os dados do perfil.")
                console.error(error)
                router.push("/dashboard/rh/employees")
            } finally {
                setLoading(false)
            }
        }
        if (id) fetchEmployeeData()
    }, [id, router])

    if (loading) {
        return (
            <div className="flex-1 w-full flex items-center justify-center p-12">
                <span className="material-symbols-outlined animate-spin text-4xl text-slate-300">sync</span>
            </div>
        )
    }

    if (!employee) return null

    // Safe Parsers for Phase 7 JSON fields
    const skills = parseJsonArray<SkillRecord>(employee.skills)
    const certifications = parseJsonArray<CertificationRecord>(employee.certifications)
    const courses = parseJsonArray<CourseRecord>(employee.courses)
    const experiences = parseJsonArray<ExperienceRecord>(employee.experiences)

    const displayRole = employee.role?.name || employee.legacyRole || "Cargo não definido"
    const location = [employee.city, employee.state].filter(Boolean).join(', ') || employee.branch?.name

    return (
        <div className="app-page">
            
            {/* Header / Top Profile Card */}
            <Card className="border-slate-200 overflow-hidden shadow-sm">
                <CardContent className="p-0">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-6 gap-6">
                        
                        <div className="flex items-center gap-6">
                            <Avatar className="w-24 h-24 sm:w-32 sm:h-32 border-4 border-white shadow-sm shrink-0 rounded-2xl">
                                <AvatarImage src={employee.avatarUrl || ""} className="object-cover" />
                                <AvatarFallback className="text-3xl bg-slate-100 text-slate-400 rounded-2xl">{employee.user?.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            
                            <div className="space-y-1">
                                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{employee.user?.name}</h1>
                                <p className="text-base font-medium text-[#c6182e]">{displayRole}</p>
                                
                                <div className="flex items-center gap-4 text-sm text-slate-500 pt-2 flex-wrap">
                                    <div className="flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-[16px]">badge</span>
                                        <span>Matrícula: {employee.registration || employee.id.split('-')[0].toUpperCase()}</span>
                                    </div>
                                    {location && (
                                        <div className="flex items-center gap-1.5 hidden sm:flex">
                                            <span className="material-symbols-outlined text-[16px]">location_on</span>
                                            <span>{location}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 w-full md:w-auto">
                            <Button variant="outline" className="flex-1 md:flex-none border-slate-200 hover:bg-slate-50" onClick={() => router.push(`/dashboard/rh/employees/${id}/edit`)}>
                                <span className="material-symbols-outlined text-[18px] mr-2 text-slate-600">edit</span> Editar Perfil
                            </Button>
                            <Button className="flex-1 md:flex-none bg-[#c6182e] hover:bg-[#a51426] text-white">
                                <span className="material-symbols-outlined text-[18px] mr-2">mail</span> Mensagem
                            </Button>
                        </div>
                    </div>

                    <div className="px-6 border-t border-slate-100 bg-slate-50/50">
                        <Tabs defaultValue="overview" className="w-full">
                            <TabsList className="bg-transparent border-b border-slate-200 w-full justify-start h-14 p-0 rounded-none overflow-x-auto flex-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                <TabsTrigger value="overview" className="h-14 px-6 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-[#c6182e] data-[state=active]:text-[#c6182e] data-[state=active]:shadow-none font-medium">Visão Geral</TabsTrigger>
                                <TabsTrigger value="journey" className="h-14 px-6 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-[#c6182e] data-[state=active]:text-[#c6182e] data-[state=active]:shadow-none font-medium text-slate-500">Jornada</TabsTrigger>
                                <TabsTrigger value="documents" className="h-14 px-6 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-[#c6182e] data-[state=active]:text-[#c6182e] data-[state=active]:shadow-none font-medium">Documentos</TabsTrigger>
                                <TabsTrigger value="payroll" className="h-14 px-6 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-[#c6182e] data-[state=active]:text-[#c6182e] data-[state=active]:shadow-none font-medium">Folha de Pagamento</TabsTrigger>
                                <TabsTrigger value="performance" className="h-14 px-6 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-[#c6182e] data-[state=active]:text-[#c6182e] data-[state=active]:shadow-none font-medium">Desempenho</TabsTrigger>
                            </TabsList>

                            {/* OVERVIEW TAB CONTENT */}
                            <TabsContent value="overview" className="p-0 border-none outline-none mt-6 pb-12">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    
                                    {/* Left Column (Wider on large screens) */}
                                    <div className="lg:col-span-2 space-y-6">
                                        
                                        {/* Personal Details */}
                                        <Card className="border-slate-200 shadow-sm">
                                            <CardHeader className="pb-3 flex flex-row items-center justify-between">
                                                <CardTitle className="text-lg text-slate-800">Dados Pessoais</CardTitle>
                                                <span className="material-symbols-outlined text-slate-400 text-[20px] cursor-pointer hover:text-slate-600">info</span>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-4">
                                                    <div>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">E-mail</span>
                                                        <span className="text-sm font-medium text-slate-700">{employee.user?.email || "-"}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Telefone</span>
                                                        <span className="text-sm font-medium text-slate-700">{employee.phone || "-"}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Data de Nascimento</span>
                                                        <span className="text-sm font-medium text-slate-700">{employee.birthDate ? new Date(employee.birthDate).toLocaleDateString('pt-BR') : "-"}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Data de Admissão</span>
                                                        <span className="text-sm font-medium text-slate-700">{employee.admissionDate ? new Date(employee.admissionDate).toLocaleDateString('pt-BR') : "-"}</span>
                                                    </div>
                                                    <div className="sm:col-span-2">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Endereço Residencial</span>
                                                        <span className="text-sm font-medium text-slate-700">{employee.address || "-"} {employee.city ? `, ${employee.city}` : ""} {employee.state ? `, ${employee.state}` : ""}</span>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        {/* Professional History */}
                                        <Card className="border-slate-200 shadow-sm">
                                            <CardHeader className="pb-3 border-b border-slate-50 mb-4">
                                                <CardTitle className="text-lg text-slate-800">Histórico Profissional</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                {experiences.length === 0 ? (
                                                    <p className="text-sm text-slate-500 py-4 italic">Nenhum histórico profissional registrado.</p>
                                                ) : (
                                                    <div className="relative pl-6 space-y-8 before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                                                        {experiences.map((exp, index: number) => (
                                                            <div key={index} className="relative flex items-start gap-6 group">
                                                                <div className="absolute left-[-31px] top-1 flex h-7 w-7 items-center justify-center rounded-full border-[3px] border-white bg-slate-100 text-slate-500 group-hover:bg-[#c6182e] group-hover:text-white transition-colors">
                                                                    <span className="material-symbols-outlined text-[14px]">work</span>
                                                                </div>
                                                                <div className="flex-1 space-y-1">
                                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                                        <h4 className="font-semibold text-slate-900">{exp.role}</h4>
                                                                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 whitespace-nowrap">
                                                                            {exp.startDate} - {exp.endDate || "Atual"}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-sm font-medium text-[#c6182e]">{exp.company}</p>
                                                                    {exp.description && <p className="text-sm text-slate-500 pt-1 leading-relaxed">{exp.description}</p>}
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
                                        <Card className="border-slate-200 shadow-sm">
                                            <CardHeader className="pb-3">
                                                <CardTitle className="text-lg text-slate-800">Competências Técnicas</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                {skills.length === 0 ? (
                                                     <p className="text-sm text-slate-500 py-2 italic">Nenhuma competência registrada.</p>
                                                ) : (
                                                    <div className="flex flex-wrap gap-2">
                                                        {skills.map((skill, idx: number) => (
                                                            <Badge key={idx} variant="secondary" className="bg-[#c6182e]/5 text-[#c6182e] hover:bg-[#c6182e]/10 px-3 py-1 font-medium border border-[#c6182e]/10">
                                                                {skill.name || "-"}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>

                                        {/* Certifications */}
                                        <Card className="border-slate-200 shadow-sm">
                                            <CardHeader className="pb-3">
                                                <CardTitle className="text-lg text-slate-800">Certificações</CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                {certifications.length === 0 ? (
                                                     <p className="text-sm text-slate-500 py-2 italic">Nenhuma certificação registrada.</p>
                                                ) : (
                                                    certifications.map((cert, idx: number) => (
                                                        <div key={idx} className="flex gap-3 items-start">
                                                            <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-600 shrink-0">
                                                                <span className="material-symbols-outlined text-[14px] font-bold">check</span>
                                                            </div>
                                                            <div>
                                                                <h4 className="text-sm font-semibold text-slate-800 leading-tight">{cert.name}</h4>
                                                                <p className="text-[11px] text-slate-500 mt-0.5">
                                                                    {cert.institution || "Instituição não informada"}
                                                                </p>
                                                                <p className="text-[11px] uppercase tracking-wide text-slate-400 mt-1">
                                                                    {cert.startDate
                                                                      ? `Início: ${new Date(cert.startDate).toLocaleDateString('pt-BR')}`
                                                                      : cert.issueDate
                                                                        ? `Emitido em ${cert.issueDate}`
                                                                        : "Data não informada"}
                                                                    {" · "}
                                                                    {cert.inProgress
                                                                      ? "Em andamento"
                                                                      : cert.completionDate
                                                                        ? `Conclusão: ${new Date(cert.completionDate).toLocaleDateString('pt-BR')}`
                                                                        : "Conclusão não informada"}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </CardContent>
                                        </Card>

                                        <Card className="border-slate-200 shadow-sm">
                                            <CardHeader className="pb-3">
                                                <CardTitle className="text-lg text-slate-800">Cursos e Treinamentos</CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                {courses.length === 0 ? (
                                                     <p className="text-sm text-slate-500 py-2 italic">Nenhum curso ou treinamento registrado.</p>
                                                ) : (
                                                    courses.map((course, idx: number) => (
                                                        <div key={idx} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                                                            <h4 className="text-sm font-semibold text-slate-800 leading-tight">{course.name || "-"}</h4>
                                                            <p className="mt-1 text-xs text-slate-500">{course.institution || "Instituição não informada"}</p>
                                                            <p className="mt-2 text-[11px] uppercase tracking-wide text-slate-400">
                                                                {course.startDate ? `Início: ${new Date(course.startDate).toLocaleDateString('pt-BR')}` : "Início não informado"}
                                                                {" · "}
                                                                {course.inProgress
                                                                  ? "Em andamento"
                                                                  : course.completionDate
                                                                    ? `Conclusão: ${new Date(course.completionDate).toLocaleDateString('pt-BR')}`
                                                                    : "Conclusão não informada"}
                                                            </p>
                                                        </div>
                                                    ))
                                                )}
                                            </CardContent>
                                        </Card>

                                        {/* Company Assets */}
                                        <Card className="border-slate-200 shadow-sm bg-slate-50/50">
                                            <CardHeader className="pb-3 flex flex-row items-center justify-between">
                                                <CardTitle className="text-lg text-slate-800">Ativos da Empresa</CardTitle>
                                                <span className="text-xs font-semibold text-[#c6182e] cursor-pointer hover:underline">Ver Todos</span>
                                            </CardHeader>
                                            <CardContent className="space-y-3">
                                                <div className="bg-white p-3 rounded-lg border border-slate-100 flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded bg-red-50 flex items-center justify-center text-red-500">
                                                        <span className="material-symbols-outlined text-[18px]">laptop_mac</span>
                                                    </div>
                                                    <div className="flex-1 overflow-hidden">
                                                        <h4 className="text-sm font-semibold text-slate-800 truncate">MacBook Pro 16&quot;</h4>
                                                        <p className="text-[10px] text-slate-500">SN: C02F78XMMD6M</p>
                                                    </div>
                                                </div>
                                                <div className="bg-white p-3 rounded-lg border border-slate-100 flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded bg-red-50 flex items-center justify-center text-red-500">
                                                        <span className="material-symbols-outlined text-[18px]">smartphone</span>
                                                    </div>
                                                    <div className="flex-1 overflow-hidden">
                                                        <h4 className="text-sm font-semibold text-slate-800 truncate">iPhone 14 Pro</h4>
                                                        <p className="text-[10px] text-slate-500">SN: GH8902LKJ91</p>
                                                    </div>
                                                </div>
                                                <Button variant="outline" className="w-full mt-2 bg-transparent border-dashed border-slate-300 text-slate-600 text-xs h-9">
                                                    Solicitar Troca de Equipamento
                                                </Button>
                                            </CardContent>
                                        </Card>
                                        
                                    </div>
                                </div>
                            </TabsContent>
                            
                            {/* JOURNEY TAB CONTENT */}
                            <TabsContent value="journey" className="p-0 border-none outline-none mt-6 pb-12">
                                <Card className="border-slate-200 shadow-sm">
                                    <CardHeader className="pb-3 border-b border-slate-50 mb-4">
                                        <CardTitle className="text-lg text-slate-800">Linha do Tempo e Evolução</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="max-w-3xl mx-auto">
                                            {history.length === 0 ? (
                                                <div className="py-12 text-center flex flex-col items-center justify-center">
                                                    <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">history</span>
                                                    <p className="text-sm text-slate-500 font-medium">Nenhuma movimentação registrada.</p>
                                                    <p className="text-xs text-slate-400 mt-1">Alterações de cargo, salário ou departamento aparecerão aqui.</p>
                                                </div>
                                            ) : (
                                                <div className="relative pl-6 sm:pl-8 space-y-8 before:absolute before:inset-0 before:ml-[11px] sm:before:ml-[19px] before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-slate-200 before:via-slate-200 before:to-transparent py-4">
                                                    {history.map((event, idx) => {
                                                        const isSalary = event.type === 'SALARY';
                                                        const eventDate = new Date(event.date || event.effectiveDate || Date.now());
                                                        const authorName = event.changedBy?.user?.name || "Sistema";
                                                        
                                                        let icon = "swap_horiz";
                                                        let title = "Movimentação";
                                                        let details = "";
                                                        
                                                        if (isSalary) {
                                                            icon = "payments";
                                                            title = "Atualização Salarial";
                                                            const oSal = parseFloat(event.oldSalary || "0").toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                                                            const nSal = parseFloat(event.newSalary || "0").toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                                                            details = `${oSal} ➔ ${nSal}`;
                                                        } else {
                                                            if (event.actionType === 'ROLE') { icon = "badge"; title = "Mudança de Cargo"; }
                                                            else if (event.actionType === 'DEPT') { icon = "corporate_fare"; title = "Transferência de Departamento"; }
                                                            else if (event.actionType === 'BRANCH') { icon = "storefront"; title = "Transferência de Filial"; }
                                                            else if (event.actionType === 'MANAGER') { icon = "supervisor_account"; title = "Mudança de Gestor Direto"; }
                                                            
                                                            details = `${event.oldDisplay || 'Não Definido'} ➔ ${event.newDisplay || 'Não Definido'}`;
                                                        }

                                                        return (
                                                            <div key={idx} className="relative flex items-start gap-4 sm:gap-6 group">
                                                                <div className={`absolute left-[-31px] sm:left-[-39px] top-1 flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full border-[3px] border-white shadow-sm ${isSalary ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                                                                    <span className="material-symbols-outlined text-[16px] sm:text-[20px]">{icon}</span>
                                                                </div>
                                                                <div className="flex-1 space-y-1.5 pt-1">
                                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2">
                                                                        <h4 className="font-semibold text-slate-900 text-sm sm:text-base">{title}</h4>
                                                                        <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
                                                                            {eventDate.toLocaleDateString('pt-BR')} às {eventDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                                        </span>
                                                                    </div>
                                                                    <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 mt-2">
                                                                        <p className="text-sm font-medium text-slate-700">{details}</p>
                                                                    </div>
                                                                    <p className="text-[11px] text-slate-400 mt-2">
                                                                        Registrado por <span className="font-semibold text-slate-500">{authorName}</span>
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

                            {/* Empty states for other tabs for now */}
                            <TabsContent value="documents" className="p-12 text-center text-slate-500 border border-dashed border-slate-200 rounded-xl mt-6">
                                Modulo Integrado ao GED (em breve)
                            </TabsContent>
                            <TabsContent value="payroll" className="p-12 text-center text-slate-500 border border-dashed border-slate-200 rounded-xl mt-6">
                                Dados e recibos de contracheque protegido por ABAC (em breve)
                            </TabsContent>
                            <TabsContent value="performance" className="p-12 text-center text-slate-500 border border-dashed border-slate-200 rounded-xl mt-6">
                                Histórico de Avaliações de Desempenho e Feedback (em breve)
                            </TabsContent>

                        </Tabs>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
