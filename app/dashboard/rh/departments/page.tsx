'use client'

import { useEffect, useState } from "react"
import { startTransition } from "react"
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
import { getApiErrorMessage } from "@/lib/api-error"
import { Badge } from "@/components/ui/badge"
import { useSettings } from "@/context/settings-context"

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
  headManager: {
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
  const [headManagerId, setHeadManagerId] = useState("")
  const [branchId, setBranchId] = useState("")
  const [isActive, setIsActive] = useState(true)

  const [employees, setEmployees] = useState<Employee[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [submitLoading, setSubmitLoading] = useState(false)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const { itemsPerPage } = useSettings()

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
      setHeadManagerId("")
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
      setHeadManagerId(dept.headManager?.id || "")
      setBranchId(dept.branch?.id || "")
      setIsActive(dept.active)
      setIsOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!headManagerId) {
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
          headManagerId,
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
      await fetchData()
    } catch (error) {
        console.error(error)
        toast.error(getApiErrorMessage(error, "Erro ao salvar departamento."))
    } finally {
        setSubmitLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
      if(!confirm("Tem certeza que deseja inativar este departamento?")) return;
      try {
        await api.delete(`/departments/${id}`)
        await fetchData()
        toast.success("Departamento inativado.")
      } catch (error) {
          console.error(error)
          toast.error(getApiErrorMessage(error, "Nao foi possivel inativar o departamento."))
      }
  }

  // Filtering & Pagination
  const filtered = departments.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()))
  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  useEffect(() => {
    startTransition(() => {
      setCurrentPage(1)
    })
  }, [searchTerm])

  return (
    <div className="app-page">
      <div className="app-page-header">
        <div className="space-y-2">
          <p className="app-kicker">RH</p>
          <h1 className="app-title">Departamentos</h1>
          <p className="app-subtitle">
            Organize as areas da empresa, defina a filial responsavel e mantenha o gestor de cada departamento alinhado ao fluxo operacional.
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Departamento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Departamento" : "Criar Departamento"}</DialogTitle>
              <DialogDescription>
                Preencha os dados principais do departamento. O gestor e obrigatorio para garantir o encadeamento correto das aprovacoes e responsabilidades.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6 py-2">
                <div className="app-section-card space-y-5">
                  <div className="space-y-1">
                    <h2 className="section-title">Dados do departamento</h2>
                    <p className="text-sm text-muted-foreground">
                      Configure a identificacao, a filial responsavel e o gestor principal da area.
                    </p>
                  </div>

                  <div className="app-form-grid">
                    <div className="field-stack">
                      <Label htmlFor="branch">Filial *</Label>
                      <p className="text-sm text-muted-foreground">
                        Unidade a qual este departamento pertence.
                      </p>
                      <Select value={branchId} onValueChange={setBranchId}>
                        <SelectTrigger id="branch" className="w-full">
                          <SelectValue placeholder="Selecione a filial" />
                        </SelectTrigger>
                        <SelectContent>
                          {branches.map((branch) => (
                            <SelectItem key={branch.id} value={branch.id}>
                              {branch.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="field-stack">
                      <Label htmlFor="name">Nome *</Label>
                      <p className="text-sm text-muted-foreground">
                        Nome exibido nas telas operacionais e relatorios.
                      </p>
                      <Input
                        id="name"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        required
                      />
                    </div>

                    <div className="field-stack md:col-span-2">
                      <Label htmlFor="desc">Descricao</Label>
                      <p className="text-sm text-muted-foreground">
                        Contexto opcional para diferenciar departamentos similares.
                      </p>
                      <Input
                        id="desc"
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                      />
                    </div>

                    <div className="field-stack md:col-span-2">
                      <Label htmlFor="manager">Gestor *</Label>
                      <p className="text-sm text-muted-foreground">
                        Responsavel principal pelo departamento.
                      </p>
                      <Select value={headManagerId} onValueChange={setHeadManagerId}>
                        <SelectTrigger id="manager" className="w-full">
                          <SelectValue placeholder="Selecione um gestor" />
                        </SelectTrigger>
                        <SelectContent>
                          {employees.map((employee) => (
                            <SelectItem key={employee.id} value={employee.id}>
                              {employee.user.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {editingId && (
                      <div className="field-stack md:col-span-2">
                        <Label htmlFor="active">Status</Label>
                        <p className="text-sm text-muted-foreground">
                          Departamentos inativos ficam preservados para historico e relatorios.
                        </p>
                        <div className="flex min-h-10 items-center justify-between rounded-md border border-border bg-background px-3 py-2">
                          <div className="space-y-0.5">
                            <p className="text-sm font-medium">
                              {isActive ? "Ativo" : "Inativo"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {isActive
                                ? "Disponivel para novos vinculos."
                                : "Mantido apenas para consulta historica."}
                            </p>
                          </div>
                          <Switch id="active" checked={isActive} onCheckedChange={setIsActive} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={submitLoading}>
                        {submitLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {editingId ? "Salvar alteracoes" : "Criar departamento"}
                    </Button>
                </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="app-section-card">
        <CardHeader className="pb-3">
            <div className="app-toolbar flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle>Listagem</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Consulte departamentos ativos e inativos e acione manutencoes pontuais.
                  </p>
                </div>
                <div className="relative w-full md:w-[260px]">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Buscar departamento..." className="pl-8" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
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
                                <TableCell>{dept.headManager?.user?.name || '-'}</TableCell>
                                <TableCell>
                                    <Badge variant={dept.active ? "default" : "secondary"}>
                                        {dept.active ? "Ativo" : "Inativo"}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(dept)}><Pencil className="h-4 w-4" /></Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-red-500"
                                      onClick={() => handleDelete(dept.id)}
                                      disabled={!dept.active}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
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
