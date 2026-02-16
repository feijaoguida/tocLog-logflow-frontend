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
            toast.error("Erro ao salvar filial.")
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
            toast.error("Erro ao excluir. Verifique se existem departamentos ou funcionários vinculados.")
        }
    }

    const filtered = branches.filter(b => b.name.toLowerCase().includes(searchTerm.toLowerCase()))
    const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

    return (
        <div className="flex flex-1 flex-col gap-4 p-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">Filiais</h1>
                <Dialog open={isOpen} onOpenChange={handleOpenChange}>
                    <DialogTrigger asChild>
                        <Button className="gap-2"><Plus className="h-4 w-4" /> Nova Filial</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingId ? "Editar Filial" : "Criar Filial"}</DialogTitle>
                            <DialogDescription>Gerencie as unidades da empresa.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">Nome *</Label>
                                <Input id="name" value={name} onChange={e => setName(e.target.value)} className="col-span-3" required />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="code" className="text-right">Código</Label>
                                <Input id="code" value={code} onChange={e => setCode(e.target.value)} className="col-span-3" placeholder="Ex: 001" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="active" className="text-right">Ativo</Label>
                                <div className="col-span-3 flex items-center space-x-2">
                                    <Switch id="active" checked={active} onCheckedChange={setActive} />
                                    <Label htmlFor="active">{active ? "Sim" : "Não"}</Label>
                                </div>
                            </div>
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
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nome</TableHead>
                                    <TableHead>Código</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginated.map(branch => (
                                    <TableRow key={branch.id}>
                                        <TableCell className="font-medium">{branch.name}</TableCell>
                                        <TableCell>
                                            {branch.code ? <Badge variant="outline">{branch.code}</Badge> : '-'}
                                        </TableCell>
                                        <TableCell>
                                            {branch.active ? 
                                                <Badge className="bg-green-500 hover:bg-green-600">Ativo</Badge> : 
                                                <Badge variant="destructive">Inativo</Badge>
                                            }
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(branch)}><Pencil className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDelete(branch.id)}><Trash2 className="h-4 w-4" /></Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                     {/* Pagination Controls */}
                    <div className="flex items-center justify-end space-x-2 py-4">
                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                            Anterior
                        </Button>
                        <div className="text-sm text-muted-foreground">
                            Página {currentPage} de {Math.ceil(filtered.length / itemsPerPage)}
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(Math.ceil(filtered.length / itemsPerPage), p + 1))} disabled={currentPage === Math.ceil(filtered.length / itemsPerPage)}>
                            Próxima
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
