'use client'
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useSettings } from "@/context/settings-context"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { ImageUpload } from "@/components/image-upload"

// --- CPF Utils ---
const formatCPF = (value: string) => {
    return value
        .replace(/\D/g, '')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1')
}

const validateCPF = (cpf: string) => {
    cpf = cpf.replace(/[^\d]+/g, '')
    if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false
    let sum = 0, remainder
    for (let i = 1; i <= 9; i++) sum = sum + parseInt(cpf.substring(i - 1, i)) * (11 - i)
    remainder = (sum * 10) % 11
    if (remainder === 10 || remainder === 11) remainder = 0
    if (remainder !== parseInt(cpf.substring(9, 10))) return false
    sum = 0
    for (let i = 1; i <= 10; i++) sum = sum + parseInt(cpf.substring(i - 1, i)) * (12 - i)
    remainder = (sum * 10) % 11
    if (remainder === 10 || remainder === 11) remainder = 0
    if (remainder !== parseInt(cpf.substring(10, 11))) return false
    return true
}

interface Department {
    id: string
    name: string
    active?: boolean
}

interface Branch {
    id: string
    name: string
}

interface Employee {
  id: string
  userId: string
  cpf: string | null
  status: string
  legacyRole: string | null
  role: {
      id: string
      name: string
  } | null
  admissionDate: string | null
  currentSalary: string | null
  avatarUrl: string | null
  user: {
      id: string
      name: string
      email: string
  }
  branch: {
      name: string
  }
  department: {
      id: string
      name: string
  } | null
  directManagerId: string | null
  directManager: {
      user: { name: string }
  } | null
}

export default function EmployeesPage() {
  const router = useRouter()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  // Data State
  const [departments, setDepartments] = useState<Department[]>([])
  const [managers, setManagers] = useState<Employee[]>([])
  const [availableRoles, setAvailableRoles] = useState<{id: string, name: string}[]>([])
  const [branches, setBranches] = useState<Branch[]>([])

  // Form State
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [cpf, setCpf] = useState("")
  const [role, setRole] = useState("")
  const [selectedRoleId, setSelectedRoleId] = useState("")
  const [status, setStatus] = useState("ACTIVE")
  const [admissionDate, setAdmissionDate] = useState("")
  const [currentSalary, setCurrentSalary] = useState("")
  const [departmentId, setDepartmentId] = useState("")
  const [directManagerId, setDirectManagerId] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [branchId, setBranchId] = useState("")

  // Movement State
  const [isMovementOpen, setIsMovementOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [movementType, setMovementType] = useState("SALARY")
  const [newValue, setNewValue] = useState("")
  const [reason, setReason] = useState("")
  const [movementLoading, setMovementLoading] = useState(false)

  // Current User State for Authorship
  const [currentUserProfile, setCurrentUserProfile] = useState<{ userId: string, role: string } | null>(null)


  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const { itemsPerPage } = useSettings()

  const fetchAuxData = async () => {
    try {
        const [deptRes, empRes, profileRes, roleRes, branchRes] = await Promise.all([
            api.get('/departments'),
            api.get('/employees'),
            api.get('/auth/profile'),
            api.get('/roles'),
            api.get('/branches')
        ])
        setDepartments(deptRes.data)
        setManagers(empRes.data) 
        setCurrentUserProfile(profileRes.data)
        setAvailableRoles(roleRes.data)
        setBranches(branchRes.data)
    } catch(e) { console.error(e) }
  }

  const fetchEmployees = async () => {
    try {
      setLoading(true)
      const { data } = await api.get('/employees')
      setEmployees(data)
      return data  
    } catch (error) {
      console.error(error)
      toast.error("Erro ao buscar funcionários.")
      return []
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEmployees()
    fetchAuxData()
  }, [])

  const resetForm = () => {
      setName(""); setEmail(""); setCpf("");    setRole("")
    setSelectedRoleId("")
    setStatus("ACTIVE"); 
      setAdmissionDate(""); setCurrentSalary(""); setDepartmentId(""); setDirectManagerId(""); setAvatarUrl(""); setBranchId("");
      setEditingId(null)
  }

  const handleEditClick = (emp: Employee) => {
      setEditingId(emp.id)
      setName(emp.user.name)
      setEmail(emp.user.email)
      setCpf(formatCPF(emp.cpf || ""))
      setRole(emp.legacyRole || emp.role?.name || "") // Job Title: Prefer legacy, fallback to role name
      setSelectedRoleId(emp.role?.id || "") // System Profile ID
      setStatus(emp.status)
      setAdmissionDate(emp.admissionDate ? emp.admissionDate.split('T')[0] : "")
      setCurrentSalary(emp.currentSalary?.toString() || "")
      setDepartmentId((emp.department as any)?.id || "") 
      setDirectManagerId(emp.directManagerId || "") 
      setAvatarUrl(emp.avatarUrl || "")
      setBranchId((emp.branch as any)?.id || "")
      setIsFormOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Frontend CPF Validation
    if (cpf && !validateCPF(cpf)) {
        toast.error("CPF inválido. Verifique o número digitado.")
        return
    }

    setFormLoading(true)
    try {
        const token = localStorage.getItem('token')
        const payload: any = {
            name,
            email,
            cpf: cpf.replace(/\D/g, ''), // Send clean CPF
            role: role, // Job Title
            roleId: selectedRoleId, // System Profile
            status,
            branchId, 
            departmentId: departmentId || undefined,
            directManagerId: directManagerId || undefined,
            admissionDate: admissionDate ? new Date(admissionDate).toISOString() : undefined,
            currentSalary: currentSalary ? parseFloat(currentSalary) : undefined,
            avatarUrl: avatarUrl || undefined
        }
        
        let url = `/employees`
        let method = 'post'
        
        if (editingId) {
            url = `/employees/${editingId}`
            method = 'patch'
        }
        
        // @ts-ignore
        await api[method](url, payload)
        
        
        setIsFormOpen(false)
        fetchEmployees()
        toast.success(editingId ? "Funcionário atualizado." : "Funcionário criado.")
        resetForm()
    } catch (error: any) {
        console.error(error)
        const msg = error.response?.data?.message
        if (Array.isArray(msg)) {
             toast.error(msg[0] || "Erro ao salvar funcionário.")
        } else {
             toast.error(msg || "Erro ao salvar funcionário.")
        }
    } finally {
        setFormLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
      if(!confirm("Tem certeza que deseja excluir este funcionário?")) return;
      try {
          await api.delete(`/employees/${id}`)
          
          toast.success("Funcionário excluído")
          fetchEmployees()
      } catch(e) { toast.error("Erro ao excluir") }
  }

  const handleCreateOpen = () => {
      router.push('/dashboard/rh/employees/new')
  }

  const handleMovement = async (e: React.FormEvent) => {
      e.preventDefault()
      if (!selectedEmployee) return

      // Find Author (Me)
      const author = employees.find(emp => emp.user?.id === currentUserProfile?.userId || emp.userId === currentUserProfile?.userId)
      
      if (!author) {
          toast.error("Seu usuário não possui um perfil de funcionário vinculado. Ação não permitida.")
          return
      }

      setMovementLoading(true)
      try {
         // Create proper payload from state
         const movementPayload = {
            type: movementType,
            employeeId: selectedEmployee.id,
            authorId: author.id,
            newValue,
            reason
         }
         await api.post('/movements', movementPayload)

        
        setIsMovementOpen(false)
        setNewValue("")
        setReason("")
        fetchEmployees()
        toast.success("Movimentação registrada com sucesso.")
      } catch (error: any) {
          console.error(error)
          toast.error(error.message || "Erro ao registrar movimentação.")
      } finally {
          setMovementLoading(false)
      }
  }

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatCPF(e.target.value)
      setCpf(formatted)
  }

    // Logic updated to check role instead of employee relationship
    const canManage = currentUserProfile?.role === 'ADMIN' || currentUserProfile?.role === 'MANAGER'
  
    const filtered = employees.filter(e => e.user?.name.toLowerCase().includes(searchTerm.toLowerCase()))
    
    // Pagination Logic
    const totalPages = Math.ceil(filtered.length / itemsPerPage)
    const paginatedEmployees = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
  
    return (
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Funcionários</h1>
          
          {canManage && (
            <Button className="gap-2" onClick={handleCreateOpen}>
                <span className="material-symbols-outlined text-[18px]">add</span> Novo Funcionário
            </Button>
          )}

            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto p-0 overflow-hidden flex flex-col">
                    <DialogHeader className="p-6 pb-2 border-b">
                        <DialogTitle className="text-xl font-semibold tracking-tight">{editingId ? "Editar Funcionário" : "Novo Funcionário"}</DialogTitle>
                        <DialogDescription>{editingId ? "Atualize as informações do cadastro." : "Preencha os dados para criar um novo acesso."}</DialogDescription>
                    </DialogHeader>
                    
                    <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-8">
                        {/* Header Section: Avatar & Basic Identity */}
                        <div className="flex flex-col sm:flex-row gap-8 items-start">
                            <div className="flex flex-col items-center gap-3">
                                <ImageUpload 
                                    value={avatarUrl}
                                    onChange={setAvatarUrl}
                                    folder="funcionario"
                                    placeholder="Foto"
                                    className="w-full sm:w-auto"
                                />
                            </div>

                             <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Nome Completo</Label>
                                    <Input id="name" value={name} onChange={e => setName(e.target.value)} required disabled={!!editingId} className="focus:ring-primary/20" placeholder="Ex: João Silva" />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="email">Email Corporativo</Label>
                                    <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required disabled={!!editingId} className="focus:ring-primary/20" placeholder="joao@toclog.com.br" />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="cpf">CPF</Label>
                                    <Input id="cpf" value={cpf} onChange={handleCpfChange} placeholder="000.000.000-00" maxLength={14} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="status">Status do Contrato</Label>
                                    <Select value={status} onValueChange={setStatus}>
                                        <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ACTIVE">
                                                <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500"/> Ativo</div>
                                            </SelectItem>
                                            <SelectItem value="INACTIVE">
                                                <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-red-500"/> Inativo</div>
                                            </SelectItem>
                                            <SelectItem value="AWAY">
                                                <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-amber-500"/> Afastado</div>
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                             </div>
                        </div>

                        <Separator className="bg-border" />

                        {/* Professional Info */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Dados Profissionais</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="systemRole">Perfil de Acesso (Sistema)</Label>
                                    <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                                        <SelectTrigger id="systemRole"><SelectValue placeholder="Selecione o perfil..." /></SelectTrigger>
                                        <SelectContent>
                                            {availableRoles.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                     <Label htmlFor="branch">Filial</Label>
                                     <Select value={branchId} onValueChange={setBranchId}>
                                         <SelectTrigger id="branch"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                         <SelectContent>
                                             {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                                         </SelectContent>
                                     </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="role">Cargo / Função (RH)</Label>
                                    <Input id="role" value={role} onChange={e => setRole(e.target.value)} placeholder="Ex: Motorista Sênior" />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="dept">Departamento</Label>
                                    <Select value={departmentId} onValueChange={setDepartmentId}>
                                        <SelectTrigger id="dept"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                        <SelectContent>
                                            {departments.filter(d => d.active !== false).map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="salary">Salário Atual (R$)</Label>
                                    <Input id="salary" type="number" step="0.01" value={currentSalary} onChange={e => setCurrentSalary(e.target.value)} placeholder="0.00" />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="admission">Data de Admissão</Label>
                                    <Input id="admission" type="date" value={admissionDate} onChange={e => setAdmissionDate(e.target.value)} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="manager">Gestor Responsável</Label>
                                    <Select value={directManagerId} onValueChange={setDirectManagerId}>
                                        <SelectTrigger id="manager"><SelectValue placeholder="Selecione (Opcional)" /></SelectTrigger>
                                        <SelectContent>
                                            {managers.map(m => {
                                                const mRole = m.role?.name || m.legacyRole || '';
                                                return <SelectItem key={m.id} value={m.id}>{m.user.name}</SelectItem>
                                            })}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                    </form>

                    <DialogFooter className="p-6 pt-2 border-t">
                        <Button variant="ghost" onClick={() => setIsFormOpen(false)} className="mr-2">Cancelar</Button>
                        <Button onClick={handleSubmit} disabled={formLoading} className="bg-primary text-primary-foreground hover:bg-primary/90">
                            {formLoading ? <span className="material-symbols-outlined animate-spin mr-2">sync</span> : "Salvar Alterações"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>

      <Card>
        <CardHeader className="pb-3">
             <div className="flex justify-between items-center">
                <CardTitle>Listagem</CardTitle>
                <div className="relative">
                    <span className="material-symbols-outlined absolute left-2.5 top-2.5 text-muted-foreground text-[18px]">search</span>
                    <Input placeholder="Buscar..." className="pl-8 w-[200px]" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
            </div>
        </CardHeader>
        <CardContent>
            {loading ? <div className="flex justify-center p-8"><span className="material-symbols-outlined animate-spin text-[32px]">sync</span></div> : (
                <>
                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto">
                    <Table className="min-w-[800px]">
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]"></TableHead>
                                <TableHead>Nome</TableHead>
                                <TableHead className="hidden md:table-cell">Email</TableHead>
                                <TableHead>Cargo/Função</TableHead>
                                <TableHead className="hidden md:table-cell">Filial</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                    <TableBody>
                        {paginatedEmployees.map(emp => (
                            <TableRow key={emp.id}>
                                <TableCell>
                                    <Avatar>
                                        <AvatarImage src={emp.avatarUrl || undefined} />
                                        <AvatarFallback>{emp.user?.name.substring(0,2).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                </TableCell>
                                <TableCell className="font-medium">
                                    {emp.user?.name}
                                    <p className="text-xs text-muted-foreground">{emp.cpf ? formatCPF(emp.cpf) : 'Sem CPF'}</p>
                                </TableCell>
                                <TableCell className="hidden md:table-cell">{emp.user?.email || "Sem email"}</TableCell>
                                <TableCell>{emp.role?.name || emp.legacyRole || "N/A"}</TableCell>
                                <TableCell className="hidden md:table-cell">
                                    <div className="flex flex-col">
                                        <span>{emp.branch?.name}</span>
                                        <span className="text-xs text-muted-foreground">{emp.department?.name || "Sem setor"}</span>
                                    </div>
                                </TableCell>
                                <TableCell>{emp.status}</TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <Button variant="ghost" size="icon" onClick={() => router.push(`/dashboard/rh/employees/${emp.id}`)}>
                                            <span className="material-symbols-outlined text-green-600 text-[18px]">visibility</span>
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => {
                                            setSelectedEmployee(emp)
                                            setIsMovementOpen(true)
                                            setMovementType("SALARY") // Default
                                            setNewValue("")
                                            setReason("")
                                        }}>
                                            <span className="material-symbols-outlined text-[18px]">swap_horiz</span>
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleEditClick(emp)}>
                                            <span className="material-symbols-outlined text-blue-600 text-[18px]">edit</span>
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(emp.id)}>
                                            <span className="material-symbols-outlined text-red-600 text-[18px]">delete</span>
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Mobile View */}
            <div className="md:hidden space-y-4">
                {paginatedEmployees.map(emp => (
                    <Card key={emp.id} className="bg-muted/40">
                        <CardContent className="p-4 space-y-4">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <Avatar>
                                        <AvatarImage src={emp.avatarUrl || ""} />
                                        <AvatarFallback>{emp.user.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <h3 className="font-medium">{emp.user.name}</h3>
                                        <p className="text-sm text-muted-foreground">{emp.role?.name || emp.legacyRole || "Sem cargo"}</p>
                                    </div>
                                </div>
                                <div className={`text-xs px-2 py-1 rounded-full ${
                                    emp.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500' : 
                                    emp.status === 'INACTIVE' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'
                                }`}>
                                    {emp.status}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                    <span className="text-xs text-muted-foreground block">Email</span>
                                    {emp.user?.email}
                                </div>
                                <div>
                                    <span className="text-xs text-muted-foreground block">Departamento</span>
                                    {emp.department?.name || "-"}
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push(`/dashboard/rh/employees/${emp.id}`)}>
                                    <span className="material-symbols-outlined text-green-600 text-[16px]">visibility</span>
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                                    setSelectedEmployee(emp)
                                    setIsMovementOpen(true)
                                    setMovementType("SALARY")
                                    setNewValue("")
                                    setReason("")
                                }}>
                                    <span className="material-symbols-outlined text-[16px]">swap_horiz</span>
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditClick(emp)}>
                                    <span className="material-symbols-outlined text-blue-600 text-[16px]">edit</span>
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(emp.id)}>
                                    <span className="material-symbols-outlined text-red-600 text-[16px]">delete</span>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
            
            {/* Pagination Controls */}
            <div className="flex items-center justify-end space-x-2 py-4">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                    Anterior
                </Button>
                <div className="text-sm text-muted-foreground">
                    Página {currentPage} de {totalPages}
                </div>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                    Próxima
                </Button>
            </div>
            </>
            )}
        </CardContent>
      </Card>
      
      {/* Movement Dialog */}
      <Dialog open={isMovementOpen} onOpenChange={setIsMovementOpen}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>Registrar Movimentação</DialogTitle>
                  <DialogDescription>
                      Funcionário: <span className="font-bold">{selectedEmployee?.user.name}</span>
                  </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleMovement} className="space-y-4">
                  <div className="space-y-2">
                      <Label>Tipo de Movimentação</Label>
                      <Select value={movementType} onValueChange={setMovementType}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                              <SelectItem value="SALARY">Movimentação Salarial</SelectItem>
                              <SelectItem value="DEPARTMENT">Troca de Departamento</SelectItem>
                              <SelectItem value="ROLE">Mudança de Cargo</SelectItem>
                              <SelectItem value="MANAGER">Troca de Gestor</SelectItem>
                              <SelectItem value="STATUS">Mudança de Status (Afast/Deslig)</SelectItem>
                          </SelectContent>
                      </Select>
                  </div>

                  <div className="space-y-2">
                       <Label>
                           {movementType === 'SALARY' ? 'Novo Salário (R$)' : 
                            movementType === 'DEPARTMENT' ? 'Novo Departamento ID' :
                            movementType === 'MANAGER' ? 'Novo Gestor ID' : 'Novo Valor'}
                       </Label>
                       
                       {movementType === 'DEPARTMENT' ? (
                            <Select value={newValue} onValueChange={setNewValue}>
                                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                <SelectContent>
                                    {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                       ) : movementType === 'MANAGER' ? (
                            <Select value={newValue} onValueChange={setNewValue}>
                                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                <SelectContent>
                                    {managers.map(m => <SelectItem key={m.id} value={m.id}>{m.user.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                       ) : movementType === 'STATUS' ? (
                             <Select value={newValue} onValueChange={setNewValue}>
                                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ACTIVE">Ativo</SelectItem>
                                    <SelectItem value="INACTIVE">Inativo</SelectItem>
                                    <SelectItem value="AWAY">Afastado</SelectItem>
                                </SelectContent>
                            </Select>
                       ) : (
                           <Input value={newValue} onChange={e => setNewValue(e.target.value)} type={movementType === 'SALARY' ? 'number' : 'text'} step={movementType === 'SALARY' ? '0.01' : undefined} required />
                       )}
                  </div>

                  <div className="space-y-2">
                      <Label>Justificativa / Observação</Label>
                      <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Motivo da alteração..." required />
                  </div>

                  <DialogFooter>
                      <Button type="submit" disabled={movementLoading}>
                          {movementLoading ? <span className="material-symbols-outlined animate-spin mr-2">sync</span> : "Confirmar Movimentação"}
                      </Button>
                  </DialogFooter>
              </form>
          </DialogContent>
      </Dialog>
    </div>
  )
}
