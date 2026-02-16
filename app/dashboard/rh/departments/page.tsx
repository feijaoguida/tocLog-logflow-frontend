'use client'

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Pencil, Trash2, Loader2, Search } from "lucide-react"
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { api } from "@/lib/api"
import { Badge } from "@/components/ui/badge"

interface Employee {
    id: string
    user: { name: string }
}

interface Branch {
    id: string
    name: string
}

interface Department {
  id: string
  name: string
  description: string | null
  active: boolean
  manager: {
      id: string
      user: {
          name: string
      }
  } | null
  branch: {
      id: string
      name: string
  }
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  
  // Create/Edit State
  const [isOpen, setIsOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [managerId, setManagerId] = useState("")
  const [branchId, setBranchId] = useState("")
  const [isActive, setIsActive] = useState(true)

  const [employees, setEmployees] = useState<Employee[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [submitLoading, setSubmitLoading] = useState(false)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  const fetchData = async () => {
      try {
          const [empRes, deptRes, branchRes] = await Promise.all([
              api.get('/employees'),
              api.get('/departments'),
              api.get('/branches')
          ])
          setEmployees(empRes.data)
          setDepartments(deptRes.data)
          setBranches(branchRes.data)
      } catch (e) {
          console.error(e)
          toast.error("Erro ao carregar dados.")
      } finally {
          setLoading(false)
      }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const resetForm = () => {
      setName("")
      setDescription("")
      setManagerId("")
      setBranchId("")
      setIsActive(true)
      setEditingId(null)
  }

  const handleOpenChange = (open: boolean) => {
      setIsOpen(open)
      if (!open) resetForm()
  }

  const handleEdit = (dept: Department) => {
      setEditingId(dept.id)
      setName(dept.name)
      setDescription(dept.description || "")
      setManagerId(dept.manager?.id || "")
      setBranchId(dept.branch?.id || "")
      setIsActive(dept.active)
      setIsOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!managerId) {
        toast.error("Gestor é obrigatório.")
        return
    }
    if (!branchId) {
        toast.error("Filial é obrigatória.")
        return
    }

    setSubmitLoading(true)
    try {
      const payload = {
          name,
          description,
          branchId,
          managerId,
          active: isActive
      }

      if (editingId) {
          await api.patch(`/departments/${editingId}`, payload)
          toast.success("Departamento atualizado.")
      } else {
          await api.post('/departments', payload)
          toast.success("Departamento criado.")
      }

      setIsOpen(false)
      resetForm()
      fetchData() // Refresh list
    } catch (error) {
        console.error(error)
        toast.error("Erro ao salvar departamento.")
    } finally {
        setSubmitLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
      if(!confirm("Tem certeza que deseja excluir?")) return;
      try {
        await api.delete(`/departments/${id}`)
        // Update local state faster than re-fetching
        setDepartments(prev => prev.filter(d => d.id !== id))
        toast.success("Departamento excluído.")
      } catch (error) {
          console.error(error)
          toast.error("Erro ao excluir. Verifique se existem vínculos.")
      }
  }

  // Filtering & Pagination
  const filtered = departments.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()))
  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Departamentos</h1>
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Novo Departamento</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Departamento" : "Criar Departamento"}</DialogTitle>
              <DialogDescription>Preencha os dados do departamento.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="branch" className="text-right">Filial *</Label>
                    <div className="col-span-3">
                         <Select value={branchId} onValueChange={setBranchId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione a filial" />
                            </SelectTrigger>
                            <SelectContent>
                                {branches.map(b => (
                                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">Nome *</Label>
                    <Input id="name" value={name} onChange={e => setName(e.target.value)} className="col-span-3" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="desc" className="text-right">Descrição</Label>
                    <Input id="desc" value={description} onChange={e => setDescription(e.target.value)} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="manager" className="text-right">Gestor *</Label>
                    <div className="col-span-3">
                         <Select value={managerId} onValueChange={setManagerId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione um gestor" />
                            </SelectTrigger>
                            <SelectContent>
                                {employees.map(emp => (
                                    <SelectItem key={emp.id} value={emp.id}>{emp.user.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                {editingId && (
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="active" className="text-right">Status</Label>
                        <div className="flex items-center space-x-2 col-span-3">
                            <Switch id="active" checked={isActive} onCheckedChange={setIsActive} />
                            <Label htmlFor="active">{isActive ? "Ativo" : "Inativo"}</Label>
                        </div>
                    </div>
                )}
                <DialogFooter>
                    <Button type="submit" disabled={submitLoading}>
                        {submitLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Salvar"}
                    </Button>
                </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
                <CardTitle>Listagem</CardTitle>
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Buscar..." className="pl-8 w-[200px]" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
            </div>
        </CardHeader>
        <CardContent>
            {loading ? <Loader2 className="mx-auto h-8 w-8 animate-spin" /> : (
                <>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Filial</TableHead>
                            <TableHead>Gestor</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginated.map(dept => (
                            <TableRow key={dept.id}>
                                <TableCell className="font-medium">
                                    {dept.name}
                                    {dept.description && <p className="text-xs text-muted-foreground">{dept.description}</p>}
                                </TableCell>
                                <TableCell>{dept.branch?.name || '-'}</TableCell>
                                <TableCell>{dept.manager?.user?.name || '-'}</TableCell>
                                <TableCell>
                                    <Badge variant={dept.active ? "default" : "secondary"}>
                                        {dept.active ? "Ativo" : "Inativo"}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(dept)}><Pencil className="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDelete(dept.id)}><Trash2 className="h-4 w-4" /></Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

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
    </div>
  )
}
