'use client'

import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Profile } from "./feed-types"

interface IntranetProfileProps {
    profile: Profile | null
    employeesCount: number
}

export function IntranetProfile({ profile, employeesCount }: IntranetProfileProps) {
    if (!profile) return null

    const initials = profile.user.name.substring(0, 2).toUpperCase()
    const roleName = typeof profile.role === 'string' ? profile.role : profile.role?.name || ''

    return (
        <div className="space-y-4">
            <Card className="overflow-hidden border-none shadow-md">
                <div className="h-24 bg-gradient-to-br from-primary/80 to-primary"></div>
                <CardContent className="pt-0 relative px-4 pb-4 text-center">
                    <Avatar className="h-20 w-20 border-4 border-card absolute -top-10 left-1/2 transform -translate-x-1/2 shadow-sm">
                        <AvatarImage src={profile.avatarUrl} alt={profile.user.name} />
                        <AvatarFallback className="text-xl bg-muted font-bold text-muted-foreground">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="mt-12 space-y-1">
                        <h3 className="font-semibold text-lg leading-tight text-foreground">{profile.user.name}</h3>
                        <p className="text-sm text-muted-foreground">{profile.user.email}</p>
                        <Badge variant="info" className="mt-2 font-normal rounded-full px-3">
                            {roleName}
                        </Badge>
                    </div>
                    <Separator className="my-4" />
                    <div className="text-left space-y-2 text-sm">
                        <div className="flex justify-between items-center bg-muted/30 p-2 rounded-lg">
                            <span className="text-muted-foreground">Colegas</span>
                            <span className="font-semibold text-foreground">{employeesCount}</span>
                        </div>
                        <div className="flex justify-between items-center bg-muted/30 p-2 rounded-lg">
                            <span className="text-muted-foreground">Visualizações</span>
                            <span className="font-semibold text-success">1.2k</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="text-[11px] text-muted-foreground text-center space-y-1">
                <p className="hover:text-primary cursor-pointer transition-colors">Políticas de RH &bull; Benefícios &bull; Ajuda</p>
                <p>TocLog Intranet &copy; 2025</p>
            </div>
        </div>
    )
}
