'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import _ from 'lodash'
import {
  ArrowLeft,
  Ban,
  Check,
  Loader2,
  Save,
  ShieldAlert,
  ShieldCheck,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'
import { cn } from '@/lib/utils'

type PermissionCatalogItem = {
  id: string
  slug: string
  description: string | null
  group: string
}

type RoleFormValue = {
  name: string
  description: string
  permissionEntries: Record<string, 'GRANT' | 'DENY'>
}

type RoleFormProps = {
  mode: 'create' | 'edit'
  roleId?: string
}

type FieldErrors = Partial<Record<'name' | 'permissionEntries', string>>

export function RoleForm({ mode, roleId }: RoleFormProps) {
  const router = useRouter()
  const [permissions, setPermissions] = useState<PermissionCatalogItem[]>([])
  const [formData, setFormData] = useState<RoleFormValue>({
    name: '',
    description: '',
    permissionEntries: {},
  })
  const [loading, setLoading] = useState(true)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  useEffect(() => {
    const loadData = async () => {
      try {
        const permissionsPromise = api.get('/roles/permissions')
        const rolePromise = roleId ? api.get(`/roles/${roleId}`) : Promise.resolve(null)
        const [permissionsResponse, roleResponse] = await Promise.all([
          permissionsPromise,
          rolePromise,
        ])

        setPermissions(permissionsResponse.data)

        if (roleResponse?.data) {
          const entries: Record<string, 'GRANT' | 'DENY'> = {}

          if (
            roleResponse.data.permissionEntries &&
            Array.isArray(roleResponse.data.permissionEntries)
          ) {
            for (const item of roleResponse.data.permissionEntries) {
              if (item.permission?.slug) {
                entries[item.permission.slug] = item.type
              }
            }
          } else if (
            roleResponse.data.permissions &&
            Array.isArray(roleResponse.data.permissions)
          ) {
            for (const item of roleResponse.data.permissions) {
              if (item.slug) {
                entries[item.slug] = 'GRANT'
              }
            }
          }

          setFormData({
            name: roleResponse.data.name ?? '',
            description: roleResponse.data.description ?? '',
            permissionEntries: entries,
          })
        }
      } catch (error) {
        toast.error(
          getApiErrorMessage(error, 'Não foi possível carregar os dados do perfil.'),
        )
        router.push('/dashboard/cadastros/permissions')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [roleId, router])

  const groupedPermissions = _.groupBy(permissions, 'group')
  const sortedGroups = Object.keys(groupedPermissions).sort((left, right) =>
    left.localeCompare(right),
  )

  const grantCount = useMemo(
    () => Object.values(formData.permissionEntries).filter((t) => t === 'GRANT').length,
    [formData.permissionEntries],
  )

  const denyCount = useMemo(
    () => Object.values(formData.permissionEntries).filter((t) => t === 'DENY').length,
    [formData.permissionEntries],
  )

  const totalEntriesCount = grantCount + denyCount

  const validateForm = () => {
    const nextErrors: FieldErrors = {}

    if (!formData.name.trim()) {
      nextErrors.name = 'Informe o nome do perfil.'
    }

    if (totalEntriesCount === 0) {
      nextErrors.permissionEntries = 'Selecione ao menos uma permissão (Conceder ou Negar).'
    }

    setFieldErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const setPermissionState = (slug: string, type: 'GRANT' | 'DENY' | null) => {
    setFormData((current) => {
      const nextEntries = { ...current.permissionEntries }
      if (type === null) {
        delete nextEntries[slug]
      } else {
        nextEntries[slug] = type
      }
      return {
        ...current,
        permissionEntries: nextEntries,
      }
    })

    setFieldErrors((current) => ({
      ...current,
      permissionEntries: undefined,
    }))
  }

  const setGroupState = (group: string, type: 'GRANT' | 'DENY' | null) => {
    const groupSlugs = groupedPermissions[group].map((p) => p.slug)

    setFormData((current) => {
      const nextEntries = { ...current.permissionEntries }
      for (const slug of groupSlugs) {
        if (type === null) {
          delete nextEntries[slug]
        } else {
          nextEntries[slug] = type
        }
      }
      return {
        ...current,
        permissionEntries: nextEntries,
      }
    })

    setFieldErrors((current) => ({
      ...current,
      permissionEntries: undefined,
    }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!validateForm()) {
      return
    }

    setSubmitLoading(true)

    try {
      const permissionEntries = Object.entries(formData.permissionEntries).map(
        ([slug, type]) => ({ slug, type }),
      )
      const permissionSlugs = permissionEntries
        .filter((e) => e.type === 'GRANT')
        .map((e) => e.slug)

      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        permissionEntries,
        permissionSlugs,
      }

      if (mode === 'edit' && roleId) {
        await api.patch(`/roles/${roleId}`, payload)
        toast.success('Perfil atualizado com sucesso.')
      } else {
        await api.post('/roles', payload)
        toast.success('Perfil criado com sucesso.')
      }

      router.push('/dashboard/cadastros/permissions')
      router.refresh()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível salvar o perfil.'))
    } finally {
      setSubmitLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="app-page space-y-6">
      <section className="app-page-header">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link
              href="/dashboard/cadastros/permissions"
              className="transition hover:text-foreground"
            >
              Gestão de Permissões
            </Link>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-primary">
              {mode === 'edit' ? 'Editar perfil' : 'Novo perfil'}
            </span>
          </div>
          <div className="space-y-2">
            <p className="app-kicker">Cadastros</p>
            <h1 className="app-title">
              {mode === 'edit' ? 'Editar Perfil de Acesso' : 'Criar Perfil de Acesso'}
            </h1>
            <p className="app-subtitle">
              Configure as permissões deste perfil. Você pode conceder (GRANT) ou negar
              explicitamente (DENY). Lembre-se: qualquer negação sobrepõe aprovações.
            </p>
          </div>
        </div>
        <Button asChild variant="outline" className="gap-2">
          <Link href="/dashboard/cadastros/permissions">
            <ArrowLeft className="h-4 w-4" />
            Voltar para a listagem
          </Link>
        </Button>
      </section>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="app-section-card">
          <CardContent className="space-y-6 p-0">
            <div className="space-y-1">
              <h2 className="section-title">Dados do perfil</h2>
              <p className="text-sm text-muted-foreground">
                Perfis organizam o acesso padrão por função e podem ser vinculados aos
                colaboradores nas telas administrativas.
              </p>
            </div>

            <div className="app-form-grid">
              <div className="field-stack">
                <Label htmlFor="role-name">Nome do perfil *</Label>
                <p className="text-sm text-muted-foreground">
                  Exibido na gestão de usuários e em referências internas de acesso.
                </p>
                <Input
                  id="role-name"
                  value={formData.name}
                  onChange={(event) => {
                    setFormData((current) => ({ ...current, name: event.target.value }))
                    setFieldErrors((current) => ({ ...current, name: undefined }))
                  }}
                  placeholder="Ex: RH Operacional"
                  aria-invalid={fieldErrors.name ? 'true' : 'false'}
                />
                {fieldErrors.name ? (
                  <p className="text-sm text-destructive">{fieldErrors.name}</p>
                ) : null}
              </div>

              <div className="field-stack md:col-span-2">
                <Label htmlFor="role-description">Descrição</Label>
                <p className="text-sm text-muted-foreground">
                  Contexto opcional para diferenciar esse perfil de outros perfis similares.
                </p>
                <Textarea
                  id="role-description"
                  value={formData.description}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Explique o uso principal e as responsabilidades cobertas."
                  className="min-h-24"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="app-section-card">
          <CardContent className="space-y-6 p-0">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="space-y-1">
                <h2 className="section-title">Permissões do perfil</h2>
                <p className="text-sm text-muted-foreground">
                  Defina o comportamento para cada permissão. Permissões não configuradas
                  permanecem neutras (sem associação).
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>{grantCount} Concedidas (GRANT)</span>
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
                  <ShieldAlert className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                  <span>{denyCount} Negadas (DENY)</span>
                </div>
              </div>
            </div>

            {fieldErrors.permissionEntries ? (
              <p className="text-sm text-destructive">{fieldErrors.permissionEntries}</p>
            ) : null}

            <div className="rounded-2xl border border-border bg-background/80 p-2">
              <Accordion type="multiple" defaultValue={sortedGroups} className="w-full">
                {sortedGroups.map((group) => {
                  const groupPermissions = groupedPermissions[group]
                  const groupGrants = groupPermissions.filter(
                    (p) => formData.permissionEntries[p.slug] === 'GRANT',
                  ).length
                  const groupDenies = groupPermissions.filter(
                    (p) => formData.permissionEntries[p.slug] === 'DENY',
                  ).length

                  return (
                    <AccordionItem
                      key={group}
                      value={group}
                      className="border-b border-border last:border-b-0"
                    >
                      <AccordionTrigger className="rounded-xl px-3 text-left hover:no-underline">
                        <div className="flex flex-1 items-center justify-between gap-3">
                          <span className="text-sm font-semibold text-foreground">{group}</span>
                          <div className="flex items-center gap-2 pr-2 text-xs">
                            {groupGrants > 0 && (
                              <Badge
                                variant="outline"
                                className="border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 py-0"
                              >
                                +{groupGrants}
                              </Badge>
                            )}
                            {groupDenies > 0 && (
                              <Badge
                                variant="outline"
                                className="border-rose-500/30 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 py-0"
                              >
                                -{groupDenies}
                              </Badge>
                            )}
                            <span className="text-muted-foreground">
                              {groupGrants + groupDenies} / {groupPermissions.length}
                            </span>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-3 pb-4">
                        {/* Quick action buttons for the group */}
                        <div className="mb-3 flex flex-wrap items-center justify-end gap-2 border-b border-border/50 pb-2">
                          <span className="text-xs text-muted-foreground mr-1">Ações em lote:</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                            onClick={() => setGroupState(group, 'GRANT')}
                          >
                            <Check className="h-3 w-3" />
                            Conceder todos
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1 text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                            onClick={() => setGroupState(group, 'DENY')}
                          >
                            <Ban className="h-3 w-3" />
                            Negar todos
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                            onClick={() => setGroupState(group, null)}
                          >
                            <X className="h-3 w-3" />
                            Limpar grupo
                          </Button>
                        </div>

                        {/* List of permissions in group */}
                        <div className="grid gap-2.5">
                          {groupPermissions.map((permission) => {
                            const currentType = formData.permissionEntries[permission.slug]

                            return (
                              <div
                                key={permission.id}
                                className={cn(
                                  'flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border p-3 transition',
                                  currentType === 'GRANT'
                                    ? 'border-emerald-500/40 bg-emerald-500/5'
                                    : currentType === 'DENY'
                                    ? 'border-rose-500/40 bg-rose-500/5'
                                    : 'border-border bg-card/60 hover:bg-muted/20',
                                )}
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium leading-none text-foreground">
                                      {permission.description || permission.slug}
                                    </p>
                                    {currentType === 'GRANT' && (
                                      <Badge
                                        variant="outline"
                                        className="h-4 border-emerald-500/30 bg-emerald-50 px-1.5 py-0 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                                      >
                                        GRANT
                                      </Badge>
                                    )}
                                    {currentType === 'DENY' && (
                                      <Badge
                                        variant="outline"
                                        className="h-4 border-rose-500/30 bg-rose-50 px-1.5 py-0 text-[10px] font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                                      >
                                        DENY
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {permission.slug}
                                  </p>
                                </div>

                                {/* 3-state segmented toggle */}
                                <div className="flex items-center gap-1 self-end sm:self-auto rounded-lg border border-border bg-muted/40 p-1">
                                  <button
                                    type="button"
                                    onClick={() => setPermissionState(permission.slug, null)}
                                    className={cn(
                                      'rounded-md px-2.5 py-1 text-xs font-medium transition',
                                      !currentType
                                        ? 'bg-background text-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground',
                                    )}
                                  >
                                    Nenhum
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPermissionState(permission.slug, 'GRANT')
                                    }
                                    className={cn(
                                      'flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition',
                                      currentType === 'GRANT'
                                        ? 'bg-emerald-600 text-white shadow-sm'
                                        : 'text-muted-foreground hover:text-emerald-600',
                                    )}
                                  >
                                    <Check className="h-3 w-3" />
                                    Conceder
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPermissionState(permission.slug, 'DENY')
                                    }
                                    className={cn(
                                      'flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition',
                                      currentType === 'DENY'
                                        ? 'bg-rose-600 text-white shadow-sm'
                                        : 'text-muted-foreground hover:text-rose-600',
                                    )}
                                  >
                                    <Ban className="h-3 w-3" />
                                    Negar
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )
                })}
              </Accordion>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col-reverse gap-3 md:flex-row md:justify-end">
          <Button asChild type="button" variant="outline">
            <Link href="/dashboard/cadastros/permissions">Cancelar</Link>
          </Button>
          <Button type="submit" className="gap-2" disabled={submitLoading}>
            {submitLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {mode === 'edit' ? 'Salvar alterações' : 'Criar perfil'}
          </Button>
        </div>
      </form>
    </div>
  )
}
