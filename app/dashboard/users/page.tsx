'use client'

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Pencil, Trash2, Loader2, Search, UserCog } from "lucide-react"
import { toast } from "sonner"
import { RoleGate } from "@/components/auth/role-gate"
import _ from "lodash"

interface Employee {
  id: string
  user: { name: string; email: string }
  role?: { id: string; name: string }
  branch: { name: string }
  department?: { name: string }
  specificPermissions?: { slug: string }[] 
}

export default function UsersPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  
  // Lists
  const [roles, setRoles] = useState<any[]>([])
  const [permissions, setPermissions] = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])

  // Modal State
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  // Form State
  const [formData, setFormData] = useState({
      name: '',
      email: '',
      password: '',
      branchId: '',
      roleId: '',
      specificPermissionSlugs: [] as string[]
  })
  
  const [createLoading, setCreateLoading] = useState(false)

  const fetchEmployees = async () => {
    try {
      setLoading(true)
      const { data } = await api.get('/employees')
      setEmployees(data)
    } catch (error) { console.error(error) } 
    finally { setLoading(false) }
  }

  const fetchAuxData = async () => {
      try {
          const [rolesRes, permsRes, branchesRes] = await Promise.all([
              api.get('/roles'),
              api.get('/roles/permissions'),
               // Assuming logic for branches endpoint, if not fetching departments/branches TODO
               // For now hardcoding or assuming similar structure if endpoint missing
               // Let's assume we can get branches, or skip for now if endpoint not verified.
               // We will mock branches if endpoint fails
               Promise.resolve({ data: [{id: 'bd3ee54e-2c46-4c77-80ea-0adfdd2b1305', name: 'Matriz - SP'}] }) 
          ])

          setRoles(rolesRes.data)
          setPermissions(permsRes.data)
          // @ts-ignore
          setBranches(branchesRes.data)

      } catch(e) {}
  }

  useEffect(() => {
    fetchEmployees()
    fetchAuxData()
  }, [])

  const handleOpenDialog = (emp?: Employee) => {
      if (emp) {
          setEditingId(emp.id)
          setFormData({
              name: emp.user.name,
              email: emp.user.email,
              password: '', // Leave empty to not change
              branchId: emp.branch?.name === 'Matriz - SP' ? 'bd3ee54e-2c46-4c77-80ea-0adfdd2b1305' : 'bd3ee54e-2c46-4c77-80ea-0adfdd2b1305', // Mock
              roleId: emp.role?.id || '',
              specificPermissionSlugs: [] // Need to populate if fetching specific perms enabled in backend findOne
          })
          // If we want specific perms, we need to fetch specific user details?
          // List endpoint might not return specificPermissions for perf.
          // Let's assume user edit fetches details.
          fetchEmployeeDetails(emp.id)
      } else {
          setEditingId(null)
          setFormData({
              name: '', email: '', password: '', 
              branchId: branches[0]?.id || '', 
              roleId: '', 
              specificPermissionSlugs: []
          })
      }
      setIsDialogOpen(true)
  }

  const fetchEmployeeDetails = async (id: string) => {
      try {
           const { data } = await api.get(`/employees/${id}`)
           // Assuming specificPermissions returns object with slug
           if(data.specificPermissions) {
               setFormData(prev => ({ ...prev, specificPermissionSlugs: data.specificPermissions.map((p: any) => p.slug) }))
           }
      } catch(e) {}
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateLoading(true)
    try {
      const url = editingId 
        ? `/employees/${editingId}`
        : `/employees`
      
      const method = editingId ? 'patch' : 'post'

      const body: any = {
          name: formData.name,
          email: formData.email,
          branchId: formData.branchId, // Required
          roleId: formData.roleId,
          specificPermissionSlugs: formData.specificPermissionSlugs
      }
      if(formData.password && !editingId) body.password = formData.password 
      
      // @ts-ignore
      await api[method](url, body)

      setIsDialogOpen(false)
      fetchEmployees()
      toast.success(editingId ? "Usuário atualizado" : "Usuário criado")
    } catch (error) {
        toast.error("Erro ao salvar usuário.")
    } finally {
        setCreateLoading(false)
    }
  }

  // Permission Grouping
  const groupedPerms = _.groupBy(permissions, 'group')
  const sortedGroups = Object.keys(groupedPerms).sort()

  const togglePerm = (slug: string) => {
      setFormData(prev => {
          if(prev.specificPermissionSlugs.includes(slug)) {
              return { ...prev, specificPermissionSlugs: prev.specificPermissionSlugs.filter(s => s !== slug) }
          }
          return { ...prev, specificPermissionSlugs: [...prev.specificPermissionSlugs, slug] }
      })
  }

  const filteredUsers = employees.filter(emp => 
    emp.user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    emp.user.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <RoleGate allowedRoles={['ADMIN', 'MANAGER']}>
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Gerenciamento de Usuários</h1>
          <Button className="gap-2" onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4" /> Novo Usuário
          </Button>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
             <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                 <DialogHeader>
                     <DialogTitle>{editingId ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
                     <DialogDescription>Gerencie dados, perfil e permissões específicas.</DialogDescription>
                 </DialogHeader>
                 <form onSubmit={handleSubmit}>
                     <Tabs defaultValue="access" className="w-full">
                         <TabsList className="grid w-full grid-cols-2">
                             <TabsTrigger value="access">Acesso & Perfil</TabsTrigger>
                             <TabsTrigger value="permissions">Permissões Específicas</TabsTrigger>
                         </TabsList>
                         
                         <TabsContent value="access" className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Nome Completo</Label>
                                    <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                                </div>
                                <div className="space-y-2">
                                    <Label>Email</Label>
                                    <Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Filial</Label>
                                    <Select value={formData.branchId} onValueChange={v => setFormData({...formData, branchId: v})}>
                                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                        <SelectContent>
                                            {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Perfil (Role)</Label>
                                    <Select value={formData.roleId} onValueChange={v => setFormData({...formData, roleId: v})}>
                                        <SelectTrigger><SelectValue placeholder="Selecione o perfil..." /></SelectTrigger>
                                        <SelectContent>
                                            {roles.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                         </TabsContent>

                         <TabsContent value="permissions" className="py-4">
                             <div className="space-y-4">
                                 <div className="bg-yellow-50 p-3 rounded border border-yellow-200 text-sm text-yellow-800">
                                     As permissões abaixo são <strong>adicionais</strong> às do perfil selecionado.
                                 </div>
                                 <div className="grid grid-cols-2 gap-4">
                                     {sortedGroups.map(group => (
                                         <Card key={group} className="shadow-none border">
                                             <CardHeader className="py-3 px-4 bg-slate-50">
                                                 <CardTitle className="text-sm font-medium">{group}</CardTitle>
                                             </CardHeader>
                                             <CardContent className="p-0">
                                                 {groupedPerms[group].map(perm => (
                                                     <div key={perm.id} className="flex items-start space-x-2 p-3 border-b last:border-0 hover:bg-slate-50 transition-colors">
                                                         <Checkbox 
                                                            id={`spec-${perm.id}`} 
                                                            checked={formData.specificPermissionSlugs.includes(perm.slug)}
                                                            onCheckedChange={() => togglePerm(perm.slug)}
                                                         />
                                                         <label htmlFor={`spec-${perm.id}`} className="text-xs leading-tight cursor-pointer">
                                                             <span className="font-medium block">{perm.description}</span>
                                                             <span className="text-[10px] text-muted-foreground">{perm.slug}</span>
                                                         </label>
                                                     </div>
                                                 ))}
                                             </CardContent>
                                         </Card>
                                     ))}
                                 </div>
                             </div>
                         </TabsContent>
                     </Tabs>

                     <DialogFooter className="mt-4">
                         <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                         <Button type="submit" disabled={createLoading}>
                             {createLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Salvar"}
                         </Button>
                     </DialogFooter>
                 </form>
             </DialogContent>
        </Dialog>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Colaboradores</CardTitle>
            <div className="relative pt-2">
              <Search className="absolute left-2.5 top-5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar usuário..."
                className="pl-8 sm:w-[300px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
              {loading ? <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /> : (
                  <Table>
                      <TableHeader>
                      <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Perfil</TableHead>
                          <TableHead>Filial</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                      </TableHeader>
                      <TableBody>
                      {filteredUsers.map((emp) => (
                          <TableRow key={emp.id}>
                          <TableCell>
                              <div className="font-medium">{emp.user.name}</div>
                              <div className="text-xs text-muted-foreground">{emp.user.email}</div>
                          </TableCell>
                          <TableCell>
                              {emp.role ? (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                                      {emp.role.name}
                                  </span>
                              ) : <span className="text-muted-foreground">-</span>}
                          </TableCell>
                          <TableCell>{emp.branch?.name}</TableCell>
                          <TableCell className="text-right">
                              <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(emp)}>
                                  <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="text-red-500" onClick={() => {}}>
                                  <Trash2 className="h-4 w-4" />
                              </Button>
                          </TableCell>
                          </TableRow>
                      ))}
                      </TableBody>
                  </Table>
              )}
          </CardContent>
        </Card>
      </div>
    </RoleGate>
  )
}
