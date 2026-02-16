'use client'

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Profile } from "./feed-types"

interface StoriesProps {
    profile: Profile | null
}

export function IntranetStories({ profile }: StoriesProps) {
    // Mock stories for now
    const stories = [
        { id: '1', name: 'Você', img: profile?.avatarUrl, viewed: false, isUser: true },
        { id: '2', name: 'Ana M.', img: 'https://i.pravatar.cc/150?u=a042581f4e29026024d', viewed: false },
        { id: '3', name: 'Carlos', img: 'https://i.pravatar.cc/150?u=a042581f4e29026704d', viewed: true },
        { id: '4', name: 'Beatriz', img: 'https://i.pravatar.cc/150?u=a04258114e29026302d', viewed: false },
        { id: '5', name: 'RH', img: '', viewed: false, isDept: true },
    ]

    return (
        <ScrollArea className="w-full whitespace-nowrap pb-4">
            <div className="flex w-max space-x-4 p-1">
                {stories.map((story) => (
                    <div key={story.id} className="flex flex-col items-center gap-1 cursor-pointer group">
                        <div className={`p-[2px] rounded-full ${story.viewed ? 'bg-muted' : 'bg-gradient-to-tr from-primary to-warning'}`}>
                            <Avatar className="w-14 h-14 border-2 border-background">
                                <AvatarImage src={story.img} />
                                <AvatarFallback className="text-xs bg-muted">
                                    {story.name.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                        </div>
                        <span className="text-[10px] text-muted-foreground group-hover:text-primary transition-colors">
                            {story.isUser ? 'Seu story' : story.name}
                        </span>
                    </div>
                ))}
            </div>
            <ScrollBar orientation="horizontal" />
        </ScrollArea>
    )
}
