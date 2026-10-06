'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Copy,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Mail,
  ShieldCheck,
  Sparkles,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'

function generateStrongPassword(length = 14): string {
  const uppers = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lowers = 'abcdefghijkmnpqrstuvwxyz'
  const numbers = '23456789'
  const specials = '!@#$%^&*_-=+'
  const all = uppers + lowers + numbers + specials

  const pass = [
    uppers[Math.floor(Math.random() * uppers.length)],
    lowers[Math.floor(Math.random() * lowers.length)],
    numbers[Math.floor(Math.random() * numbers.length)],
    specials[Math.floor(Math.random() * specials.length)],
  ]
  for (let i = pass.length; i < length; i++) {
    pass.push(all[Math.floor(Math.random() * all.length)])
  }
  return pass.sort(() => Math.random() - 0.5).join('')
}

export default function ForgotPasswordPage() {
  const router = useRouter()

  // Wizard step: 1 = Email, 2 = Code OTP, 3 = New Password, 4 = Success
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)

  // Step 1: Email
  const [email, setEmail] = useState('')

  // Step 2: Code
  const [code, setCode] = useState('')

  // Step 3: New Password
  const [resetToken, setResetToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [copied, setCopied] = useState(false)

  // General states
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Validation rules for Step 3
  const hasMinLength = newPassword.length >= 8
  const hasUpper = /[A-Z]/.test(newPassword)
  const hasLower = /[a-z]/.test(newPassword)
  const hasNumber = /[0-9]/.test(newPassword)
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`§±]/.test(newPassword)
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword
  const isPasswordValid =
    hasMinLength && hasUpper && hasLower && hasNumber && hasSpecial && passwordsMatch

  // Step 1 Handler: Request OTP code
  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await api.post('/auth/forgot-password', { email: email.trim() })
      toast.success('Se o e-mail estiver cadastrado, o código foi enviado!')
      setStep(2)
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Falha ao solicitar código de recuperação.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  // Step 2 Handler: Verify OTP code
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data } = await api.post('/auth/verify-reset-code', {
        email: email.trim(),
        code: code.trim(),
      })

      if (data?.resetToken) {
        setResetToken(data.resetToken)
        toast.success('Código verificado com sucesso!')
        setStep(3)
      } else {
        setError('Token de validação não recebido.')
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Código inválido ou expirado.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  // Step 3 Handler: Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!isPasswordValid) {
      setError('A senha não cumpre todos os requisitos de segurança.')
      return
    }

    setLoading(true)
    try {
      await api.post('/auth/reset-password', {
        resetToken,
        newPassword,
        confirmNewPassword: confirmPassword,
      })

      toast.success('Senha redefinida com sucesso!')
      setStep(4)
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Erro ao redefinir a senha.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleGeneratePassword = () => {
    const generated = generateStrongPassword(14)
    setNewPassword(generated)
    setConfirmPassword(generated)
    setShowPassword(true)
    setShowConfirm(true)
    toast.info('Senha forte gerada!')
  }

  const handleCopyPassword = async () => {
    if (!newPassword) return
    try {
      await navigator.clipboard.writeText(newPassword)
      setCopied(true)
      toast.success('Senha copiada!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Não foi possível copiar.')
    }
  }

  return (
    <div className="flex min-h-screen w-full bg-[#f8f9fa]">
      {/* Left Side - Marketing / Branding */}
      <div className="hidden lg:flex flex-col w-1/2 relative bg-white overflow-hidden p-16 justify-center">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-10"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1586528116311-ad8ed7cee2bc?q=80&w=2070&auto=format&fit=crop')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/80 to-transparent" />

        <div className="relative z-10 max-w-lg">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#c6182e] mb-10 shadow-lg text-white">
            <KeyRound className="size-8" />
          </div>

          <h1 className="text-5xl font-extrabold tracking-tight text-[#221813] leading-tight mb-2">
            Segurança em cada<br />
            <span className="text-[#c6182e]">operação.</span>
          </h1>

          <p className="text-lg text-slate-600 mt-6 mb-12 max-w-md">
            Recupere o acesso à sua conta corporativa Toclog de forma rápida e segura.
          </p>

          <div className="space-y-4 max-w-md">
            <div className="flex items-center gap-3 p-3.5 bg-white/80 backdrop-blur-sm border border-slate-100 rounded-xl">
              <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 font-bold">
                1
              </div>
              <div className="text-xs">
                <span className="font-semibold text-slate-800 block">Identificação</span>
                <span className="text-slate-500">Informe seu e-mail cadastrado</span>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3.5 bg-white/80 backdrop-blur-sm border border-slate-100 rounded-xl">
              <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 font-bold">
                2
              </div>
              <div className="text-xs">
                <span className="font-semibold text-slate-800 block">Validação em 2 Etapas</span>
                <span className="text-slate-500">Código OTP enviado para sua caixa postal</span>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3.5 bg-white/80 backdrop-blur-sm border border-slate-100 rounded-xl">
              <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 font-bold">
                3
              </div>
              <div className="text-xs">
                <span className="font-semibold text-slate-800 block">Nova Senha Forte</span>
                <span className="text-slate-500">Credencial atualizada e acesso imediato</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Wizard Form */}
      <div className="flex flex-col w-full lg:w-1/2 items-center justify-center relative p-8">
        <Card className="w-full max-w-[440px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-0 rounded-2xl p-2 z-10">
          <CardHeader className="space-y-2 pb-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <Link
                href="/login"
                className="inline-flex items-center gap-1 font-medium hover:text-foreground text-[#c6182e]"
              >
                <ArrowLeft className="size-3.5" />
                <span>Voltar ao login</span>
              </Link>
              {step < 4 && (
                <span className="font-medium text-slate-400">
                  Etapa {step} de 3
                </span>
              )}
            </div>

            {step === 1 && (
              <>
                <h2 className="text-2xl font-bold tracking-tight text-[#221813]">
                  Esqueceu sua senha?
                </h2>
                <p className="text-sm text-slate-500">
                  Informe o seu e-mail corporativo cadastrado para receber o código de recuperação.
                </p>
              </>
            )}

            {step === 2 && (
              <>
                <h2 className="text-2xl font-bold tracking-tight text-[#221813]">
                  Código de Verificação
                </h2>
                <p className="text-sm text-slate-500">
                  Enviamos um código de 6 dígitos para{' '}
                  <strong className="text-slate-700">{email}</strong>.
                </p>
              </>
            )}

            {step === 3 && (
              <>
                <h2 className="text-2xl font-bold tracking-tight text-[#221813]">
                  Criar Nova Senha
                </h2>
                <p className="text-sm text-slate-500">
                  Defina uma nova senha forte para acessar sua conta.
                </p>
              </>
            )}

            {step === 4 && (
              <div className="text-center pt-2">
                <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-3">
                  <ShieldCheck className="size-8" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-[#221813]">
                  Senha Redefinida!
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Sua senha foi atualizada com sucesso. Você já pode acessar a plataforma.
                </p>
              </div>
            )}
          </CardHeader>

          <CardContent>
            {/* ETAPA 1: SOLICITAÇÃO DE E-MAIL */}
            {step === 1 && (
              <form onSubmit={handleRequestCode} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-semibold text-slate-700">
                    E-mail Corporativo
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="nome@toclog.com.br"
                      className="pl-10 h-11 bg-slate-50/50 border-slate-200 text-slate-900 focus:ring-[#c6182e] focus:border-[#c6182e]"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                      autoFocus
                    />
                  </div>
                </div>

                {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

                <Button
                  type="submit"
                  className="w-full bg-[#c6182e] hover:bg-[#a51426] text-white font-semibold h-12 text-sm transition-all gap-2"
                  disabled={loading || !email}
                >
                  {loading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <>
                      <span>Enviar Código</span>
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </Button>
              </form>
            )}

            {/* ETAPA 2: DIGITAR CÓDIGO OTP */}
            {step === 2 && (
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="code" className="text-sm font-semibold text-slate-700">
                      Código de 6 dígitos
                    </Label>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-xs text-[#c6182e] hover:underline"
                    >
                      Alterar e-mail
                    </button>
                  </div>

                  <Input
                    id="code"
                    type="text"
                    maxLength={6}
                    placeholder="000000"
                    className="h-14 text-center text-2xl tracking-[0.5em] font-mono bg-slate-50/50 border-slate-200 text-slate-900 focus:ring-[#c6182e] focus:border-[#c6182e]"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    required
                    disabled={loading}
                    autoFocus
                  />
                  <p className="text-xs text-slate-400 text-center">
                    Verifique também a caixa de spam ou lixo eletrônico.
                  </p>
                </div>

                {error && <p className="text-sm text-red-500 font-medium text-center">{error}</p>}

                <Button
                  type="submit"
                  className="w-full bg-[#c6182e] hover:bg-[#a51426] text-white font-semibold h-12 text-sm transition-all gap-2"
                  disabled={loading || code.length !== 6}
                >
                  {loading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <>
                      <span>Validar Código</span>
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </Button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={handleRequestCode}
                    disabled={loading}
                    className="text-xs text-slate-500 hover:text-slate-800 underline"
                  >
                    Não recebeu? Reenviar código
                  </button>
                </div>
              </form>
            )}

            {/* ETAPA 3: DEFINIR NOVA SENHA */}
            {step === 3 && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="new-pass" className="text-xs font-semibold text-slate-700">
                      Nova Senha
                    </Label>
                    <div className="flex items-center gap-1">
                      {newPassword && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 px-1.5 text-xs text-slate-500"
                          onClick={handleCopyPassword}
                        >
                          {copied ? (
                            <Check className="size-3 text-emerald-500" />
                          ) : (
                            <Copy className="size-3" />
                          )}
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-[11px] gap-1 text-[#c6182e] border-[#c6182e]/20"
                        onClick={handleGeneratePassword}
                      >
                        <Sparkles className="size-3" />
                        <span>Gerar Forte</span>
                      </Button>
                    </div>
                  </div>

                  <div className="relative">
                    <Input
                      id="new-pass"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Nova senha"
                      className="pr-10 h-10 bg-slate-50/50"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      disabled={loading}
                      autoFocus
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                {/* Requisitos de senha */}
                {newPassword.length > 0 && (
                  <div className="rounded-md bg-slate-50 p-2.5 text-[11px] space-y-1 border border-slate-200">
                    <div className="grid grid-cols-2 gap-1">
                      <span
                        className={`flex items-center gap-1 ${
                          hasMinLength ? 'text-emerald-600' : 'text-slate-400'
                        }`}
                      >
                        {hasMinLength ? (
                          <CheckCircle2 className="size-3" />
                        ) : (
                          <XCircle className="size-3" />
                        )}
                        Mínimo 8 dígitos
                      </span>
                      <span
                        className={`flex items-center gap-1 ${
                          hasUpper ? 'text-emerald-600' : 'text-slate-400'
                        }`}
                      >
                        {hasUpper ? (
                          <CheckCircle2 className="size-3" />
                        ) : (
                          <XCircle className="size-3" />
                        )}
                        Letra maiúscula
                      </span>
                      <span
                        className={`flex items-center gap-1 ${
                          hasLower ? 'text-emerald-600' : 'text-slate-400'
                        }`}
                      >
                        {hasLower ? (
                          <CheckCircle2 className="size-3" />
                        ) : (
                          <XCircle className="size-3" />
                        )}
                        Letra minúscula
                      </span>
                      <span
                        className={`flex items-center gap-1 ${
                          hasNumber ? 'text-emerald-600' : 'text-slate-400'
                        }`}
                      >
                        {hasNumber ? (
                          <CheckCircle2 className="size-3" />
                        ) : (
                          <XCircle className="size-3" />
                        )}
                        Número
                      </span>
                      <span
                        className={`flex items-center gap-1 col-span-2 ${
                          hasSpecial ? 'text-emerald-600' : 'text-slate-400'
                        }`}
                      >
                        {hasSpecial ? (
                          <CheckCircle2 className="size-3" />
                        ) : (
                          <XCircle className="size-3" />
                        )}
                        Caractere especial (!@#$...)
                      </span>
                    </div>
                  </div>
                )}

                {/* Confirmar Senha */}
                <div className="space-y-1.5">
                  <Label htmlFor="confirm-pass" className="text-xs font-semibold text-slate-700">
                    Confirmar Nova Senha
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirm-pass"
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="Repita a nova senha"
                      className="pr-10 h-10 bg-slate-50/50"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={loading}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                      onClick={() => setShowConfirm(!showConfirm)}
                      tabIndex={-1}
                    >
                      {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  {confirmPassword && !passwordsMatch && (
                    <p className="text-[11px] text-red-500 flex items-center gap-1">
                      <XCircle className="size-3" /> As senhas não conferem.
                    </p>
                  )}
                </div>

                {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

                <Button
                  type="submit"
                  className="w-full bg-[#c6182e] hover:bg-[#a51426] text-white font-semibold h-12 text-sm transition-all gap-2"
                  disabled={loading || !isPasswordValid}
                >
                  {loading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <>
                      <span>Salvar Nova Senha</span>
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </Button>
              </form>
            )}

            {/* ETAPA 4: SUCESSO */}
            {step === 4 && (
              <div className="space-y-4 pt-2">
                <Button
                  onClick={() => router.push('/login')}
                  className="w-full bg-[#c6182e] hover:bg-[#a51426] text-white font-semibold h-12 text-sm transition-all"
                >
                  Fazer Login Agora
                </Button>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col items-center justify-center pt-4 pb-2 text-center">
            <p className="text-[11px] text-slate-400 leading-relaxed max-w-xs">
              Ambiente seguro Toclog • Em caso de dúvidas, contate o Administrador de TI.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
