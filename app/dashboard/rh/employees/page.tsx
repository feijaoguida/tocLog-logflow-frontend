"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useSettings } from "@/context/settings-context"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { formatCPF } from "@/components/employee-form"

// Interfaces
interface Employee {
  id: string
  cpf: string
  legacyRole: string | null
  status: string
  branchId: string | null
  departmentId: string | null
  directManagerId: string | null
  avatarUrl: string | null
  admissionDate: string | null
  currentSalary: number | null
  user: {
      id: string
      name: string
      email: string
  }
  role?: {
      id: string
      name: string
  } | null
  department?: {
      name: string
  } | null
  branch?: {
      name: string
  } | null
}

export default function EmployeesPage() {
  const router = useRouter()
  const [employees, setEmployees] = useState<Employee[]>([])
  
  // Roles and Permissions base
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null)

  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const { itemsPerPage } = useSettings()

  const loadData = async () => {
      try {
          setIsLoading(true)
          const [empRes, profileRes] = await Promise.all([
              api.get('/employees'),
              api.get('/auth/profile')
          ])
          
          setEmployees(empRes.data)
          setCurrentUserProfile(profileRes.data)
      } catch (error) {
          console.error("Erro ao carregar dados:", error)
          toast.error("Erro ao carregar funcionários.")
      } finally {
          setIsLoading(false)
      }
  }

  useEffect(() => {
      loadData()
  }, [])

  const handleEditClick = (emp: Employee) => {
      router.push(`/dashboard/rh/employees/${emp.id}/edit`)
  }

  const handleViewClick = (emp: Employee) => {
      router.push(`/dashboard/rh/employees/${emp.id}`)
  }

  const handleDelete = async (id: string) => {
      if (!confirm("Deseja realmente excluir este funcionário?")) return
      try {
          await api.delete(`/employees/${id}`)
          toast.success("Funcionário excluído")
          loadData() // Refresh data after deletion
      } catch(e) { toast.error("Erro ao excluir") }
  }

  // Logic updated to check role instead of employee relationship
  const canManage = currentUserProfile?.role === 'ADMIN' || currentUserProfile?.role === 'MANAGER'
  
  const filtered = employees.filter(e => 
      e.user?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.cpf?.includes(searchQuery.replace(/\D/g, '')) ||
      e.legacyRole?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.role?.name.toLowerCase().includes(searchQuery.toLowerCase())
  )
    
  // Pagination Logic
  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  const paginatedEmployees = filtered.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
  )

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Funcionários</h1>
          
          {canManage && (
            <Button className="gap-2" onClick={() => router.push('/dashboard/rh/employees/new')}>
                <span className="material-symbols-outlined text-[18px]">add</span> Novo Funcionário
            </Button>
          )}
      </div>

      <Card>
        <CardHeader className="pb-3">
             <div className="flex justify-between items-center">
                <CardTitle>Listagem</CardTitle>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-[10px] h-5 w-5 text-slate-400 text-[20px]">search</span>
                      <Input 
                          placeholder="Buscar por nome, email, CPF ou cargo..." 
                          className="pl-10 w-full sm:w-[350px] bg-white h-11 border-slate-200"
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                      />
                  </div>
              </div>
            </div>
        </CardHeader>
        <CardContent>
            {isLoading ? <div className="flex justify-center p-8"><span className="material-symbols-outlined animate-spin text-[32px]">sync</span></div> : (
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
                                <TableHead className="hidden md:table-cell">Setor</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                    <TableBody>
                        {paginatedEmployees.length === 0 ? (
                           <TableRow>
                             <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                 {searchQuery ? "Nenhum resultado encontrado." : "Nenhum funcionário cadastrado."}
                             </TableCell>
                           </TableRow>
                        ) : paginatedEmployees.map(emp => (
                            <TableRow key={emp.id} className="group">
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
                                        <span>{emp.department?.name || "-"}</span>
                                        <span className="text-xs text-muted-foreground">{emp.branch?.name || "-"}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                     <Badge variant={emp.status === 'ACTIVE' ? 'default' : emp.status === 'AWAY' || emp.status === 'SUSPENDED' ? 'secondary' : 'destructive'} 
                                             className={emp.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 
                                                        emp.status === 'AWAY' ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : ''}>
                                          {emp.status === 'ACTIVE' ? 'Ativo' : 
                                           emp.status === 'INACTIVE' ? 'Inativo' : 
                                           emp.status === 'VACATION' ? 'Férias' : 
                                           emp.status === 'SUSPENDED' ? 'Suspenso' : 'Afastado'}
                                      </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    {canManage && (
                                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-green-600 hover:bg-green-50" onClick={() => handleViewClick(emp)}>
                                                  <span className="material-symbols-outlined text-[18px]">visibility</span>
                                              </Button>
                                              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50" onClick={() => handleEditClick(emp)}>
                                                  <span className="material-symbols-outlined text-[18px]">edit</span>
                                              </Button>
                                              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(emp.id)}>
                                                  <span className="material-symbols-outlined text-[18px]">delete</span>
                                              </Button>
                                          </div>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Mobile View */}
            <div className="md:hidden space-y-4">
                {paginatedEmployees.length === 0 ? (
                      <div className="text-center py-8 border rounded-lg bg-slate-50 text-slate-500 text-sm">
                          {searchQuery ? "Nenhum resultado encontrado." : "Nenhum funcionário cadastrado."}
                      </div>
                ) : paginatedEmployees.map(emp => (
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
                                 <Badge variant={emp.status === 'ACTIVE' ? 'default' : emp.status === 'AWAY' || emp.status === 'SUSPENDED' ? 'secondary' : 'destructive'} 
                                     className={emp.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 
                                                emp.status === 'AWAY' ? 'bg-amber-100 text-amber-700' : ''}>
                                  {emp.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                              </Badge>
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

                            {canManage && (
                              <div className="flex gap-2 pt-4 border-t border-slate-200">
                                   <Button variant="outline" size="sm" className="flex-1 bg-white hover:text-green-700 hover:bg-green-50" onClick={() => handleViewClick(emp)}>
                                      <span className="material-symbols-outlined text-[16px] mr-2">visibility</span> Ver
                                  </Button>
                                   <Button variant="outline" size="sm" className="flex-1 bg-white hover:text-blue-700 hover:bg-blue-50" onClick={() => handleEditClick(emp)}>
                                      <span className="material-symbols-outlined text-[16px] mr-2">edit</span> Editar
                                  </Button>
                                  <Button variant="outline" size="sm" className="bg-white text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => handleDelete(emp.id)}>
                                      <span className="material-symbols-outlined text-[16px]">delete</span>
                                  </Button>
                              </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
               <div className="flex items-center justify-between pt-6 mt-6 border-t border-slate-100">
                   <p className="text-sm text-slate-500">
                       Página {currentPage} de {totalPages}
                   </p>
                   <div className="flex gap-2">
                       <Button 
                           variant="outline" 
                           size="sm" 
                           onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                           disabled={currentPage === 1}
                           className="bg-white"
                       >
                           <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                       </Button>
                       <Button 
                           variant="outline" 
                           size="sm" 
                           onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                           disabled={currentPage === totalPages}
                           className="bg-white"
                       >
                           <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                       </Button>
                   </div>
               </div>
           )}
            </>
            )}
        </CardContent>
    </Card>
    </div>
  )
}
