'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { ThumbsUp, MessageSquare, Share2, MoreHorizontal, MapPin } from "lucide-react"
import { FeedPost, Profile } from './feed-types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface IntranetPostProps {
    post: FeedPost
    currentUser: Profile | null
    onLike: (postId: string) => void
    onComment: (postId: string, content: string) => void
}

export function IntranetPost({ post, currentUser, onLike, onComment }: IntranetPostProps) {
    const isLiked = post.likes.some(l => l.authorId === currentUser?.id)
    const [liked, setLiked] = useState(isLiked)
    const [likesCount, setLikesCount] = useState(post.likes.length)

    const handleLike = () => {
        // Optimistic UI
        setLiked(!liked)
        setLikesCount(prev => liked ? prev - 1 : prev + 1)
        onLike(post.id)
    }

    return (
        <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
            <CardHeader className="flex flex-row items-center gap-3 p-4 pb-2">
                <Avatar className="cursor-pointer ring-2 ring-background">
                    <AvatarImage src={post.author.user.email /* Placeholder for avatar url if available in user object */} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {post.author.user.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                    <div className="flex justify-between items-start">
                        <div>
                            <h4 className="font-semibold text-sm text-foreground hover:underline cursor-pointer">
                                {post.author.user.name}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                                {format(new Date(post.createdAt), "d 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                            </p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                            <MoreHorizontal className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-4 pt-2 space-y-3">
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                    {post.content}
                </p>
                
                {/* Media Placeholder */}
                {post.mediaUrls && post.mediaUrls.length > 0 && (
                    <div className="rounded-lg overflow-hidden border border-border/50 bg-muted/20 mt-2">
                        {/* Assuming images for now */}
                        <img src={post.mediaUrls[0]} alt="Post media" className="w-full h-auto max-h-[400px] object-cover" />
                    </div>
                )}

                 {/* Event Placeholder */}
                 {post.type === 'EVENT' && post.eventDate && (
                    <div className="flex items-center gap-4 bg-info/5 p-3 rounded-lg border border-info/10">
                        <div className="bg-background p-2 rounded-md shadow-sm text-center min-w-[60px]">
                             <span className="block text-xs font-bold text-info uppercase">{format(new Date(post.eventDate), 'MMM', { locale: ptBR })}</span>
                             <span className="block text-xl font-bold text-foreground">{format(new Date(post.eventDate), 'dd')}</span>
                        </div>
                        <div>
                            <h5 className="font-semibold text-sm text-foreground">Evento Programado</h5>
                            <p className="text-xs text-muted-foreground">{format(new Date(post.eventDate), "EEEE, HH:mm", { locale: ptBR })}</p>
                        </div>
                    </div>
                 )}

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
                    <div className="flex items-center gap-1">
                        {likesCount > 0 && (
                            <>
                                <div className="bg-primary rounded-full p-[2px]">
                                    <ThumbsUp className="w-2 h-2 text-primary-foreground fill-primary-foreground" />
                                </div>
                                <span>{likesCount}</span>
                            </>
                        )}
                    </div>
                    <span>{post.comments.length} comentários</span>
                </div>
            </CardContent>
            <Separator />
            <CardFooter className="p-0 grid grid-cols-3 divide-x divide-border/50 bg-muted/20">
                <Button 
                    variant="ghost" 
                    onClick={handleLike}
                    className={`rounded-none h-10 hover:bg-muted/50 ${liked ? 'text-primary' : 'text-muted-foreground'}`}
                >
                    <ThumbsUp className={`w-4 h-4 mr-2 ${liked ? 'fill-primary' : ''}`} />
                    <span className="text-xs font-medium">Curtir</span>
                </Button>
                <Button variant="ghost" className="rounded-none h-10 text-muted-foreground hover:bg-muted/50">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    <span className="text-xs font-medium">Comentar</span>
                </Button>
                <Button variant="ghost" className="rounded-none h-10 text-muted-foreground hover:bg-muted/50">
                    <Share2 className="w-4 h-4 mr-2" />
                    <span className="text-xs font-medium">Compartilhar</span>
                </Button>
            </CardFooter>
        </Card>
    )
}
