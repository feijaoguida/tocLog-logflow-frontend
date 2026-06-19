'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import _ from 'lodash'
import { ArrowLeft, Loader2, Save, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'

type PermissionCatalogItem = {
  id: string
  slug: string
  description: string | null
  group: string
}

type RoleFormValue = {
  name: string
  description: string
  permissionSlugs: string[]
}

type RoleFormProps = {
  mode: 'create' | 'edit'
  roleId?: string
}

type FieldErrors = Partial<Record<'name' | 'permissionSlugs', string>>

export function RoleForm({ mode, roleId }: RoleFormProps) {
  const router = useRouter()
  const [permissions, setPermissions] = useState<PermissionCatalogItem[]>([])
  const [formData, setFormData] = useState<RoleFormValue>({
    name: '',
    description: '',
    permissionSlugs: [],
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
          setFormData({
            name: roleResponse.data.name ?? '',
            description: roleResponse.data.description ?? '',
            permissionSlugs: Array.isArray(roleResponse.data.permissions)
              ? roleResponse.data.permissions.map((permission: { slug: string }) => permission.slug)
              : [],
          })
        }
      } catch (error) {
        toast.error(
          getApiErrorMessage(error, 'Nao foi possivel carregar os dados do perfil.'),
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

  const validateForm = () => {
    const nextErrors: FieldErrors = {}

    if (!formData.name.trim()) {
      nextErrors.name = 'Informe o nome do perfil.'
    }

    if (formData.permissionSlugs.length === 0) {
      nextErrors.permissionSlugs = 'Selecione ao menos uma permissao.'
    }

    setFieldErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const togglePermission = (slug: string) => {
    setFormData((current) => {
      const nextPermissionSlugs = current.permissionSlugs.includes(slug)
        ? current.permissionSlugs.filter((permissionSlug) => permissionSlug !== slug)
        : [...current.permissionSlugs, slug]

      return {
        ...current,
        permissionSlugs: nextPermissionSlugs,
      }
    })

    setFieldErrors((current) => ({
      ...current,
      permissionSlugs: undefined,
    }))
  }

  const togglePermissionGroup = (group: string) => {
    const groupSlugs = groupedPermissions[group].map((permission) => permission.slug)
    const isEveryPermissionSelected = groupSlugs.every((slug) =>
      formData.permissionSlugs.includes(slug),
    )

    setFormData((current) => {
      const nextPermissionSlugs = isEveryPermissionSelected
        ? current.permissionSlugs.filter((slug) => !groupSlugs.includes(slug))
        : Array.from(new Set([...current.permissionSlugs, ...groupSlugs]))

      return {
        ...current,
        permissionSlugs: nextPermissionSlugs,
      }
    })

    setFieldErrors((current) => ({
      ...current,
      permissionSlugs: undefined,
    }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!validateForm()) {
      return
    }

    setSubmitLoading(true)

    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        permissionSlugs: formData.permissionSlugs,
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
      toast.error(getApiErrorMessage(error, 'Nao foi possivel salvar o perfil.'))
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
    <div className="app-page">
      <section className="app-page-header">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/dashboard/cadastros/permissions" className="transition hover:text-foreground">
              Gestao de Permissoes
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
              Defina o nome do perfil, descreva o contexto de uso e selecione as permissoes
              que esse perfil podera conceder.
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
                Perfis organizam o acesso padrao por funcao e podem ser vinculados aos
                colaboradores nas telas administrativas.
              </p>
            </div>

            <div className="app-form-grid">
              <div className="field-stack">
                <Label htmlFor="role-name">Nome do perfil *</Label>
                <p className="text-sm text-muted-foreground">
                  Exibido na gestao de usuarios e em referencias internas de acesso.
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
                <Label htmlFor="role-description">Descricao</Label>
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
                  className="min-h-28"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="app-section-card">
          <CardContent className="space-y-6 p-0">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="space-y-1">
                <h2 className="section-title">Permissoes do sistema</h2>
                <p className="text-sm text-muted-foreground">
                  O perfil precisa ter ao menos uma permissao para ser salvo.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span>{formData.permissionSlugs.length} permissao(oes) selecionada(s)</span>
              </div>
            </div>

            {fieldErrors.permissionSlugs ? (
              <p className="text-sm text-destructive">{fieldErrors.permissionSlugs}</p>
            ) : null}

            <div className="rounded-2xl border border-border bg-background/80 p-2">
              <Accordion type="multiple" defaultValue={sortedGroups} className="w-full">
                {sortedGroups.map((group) => {
                  const groupPermissions = groupedPermissions[group]
                  const groupSlugs = groupPermissions.map((permission) => permission.slug)
                  const selectedCount = groupedPermissions[group].filter((permission) =>
                    formData.permissionSlugs.includes(permission.slug),
                  ).length
                  const isEveryPermissionSelected =
                    groupSlugs.length > 0 && selectedCount === groupSlugs.length

                  return (
                    <AccordionItem key={group} value={group} className="border-b border-border last:border-b-0">
                      <AccordionTrigger className="rounded-xl px-3 text-left hover:no-underline">
                        <div className="flex flex-1 items-center justify-between gap-3">
                          <span className="text-sm font-semibold text-foreground">{group}</span>
                          <span className="text-xs text-muted-foreground">
                            {selectedCount} / {groupedPermissions[group].length}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-3 pb-4">
                        <div className="mb-3 flex justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => togglePermissionGroup(group)}
                          >
                            {isEveryPermissionSelected ? 'Desmarcar todos' : 'Marcar todos'}
                          </Button>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          {groupPermissions.map((permission) => (
                            <label
                              key={permission.id}
                              htmlFor={permission.id}
                              className="flex min-h-16 cursor-pointer items-start gap-3 rounded-xl border border-border bg-card px-4 py-3 transition hover:border-primary/40 hover:bg-muted/40"
                            >
                              <Checkbox
                                id={permission.id}
                                checked={formData.permissionSlugs.includes(permission.slug)}
                                onCheckedChange={() => togglePermission(permission.slug)}
                              />
                              <div className="space-y-1">
                                <p className="text-sm font-medium leading-none text-foreground">
                                  {permission.description || permission.slug}
                                </p>
                                <p className="text-xs text-muted-foreground">{permission.slug}</p>
                              </div>
                            </label>
                          ))}
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
            {submitLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {mode === 'edit' ? 'Salvar alteracoes' : 'Criar perfil'}
          </Button>
        </div>
      </form>
    </div>
  )
}
