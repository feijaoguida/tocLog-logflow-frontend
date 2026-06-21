'use client'

import React from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/context/auth-context"

export function UserProfile() {
  const { user, logout } = useAuth()

  // Fallback initials
  const initials = user?.name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="flex items-center gap-2 cursor-pointer hover:bg-accent/50 p-2 rounded-full transition-colors">
            <span className="hidden md:block text-sm font-medium text-foreground">
                {user?.name || 'Usuário'}
            </span>
            <Avatar className="h-8 w-8">
                <AvatarImage src={user?.avatarUrl} alt={user?.name} />
                <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-background">
        <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <span className="material-symbols-outlined mr-2 text-[20px]">person</span>
          <span>Perfil</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout} className="text-red-500 focus:text-red-500">
          <span className="material-symbols-outlined mr-2 text-[20px]">logout</span>
          <span>Sair</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
