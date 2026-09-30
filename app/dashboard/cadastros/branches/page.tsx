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
import { api } from "@/lib/api"
import { getApiErrorMessage } from "@/lib/api-error"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { useSettings } from "@/context/settings-context"

interface Branch {
    id: string
    name: string
    code: string | null
    companyId: string
    active: boolean
}

export default function BranchesPage() {
    const [branches, setBranches] = useState<Branch[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")

    const [currentPage, setCurrentPage] = useState(1)
    const { itemsPerPage } = useSettings()

    // Create/Edit State
    const [isOpen, setIsOpen] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [submitLoading, setSubmitLoading] = useState(false)

    // Form
    const [name, setName] = useState("")
    const [code, setCode] = useState("")
    const [active, setActive] = useState(true)
    
    const [companyId, setCompanyId] = useState<string>("")

    const fetchData = async () => {
        try {
            // Fetch profile to get companyId and permissions context
            // Fetch branches
            const [branchRes, profileRes] = await Promise.all([
                api.get('/branches'),
                api.get('/auth/profile')
            ])
            setBranches(branchRes.data)
            
            // Extract companyId from profile
            const user = profileRes.data
            // Assuming the structure from AuthService
            // user.companyId might be directly available if added to payload, or via employee -> branch -> company
            // The AuthController returns req.user which is the payload from JwtStrategy/AuthService.
            // AuthService login payload: { companyId: ... }
            if (user.companyId) {
                setCompanyId(user.companyId)
            } else {
                console.warn("Company ID not found in user profile")
                // Fallback or error? For now, we hope it's there.
            }

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
        setCode("")
        setActive(true)
        setEditingId(null)
    }

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open)
        if (!open) resetForm()
    }

    const handleEdit = (branch: Branch) => {
        setEditingId(branch.id)
        setName(branch.name)
        setCode(branch.code || "")
        setActive(branch.active)
        setIsOpen(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!name) {
            toast.error("Nome é obrigatório.")
            return
        }

        if (!companyId) {
             toast.error("Erro: ID da Empresa não identificado. Recarregue a página.")
             return
        }

        setSubmitLoading(true)
        try {
            const payload = {
                name,
                code,
                active,
                companyId
            }

            if (editingId) {
                await api.patch(`/branches/${editingId}`, payload)
                toast.success("Filial atualizada.")
            } else {
                await api.post('/branches', payload)
                toast.success("Filial criada.")
            }

            setIsOpen(false)
            resetForm()
            fetchData() 
        } catch (error) {
            console.error(error)
            toast.error(getApiErrorMessage(error, "Erro ao salvar filial."))
        } finally {
            setSubmitLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Tem certeza que deseja excluir?")) return;
        try {
            await api.delete(`/branches/${id}`)
            setBranches(prev => prev.filter(b => b.id !== id))
            toast.success("Filial excluída.")
        } catch (error) {
            console.error(error)
            toast.error(getApiErrorMessage(error, "Erro ao excluir. Verifique se existem departamentos ou funcionários vinculados."))
        }
    }

    const filtered = branches.filter(b => b.name.toLowerCase().includes(searchTerm.toLowerCase()))
    const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

    return (
        <div className="space-y-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div className="space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-wider text-primary">Cadastros</span>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Filiais</h1>
                    <p className="text-sm text-muted-foreground">
                        Gerencie as unidades operacionais da empresa e mantenha o registro ativo para os demais módulos.
                    </p>
                </div>
                <Dialog open={isOpen} onOpenChange={handleOpenChange}>
                    <DialogTrigger asChild>
                        <Button className="gap-2 shadow-xs shrink-0"><Plus className="size-4" /> Nova Filial</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle>{editingId ? "Editar Filial" : "Criar Filial"}</DialogTitle>
                            <DialogDescription>Gerencie as unidades operacionais da empresa.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4 py-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="name">Nome da Filial *</Label>
                                <Input id="name" placeholder="Ex: Matriz - São Paulo" value={name} onChange={e => setName(e.target.value)} required />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="code">Código de Identificação</Label>
                                <Input id="code" value={code} onChange={e => setCode(e.target.value)} placeholder="Ex: FIL-01" />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="active">Status</Label>
                                <div className="flex min-h-10 items-center justify-between rounded-md border border-border bg-background px-3 py-2">
                                    <div className="space-y-0.5">
                                        <p className="text-sm font-medium">{active ? "Ativo" : "Inativo"}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {active ? "Disponível para novos lançamentos." : "Mantida para histórico."}
                                        </p>
                                    </div>
                                    <Switch id="active" checked={active} onCheckedChange={setActive} />
                                </div>
                            </div>
                            <DialogFooter className="gap-2 sm:gap-0 pt-2">
                                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={submitLoading}>
                                    {submitLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : editingId ? "Salvar alterações" : "Criar filial"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="shadow-xs">
                <CardHeader className="pb-3 border-b border-border/70">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-0.5">
                            <CardTitle className="text-sm font-semibold">Listagem de Filiais</CardTitle>
                            <p className="text-xs text-muted-foreground">Consulte filiais cadastradas e seus respectivos status.</p>
                        </div>
                        <div className="relative w-full sm:w-[240px]">
                            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                            <Input placeholder="Buscar filial..." className="pl-8" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        </div>
                    </div>
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
                                    <TableHead className="font-semibold text-foreground text-xs uppercase tracking-wider">Código</TableHead>
                                    <TableHead className="font-semibold text-foreground text-xs uppercase tracking-wider">Status</TableHead>
                                    <TableHead className="font-semibold text-foreground text-xs uppercase tracking-wider text-right pr-6">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginated.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                                            Nenhuma filial encontrada.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginated.map(branch => (
                                        <TableRow key={branch.id} className="border-b border-border/60 hover:bg-muted/40 transition-colors">
                                            <TableCell className="font-medium pl-6 text-foreground">{branch.name}</TableCell>
                                            <TableCell>
                                                {branch.code ? <Badge variant="outline">{branch.code}</Badge> : '-'}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={branch.active ? "success" : "neutral"} className="rounded-full px-2.5 py-0.5 text-xs font-medium">
                                                    {branch.active ? "Ativo" : "Inativo"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right pr-6">
                                                <div className="inline-flex items-center gap-1">
                                                    <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-foreground" onClick={() => handleEdit(branch)}>
                                                        <Pencil className="size-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="size-8 text-destructive/80 hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(branch.id)}>
                                                        <Trash2 className="size-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>

                        {/* Pagination Controls */}
                        <div className="flex flex-col gap-4 border-t border-border/70 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="text-xs text-muted-foreground">
                                Mostrando <span className="font-semibold text-foreground">{filtered.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span> a{" "}
                                <span className="font-semibold text-foreground">{Math.min(currentPage * itemsPerPage, filtered.length)}</span> de{" "}
                                <span className="font-semibold text-foreground">{filtered.length}</span> resultados
                            </div>
                            <div className="flex items-center justify-end space-x-2">
                                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                                    Anterior
                                </Button>
                                <div className="text-xs text-muted-foreground px-2">
                                    Página {currentPage} de {Math.max(1, Math.ceil(filtered.length / itemsPerPage))}
                                </div>
                                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(Math.ceil(filtered.length / itemsPerPage), p + 1))} disabled={currentPage >= Math.ceil(filtered.length / itemsPerPage)}>
                                    Próxima
                                </Button>
                            </div>
                        </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
