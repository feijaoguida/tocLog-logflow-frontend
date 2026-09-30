'use client'

import { useEffect, useState, useTransition, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Pencil, Trash2, Loader2, Search, Filter, FolderTree, ChevronLeft, ChevronRight, X } from "lucide-react"
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
  
  // Filters State
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedBranchFilter, setSelectedBranchFilter] = useState("all")
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("all")
  const [appliedFilters, setAppliedFilters] = useState({ search: "", branch: "all", status: "all" })
  
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
  const [pageSize, setPageSize] = useState(10)
  const [, startTransition] = useTransition()

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
          toast.error(getApiErrorMessage(error, "Não foi possível inativar o departamento."))
      }
  }

  const handleApplyFilters = () => {
    startTransition(() => {
      setAppliedFilters({
        search: searchTerm,
        branch: selectedBranchFilter,
        status: selectedStatusFilter,
      })
      setCurrentPage(1)
    })
  }

  const handleClearFilters = () => {
    startTransition(() => {
      setSearchTerm("")
      setSelectedBranchFilter("all")
      setSelectedStatusFilter("all")
      setAppliedFilters({
        search: "",
        branch: "all",
        status: "all",
      })
      setCurrentPage(1)
    })
  }

  // Filtering & Pagination
  const filtered = useMemo(() => {
    return departments.filter(d => {
      const matchesSearch = !appliedFilters.search || 
        d.name.toLowerCase().includes(appliedFilters.search.toLowerCase()) ||
        d.branch?.name.toLowerCase().includes(appliedFilters.search.toLowerCase()) ||
        d.headManager?.user.name.toLowerCase().includes(appliedFilters.search.toLowerCase())
      
      const matchesBranch = appliedFilters.branch === "all" || d.branch?.id === appliedFilters.branch
      
      const matchesStatus = appliedFilters.status === "all" || 
        (appliedFilters.status === "active" && d.active) || 
        (appliedFilters.status === "inactive" && !d.active)

      return matchesSearch && matchesBranch && matchesStatus
    })
  }, [departments, appliedFilters])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <div className="space-y-6">
      {/* Hero Header Card fiel à Imagem 3 */}
      <div className="relative overflow-hidden rounded-lg border border-border bg-gradient-to-r from-primary/10 via-primary/4 to-transparent p-6 shadow-xs">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div className="space-y-2 max-w-2xl">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">RH</span>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Departamentos</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Organize as áreas da empresa, defina a filial responsável e mantenha o gestor de cada departamento alinhado ao fluxo operacional.
            </p>
            <div className="pt-2">
              <Button onClick={() => { resetForm(); setIsOpen(true); }} className="gap-2 shadow-xs">
                <Plus className="size-4" />
                Novo Departamento
              </Button>
            </div>
          </div>
          
          <div className="hidden md:flex size-20 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary shadow-xs">
            <FolderTree className="size-10" />
          </div>
        </div>
      </div>

      {/* Modal de Criação / Edição */}
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Departamento" : "Criar Departamento"}</DialogTitle>
            <DialogDescription>
              Preencha os dados principais do departamento. O gestor é obrigatório para garantir o encadeamento correto das aprovações e responsabilidades.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 py-2">
              <div className="rounded-lg border border-border bg-card p-5 space-y-4 shadow-xs">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-foreground">Dados do departamento</h3>
                  <p className="text-xs text-muted-foreground">
                    Configure a identificação, a filial responsável e o gestor principal da área.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="branch">Filial *</Label>
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

                  <div className="space-y-1.5">
                    <Label htmlFor="name">Nome *</Label>
                    <Input
                      id="name"
                      placeholder="Ex: Recursos Humanos"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="desc">Descrição</Label>
                    <Input
                      id="desc"
                      placeholder="Contexto opcional do departamento"
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="manager">Gestor *</Label>
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
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="active">Status</Label>
                      <div className="flex min-h-10 items-center justify-between rounded-md border border-border bg-background px-3 py-2">
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium">
                            {isActive ? "Ativo" : "Inativo"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {isActive
                              ? "Disponível para novos vínculos e operações."
                              : "Mantido apenas para consulta histórica."}
                          </p>
                        </div>
                        <Switch id="active" checked={isActive} onCheckedChange={setIsActive} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                  <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={submitLoading}>
                      {submitLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                      {editingId ? "Salvar alterações" : "Criar departamento"}
                  </Button>
              </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Card de Filtros fiel à Imagem 3 */}
      <Card className="shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Filtros</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Buscar</Label>
              <Input
                placeholder="Nome, filial ou gestor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleApplyFilters() }}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Filial</Label>
              <Select value={selectedBranchFilter} onValueChange={setSelectedBranchFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as filiais</SelectItem>
                  {branches.map(branch => (
                    <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Ativos</SelectItem>
                  <SelectItem value="inactive">Inativos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={handleClearFilters} className="flex-1">
                Limpar
              </Button>
              <Button type="button" onClick={handleApplyFilters} className="flex-1">
                Aplicar filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card da Tabela "Lista de departamentos" fiel à Imagem 3 */}
      <Card className="shadow-xs">
        <CardHeader className="pb-3 border-b border-border/70">
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-primary" />
            <CardTitle className="text-sm font-semibold">Lista de departamentos</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Consulte departamentos ativos e inativos e acione manutenções pontuais.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border/80 hover:bg-transparent">
                    <TableHead className="font-semibold text-foreground text-xs uppercase tracking-wider pl-6">Nome</TableHead>
                    <TableHead className="font-semibold text-foreground text-xs uppercase tracking-wider">Filial</TableHead>
                    <TableHead className="font-semibold text-foreground text-xs uppercase tracking-wider">Gestor</TableHead>
                    <TableHead className="font-semibold text-foreground text-xs uppercase tracking-wider">Status</TableHead>
                    <TableHead className="font-semibold text-foreground text-xs uppercase tracking-wider text-right pr-6">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                        Nenhum departamento encontrado para os critérios selecionados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginated.map((dept) => (
                      <TableRow key={dept.id} className="border-b border-border/60 hover:bg-muted/40 transition-colors">
                        <TableCell className="font-medium pl-6 text-foreground">
                          <div>{dept.name}</div>
                          {dept.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">{dept.description}</p>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{dept.branch?.name || '-'}</TableCell>
                        <TableCell className="text-muted-foreground">{dept.headManager?.user?.name || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={dept.active ? "success" : "neutral"} className="rounded-full px-2.5 py-0.5 text-xs font-medium">
                            {dept.active ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="inline-flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-muted-foreground hover:text-foreground"
                              onClick={() => handleEdit(dept)}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-destructive/80 hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDelete(dept.id)}
                              disabled={!dept.active}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* Rodapé de Paginação fiel à Imagem 3 */}
              <div className="flex flex-col gap-4 border-t border-border/70 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-muted-foreground">
                  {filtered.length > 0 ? (
                    <>
                      Mostrando <span className="font-semibold text-foreground">{(currentPage - 1) * pageSize + 1}</span> a{" "}
                      <span className="font-semibold text-foreground">{Math.min(currentPage * pageSize, filtered.length)}</span> de{" "}
                      <span className="font-semibold text-foreground">{filtered.length}</span> resultados
                    </>
                  ) : (
                    "0 resultados"
                  )}
                </div>

                <div className="flex items-center gap-4">
                  {/* Botões numerados */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-8"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="size-4" />
                    </Button>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((page) => {
                        return page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1
                      })
                      .map((page, index, array) => {
                        const showEllipsis = index > 0 && page - array[index - 1] > 1
                        return (
                          <div key={page} className="flex items-center gap-1">
                            {showEllipsis && <span className="px-1 text-xs text-muted-foreground">...</span>}
                            <Button
                              variant={currentPage === page ? "default" : "outline"}
                              size="sm"
                              className="size-8 p-0 text-xs"
                              onClick={() => setCurrentPage(page)}
                            >
                              {page}
                            </Button>
                          </div>
                        )
                      })}

                    <Button
                      variant="outline"
                      size="icon"
                      className="size-8"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>

                  {/* Seletor de itens por página */}
                  <div className="w-[120px]">
                    <Select
                      value={String(pageSize)}
                      onValueChange={(val) => {
                        setPageSize(Number(val))
                        setCurrentPage(1)
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 por página</SelectItem>
                        <SelectItem value="10">10 por página</SelectItem>
                        <SelectItem value="20">20 por página</SelectItem>
                        <SelectItem value="50">50 por página</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
