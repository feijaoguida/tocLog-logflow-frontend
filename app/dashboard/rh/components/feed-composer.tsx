'use client'

import { useState } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Image as ImageIcon, Video, Calendar, UserPlus, X, Paperclip } from "lucide-react"
import { Profile, EmployeeOption } from './feed-types'
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { ImageUpload } from "@/components/image-upload"

interface FeedComposerProps {
    currentUser: Profile | null
    employees: EmployeeOption[]
    onPost: (content: string, type: 'TEXT' | 'MEDIA' | 'VIDEO' | 'EVENT', mediaUrls: string[], eventDate: string | undefined, mentions: string[]) => Promise<void>
}

export function FeedComposer({ currentUser, employees, onPost }: FeedComposerProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [content, setContent] = useState("")
    const [taggedIds, setTaggedIds] = useState<string[]>([])
    const [type, setType] = useState<'TEXT' | 'MEDIA' | 'VIDEO' | 'EVENT'>('TEXT')
    const [mediaUrl, setMediaUrl] = useState("") // Single URL for simplicity initially
    const [eventDate, setEventDate] = useState("")

    const handlePost = async () => {
        if (!content.trim()) return
        
        const mediaUrls = mediaUrl ? [mediaUrl] : [];
        await onPost(content, type, mediaUrls, eventDate || undefined, taggedIds)
        
        // Reset
        setContent("")
        setTaggedIds([])
        setType('TEXT')
        setMediaUrl("")
        setEventDate("")
        setIsOpen(false)
    }

    const toggleTag = (id: string) => {
        setTaggedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    }

    if (!currentUser) return null;

    return (
        <Card className="border-none shadow-sm hover:shadow-md transition-shadow glass">
            <CardContent className="p-4">
                <div className="flex gap-4 items-center">
                    <Avatar className="h-10 w-10 ring-2 ring-primary/10">
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                            {currentUser.user.name.substring(0,2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div 
                        className="flex-1 bg-muted/50 hover:bg-muted/80 rounded-full h-12 px-5 flex items-center text-muted-foreground border border-transparent hover:border-border cursor-text transition-all"
                        onClick={() => setIsOpen(true)}
                    >
                        No que você está pensando, {currentUser.user.name.split(' ')[0]}?
                    </div>
                </div>

                {isOpen && (
                    <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-2">
                        <Textarea 
                           autoFocus
                           placeholder="Compartilhe suas ideias, conquistas ou avisos..." 
                           value={content}
                           onChange={e => setContent(e.target.value)}
                           className="min-h-[120px] resize-none border-none focus-visible:ring-0 text-lg p-2 placeholder:text-muted-foreground bg-transparent text-foreground"
                        />

                        {/* Additional Inputs based on Type */}
                        {type === 'MEDIA' && (
                            <div className="bg-muted/30 p-3 rounded-lg flex gap-2 items-start animate-in zoom-in-95 border border-border/50">
                                <ImageIcon className="w-4 h-4 text-primary mt-2" />
                                <div className="flex-1">
                                    <ImageUpload
                                        value={mediaUrl}
                                        onChange={setMediaUrl}
                                        folder="post"
                                        placeholder="Carregar Mídia"
                                        className="w-full"
                                    />
                                </div>
                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted" onClick={() => { setType('TEXT'); setMediaUrl(''); }}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        )}
                        {type === 'VIDEO' && (
                            <div className="bg-purple-500/10 p-3 rounded-lg flex gap-2 items-center animate-in zoom-in-95 border border-purple-500/20">
                                <Video className="w-4 h-4 text-purple-500" />
                                <Input 
                                    placeholder="Cole a URL do vídeo aqui..." 
                                    value={mediaUrl} 
                                    onChange={e => setMediaUrl(e.target.value)}
                                    className="h-8 text-sm bg-background/50 border-border"
                                />
                                 <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted" onClick={() => { setType('TEXT'); setMediaUrl(''); }}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        )}
                        {type === 'EVENT' && (
                            <div className="bg-orange-500/10 p-3 rounded-lg flex gap-2 items-center animate-in zoom-in-95 border border-orange-500/20">
                                <Calendar className="w-4 h-4 text-orange-500" />
                                <Input 
                                    type="datetime-local"
                                    value={eventDate} 
                                    onChange={e => setEventDate(e.target.value)}
                                    className="h-8 text-sm bg-background/50 border-border w-auto"
                                />
                                 <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted" onClick={() => { setType('TEXT'); setEventDate(''); }}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        )}

                        <div className="flex flex-wrap gap-2 text-sm font-medium">
                            {taggedIds.length > 0 && (
                                <Badge variant="secondary" className="gap-1 bg-secondary text-secondary-foreground hover:bg-secondary/80">
                                    {taggedIds.length} colegas marcados
                                    <X className="w-3 h-3 cursor-pointer" onClick={() => setTaggedIds([])} />
                                </Badge>
                            )}
                        </div>
                        
                        <Separator className="bg-border/50" />
                        
                        <div className="flex justify-between items-center flex-wrap gap-2">
                             <div className="flex gap-1 flex-wrap">
                                 <Button 
                                    variant="ghost" size="sm" 
                                    className={type === 'MEDIA' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-primary hover:bg-primary/5'}
                                    onClick={() => setType('MEDIA')}
                                 >
                                     <ImageIcon className="w-5 h-5 mr-2" /> 
                                     <span className="hidden sm:inline">Foto</span>
                                 </Button>
                                 <Button 
                                    variant="ghost" size="sm" 
                                    className={type === 'VIDEO' ? 'bg-purple-500/10 text-purple-500' : 'text-muted-foreground hover:text-purple-500 hover:bg-purple-500/10'}
                                    onClick={() => setType('VIDEO')}
                                 >
                                     <Video className="w-5 h-5 mr-2" />
                                     <span className="hidden sm:inline">Vídeo</span>
                                 </Button>
                                 <Button 
                                    variant="ghost" size="sm" 
                                    className={type === 'EVENT' ? 'bg-orange-500/10 text-orange-500' : 'text-muted-foreground hover:text-orange-500 hover:bg-orange-500/10'}
                                    onClick={() => setType('EVENT')}
                                 >
                                     <Calendar className="w-5 h-5 mr-2" />
                                     <span className="hidden sm:inline">Evento</span>
                                 </Button>
                                 
                                 <Popover>
                                     <PopoverTrigger asChild>
                                         <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10">
                                             <UserPlus className="w-5 h-5 mr-2" />
                                             <span className="hidden sm:inline">Marcar</span>
                                         </Button>
                                     </PopoverTrigger>
                                     <PopoverContent className="w-64 p-0 glass border-border/50" align="start">
                                         <div className="p-3 border-b border-border/50 font-semibold text-sm bg-muted/30">Marcar Colegas</div>
                                         <ScrollArea className="h-60 p-2">
                                             {employees.filter(e => e.id !== currentUser.id).map(emp => (
                                                 <div key={emp.id} className="flex items-center space-x-3 py-2 px-2 hover:bg-primary/10 rounded-lg cursor-pointer transition-colors" onClick={() => toggleTag(emp.id)}>
                                                     <Checkbox checked={taggedIds.includes(emp.id)} id={`tag-${emp.id}`} />
                                                     <Label htmlFor={`tag-${emp.id}`} className="cursor-pointer text-sm w-full font-medium">{emp.user.name}</Label>
                                                 </div>
                                             ))}
                                         </ScrollArea>
                                     </PopoverContent>
                                 </Popover>
                             </div>
                             
                             <div className="flex gap-2">
                                 <Button variant="ghost" onClick={() => setIsOpen(false)} className="rounded-full hover:bg-muted">Cancelar</Button>
                                 <Button onClick={handlePost} disabled={!content} className="rounded-full px-8 shadow-md">
                                     Publicar
                                 </Button>
                             </div>
                        </div>
                    </div>
                )}
                {!isOpen && (
                     <div className="flex justify-between mt-4 px-2 pt-2 border-t border-border/50">
                         <div className="flex gap-4 w-full">
                             <Button variant="ghost" className="flex-1 text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors rounded-xl" onClick={() => { setIsOpen(true); setType('MEDIA'); }}>
                                 <ImageIcon className="w-5 h-5 mr-2 text-primary" /> <span className="text-sm font-medium">Mídia</span>
                             </Button>
                             <Button variant="ghost" className="flex-1 text-muted-foreground hover:text-orange-500 hover:bg-orange-500/5 transition-colors rounded-xl" onClick={() => { setIsOpen(true); setType('EVENT'); }}>
                                 <Calendar className="w-5 h-5 mr-2 text-orange-500" /> <span className="text-sm font-medium">Evento</span>
                             </Button>
                         </div>
                         <Button variant="default" size="sm" className="rounded-full px-6 ml-4" onClick={() => setIsOpen(true)}>
                             Publicar
                         </Button>
                     </div>
                )}
            </CardContent>
        </Card>
    )
}
