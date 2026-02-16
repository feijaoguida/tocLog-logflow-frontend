'use client'

import { useState } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { Image as ImageIcon, Calendar } from "lucide-react"
import { Profile, EmployeeOption } from './feed-types'
import { toast } from "sonner"

interface IntranetComposerProps {
    currentUser: Profile | null
    employees: EmployeeOption[]
    onPost: (content: string, type: 'TEXT' | 'MEDIA' | 'VIDEO' | 'EVENT', mediaUrls: string[], eventDate: string | undefined, mentions: string[]) => Promise<void>
}

export function IntranetComposer({ currentUser, employees, onPost }: IntranetComposerProps) {
    const [content, setContent] = useState("")
    const [loading, setLoading] = useState(false)

    const handlePost = async () => {
        if (!content.trim()) return
        setLoading(true)
        try {
            await onPost(content, 'TEXT', [], undefined, [])
            setContent("")
            toast.success("Publicado com sucesso!")
        } catch (error) {
            toast.error("Erro ao publicar.")
        } finally {
            setLoading(false)
        }
    }

    if (!currentUser) return null

    return (
        <Card className="border-border/50 shadow-sm overflow-hidden">
            <CardContent className="p-4">
                <div className="flex gap-4">
                    <Avatar className="h-10 w-10">
                        <AvatarImage src={currentUser.avatarUrl} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                            {currentUser.user.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-3">
                        <Textarea 
                            placeholder={`No que você está pensando, ${currentUser.user.name.split(' ')[0]}?`}
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            className="min-h-[60px] border-0 bg-muted/50 focus-visible:ring-1 resize-none text-sm"
                        />
                        <div className="flex items-center justify-between">
                            <div className="flex gap-2">
                                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-success hover:bg-success/10 h-8 px-2">
                                    <ImageIcon className="w-4 h-4 mr-2" />
                                    <span className="text-xs font-medium">Mídia</span>
                                </Button>
                                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-info hover:bg-info/10 h-8 px-2">
                                    <Calendar className="w-4 h-4 mr-2" />
                                    <span className="text-xs font-medium">Evento</span>
                                </Button>
                            </div>
                            <Button 
                                size="sm" 
                                onClick={handlePost} 
                                disabled={!content.trim() || loading}
                                className="px-6"
                            >
                                {loading ? 'Publicando...' : 'Publicar'}
                            </Button>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
