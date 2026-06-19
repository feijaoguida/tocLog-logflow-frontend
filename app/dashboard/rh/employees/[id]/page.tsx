'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

export default function EmployeeProfilePage() {
    const { id } = useParams()
    const router = useRouter()
    const [employee, setEmployee] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchEmployee = async () => {
            try {
                // Try backend fetch, if backend lacks /:id this might 404
                // A complete implementation would ensure backend covers this.
                const { data } = await api.get(`/employees/${id}`)
                setEmployee(data)
            } catch (error) {
                console.error("Failed to fetch employee", error)
            } finally {
                setLoading(false)
            }
        }
        if (id) fetchEmployee()
    }, [id])

    // Mock data for UI elements not yet supported by DB to match Figma perfectly
    const skills = ["React.js", "TypeScript", "Node.js", "PostgreSQL", "AWS Cloud", "GraphQL", "Docker", "Product Design", "Agile Coaching"]
    const timeline = [
        { title: "Promoted to Senior Software Engineer", date: "JUN 2023 - PRESENT", desc: "Leading the Core Systems team and overseeing architectural changes for the global HR platform.", active: true },
        { title: "Software Engineer II", date: "JAN 2021 - JUN 2023", desc: "Full-stack development using React and Node.js. Optimized database queries by 40%.", active: false },
        { title: "Joined Toclog Inc.", date: "JAN 2021", desc: "Onboarded as a part of the Engineering expansion program.", active: false }
    ]

    if (loading) {
        return <div className="flex h-screen items-center justify-center"><span className="material-symbols-outlined animate-spin text-4xl text-[#c6182e]">sync</span></div>
    }

    if (!employee) {
        return <div className="p-8 text-center text-slate-500">Funcionário não encontrado ou não cadastrado.</div>
    }

    const initials = employee.user?.name?.substring(0, 2).toUpperCase() || 'NA'
    const roleName = employee.legacyRole || employee.role?.name || "Cargo Indefinido"

    return (
        <div className="flex-1 w-full max-w-6xl mx-auto p-4 md:p-6 lg:p-8 space-y-6 pb-24">
            {/* Header / Back */}
            <div className="text-sm font-medium text-slate-500 mb-2 flex items-center gap-2">
                <span className="cursor-pointer hover:text-slate-800" onClick={() => router.push('/dashboard/rh/employees')}>Colaboradores</span>
                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                <span className="text-slate-800 font-semibold">Perfil</span>
            </div>

            {/* Top Profile Card */}
            <Card className="border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white">
                <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                    <div className="flex gap-6 items-center">
                        <Avatar className="h-24 w-24 rounded-2xl ring-4 ring-slate-50">
                            <AvatarImage src={employee.avatarUrl || ''} className="object-cover" />
                            <AvatarFallback className="text-2xl font-bold bg-slate-100 text-slate-600 rounded-2xl">{initials}</AvatarFallback>
                        </Avatar>
                        
                        <div className="space-y-1.5">
                            <h1 className="text-3xl font-bold text-[#221813] tracking-tight">{employee.user?.name}</h1>
                            <p className="text-[#c6182e] font-semibold text-sm">{roleName}</p>
                            
                            <div className="flex items-center gap-4 text-xs font-medium text-slate-500 pt-1">
                                <div className="flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[14px]">work</span>
                                    TC-{employee.id?.substring(0,4).toUpperCase() || '0000'}
                                </div>
                                <div className="w-1 h-1 rounded-full bg-slate-200"></div>
                                <div className="flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[14px]">location_on</span>
                                    {employee.branch?.name || "Matriz"}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex gap-3 mt-4 md:mt-0 w-full md:w-auto">
                        <Button variant="outline" className="flex-1 md:flex-none border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold h-10 px-5 rounded-lg shadow-sm">
                            <span className="material-symbols-outlined text-[18px] mr-2">edit</span> Editar Perfil
                        </Button>
                        <Button className="flex-1 md:flex-none bg-[#c6182e] hover:bg-[#a51426] text-white font-semibold h-10 px-5 rounded-lg shadow-sm">
                            <span className="material-symbols-outlined text-[18px] mr-2">mail</span> Mensagem
                        </Button>
                    </div>
                </div>

                <div className="px-6 md:px-8 border-t border-slate-100 bg-slate-50/50">
                    <Tabs defaultValue="overview" className="w-full">
                        <TabsList className="h-14 w-full justify-start gap-8 bg-transparent p-0">
                            <TabsTrigger value="overview" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[#c6182e] data-[state=active]:text-[#c6182e] rounded-none px-0 h-14 font-semibold text-slate-500">
                                Visão Geral
                            </TabsTrigger>
                            <TabsTrigger value="docs" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[#c6182e] data-[state=active]:text-[#c6182e] rounded-none px-0 h-14 font-semibold text-slate-500">
                                Documentos
                            </TabsTrigger>
                            <TabsTrigger value="payroll" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[#c6182e] data-[state=active]:text-[#c6182e] rounded-none px-0 h-14 font-semibold text-slate-500">
                                Folha
                            </TabsTrigger>
                            <TabsTrigger value="perf" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[#c6182e] data-[state=active]:text-[#c6182e] rounded-none px-0 h-14 font-semibold text-slate-500">
                                Desempenho
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Column (Wider) */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* Personal Details */}
                    <Card className="border-slate-200 shadow-sm rounded-xl">
                        <div className="px-6 py-5 flex items-center justify-between border-b border-slate-100">
                            <h2 className="text-lg font-bold tracking-tight text-[#221813]">Detalhes Pessoais</h2>
                            <span className="material-symbols-outlined text-slate-400 text-xl cursor-pointer hover:text-slate-600">info</span>
                        </div>
                        <CardContent className="p-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">E-mail Corporativo</p>
                                    <p className="text-sm font-medium text-slate-800">{employee.user?.email || "Não informado"}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Telefone / Celular</p>
                                    <p className="text-sm font-medium text-slate-800">+55 (11) 98765-4321</p> {/* Mocked for UI */}
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Data de Nascimento</p>
                                    <p className="text-sm font-medium text-slate-800">{employee.birthDate ? new Date(employee.birthDate).toLocaleDateString('pt-BR') : "14 de Maio de 1992"}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Data de Admissão</p>
                                    <p className="text-sm font-medium text-slate-800">{employee.admissionDate ? new Date(employee.admissionDate).toLocaleDateString('pt-BR') : "10 de Janeiro de 2021"}</p>
                                </div>
                                <div className="sm:col-span-2">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Endereço Residencial</p>
                                    <p className="text-sm font-medium text-slate-800">821 Oak St, Austin, TX 78701, Estados Unidos</p> {/* Mocked for UI */}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Professional History */}
                    <Card className="border-slate-200 shadow-sm rounded-xl">
                        <div className="px-6 py-5 border-b border-slate-100">
                            <h2 className="text-lg font-bold tracking-tight text-[#221813]">Histórico Profissional</h2>
                        </div>
                        <CardContent className="p-6">
                            <div className="relative border-l-2 border-slate-100 ml-4 space-y-8 pb-4">
                                {timeline.map((item, idx) => (
                                    <div key={idx} className="relative pl-8">
                                        <div className={`absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-white ${item.active ? 'bg-[#c6182e] ring-4 ring-red-50' : 'bg-slate-300'}`}>
                                            {item.active && <span className="absolute inset-0 m-auto h-2 w-2 rounded-full bg-white opacity-20"></span>}
                                        </div>
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
                                            <h3 className={`text-sm font-bold ${item.active ? 'text-slate-900' : 'text-slate-700'}`}>{item.title}</h3>
                                            <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-semibold text-[10px] uppercase rounded-md shadow-none px-2 py-0.5 w-fit">
                                                {item.date}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-slate-500 leading-relaxed pr-8">{item.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column (Narrower) */}
                <div className="space-y-6">
                    
                    {/* Skills & Expertise */}
                    <Card className="border-slate-200 shadow-sm rounded-xl">
                        <div className="px-6 py-5 border-b border-slate-100">
                            <h2 className="text-lg font-bold tracking-tight text-[#221813]">Habilidades</h2>
                        </div>
                        <CardContent className="p-6">
                            <div className="flex flex-wrap gap-2">
                                {skills.map(skill => (
                                    <Badge key={skill} variant="outline" className="bg-red-50 border-0 text-[#a51426] hover:bg-red-100 font-semibold text-xs px-2.5 py-1 rounded-md">
                                        {skill}
                                    </Badge>
                                ))}
                            </div>

                            <Separator className="my-6 bg-slate-100" />
                            
                            <h3 className="text-sm font-bold tracking-tight text-[#221813] mb-4">Certificações</h3>
                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <span className="material-symbols-outlined text-[#c6182e] text-xl mt-0.5">verified</span>
                                    <div>
                                        <p className="text-xs font-bold text-slate-800">AWS Solutions Architect</p>
                                        <p className="text-[10px] text-slate-500 font-medium uppercase mt-0.5">Emitido em OUT 2023</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <span className="material-symbols-outlined text-[#c6182e] text-xl mt-0.5">verified</span>
                                    <div>
                                        <p className="text-xs font-bold text-slate-800">Scrum Master Certified</p>
                                        <p className="text-[10px] text-slate-500 font-medium uppercase mt-0.5">Emitido em FEV 2022</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Company Assets */}
                    <Card className="border-slate-200 shadow-sm rounded-xl">
                        <div className="px-6 py-5 flex items-center justify-between border-b border-slate-100">
                            <h2 className="text-lg font-bold tracking-tight text-[#221813]">Ativos da Empresa</h2>
                            <span className="text-xs font-bold text-[#c6182e] cursor-pointer hover:underline">Ver Todos</span>
                        </div>
                        <CardContent className="p-6 space-y-4">
                            <div className="flex items-center gap-4 bg-slate-50 rounded-lg p-3 border border-slate-100">
                                <span className="material-symbols-outlined text-[#c6182e] bg-white p-1.5 rounded-md shadow-sm border border-slate-100 text-[22px]">laptop_mac</span>
                                <div>
                                    <p className="text-xs font-bold text-slate-800">MacBook Pro 16"</p>
                                    <p className="text-[10px] text-slate-500 font-medium mt-0.5 uppercase">SN: C02F78XMMD6M</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 bg-slate-50 rounded-lg p-3 border border-slate-100">
                                <span className="material-symbols-outlined text-[#c6182e] bg-white p-1.5 rounded-md shadow-sm border border-slate-100 text-[22px]">smartphone</span>
                                <div>
                                    <p className="text-xs font-bold text-slate-800">iPhone 14 Pro</p>
                                    <p className="text-[10px] text-slate-500 font-medium mt-0.5 uppercase">SN: GH8902LKJ91</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 bg-slate-50 rounded-lg p-3 border border-slate-100">
                                <span className="material-symbols-outlined text-[#c6182e] bg-white p-1.5 rounded-md shadow-sm border border-slate-100 text-[22px]">keyboard</span>
                                <div>
                                    <p className="text-xs font-bold text-slate-800">Magic Keyboard & Mouse</p>
                                    <p className="text-[10px] text-slate-500 font-medium mt-0.5 uppercase">Atribuído em Jan 2021</p>
                                </div>
                            </div>

                            <div className="pt-2">
                                <Button variant="outline" className="w-full border-dashed border-2 border-slate-200 text-slate-600 hover:text-[#c6182e] hover:border-[#c6182e]/30 hover:bg-red-50/50 font-semibold text-xs py-5">
                                    Solicitar Troca de Equipamento
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                </div>
            </div>
        </div>
    )
}
