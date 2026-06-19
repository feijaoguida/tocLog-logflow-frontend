'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import { toast } from "sonner"
import { api } from "@/lib/api"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const { login } = useAuth()
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const { data } = await api.post('/auth/login', { email, password })
      
      login(data.access_token, data.user)
      toast.success("Login realizado com sucesso")
      
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
    <div className="flex min-h-screen w-full bg-[#f8f9fa]">
      {/* Left Side - Marketing / Branding */}
      <div className="hidden lg:flex flex-col w-1/2 relative bg-white overflow-hidden p-16 justify-center">
        {/* Background Image with very light overlay */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-10" 
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1586528116311-ad8ed7cee2bc?q=80&w=2070&auto=format&fit=crop')" }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/80 to-transparent"></div>
        
        <div className="relative z-10 max-w-lg">
          {/* Logo / Icon */}
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#c6182e] mb-10 shadow-lg">
            <span className="material-symbols-outlined text-white text-3xl">local_shipping</span>
          </div>

          <h1 className="text-5xl font-extrabold tracking-tight text-[#221813] leading-tight mb-2">
            Eficiência em cada<br/>
            <span className="text-[#c6182e]">conexão.</span>
          </h1>
          
          <p className="text-lg text-slate-600 mt-6 mb-12 max-w-md">
            Acesse a plataforma de gestão logística da Toclog e monitore operações em tempo real.
          </p>

          <div className="flex gap-4 mt-8">
            <div className="bg-white/80 backdrop-blur-sm border border-slate-100 rounded-xl p-5 shadow-sm flex-1">
              <h3 className="text-[#c6182e] text-2xl font-bold mb-1">24/7</h3>
              <p className="text-slate-500 text-sm font-medium">Monitoramento</p>
            </div>
            <div className="bg-white/80 backdrop-blur-sm border border-slate-100 rounded-xl p-5 shadow-sm flex-1">
              <h3 className="text-[#c6182e] text-2xl font-bold mb-1">100%</h3>
              <p className="text-slate-500 text-sm font-medium">Rastreabilidade</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex flex-col w-full lg:w-1/2 items-center justify-center relative p-8">
        
        <Card className="w-full max-w-[440px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-0 rounded-2xl p-2 z-10">
          <CardHeader className="space-y-2 pb-6">
            <h2 className="text-2xl font-bold tracking-tight text-[#221813]">Bem-vindo</h2>
            <p className="text-sm text-slate-500">
              Acesse o sistema interno
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold text-slate-700">E-mail Corporativo</Label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-2.5 h-5 w-5 text-slate-400 text-[20px]">mail</span>
                  <Input 
                      id="email" 
                      type="email" 
                      placeholder="nome@toclog.com.br" 
                      className="pl-10 h-11 bg-slate-50/50 border-slate-200 text-slate-900 focus:ring-[#c6182e] focus:border-[#c6182e] transition-colors"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                  />
                </div>
              </div>

              <div className="space-y-2">
                 <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-sm font-semibold text-slate-700">Senha</Label>
                      <a href="#" className="text-xs font-semibold text-[#c6182e] hover:underline">Esqueci minha senha</a>
                 </div>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-2.5 h-5 w-5 text-slate-400 text-[20px]">lock</span>
                  <Input 
                      id="password" 
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••" 
                      className="pl-10 pr-10 h-11 bg-slate-50/50 border-slate-200 text-slate-900 focus:ring-[#c6182e] focus:border-[#c6182e] transition-colors"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                  />
                  <button 
                    type="button"
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                     <span className="material-symbols-outlined text-[20px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-1 pb-2">
                <Checkbox id="remember" className="border-slate-300 data-[state=checked]:bg-[#c6182e] data-[state=checked]:border-[#c6182e]" />
                <Label htmlFor="remember" className="text-sm text-slate-500 font-normal cursor-pointer">
                  Lembrar este dispositivo
                </Label>
              </div>

              {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

              <Button type="submit" className="w-full bg-[#c6182e] hover:bg-[#a51426] text-white font-semibold h-12 text-sm transition-all" disabled={loading}>
                {loading ? <span className="material-symbols-outlined animate-spin mr-2">sync</span> : <>Entrar no Sistema <span className="material-symbols-outlined ml-2 text-[18px]">arrow_forward</span></>}
              </Button>
            </form>
          </CardContent>
          
          <CardFooter className="flex flex-col items-center justify-center pt-6 pb-2 text-center">
            <div className="w-16 h-[1px] bg-slate-100 mb-6"></div>
            <p className="text-[11px] text-slate-400 leading-relaxed max-w-xs">
              Exclusivo para colaboradores e parceiros autorizados.<br/>
              © 2024 Toclog Soluções Logísticas.
            </p>
          </CardFooter>
        </Card>

        {/* Server Status Badge */}
        <div className="absolute bottom-6 right-6 bg-white border border-slate-200 rounded-full px-4 py-1.5 shadow-sm flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">Servidores Online</span>
        </div>
      </div>
    </div>
  )
}
