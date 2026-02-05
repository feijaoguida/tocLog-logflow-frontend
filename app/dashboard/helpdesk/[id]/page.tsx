
'use client'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Send } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"

export default function TicketDetailsPage({ params }: { params: { id: string } }) {
  const { user } = useAuth()
  const router = useRouter()
  const [ticket, setTicket] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [newMessage, setNewMessage] = useState("")
  const [sending, setSending] = useState(false)

  const fetchTicket = async () => {
      try {
          const { data } = await api.get(`/helpdesk/tickets/${params.id}`)
          setTicket(data)
      } catch (err) {
          toast.error("Erro ao carregar chamado")
          router.push('/dashboard/helpdesk')
      } finally {
          setLoading(false)
      }
  }

  useEffect(() => {
    if(params.id) fetchTicket()
  }, [params.id])

  const handleSendMessage = async () => {
      if (!newMessage.trim()) return
      setSending(true)

      try {
          await api.post(`/helpdesk/tickets/${params.id}/messages`, {
              content: newMessage
          })

          setNewMessage("")
          fetchTicket() // Refresh to show new message
          toast.success("Mensagem enviada")
      } catch (err) {
          toast.error("Erro ao enviar mensagem")
      } finally {
          setSending(false)
      }
  }

  if (loading) return <div className="p-6">Carregando...</div>
  if (!ticket) return null

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
      </Button>

      <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
              <Card>
                  <CardHeader>
                      <div className="flex justify-between items-start">
                          <div>
                              <CardTitle className="text-xl">#{ticket.code} - {ticket.subject}</CardTitle>
                              <CardDescription className="mt-2">
                                  Aberto em {new Date(ticket.createdAt).toLocaleString()} por {ticket.requester?.userId === user?.id ? 'Você' : ticket.requester?.name}
                              </CardDescription>
                          </div>
                          <Badge variant={
                              ticket.status === 'OPEN' ? 'default' : 
                              ticket.status === 'RESOLVED' ? 'success' : 'secondary'
                          }>{ticket.status}</Badge>
                      </div>
                  </CardHeader>
                  <CardContent>
                      <div className="bg-muted p-4 rounded-md text-sm">
                          {ticket.description}
                      </div>
                  </CardContent>
              </Card>

              <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Histórico</h3>
                  
                  {ticket.messages && ticket.messages.map((msg: any) => (
                      <Card key={msg.id} className={msg.author.userId === user?.id ? "border-primary/20 bg-primary/5 ml-10" : "mr-10"}>
                          <CardHeader className="p-4 pb-2">
                             <div className="flex justify-between text-xs text-muted-foreground">
                                 <span className="font-semibold text-foreground">{msg.author.userId === user?.id ? 'Você' : msg.author.name}</span>
                                 <span>{new Date(msg.createdAt).toLocaleString()}</span>
                             </div>
                          </CardHeader>
                          <CardContent className="p-4 pt-0 text-sm">
                              {msg.content}
                          </CardContent>
                      </Card>
                  ))}

                  <Card>
                      <CardContent className="p-4 space-y-4">
                          <Textarea 
                             placeholder="Digite uma resposta..." 
                             value={newMessage}
                             onChange={e => setNewMessage(e.target.value)}
                          />
                          <div className="flex justify-end">
                              <Button onClick={handleSendMessage} disabled={sending || !newMessage.trim()}>
                                  <Send className="mr-2 h-4 w-4" />
                                  Responder
                              </Button>
                          </div>
                      </CardContent>
                  </Card>
              </div>
          </div>

          <div className="space-y-6">
              <Card>
                  <CardHeader>
                      <CardTitle className="text-sm font-medium">Detalhes</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-3">
                      <div>
                          <span className="text-muted-foreground block">Categoria</span>
                          <span className="font-medium">{ticket.category?.name}</span>
                      </div>
                      <div>
                          <span className="text-muted-foreground block">Prioridade</span>
                          <Badge variant="outline">{ticket.priority}</Badge>
                      </div>
                      <div>
                          <span className="text-muted-foreground block">Responsável</span>
                          <span className="font-medium">{ticket.assignee?.name || 'Não atribuído'}</span>
                      </div>
                      <div>
                          <span className="text-muted-foreground block">SLA Resolução</span>
                          <span className="font-medium">{new Date(ticket.slaDueDate).toLocaleString()}</span>
                      </div>
                  </CardContent>
              </Card>
          </div>
      </div>
    </div>
  )
}
