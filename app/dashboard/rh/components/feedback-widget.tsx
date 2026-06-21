'use client'

import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MessageSquarePlus } from "lucide-react"

export function FeedbackWidget() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                    <MessageSquarePlus className="w-5 h-5" />
                    Feedback & Sugestões
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-sm leading-6 text-muted-foreground">
                    Abra a nova caixa de feedback para enviar sugestoes, reconhecimentos, denuncias e conversas 1 para 1
                    com sinalizacao explicita de quando o RH tambem acompanha a thread.
                </p>
                <div className="flex flex-col gap-3 sm:flex-row">
                    <Button asChild size="sm" className="w-full sm:w-auto">
                        <Link href="/dashboard/feedbacks/new">Abrir novo feedback</Link>
                    </Button>
                    <Button asChild size="sm" variant="outline" className="w-full sm:w-auto">
                        <Link href="/dashboard/rh/feedbacks/dashboard">Ver dashboard RH</Link>
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
