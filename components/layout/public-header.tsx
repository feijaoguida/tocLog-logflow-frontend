'use client'

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Truck } from "lucide-react"

export function PublicHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800">
      <div className="flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
           <Truck className="h-6 w-6" />
        </div>
        <span className="text-xl font-bold tracking-tight text-white hidden sm:block">TocLog</span>
      </div>
      
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" className="text-zinc-300 hover:text-white">
          <Link href="/login">Entrar</Link>
        </Button>
        <Button asChild className="rounded-full px-6">
          <Link href="/login">Cadastre-se</Link>
        </Button>
      </div>
    </header>
  )
}
