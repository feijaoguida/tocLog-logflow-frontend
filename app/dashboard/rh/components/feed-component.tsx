'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { MessageSquare, Calendar, ImageIcon } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { FeedPost, Profile, EmployeeOption } from './feed-types'
import { FeedPostItem } from './feed-post-item'
import { FeedComposer } from './feed-composer'
import { StoriesComponent } from './stories-component'
import { FeedbackWidget } from './feedback-widget'
import { api } from "@/lib/api"

export function FeedComponent() {
    const [posts, setPosts] = useState<FeedPost[]>([])
    const [loading, setLoading] = useState(false)
    const [myProfile, setMyProfile] = useState<Profile | null>(null)
    const [employees, setEmployees] = useState<EmployeeOption[]>([])

    const fetchFeed = async (tenantId?: string) => {
        const feedUrl = tenantId ? `/feed?tenantId=${tenantId}` : `/feed`;
        const { data } = await api.get(feedUrl)
        setPosts(data)
    }

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        try {
             // 1. Profile
             const { data: user } = await api.get('/auth/profile')
             
             // 2. Employees
             const { data: allEmployees } = await api.get('/employees')
             
             const me = allEmployees.find((e: any) => e.userId === user.userId);
             if(me) setMyProfile({ ...me })
             
             setEmployees(allEmployees.filter((e: any) => e.status === 'ACTIVE'))

             // 3. Feed
             fetchFeed(me?.branchId)

        } catch(e) {}
        finally { setLoading(false) }
    }

    const handlePost = async (content: string, type: 'TEXT' | 'MEDIA' | 'VIDEO' | 'EVENT', mediaUrls: string[], eventDate: string | undefined, mentions: string[]) => {
        if(!myProfile) return;
        try {
            await api.post('/feed', {
                content,
                authorId: myProfile.id,
                tenantId: myProfile.branchId,
                type,
                mediaUrls,
                eventDate,
                mentionedEmployeeIds: mentions
            })

            toast.success("Publicado!")
            fetchFeed(myProfile.branchId)
        } catch(e) { toast.error("Erro ao publicar") }
    }

    const handleDelete = async (postId: string) => {
        if(!confirm("Tem certeza que deseja excluir?")) return;
        try {
            await api.delete(`/feed/${postId}`)
            
            toast.success("Post excluído")
            fetchFeed(myProfile?.branchId)
        } catch(e) { toast.error("Erro ao excluir") }
    }

    const handleTogglePin = async (post: FeedPost) => {
        try {
            // Toggle logic: If pinned -> set false. If not -> set true (indefinite or handle logic)
            // Backend treats isFixed boolean.
            await api.patch(`/feed/${post.id}`, { isFixed: !post.isFixed })

            toast.success(post.isFixed ? "Desafixado" : "Fixado no topo")
            fetchFeed(myProfile?.branchId)
        } catch(e) {}
    }

    const handleLike = async (postId: string) => {
        if(!myProfile) return;
        // Optimistic UI
        setPosts(current => current.map(p => {
             if(p.id === postId) {
                 const alreadyLiked = p.likes.some(l => l.authorId === myProfile.id);
                 return {
                     ...p,
                     likes: alreadyLiked 
                        ? p.likes.filter(l => l.authorId !== myProfile.id)
                        : [...p.likes, { id: 'temp', authorId: myProfile.id }]
                 }
             }
             return p;
        }));

        try {
            await api.post(`/feed/${postId}/like`, { authorId: myProfile.id })
        } catch(e) { toast.error("Erro ao curtir"); fetchFeed(myProfile.branchId); }
    }

    const handleComment = async (postId: string, content: string) => {
        if(!myProfile) return;
        try {
            await api.post(`/feed/${postId}/comments`, { authorId: myProfile.id, content })
            toast.success("Comentário enviado")
            fetchFeed(myProfile.branchId)
        } catch(e) { toast.error("Erro ao comentar") }
    }

    const getRoleName = (p: Profile | null) => {
        if (!p) return '';
        if (typeof p.role === 'string') return p.role;
        return p.role?.name || '';
    }

    const roleName = getRoleName(myProfile);
    const canManage = (roleName === 'ADMIN' || roleName === 'MANAGER');

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Left Column: Profile Card */}
            <div className="hidden md:block col-span-1 space-y-4">
                <Card className="overflow-hidden border-none shadow-md sticky top-6">
                    <div className="h-24 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
                    <CardContent className="pt-0 relative px-4 pb-4 text-center">
                        <Avatar className="h-20 w-20 border-4 border-background absolute -top-10 left-1/2 transform -translate-x-1/2 shadow-sm">
                             <AvatarFallback className="text-xl bg-slate-100 font-bold text-slate-700">{myProfile?.user.name.substring(0,2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="mt-12 space-y-1">
                            <h3 className="font-semibold text-lg leading-tight text-slate-900">{myProfile?.user.name}</h3>
                            <p className="text-sm text-slate-500">{myProfile?.user.email}</p>
                            <Badge variant="outline" className="mt-2 font-normal border-blue-200 text-blue-700 bg-blue-50">{getRoleName(myProfile)}</Badge>
                        </div>
                        <Separator className="my-4" />
                        <div className="text-left space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Colegas</span>
                                <span className="font-medium text-slate-900">{employees.length}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Visualizações</span>
                                <span className="font-medium text-blue-600">1.2k</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                
                <div className="text-xs text-slate-400 text-center space-y-1">
                    <p>Políticas de RH &bull; Benefícios &bull; Ajuda</p>
                    <p>TocLog Intranet &copy; 2025</p>
                </div>
            </div>

            {/* Center Column: Feed */}
            <div className="col-span-1 md:col-span-3 lg:col-span-2 space-y-6">
                 {/* Stories */}
                 <StoriesComponent currentUser={myProfile} onRefreshNeeded={() => {}} />

                 {/* Composer */}
                 <FeedComposer currentUser={myProfile} employees={employees} onPost={handlePost} />

                {/* Feed Stream */}
                <div className="space-y-6">
                    {posts.map(post => (
                        <FeedPostItem 
                            key={post.id} 
                            post={post} 
                            currentUser={myProfile}
                            canManage={canManage}
                            onLike={handleLike}
                            onComment={handleComment}
                            onDelete={handleDelete}
                            onTogglePin={handleTogglePin}
                        />
                    ))}
                     {posts.length === 0 && (
                         <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-dashed border-slate-200">
                             <MessageSquare className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                             <h3 className="text-base font-medium text-slate-700">O feed está silencioso</h3>
                             <p className="text-sm text-slate-500 max-w-[250px] mx-auto mt-1">Seja o primeiro a compartilhar uma novidade ou conquista!</p>
                         </div>
                     )}
                </div>
            </div>

            {/* Right Column: Widgets */}
            <div className="hidden lg:block col-span-1 space-y-6">
                 {/* Feedback Widget - Moved here as requested */}
                 <FeedbackWidget />

                 <Card className="border-none shadow-md sticky top-6">
                     <CardHeader className="pb-3 border-b border-slate-100">
                         <CardTitle className="text-sm font-semibold text-slate-800">Quadro de Avisos</CardTitle>
                     </CardHeader>
                     <CardContent className="space-y-4 pt-4">
                         <div className="flex gap-3 items-start group cursor-pointer">
                             <div className="bg-blue-50 p-2 rounded-lg group-hover:bg-blue-100 transition-colors"><Calendar className="w-5 h-5 text-blue-600" /></div>
                             <div>
                                 <p className="text-sm font-medium text-slate-900 group-hover:text-blue-700 transition-colors">Reunião Geral</p>
                                 <p className="text-xs text-slate-500">Sexta-feira, 15:00</p>
                             </div>
                         </div>
                         <div className="flex gap-3 items-start group cursor-pointer">
                             <div className="bg-green-50 p-2 rounded-lg group-hover:bg-green-100 transition-colors"><ImageIcon className="w-5 h-5 text-green-600" /></div>
                             <div>
                                 <p className="text-sm font-medium text-slate-900 group-hover:text-green-700 transition-colors">Fotos do Evento</p>
                                 <p className="text-xs text-slate-500">Confira a galeria anual</p>
                             </div>
                         </div>
                     </CardContent>
                 </Card>
            </div>
        </div>
    )
}
