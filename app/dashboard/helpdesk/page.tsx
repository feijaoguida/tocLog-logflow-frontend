
'use client'

import { useState, useEffect } from "react"
import { useAuth } from "@/context/auth-context"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, LifeBuoy } from "lucide-react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"

export default function HelpdeskPage() {
  const { user, hasPermission } = useAuth()
  const router = useRouter()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTickets = async () => {
        try {
            // Determine which endpoint or filter to use? Backend handles logic based on permissions.
            // Using /helpdesk/tickets assuming backend has this endpoint logic (extracted from previous /api/helpdesk/tickets usage)
            const { data } = await api.get('/helpdesk/tickets')
            setTickets(data)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }
    
    fetchTickets()
  }, [])

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-3xl font-bold tracking-tight">Helpdesk</h1>
           <p className="text-muted-foreground">Gerencie seus chamados de suporte técnico.</p>
        </div>
        
        {hasPermission('helpdesk.ticket.create') && (
            <Button onClick={() => router.push('/dashboard/helpdesk/new')}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Chamado
            </Button>
        )}
      </div>

      <div className="grid gap-4">
          {loading ? (
              <p>Carregando...</p>
          ) : tickets.length === 0 ? (
              <Card className="text-center py-10">
                  <CardContent>
                      <LifeBuoy className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-4" />
                      <p className="text-lg font-medium">Nenhum chamado encontrado</p>
                      <p className="text-sm text-muted-foreground">Você ainda não abriu nenhum chamado.</p>
                  </CardContent>
              </Card>
          ) : (
              <div className="border rounded-md">
                 <table className="w-full text-sm">
                     <thead className="bg-muted/50 border-b">
                         <tr>
                             <th className="h-10 px-4 text-left font-medium">ID</th>
                             <th className="h-10 px-4 text-left font-medium">Assunto</th>
                             <th className="h-10 px-4 text-left font-medium">Categoria</th>
                             <th className="h-10 px-4 text-left font-medium">Prioridade</th>
                             <th className="h-10 px-4 text-left font-medium">Status</th>
                             <th className="h-10 px-4 text-left font-medium">Data</th>
                             <th className="h-10 px-4 text-left font-medium">Ações</th>
                         </tr>
                     </thead>
                     <tbody>
                         {tickets.map((ticket: any) => (
                             <tr key={ticket.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                                 <td className="p-4 font-medium">#{ticket.code}</td>
                                 <td className="p-4">{ticket.subject}</td>
                                 <td className="p-4">{ticket.category?.name}</td>
                                 <td className="p-4">
                                     <span className={`px-2 py-1 rounded text-xs font-semibold
                                        ${ticket.priority === 'CRITICAL' ? 'bg-red-100 text-red-700' : 
                                          ticket.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                                          ticket.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' : 
                                          'bg-blue-100 text-blue-700'}`}>
                                        {ticket.priority}
                                     </span>
                                 </td>
                                 <td className="p-4">{ticket.status}</td>
                                 <td className="p-4 text-muted-foreground">{new Date(ticket.createdAt).toLocaleDateString()}</td>
                                 <td className="p-4">
                                     <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/helpdesk/${ticket.id}`)}>
                                         Ver
                                     </Button>
                                 </td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
              </div>
          )}
      </div>
    </div>
  )
}
