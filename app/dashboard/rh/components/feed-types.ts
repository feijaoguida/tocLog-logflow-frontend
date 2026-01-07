export interface FeedPost {
    id: string
    content: string
    type: 'TEXT' | 'MEDIA' | 'VIDEO' | 'EVENT'
    mediaUrls?: string[]
    eventDate?: string
    authorId: string
    author: { user: { name: string, email: string } }
    likes: { id: string, authorId: string }[]
    comments: { id: string, content: string, author: { user: { name: string } } }[]
    mentions?: { user: { name: string } }[]
    viewCount?: number
    isFixed: boolean
    pinnedUntil?: string
    createdAt: string
}

export interface Story {
    id: string
    authorId: string
    author: { user: { name: string, email: string }, avatarUrl?: string }
    type: 'IMAGE' | 'VIDEO' | 'TEXT'
    mediaUrl?: string
    content?: string
    styles?: string // JSON
    viewed: boolean
    createdAt: string
    expiresAt: string
}

export interface Profile {
    userId: string
    id: string 
    role: { name: string } | string
    branchId: string
    user: { name: string, email: string }
    avatarUrl?: string
    viewCount?: number
    connectionCount?: number
}

export interface EmployeeOption {
    id: string
    user: { name: string, email: string }
    status?: string
}
