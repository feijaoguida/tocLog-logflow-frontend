'use client'

import { useState, useEffect } from 'react'
import { Card } from "@/components/ui/card"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Plus, X, ChevronLeft, ChevronRight, Image as ImageIcon, Type, Video, Send } from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Profile, Story } from './feed-types'
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { api } from "@/lib/api"

interface StoriesComponentProps {
    currentUser: Profile | null
    onRefreshNeeded: () => void
}

export function StoriesComponent({ currentUser, onRefreshNeeded }: StoriesComponentProps) {
    const [stories, setStories] = useState<Story[]>([])
    const [groupedStories, setGroupedStories] = useState<{ [authorId: string]: Story[] }>({})
    const [loading, setLoading] = useState(false)
    
    // Creator State
    const [isCreatorOpen, setIsCreatorOpen] = useState(false)
    const [newStoryType, setNewStoryType] = useState<'IMAGE' | 'TEXT'>('IMAGE')
    const [newStoryContent, setNewStoryContent] = useState("")
    const [newStoryMediaUrl, setNewStoryMediaUrl] = useState("")
    const [newStoryColor, setNewStoryColor] = useState("bg-gradient-to-br from-purple-500 to-pink-500")

    // Viewer State
    const [viewingAuthorId, setViewingAuthorId] = useState<string | null>(null)
    const [currentStoryIndex, setCurrentStoryIndex] = useState(0)

    useEffect(() => {
        fetchStories()
    }, [currentUser])

    const fetchStories = async () => {
        if (!currentUser) return;
        setLoading(true)
        try {
            const { data } = await api.get('/stories')
             setStories(data)
             
             // Group by Author
             const grouped: { [key: string]: Story[] } = {};
             data.forEach((s: any) => {
                 if (!grouped[s.authorId]) grouped[s.authorId] = [];
                 grouped[s.authorId].push(s);
             });
             setGroupedStories(grouped);
        } catch (e) { }
        finally { setLoading(false) }
    }

    const handleCreateStory = async () => {
        if (!currentUser) return;
        try {
            const styles = newStoryType === 'TEXT' ? JSON.stringify({ background: newStoryColor }) : undefined;
            
            await api.post('/stories', {
                authorId: currentUser.id,
                type: newStoryType,
                mediaUrl: newStoryMediaUrl,
                content: newStoryContent,
                styles
            })
            
            toast.success("Story publicado!")
            setIsCreatorOpen(false)
            setNewStoryContent("")
            setNewStoryMediaUrl("")
            fetchStories()
        } catch(e) { toast.error("Erro ao publicar") }
    }
    
    const handleViewStory = (authorId: string) => {
        setViewingAuthorId(authorId)
        setCurrentStoryIndex(0)
        markAsViewed(groupedStories[authorId][0].id)
    }
    
    const markAsViewed = async (storyId: string) => {
        try {
             await api.post(`/stories/${storyId}/view`, { viewerId: currentUser?.id })
             // Update local state to show 'viewed' ring without refetch
             // Simplified: just refetch or ignore for now
        } catch(e) {}
    }

    const nextStory = () => {
        if (!viewingAuthorId) return;
        const authorStories = groupedStories[viewingAuthorId];
        if (currentStoryIndex < authorStories.length - 1) {
            setCurrentStoryIndex(prev => prev + 1);
            markAsViewed(authorStories[currentStoryIndex + 1].id)
        } else {
            // Move to next author? Or close.
            // Simplified: Close
            setViewingAuthorId(null)
        }
    }

    const prevStory = () => {
        if (currentStoryIndex > 0) {
            setCurrentStoryIndex(prev => prev - 1)
        }
    }

    if (!currentUser) return null;

    // Authors with stories (excluding me logic if separate, but usually include me)
    // We want to show "Me" first, then others.
    const myStories = groupedStories[currentUser.id] || [];
    const otherAuthorIds = Object.keys(groupedStories).filter(id => id !== currentUser.id);

    // Current Story for Viewer
    const activeStory = viewingAuthorId ? groupedStories[viewingAuthorId]?.[currentStoryIndex] : null;

    return (
        <>
            <Card className="p-4 border-none shadow-sm bg-white">
                <ScrollArea className="w-full whitespace-nowrap">
                    <div className="flex space-x-4 p-1">
                        {/* My Story / Create */}
                        <div className="flex flex-col items-center space-y-1 group cursor-pointer" onClick={() => myStories.length > 0 ? handleViewStory(currentUser.id) : setIsCreatorOpen(true)}>
                            <div className={`relative h-16 w-16 rounded-full p-0.5 ${myStories.length > 0 ? 'bg-gradient-to-tr from-yellow-400 to-fuchsia-600' : 'border-2 border-dashed border-slate-300'}`}>
                                <Avatar className={`h-full w-full border-2 border-white ${myStories.length === 0 && 'opacity-50'}`}>
                                    <AvatarFallback>{currentUser.user.name.substring(0,2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                {myStories.length === 0 && (
                                    <div className="absolute bottom-0 right-0 bg-blue-500 rounded-full p-1 border-2 border-white text-white">
                                        <Plus className="w-3 h-3" />
                                    </div>
                                )}
                            </div>
                            <span className="text-xs font-medium text-slate-700">Seu story</span>
                        </div>
                        
                        {/* Other Authors */}
                        {otherAuthorIds.map(authId => {
                            const stories = groupedStories[authId];
                            const first = stories[0];
                            const allViewed = stories.every(s => s.viewed); // We assume API returns 'viewed'
                            // API returns filtered views. 
                            const hasUnseen = stories.some(s => !s.viewed);
                            
                            return (
                                <div key={authId} className="flex flex-col items-center space-y-1 cursor-pointer group" onClick={() => handleViewStory(authId)}>
                                    <div className={`h-16 w-16 rounded-full p-0.5 ${hasUnseen ? 'bg-gradient-to-tr from-yellow-400 to-fuchsia-600' : 'bg-slate-200'}`}>
                                        <Avatar className="h-full w-full border-2 border-white transition-transform group-hover:scale-105">
                                            <AvatarFallback>{first.author.user.name.substring(0,2).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                    </div>
                                    <span className="text-xs w-16 truncate text-center text-slate-700">{first.author.user.name.split(' ')[0]}</span>
                                </div>
                            )
                        })}
                    </div>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
            </Card>

            {/* Creator Dialog */}
            <Dialog open={isCreatorOpen} onOpenChange={setIsCreatorOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <div className="space-y-4">
                        <div className="text-center font-semibold">Criar Story</div>
                        <Tabs defaultValue="IMAGE" onValueChange={(v: any) => setNewStoryType(v)}>
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="IMAGE"><ImageIcon className="w-4 h-4 mr-2"/> Imagem</TabsTrigger>
                                <TabsTrigger value="TEXT"><Type className="w-4 h-4 mr-2"/> Texto</TabsTrigger>
                            </TabsList>
                            <TabsContent value="IMAGE" className="space-y-4 pt-4">
                                <Input 
                                    placeholder="URL da Imagem..." 
                                    value={newStoryMediaUrl}
                                    onChange={e => setNewStoryMediaUrl(e.target.value)}
                                />
                                {newStoryMediaUrl && (
                                    <div className="aspect-[9/16] bg-black rounded-lg overflow-hidden flex items-center justify-center">
                                        <img src={newStoryMediaUrl} className="object-cover w-full h-full" />
                                    </div>
                                )}
                                <Textarea 
                                    placeholder="Legenda (opcional)"
                                    value={newStoryContent}
                                    onChange={e => setNewStoryContent(e.target.value)}
                                />
                            </TabsContent>
                            <TabsContent value="TEXT" className="space-y-4 pt-4">
                                <div className={`aspect-[9/16] rounded-lg flex items-center justify-center p-8 text-center text-white text-2xl font-bold shadow-inner transition-colors ${newStoryColor}`}>
                                    {newStoryContent || "Digite algo..."}
                                </div>
                                <Textarea 
                                    placeholder="Digite seu texto..."
                                    value={newStoryContent}
                                    onChange={e => setNewStoryContent(e.target.value)}
                                />
                                <div className="flex gap-2 justify-center">
                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 cursor-pointer ring-2 ring-offset-2 ring-transparent hover:ring-slate-400" onClick={() => setNewStoryColor("bg-gradient-to-br from-purple-500 to-pink-500")}></div>
                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 cursor-pointer hover:scale-110" onClick={() => setNewStoryColor("bg-gradient-to-br from-blue-500 to-cyan-500")}></div>
                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-400 to-red-500 cursor-pointer hover:scale-110" onClick={() => setNewStoryColor("bg-gradient-to-br from-orange-400 to-red-500")}></div>
                                    <div className="w-6 h-6 rounded-full bg-black cursor-pointer hover:scale-110" onClick={() => setNewStoryColor("bg-black")}></div>
                                </div>
                            </TabsContent>
                        </Tabs>
                        <Button className="w-full" onClick={handleCreateStory}>Compartilhar</Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Viewer Overlay */}
            {activeStory && (
                <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center backdrop-blur-sm">
                    <Button variant="ghost" className="absolute top-4 right-4 text-white hover:bg-white/10 rounded-full h-10 w-10" onClick={() => setViewingAuthorId(null)}>
                        <X className="w-6 h-6" />
                    </Button>
                    
                    <Button variant="ghost" className="absolute left-4 text-white hover:bg-white/10 rounded-full h-12 w-12" onClick={prevStory} disabled={currentStoryIndex === 0}>
                        <ChevronLeft className="w-8 h-8" />
                    </Button>

                    <div className="w-full max-w-md h-[80vh] bg-black rounded-lg overflow-hidden relative flex flex-col">
                         {/* Progress Bar */}
                         <div className="absolute top-0 left-0 right-0 flex gap-1 p-2 z-10">
                             {groupedStories[viewingAuthorId!].map((_, idx) => (
                                 <div key={idx} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                                     <div 
                                        className={`h-full bg-white transition-all duration-300 ${idx < currentStoryIndex ? 'w-full' : idx === currentStoryIndex ? 'w-full' : 'w-0'}`} 
                                        // Note: Animation logic for 'active' bar usually complex. Simplified here.
                                     />
                                 </div>
                             ))}
                         </div>

                         {/* Header */}
                         <div className="absolute top-4 left-4 z-10 flex items-center gap-3">
                             <Avatar className="h-10 w-10 border border-white/50">
                                 <AvatarFallback>{activeStory.author.user.name.substring(0,2).toUpperCase()}</AvatarFallback>
                             </Avatar>
                             <div className="text-white drop-shadow-md">
                                 <p className="font-semibold text-sm">{activeStory.author.user.name}</p>
                                 <p className="text-xs opacity-80">{new Date(activeStory.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                             </div>
                         </div>

                         {/* Content */}
                         <div className="flex-1 flex items-center justify-center bg-zinc-900 relative">
                             {activeStory.type === 'IMAGE' && activeStory.mediaUrl && (
                                 <img src={activeStory.mediaUrl} className="w-full h-full object-contain" />
                             )}
                             {activeStory.type === 'TEXT' && (
                                 <div 
                                    className={`w-full h-full flex items-center justify-center p-8 text-center text-white text-2xl font-bold whitespace-pre-wrap`}
                                    style={activeStory.styles ? JSON.parse(activeStory.styles) : {}} // Using inline style for gradient
                                >
                                     {/* Map class logic or inline styles. `styles` is JSON string of css props or classes? 
                                        Seed used: { background: ... } 
                                        So we parse and apply style.
                                     */}
                                     {/* Hack for gradient class vs style: Seed used background property which works with style={{...}} */}
                                     {/* If I used classes in seed, I'd use className. I used background style. */}
                                     <div className={!activeStory.styles ? "bg-gradient-to-br from-blue-600 to-purple-700 w-full h-full flex items-center justify-center" : "w-full h-full flex items-center justify-center"} style={activeStory.styles ? JSON.parse(activeStory.styles) : {}}>
                                         {activeStory.content}
                                     </div>
                                 </div>
                             )}
                         </div>
                         
                         {/* Caption */}
                         {activeStory.type === 'IMAGE' && activeStory.content && (
                             <div className="absolute bottom-20 left-0 right-0 p-4 text-center text-white bg-black/50 backdrop-blur-sm">
                                 {activeStory.content}
                             </div>
                         )}

                         {/* Footer Reply (Mock) */}
                         <div className="p-4 bg-black flex gap-2">
                             <Input placeholder="Responder..." className="bg-white/10 border-none text-white placeholder:text-white/50 rounded-full" />
                             <Button size="icon" variant="ghost" className="text-white hover:bg-white/20 rounded-full"><Send className="w-5 h-5" /></Button>
                         </div>
                    </div>

                    <Button variant="ghost" className="absolute right-4 text-white hover:bg-white/10 rounded-full h-12 w-12" onClick={nextStory}>
                        <ChevronRight className="w-8 h-8" />
                    </Button>
                </div>
            )}
        </>
    )
}
