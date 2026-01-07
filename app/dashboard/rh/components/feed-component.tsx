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

export function FeedComponent() {
    const [posts, setPosts] = useState<FeedPost[]>([])
    const [loading, setLoading] = useState(false)
    const [myProfile, setMyProfile] = useState<Profile | null>(null)
    const [employees, setEmployees] = useState<EmployeeOption[]>([])

    useEffect(() => {
        fetchData()
    }, [])
    
    const fetchData = async () => {
        setLoading(true)
        try {
             const token = localStorage.getItem('token')
             
             // 1. Profile
             const authRes = await fetch('http://localhost:3000/auth/profile', { headers: { 'Authorization': `Bearer ${token}` } });
             const user = await authRes.json();
             
             // 2. Employees
             const empRes = await fetch('http://localhost:3000/employees', { headers: { 'Authorization': `Bearer ${token}` } });
             const allEmployees = await empRes.json();
             
             const me = allEmployees.find((e: any) => e.userId === user.userId);
             if(me) setMyProfile({ ...me })
             
             setEmployees(allEmployees.filter((e: any) => e.status === 'ACTIVE'))

             // 3. Feed
             fetchFeed(token, me?.branchId)

        } catch(e) {}
        finally { setLoading(false) }
    }

    const fetchFeed = async (token: string | null, tenantId?: string) => {
        if(!token) return;
        const feedUrl = tenantId ? `http://localhost:3000/feed?tenantId=${tenantId}` : 'http://localhost:3000/feed';
        const feedRes = await fetch(feedUrl, { headers: { 'Authorization': `Bearer ${token}` } });
        if(feedRes.ok) setPosts(await feedRes.json())
    }

    const handlePost = async (content: string, type: 'TEXT' | 'MEDIA' | 'VIDEO' | 'EVENT', mediaUrls: string[], eventDate: string | undefined, mentions: string[]) => {
        if(!myProfile) return;
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('http://localhost:3000/feed', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    content,
                    authorId: myProfile.id,
                    tenantId: myProfile.branchId,
                    type,
                    mediaUrls,
                    eventDate,
                    mentionedEmployeeIds: mentions
                })
            })
            if(res.ok) {
                toast.success("Publicado!")
                fetchFeed(token, myProfile.branchId)
            } else {
                toast.error("Erro ao publicar")
            }
        } catch(e) { toast.error("Erro ao publicar") }
    }

    const handleDelete = async (postId: string) => {
        if(!confirm("Tem certeza que deseja excluir?")) return;
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`http://localhost:3000/feed/${postId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if(res.ok) {
                toast.success("Post excluído")
                fetchFeed(token, myProfile?.branchId)
            }
        } catch(e) { toast.error("Erro ao excluir") }
    }

    const handleTogglePin = async (post: FeedPost) => {
        try {
            const token = localStorage.getItem('token')
            // Toggle logic: If pinned -> set false. If not -> set true (indefinite or handle logic)
            // Backend treats isFixed boolean.
            const res = await fetch(`http://localhost:3000/feed/${post.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ isFixed: !post.isFixed })
            })
            if(res.ok) {
                toast.success(post.isFixed ? "Desafixado" : "Fixado no topo")
                fetchFeed(token, myProfile?.branchId)
            }
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
            const token = localStorage.getItem('token')
            await fetch(`http://localhost:3000/feed/${postId}/like`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ authorId: myProfile.id })
            })
        } catch(e) { toast.error("Erro ao curtir"); fetchFeed(localStorage.getItem('token'), myProfile.branchId); }
    }

    const handleComment = async (postId: string, content: string) => {
        if(!myProfile) return;
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`http://localhost:3000/feed/${postId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ authorId: myProfile.id, content })
            })
            if(res.ok) {
                toast.success("Comentário enviado")
                fetchFeed(token, myProfile.branchId)
            }
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
