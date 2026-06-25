'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LifeBuoy, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAuth } from '@/context/auth-context'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'

type HelpdeskTicket = {
  id: string
  code: number
  subject: string
  status: string
  priority: string
  createdAt: string
  category?: { name: string } | null
  serviceCatalogItem?: { name: string } | null
  queue?: { name: string } | null
  assignee?: { user?: { name?: string } | null } | null
}

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Aberto',
  IN_PROGRESS: 'Em atendimento',
  WAITING_USER: 'Aguardando usuário',
  RESOLVED: 'Resolvido',
  CLOSED: 'Fechado',
  REOPENED: 'Reaberto',
  NEW: 'Novo',
  TRIAGE: 'Em triagem',
  WAITING_ASSIGNMENT: 'Aguardando atendimento',
  WAITING_THIRD_PARTY: 'Aguardando terceiro',
  WAITING_APPROVAL: 'Aguardando aprovação',
  CANCELLED: 'Cancelado',
}

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',
}

function getStatusVariant(status: string) {
  if (status === 'RESOLVED' || status === 'CLOSED') return 'success'
  if (status === 'WAITING_APPROVAL' || status === 'WAITING_USER' || status === 'WAITING_THIRD_PARTY') return 'secondary'
  if (status === 'CANCELLED') return 'destructive'
  return 'default'
}

export default function HelpdeskPage() {
  const router = useRouter()
  const { hasPermission } = useAuth()
  const [loading, setLoading] = useState(true)
  const [tickets, setTickets] = useState<HelpdeskTicket[]>([])

  const canCreateTicket = hasPermission('helpdesk.ticket.create')

  useEffect(() => {
    void fetchTickets()
  }, [])

  async function fetchTickets() {
    setLoading(true)
    try {
      const { data } = await api.get('/helpdesk/tickets')
      setTickets(data)
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, 'Não foi possível carregar os chamados.'),
      )
    } finally {
      setLoading(false)
    }
  }

  const stats = useMemo(() => {
    const openStatuses = new Set([
      'OPEN',
      'NEW',
      'TRIAGE',
      'WAITING_ASSIGNMENT',
      'WAITING_APPROVAL',
      'IN_PROGRESS',
      'WAITING_USER',
      'WAITING_THIRD_PARTY',
      'REOPENED',
    ])

    return {
      total: tickets.length,
      active: tickets.filter((ticket) => openStatuses.has(ticket.status)).length,
      waiting: tickets.filter((ticket) =>
        ['WAITING_USER', 'WAITING_THIRD_PARTY', 'WAITING_APPROVAL'].includes(
          ticket.status,
        ),
      ).length,
      resolved: tickets.filter((ticket) =>
        ['RESOLVED', 'CLOSED'].includes(ticket.status),
      ).length,
    }
  }, [tickets])

  return (
    <div className="app-page">
      <section className="app-page-header">
        <div className="app-kicker">Atendimento Interno</div>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <h1 className="app-title">Central de Atendimento</h1>
            <p className="app-subtitle">
              Acompanhe seus chamados internos, status de atendimento e trilha de resposta
              em um único lugar.
            </p>
          </div>
          {canCreateTicket ? (
            <Button onClick={() => router.push('/dashboard/helpdesk/new')} className="h-11">
              <Plus className="mr-2 h-4 w-4" />
              Abrir chamado
            </Button>
          ) : null}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="app-section-card">
          <CardHeader className="p-0">
            <CardDescription>Total</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="app-section-card">
          <CardHeader className="p-0">
            <CardDescription>Ativos</CardDescription>
            <CardTitle className="text-3xl">{stats.active}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="app-section-card">
          <CardHeader className="p-0">
            <CardDescription>Aguardando retorno</CardDescription>
            <CardTitle className="text-3xl">{stats.waiting}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="app-section-card">
          <CardHeader className="p-0">
            <CardDescription>Resolvidos / fechados</CardDescription>
            <CardTitle className="text-3xl">{stats.resolved}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <section className="app-section-card space-y-4">
        <div className="space-y-1">
          <h2 className="section-title">Meus chamados e escopos visíveis</h2>
          <p className="text-sm text-muted-foreground">
            A lista já respeita o escopo do seu perfil, incluindo chamados próprios,
            subordinados ou filas onde você atua.
          </p>
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            Carregando chamados...
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border bg-muted/20 px-6 text-center">
            <LifeBuoy className="h-12 w-12 text-muted-foreground/60" />
            <div className="space-y-1">
              <p className="text-lg font-semibold">Nenhum chamado encontrado</p>
              <p className="text-sm text-muted-foreground">
                Quando você abrir ou participar de um atendimento, ele aparecerá aqui.
              </p>
            </div>
            {canCreateTicket ? (
              <Button variant="outline" onClick={() => router.push('/dashboard/helpdesk/new')}>
                Abrir primeiro chamado
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Assunto</TableHead>
                  <TableHead>Serviço</TableHead>
                  <TableHead>Fila</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-medium">#{ticket.code}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{ticket.subject}</div>
                        <div className="text-xs text-muted-foreground">
                          {ticket.category?.name || 'Categoria não informada'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{ticket.serviceCatalogItem?.name || 'Fluxo legado'}</TableCell>
                    <TableCell>{ticket.queue?.name || 'Sem fila'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {PRIORITY_LABELS[ticket.priority] || ticket.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(ticket.status) as any}>
                        {STATUS_LABELS[ticket.status] || ticket.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {ticket.assignee?.user?.name || 'Não atribuído'}
                    </TableCell>
                    <TableCell>
                      {new Date(ticket.createdAt).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/dashboard/helpdesk/${ticket.id}`)}
                      >
                        Ver detalhes
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  )
}
