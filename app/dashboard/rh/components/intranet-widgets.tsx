'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { MessageSquarePlus, Calendar, ImageIcon, Link as LinkIcon, FileText, AlertTriangle, HelpCircle } from "lucide-react"

export function IntranetWidgets() {
    return (
        <div className="space-y-6">
            <FeedbackWidget />
            <NoticesWidget />
            <QuickLinksWidget />
        </div>
    )
}

function FeedbackWidget() {
    const [content, setContent] = useState("")
    const [isPrivate, setIsPrivate] = useState(false)

    const handleSend = () => {
        toast.info("Funcionalidade em desenvolvimento.")
        setContent("")
    }

    return (
        <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <MessageSquarePlus className="w-4 h-4 text-primary" />
                    Feedback & Sugestões
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
                <Textarea 
                    placeholder="Deixe sua sugestão, elogio ou crítica..."
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    className="min-h-[80px] text-xs resize-none bg-muted/30 focus:bg-background transition-colors"
                />
                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="private-mode" className="text-[11px] text-muted-foreground">Mensagem Privada (Ouvidoria)</Label>
                        <Switch id="private-mode" checked={isPrivate} onCheckedChange={setIsPrivate} className="scale-75 origin-right" />
                    </div>
                    <Button size="sm" onClick={handleSend} disabled={!content} className="w-full">
                        Enviar
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}

function NoticesWidget() {
    return (
        <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="text-sm font-semibold">Quadro de Avisos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
                <div className="flex gap-3 items-start group cursor-pointer p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="bg-info/10 p-2 rounded-md group-hover:bg-info/20 transition-colors">
                        <Calendar className="w-4 h-4 text-info" />
                    </div>
                    <div>
                        <p className="text-sm font-medium hover:text-primary transition-colors">Reunião Geral</p>
                        <p className="text-[11px] text-muted-foreground">Sexta-feira, 15:00</p>
                    </div>
                </div>
                <div className="flex gap-3 items-start group cursor-pointer p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="bg-success/10 p-2 rounded-md group-hover:bg-success/20 transition-colors">
                        <ImageIcon className="w-4 h-4 text-success" />
                    </div>
                    <div>
                        <p className="text-sm font-medium hover:text-primary transition-colors">Fotos do Evento</p>
                        <p className="text-[11px] text-muted-foreground">Confira a galeria anual</p>
                    </div>
                </div>
                 <div className="flex gap-3 items-start group cursor-pointer p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="bg-warning/10 p-2 rounded-md group-hover:bg-warning/20 transition-colors">
                        <AlertTriangle className="w-4 h-4 text-warning" />
                    </div>
                    <div>
                        <p className="text-sm font-medium hover:text-primary transition-colors">Manutenção Sistema</p>
                        <p className="text-[11px] text-muted-foreground">Sábado, 22:00 - 23:00</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

function QuickLinksWidget() {
    const links = [
        { label: "Calendário de Eventos", icon: Calendar },
        { label: "Manual do Colaborador", icon: FileText },
        { label: "Canal de Denúncias", icon: AlertTriangle },
        { label: "FAQ & Suporte", icon: HelpCircle },
    ]

    return (
        <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="text-sm font-semibold">Links Rápidos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 pt-2">
                {links.map((link, i) => (
                    <Button key={i} variant="ghost" className="w-full justify-start text-muted-foreground hover:text-primary h-8 px-2">
                        <link.icon className="w-4 h-4 mr-2 opacity-70" />
                        <span className="text-xs">{link.label}</span>
                    </Button>
                ))}
            </CardContent>
        </Card>
    )
}
