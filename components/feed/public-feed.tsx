'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { MessageSquare, ThumbsUp, Share2, MoreHorizontal } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2 } from "lucide-react"

interface FeedPost {
    id: string
    content: string
    authorId: string
    author: { user: { name: string, email: string } }
    likes: { id: string, authorId: string }[]
    comments: { id: string }[]
    createdAt: string
}

export function PublicFeed() {
    const [posts, setPosts] = useState<FeedPost[]>([])
    const [loading, setLoading] = useState(true)
    const [loginDialogOpen, setLoginDialogOpen] = useState(false)
    const router = useRouter()

    useEffect(() => {
        const fetchPosts = async () => {
            try {
                // Public endpoint
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://162.215.222.208:4000'}/feed`)
                if (res.ok) {
                    const data = await res.json()
                    setPosts(data)
                }
            } catch (error) {
                console.error("Failed to fetch public feed", error)
            } finally {
                setLoading(false)
            }
        }
        fetchPosts()
    }, [])

    const handleInteraction = () => {
        setLoginDialogOpen(true)
    }

    const navigateToLogin = () => {
        router.push('/login')
    }

    if (loading) {
        return (
            <div className="flex justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-6 pb-20">
            {posts.map(post => (
                <Card key={post.id} className="border-none shadow-sm hover:shadow-md transition-shadow bg-card text-card-foreground overflow-hidden">
                    <CardHeader className="flex flex-row items-start gap-4 p-4 pb-2 space-y-0">
                        <Avatar className="h-10 w-10 border border-border">
                            <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                {post.author.user.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-semibold text-sm text-foreground hover:text-primary cursor-pointer transition-colors">{post.author.user.name}</h4>
                                    <p className="text-xs text-muted-foreground">
                                        {new Date(post.createdAt).toLocaleDateString()} às {new Date(post.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </p>
                                </div>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                    <MoreHorizontal className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="px-4 py-2 space-y-3">
                         <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">{post.content}</p>
                         
                         {/* Image Rendering if available (Assuming post structure might have media in future) */}
                         {/* 
                         {post.mediaUrls && post.mediaUrls.length > 0 && (
                            <div className="rounded-lg overflow-hidden border">
                                <img src={post.mediaUrls[0]} className="w-full h-auto object-cover" />
                            </div>
                         )} 
                         */}
                    </CardContent>
                    <CardFooter className="flex-col p-0">
                         <div className="flex items-center justify-between px-4 py-2 w-full text-xs text-muted-foreground border-b border-border">
                             <div className="flex gap-1 items-center">
                                 {post.likes.length > 0 && (
                                    <>
                                        <div className="bg-primary/20 p-1 rounded-full"><ThumbsUp className="w-3 h-3 text-primary" fill="currentColor" /></div>
                                        <span>{post.likes.length}</span>
                                    </>
                                 )}
                             </div>
                             <div>
                                 {post.comments.length > 0 && <span>{post.comments.length} comentários</span>}
                             </div>
                         </div>
                         <div className="flex items-center justify-between px-2 py-1 w-full bg-muted/30">
                             <Button variant="ghost" className="flex-1 gap-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" onClick={handleInteraction}>
                                 <ThumbsUp className="w-4 h-4" /> 
                                 <span className="text-xs font-medium">Curtir</span>
                             </Button>
                             <Button variant="ghost" className="flex-1 gap-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" onClick={handleInteraction}>
                                 <MessageSquare className="w-4 h-4" /> 
                                 <span className="text-xs font-medium">Comentar</span>
                             </Button>
                             <Button variant="ghost" className="flex-1 gap-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" onClick={handleInteraction}>
                                 <Share2 className="w-4 h-4" /> 
                                 <span className="text-xs font-medium">Compartilhar</span>
                             </Button>
                         </div>
                    </CardFooter>
                </Card>
            ))}

            <Dialog open={loginDialogOpen} onOpenChange={setLoginDialogOpen}>
                <DialogContent className="sm:max-w-md bg-card text-card-foreground border-border">
                    <DialogHeader>
                        <DialogTitle>Faça login para interagir</DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                            Você precisa estar conectado para curtir, comentar e participar das conversas.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex sm:justify-center gap-2 mt-4">
                        <Button variant="ghost" onClick={() => setLoginDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={navigateToLogin} className="bg-primary text-primary-foreground hover:bg-primary/90">
                            Entrar agora
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
