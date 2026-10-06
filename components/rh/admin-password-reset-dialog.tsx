'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  KeyRound,
  Eye,
  EyeOff,
  Sparkles,
  Copy,
  Check,
  Loader2,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'

interface AdminPasswordResetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  targetUserId: string
  targetUserName: string
}

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

export function AdminPasswordResetDialog({
  open,
  onOpenChange,
  targetUserId,
  targetUserName,
}: AdminPasswordResetDialogProps) {
  const [actorPassword, setActorPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')

  const [showActorPassword, setShowActorPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)

  // Validation criteria
  const hasMinLength = newPassword.length >= 8
  const hasUpper = /[A-Z]/.test(newPassword)
  const hasLower = /[a-z]/.test(newPassword)
  const hasNumber = /[0-9]/.test(newPassword)
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`§±]/.test(newPassword)
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmNewPassword
  const isFormValid =
    actorPassword.trim().length > 0 &&
    hasMinLength &&
    hasUpper &&
    hasLower &&
    hasNumber &&
    hasSpecial &&
    passwordsMatch

  const handleGeneratePassword = () => {
    const generated = generateStrongPassword(14)
    setNewPassword(generated)
    setConfirmNewPassword(generated)
    setShowNewPassword(true)
    setShowConfirmPassword(true)
    toast.info('Senha forte gerada! Você pode copiá-la se desejar.')
  }

  const handleCopyPassword = async () => {
    if (!newPassword) return
    try {
      await navigator.clipboard.writeText(newPassword)
      setCopied(true)
      toast.success('Senha copiada para a área de transferência!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Não foi possível copiar a senha.')
    }
  }

  const handleReset = () => {
    setActorPassword('')
    setNewPassword('')
    setConfirmNewPassword('')
    setShowActorPassword(false)
    setShowNewPassword(false)
    setShowConfirmPassword(false)
    setCopied(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!actorPassword) {
      toast.error('Informe sua senha atual para autorizar a operação.')
      return
    }

    if (!isFormValid) {
      toast.error('Verifique se a nova senha atende a todos os requisitos.')
      return
    }

    setLoading(true)
    try {
      const { data } = await api.post(`/users/${targetUserId}/admin-reset-password`, {
        actorPassword,
        newPassword,
        confirmNewPassword,
      })

      toast.success(data?.message || 'Senha alterada com sucesso!')
      handleReset()
      onOpenChange(false)
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        'Erro ao redefinir senha. Verifique sua senha atual.'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!loading) {
          if (!isOpen) handleReset()
          onOpenChange(isOpen)
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary mb-1">
            <KeyRound className="size-5" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Acesso e Segurança
            </span>
          </div>
          <DialogTitle className="text-xl">Alterar Senha de Acesso</DialogTitle>
          <DialogDescription>
            Definindo nova senha para o colaborador{' '}
            <strong className="text-foreground">{targetUserName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Campo 1: Senha do usuário logado (RH) */}
          <div className="space-y-1.5 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3.5">
            <Label
              htmlFor="actor-password"
              className="text-xs font-semibold text-amber-900 dark:text-amber-200"
            >
              Sua senha atual (para autorização)
            </Label>
            <div className="relative">
              <Input
                id="actor-password"
                type={showActorPassword ? 'text' : 'password'}
                placeholder="Digite a sua senha de acesso"
                value={actorPassword}
                onChange={(e) => setActorPassword(e.target.value)}
                disabled={loading}
                className="pr-10 bg-background"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowActorPassword(!showActorPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showActorPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
            <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80">
              Por segurança, confirme sua própria senha de usuário do sistema.
            </p>
          </div>

          {/* Campo 2: Nova senha do usuário alvo */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="new-password">Nova Senha do Colaborador</Label>
              <div className="flex items-center gap-1">
                {newPassword && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs gap-1 text-muted-foreground"
                    onClick={handleCopyPassword}
                  >
                    {copied ? (
                      <Check className="size-3 text-emerald-500" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                    <span>{copied ? 'Copiada' : 'Copiar'}</span>
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs gap-1 text-primary border-primary/20 hover:bg-primary/5"
                  onClick={handleGeneratePassword}
                >
                  <Sparkles className="size-3" />
                  <span>Gerar Senha Forte</span>
                </Button>
              </div>
            </div>

            <div className="relative">
              <Input
                id="new-password"
                type={showNewPassword ? 'text' : 'password'}
                placeholder="Digite a nova senha"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
                className="pr-10"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showNewPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
          </div>

          {/* Checklist de requisitos de segurança */}
          {newPassword.length > 0 && (
            <div className="rounded-md bg-muted/50 p-2.5 text-xs space-y-1">
              <div className="font-medium text-muted-foreground mb-1">
                Padrão de segurança:
              </div>
              <div className="grid grid-cols-2 gap-1 text-[11px]">
                <span
                  className={`flex items-center gap-1 ${
                    hasMinLength ? 'text-emerald-600' : 'text-muted-foreground'
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
                    hasUpper ? 'text-emerald-600' : 'text-muted-foreground'
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
                    hasLower ? 'text-emerald-600' : 'text-muted-foreground'
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
                    hasNumber ? 'text-emerald-600' : 'text-muted-foreground'
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
                    hasSpecial ? 'text-emerald-600' : 'text-muted-foreground'
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

          {/* Campo 3: Confirmar Nova Senha */}
          <div className="space-y-1.5">
            <Label htmlFor="confirm-new-password">Confirmar Nova Senha</Label>
            <div className="relative">
              <Input
                id="confirm-new-password"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Repita a nova senha"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                disabled={loading}
                className="pr-10"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showConfirmPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
            {confirmNewPassword && !passwordsMatch && (
              <p className="text-[11px] text-destructive flex items-center gap-1">
                <XCircle className="size-3" /> As senhas não conferem.
              </p>
            )}
          </div>

          <DialogFooter className="pt-2 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!isFormValid || loading}
              className="gap-1.5"
            >
              {loading && <Loader2 className="size-4 animate-spin" />}
              <span>Salvar Nova Senha</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
