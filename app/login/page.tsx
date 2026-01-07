'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Truck, Lock, Mail, ArrowRight, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import { toast } from "sonner"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const { login } = useAuth()
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const response = await fetch('http://localhost:3000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        throw new Error('Falha no login. Verifique suas credenciais.')
      }

      const data = await response.json()
      
      // data.user now includes permissions
      login(data.access_token, data.user)
      toast.success("Login realizado com sucesso")
      // Redirect handled by context
      
    } catch (err) {
        if (err instanceof Error) {
            setError(err.message)
        } else {
            setError('Ocorreu um erro inesperado.')
        }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-zinc-950 p-4">
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
      <Card className="w-full max-w-md border-zinc-800 bg-zinc-900/50 backdrop-blur-xl shadow-2xl">
        <CardHeader className="space-y-1 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary mb-4 transition-transform hover:scale-110 duration-500">
                <Truck className="h-6 w-6 text-primary-foreground" />
            </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-white">Acessar TocLog</CardTitle>
          <CardDescription className="text-zinc-400">
            Entre com suas credenciais para acessar o sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-300">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                <Input 
                    id="email" 
                    type="email" 
                    placeholder="voce@empresa.com" 
                    className="pl-10 bg-zinc-950/50 border-zinc-800 text-white focus:ring-primary placeholder:text-zinc-600"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
              </div>
            </div>
            <div className="space-y-2">
               <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-zinc-300">Senha</Label>
                    <a href="#" className="text-xs text-primary hover:underline">Esqueceu a senha?</a>
               </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                <Input 
                    id="password" 
                    type="password" 
                    className="pl-10 bg-zinc-950/50 border-zinc-800 text-white focus:ring-primary placeholder:text-zinc-600" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
              </div>
            </div>
            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white font-semibold h-11 transition-all hover:scale-[1.02] active:scale-[0.98]" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <>Entrar <ArrowRight className="ml-2 h-4 w-4" /></>}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="text-center text-sm text-zinc-500 justify-center">
            Protegido por TocLog Security v1.0
        </CardFooter>
      </Card>
    </div>
  )
}
