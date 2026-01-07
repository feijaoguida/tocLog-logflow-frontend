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
                const res = await fetch('http://localhost:3000/feed')
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
        <div className="max-w-2xl mx-auto space-y-6 pb-20 pt-6">
            {posts.map(post => (
                <Card key={post.id} className="border-none shadow-xl bg-zinc-900/50 backdrop-blur text-zinc-100">
                    <CardHeader className="flex flex-row items-start gap-4 p-4">
                        <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-zinc-800 text-zinc-300">
                                {post.author.user.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-semibold text-sm text-zinc-100">{post.author.user.name}</h4>
                                    <p className="text-xs text-zinc-400">
                                        {new Date(post.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400">
                                    <MoreHorizontal className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="px-4 py-2">
                         <p className="text-sm leading-relaxed whitespace-pre-wrap text-zinc-200">{post.content}</p>
                    </CardContent>
                    <CardFooter className="flex-col p-0">
                         <div className="flex items-center justify-between px-4 py-2 w-full text-xs text-zinc-500 border-b border-zinc-800">
                             <div className="flex gap-1">
                                 {post.likes.length > 0 && <span>{post.likes.length} curtidas</span>}
                             </div>
                             <div>
                                 {post.comments.length > 0 && <span>{post.comments.length} comentários</span>}
                             </div>
                         </div>
                         <div className="flex items-center justify-between px-2 py-1 w-full">
                             <Button variant="ghost" className="flex-1 gap-2 text-zinc-400 hover:text-primary hover:bg-zinc-800" onClick={handleInteraction}>
                                 <ThumbsUp className="w-4 h-4" /> 
                                 <span className="text-xs">Gostei</span>
                             </Button>
                             <Button variant="ghost" className="flex-1 gap-2 text-zinc-400 hover:text-primary hover:bg-zinc-800" onClick={handleInteraction}>
                                 <MessageSquare className="w-4 h-4" /> 
                                 <span className="text-xs">Comentar</span>
                             </Button>
                             <Button variant="ghost" className="flex-1 gap-2 text-zinc-400 hover:text-primary hover:bg-zinc-800" onClick={handleInteraction}>
                                 <Share2 className="w-4 h-4" /> 
                                 <span className="text-xs">Compartilhar</span>
                             </Button>
                         </div>
                    </CardFooter>
                </Card>
            ))}

            <Dialog open={loginDialogOpen} onOpenChange={setLoginDialogOpen}>
                <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800 text-zinc-100">
                    <DialogHeader>
                        <DialogTitle>Faça login para interagir</DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            Você precisa estar conectado para curtir, comentar e participar das conversas.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex sm:justify-center gap-2 mt-4">
                        <Button variant="ghost" onClick={() => setLoginDialogOpen(false)} className="text-zinc-300 hover:bg-zinc-800">Cancelar</Button>
                        <Button onClick={navigateToLogin} className="bg-primary text-white hover:bg-primary/90">
                            Entrar agora
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
