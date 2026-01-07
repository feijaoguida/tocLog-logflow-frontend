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
import { RoleGate } from "@/components/auth/role-gate"

interface User {
  id: string
  name: string
  email: string
  createdAt: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  
  // Create User State
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [createLoading, setCreateLoading] = useState(false)

  // const { toast } = useToast()

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:3000/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (!response.ok) throw new Error('Falha ao carregar usuários')
      const data = await response.json()
      setUsers(data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:3000/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            name: newName,
            email: newEmail,
            password: newPassword
        })
      })

      if (!response.ok) throw new Error('Erro ao criar usuário')

      setIsCreateOpen(false)
      setNewName("")
      setNewEmail("")
      setNewPassword("")
      fetchUsers()
      toast.success("Usuário criado com sucesso.")
    } catch (error) {
        console.error(error)
        toast.error("Erro ao criar usuário.", { description: "Verifique os dados e tente novamente." })
    } finally {
        setCreateLoading(false)
    }
  }

  const handleDeleteUser = async (id: string) => {
      if(!confirm("Tem certeza que deseja excluir este usuário?")) return;
      try {
        const token = localStorage.getItem('token')
        const response = await fetch(`http://localhost:3000/users/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        })
        if (!response.ok) throw new Error('Erro ao excluir')
        fetchUsers()
      } catch (error) {
          console.error(error)
      }
  }

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <RoleGate allowedRoles={['ADMIN', 'MANAGER']}>
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Gerenciamento de Usuários</h1>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                  <Plus className="h-4 w-4" /> Novo Usuário
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Criar Novo Usuário</DialogTitle>
                <DialogDescription>
                  Adicione um novo usuário ao sistema. Clique em salvar quando terminar.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateUser}>
                  <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="name" className="text-right">Nome</Label>
                      <Input id="name" value={newName} onChange={e => setNewName(e.target.value)} className="col-span-3" required />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="email" className="text-right">Email</Label>
                      <Input id="email" type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="col-span-3" required />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="password" className="text-right">Senha</Label>
                      <Input id="password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="col-span-3" required minLength={6} />
                  </div>
                  </div>
                  <DialogFooter>
                  <Button type="submit" disabled={createLoading}>
                      {createLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Salvar Usuário"}
                  </Button>
                  </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Listagem de Usuários</CardTitle>
            <CardDescription>
              Visualize e gerencie todos os usuários cadastrados no sistema.
            </CardDescription>
            <div className="relative pt-2">
              <Search className="absolute left-2.5 top-5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar por nome ou email..."
                className="pl-8 sm:w-[300px] md:w-[200px] lg:w-[300px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
              {loading ? (
                  <div className="flex justify-center p-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
              ) : (
                  <Table>
                      <TableHeader>
                      <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Data de Criação</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                      </TableHeader>
                      <TableBody>
                      {filteredUsers.map((user) => (
                          <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{new Date(user.createdAt).toLocaleDateString('pt-BR')}</TableCell>
                          <TableCell className="text-right">
                              <Button variant="ghost" size="icon" onClick={() => {}}>
                                  <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => handleDeleteUser(user.id)}>
                                  <Trash2 className="h-4 w-4" />
                              </Button>
                          </TableCell>
                          </TableRow>
                      ))}
                      {filteredUsers.length === 0 && (
                          <TableRow>
                              <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                  Nenhum usuário encontrado.
                              </TableCell>
                          </TableRow>
                      )}
                      </TableBody>
                  </Table>
              )}
          </CardContent>
        </Card>
      </div>
    </RoleGate>
  )
}
