'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { FileCheck, Plus, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'

import { MenuFunctionHeader } from '@/components/layout/menu-function-header'
import { WorkspaceStateCard } from '@/components/layout/workspace-state-card'
import { useAuth } from '@/context/auth-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'
import type { Checklist } from '@/types/fleet'

type ChecklistRecord = Checklist & {
  vehicle: { id: string; plate: string; model: string }
  driver?: { user?: { name?: string | null } | null } | null
}

const TYPE_LABEL: Record<string, string> = {
  DELIVERY: 'Saída / Entrega',
  RECEIVEMENT: 'Retorno / Recebimento',
  MAINTENANCE_EXIT: 'Saída p/ manutenção',
  PERIODIC: 'Periódico',
  CORRECTIVE: 'Corretivo',
}

export default function ChecklistsPage() {
  const { hasPermission } = useAuth()
  const canViewChecklists = hasPermission('fleet.checklists.view')
  const canExecuteChecklists = hasPermission('fleet.checklists.execute')

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [checklists, setChecklists] = useState<ChecklistRecord[]>([])

  useEffect(() => {
    if (!canViewChecklists) {
      setLoading(false)
      return
    }

    void loadChecklists()
  }, [canViewChecklists])

  async function loadChecklists(showLoadingState = true) {
    if (showLoadingState) {
      setLoading(true)
    } else {
      setRefreshing(true)
    }

    try {
      setLoadError(null)
      const { data } = await api.get<ChecklistRecord[]>('/fleet/checklists')
      setChecklists(data)
    } catch (error) {
      const message = getApiErrorMessage(error, 'Não foi possível carregar os checklists da frota.')
      setLoadError(message)
      setChecklists([])
      toast.error(message)
    } finally {
      if (showLoadingState) {
        setLoading(false)
      } else {
        setRefreshing(false)
      }
    }
  }

  const finishedCount = checklists.filter((item) => item.status === 'FINISHED').length
  const openCount = checklists.filter((item) => item.status === 'OPEN').length

  return (
    <div className="app-page">
      <MenuFunctionHeader
        title="Frota > Checklists"
        description="Histórico recente de inspeções da frota interna, usado para sustentar elegibilidade operacional e transições de status do veículo."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {canExecuteChecklists ? (
              <Button asChild>
                <Link href="/dashboard/fleet/checklists/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Novo checklist
                </Link>
              </Button>
            ) : (
              <Badge variant="outline" className="rounded-full px-4 py-2">
                Modo leitura
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={() => void loadChecklists(false)} disabled={loading || refreshing}>
              {refreshing ? 'Atualizando...' : 'Atualizar leitura'}
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/fleet">Veículos</Link>
            </Button>
          </div>
        }
      />

      {!canViewChecklists ? (
        <WorkspaceStateCard title="Acesso restrito">
          <p>Este perfil não pode visualizar o histórico de checklists da frota.</p>
        </WorkspaceStateCard>
      ) : (
        <>
          {loadError ? (
            <WorkspaceStateCard
              title="Falha de leitura"
              tone="danger"
              actions={
                <Button variant="outline" onClick={() => void loadChecklists(false)} disabled={refreshing}>
                  {refreshing ? 'Atualizando...' : 'Tentar novamente'}
                </Button>
              }
            >
              <p>{loadError}</p>
            </WorkspaceStateCard>
          ) : null}

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="app-section-card">
              <CardHeader>
                <CardDescription>Total recente</CardDescription>
                <CardTitle className="text-3xl">{checklists.length}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="app-section-card">
              <CardHeader>
                <CardDescription>Em aberto</CardDescription>
                <CardTitle className="text-3xl">{openCount}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="app-section-card">
              <CardHeader>
                <CardDescription>Finalizados</CardDescription>
                <CardTitle className="text-3xl">{finishedCount}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card className="app-section-card">
            <CardHeader>
              <CardTitle className="text-xl">Histórico recente</CardTitle>
              <CardDescription>
                Checklists que já influenciaram KM, status e trilha operacional dos veículos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-2xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Veículo</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Responsável</TableHead>
                      <TableHead>Início</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading
                      ? Array.from({ length: 5 }).map((_, index) => (
                          <TableRow key={index}>
                            <TableCell colSpan={5}>
                              <Skeleton className="h-8 w-full rounded-xl" />
                            </TableCell>
                          </TableRow>
                        ))
                      : checklists.length === 0
                        ? (
                          <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                              Nenhum checklist recente encontrado para a frota visível neste tenant.
                            </TableCell>
                          </TableRow>
                          )
                        : checklists.map((checklist) => (
                            <TableRow key={checklist.id}>
                              <TableCell>
                                <div className="font-medium">{checklist.vehicle.plate}</div>
                                <div className="text-xs text-muted-foreground">{checklist.vehicle.model}</div>
                              </TableCell>
                              <TableCell>{TYPE_LABEL[checklist.type] || checklist.type}</TableCell>
                              <TableCell>{checklist.driver?.user?.name || '-'}</TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  {new Date(checklist.startedAt).toLocaleDateString('pt-BR')}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {new Date(checklist.startedAt).toLocaleTimeString('pt-BR', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge className={checklist.status === 'FINISHED' ? 'bg-green-600' : 'bg-sky-600'}>
                                  {checklist.status === 'FINISHED' ? 'Concluído' : 'Em aberto'}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                  </TableBody>
                </Table>
              </div>

              {!canExecuteChecklists ? (
                <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <ShieldAlert className="h-4 w-4" />
                  Este perfil consegue acompanhar o histórico, mas não iniciar inspeções.
                </div>
              ) : null}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
