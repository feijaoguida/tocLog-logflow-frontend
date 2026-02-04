'use client'

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Plus, Pencil, Trash2, Loader2, Search, Truck, Phone, Mail } from "lucide-react"
import { toast } from "sonner"

interface Supplier {
    id: string
    name: string
    cnpj: string
    email: string | null
    phone: string | null
}

export default function SuppliersPage() {
    const [suppliers, setSuppliers] = useState<Supplier[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")

    // Form
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [formLoading, setFormLoading] = useState(false)
    
    const [name, setName] = useState("")
    const [cnpj, setCnpj] = useState("")
    const [email, setEmail] = useState("")
    const [phone, setPhone] = useState("")

    const fetchSuppliers = async () => {
        try {
            setLoading(true)
            const token = localStorage.getItem('token')
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://162.215.222.208:4000'}/suppliers`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if(res.ok) setSuppliers(await res.json())
        } catch { toast.error("Erro ao carregar fornecedores") }
        finally { setLoading(false) }
    }

    useEffect(() => { fetchSuppliers() }, [])

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setFormLoading(true)
        try {
            const token = localStorage.getItem('token')
            const payload = { name, cnpj, email, phone }
            
            let url = `${process.env.NEXT_PUBLIC_API_URL || 'http://162.215.222.208:4000'}/suppliers`
            let method = 'POST'
            if(editingId) {
                url = `${process.env.NEXT_PUBLIC_API_URL || 'http://162.215.222.208:4000'}/suppliers/${editingId}`
                method = 'PATCH'
            }

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            })

            if(!res.ok) throw new Error()
            toast.success("Fornecedor salvo.")
            setIsFormOpen(false)
            fetchSuppliers()
            resetForm()
        } catch { toast.error("Erro ao salvar.") }
        finally { setFormLoading(false) }
    }

    const handleDelete = async (id: string) => {
        if(!confirm("Excluir fornecedor?")) return
        try {
            const token = localStorage.getItem('token')
            await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://162.215.222.208:4000'}/suppliers/${id}`, {
                method: 'DELETE', 
                headers: { 'Authorization': `Bearer ${token}` }
            })
            toast.success("Fornecedor excluído.")
            fetchSuppliers()
        } catch { toast.error("Erro ao excluir.") }
    }

    const resetForm = () => {
        setName(""); setCnpj(""); setEmail(""); setPhone(""); setEditingId(null)
    }

    const handleEdit = (s: Supplier) => {
        setEditingId(s.id)
        setName(s.name)
        setCnpj(s.cnpj)
        setEmail(s.email || "")
        setPhone(s.phone || "")
        setIsFormOpen(true)
    }

    const filtered = suppliers.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))

    return (
     <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Fornecedores</h1>
            <p className="text-muted-foreground">Gerencie a base de parceiros comerciais.</p>
          </div>
          <Button onClick={() => { resetForm(); setIsFormOpen(true) }} className="gap-2">
            <Plus className="h-4 w-4"/> Novo Fornecedor
          </Button>
        </div>

        <div className="flex items-center gap-2 mb-4">
             <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar fornecedor..." className="pl-8" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(s => (
                <Card key={s.id} className="group relative hover:border-primary/50 transition-all">
                    <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="font-medium text-base truncate pr-8">{s.name}</CardTitle>
                        <Truck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm space-y-2">
                            <div className="font-mono text-xs bg-muted/50 p-1 rounded w-fit">{s.cnpj}</div>
                            {s.email && <div className="flex items-center gap-2 text-muted-foreground"><Mail className="h-3 w-3"/> {s.email}</div>}
                            {s.phone && <div className="flex items-center gap-2 text-muted-foreground"><Phone className="h-3 w-3"/> {s.phone}</div>}
                        </div>
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                             <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(s)}><Pencil className="h-3.5 w-3.5"/></Button>
                             <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={() => handleDelete(s.id)}><Trash2 className="h-3.5 w-3.5"/></Button>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>

        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogContent>
                <DialogHeader><DialogTitle>{editingId ? "Editar Fornecedor" : "Novo Fornecedor"}</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="grid gap-2">
                         <Label>Razão Social / Nome</Label>
                         <Input value={name} onChange={e => setName(e.target.value)} placeholder="Fornecedor Ltda" />
                    </div>
                    <div className="grid gap-2">
                         <Label>CNPJ</Label>
                         <Input value={cnpj} onChange={e => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                             <Label>Email</Label>
                             <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="contato@empresa.com" />
                        </div>
                        <div className="grid gap-2">
                             <Label>Telefone</Label>
                             <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(11) 99999-9999" />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={formLoading}>{formLoading ? <Loader2 className="animate-spin h-4 w-4 mr-2"/> : null} Salvar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
     </div>
    )
}
