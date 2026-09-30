'use client'

import { useEffect, useMemo, useState } from 'react'
import _ from 'lodash'
import {
  AlertTriangle,
  Ban,
  Check,
  ChevronLeft,
  ChevronRight,
  Crown,
  Info,
  Layers,
  Loader2,
  RotateCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Undo2,
  UserCheck,
  UserCog,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'
import { useAuth } from '@/context/auth-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { FilterPopover } from '@/components/ui/filter-popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

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
    roleId?: string | null
    role: { id: string; name: string; permissions: Permission[] } | null
    secondaryRoles?: Array<{
      role: { id: string; name: string }
    }>
  }>
  externalDriver?: { id: string; status: string } | null
  directPermissionGrants: Array<{
    id: string
    type?: 'GRANT' | 'DENY'
    permission: Permission
    grantedBy?: { id: string; name: string } | null
  }>
}

type EffectivePermissionsResponse = {
  effectivePermissions: string[]
  inheritedGrants: Array<{
    slug: string
    source: 'PRIMARY_ROLE' | 'SECONDARY_ROLE'
    roleName: string
    roleId: string
  }>
  inheritedDenies: Array<{
    slug: string
    source: 'PRIMARY_ROLE' | 'SECONDARY_ROLE'
    roleName: string
    roleId: string
  }>
  directGrants: Array<{
    slug: string
    grantedBy: { id: string; name: string } | null
    createdAt: string
  }>
  directDenies: Array<{
    slug: string
    grantedBy: { id: string; name: string } | null
    createdAt: string
  }>
  deniedPermissions: string[]
}

const ITEMS_PER_PAGE = 10

function getInitials(name?: string | null) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function getAccessTypeBadge(accessType: UserRecord['accessType']) {
  switch (accessType) {
    case 'SAAS_ADMIN':
      return {
        label: 'Admin SaaS',
        className:
          'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
      }
    case 'COMPANY_ADMIN':
      return {
        label: 'Admin Empresa',
        className:
          'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800',
      }
    case 'EXTERNAL_DRIVER':
      return {
        label: 'Motorista Externo',
        className:
          'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
      }
    case 'EMPLOYEE':
    default:
      return {
        label: 'Funcionário',
        className:
          'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-800',
      }
  }
}

export default function UsersPage() {
  const { hasPermission } = useAuth()
  const canView = hasPermission('system.users.view')
  const canManage = hasPermission('system.users.manage')

  const [users, setUsers] = useState<UserRecord[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Filters state (managed via FilterPopover)
  const [filterSearch, setFilterSearch] = useState('')
  const [filterAccessType, setFilterAccessType] = useState('ALL')
  const [filterExceptionType, setFilterExceptionType] = useState('ALL')
  const [currentPage, setCurrentPage] = useState(1)

  // Modal editing state
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null)
  const [effectiveData, setEffectiveData] = useState<EffectivePermissionsResponse | null>(null)
  const [loadingEffective, setLoadingEffective] = useState(false)
  const [directEntries, setDirectEntries] = useState<Record<string, 'GRANT' | 'DENY'>>({})

  // Modal navigation & filters
  const [modalSearch, setModalSearch] = useState('')
  const [modalCategory, setModalCategory] = useState<string>('ALL')
  const [effectiveSearch, setEffectiveSearch] = useState('')
  const [effectiveCategory, setEffectiveCategory] = useState<string>('ALL')

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

  // Summary Metrics (KPIs)
  const kpiStats = useMemo(() => {
    let withExceptions = 0
    let withDeny = 0
    let admins = 0

    users.forEach((u) => {
      const grants = u.directPermissionGrants || []
      if (grants.length > 0) withExceptions++
      if (grants.some((g) => g.type === 'DENY')) withDeny++
      if (u.accessType === 'SAAS_ADMIN' || u.accessType === 'COMPANY_ADMIN') admins++
    })

    return {
      total: users.length,
      withExceptions,
      withDeny,
      admins,
    }
  }, [users])

  // Count active filters for FilterPopover
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filterSearch.trim()) count++
    if (filterAccessType !== 'ALL') count++
    if (filterExceptionType !== 'ALL') count++
    return count
  }, [filterSearch, filterAccessType, filterExceptionType])

  const handleClearFilters = () => {
    setFilterSearch('')
    setFilterAccessType('ALL')
    setFilterExceptionType('ALL')
    setCurrentPage(1)
  }

  // Filtered Users list
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (filterSearch.trim()) {
        const query = filterSearch.toLowerCase()
        const matchName = u.name.toLowerCase().includes(query)
        const matchEmail = u.email.toLowerCase().includes(query)
        if (!matchName && !matchEmail) return false
      }

      if (filterAccessType !== 'ALL' && u.accessType !== filterAccessType) {
        return false
      }

      if (filterExceptionType === 'WITH_EXCEPTIONS') {
        if (!u.directPermissionGrants || u.directPermissionGrants.length === 0) return false
      } else if (filterExceptionType === 'WITH_DENY') {
        if (!u.directPermissionGrants?.some((g) => g.type === 'DENY')) return false
      } else if (filterExceptionType === 'STANDARD') {
        if (u.directPermissionGrants && u.directPermissionGrants.length > 0) return false
      }

      return true
    })
  }, [users, filterSearch, filterAccessType, filterExceptionType])

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE) || 1
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredUsers.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredUsers, currentPage])

  // Open modal for a specific user
  const openPermissions = async (user: UserRecord) => {
    setSelectedUser(user)
    setModalSearch('')
    setModalCategory('ALL')
    setEffectiveSearch('')
    setEffectiveCategory('ALL')

    try {
      setLoadingEffective(true)
      const { data } = await api.get<EffectivePermissionsResponse>(
        `/users/${user.id}/effective-permissions`,
      )
      setEffectiveData(data)

      const initialEntries: Record<string, 'GRANT' | 'DENY'> = {}
      data.directGrants.forEach((g) => {
        initialEntries[g.slug] = 'GRANT'
      })
      data.directDenies.forEach((d) => {
        initialEntries[d.slug] = 'DENY'
      })
      setDirectEntries(initialEntries)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Erro ao carregar permissões detalhadas do usuário.'))
    } finally {
      setLoadingEffective(false)
    }
  }

  // Maps for inherited permissions
  const inheritedGrantsMap = useMemo(() => {
    const map = new Map<string, { source: string; roleName: string }>()
    effectiveData?.inheritedGrants.forEach((g) => {
      map.set(g.slug, { source: g.source, roleName: g.roleName })
    })
    return map
  }, [effectiveData])

  const inheritedDeniesMap = useMemo(() => {
    const map = new Map<string, { source: string; roleName: string }>()
    effectiveData?.inheritedDenies.forEach((d) => {
      map.set(d.slug, { source: d.source, roleName: d.roleName })
    })
    return map
  }, [effectiveData])

  // Calculation of effective preview in modal
  const simulatedEffectiveSlugs = useMemo(() => {
    const grants = new Set<string>()
    effectiveData?.inheritedGrants.forEach((g) => grants.add(g.slug))
    Object.entries(directEntries).forEach(([slug, type]) => {
      if (type === 'GRANT') grants.add(slug)
    })

    const denies = new Set<string>()
    effectiveData?.inheritedDenies.forEach((d) => denies.add(d.slug))
    Object.entries(directEntries).forEach(([slug, type]) => {
      if (type === 'DENY') denies.add(slug)
    })

    for (const d of denies) {
      grants.delete(d)
    }

    return Array.from(grants).sort()
  }, [effectiveData, directEntries])

  // Detected conflicts: DENY overriding inherited GRANT
  const conflictsCount = useMemo(() => {
    let count = 0
    Object.entries(directEntries).forEach(([slug, type]) => {
      if (type === 'DENY' && inheritedGrantsMap.has(slug)) {
        count++
      }
    })
    return count
  }, [directEntries, inheritedGrantsMap])

  // Unique groups for permission tabs/pills
  const permissionCategories = useMemo(() => {
    const categories = Array.from(new Set(permissions.map((p) => p.group))).sort()
    return categories
  }, [permissions])

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    permissions.forEach((p) => {
      counts[p.group] = (counts[p.group] || 0) + 1
    })
    return counts
  }, [permissions])

  // Filtered permission items inside modal
  const filteredModalPermissions = useMemo(() => {
    return permissions.filter((item) => {
      if (modalCategory === '__MODIFIED__') {
        if (!directEntries[item.slug]) return false
      } else if (modalCategory === '__CONFLICTS__') {
        if (directEntries[item.slug] !== 'DENY' || !inheritedGrantsMap.has(item.slug)) {
          return false
        }
      } else if (modalCategory !== 'ALL' && item.group !== modalCategory) {
        return false
      }

      if (modalSearch.trim()) {
        const query = modalSearch.toLowerCase()
        const matchDesc = item.description.toLowerCase().includes(query)
        const matchSlug = item.slug.toLowerCase().includes(query)
        const matchGroup = item.group.toLowerCase().includes(query)
        if (!matchDesc && !matchSlug && !matchGroup) return false
      }

      return true
    })
  }, [permissions, modalCategory, modalSearch, directEntries, inheritedGrantsMap])

  // Filtered effective items
  const filteredEffectiveSlugs = useMemo(() => {
    return simulatedEffectiveSlugs.filter((slug) => {
      const perm = permissions.find((p) => p.slug === slug)
      if (effectiveCategory !== 'ALL' && perm && perm.group !== effectiveCategory) {
        return false
      }

      if (effectiveSearch.trim()) {
        const query = effectiveSearch.toLowerCase()
        return (
          slug.toLowerCase().includes(query) ||
          (perm && perm.description.toLowerCase().includes(query))
        )
      }

      return true
    })
  }, [simulatedEffectiveSlugs, effectiveSearch, effectiveCategory, permissions])

  const setDirectType = (slug: string, type: 'GRANT' | 'DENY' | null) => {
    if (!canManage) return
    setDirectEntries((current) => {
      const next = { ...current }
      if (type === null) {
        delete next[slug]
      } else {
        next[slug] = type
      }
      return next
    })
  }

  const resetCategoryToDefault = (category: string) => {
    if (!canManage) return
    const permsInCat =
      category === 'ALL'
        ? permissions
        : permissions.filter((p) => p.group === category)

    setDirectEntries((current) => {
      const next = { ...current }
      permsInCat.forEach((p) => {
        delete next[p.slug]
      })
      return next
    })
    toast.info('Permissões da categoria redefinidas para o padrão.')
  }

  const savePermissions = async () => {
    if (!selectedUser) return
    try {
      setSaving(true)
      const entries = Object.entries(directEntries).map(([slug, type]) => ({
        slug,
        type,
      }))
      const permissionSlugs = entries
        .filter((e) => e.type === 'GRANT')
        .map((e) => e.slug)

      await api.put(`/users/${selectedUser.id}/permissions`, {
        entries,
        permissionSlugs,
      })
      toast.success('Permissões individuais atualizadas com sucesso.')
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

  const directGrantsCount = Object.values(directEntries).filter((t) => t === 'GRANT').length
  const directDeniesCount = Object.values(directEntries).filter((t) => t === 'DENY').length

  return (
    <div className="app-page space-y-6">
      {/* 1. Page Header com TocLog Screen Standard */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Usuários e Permissões
          </h1>
          <p className="text-sm text-muted-foreground">
            Consulte contas de usuários, perfis vinculados e gerencie exceções individuais com cálculo determinístico (GRANT / DENY).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Menu Flutuante de Filtro */}
          <FilterPopover
            activeCount={activeFilterCount}
            onClear={handleClearFilters}
            onApply={() => setCurrentPage(1)}
            contentClassName="sm:w-[420px]"
          >
            <div className="space-y-4">
              <div className="space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Palavra-chave
                </span>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    className="pl-9 h-9 text-sm"
                    placeholder="Buscar por nome ou e-mail..."
                    value={filterSearch}
                    onChange={(e) => {
                      setFilterSearch(e.target.value)
                      setCurrentPage(1)
                    }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Tipo de Acesso
                </span>
                <Select
                  value={filterAccessType}
                  onValueChange={(v) => {
                    setFilterAccessType(v)
                    setCurrentPage(1)
                  }}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Todos os tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos os tipos</SelectItem>
                    <SelectItem value="EMPLOYEE">Funcionário</SelectItem>
                    <SelectItem value="EXTERNAL_DRIVER">Motorista Externo</SelectItem>
                    <SelectItem value="COMPANY_ADMIN">Administrador Empresa</SelectItem>
                    <SelectItem value="SAAS_ADMIN">Administrador SaaS</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Situação das Exceções
                </span>
                <Select
                  value={filterExceptionType}
                  onValueChange={(v) => {
                    setFilterExceptionType(v)
                    setCurrentPage(1)
                  }}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Todas as situações" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todas as situações</SelectItem>
                    <SelectItem value="WITH_EXCEPTIONS">Apenas com Exceções Diretas</SelectItem>
                    <SelectItem value="WITH_DENY">Apenas com Bloqueios (DENY)</SelectItem>
                    <SelectItem value="STANDARD">Apenas Padrão (Sem Exceções)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </FilterPopover>

          {/* Botão Atualizar */}
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            onClick={() => void load()}
            disabled={loading}
          >
            <RotateCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </Button>
        </div>
      </section>

      {/* 2. Cards de Resumo (KPIs em 4 colunas padrão TocLog) */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total de Contas
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {kpiStats.total}
            </span>
          </CardContent>
        </Card>

        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Com Exceções
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {kpiStats.withExceptions}
            </span>
            {kpiStats.withExceptions > 0 && (
              <span className="rounded-md bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-400">
                Personalizados
              </span>
            )}
          </CardContent>
        </Card>

        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Bloqueios (DENY)
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {kpiStats.withDeny}
            </span>
            {kpiStats.withDeny > 0 && (
              <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                Ação necessária
              </span>
            )}
          </CardContent>
        </Card>

        <Card className="app-section-card p-4 transition-all hover:shadow-xs">
          <CardHeader className="p-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Administradores
            </span>
          </CardHeader>
          <CardContent className="p-0 pt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {kpiStats.admins}
            </span>
            <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              Bypass DENY
            </span>
          </CardContent>
        </Card>
      </section>

      {/* 3. Tabela Responsiva Sem Scroll Horizontal */}
      <Card className="app-section-card overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex min-h-[320px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
              <Users className="size-10 text-muted-foreground/50" />
              <p className="font-semibold text-foreground">Nenhum usuário encontrado</p>
              <p className="text-xs">Tente ajustar os filtros ou os termos de pesquisa.</p>
              {activeFilterCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearFilters}
                  className="mt-2 text-xs"
                >
                  Limpar filtros
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[48px]"></TableHead>
                  <TableHead className="min-w-[240px]">Usuário</TableHead>
                  <TableHead className="min-w-[170px]">Tipo de Acesso</TableHead>
                  <TableHead className="min-w-[220px]">Perfil Funcional</TableHead>
                  <TableHead className="min-w-[190px]">Exceções de Acesso</TableHead>
                  <TableHead className="w-[140px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUsers.map((user) => {
                  const grantCount = user.directPermissionGrants.filter(
                    (g) => g.type !== 'DENY',
                  ).length
                  const denyCount = user.directPermissionGrants.filter(
                    (g) => g.type === 'DENY',
                  ).length
                  const primaryEmployee = user.employees[0]
                  const roleName = primaryEmployee?.role?.name
                  const secondaryRoles = primaryEmployee?.secondaryRoles || []
                  const accessBadge = getAccessTypeBadge(user.accessType)

                  return (
                    <TableRow key={user.id} className="transition-colors hover:bg-muted/40">
                      {/* Avatar com Iniciais */}
                      <TableCell className="w-[48px] pr-0">
                        <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {getInitials(user.name)}
                        </span>
                      </TableCell>

                      {/* Usuário / Subtítulo */}
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="font-medium text-foreground">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </TableCell>

                      {/* Tipo de Acesso */}
                      <TableCell>
                        <span
                          className={cn(
                            'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
                            accessBadge.className,
                          )}
                        >
                          {accessBadge.label}
                        </span>
                      </TableCell>

                      {/* Perfil Funcional */}
                      <TableCell>
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-foreground">
                            {roleName ?? 'Sem perfil funcional'}
                          </p>
                          {secondaryRoles.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1">
                              {secondaryRoles.map((sr) => (
                                <Badge
                                  key={sr.role.id}
                                  variant="secondary"
                                  className="text-[10px] py-0 px-1.5 h-4 font-normal"
                                >
                                  + {sr.role.name}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* Exceções de Acesso */}
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {grantCount > 0 && (
                            <Badge
                              variant="outline"
                              className="border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 text-[11px] py-0 font-medium"
                            >
                              +{grantCount} GRANT
                            </Badge>
                          )}
                          {denyCount > 0 && (
                            <Badge
                              variant="outline"
                              className="border-rose-500/30 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 text-[11px] py-0 font-medium"
                            >
                              -{denyCount} DENY
                            </Badge>
                          )}
                          {grantCount === 0 && denyCount === 0 && (
                            <span className="text-xs text-muted-foreground">Padrão</span>
                          )}
                        </div>
                      </TableCell>

                      {/* Ação Direta Compacta */}
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5 border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground font-semibold text-xs"
                          onClick={() => openPermissions(user)}
                        >
                          <Shield className="size-3.5" />
                          <span>Permissões</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}

          {/* 4. Rodapé com Paginação Integrada Padrão TocLog */}
          {filteredUsers.length > 0 && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-6 py-4 border-t bg-muted/10 text-xs text-muted-foreground">
              <div>
                Exibindo <span className="font-semibold text-foreground">{paginatedUsers.length}</span> de{' '}
                <span className="font-semibold text-foreground">{filteredUsers.length}</span> registros
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="size-8"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="size-4" />
                </Button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <Button
                    key={pageNum}
                    variant={pageNum === currentPage ? 'default' : 'outline'}
                    size="icon-sm"
                    className={`size-8 font-medium ${pageNum === currentPage ? 'pointer-events-none' : ''}`}
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                ))}

                <Button
                  variant="outline"
                  size="icon-sm"
                  className="size-8"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 5. Modal de Edição Reformulado (Amplo, Espaçoso e com Layout Master-Detail) */}
      <Dialog open={Boolean(selectedUser)} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="w-[96vw] sm:max-w-5xl lg:max-w-6xl xl:max-w-7xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl border-border/80">
          {/* Header Fixo com Identidade do Usuário e Metadados */}
          <DialogHeader className="p-5 px-6 border-b border-border/80 bg-muted/30 shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-base font-bold text-primary ring-2 ring-primary/20 shrink-0">
                  {getInitials(selectedUser?.name)}
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                      {selectedUser?.name}
                    </DialogTitle>
                    {selectedUser && (
                      <span
                        className={cn(
                          'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold',
                          getAccessTypeBadge(selectedUser.accessType).className,
                        )}
                      >
                        {getAccessTypeBadge(selectedUser.accessType).label}
                      </span>
                    )}
                  </div>
                  <DialogDescription className="text-xs text-muted-foreground mt-1 flex flex-wrap items-center gap-2">
                    <span>{selectedUser?.email}</span>
                    <span>&bull;</span>
                    <span className="flex items-center gap-1 font-medium text-foreground">
                      <Crown className="size-3 text-amber-500" />
                      Perfil: {selectedUser?.employees[0]?.role?.name ?? 'Sem perfil funcional'}
                    </span>
                    {selectedUser?.employees[0]?.secondaryRoles &&
                      selectedUser.employees[0].secondaryRoles.length > 0 && (
                        <>
                          <span>&bull;</span>
                          <span className="text-muted-foreground">
                            Secundários:{' '}
                            {selectedUser.employees[0].secondaryRoles
                              .map((sr) => sr.role.name)
                              .join(', ')}
                          </span>
                        </>
                      )}
                  </DialogDescription>
                </div>
              </div>

              {/* Indicadores no Topo */}
              <div className="flex items-center gap-2 self-start sm:self-center">
                <Badge variant="outline" className="text-xs py-1 px-2.5 font-medium border-border/80">
                  {permissions.length} no Catálogo
                </Badge>
                <Badge
                  variant="outline"
                  className="text-xs py-1 px-2.5 font-medium border-emerald-500/30 bg-emerald-50/50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                >
                  <ShieldCheck className="size-3.5 mr-1 text-emerald-600" />
                  {simulatedEffectiveSlugs.length} Efetivas
                </Badge>
                {conflictsCount > 0 && (
                  <Badge
                    variant="outline"
                    className="text-xs py-1 px-2.5 font-semibold border-rose-500/30 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                  >
                    <AlertTriangle className="size-3.5 mr-1 text-rose-600" />
                    {conflictsCount} Conflito(s)
                  </Badge>
                )}
              </div>
            </div>
          </DialogHeader>

          {/* Conteúdo com Tabs e Rolagem Central */}
          {loadingEffective ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : (
            <Tabs defaultValue="direct" className="flex flex-1 flex-col overflow-hidden">
              {/* Abas Superiores com Design TocLog */}
              <div className="px-6 border-b border-border/70 bg-background/80 shrink-0">
                <TabsList className="grid w-full grid-cols-2 max-w-lg h-10 p-1 bg-muted/60">
                  <TabsTrigger value="direct" className="text-xs font-semibold gap-1.5 data-[state=active]:shadow-xs">
                    <Shield className="size-3.5" />
                    <span>Concessões e Negações ({Object.keys(directEntries).length})</span>
                  </TabsTrigger>
                  <TabsTrigger value="effective" className="text-xs font-semibold gap-1.5 data-[state=active]:shadow-xs">
                    <ShieldCheck className="size-3.5 text-emerald-600" />
                    <span>Resultado Efetivo ({simulatedEffectiveSlugs.length})</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Aba 1: Exceções Individuais (Layout Master-Detail Espaçoso) */}
              <TabsContent value="direct" className="flex flex-1 overflow-hidden m-0 focus-visible:outline-none">
                {/* 1.1 Sidebar de Módulos / Categorias à Esquerda */}
                <aside className="w-72 shrink-0 border-r border-border/80 bg-muted/20 flex flex-col justify-between overflow-hidden">
                  <div className="p-3 border-b border-border/60 bg-muted/30 space-y-2">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                      <Input
                        value={modalSearch}
                        onChange={(e) => setModalSearch(e.target.value)}
                        placeholder="Buscar permissão..."
                        className="pl-8 h-8 text-xs bg-background"
                      />
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {/* Botão Todas */}
                    <button
                      type="button"
                      onClick={() => setModalCategory('ALL')}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-all text-left',
                        modalCategory === 'ALL'
                          ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                          : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <Layers className="size-3.5" />
                        <span>Todas as Permissões</span>
                      </span>
                      <span
                        className={cn(
                          'text-[11px] px-1.5 py-0.5 rounded-full font-mono',
                          modalCategory === 'ALL'
                            ? 'bg-primary-foreground/20 text-primary-foreground'
                            : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {permissions.length}
                      </span>
                    </button>

                    {/* Botão Apenas Modificadas */}
                    <button
                      type="button"
                      onClick={() => setModalCategory('__MODIFIED__')}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-all text-left',
                        modalCategory === '__MODIFIED__'
                          ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                          : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <Check className="size-3.5" />
                        <span>Exceções Modificadas</span>
                      </span>
                      <span
                        className={cn(
                          'text-[11px] px-1.5 py-0.5 rounded-full font-mono font-bold',
                          modalCategory === '__MODIFIED__'
                            ? 'bg-primary-foreground/20 text-primary-foreground'
                            : Object.keys(directEntries).length > 0
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                            : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {Object.keys(directEntries).length}
                      </span>
                    </button>

                    {/* Botão Com Conflitos se houver */}
                    {conflictsCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setModalCategory('__CONFLICTS__')}
                        className={cn(
                          'w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-all text-left',
                          modalCategory === '__CONFLICTS__'
                            ? 'bg-rose-600 text-white font-semibold shadow-xs'
                            : 'text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30',
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <AlertTriangle className="size-3.5 text-rose-500" />
                          <span>Com Bloqueios (DENY)</span>
                        </span>
                        <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-rose-500/20 font-mono font-bold">
                          {conflictsCount}
                        </span>
                      </button>
                    )}

                    <div className="pt-2 pb-1 px-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                        Módulos do Sistema
                      </span>
                    </div>

                    {/* Lista de Categorias */}
                    {permissionCategories.map((cat) => {
                      const count = categoryCounts[cat] || 0
                      const modifiedInCat = permissions.filter(
                        (p) => p.group === cat && directEntries[p.slug],
                      ).length

                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setModalCategory(cat)}
                          className={cn(
                            'w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-all text-left',
                            modalCategory === cat
                              ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                              : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                          )}
                        >
                          <span className="truncate pr-1">{cat}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {modifiedInCat > 0 && modalCategory !== cat && (
                              <span className="size-1.5 rounded-full bg-emerald-500" />
                            )}
                            <span
                              className={cn(
                                'text-[11px] px-1.5 py-0.5 rounded-full font-mono',
                                modalCategory === cat
                                  ? 'bg-primary-foreground/20 text-primary-foreground'
                                  : 'bg-muted text-muted-foreground',
                              )}
                            >
                              {count}
                            </span>
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  {/* Resumo no rodapé da sidebar */}
                  <div className="p-3 border-t border-border/60 bg-muted/40 text-[11px] text-muted-foreground">
                    <div className="flex justify-between items-center">
                      <span>Concessões (GRANT):</span>
                      <strong className="text-emerald-600 font-mono">+{directGrantsCount}</strong>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span>Bloqueios (DENY):</span>
                      <strong className="text-rose-600 font-mono">-{directDeniesCount}</strong>
                    </div>
                  </div>
                </aside>

                {/* 1.2 Área Principal Ampla de Edição de Permissões */}
                <main className="flex-1 flex flex-col overflow-hidden bg-background">
                  {/* Top Bar da Área de Conteúdo */}
                  <div className="p-4 px-6 border-b border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/10 shrink-0">
                    <div>
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                        {modalCategory === 'ALL'
                          ? 'Todas as Permissões'
                          : modalCategory === '__MODIFIED__'
                          ? 'Exceções Modificadas'
                          : modalCategory === '__CONFLICTS__'
                          ? 'Permissões com Bloqueio (DENY)'
                          : `Módulo: ${modalCategory}`}
                        <span className="text-xs font-normal text-muted-foreground">
                          ({filteredModalPermissions.length} listadas)
                        </span>
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Defina o comportamento individual. A negação explícita (DENY) sempre tem prioridade sobre concessões.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {modalCategory !== 'ALL' && modalCategory !== '__MODIFIED__' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                          onClick={() => resetCategoryToDefault(modalCategory)}
                        >
                          <Undo2 className="size-3.5" />
                          <span>Resetar Módulo</span>
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Banner de Conflito em destaque */}
                  {conflictsCount > 0 && modalCategory !== '__CONFLICTS__' && (
                    <div className="mx-6 mt-4 flex items-start gap-3 rounded-lg border border-rose-500/30 bg-rose-50/60 p-3.5 text-xs text-rose-900 dark:bg-rose-950/40 dark:text-rose-200 shrink-0">
                      <AlertTriangle className="size-4 shrink-0 text-rose-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-semibold">
                          Atenção: Existem {conflictsCount} bloqueio(s) explícito(s) (DENY) sobrepondo o perfil deste usuário.
                        </p>
                        <p className="mt-0.5 text-rose-700/90 dark:text-rose-300/80">
                          Pela regra <strong>DENY SEMPRE VENCE</strong>, as concessões do perfil para estas ações não produzirão efeito.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Lista de Permissões com Excelente Espaçamento e Ergonomia */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-2.5">
                    {filteredModalPermissions.length === 0 ? (
                      <div className="flex flex-col items-center justify-center min-h-[300px] text-center text-muted-foreground p-6">
                        <Shield className="size-10 text-muted-foreground/30 mb-2" />
                        <p className="font-semibold text-foreground">Nenhuma permissão encontrada</p>
                        <p className="text-xs mt-1">
                          Nenhum item corresponde ao módulo ou ao termo pesquisado.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3 text-xs"
                          onClick={() => {
                            setModalSearch('')
                            setModalCategory('ALL')
                          }}
                        >
                          Mostrar todas as permissões
                        </Button>
                      </div>
                    ) : (
                      filteredModalPermissions.map((item) => {
                        const inheritedGrant = inheritedGrantsMap.get(item.slug)
                        const inheritedDeny = inheritedDeniesMap.get(item.slug)
                        const directType = directEntries[item.slug] ?? null

                        return (
                          <div
                            key={item.id}
                            className={cn(
                              'flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl border transition-all duration-150',
                              directType === 'GRANT'
                                ? 'bg-emerald-500/[0.04] border-emerald-500/40 dark:bg-emerald-950/20'
                                : directType === 'DENY'
                                ? 'bg-rose-500/[0.04] border-rose-500/40 dark:bg-rose-950/20'
                                : 'bg-card border-border/80 hover:border-border hover:shadow-xs',
                            )}
                          >
                            {/* Lado Esquerdo: Nome, Descrição, Slug e Badges de Herança */}
                            <div className="space-y-1.5 flex-1 min-w-0 pr-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-semibold text-foreground">
                                  {item.description}
                                </span>

                                {/* Badge de Grupo / Módulo */}
                                <Badge variant="outline" className="text-[10px] py-0 px-2 h-4.5 font-normal text-muted-foreground">
                                  {item.group}
                                </Badge>

                                {/* Badges de Herança de Perfil */}
                                {inheritedGrant && (
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px] py-0 px-2 h-4.5 gap-1 font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                                  >
                                    <Crown className="size-2.5 text-amber-500" />
                                    <span>Perfil: {inheritedGrant.roleName}</span>
                                  </Badge>
                                )}

                                {inheritedDeny && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] py-0 px-2 h-4.5 border-rose-500/30 text-rose-700 bg-rose-50 dark:bg-rose-950/40"
                                  >
                                    DENY no perfil ({inheritedDeny.roleName})
                                  </Badge>
                                )}

                                {directType === 'DENY' && inheritedGrant && (
                                  <Badge
                                    variant="destructive"
                                    className="text-[9px] py-0 px-1.5 h-4 gap-1 font-bold animate-pulse"
                                  >
                                    <Ban className="size-2.5" />
                                    <span>Bloqueio Ativo</span>
                                  </Badge>
                                )}
                              </div>

                              <p className="text-xs text-muted-foreground font-mono">
                                {item.slug}
                              </p>
                            </div>

                            {/* Lado Direito: Seletor Segmentado de 3 Estados Amplo e Espaçoso */}
                            <div className="flex items-center rounded-lg border border-border/80 bg-muted/40 p-1 gap-1 shrink-0 self-start md:self-center shadow-xs">
                              {/* Botão Padrão */}
                              <button
                                type="button"
                                disabled={!canManage}
                                onClick={() => setDirectType(item.slug, null)}
                                className={cn(
                                  'px-3.5 py-1.5 text-xs font-medium rounded-md transition-all',
                                  !directType
                                    ? 'bg-background text-foreground shadow-xs font-semibold border border-border/60'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50',
                                )}
                              >
                                Padrão
                              </button>

                              {/* Botão Conceder */}
                              <button
                                type="button"
                                disabled={!canManage}
                                onClick={() => setDirectType(item.slug, 'GRANT')}
                                className={cn(
                                  'flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all',
                                  directType === 'GRANT'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'text-muted-foreground hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40',
                                )}
                              >
                                <Check className="size-3.5 stroke-[2.5]" />
                                <span>Conceder (GRANT)</span>
                              </button>

                              {/* Botão Negar */}
                              <button
                                type="button"
                                disabled={!canManage}
                                onClick={() => setDirectType(item.slug, 'DENY')}
                                className={cn(
                                  'flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all',
                                  directType === 'DENY'
                                    ? 'bg-rose-600 text-white shadow-xs'
                                    : 'text-muted-foreground hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40',
                                )}
                              >
                                <Ban className="size-3.5 stroke-[2.5]" />
                                <span>Negar (DENY)</span>
                              </button>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </main>
              </TabsContent>

              {/* Aba 2: Resultado Efetivo (Amplo, Limpo e com Filtro) */}
              <TabsContent value="effective" className="flex-1 overflow-y-auto p-6 space-y-6 m-0 focus-visible:outline-none">
                <div className="rounded-xl border border-border/80 bg-muted/20 p-5 text-xs text-muted-foreground space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-sm text-foreground flex items-center gap-2">
                      <ShieldCheck className="size-5 text-emerald-600" />
                      Cálculo Determinístico de Autorização Efetiva
                    </p>
                    <Badge variant="outline" className="text-xs px-2.5 py-0.5 font-semibold text-emerald-700 border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/30">
                      {simulatedEffectiveSlugs.length} Permissões Ativas
                    </Badge>
                  </div>
                  <p>
                    Estas são as capacidades efetivas ativas para este colaborador, calculadas pela fórmula autoritativa:
                  </p>
                  <code className="inline-block rounded-md bg-background border px-3 py-1.5 text-xs font-mono text-foreground font-semibold">
                    EFETIVO = (GRANTs Perfis ∪ GRANTs Individuais) − (DENYs Perfis ∪ DENYs Individuais)
                  </code>
                </div>

                {/* Filtros da aba Efetivas */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="relative flex-1 max-w-md">
                    <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      value={effectiveSearch}
                      onChange={(e) => setEffectiveSearch(e.target.value)}
                      placeholder="Buscar por descrição ou código slug..."
                      className="pl-9 h-9 text-xs"
                    />
                  </div>

                  {/* Filtro por Categoria */}
                  <div className="flex items-center gap-2">
                    <Select value={effectiveCategory} onValueChange={setEffectiveCategory}>
                      <SelectTrigger className="h-9 text-xs w-48">
                        <SelectValue placeholder="Módulo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Todos os Módulos</SelectItem>
                        {permissionCategories.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Grid Espaçoso em 2 Colunas */}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredEffectiveSlugs.length === 0 ? (
                    <div className="col-span-full p-12 text-center text-xs text-muted-foreground border rounded-xl bg-card">
                      Nenhuma permissão efetiva corresponde aos filtros.
                    </div>
                  ) : (
                    filteredEffectiveSlugs.map((slug) => {
                      const inherited = inheritedGrantsMap.get(slug)
                      const isDirect = directEntries[slug] === 'GRANT'
                      const permInfo = permissions.find((p) => p.slug === slug)

                      return (
                        <div
                          key={slug}
                          className="flex items-center justify-between gap-3 rounded-xl border border-border/80 bg-card p-3.5 shadow-xs hover:border-border transition-colors"
                        >
                          <div className="space-y-1 overflow-hidden min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">
                              {permInfo?.description || slug}
                            </p>
                            <p className="text-[11px] text-muted-foreground font-mono truncate">
                              {slug}
                            </p>
                          </div>
                          <div className="shrink-0">
                            {isDirect ? (
                              <Badge
                                variant="outline"
                                className="border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 text-[10px] py-0.5 font-semibold"
                              >
                                GRANT Direto
                              </Badge>
                            ) : inherited ? (
                              <Badge variant="secondary" className="text-[10px] py-0.5 font-medium">
                                {inherited.roleName}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] py-0.5 font-medium">
                                Admin Bypass
                              </Badge>
                            )}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}

          {/* Footer Fixo com Status e Botões de Ação */}
          <DialogFooter className="p-4 px-6 border-t border-border/80 bg-muted/20 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              {Object.keys(directEntries).length > 0 ? (
                <span>
                  <strong>{Object.keys(directEntries).length}</strong> exceção(ões) configurada(s) (
                  <span className="text-emerald-600 font-semibold font-mono">+{directGrantsCount} GRANT</span>,{' '}
                  <span className="text-rose-600 font-semibold font-mono">-{directDeniesCount} DENY</span>)
                </span>
              ) : (
                <span>Nenhuma exceção configurada (seguindo fielmente o padrão dos perfis vinculados).</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedUser(null)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                disabled={!canManage || saving || loadingEffective}
                onClick={savePermissions}
                className="gap-1.5 font-semibold px-4"
              >
                {saving && <Loader2 className="size-3.5 animate-spin" />}
                <span>Salvar Alterações</span>
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
