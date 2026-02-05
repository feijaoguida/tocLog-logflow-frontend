'use client'

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { toast } from "sonner"
import { Plus, Edit, Trash2, Shield } from "lucide-react"
import _ from "lodash"
import { api } from "@/lib/api"

export default function ProfilesPage() {
    const [roles, setRoles] = useState<any[]>([])
    const [permissions, setPermissions] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingRole, setEditingRole] = useState<any>(null)
    const [formData, setFormData] = useState({ name: '', description: '', permissionSlugs: [] as string[] })

    useEffect(() => {
        fetchRoles()
        fetchPermissions()
    }, [])

    const fetchRoles = async () => {
        try {
            const { data } = await api.get('/roles')
            setRoles(data)
        } catch (e) { toast.error("Erro ao buscar perfis") }
    }

    const fetchPermissions = async () => {
        try {
            // Using the endpoint we verified exists in controller
            const { data } = await api.get('/roles/permissions')
            setPermissions(data)
        } catch (e) { toast.error("Erro ao buscar permissões") }
        finally { setLoading(false) }
    }

    const handleOpenDialog = (role?: any) => {
        if(role) {
            setEditingRole(role)
            setFormData({
                name: role.name,
                description: role.description || '',
                permissionSlugs: role.permissions.map((p: any) => p.slug)
            })
        } else {
            setEditingRole(null)
            setFormData({ name: '', description: '', permissionSlugs: [] })
        }
        setIsDialogOpen(true)
    }

    const handleSubmit = async () => {
        try {
            if (editingRole) {
                await api.patch(`/roles/${editingRole.id}`, formData)
            } else {
                await api.post('/roles', formData)
            }

            toast.success(editingRole ? "Perfil atualizado!" : "Perfil criado!")
            setIsDialogOpen(false)
            fetchRoles()
        } catch (e) { toast.error(editingRole ? "Erro ao atualizar perfil" : "Erro ao criar perfil") }
    }

    const togglePermission = (slug: string) => {
        setFormData(prev => {
            if(prev.permissionSlugs.includes(slug)) {
                return { ...prev, permissionSlugs: prev.permissionSlugs.filter(s => s !== slug) }
            } else {
                return { ...prev, permissionSlugs: [...prev.permissionSlugs, slug] }
            }
        })
    }
    
    // Group permissions
    const groupedPermissions = _.groupBy(permissions, 'group')
    const sortedGroups = Object.keys(groupedPermissions).sort()

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Gestão de Permissões</h1>
                    <p className="text-muted-foreground">Gerencie perfis de acesso e permissões do sistema.</p>
                </div>
                <Button onClick={() => handleOpenDialog()}>
                    <Plus className="mr-2 h-4 w-4" /> Novo Perfil
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {roles.map(role => (
                    <Card key={role.id} className="relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-50">
                            <Shield className="h-12 w-12 text-slate-100" />
                        </div>
                        <CardHeader>
                            <CardTitle>{role.name}</CardTitle>
                            <CardDescription>{role.description || "Sem descrição"}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex justify-between items-center text-sm text-muted-foreground mb-4">
                                <span>{role.permissions?.length || 0} permissões</span>
                                <span>{role._count?.employees || 0} usuários</span>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" className="w-full" onClick={() => handleOpenDialog(role)}>
                                    <Edit className="mr-2 h-3 w-3" /> Editar
                                </Button>
                                {!role.isSystem && (
                                     <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                        <Trash2 className="h-4 w-4" />
                                     </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingRole ? 'Editar Perfil' : 'Novo Perfil'}</DialogTitle>
                    </DialogHeader>
                    
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Nome do Perfil</Label>
                                <Input 
                                    value={formData.name} 
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                    placeholder="Ex: Financeiro Sênior"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Descrição</Label>
                                <Input 
                                    value={formData.description} 
                                    onChange={e => setFormData({...formData, description: e.target.value})}
                                    placeholder="Descrição das responsabilidades"
                                />
                            </div>
                        </div>

                        <div className="space-y-2 mt-4">
                            <Label>Permissões do Sistema</Label>
                            <div className="border rounded-md p-4">
                                <Accordion type="multiple" defaultValue={sortedGroups} className="w-full">
                                    {sortedGroups.map(group => (
                                        <AccordionItem key={group} value={group}>
                                            <AccordionTrigger className="text-sm font-semibold hover:no-underline px-2 bg-slate-50/50 rounded flex justify-between">
                                                <span>{group}</span>
                                                <span className="text-xs text-muted-foreground font-normal ml-2">
                                                    ({groupedPermissions[group].filter(p => formData.permissionSlugs.includes(p.slug)).length} / {groupedPermissions[group].length})
                                                </span>
                                            </AccordionTrigger>
                                            <AccordionContent className="p-2 pt-4">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    {groupedPermissions[group].map(perm => (
                                                        <div key={perm.id} className="flex items-start space-x-2">
                                                            <Checkbox 
                                                                id={perm.id} 
                                                                checked={formData.permissionSlugs.includes(perm.slug)}
                                                                onCheckedChange={() => togglePermission(perm.slug)}
                                                            />
                                                            <div className="grid gap-1.5 leading-none">
                                                                <label
                                                                    htmlFor={perm.id}
                                                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                                                >
                                                                    {perm.description || perm.slug}
                                                                </label>
                                                                <p className="text-[10px] text-muted-foreground">{perm.slug}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                    ))}
                                </Accordion>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                         <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                         <Button onClick={handleSubmit}>Salvar Perfil</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
