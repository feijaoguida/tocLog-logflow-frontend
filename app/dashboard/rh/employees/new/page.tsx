'use client'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { ImageUpload } from "@/components/image-upload"

const formatCPF = (value: string) => {
    return value
        .replace(/\D/g, '')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1')
}

export default function NewEmployeePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  
  // Data State
  const [departments, setDepartments] = useState<any[]>([])
  const [managers, setManagers] = useState<any[]>([])
  const [roles, setRoles] = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])

  // Form State
  const [avatarUrl, setAvatarUrl] = useState("")
  const [name, setName] = useState("")
  const [cpf, setCpf] = useState("")
  const [birthDate, setBirthDate] = useState("")
  const [departmentId, setDepartmentId] = useState("")
  const [role, setRole] = useState("") // Job Title
  const [directManagerId, setDirectManagerId] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  
  // Extra required fields for backend that aren't prominent in mockup but necessary
  const [branchId, setBranchId] = useState("")
  const [systemRoleId, setSystemRoleId] = useState("")

  useEffect(() => {
    const fetchData = async () => {
        try {
            const [deptRes, empRes, roleRes, branchRes] = await Promise.all([
                api.get('/departments'),
                api.get('/employees'),
                api.get('/roles'),
                api.get('/branches')
            ])
            setDepartments(deptRes.data)
            setManagers(empRes.data) 
            setRoles(roleRes.data)
            setBranches(branchRes.data)
        } catch(e) { 
            console.error(e) 
            toast.error("Erro ao carregar dados do formulário.")
        }
    }
    fetchData()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
        const payload: any = {
            name,
            email,
            cpf: cpf.replace(/\D/g, ''),
            role: role, 
            roleId: systemRoleId || undefined,
            branchId: branchId || undefined, 
            departmentId: departmentId || undefined,
            directManagerId: directManagerId || undefined,
            avatarUrl: avatarUrl || undefined,
            birthDate: birthDate ? new Date(birthDate).toISOString() : undefined,
            // Phone could be added to extra metadata or ignored if not in schema yet
        }
        
        await api.post('/employees', payload)
        toast.success("Funcionário criado com sucesso.")
        router.push('/dashboard/rh/employees')
    } catch (error: any) {
        console.error(error)
        const msg = error.response?.data?.message
        toast.error(Array.isArray(msg) ? msg[0] : (msg || "Erro ao salvar funcionário."))
    } finally {
        setLoading(false)
    }
  }

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto p-6 space-y-6 pb-24">
      {/* Header */}
      <div>
        <div className="text-sm font-medium text-slate-500 mb-2 flex items-center gap-2">
            <span className="cursor-pointer hover:text-slate-800" onClick={() => router.push('/dashboard/rh/employees')}>Colaboradores</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-[#c6182e]">Novo Cadastro</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[#221813]">Cadastro de Colaborador</h1>
        <p className="text-sm text-slate-500 mt-1">Preencha as informações abaixo para registrar um novo membro na equipe Toclog.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
          
        {/* Photo Section */}
        <Card className="border-slate-200 shadow-sm overflow-hidden rounded-xl">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#c6182e]">photo_camera</span>
                <h3 className="font-semibold text-slate-800">Foto do Colaborador</h3>
            </div>
            <CardContent className="p-6">
                <div className="flex justify-center w-full max-w-2xl mx-auto border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 p-8 hover:bg-slate-50 transition-colors">
                    <div className="flex flex-col items-center gap-4 text-center">
                        <ImageUpload 
                            value={avatarUrl}
                            onChange={setAvatarUrl}
                            folder="funcionario"
                            placeholder="Foto"
                            className="w-32 h-32"
                        />
                        <div>
                            <p className="font-medium text-slate-800">Arraste e solte a foto aqui</p>
                            <p className="text-xs text-slate-500 mb-4">Ou clique para selecionar um arquivo (JPG, PNG)</p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>

        {/* Personal Info Section */}
        <Card className="border-slate-200 shadow-sm rounded-xl">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#c6182e]">person</span>
                <h3 className="font-semibold text-slate-800">Informações Pessoais</h3>
            </div>
            <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="name" className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Nome Completo</Label>
                        <Input id="name" value={name} onChange={e => setName(e.target.value)} required placeholder="Ex: João da Silva Santos" className="h-11 bg-white" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="cpf" className="text-xs font-semibold text-slate-600 uppercase tracking-wider">CPF</Label>
                        <Input id="cpf" value={cpf} onChange={e => setCpf(formatCPF(e.target.value))} required placeholder="000.000.000-00" maxLength={14} className="h-11 bg-white" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="birthDate" className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Data de Nascimento</Label>
                        <div className="relative">
                            <Input id="birthDate" type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} className="h-11 bg-white pr-10" />
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>

        {/* Professional Info Section */}
        <Card className="border-slate-200 shadow-sm rounded-xl">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#c6182e]">work</span>
                <h3 className="font-semibold text-slate-800">Informações Profissionais</h3>
            </div>
            <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Departamento</Label>
                        <Select value={departmentId} onValueChange={setDepartmentId}>
                            <SelectTrigger className="h-11 bg-white"><SelectValue placeholder="Logística" /></SelectTrigger>
                            <SelectContent>
                                {departments.filter(d => d.active !== false).map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="role" className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Cargo</Label>
                        <Input id="role" value={role} onChange={e => setRole(e.target.value)} placeholder="Ex: Analista de Frota" className="h-11 bg-white" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Gestor Direto</Label>
                        <Select value={directManagerId} onValueChange={setDirectManagerId}>
                            <SelectTrigger className="h-11 bg-white"><SelectValue placeholder="Selecione o gestor" /></SelectTrigger>
                            <SelectContent>
                                {managers.map(m => <SelectItem key={m.id} value={m.id}>{m.user.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Backend Requirements visually grouped */}
                    <div className="space-y-2">
                        <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Filial Opcional</Label>
                        <Select value={branchId} onValueChange={setBranchId}>
                            <SelectTrigger className="h-11 bg-white"><SelectValue placeholder="Matriz" /></SelectTrigger>
                            <SelectContent>
                                {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                         <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Perfil Sistema</Label>
                        <Select value={systemRoleId} onValueChange={setSystemRoleId}>
                            <SelectTrigger className="h-11 bg-white"><SelectValue placeholder="Padrão" /></SelectTrigger>
                            <SelectContent>
                                {roles.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardContent>
        </Card>

        {/* Contact Section */}
        <Card className="border-slate-200 shadow-sm rounded-xl">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#c6182e]">contact_mail</span>
                <h3 className="font-semibold text-slate-800">Contato</h3>
            </div>
            <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-xs font-semibold text-slate-600 uppercase tracking-wider">E-mail Corporativo</Label>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3 top-[10px] h-5 w-5 text-slate-400 text-[20px]">mail</span>
                            <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="nome@toclog.com.br" className="pl-10 h-11 bg-white" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="phone" className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Telefone/WhatsApp</Label>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3 top-[10px] h-5 w-5 text-slate-400 text-[20px]">phone_iphone</span>
                            <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(00) 00000-0000" className="pl-10 h-11 bg-white" />
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>

        {/* Footer Actions */}
        <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-slate-200 mt-8 mb-16">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-4 md:mb-0">
                Toclog Sistemas de Gestão Logística © 2024
            </p>
            <div className="flex items-center gap-4 w-full md:w-auto">
                <Button type="button" variant="ghost" className="text-slate-600 font-semibold" onClick={() => router.push('/dashboard/rh/employees')}>
                    Cancelar
                </Button>
                <Button type="submit" className="bg-[#c6182e] hover:bg-[#a51426] text-white font-semibold flex-1 md:flex-none">
                    {loading ? <span className="material-symbols-outlined animate-spin mr-2">sync</span> : <span className="material-symbols-outlined mr-2">save</span>}
                    Salvar Colaborador
                </Button>
            </div>
        </div>
      </form>
    </div>
  )
}
