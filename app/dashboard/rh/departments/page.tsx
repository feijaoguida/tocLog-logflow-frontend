'use client'

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Pencil, Trash2, Loader2, Search } from "lucide-react"
import { toast } from "sonner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { api } from "@/lib/api"

interface Employee {
    id: string
    user: { name: string }
}

interface Department {
  id: string
  name: string
  description: string | null
  manager: {
      id: string
      user: {
          name: string
      }
  } | null
  branch: {
      name: string
  }
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  
  // Create State
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [managerId, setManagerId] = useState("")
  const [employees, setEmployees] = useState<Employee[]>([])
  const [createLoading, setCreateLoading] = useState(false)

  const fetchEmployees = async () => {
      try {
          const { data } = await api.get('/employees')
          setEmployees(data)
      } catch (e) {
          console.error(e)
      }
  }

  const fetchDepartments = async () => {
    try {
      setLoading(true)
      const { data } = await api.get('/departments')
      setDepartments(data)
    } catch (error) {
      console.error(error)
      toast.error("Erro ao carregar departamentos.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDepartments()
    fetchEmployees()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!managerId) {
        toast.error("O Departamento precisa ter um Gestor.")
        return
    }

    setCreateLoading(true)
    try {
      const payload = {
          name,
          description,
          branchId: "11ed1668-b776-44f8-bab1-8be17a99b0f2", // Hardcoded 'Matriz'
          managerId
      }

      await api.post('/departments', payload)

      setIsCreateOpen(false)
      setName("")
      setDescription("")
      setManagerId("")
      fetchDepartments()
      toast.success("Departamento criado com sucesso.")
    } catch (error) {
        console.error(error)
        toast.error("Erro ao criar departamento.")
    } finally {
        setCreateLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
      if(!confirm("Tem certeza?")) return;
      try {
        await api.delete(`/departments/${id}`)
        fetchDepartments()
        toast.success("Departamento excluído.")
      } catch (error) {
          console.error(error)
          toast.error("Erro ao excluir departamento.")
      }
  }

  const filtered = departments.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Departamentos</h1>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Novo Departamento</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Departamento</DialogTitle>
              <DialogDescription>Preencha os dados do novo departamento.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">Nome</Label>
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
                <DialogFooter>
                    <Button type="submit" disabled={createLoading}>
                        {createLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Salvar"}
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
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Filial</TableHead>
                            <TableHead>Gestor</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.map(dept => (
                            <TableRow key={dept.id}>
                                <TableCell className="font-medium">
                                    {dept.name}
                                    {dept.description && <p className="text-xs text-muted-foreground">{dept.description}</p>}
                                </TableCell>
                                <TableCell>{dept.branch?.name || '-'}</TableCell>
                                <TableCell>{dept.manager?.user?.name || '-'}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDelete(dept.id)}><Trash2 className="h-4 w-4" /></Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </CardContent>
      </Card>
    </div>
  )
}
