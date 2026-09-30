'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmployeeForm } from '@/components/employee-form'

export default function NewEmployeePage() {
  const router = useRouter()

  return (
    <div className="app-page space-y-6">
      {/* 1. Cabeçalho Padronizado */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link
            href="/dashboard/rh/employees"
            className="transition hover:text-foreground"
          >
            Funcionários
          </Link>
          <ChevronRight className="size-3 text-muted-foreground/60" />
          <span className="font-medium text-foreground">Novo Cadastro</span>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Cadastro de Colaborador
            </h1>
            <p className="text-sm text-muted-foreground">
              Preencha as informações cadastrais, contratuais e vínculos funcionais do novo membro da equipe.
            </p>
          </div>

          <div>
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5"
              onClick={() => router.push('/dashboard/rh/employees')}
            >
              <ArrowLeft className="size-4" />
              <span>Voltar para lista</span>
            </Button>
          </div>
        </div>
      </section>

      {/* Formulário Oficial */}
      <EmployeeForm />
    </div>
  )
}
