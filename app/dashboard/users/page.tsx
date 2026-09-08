'use client'

import { useEffect, useMemo, useState } from 'react'
import _ from 'lodash'
import { Loader2, Pencil, Search, ShieldCheck, UserCog } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'
import { useAuth } from '@/context/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type Permission = {
  id: string
  slug: string
  description: string
  group: string
}

type UserRecord = {
  id: string
  name: string
  email: string
  accessType: 'EMPLOYEE' | 'EXTERNAL_DRIVER' | 'COMPANY_ADMIN' | 'SAAS_ADMIN'
  employees: Array<{
    id: string
    role: { id: string; name: string; permissions: Permission[] } | null
  }>
  externalDriver?: { id: string; status: string } | null
  directPermissionGrants: Array<{
    id: string
    permission: Permission
    grantedBy?: { id: string; name: string } | null
  }>
}

const accessTypeLabels: Record<UserRecord['accessType'], string> = {
  EMPLOYEE: 'Funcionário',
  EXTERNAL_DRIVER: 'Motorista externo',
  COMPANY_ADMIN: 'Administrador da empresa',
  SAAS_ADMIN: 'Administrador SaaS',
}

export default function UsersPage() {
  const { hasPermission } = useAuth()
  const canView = hasPermission('system.users.view')
  const canManage = hasPermission('system.users.manage')
  const [users, setUsers] = useState<UserRecord[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null)
  const [directSlugs, setDirectSlugs] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    if (!canView) {
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const [usersResponse, permissionsResponse] = await Promise.all([
        api.get<UserRecord[]>('/users'),
        api.get<Permission[]>('/roles/permissions'),
      ])
      setUsers(usersResponse.data)
      setPermissions(permissionsResponse.data)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível carregar os usuários.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [canView])

  const openPermissions = (user: UserRecord) => {
    setSelectedUser(user)
    setDirectSlugs(user.directPermissionGrants.map((grant) => grant.permission.slug))
  }

  const inheritedSlugs = useMemo(
    () => new Set(selectedUser?.employees[0]?.role?.permissions.map((item) => item.slug) ?? []),
    [selectedUser],
  )
  const effectiveSlugs = useMemo(
    () => new Set([...inheritedSlugs, ...directSlugs]),
    [inheritedSlugs, directSlugs],
  )
  const groupedPermissions = useMemo(
    () => _.groupBy(permissions, 'group'),
    [permissions],
  )
  const filteredUsers = users.filter((user) =>
    `${user.name} ${user.email}`.toLowerCase().includes(search.toLowerCase()),
  )

  const toggleDirectPermission = (slug: string) => {
    if (!canManage || inheritedSlugs.has(slug)) return
    setDirectSlugs((current) =>
      current.includes(slug)
        ? current.filter((item) => item !== slug)
        : [...current, slug],
    )
  }

  const savePermissions = async () => {
    if (!selectedUser) return
    try {
      setSaving(true)
      await api.put(`/users/${selectedUser.id}/permissions`, {
        permissionSlugs: directSlugs,
      })
      toast.success('Concessões individuais atualizadas.')
      setSelectedUser(null)
      await load()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível salvar as concessões.'))
    } finally {
      setSaving(false)
    }
  }

  if (!canView) {
    return (
      <div className="app-page">
        <Card className="app-section-card">
          <CardContent className="flex min-h-48 flex-col items-center justify-center gap-2 text-center">
            <UserCog className="h-8 w-8 text-muted-foreground" />
            <h1 className="text-lg font-semibold">Acesso restrito</h1>
            <p className="text-sm text-muted-foreground">Você não possui permissão para visualizar usuários.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="app-page">
      <div className="app-page-header">
        <div>
          <p className="app-kicker">Cadastros</p>
          <h1 className="app-title">Usuários e exceções de acesso</h1>
          <p className="app-description">Consulte o perfil herdado e conceda acessos adicionais sem alterar o escopo da conta.</p>
        </div>
      </div>

      <Card className="app-section-card">
        <CardHeader className="gap-3">
          <CardTitle>Contas no seu escopo</CardTitle>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome ou e-mail" className="pl-9" />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Tipo de acesso</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Concessões diretas</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </TableCell>
                    <TableCell>{accessTypeLabels[user.accessType]}</TableCell>
                    <TableCell>{user.employees[0]?.role?.name ?? 'Sem perfil funcional'}</TableCell>
                    <TableCell>{user.directPermissionGrants.length}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openPermissions(user)}>
                        <Pencil className="mr-2 h-4 w-4" /> Revisar acesso
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedUser)} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="max-h-[88vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Acesso de {selectedUser?.name}</DialogTitle>
            <DialogDescription>
              Permissões herdadas ficam bloqueadas. Marque somente as exceções adicionais necessárias.
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="direct">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="direct">Concessões individuais</TabsTrigger>
              <TabsTrigger value="effective">Resultado efetivo ({effectiveSlugs.size})</TabsTrigger>
            </TabsList>
            <TabsContent value="direct" className="space-y-4 pt-4">
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                A concessão adiciona capacidade ao perfil; ela não libera dados de outra empresa ou grupo.
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {Object.keys(groupedPermissions).sort().map((group) => (
                  <Card key={group} className="shadow-none">
                    <CardHeader className="border-b py-3"><CardTitle className="text-sm">{group}</CardTitle></CardHeader>
                    <CardContent className="divide-y p-0">
                      {groupedPermissions[group].map((item) => {
                        const inherited = inheritedSlugs.has(item.slug)
                        return (
                          <label key={item.id} className="flex cursor-pointer items-start gap-3 p-3">
                            <Checkbox
                              checked={inherited || directSlugs.includes(item.slug)}
                              disabled={!canManage || inherited}
                              onCheckedChange={() => toggleDirectPermission(item.slug)}
                            />
                            <span className="min-w-0 text-sm">
                              <span className="block font-medium">{item.description}</span>
                              <span className="block text-xs text-muted-foreground">{item.slug}{inherited ? ' · herdada do perfil' : ''}</span>
                            </span>
                          </label>
                        )
                      })}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
            <TabsContent value="effective" className="pt-4">
              <div className="grid gap-2 md:grid-cols-2">
                {[...effectiveSlugs].sort().map((slug) => (
                  <div key={slug} className="flex items-center gap-2 rounded-md border p-3 text-sm">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    <span>{slug}</span>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedUser(null)}>Cancelar</Button>
            <Button disabled={!canManage || saving} onClick={savePermissions}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar concessões
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
