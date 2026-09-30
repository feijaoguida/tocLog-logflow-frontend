"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { EmployeeForm, EmployeeData, formatCPF } from "@/components/employee-form"
import { toast } from "sonner"

import { ChevronRight, Loader2 } from "lucide-react"

export default function EditEmployeePage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  
  const [loading, setLoading] = useState(true)
  const [initialData, setInitialData] = useState<EmployeeData | null>(null)

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const { data } = await api.get(`/employees/${id}`)
        
        // Transform Backend Model to Frontend Form Model
        const mappedData: EmployeeData = {
            id: data.id,
            name: data.user?.name || "",
            email: data.user?.email || "",
            cpf: formatCPF(data.cpf || ""),
            role: data.legacyRole || data.role?.name || "",
            roleId: data.roleId || "",
            status: data.status,
            branchId: data.branchId || "",
            departmentId: data.departmentId || "",
            directManagerId: data.directManagerId || "",
            avatarUrl: data.avatarUrl || "",
            admissionDate: data.admissionDate ? data.admissionDate.split('T')[0] : "",
            currentSalary: data.currentSalary ? data.currentSalary.toString() : "",
            
            // Phase 6
            rg: data.rg || "",
            gender: data.gender || "",
            address: data.address || "",
            city: data.city || "",
            state: data.state || "",
            fatherName: data.fatherName || "",
            motherName: data.motherName || "",
            ctps: data.ctps || "",
            cnh: data.cnh || "",
            spouseName: data.spouseName || "",
            spousePhone: data.spousePhone || "",
            educationLevel: data.educationLevel || "",
            registration: data.registration || "",
            dismissalDate: data.dismissalDate ? data.dismissalDate.split('T')[0] : "",
            birthDate: data.birthDate ? data.birthDate.split('T')[0] : "",
            children: data.children ? (typeof data.children === 'string' ? JSON.parse(data.children) : data.children) : [],
            skills: data.skills ? (typeof data.skills === 'string' ? JSON.parse(data.skills) : data.skills) : [],
            certifications: data.certifications ? (typeof data.certifications === 'string' ? JSON.parse(data.certifications) : data.certifications) : [],
            courses: data.courses ? (typeof data.courses === 'string' ? JSON.parse(data.courses) : data.courses) : [],
            experiences: data.experiences ? (typeof data.experiences === 'string' ? JSON.parse(data.experiences) : data.experiences) : [],
        }
        
        setInitialData(mappedData)
      } catch (error) {
        toast.error("Erro ao carregar os dados do colaborador.")
        console.error(error)
        router.push("/dashboard/rh/employees")
      } finally {
        setLoading(false)
      }
    }

    if (id) {
        fetchEmployee()
    }
  }, [id, router])

  if (loading) {
    return (
        <div className="flex-1 w-full flex items-center justify-center p-12">
           <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="cursor-pointer transition hover:text-foreground" onClick={() => router.push('/dashboard/rh/employees')}>
            Colaboradores
          </span>
          <ChevronRight className="size-3 text-muted-foreground/60" />
          <span
            className="max-w-[220px] cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap transition hover:text-foreground"
            onClick={() => router.push(`/dashboard/rh/employees/${id}`)}
          >
            {initialData?.name}
          </span>
          <ChevronRight className="size-3 text-muted-foreground/60" />
          <span className="font-medium text-primary">Editar</span>
        </div>
        <div className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">Recursos Humanos</span>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Editar Colaborador</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Atualize dados, vínculos e qualificações com validação visual antes do salvamento.
          </p>
        </div>
      </div>

      {initialData && <EmployeeForm initialData={initialData} isEditMode={true} />}
    </div>
  )
}
