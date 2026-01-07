
'use client'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"

const CATEGORIES = [
    { id: "uuid-hardware", name: "Hardware (Computador, Impressora)" }, 
    // Ideally fetch from API. For now hardcoded or we fetch in useEffect.
    // Let's implement fetch.
]

export default function NewTicketPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<{id: string, name: string}[]>([])
  
  // State
  const [subject, setSubject] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState("MEDIUM")
  const [categoryId, setCategoryId] = useState("")

  useEffect(() => {
      fetch('/api/helpdesk/categories', {
          headers: { 'Authorization': `Bearer ${sessionStorage.getItem('token')}` }
      })
      .then(res => res.json())
      .then(data => setCategories(data))
      .catch(console.error)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
        const res = await fetch('/api/helpdesk/tickets', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionStorage.getItem('token')}`
            },
            body: JSON.stringify({
                subject,
                description,
                priority,
                categoryId // UUID
            })
        })

        if (!res.ok) throw new Error('Falha ao criar chamado')

        toast.success("Chamado criado com sucesso!")
        router.push('/dashboard/helpdesk')
    } catch (err) {
        toast.error("Erro ao criar chamado")
        console.error(err)
    } finally {
        setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Abrir Novo Chamado</CardTitle>
          <CardDescription>Descreva seu problema para que possamos ajudar.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
             <div className="space-y-2">
                 <Label>Assunto</Label>
                 <Input 
                    placeholder="Ex: Computador não liga" 
                    value={subject} 
                    onChange={e => setSubject(e.target.value)} 
                    required 
                 />
             </div>
             
             <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                     <Label>Categoria</Label>
                     <Select value={categoryId} onValueChange={setCategoryId} required>
                         <SelectTrigger>
                             <SelectValue placeholder="Selecione..." />
                         </SelectTrigger>
                         <SelectContent>
                             {categories.map(cat => (
                                 <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                             ))}
                         </SelectContent>
                     </Select>
                 </div>
                 <div className="space-y-2">
                     <Label>Prioridade</Label>
                     <Select value={priority} onValueChange={setPriority}>
                         <SelectTrigger>
                             <SelectValue />
                         </SelectTrigger>
                         <SelectContent>
                             <SelectItem value="LOW">Baixa</SelectItem>
                             <SelectItem value="MEDIUM">Média</SelectItem>
                             <SelectItem value="HIGH">Alta</SelectItem>
                             <SelectItem value="CRITICAL">Crítica</SelectItem>
                         </SelectContent>
                     </Select>
                 </div>
             </div>

             <div className="space-y-2">
                 <Label>Descrição Detalhada</Label>
                 <Textarea 
                    placeholder="Descreva o problema com o máximo de detalhes possível..." 
                    className="min-h-[150px]"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    required
                 />
             </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
             <Button variant="ghost" type="button" onClick={() => router.back()}>Cancelar</Button>
             <Button type="submit" disabled={loading}>
                 {loading ? 'Enviando...' : 'Abrir Chamado'}
             </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
