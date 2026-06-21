"use client"

import type { ReactNode } from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { getApiErrorMessage } from "@/lib/api-error"
import { Button } from "@/components/ui/button"
import { CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { ImageUpload } from "@/components/image-upload"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"

export const validateCPF = (cpf: string) => {
  cpf = cpf.replace(/[^\d]+/g, "")
  if (cpf === "") return false
  if (
    cpf.length !== 11 ||
    cpf === "00000000000" ||
    cpf === "11111111111" ||
    cpf === "22222222222" ||
    cpf === "33333333333" ||
    cpf === "44444444444" ||
    cpf === "55555555555" ||
    cpf === "66666666666" ||
    cpf === "77777777777" ||
    cpf === "88888888888" ||
    cpf === "99999999999"
  ) {
    return false
  }

  let add = 0
  for (let i = 0; i < 9; i += 1) {
    add += Number.parseInt(cpf.charAt(i), 10) * (10 - i)
  }

  let rev = 11 - (add % 11)
  if (rev === 10 || rev === 11) rev = 0
  if (rev !== Number.parseInt(cpf.charAt(9), 10)) return false

  add = 0
  for (let i = 0; i < 10; i += 1) {
    add += Number.parseInt(cpf.charAt(i), 10) * (11 - i)
  }

  rev = 11 - (add % 11)
  if (rev === 10 || rev === 11) rev = 0
  if (rev !== Number.parseInt(cpf.charAt(10), 10)) return false

  return true
}

export const formatCPF = (value: string) =>
  value
    .replace(/\D/g, "")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})/, "$1-$2")
    .replace(/(-\d{2})\d+?$/, "$1")

type ChildItem = { name: string; age: string; gender: string }
type SkillItem = { name: string }
type CertificationItem = {
  name: string
  institution: string
  startDate: string
  completionDate: string
  inProgress: boolean
}
type CourseItem = {
  name: string
  institution: string
  startDate: string
  completionDate: string
  inProgress: boolean
}
type ExperienceItem = {
  role: string
  company: string
  startDate: string
  endDate: string
  description: string
}

type LookupItem = {
  id: string
  name: string
  active?: boolean
}

type ManagerItem = {
  id: string
  user?: {
    name?: string
    email?: string
  }
}

export interface EmployeeData {
  id?: string
  name: string
  email: string
  cpf: string
  role: string
  roleId?: string
  status: string
  branchId: string
  departmentId?: string
  directManagerId?: string
  avatarUrl?: string
  admissionDate?: string
  currentSalary?: string
  birthDate?: string
  password?: string
  gender?: string
  rg?: string
  address?: string
  city?: string
  state?: string
  fatherName?: string
  motherName?: string
  ctps?: string
  cnh?: string
  educationLevel?: string
  registration?: string
  dismissalDate?: string
  spouseName?: string
  spousePhone?: string
  phone?: string
  children?: ChildItem[]
  skills?: SkillItem[]
  certifications?: CertificationItem[]
  courses?: CourseItem[]
  experiences?: ExperienceItem[]
}

export interface EmployeeFormProps {
  initialData?: EmployeeData
  isEditMode?: boolean
}

type FieldErrorMap = Record<string, string>

const DEFAULT_CHILD: ChildItem = { name: "", age: "", gender: "" }
const DEFAULT_CERTIFICATION: CertificationItem = {
  name: "",
  institution: "",
  startDate: "",
  completionDate: "",
  inProgress: false,
}
const DEFAULT_COURSE: CourseItem = {
  name: "",
  institution: "",
  startDate: "",
  completionDate: "",
  inProgress: false,
}
const DEFAULT_EXPERIENCE: ExperienceItem = {
  role: "",
  company: "",
  startDate: "",
  endDate: "",
  description: "",
}

function buildInitialData(initialData?: EmployeeData): EmployeeData {
  const baseData: EmployeeData = {
    name: "",
    email: "",
    cpf: "",
    role: "",
    status: "ACTIVE",
    branchId: "",
    departmentId: "",
    directManagerId: "",
    avatarUrl: "",
    admissionDate: "",
    currentSalary: "",
    birthDate: "",
    password: "",
    gender: "",
    rg: "",
    address: "",
    city: "",
    state: "",
    fatherName: "",
    motherName: "",
    ctps: "",
    cnh: "",
    educationLevel: "",
    registration: "",
    dismissalDate: "",
    spouseName: "",
    spousePhone: "",
    phone: "",
    children: [],
    skills: [],
    certifications: [],
    courses: [],
    experiences: [],
  }

  return {
    ...baseData,
    ...initialData,
    children: initialData?.children ?? [],
    skills: (initialData?.skills ?? []).map((skill) =>
      typeof skill === "string" ? { name: skill } : skill,
    ),
    certifications: (initialData?.certifications ?? []).map((item) => ({
      ...DEFAULT_CERTIFICATION,
      ...item,
    })),
    courses: (initialData?.courses ?? []).map((item) => ({
      ...DEFAULT_COURSE,
      ...item,
    })),
    experiences: (initialData?.experiences ?? []).map((item) => ({
      ...DEFAULT_EXPERIENCE,
      ...item,
    })),
  }
}

function normalizeSkillName(value: string) {
  return value.trim().toLocaleLowerCase("pt-BR").replace(/\s+/g, " ")
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs font-medium text-destructive">{message}</p>
}

function Section({
  icon,
  title,
  description,
  children,
}: {
  icon: string
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="app-section-card overflow-visible">
      <div className="flex items-start gap-3 border-b border-border/70 pb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-semibold tracking-[-0.02em] text-foreground">{title}</h3>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
      </div>
      <CardContent className="px-0 pt-6 pb-0">{children}</CardContent>
    </section>
  )
}

export function EmployeeForm({ initialData, isEditMode = false }: EmployeeFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [departments, setDepartments] = useState<LookupItem[]>([])
  const [roles, setRoles] = useState<LookupItem[]>([])
  const [branches, setBranches] = useState<LookupItem[]>([])
  const [managers, setManagers] = useState<ManagerItem[]>([])
  const [managerSearch, setManagerSearch] = useState("")
  const [isSearchingManager, setIsSearchingManager] = useState(false)
  const [selectedManagerObj, setSelectedManagerObj] = useState<ManagerItem | null>(null)
  const [formData, setFormData] = useState<EmployeeData>(buildInitialData(initialData))
  const [fieldErrors, setFieldErrors] = useState<FieldErrorMap>({})
  const [skillQuery, setSkillQuery] = useState("")
  const [skillSuggestions, setSkillSuggestions] = useState<Array<{ id: string; name: string }>>([])
  const [isSearchingSkills, setIsSearchingSkills] = useState(false)
  const [isResolvingSkill, setIsResolvingSkill] = useState(false)
  const [showSkillSuggestions, setShowSkillSuggestions] = useState(false)
  const [validationDialogOpen, setValidationDialogOpen] = useState(false)
  const [validationMessages, setValidationMessages] = useState<string[]>([])

  useEffect(() => {
    setFormData(buildInitialData(initialData))
  }, [initialData])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [deptRes, roleRes, branchRes] = await Promise.all([
          api.get("/departments"),
          api.get("/roles"),
          api.get("/branches"),
        ])
        setDepartments(deptRes.data)
        setRoles(roleRes.data)
        setBranches(branchRes.data)

        if (initialData?.directManagerId) {
          const managerRes = await api.get(`/employees/${initialData.directManagerId}`)
          if (managerRes.data) {
            setSelectedManagerObj(managerRes.data)
            setManagers([managerRes.data])
          }
        }
      } catch (error) {
        console.error(error)
        toast.error("Erro ao carregar dicionários do formulário.")
      }
    }

    fetchData()
  }, [initialData])

  useEffect(() => {
    const searchTimer = window.setTimeout(async () => {
      if (managerSearch.length >= 2) {
        setIsSearchingManager(true)
        try {
          const res = await api.get(`/employees/search?q=${managerSearch}`)
          setManagers(res.data)
        } catch (error) {
          console.error("Manager search error", error)
        } finally {
          setIsSearchingManager(false)
        }
      } else if (managerSearch.length === 0 && !selectedManagerObj) {
        setManagers([])
      }
    }, 400)

    return () => window.clearTimeout(searchTimer)
  }, [managerSearch, selectedManagerObj])

  useEffect(() => {
    const searchTimer = window.setTimeout(async () => {
      const query = skillQuery.trim()
      if (query.length < 3) {
        setSkillSuggestions([])
        return
      }

      setIsSearchingSkills(true)
      try {
        const res = await api.get(`/employees/skills/search?q=${encodeURIComponent(query)}`)
        setSkillSuggestions(res.data)
      } catch (error) {
        console.error("Skill search error", error)
      } finally {
        setIsSearchingSkills(false)
      }
    }, 250)

    return () => window.clearTimeout(searchTimer)
  }, [skillQuery])

  const setError = (field: string, message?: string) => {
    setFieldErrors((current) => {
      const next = { ...current }
      if (message) {
        next[field] = message
      } else {
        delete next[field]
      }
      return next
    })
  }

  const handleChange = (field: keyof EmployeeData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleArrayChange = (field: keyof EmployeeData, nextValue: unknown[]) => {
    setFormData((prev) => ({ ...prev, [field]: nextValue }))
  }

  const validateDateRelationship = (nextData: EmployeeData) => {
    if (nextData.admissionDate && nextData.dismissalDate && nextData.dismissalDate < nextData.admissionDate) {
      return "A data de demissão não pode ser menor que a data de admissão."
    }
    return ""
  }

  const validateField = (field: keyof EmployeeData, nextData = formData) => {
    if (field === "cpf") {
      const cleanCpf = nextData.cpf.replace(/\D/g, "")
      if (!cleanCpf) return "CPF é obrigatório."
      if (!validateCPF(cleanCpf)) return "CPF inválido."
    }

    if (field === "admissionDate" || field === "dismissalDate") {
      return validateDateRelationship(nextData)
    }

    if (field === "name" && !nextData.name.trim()) return "Nome completo é obrigatório."
    if (field === "email" && !nextData.email.trim()) return "E-mail é obrigatório."
    if (field === "branchId" && !nextData.branchId) return "Selecione a filial."
    if (field === "departmentId" && !nextData.departmentId) return "Selecione o departamento."
    if (field === "role" && !nextData.role.trim()) return "Informe o cargo."

    return ""
  }

  const handleBlurValidation = (field: keyof EmployeeData) => {
    const message = validateField(field)
    setError(field, message)
    if (field === "admissionDate" || field === "dismissalDate") {
      setError("admissionDate", message)
      setError("dismissalDate", message)
    }
  }

  const validateBeforeSubmit = () => {
    const nextErrors: FieldErrorMap = {}

    ;(["name", "email", "cpf", "branchId", "departmentId", "role"] as Array<keyof EmployeeData>).forEach((field) => {
      const message = validateField(field)
      if (message) nextErrors[field] = message
    })

    const dateMessage = validateDateRelationship(formData)
    if (dateMessage) {
      nextErrors.admissionDate = dateMessage
      nextErrors.dismissalDate = dateMessage
    }

    setFieldErrors(nextErrors)
    return {
      isValid: Object.keys(nextErrors).length === 0,
      messages: Array.from(new Set(Object.values(nextErrors))),
    }
  }

  const handleAddChild = () => {
    handleArrayChange("children", [...(formData.children ?? []), { ...DEFAULT_CHILD }])
  }

  const handleUpdateChild = (index: number, key: keyof ChildItem, value: string) => {
    const nextChildren = [...(formData.children ?? [])]
    nextChildren[index] = { ...nextChildren[index], [key]: value }
    handleArrayChange("children", nextChildren)
  }

  const handleRemoveChild = (index: number) => {
    handleArrayChange(
      "children",
      (formData.children ?? []).filter((_, itemIndex) => itemIndex !== index),
    )
  }

  const handleAddArrayItem = (field: "certifications" | "courses" | "experiences", defaultValue: unknown) => {
    handleArrayChange(field, [...((formData[field] as unknown[]) ?? []), defaultValue])
  }

  const handleUpdateArrayItem = (
    field: "certifications" | "courses" | "experiences",
    index: number,
    key: string,
    value: unknown,
  ) => {
    const currentItems = [...((formData[field] as Record<string, unknown>[]) ?? [])]
    currentItems[index] = { ...currentItems[index], [key]: value }
    handleArrayChange(field, currentItems)
  }

  const handleRemoveArrayItem = (field: "certifications" | "courses" | "experiences", index: number) => {
    handleArrayChange(
      field,
      ((formData[field] as unknown[]) ?? []).filter((_, itemIndex) => itemIndex !== index),
    )
  }

  const resolveSkill = async (rawName: string) => {
    const trimmedName = rawName.trim().replace(/\s+/g, " ")
    if (!trimmedName) return

    const alreadyExists = (formData.skills ?? []).some(
      (skill) => normalizeSkillName(skill.name) === normalizeSkillName(trimmedName),
    )
    if (alreadyExists) {
      setSkillQuery("")
      setSkillSuggestions([])
      setShowSkillSuggestions(false)
      return
    }

    setIsResolvingSkill(true)
    try {
      const { data } = await api.post("/employees/skills/resolve", { name: trimmedName })
      handleArrayChange("skills", [...(formData.skills ?? []), { name: data.name }])
      setSkillQuery("")
      setSkillSuggestions([])
      setShowSkillSuggestions(false)
    } catch (error) {
      console.error(error)
      toast.error(getApiErrorMessage(error, "Erro ao adicionar skill."))
    } finally {
      setIsResolvingSkill(false)
    }
  }

  const handleSkillKeyDown = async (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault()
      await resolveSkill(skillQuery)
    }
  }

  const handleRemoveSkill = (index: number) => {
    handleArrayChange(
      "skills",
      (formData.skills ?? []).filter((_, itemIndex) => itemIndex !== index),
    )
  }

  const sanitizeCurriculumCollection = <T extends Record<string, unknown>>(items: T[]) =>
    items.filter((item) =>
      Object.values(item).some((value) => {
        if (typeof value === "boolean") return value
        return String(value ?? "").trim() !== ""
      }),
    )

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    const validationResult = validateBeforeSubmit()
    if (!validationResult.isValid) {
      setValidationMessages(validationResult.messages)
      setValidationDialogOpen(true)
      return
    }

    setLoading(true)
    try {
      const sanitizedFormData = { ...formData }
      delete sanitizedFormData.id
      delete sanitizedFormData.phone
      const payload: Record<string, unknown> = {
        ...sanitizedFormData,
        cpf: formData.cpf.replace(/\D/g, ""),
        currentSalary: formData.currentSalary ? Number.parseFloat(formData.currentSalary) : undefined,
        admissionDate: formData.admissionDate ? new Date(formData.admissionDate).toISOString() : undefined,
        dismissalDate: formData.dismissalDate ? new Date(formData.dismissalDate).toISOString() : undefined,
        birthDate: formData.birthDate ? new Date(formData.birthDate).toISOString() : undefined,
        children: sanitizeCurriculumCollection(formData.children ?? []),
        skills: sanitizeCurriculumCollection((formData.skills ?? []).map((skill) => ({ name: skill.name.trim() }))),
        certifications: sanitizeCurriculumCollection(formData.certifications ?? []),
        courses: sanitizeCurriculumCollection(formData.courses ?? []),
        experiences: sanitizeCurriculumCollection(formData.experiences ?? []),
      }

      Object.keys(payload).forEach((key) => {
        const value = payload[key]
        if (value === "") delete payload[key]
        if (Array.isArray(value) && value.length === 0) delete payload[key]
      })

      if (isEditMode && formData.id) {
        await api.patch(`/employees/${formData.id}`, payload)
        toast.success("Funcionário atualizado com sucesso.")
        router.push(`/dashboard/rh/employees/${formData.id}`)
      } else {
        await api.post("/employees", payload)
        toast.success("Funcionário criado com sucesso.")
        router.push("/dashboard/rh/employees")
      }
    } catch (error) {
      console.error(error)
      toast.error(getApiErrorMessage(error, "Erro ao salvar funcionário."))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Dialog open={validationDialogOpen} onOpenChange={setValidationDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Confira os dados antes de salvar</DialogTitle>
            <DialogDescription>
              Alguns campos impeditivos ainda precisam de ajuste para concluir o cadastro do colaborador.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-2xl border border-warning/20 bg-warning/5 p-4">
            <ul className="space-y-2 text-sm text-foreground">
              {validationMessages.map((message) => (
                <li key={message} className="flex items-start gap-2">
                  <span className="material-symbols-outlined mt-0.5 text-[18px] text-warning">warning</span>
                  <span>{message}</span>
                </li>
              ))}
            </ul>
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => setValidationDialogOpen(false)}>
              Entendi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <Section
          icon="photo_camera"
          title="Foto do Colaborador"
          description="Atualize a foto com um recorte limpo e uma prévia maior para revisão antes do salvamento."
        >
          <div className="rounded-3xl border border-dashed border-border bg-linear-to-br from-muted/60 via-card to-muted/30 p-6 shadow-sm sm:p-8">
            <ImageUpload
              value={formData.avatarUrl || ""}
              onChange={(value) => handleChange("avatarUrl", value)}
              folder="funcionario"
              placeholder="Selecionar imagem"
              className="w-full"
            />
          </div>
        </Section>

        <Section
          icon="lock"
          title="Acesso e Sistema"
          description="Dados de autenticação e vínculo com o perfil de acesso do sistema."
        >
          <div className="app-form-grid">
          <div className="field-stack md:col-span-2">
            <Label htmlFor="email">E-mail de Login</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(event) => handleChange("email", event.target.value)}
              onBlur={() => handleBlurValidation("email")}
              placeholder="nome@empresa.com.br"
              aria-invalid={!!fieldErrors.email}
            />
            <FieldError message={fieldErrors.email} />
          </div>

          <div className="field-stack">
            <Label htmlFor="password">{isEditMode ? "Nova Senha" : "Senha de Acesso"}</Label>
            <Input
              id="password"
              type="password"
              value={formData.password || ""}
              onChange={(event) => handleChange("password", event.target.value)}
              placeholder={isEditMode ? "Deixe em branco para manter a atual" : "Defina uma senha"}
            />
            <p className="text-xs text-muted-foreground">Nao bloqueia a edicao se ficar em branco.</p>
          </div>

          <div className="field-stack">
            <Label>Perfil do Sistema</Label>
            <Select
              value={formData.roleId || "none"}
              onValueChange={(value) => handleChange("roleId", value === "none" ? "" : value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sem perfil vinculado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem perfil vinculado</SelectItem>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        </Section>

        <Section
        icon="person"
        title="Informações Pessoais"
        description="Dados cadastrais usados para identificação e documentação."
      >
        <div className="app-form-grid">
          <div className="field-stack md:col-span-2">
            <Label htmlFor="name">Nome Completo</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(event) => handleChange("name", event.target.value)}
              onBlur={() => handleBlurValidation("name")}
              placeholder="Ex.: João da Silva Santos"
              aria-invalid={!!fieldErrors.name}
            />
            <FieldError message={fieldErrors.name} />
          </div>

          <div className="field-stack">
            <Label>Sexo</Label>
            <Select value={formData.gender || "none"} onValueChange={(value) => handleChange("gender", value === "none" ? "" : value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nao informado</SelectItem>
                <SelectItem value="MASCULINO">Masculino</SelectItem>
                <SelectItem value="FEMININO">Feminino</SelectItem>
                <SelectItem value="OUTRO">Outro / Prefiro nao informar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="field-stack">
            <Label htmlFor="cpf">CPF</Label>
            <Input
              id="cpf"
              value={formData.cpf}
              onChange={(event) => handleChange("cpf", formatCPF(event.target.value))}
              onBlur={() => handleBlurValidation("cpf")}
              placeholder="000.000.000-00"
              maxLength={14}
              aria-invalid={!!fieldErrors.cpf}
            />
            <FieldError message={fieldErrors.cpf} />
          </div>

          <div className="field-stack">
            <Label htmlFor="rg">RG</Label>
            <Input
              id="rg"
              value={formData.rg || ""}
              onChange={(event) => handleChange("rg", event.target.value)}
              placeholder="00.000.000-0"
            />
          </div>

          <div className="field-stack">
            <Label htmlFor="birthDate">Data de Nascimento</Label>
            <Input
              id="birthDate"
              type="date"
              value={formData.birthDate || ""}
              onChange={(event) => handleChange("birthDate", event.target.value)}
            />
          </div>

          <div className="field-stack">
            <Label htmlFor="fatherName">Nome do Pai</Label>
            <Input
              id="fatherName"
              value={formData.fatherName || ""}
              onChange={(event) => handleChange("fatherName", event.target.value)}
              placeholder="Nome do pai"
            />
          </div>

          <div className="field-stack">
            <Label htmlFor="motherName">Nome da Mãe</Label>
            <Input
              id="motherName"
              value={formData.motherName || ""}
              onChange={(event) => handleChange("motherName", event.target.value)}
              placeholder="Nome da mãe"
            />
          </div>
        </div>
        </Section>

        <Section
        icon="call"
        title="Contato e Endereço"
        description="Informações de contato e localização residencial."
      >
        <div className="app-form-grid">
          <div className="field-stack">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              value={formData.phone || ""}
              onChange={(event) => handleChange("phone", event.target.value)}
              placeholder="(00) 00000-0000"
            />
          </div>

          <div className="field-stack md:col-span-2">
            <Label htmlFor="address">Endereço</Label>
            <Input
              id="address"
              value={formData.address || ""}
              onChange={(event) => handleChange("address", event.target.value)}
              placeholder="Rua, número e bairro"
            />
          </div>

          <div className="field-stack">
            <Label htmlFor="city">Cidade</Label>
            <Input
              id="city"
              value={formData.city || ""}
              onChange={(event) => handleChange("city", event.target.value)}
              placeholder="Cidade"
            />
          </div>

          <div className="field-stack">
            <Label htmlFor="state">UF</Label>
            <Input
              id="state"
              value={formData.state || ""}
              onChange={(event) => handleChange("state", event.target.value.toUpperCase())}
              placeholder="SP"
              maxLength={2}
            />
          </div>
        </div>
        </Section>

        <Section
        icon="work"
        title="Informações Profissionais"
        description="Estrutura, cargo, vínculo e datas contratuais."
      >
        <div className="app-form-grid">
          <div className="field-stack">
            <Label>Filial</Label>
            <Select
              value={formData.branchId}
              onValueChange={(value) => {
                handleChange("branchId", value)
                setError("branchId", "")
              }}
            >
              <SelectTrigger className="w-full" aria-invalid={!!fieldErrors.branchId}>
                <SelectValue placeholder="Selecione a filial" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={fieldErrors.branchId} />
          </div>

          <div className="field-stack">
            <Label>Departamento</Label>
            <Select
              value={formData.departmentId || ""}
              onValueChange={(value) => {
                handleChange("departmentId", value)
                setError("departmentId", "")
              }}
            >
              <SelectTrigger className="w-full" aria-invalid={!!fieldErrors.departmentId}>
                <SelectValue placeholder="Selecione o departamento" />
              </SelectTrigger>
              <SelectContent>
                {departments
                  .filter((department) => department.active !== false)
                  .map((department) => (
                    <SelectItem key={department.id} value={department.id}>
                      {department.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <FieldError message={fieldErrors.departmentId} />
          </div>

          <div className="field-stack">
            <Label htmlFor="role">Cargo / Função</Label>
            <Input
              id="role"
              value={formData.role}
              onChange={(event) => handleChange("role", event.target.value)}
              onBlur={() => handleBlurValidation("role")}
              placeholder="Ex.: Analista de Frota"
              aria-invalid={!!fieldErrors.role}
            />
            <FieldError message={fieldErrors.role} />
          </div>

          <div className="field-stack">
            <Label>Gestor Direto</Label>
            <Select
              value={formData.directManagerId || "none"}
              onValueChange={(value) => {
                const selectedValue = value === "none" ? "" : value
                handleChange("directManagerId", selectedValue)
                const selectedManager = managers.find((manager) => manager.id === selectedValue) ?? null
                setSelectedManagerObj(selectedManager)
              }}
              onOpenChange={(open) => {
                if (!open) setManagerSearch("")
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Digite para buscar gestor...">
                  {selectedManagerObj?.user?.name || (formData.directManagerId ? "Gestor selecionado" : "Sem gestor")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <div className="border-b p-2">
                  <Input
                    placeholder="Buscar gestor por nome..."
                    value={managerSearch}
                    onChange={(event) => setManagerSearch(event.target.value)}
                    onKeyDown={(event) => event.stopPropagation()}
                  />
                </div>
                <div className="max-h-48 overflow-y-auto">
                  <SelectItem value="none">Sem gestor vinculado</SelectItem>
                  {isSearchingManager ? (
                    <div className="p-3 text-sm text-muted-foreground">Buscando gestores...</div>
                  ) : managers.length > 0 ? (
                    managers.map((manager) => (
                      <SelectItem key={manager.id} value={manager.id}>
                        {manager.user?.name}
                      </SelectItem>
                    ))
                  ) : managerSearch.length >= 2 ? (
                    <div className="p-3 text-sm text-muted-foreground">Nenhum gestor encontrado.</div>
                  ) : (
                    <div className="p-3 text-xs text-muted-foreground">Digite pelo menos 2 letras.</div>
                  )}
                </div>
              </SelectContent>
            </Select>
          </div>

          <div className="field-stack">
            <Label htmlFor="registration">Matrícula</Label>
            <Input
              id="registration"
              value={formData.registration || ""}
              onChange={(event) => handleChange("registration", event.target.value)}
              placeholder="000123"
            />
          </div>

          <div className="field-stack">
            <Label htmlFor="currentSalary">Salário Atual</Label>
            <Input
              id="currentSalary"
              type="number"
              step="0.01"
              value={formData.currentSalary || ""}
              onChange={(event) => handleChange("currentSalary", event.target.value)}
              placeholder="0,00"
            />
          </div>

          <div className="field-stack">
            <Label htmlFor="admissionDate">Data de Admissão</Label>
            <Input
              id="admissionDate"
              type="date"
              value={formData.admissionDate || ""}
              onChange={(event) => handleChange("admissionDate", event.target.value)}
              onBlur={() => handleBlurValidation("admissionDate")}
              aria-invalid={!!fieldErrors.admissionDate}
            />
            <FieldError message={fieldErrors.admissionDate} />
          </div>

          <div className="field-stack">
            <Label htmlFor="dismissalDate">Data de Demissão</Label>
            <Input
              id="dismissalDate"
              type="date"
              value={formData.dismissalDate || ""}
              onChange={(event) => handleChange("dismissalDate", event.target.value)}
              onBlur={() => handleBlurValidation("dismissalDate")}
              aria-invalid={!!fieldErrors.dismissalDate}
            />
            <FieldError message={fieldErrors.dismissalDate} />
          </div>

          <div className="field-stack">
            <Label>Status</Label>
            <Select value={formData.status} onValueChange={(value) => handleChange("status", value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Ativo</SelectItem>
                <SelectItem value="INACTIVE">Inativo</SelectItem>
                <SelectItem value="AWAY">Afastado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="field-stack">
            <Label>Escolaridade</Label>
            <Select value={formData.educationLevel || "none"} onValueChange={(value) => handleChange("educationLevel", value === "none" ? "" : value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione a escolaridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nao informado</SelectItem>
                <SelectItem value="MEDIO_INCOMPLETO">Ensino Médio Incompleto</SelectItem>
                <SelectItem value="MEDIO_COMPLETO">Ensino Médio Completo</SelectItem>
                <SelectItem value="SUPERIOR_INCOMPLETO">Ensino Superior Incompleto</SelectItem>
                <SelectItem value="SUPERIOR_COMPLETO">Ensino Superior Completo</SelectItem>
                <SelectItem value="POS_GRADUACAO">Pós-graduação / Especialização</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="field-stack">
            <Label htmlFor="ctps">CTPS</Label>
            <Input
              id="ctps"
              value={formData.ctps || ""}
              onChange={(event) => handleChange("ctps", event.target.value)}
              placeholder="0000000/0000"
            />
          </div>

          <div className="field-stack">
            <Label htmlFor="cnh">CNH</Label>
            <Input
              id="cnh"
              value={formData.cnh || ""}
              onChange={(event) => handleChange("cnh", event.target.value)}
              placeholder="00000000000"
            />
          </div>
        </div>
        </Section>

        <Section
        icon="family_home"
        title="Família"
        description="Dados de cônjuge e filhos para composição do cadastro."
      >
        <div className="space-y-6">
          <div className="app-form-grid">
            <div className="field-stack">
              <Label htmlFor="spouseName">Nome do Cônjuge</Label>
              <Input
                id="spouseName"
                value={formData.spouseName || ""}
                onChange={(event) => handleChange("spouseName", event.target.value)}
                placeholder="Nome do cônjuge"
              />
            </div>

            <div className="field-stack">
              <Label htmlFor="spousePhone">Telefone do Cônjuge</Label>
              <Input
                id="spousePhone"
                value={formData.spousePhone || ""}
                onChange={(event) => handleChange("spousePhone", event.target.value)}
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-foreground">Filhos</h4>
                <p className="text-xs text-muted-foreground">Cada card usa a mesma grade e altura dos demais controles.</p>
              </div>
              <Button type="button" variant="outlinePrimary" size="sm" onClick={handleAddChild}>
                <span className="material-symbols-outlined text-[16px]">add</span>
                Adicionar Filho
              </Button>
            </div>

            {(formData.children ?? []).length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
                Nenhum filho registrado.
              </div>
            ) : (
              <div className="space-y-4">
                {(formData.children ?? []).map((child, index) => (
                  <div key={`child-${index}`} className="grid gap-4 rounded-2xl border border-border/70 bg-muted/20 p-4 md:grid-cols-[1.6fr_120px_1fr_auto] md:items-end">
                    <div className="field-stack">
                      <Label>Nome</Label>
                      <Input
                        value={child.name}
                        onChange={(event) => handleUpdateChild(index, "name", event.target.value)}
                        placeholder="Nome do filho(a)"
                      />
                    </div>

                    <div className="field-stack">
                      <Label>Idade</Label>
                      <Input
                        type="number"
                        value={child.age}
                        onChange={(event) => handleUpdateChild(index, "age", event.target.value)}
                        placeholder="Anos"
                      />
                    </div>

                    <div className="field-stack">
                      <Label>Sexo</Label>
                      <Select value={child.gender || "none"} onValueChange={(value) => handleUpdateChild(index, "gender", value === "none" ? "" : value)}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nao informado</SelectItem>
                          <SelectItem value="MASCULINO">Masculino</SelectItem>
                          <SelectItem value="FEMININO">Feminino</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleRemoveChild(index)}
                      className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        </Section>

        <Section
        icon="school"
        title="Qualificações e Currículo"
        description="Skills, experiências e formações complementares do colaborador."
      >
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-foreground">Competências / Skills</h4>
              <p className="text-xs text-muted-foreground">
                Digite 3 letras para sugerir uma skill existente. Enter ou vírgula adicionam e, se não existir, ela é criada para uso futuro.
              </p>
            </div>

            <div className="relative">
              <Input
                value={skillQuery}
                onChange={(event) => {
                  setSkillQuery(event.target.value)
                  setShowSkillSuggestions(true)
                }}
                onFocus={() => setShowSkillSuggestions(true)}
                onBlur={() => {
                  window.setTimeout(() => setShowSkillSuggestions(false), 150)
                }}
                onKeyDown={handleSkillKeyDown}
                placeholder="Ex.: React, Excel avançado, Power BI"
              />

              {showSkillSuggestions && (skillQuery.trim().length >= 3 || isSearchingSkills) ? (
                <div className="absolute z-20 mt-2 w-full rounded-2xl border border-border bg-popover p-2 shadow-lg">
                  {isSearchingSkills ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">Buscando skills...</div>
                  ) : (
                    <>
                      {skillSuggestions.map((skill) => (
                        <button
                          key={skill.id}
                          type="button"
                          className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm hover:bg-accent"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => resolveSkill(skill.name)}
                        >
                          <span>{skill.name}</span>
                          <span className="text-xs text-muted-foreground">existente</span>
                        </button>
                      ))}
                      <button
                        type="button"
                        className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm hover:bg-accent"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => resolveSkill(skillQuery)}
                      >
                        <span>Adicionar &quot;{skillQuery.trim()}&quot;</span>
                        <span className="text-xs text-muted-foreground">novo catálogo</span>
                      </button>
                    </>
                  )}
                </div>
              ) : null}
            </div>

            {(formData.skills ?? []).length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-5 text-center text-sm text-muted-foreground">
                Nenhuma skill associada ainda.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {(formData.skills ?? []).map((skill, index) => (
                  <span
                    key={`${skill.name}-${index}`}
                    className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/8 px-3 py-1.5 text-sm font-medium text-primary"
                  >
                    {skill.name}
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(index)}
                      className="rounded-full text-primary/70 transition hover:text-destructive"
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4 border-t border-border/70 pt-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-foreground">Experiências Profissionais</h4>
                <p className="text-xs text-muted-foreground">Histórico resumido de cargos e empresas anteriores.</p>
              </div>
              <Button type="button" variant="outlinePrimary" size="sm" onClick={() => handleAddArrayItem("experiences", { ...DEFAULT_EXPERIENCE })}>
                <span className="material-symbols-outlined text-[16px]">add</span>
                Adicionar Experiência
              </Button>
            </div>

            <div className="space-y-4">
              {(formData.experiences ?? []).map((experience, index) => (
                <div key={`experience-${index}`} className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                  <div className="mb-4 flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleRemoveArrayItem("experiences", index)}
                      className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </Button>
                  </div>
                  <div className="app-form-grid">
                    <div className="field-stack">
                      <Label>Cargo / Função</Label>
                      <Input
                        value={experience.role}
                        onChange={(event) => handleUpdateArrayItem("experiences", index, "role", event.target.value)}
                        placeholder="Ex.: Coordenador de Operações"
                      />
                    </div>

                    <div className="field-stack">
                      <Label>Empresa</Label>
                      <Input
                        value={experience.company}
                        onChange={(event) => handleUpdateArrayItem("experiences", index, "company", event.target.value)}
                        placeholder="Ex.: Toclog"
                      />
                    </div>

                    <div className="field-stack">
                      <Label>Data de Início</Label>
                      <Input
                        type="date"
                        value={experience.startDate}
                        onChange={(event) => handleUpdateArrayItem("experiences", index, "startDate", event.target.value)}
                      />
                    </div>

                    <div className="field-stack">
                      <Label>Data de Fim</Label>
                      <Input
                        type="date"
                        value={experience.endDate}
                        onChange={(event) => handleUpdateArrayItem("experiences", index, "endDate", event.target.value)}
                      />
                    </div>

                    <div className="field-stack md:col-span-2">
                      <Label>Descrição</Label>
                      <Input
                        value={experience.description}
                        onChange={(event) => handleUpdateArrayItem("experiences", index, "description", event.target.value)}
                        placeholder="Resumo das atividades desempenhadas"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {(formData.experiences ?? []).length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-5 text-center text-sm text-muted-foreground">
                  Nenhuma experiência registrada.
                </div>
              ) : null}
            </div>
          </div>

          <div className="grid gap-6 border-t border-border/70 pt-6 xl:grid-cols-2">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Certificações</h4>
                  <p className="text-xs text-muted-foreground">Nome, instituição, datas e andamento.</p>
                </div>
                <Button type="button" variant="outlinePrimary" size="sm" onClick={() => handleAddArrayItem("certifications", { ...DEFAULT_CERTIFICATION })}>
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  Adicionar
                </Button>
              </div>

              {(formData.certifications ?? []).length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-5 text-center text-sm text-muted-foreground">
                  Nenhuma certificação registrada.
                </div>
              ) : (
                (formData.certifications ?? []).map((certification, index) => (
                  <div key={`certification-${index}`} className="space-y-4 rounded-2xl border border-border/70 bg-muted/20 p-4">
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleRemoveArrayItem("certifications", index)}
                        className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </Button>
                    </div>
                    <div className="app-form-grid">
                      <div className="field-stack md:col-span-2">
                        <Label>Nome</Label>
                        <Input
                          value={certification.name}
                          onChange={(event) => handleUpdateArrayItem("certifications", index, "name", event.target.value)}
                          placeholder="Ex.: NR-35"
                        />
                      </div>

                      <div className="field-stack md:col-span-2">
                        <Label>Instituição</Label>
                        <Input
                          value={certification.institution}
                          onChange={(event) => handleUpdateArrayItem("certifications", index, "institution", event.target.value)}
                          placeholder="Ex.: Senai"
                        />
                      </div>

                      <div className="field-stack">
                        <Label>Data de Início</Label>
                        <Input
                          type="date"
                          value={certification.startDate}
                          onChange={(event) => handleUpdateArrayItem("certifications", index, "startDate", event.target.value)}
                        />
                      </div>

                      <div className="field-stack">
                        <Label>Data de Conclusão</Label>
                        <Input
                          type="date"
                          value={certification.completionDate}
                          onChange={(event) => handleUpdateArrayItem("certifications", index, "completionDate", event.target.value)}
                          disabled={certification.inProgress}
                        />
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <Checkbox
                        checked={certification.inProgress}
                        onCheckedChange={(checked) => {
                          handleUpdateArrayItem("certifications", index, "inProgress", Boolean(checked))
                          if (checked) {
                            handleUpdateArrayItem("certifications", index, "completionDate", "")
                          }
                        }}
                      />
                      Em andamento
                    </label>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Cursos / Treinamentos</h4>
                  <p className="text-xs text-muted-foreground">Mesmo padrão visual e de dados das certificações.</p>
                </div>
                <Button type="button" variant="outlinePrimary" size="sm" onClick={() => handleAddArrayItem("courses", { ...DEFAULT_COURSE })}>
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  Adicionar
                </Button>
              </div>

              {(formData.courses ?? []).length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-5 text-center text-sm text-muted-foreground">
                  Nenhum curso ou treinamento registrado.
                </div>
              ) : (
                (formData.courses ?? []).map((course, index) => (
                  <div key={`course-${index}`} className="space-y-4 rounded-2xl border border-border/70 bg-muted/20 p-4">
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleRemoveArrayItem("courses", index)}
                        className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </Button>
                    </div>
                    <div className="app-form-grid">
                      <div className="field-stack md:col-span-2">
                        <Label>Nome</Label>
                        <Input
                          value={course.name}
                          onChange={(event) => handleUpdateArrayItem("courses", index, "name", event.target.value)}
                          placeholder="Ex.: Excel Avançado"
                        />
                      </div>

                      <div className="field-stack md:col-span-2">
                        <Label>Instituição</Label>
                        <Input
                          value={course.institution}
                          onChange={(event) => handleUpdateArrayItem("courses", index, "institution", event.target.value)}
                          placeholder="Ex.: Alura"
                        />
                      </div>

                      <div className="field-stack">
                        <Label>Data de Início</Label>
                        <Input
                          type="date"
                          value={course.startDate}
                          onChange={(event) => handleUpdateArrayItem("courses", index, "startDate", event.target.value)}
                        />
                      </div>

                      <div className="field-stack">
                        <Label>Data de Conclusão</Label>
                        <Input
                          type="date"
                          value={course.completionDate}
                          onChange={(event) => handleUpdateArrayItem("courses", index, "completionDate", event.target.value)}
                          disabled={course.inProgress}
                        />
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <Checkbox
                        checked={course.inProgress}
                        onCheckedChange={(checked) => {
                          handleUpdateArrayItem("courses", index, "inProgress", Boolean(checked))
                          if (checked) {
                            handleUpdateArrayItem("courses", index, "completionDate", "")
                          }
                        }}
                      />
                      Em andamento
                    </label>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        </Section>

        <div className="flex flex-col-reverse justify-between gap-4 border-t border-border/70 pt-6 md:flex-row md:items-center">
          <p className="text-xs text-muted-foreground">Validações impeditivas são verificadas novamente ao salvar.</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                router.push(
                  isEditMode && formData.id ? `/dashboard/rh/employees/${formData.id}` : "/dashboard/rh/employees",
                )
              }
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || isResolvingSkill}>
              {loading ? (
                <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>
              ) : (
                <span className="material-symbols-outlined text-[18px]">save</span>
              )}
              {isEditMode ? "Salvar Alterações" : "Salvar Colaborador"}
            </Button>
          </div>
        </div>
      </form>
    </>
  )
}
