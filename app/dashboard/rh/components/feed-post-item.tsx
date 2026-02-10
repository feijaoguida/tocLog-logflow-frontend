'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ThumbsUp, MessageSquare, Send, Pin, Trash2, MoreVertical, MoreHorizontal, Eye, Calendar, Image as ImageIcon } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { FeedPost, Profile } from './feed-types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface FeedPostItemProps {
    post: FeedPost
    currentUser: Profile | null
    onLike: (postId: string) => void
    onComment: (postId: string, content: string) => void
    onDelete: (postId: string) => void
    onTogglePin: (post: FeedPost) => void
    canManage: boolean
}

export function FeedPostItem({ post, currentUser, onLike, onComment, onDelete, onTogglePin, canManage }: FeedPostItemProps) {
    const [commentText, setCommentText] = useState("")
    const [commentsOpen, setCommentsOpen] = useState(false)
    const [isHovered, setIsHovered] = useState(false)

    const isAuthor = post.authorId === currentUser?.id
    const isLiked = post.likes.some(l => l.authorId === currentUser?.id)

    const handleCommentSubmit = () => {
        if (!commentText.trim()) return
        onComment(post.id, commentText)
        setCommentText("")
    }

    // Determine initials
    const initials = post.author.user.name.substring(0, 2).toUpperCase()

    // Render Media
    const renderMedia = () => {
        if (!post.mediaUrls || post.mediaUrls.length === 0) return null;
        
        // Simple grid for now. 
        if (post.type === 'VIDEO') {
             return (
                 <div className="mt-4 rounded-lg overflow-hidden bg-black">
                     <video src={post.mediaUrls[0]} controls className="w-full max-h-[400px] object-contain" />
                 </div>
             )
        }
        
        return (
            <div className={`mt-4 grid gap-2 ${post.mediaUrls.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {post.mediaUrls.map((url, idx) => (
                    <img key={idx} src={url} alt="Post media" className="rounded-lg object-cover w-full h-full max-h-[400px]" />
                ))}
            </div>
        )
    }

    // Render Event
    const renderEvent = () => {
        if (post.type !== 'EVENT' || !post.eventDate) return null;
        const date = new Date(post.eventDate);
        return (
             <div className="mt-4 flex items-center gap-4 bg-blue-50 p-4 rounded-lg border border-blue-100">
                 <div className="flex flex-col items-center justify-center bg-white rounded-md shadow-sm w-16 h-16 border border-blue-200">
                     <span className="text-xs font-bold text-red-500 uppercase">{format(date, 'MMM', { locale: ptBR })}</span>
                     <span className="text-2xl font-bold text-slate-800">{format(date, 'dd')}</span>
                 </div>
                 <div>
                     <h5 className="font-semibold text-blue-900">Evento Programado</h5>
                     <p className="text-sm text-blue-700">{format(date, "EEEE, dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}</p>
                 </div>
             </div>
        )
    }

    return (
        <Card 
            className={`group border-none shadow-md transition-shadow hover:shadow-lg glass ${post.isFixed ? 'ring-2 ring-yellow-400/50' : ''}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <CardHeader className="flex flex-row items-start gap-3 space-y-0 p-4">
                <Avatar className="h-10 w-10 cursor-pointer ring-1 ring-border">
                    <AvatarFallback className="bg-primary/10 text-primary font-medium">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                        <div>
                            <h4 className="font-semibold text-sm hover:underline cursor-pointer text-foreground">{post.author.user.name}</h4>
                            <p className="text-xs text-muted-foreground truncate">{post.author.user.email}</p>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                <span>{format(new Date(post.createdAt), "d 'de' MMM", { locale: ptBR })}</span>
                                <span>&bull;</span>
                                {post.viewCount !== undefined && (
                                    <span className="flex items-center gap-1" title={`${post.viewCount} visualizações`}>
                                        <Eye className="w-3 h-3" /> {post.viewCount}
                                    </span>
                                )}
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-1">
                            {post.isFixed && (
                                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200 transition-colors dark:bg-yellow-900/30 dark:text-yellow-200 dark:border-yellow-900/50">
                                    <Pin className="w-3 h-3 mr-1 fill-yellow-800 dark:fill-yellow-200" /> Destaque
                                </Badge>
                            )}
                            
                            {(canManage || isAuthor) && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                                            <MoreVertical className="w-4 h-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="glass">
                                        {canManage && (
                                            <DropdownMenuItem onClick={() => onTogglePin(post)}>
                                                <Pin className="w-4 h-4 mr-2" /> {post.isFixed ? "Remover Destaque" : "Destacar no Topo"}
                                            </DropdownMenuItem>
                                        )}
                                        {(canManage || isAuthor) && (
                                            <DropdownMenuItem className="text-red-500 focus:text-red-500 focus:bg-red-500/10" onClick={() => onDelete(post.id)}>
                                                <Trash2 className="w-4 h-4 mr-2" /> Excluir Publicação
                                            </DropdownMenuItem>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="px-4 py-2">
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">{post.content}</p>
                {renderMedia()}
                {renderEvent()}
                
                {/* Mentions Display (if any) */}
                {/* Mentions are typically part of content or listed. We can list them if we want to be explicit. */}
            </CardContent>
            
            <CardFooter className="flex-col p-0">
                {/* Stats Row */}
                <div className="flex items-center justify-between px-4 py-2 w-full text-xs text-muted-foreground border-b border-border/40 bg-muted/20">
                    <div className="flex items-center gap-3">
                        {post.likes.length > 0 && (
                            <div className="flex items-center gap-1 hover:text-blue-500 transition-colors cursor-pointer">
                                <div className="bg-blue-500 rounded-full p-1"><ThumbsUp className="w-2 h-2 text-white fill-white" /></div>
                                <span className="font-medium">{post.likes.length}</span>
                            </div>
                        )}
                    </div>
                    <div>
                         {post.comments.length > 0 && <span className="hover:underline cursor-pointer" onClick={() => setCommentsOpen(!commentsOpen)}>{post.comments.length} comentários</span>}
                    </div>
                </div>

                {/* Actions Row */}
                <div className="flex items-center justify-between px-2 py-1 w-full bg-card/50">
                    <Button 
                        variant="ghost" 
                        className={`flex-1 gap-2 rounded-xl transition-all active:scale-95 ${isLiked ? 'text-blue-500 font-semibold bg-blue-500/10' : 'text-muted-foreground hover:bg-muted'}`} 
                        onClick={() => onLike(post.id)}
                    >
                        <ThumbsUp className={`w-4 h-4 ${isLiked ? 'fill-blue-500' : ''}`} /> 
                        <span className="text-xs">Curtir</span>
                    </Button>
                    <Button 
                        variant="ghost" 
                        className="flex-1 gap-2 text-muted-foreground hover:bg-muted rounded-xl"
                        onClick={() => setCommentsOpen(!commentsOpen)}
                    >
                        <MessageSquare className="w-4 h-4" /> 
                        <span className="text-xs">Comentar</span>
                    </Button>
                    <Button variant="ghost" className="flex-1 gap-2 text-muted-foreground hover:bg-muted rounded-xl">
                        <Send className="w-4 h-4" /> 
                        <span className="text-xs">Compartilhar</span>
                    </Button>
                </div>

                 {/* Comments Section */}
                 {(commentsOpen || (post.comments.length > 0 && commentsOpen)) && (
                     <div className="bg-muted/30 px-4 py-3 space-y-4 w-full border-t border-border/50 animate-in slide-in-from-top-2 duration-200">
                         {/* Comment Input */}
                        <div className="flex gap-3">
                            <Avatar className="w-8 h-8 ring-2 ring-background">
                                <AvatarFallback className="text-xs bg-muted text-muted-foreground">{currentUser?.user.name.substring(0,2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 relative group/input">
                                <Textarea 
                                    placeholder="Escreva um comentário..." 
                                    className="min-h-[40px] h-[40px] py-2 resize-none pr-12 text-sm rounded-2xl border-border bg-background focus:border-blue-500 focus:ring-blue-500/20 transition-all"
                                    value={commentText}
                                    onChange={e => setCommentText(e.target.value)}
                                    onKeyDown={e => {
                                        if(e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleCommentSubmit();
                                        }
                                    }}
                                />
                                <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className="absolute right-1 top-1 h-8 w-8 text-blue-500 hover:bg-blue-500/10 rounded-full"
                                    onClick={handleCommentSubmit}
                                    disabled={!commentText.trim()}
                                >
                                    <Send className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                         {post.comments.map(c => (
                             <div key={c.id} className="flex gap-2 text-sm group/comment">
                                 <Avatar className="w-8 h-8 mt-0.5 ring-1 ring-border">
                                      <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">{c.author.user.name.substring(0,2).toUpperCase()}</AvatarFallback>
                                 </Avatar>
                                 <div className="space-y-1 max-w-[90%]">
                                     <div className="bg-background border border-border/60 rounded-2xl px-4 py-2 shadow-sm">
                                         <span className="font-semibold text-xs block text-foreground hover:underline cursor-pointer mb-0.5">{c.author.user.name}</span>
                                         <span className="text-foreground/90 text-sm leading-relaxed break-words">{c.content}</span>
                                     </div>
                                 </div>
                             </div>
                         ))}
                     </div>
                 )}
            </CardFooter>
        </Card>
    )
}
