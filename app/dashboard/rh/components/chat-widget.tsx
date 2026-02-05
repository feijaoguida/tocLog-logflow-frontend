'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageCircle, X, Send, Minus, Users } from "lucide-react"
import { api } from "@/lib/api"

interface Message {
    id: string
    content: string
    senderId: string
    receiverId: string
    createdAt: string
}

interface User {
    id: string // userId
    name: string
    email: string
}

export function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false)
    const [isMinimized, setIsMinimized] = useState(false)
    const [activeUser, setActiveUser] = useState<User | null>(null) // The person I'm chatting with
    const [users, setUsers] = useState<User[]>([]) // List of users to chat
    const [messages, setMessages] = useState<Message[]>([])
    const [newMessage, setNewMessage] = useState("")
    const [myUserId, setMyUserId] = useState<string | null>(null)

    // Load Users and My Profile
    useEffect(() => {
        if(isOpen) {
            fetchUsers()
            fetchMyProfile()
        }
    }, [isOpen])

    // Load Messages when chat is active
    useEffect(() => {
        if(activeUser && myUserId) {
            fetchMessages(activeUser.id)
            const interval = setInterval(() => fetchMessages(activeUser.id), 5000) // Poll
            return () => clearInterval(interval)
        }
    }, [activeUser, myUserId])

    const fetchMyProfile = async () => {
        try {
            const { data } = await api.get('/auth/profile')
            setMyUserId(data.userId)
        } catch {}
    }

    const fetchUsers = async () => {
        try {
            const { data } = await api.get('/users')
            setUsers(data)
        } catch {}
    }

    const fetchMessages = async (otherUserId: string) => {
        if(!myUserId) return
        try {
            const { data } = await api.get(`/chat?userId1=${myUserId}&userId2=${otherUserId}`)
            setMessages(data.reverse())
        } catch {}
    }

    const handleSend = async () => {
        if(!newMessage.trim() || !activeUser || !myUserId) return
        try {
            await api.post('/chat', {
                content: newMessage,
                senderId: myUserId,
                receiverId: activeUser.id
            })
            setNewMessage("")
            fetchMessages(activeUser.id)
        } catch(e) {}
    }

    if (!isOpen) {
        return (
            <Button 
                onClick={() => setIsOpen(true)}
                className="fixed bottom-4 right-4 h-14 w-14 rounded-full shadow-lg z-50" 
                size="icon"
            >
                <MessageCircle className="h-6 w-6" />
            </Button>
        )
    }

    return (
        <Card className={`fixed right-4 shadow-xl z-50 w-80 transition-all ${isMinimized ? 'bottom-4 h-14' : 'bottom-4 h-[500px]'}`}>
            <CardHeader className="p-3 border-b flex flex-row items-center justify-between space-y-0 h-14 bg-primary text-primary-foreground rounded-t-xl">
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => !isMinimized && setActiveUser(null)}>
                     {activeUser ? (
                         <>
                            <Avatar className="h-8 w-8 border-2 border-white">
                                <AvatarFallback className="text-black bg-white">{activeUser.name.substring(0,2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <span className="font-semibold text-sm truncate max-w-[150px]">{activeUser.name}</span>
                         </>
                     ) : (
                         <>
                            <MessageCircle className="h-5 w-5" />
                            <span className="font-semibold">Chat</span>
                         </>
                     )}
                </div>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/80 text-primary-foreground" onClick={() => setIsMinimized(!isMinimized)}>
                        <Minus className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/80 text-primary-foreground" onClick={() => setIsOpen(false)}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>
            {!isMinimized && (
                <div className="flex flex-col h-[calc(500px-56px)]">
                    {!activeUser ? (
                        <ScrollArea className="flex-1 p-2">
                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground px-2 py-1 font-medium">Contatos</p>
                                {users.filter(u => u.id !== myUserId).map(user => (
                                    <Button key={user.id} variant="ghost" className="w-full justify-start gap-3 h-14" onClick={() => setActiveUser(user)}>
                                        <Avatar className="h-8 w-8">
                                            <AvatarFallback>{user.name.substring(0,2).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div className="text-left overflow-hidden">
                                            <p className="text-sm font-medium truncate">{user.name}</p>
                                            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                                        </div>
                                    </Button>
                                ))}
                            </div>
                        </ScrollArea>
                    ) : (
                        <>
                            <ScrollArea className="flex-1 p-4">
                                <div className="space-y-4 flex flex-col">
                                    {messages.map(msg => {
                                        const isMe = msg.senderId === myUserId
                                        return (
                                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${isMe ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                                    {msg.content}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </ScrollArea>
                            <div className="p-3 border-t mt-auto">
                                <form 
                                    className="flex gap-2" 
                                    onSubmit={(e) => { e.preventDefault(); handleSend() }}
                                >
                                    <Input 
                                        placeholder="Digite sua mensagem..." 
                                        value={newMessage} 
                                        onChange={e => setNewMessage(e.target.value)}
                                        className="h-9"
                                    />
                                    <Button size="icon" type="submit" className="h-9 w-9" disabled={!newMessage}>
                                        <Send className="h-4 w-4" />
                                    </Button>
                                </form>
                            </div>
                        </>
                    )}
                </div>
            )}
        </Card>
    )
}
