"use client"

import { EmployeeForm } from "@/components/employee-form"

export default function NewEmployeePage() {
  return (
    <div className="app-page">
      <section className="app-page-header theme-surface">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="cursor-pointer transition hover:text-foreground" onClick={() => window.history.back()}>
              Colaboradores
            </span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-primary">Novo Cadastro</span>
          </div>
          <div className="space-y-2">
            <p className="app-kicker">Recursos Humanos</p>
            <h1 className="app-title">Cadastro de Colaborador</h1>
            <p className="app-subtitle">
              Preencha as informações abaixo para registrar um novo membro na equipe com o padrão visual oficial do sistema.
            </p>
          </div>
        </div>
      </section>

      <EmployeeForm />
    </div>
  )
}
