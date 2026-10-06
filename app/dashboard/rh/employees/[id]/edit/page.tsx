'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, ChevronRight, KeyRound, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  EmployeeData,
  EmployeeForm,
  formatCPF,
} from '@/components/employee-form'
import { api } from '@/lib/api'
import { useAuth } from '@/context/auth-context'
import { AdminPasswordResetDialog } from '@/components/rh/admin-password-reset-dialog'

export default function EditEmployeePage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const { hasPermission } = useAuth()
  const canResetPassword = hasPermission('rh.employees.password_reset')

  const [loading, setLoading] = useState(true)
  const [initialData, setInitialData] = useState<EmployeeData | null>(null)
  const [targetUserId, setTargetUserId] = useState<string>('')
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false)

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const { data } = await api.get(`/employees/${id}`)

        const userId = data.user?.id || data.userId || ''
        setTargetUserId(userId)

        // Transform Backend Model to Frontend Form Model
        const mappedData: EmployeeData = {
          id: data.id,
          userId,
          name: data.user?.name || '',
          email: data.user?.email || '',
          cpf: formatCPF(data.cpf || ''),
          role: data.legacyRole || data.role?.name || '',
          roleId: data.roleId || '',
          status: data.status,
          branchId: data.branchId || '',
          departmentId: data.departmentId || '',
          directManagerId: data.directManagerId || '',
          avatarUrl: data.avatarUrl || '',
          admissionDate: data.admissionDate ? data.admissionDate.split('T')[0] : '',
          currentSalary: data.currentSalary ? data.currentSalary.toString() : '',

          rg: data.rg || '',
          gender: data.gender || '',
          address: data.address || '',
          city: data.city || '',
          state: data.state || '',
          fatherName: data.fatherName || '',
          motherName: data.motherName || '',
          ctps: data.ctps || '',
          cnh: data.cnh || '',
          spouseName: data.spouseName || '',
          spousePhone: data.spousePhone || '',
          educationLevel: data.educationLevel || '',
          registration: data.registration || '',
          dismissalDate: data.dismissalDate ? data.dismissalDate.split('T')[0] : '',
          birthDate: data.birthDate ? data.birthDate.split('T')[0] : '',
          children: data.children
            ? typeof data.children === 'string'
              ? JSON.parse(data.children)
              : data.children
            : [],
          skills: data.skills
            ? typeof data.skills === 'string'
              ? JSON.parse(data.skills)
              : data.skills
            : [],
          certifications: data.certifications
            ? typeof data.certifications === 'string'
              ? JSON.parse(data.certifications)
              : data.certifications
            : [],
          courses: data.courses
            ? typeof data.courses === 'string'
              ? JSON.parse(data.courses)
              : data.courses
            : [],
          experiences: data.experiences
            ? typeof data.experiences === 'string'
              ? JSON.parse(data.experiences)
              : data.experiences
            : [],
        }

        setInitialData(mappedData)
      } catch (error) {
        console.error(error)
        toast.error('Erro ao carregar dados do funcionário.')
        router.push('/dashboard/rh/employees')
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      void fetchEmployee()
    }
  }, [id, router])

  if (loading) {
    return (
      <div className="flex min-h-[300px] w-full items-center justify-center p-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="app-page space-y-6">
      {/* 1. Cabeçalho Padronizado */}
      <section className="space-y-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link
            href="/dashboard/rh/employees"
            className="transition hover:text-foreground"
          >
            Funcionários
          </Link>
          <ChevronRight className="size-3 text-muted-foreground/60" />
          <Link
            href={`/dashboard/rh/employees/${id}`}
            className="max-w-[220px] truncate transition hover:text-foreground"
          >
            {initialData?.name}
          </Link>
          <ChevronRight className="size-3 text-muted-foreground/60" />
          <span className="font-medium text-foreground">Editar</span>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Editar Colaborador
            </h1>
            <p className="text-sm text-muted-foreground">
              Atualize dados cadastrais, vínculos e qualificações de {initialData?.name}.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {canResetPassword && targetUserId && (
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                onClick={() => setResetPasswordOpen(true)}
              >
                <KeyRound className="size-4" />
                <span>Alterar Senha</span>
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5"
              onClick={() => router.push(`/dashboard/rh/employees/${id}`)}
            >
              <ArrowLeft className="size-4" />
              <span>Ver perfil</span>
            </Button>
          </div>
        </div>
      </section>

      {initialData && (
        <EmployeeForm
          initialData={initialData}
          isEditMode={true}
          canResetPassword={canResetPassword}
          onOpenPasswordReset={() => setResetPasswordOpen(true)}
        />
      )}

      {targetUserId && (
        <AdminPasswordResetDialog
          open={resetPasswordOpen}
          onOpenChange={setResetPasswordOpen}
          targetUserId={targetUserId}
          targetUserName={initialData?.name || ''}
        />
      )}
    </div>
  )
}
