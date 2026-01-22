'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/auth-context'
import { StoriesComponent } from './rh/components/stories-component'
import { FeedComposer } from './rh/components/feed-composer'
import { PublicFeed } from '@/components/feed/public-feed'
import { FeedbackWidget } from './rh/components/feedback-widget'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Calendar, ChevronRight, Image as ImageIcon } from "lucide-react" // Changed Image to ImageIcon
import { toast } from "sonner"
import { Profile, EmployeeOption } from './rh/components/feed-types'

export default function DashboardPage() {
  const { user } = useAuth()
  const [employees, setEmployees] = useState<EmployeeOption[]>([])
  const [feedRefreshKey, setFeedRefreshKey] = useState(0)
  const [storiesRefreshKey, setStoriesRefreshKey] = useState(0)

  // Cast Auth User to Profile structure expected by components
  const currentProfile: Profile | null = user ? {
      id: user.id || 'current', // fallback
      user: {
          name: user.name,
          email: user.email,
          avatarUrl: undefined // Add to auth user if available
      },
      department: { name: 'Geral' },
      position: 'Colaborador'
  } : null;

  useEffect(() => {
      fetchEmployees()
  }, [])

  const fetchEmployees = async () => {
      try {
          const token = localStorage.getItem('token')
          if (!token) return
          const res = await fetch('http://localhost:3000/employees', {
               headers: { 'Authorization': `Bearer ${token}` }
          })
          if (res.ok) {
              const data = await res.json()
              // Map to options
              setEmployees(data.map((e: any) => ({
                  id: e.id,
                  user: { name: e.user.name, email: e.user.email }
              })))
          }
      } catch (e) { console.error("Failed to fetch employees", e)}
  }

  const handlePost = async (content: string, type: string, mediaUrls: string[], eventDate: string | undefined, mentions: string[]) => {
      try {
          const token = localStorage.getItem('token')
          const res = await fetch('http://localhost:3000/feed', {
              method: 'POST',
              headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                  content,
                  type,
                  mediaUrls,
                  eventDate,
                  mentions
              })
          })
          
          if (res.ok) {
              toast.success("Post publicado com sucesso!")
              setFeedRefreshKey(prev => prev + 1)
          } else {
              toast.error("Erro ao publicar post.")
          }
      } catch (error) {
           toast.error("Erro de conexão.")
      }
  }

  const handleRefreshStories = () => {
       setStoriesRefreshKey(prev => prev + 1)
  }

  if (!user) return <div className="p-8">Carregando...</div>

  return (
    <div className="container mx-auto max-w-7xl pt-4 space-y-6">
       {/* Top Section: Stories */}
       <section>
          <StoriesComponent 
            currentUser={currentProfile} 
            onRefreshNeeded={handleRefreshStories} 
            key={storiesRefreshKey}
          />
       </section>

       <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
           {/* Left/Center Column: Feed (8 cols) */}
           <div className="lg:col-span-8 space-y-6">
               <FeedComposer 
                  currentUser={currentProfile}
                  employees={employees}
                  onPost={handlePost}
               />
               <PublicFeed key={feedRefreshKey} />
           </div>

           {/* Right Column: Widgets (4 cols) */}
           <div className="lg:col-span-4 space-y-6">
               {/* Profile/Stats Card */}
               <Card className="overflow-hidden border-none shadow-md">
                   <div className="h-24 bg-gradient-to-r from-red-600 to-red-500"></div>
                   <CardContent className="pt-0 relative">
                       <Avatar className="h-20 w-20 border-4 border-white absolute -top-10 shadow-sm">
                           <AvatarFallback className="bg-slate-200 text-slate-600 text-xl font-bold">
                               {user.name.substring(0,2).toUpperCase()}
                           </AvatarFallback>
                       </Avatar>
                       <div className="mt-12">
                           <h3 className="font-bold text-lg">{user.name}</h3>
                           <p className="text-sm text-muted-foreground">{user.email}</p>
                           <div className="flex gap-2 mt-2">
                               <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10">
                                   {typeof user.role === 'string' ? user.role : user.role?.name || 'MEMBER'}
                               </span>
                           </div>
                           
                           <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t">
                               <div className="text-center">
                                   <div className="text-2xl font-bold text-slate-800">106</div>
                                   <div className="text-xs text-slate-500">Colegas</div>
                               </div>
                               <div className="text-center border-l">
                                   <div className="text-2xl font-bold text-slate-800">1.2k</div>
                                   <div className="text-xs text-slate-500">Visualizações</div>
                               </div>
                           </div>
                           
                           <div className="mt-6 flex justify-between text-xs text-slate-400">
                               <a href="#" className="hover:underline">Políticas de RH</a>
                               <span>•</span>
                               <a href="#" className="hover:underline">Benefícios</a>
                               <span>•</span>
                               <a href="#" className="hover:underline">Ajuda</a>
                           </div>
                       </div>
                   </CardContent>
               </Card>

               <FeedbackWidget />

               {/* Notice Board */}
               <Card className="border-none shadow-md">
                   <CardHeader className="pb-2">
                       <CardTitle className="text-sm font-bold text-red-600 uppercase tracking-wider flex items-center gap-2">
                           • Quadro de Avisos
                       </CardTitle>
                   </CardHeader>
                   <CardContent className="space-y-4">
                       <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer group">
                           <div className="bg-red-100 p-2 rounded-lg text-red-600 group-hover:bg-red-200 transition-colors">
                               <Calendar className="w-5 h-5" />
                           </div>
                           <div className="flex-1">
                               <h4 className="text-sm font-semibold text-slate-800">Reunião Geral</h4>
                               <p className="text-xs text-slate-500">Sexta-feira, 15:00</p>
                           </div>
                           <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-red-500" />
                       </div>

                       <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer group">
                           <div className="bg-red-100 p-2 rounded-lg text-red-600 group-hover:bg-red-200 transition-colors">
                               <ImageIcon className="w-5 h-5" />
                           </div>
                           <div className="flex-1">
                               <h4 className="text-sm font-semibold text-slate-800">Fotos do Evento</h4>
                               <p className="text-xs text-slate-500">Confira a galeria anual</p>
                           </div>
                           <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-red-500" />
                       </div>
                   </CardContent>
               </Card>
           </div>
       </div>
    </div>
  )
}
