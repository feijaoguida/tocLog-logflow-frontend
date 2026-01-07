'use client'

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Pencil, Trash2, Loader2, Search, Shield, Info } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Permission {
    id: string
    slug: string
    description: string
}

interface Role {
    id: string
    name: string
    description: string | null
    isSystem: boolean
    permissions: Permission[]
    _count?: {
        employees: number
    }
}

export default function PermissionsPage() {
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  
  // Dialog State
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  // Form State
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])
  const [formLoading, setFormLoading] = useState(false)

  const fetchRoles = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const [rolesRes, permsRes] = await Promise.all([
          fetch('http://localhost:3000/roles', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('http://localhost:3000/roles/permissions', { headers: { 'Authorization': `Bearer ${token}` } })
      ])
      
      if(rolesRes.ok) setRoles(await rolesRes.json())
      if(permsRes.ok) setPermissions(await permsRes.json())
    } catch (error) {
      console.error(error)
      toast.error("Erro ao carregar dados.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRoles()
  }, [])

  const resetForm = () => {
      setName(""); setDescription(""); setSelectedPermissions([]);
      setEditingId(null)
  }

  const handleCreateOpen = () => {
      resetForm()
      setIsFormOpen(true)
  }

  const handleEditClick = (role: Role) => {
      setEditingId(role.id)
      setName(role.name)
      setDescription(role.description || "")
      setSelectedPermissions(role.permissions.map(p => p.slug))
      setIsFormOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault()
      setFormLoading(true)
      try {
          const token = localStorage.getItem('token')
          const payload = {
              name,
              description,
              permissionSlugs: selectedPermissions,
              companyId: "bd3ee54e-2c46-4c77-80ea-0adfdd2b1305" // Hardcode matching backend default
          }

          let url = 'http://localhost:3000/roles'
          let method = 'POST'
          
          if(editingId) {
              url = `http://localhost:3000/roles/${editingId}`
              method = 'PATCH'
          }

          const res = await fetch(url, {
              method,
              headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify(payload)
          })

          if(!res.ok) throw new Error("Falha ao salvar")
          
          toast.success(editingId ? "Perfil atualizado" : "Perfil criado")
          setIsFormOpen(false)
          fetchRoles()
      } catch(e) {
          toast.error("Erro ao salvar perfil")
      } finally {
          setFormLoading(false)
      }
  }

  const handleDelete = async (id: string, isSystem: boolean) => {
      if(isSystem) {
          toast.error("Perfis de sistema não podem ser excluídos")
          return
      }
      if(!confirm("Deseja excluir este perfil? Usuários vinculados perderão acesso.")) return;
      
      try {
          const token = localStorage.getItem('token')
          const res = await fetch(`http://localhost:3000/roles/${id}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
          })
          if(res.ok) {
              toast.success("Perfil excluído")
              fetchRoles()
          } else { // Handle 400 Bad Request (e.g. has employees)
             const err = await res.json()
             toast.error(err.message || "Erro ao excluir")
          }
      } catch(e) { toast.error("Erro ao excluir") }
  }

  const togglePermission = (slug: string) => {
      if(selectedPermissions.includes(slug)) {
          setSelectedPermissions(prev => prev.filter(p => p !== slug))
      } else {
          setSelectedPermissions(prev => [...prev, slug])
      }
  }
  
  const filteredRoles = roles.filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Permissões e Perfis</h1>
          <Button onClick={handleCreateOpen} className="gap-2"><Plus className="h-4 w-4"/> Novo Perfil</Button>
        </div>

        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="p-6 pb-2 border-b bg-muted/40">
                    <DialogTitle>{editingId ? "Editar Perfil" : "Novo Perfil de Acesso"}</DialogTitle>
                    <DialogDescription>Configure o nome e as permissões deste grupo.</DialogDescription>
                </DialogHeader>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="space-y-4">
                        <div className="grid gap-2">
                            <Label>Nome do Perfil</Label>
                            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Financeiro Jr" />
                        </div>
                        <div className="grid gap-2">
                            <Label>Descrição</Label>
                            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Breve descrição das responsabilidades" />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label>Permissões do Sistema</Label>
                        <ScrollArea className="h-[300px] rounded-md border p-4 bg-muted/20">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {permissions.map(p => (
                                    <div key={p.id} className="flex items-start space-x-2 p-2 rounded hover:bg-muted/50 transition-colors">
                                        <Checkbox 
                                            id={p.slug} 
                                            checked={selectedPermissions.includes(p.slug)}
                                            onCheckedChange={() => togglePermission(p.slug)}
                                        />
                                        <div className="grid gap-1.5 leading-none">
                                            <label
                                                htmlFor={p.slug}
                                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                            >
                                                {p.slug}
                                            </label>
                                            <p className="text-xs text-muted-foreground">
                                                {p.description || "Acesso funcionalidade"}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                {permissions.length === 0 && <p className="text-sm text-muted-foreground col-span-2">Nenhuma permissão cadastrada no sistema.</p>}
                            </div>
                        </ScrollArea>
                    </div>
                </div>

                <DialogFooter className="p-6 pt-2 border-t bg-muted/40">
                     <Button variant="ghost" onClick={() => setIsFormOpen(false)} className="mr-2">Cancelar</Button>
                     <Button onClick={handleSubmit} disabled={formLoading}>
                         {formLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Salvar Perfil
                     </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <Card>
            <CardHeader className="pb-3 border-b mb-4">
                <div className="flex justify-between items-center">
                    <div className="space-y-1">
                        <CardTitle>Perfis Cadastrados</CardTitle>
                        <CardDescription>Gerencie os níveis de acesso dos colaboradores.</CardDescription>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Buscar perfil..." className="pl-8 w-[250px]" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {loading ? <Loader2 className="mx-auto h-8 w-8 animate-spin" /> : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredRoles.map(role => (
                        <Card key={role.id} className="relative group hover:border-primary/50 transition-colors">
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2">
                                        <Shield className="h-5 w-5 text-primary" />
                                        <CardTitle className="text-lg">{role.name}</CardTitle>
                                    </div>
                                    {role.isSystem && <Badge variant="secondary" className="text-xs">Sistema</Badge>}
                                </div>
                                <CardDescription className="line-clamp-2 min-h-[40px]">
                                    {role.description || "Sem descrição definida."}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pb-14">
                                <div className="space-y-2 text-sm text-muted-foreground">
                                    <div className="flex justify-between">
                                        <span>Usuários ativos</span>
                                        <span className="font-medium text-foreground">{role._count?.employees || 0}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Permissões</span>
                                        <span className="font-medium text-foreground">{role.permissions.length}</span>
                                    </div>
                                </div>
                            </CardContent>
                            <div className="absolute create-y-0 bottom-0 left-0 right-0 p-4 border-t bg-muted/10 flex justify-end gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="sm" className="h-8" onClick={() => handleEditClick(role)}>
                                    <Pencil className="h-3.5 w-3.5 mr-2" /> Editar
                                </Button>
                                {!role.isSystem && (
                                    <Button variant="ghost" size="sm" className="h-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(role.id, role.isSystem)}>
                                        <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir
                                    </Button>
                                )}
                            </div>
                        </Card>
                    ))}
                    {filteredRoles.length === 0 && (
                        <div className="col-span-full py-12 text-center text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                             <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
                             <p>Nenhum perfil encontrado.</p>
                        </div>
                    )}
                </div>
                )}
            </CardContent>
        </Card>
    </div>
  )
}
