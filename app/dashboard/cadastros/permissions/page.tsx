'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Edit, Loader2, Plus, Search, Shield, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'

type RoleListItem = {
  id: string
  name: string
  description: string | null
  isSystem: boolean
  permissions: Array<{ id: string; slug: string }>
  _count?: {
    employees?: number
  }
}

export default function ProfilesPage() {
  const [roles, setRoles] = useState<RoleListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const fetchRoles = async () => {
    try {
      setLoading(true)
      const { data } = await api.get('/roles')
      setRoles(data)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Nao foi possivel carregar os perfis.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRoles()
  }, [])

  const handleDelete = async (role: RoleListItem) => {
    if (role.isSystem) {
      return
    }

    if (!confirm(`Deseja excluir o perfil "${role.name}"?`)) {
      return
    }

    try {
      await api.delete(`/roles/${role.id}`)
      toast.success('Perfil excluido com sucesso.')
      await fetchRoles()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Nao foi possivel excluir o perfil.'))
    }
  }

  const filteredRoles = roles.filter((role) => {
    const haystack = [role.name, role.description ?? ''].join(' ').toLowerCase()
    return haystack.includes(searchTerm.toLowerCase())
  })

  return (
    <div className="app-page">
      <section className="app-page-header">
        <div className="space-y-2">
          <p className="app-kicker">Cadastros</p>
          <h1 className="app-title">Gestao de Permissoes</h1>
          <p className="app-subtitle">
            Organize os perfis de acesso do sistema e mantenha a distribuicao de
            permissoes clara para a operacao.
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/dashboard/cadastros/permissions/new">
            <Plus className="h-4 w-4" />
            Novo perfil
          </Link>
        </Button>
      </section>

      <Card className="app-section-card">
        <CardHeader className="pb-3">
          <div className="app-toolbar flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Perfis cadastrados</CardTitle>
              <p className="text-sm text-muted-foreground">
                Consulte o uso de cada perfil, identifique perfis de sistema e acione a
                manutencao quando necessario.
              </p>
            </div>
            <div className="relative w-full md:w-[280px]">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar por nome ou descricao..."
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex min-h-[240px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Permissoes</TableHead>
                  <TableHead>Usuarios vinculados</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRoles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                      Nenhum perfil encontrado para o filtro informado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRoles.map((role) => (
                    <TableRow key={role.id}>
                      <TableCell className="align-top">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">{role.name}</span>
                            {role.isSystem ? (
                              <Badge variant="secondary" className="gap-1">
                                <Shield className="h-3 w-3" />
                                Sistema
                              </Badge>
                            ) : null}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {role.description || 'Sem descricao informada.'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{role.permissions?.length || 0}</span>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                          <Users className="h-4 w-4" />
                          {role._count?.employees || 0}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={role.isSystem ? 'secondary' : 'outline'}>
                          {role.isSystem ? 'Protegido' : 'Customizado'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button asChild variant="outline" size="sm" className="gap-2">
                            <Link href={`/dashboard/cadastros/permissions/${role.id}/edit`}>
                              <Edit className="h-3.5 w-3.5" />
                              Editar
                            </Link>
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={() => handleDelete(role)}
                            disabled={role.isSystem}
                            title={
                              role.isSystem
                                ? 'Perfis de sistema nao podem ser excluidos.'
                                : 'Excluir perfil'
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
