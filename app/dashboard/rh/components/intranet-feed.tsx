'use client'

import { useState, useEffect } from 'react'
import { api } from "@/lib/api"
import { toast } from "sonner"
import { Profile, EmployeeOption, FeedPost } from './feed-types'
import { IntranetStories } from './intranet-stories'
import { IntranetComposer } from './intranet-composer'
import { IntranetPost } from './intranet-post'
import { Skeleton } from "@/components/ui/skeleton"

interface IntranetFeedProps {
    profile: Profile | null
    employees: EmployeeOption[]
}

export function IntranetFeed({ profile, employees }: IntranetFeedProps) {
    const [posts, setPosts] = useState<FeedPost[]>([])
    const [loading, setLoading] = useState(true)

    const fetchFeed = async () => {
        try {
            // Using existing endpoint logic
            const { data } = await api.get('/feed')
            setPosts(data)
        } catch (error) {
            console.error("Failed to fetch feed", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchFeed()
    }, [])

    const handlePost = async (content: string, type: 'TEXT' | 'MEDIA' | 'VIDEO' | 'EVENT', mediaUrls: string[], eventDate: string | undefined, mentions: string[]) => {
        if (!profile) return
        try {
            await api.post('/feed', {
                content,
                authorId: profile.id, // Ensure profile.id matches what backend expects (profile ID vs user ID)
                tenantId: profile.branchId,
                type,
                mediaUrls,
                eventDate,
                mentionedEmployeeIds: mentions
            })
            // Refresh feed after post
            fetchFeed()
        } catch (error) {
            console.error(error)
            throw error // Propagate for composer error handling
        }
    }

    const handleLike = async (postId: string) => {
        if (!profile) return
        try {
            await api.post(`/feed/${postId}/like`, { authorId: profile.id })
            // Optimistic update handled in child, but good to refresh or update state here too for consistency
        } catch (error) {
            toast.error("Erro ao curtir")
        }
    }

    const handleComment = async (postId: string, content: string) => {
        if (!profile) return
        try {
            await api.post(`/feed/${postId}/comments`, { authorId: profile.id, content })
            toast.success("Comentário enviado")
            fetchFeed()
        } catch (error) {
            toast.error("Erro ao comentar")
        }
    }

    if (loading) {
        return (
            <div className="space-y-6">
                 <div className="flex gap-4 overflow-hidden py-2"><Skeleton className="h-20 w-20 rounded-full" /><Skeleton className="h-20 w-20 rounded-full" /><Skeleton className="h-20 w-20 rounded-full" /></div>
                 <Skeleton className="h-32 w-full rounded-xl" />
                 <Skeleton className="h-64 w-full rounded-xl" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <IntranetStories profile={profile} />
            <IntranetComposer currentUser={profile} employees={employees} onPost={handlePost} />
            
            <div className="space-y-6">
                {posts.map(post => (
                    <IntranetPost 
                        key={post.id} 
                        post={post} 
                        currentUser={profile}
                        onLike={handleLike}
                        onComment={handleComment}
                    />
                ))}
            </div>
        </div>
    )
}
