'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Check,
  Crown,
  Loader2,
  Plus,
  Search,
  Shield,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'

type RoleMember = {
  employeeId: string
  userId: string
  name: string
  email: string
  departmentName: string | null
  type: 'PRIMARY' | 'SECONDARY'
  assignedAt: string
  assignedBy: { id: string; name: string } | null
}

type RoleDetails = {
  id: string
  name: string
  description: string | null
  isSystem: boolean
}

type AvailableEmployee = {
  id: string
  user: {
    id: string
    name: string
    email: string
  }
  department?: {
    name: string
  } | null
  role?: {
    id: string
    name: string
  } | null
}

export default function RoleMembersPage() {
  const params = useParams()
  const router = useRouter()
  const roleId = params.id as string

  const [role, setRole] = useState<RoleDetails | null>(null)
  const [members, setMembers] = useState<RoleMember[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'PRIMARY' | 'SECONDARY'>('ALL')

  // Add members modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [availableEmployees, setAvailableEmployees] = useState<AvailableEmployee[]>([])
  const [loadingEmployees, setLoadingEmployees] = useState(false)
  const [addSearchTerm, setAddSearchTerm] = useState('')
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([])
  const [submittingAdd, setSubmittingAdd] = useState(false)

  // Remove confirmation modal state
  const [memberToRemove, setMemberToRemove] = useState<RoleMember | null>(null)
  const [removingMember, setRemovingMember] = useState(false)

  const loadData = async () => {
    try {
      setLoading(true)
      const [roleRes, membersRes] = await Promise.all([
        api.get(`/roles/${roleId}`),
        api.get(`/roles/${roleId}/members`),
      ])
      setRole(roleRes.data)
      setMembers(membersRes.data)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível carregar os membros do perfil.'))
      router.push('/dashboard/cadastros/permissions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (roleId) {
      loadData()
    }
  }, [roleId])

  // Open add members modal and load candidate employees
  const handleOpenAddModal = async () => {
    setIsAddModalOpen(true)
    setSelectedEmployeeIds([])
    setAddSearchTerm('')
    try {
      setLoadingEmployees(true)
      const { data } = await api.get('/employees')
      setAvailableEmployees(data)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível carregar a lista de funcionários.'))
    } finally {
      setLoadingEmployees(false)
    }
  }

  // Filter candidate employees (exclude already assigned as member)
  const candidateEmployees = useMemo(() => {
    const existingEmployeeIds = new Set(members.map((m) => m.employeeId))
    return availableEmployees.filter((emp) => {
      if (existingEmployeeIds.has(emp.id)) return false
      if (!addSearchTerm.trim()) return true
      const search = addSearchTerm.toLowerCase()
      return (
        emp.user?.name?.toLowerCase().includes(search) ||
        emp.user?.email?.toLowerCase().includes(search) ||
        emp.department?.name?.toLowerCase().includes(search)
      )
    })
  }, [availableEmployees, members, addSearchTerm])

  const toggleSelectEmployee = (empId: string) => {
    setSelectedEmployeeIds((prev) =>
      prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId],
    )
  }

  const toggleSelectAllCandidates = () => {
    if (selectedEmployeeIds.length === candidateEmployees.length) {
      setSelectedEmployeeIds([])
    } else {
      setSelectedEmployeeIds(candidateEmployees.map((e) => e.id))
    }
  }

  const handleAddMembersSubmit = async () => {
    if (selectedEmployeeIds.length === 0) {
      toast.warning('Selecione ao menos um funcionário para adicionar.')
      return
    }

    try {
      setSubmittingAdd(true)
      await api.post(`/roles/${roleId}/members`, {
        employeeIds: selectedEmployeeIds,
      })
      toast.success(`${selectedEmployeeIds.length} colaborador(es) associado(s) com sucesso.`)
      setIsAddModalOpen(false)
      await loadData()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Erro ao associar colaboradores.'))
    } finally {
      setSubmittingAdd(false)
    }
  }

  const handleConfirmRemove = async () => {
    if (!memberToRemove) return
    try {
      setRemovingMember(true)
      await api.delete(`/roles/${roleId}/members/${memberToRemove.employeeId}`)
      toast.success(`Associação secundária de "${memberToRemove.name}" removida.`)
      setMemberToRemove(null)
      await loadData()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível remover o colaborador.'))
    } finally {
      setRemovingMember(false)
    }
  }

  // Filtered members list
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      if (typeFilter !== 'ALL' && m.type !== typeFilter) {
        return false
      }
      if (!searchTerm.trim()) return true
      const search = searchTerm.toLowerCase()
      return (
        m.name.toLowerCase().includes(search) ||
        m.email.toLowerCase().includes(search) ||
        (m.departmentName && m.departmentName.toLowerCase().includes(search))
      )
    })
  }, [members, typeFilter, searchTerm])

  const primaryCount = useMemo(() => members.filter((m) => m.type === 'PRIMARY').length, [members])
  const secondaryCount = useMemo(() => members.filter((m) => m.type === 'SECONDARY').length, [members])

  if (loading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="app-page space-y-6">
      {/* Top Header */}
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
            <span className="text-foreground font-medium">{role?.name}</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-primary">Membros</span>
          </div>

          <div className="space-y-1">
            <p className="app-kicker">Cadastros</p>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="app-title">Membros do Perfil: {role?.name}</h1>
              {role?.isSystem ? (
                <Badge variant="secondary" className="gap-1">
                  <Shield className="h-3 w-3" />
                  Sistema
                </Badge>
              ) : (
                <Badge variant="outline">Customizado</Badge>
              )}
            </div>
            <p className="app-subtitle">
              {role?.description ||
                'Gerencie os colaboradores vinculados a este perfil como principal ou secundário.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" className="gap-2">
            <Link href="/dashboard/cadastros/permissions">
              <ArrowLeft className="h-4 w-4" />
              Voltar aos Perfis
            </Link>
          </Button>
          <Button onClick={handleOpenAddModal} className="gap-2">
            <UserPlus className="h-4 w-4" />
            Adicionar Membros
          </Button>
        </div>
      </section>

      {/* Summary Chips */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="app-section-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">
                Total de Membros
              </p>
              <p className="text-2xl font-bold">{members.length}</p>
            </div>
            <Users className="h-8 w-8 text-muted-foreground/40" />
          </div>
        </Card>
        <Card className="app-section-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">
                Perfil Principal
              </p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {primaryCount}
              </p>
            </div>
            <Crown className="h-8 w-8 text-amber-500/30" />
          </div>
        </Card>
        <Card className="app-section-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">
                Perfil Secundário
              </p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {secondaryCount}
              </p>
            </div>
            <UserCheck className="h-8 w-8 text-blue-500/30" />
          </div>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="app-section-card">
        <CardHeader className="pb-3">
          <div className="app-toolbar flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant={typeFilter === 'ALL' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTypeFilter('ALL')}
              >
                Todos ({members.length})
              </Button>
              <Button
                variant={typeFilter === 'PRIMARY' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTypeFilter('PRIMARY')}
              >
                Principal ({primaryCount})
              </Button>
              <Button
                variant={typeFilter === 'SECONDARY' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTypeFilter('SECONDARY')}
              >
                Secundário ({secondaryCount})
              </Button>
            </div>

            <div className="relative w-full md:w-[280px]">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por colaborador ou e-mail..."
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead>Departamento</TableHead>
                <TableHead>Tipo de Vínculo</TableHead>
                <TableHead>Atribuído Em</TableHead>
                <TableHead>Atribuído Por</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-12 text-center text-sm text-muted-foreground"
                  >
                    Nenhum colaborador encontrado com os filtros informados.
                  </TableCell>
                </TableRow>
              ) : (
                filteredMembers.map((member) => (
                  <TableRow key={member.employeeId}>
                    <TableCell className="font-medium">
                      <div>
                        <p className="font-medium text-foreground">{member.name}</p>
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {member.departmentName ? (
                        <span className="text-sm">{member.departmentName}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {member.type === 'PRIMARY' ? (
                        <Badge
                          variant="secondary"
                          className="gap-1 border-amber-500/20 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                        >
                          <Crown className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                          Principal
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="gap-1 border-blue-500/30 bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
                        >
                          <UserCheck className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                          Secundário
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {member.assignedAt
                        ? new Date(member.assignedAt).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })
                        : '—'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {member.assignedBy ? member.assignedBy.name : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {member.type === 'SECONDARY' ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive/80 hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setMemberToRemove(member)}
                          title="Remover perfil secundário"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      ) : (
                        <span
                          className="text-xs text-muted-foreground"
                          title="Perfil principal deve ser alterado no cadastro do funcionário no RH"
                        >
                          Definido no RH
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog to Add Members */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Associar Colaboradores como Perfil Secundário</DialogTitle>
            <DialogDescription>
              Selecione os colaboradores que receberão o perfil &quot;{role?.name}&quot; como
              perfil secundário adicional.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                value={addSearchTerm}
                onChange={(e) => setAddSearchTerm(e.target.value)}
                placeholder="Filtrar por nome, e-mail ou departamento..."
                className="pl-9"
              />
            </div>

            {loadingEmployees ? (
              <div className="flex min-h-[200px] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : candidateEmployees.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Nenhum colaborador disponível para associação encontrado.
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b pb-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="select-all"
                      checked={
                        candidateEmployees.length > 0 &&
                        selectedEmployeeIds.length === candidateEmployees.length
                      }
                      onCheckedChange={toggleSelectAllCandidates}
                    />
                    <label htmlFor="select-all" className="cursor-pointer font-medium">
                      Selecionar todos ({candidateEmployees.length})
                    </label>
                  </div>
                  <span>{selectedEmployeeIds.length} selecionado(s)</span>
                </div>

                <div className="max-h-[300px] space-y-1 overflow-y-auto pr-1">
                  {candidateEmployees.map((emp) => {
                    const isSelected = selectedEmployeeIds.includes(emp.id)
                    return (
                      <label
                        key={emp.id}
                        htmlFor={`emp-${emp.id}`}
                        className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 transition ${
                          isSelected
                            ? 'border-primary/50 bg-primary/5'
                            : 'border-border hover:bg-muted/40'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            id={`emp-${emp.id}`}
                            checked={isSelected}
                            onCheckedChange={() => toggleSelectEmployee(emp.id)}
                          />
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {emp.user?.name}
                            </p>
                            <p className="text-xs text-muted-foreground">{emp.user?.email}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-muted-foreground">
                            {emp.department?.name || 'Sem depto'}
                          </span>
                          {emp.role?.name && (
                            <p className="text-[11px] text-muted-foreground/70">
                              Perfil atual: {emp.role.name}
                            </p>
                          )}
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddModalOpen(false)}
              disabled={submittingAdd}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleAddMembersSubmit}
              disabled={submittingAdd || selectedEmployeeIds.length === 0}
              className="gap-2"
            >
              {submittingAdd ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Adicionar ({selectedEmployeeIds.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Member Removal */}
      <ConfirmDialog
        open={Boolean(memberToRemove)}
        onOpenChange={(open) => !open && setMemberToRemove(null)}
        title="Remover Perfil Secundário"
        description={`Tem certeza que deseja remover o vínculo secundário de "${memberToRemove?.name}" neste perfil?`}
        confirmText="Remover vínculo"
        cancelText="Cancelar"
        variant="destructive"
        loading={removingMember}
        onConfirm={handleConfirmRemove}
      />
    </div>
  )
}
