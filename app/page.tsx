'use client'

import { PublicHeader } from "@/components/layout/public-header"
import { PublicFeed } from "@/components/feed/public-feed"

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none z-0"></div>
      
      <PublicHeader />

      <main className="relative z-10 pt-20 px-4">
         <div className="max-w-2xl mx-auto mb-8 text-center pt-8">
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 bg-gradient-to-r from-white to-zinc-500 bg-clip-text text-transparent">
               Acompanhe o que acontece na TocLog
            </h1>
            <p className="text-zinc-400 text-lg">
               Fique por dentro das novidades, comunicados e do dia a dia da nossa equipe.
            </p>
         </div>

         <PublicFeed />
      </main>
    </div>
  );
}
