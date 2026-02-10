'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { MessageSquarePlus } from "lucide-react"

export function FeedbackWidget() {
    const [content, setContent] = useState("")
    const [isPrivate, setIsPrivate] = useState(false)
    const [receiverId, setReceiverId] = useState("") // Needed if targeted, or maybe select form
    // For now simple "Send Feedback to HR" (or general suggestion box)
    // If to HR, we need a receiverId. Let's make it a general suggestion box where receiver is null? Or a specific admin.
    // Let's implement as "Mural de Sugestões" (Public) vs "Ouvidoria" (Private to HR).
    
    // Actually, user request says "Public/Private".
    
    const handleSend = async () => {
        toast.info("Funcionalidade em desenvolvimento final.")
        // Integration Logic similar to Feed but to /feedback
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                    <MessageSquarePlus className="w-5 h-5" />
                    Feedback & Sugestões
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <Textarea 
                    placeholder="Deixe sua sugestão, elogio ou crítica..."
                    value={content}
                    onChange={e => setContent(e.target.value)}
                />
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center space-x-2">
                        <Switch id="private-mode" checked={isPrivate} onCheckedChange={setIsPrivate} />
                        <Label htmlFor="private-mode">Mensagem Privada (Ouvidoria)</Label>
                    </div>
                    <Button size="sm" onClick={handleSend} disabled={!content} className="w-full sm:w-auto">Enviar</Button>
                </div>
            </CardContent>
        </Card>
    )
}
