'use client'

import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'

export interface ProviderDescriptor {
  code: string
  label?: string
  name?: string
  description?: string
  transportMode?: string
  capabilities?: unknown
}

export interface ConnectionRecord {
  id: string
  provider: string
  name: string
  environment: 'SANDBOX' | 'PRODUCTION'
  status: 'ACTIVE' | 'INACTIVE' | 'ERROR'
  lastSyncAt?: string | null
  credentials?: { configured?: boolean } | null
  settings?: {
    timeoutMs?: number
    maxRetries?: number
    [key: string]: unknown
  } | null
}

interface ConnectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  connection?: ConnectionRecord | null
  providers?: ProviderDescriptor[] | { items?: ProviderDescriptor[] } | null
  onSuccess: () => void
}

export function ConnectionDialog({
  open,
  onOpenChange,
  connection,
  providers,
  onSuccess,
}: ConnectionDialogProps) {
  const isEditing = Boolean(connection)

  const providerList = React.useMemo<ProviderDescriptor[]>(() => {
    if (!providers) return []
    if (Array.isArray(providers)) return providers
    if (typeof providers === 'object' && Array.isArray((providers as { items?: ProviderDescriptor[] }).items)) {
      return (providers as { items: ProviderDescriptor[] }).items
    }
    return []
  }, [providers])

  const [provider, setProvider] = useState<string>('ELOFY')
  const [name, setName] = useState<string>('')
  const [environment, setEnvironment] = useState<'SANDBOX' | 'PRODUCTION'>('SANDBOX')
  const [timeoutMs, setTimeoutMs] = useState<string>('20000')
  const [maxRetries, setMaxRetries] = useState<string>('3')

  // Credenciais Elofy
  const [elofyAuthType, setElofyAuthType] = useState<'TOKEN' | 'CREDENTIALS'>('TOKEN')
  const [elofyToken, setElofyToken] = useState<string>('')
  const [elofyEmail, setElofyEmail] = useState<string>('')
  const [elofyPassword, setElofyPassword] = useState<string>('')
  const [elofyBaseUrl, setElofyBaseUrl] = useState<string>('')

  // Credenciais SSW
  const [sswToken, setSswToken] = useState<string>('')
  const [sswEdiCode, setSswEdiCode] = useState<string>('')
  const [sswCnpjEdi, setSswCnpjEdi] = useState<string>('')

  const [saving, setSaving] = useState<boolean>(false)

  useEffect(() => {
    if (connection) {
      setProvider(connection.provider)
      setName(connection.name)
      setEnvironment(connection.environment)
      setTimeoutMs(String(connection.settings?.timeoutMs ?? 20000))
      setMaxRetries(String(connection.settings?.maxRetries ?? 3))
      // Limpa os campos de senha para não exibir dados antigos (write-only)
      setElofyToken('')
      setElofyEmail('')
      setElofyPassword('')
      setElofyBaseUrl('')
      setSswToken('')
      setSswEdiCode('')
      setSswCnpjEdi('')
    } else {
      setProvider(providerList[0]?.code ?? 'ELOFY')
      setName('')
      setEnvironment('SANDBOX')
      setTimeoutMs('20000')
      setMaxRetries('3')
      setElofyAuthType('TOKEN')
      setElofyToken('')
      setElofyEmail('')
      setElofyPassword('')
      setElofyBaseUrl('')
      setSswToken('')
      setSswEdiCode('')
      setSswCnpjEdi('')
    }
  }, [connection, open, providerList])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Informe um nome identificador para a conexão.')
      return
    }

    setSaving(true)
    try {
      // Monta as credenciais conforme o provedor
      const credentials: Record<string, string> = {}

      if (provider === 'ELOFY') {
        if (elofyAuthType === 'TOKEN') {
          if (elofyToken.trim()) credentials.token = elofyToken.trim()
        } else {
          if (elofyEmail.trim()) credentials.email = elofyEmail.trim()
          if (elofyPassword.trim()) credentials.password = elofyPassword.trim()
        }
        if (elofyBaseUrl.trim()) credentials.baseUrl = elofyBaseUrl.trim()
      } else if (provider === 'SSW') {
        if (sswToken.trim()) credentials.token = sswToken.trim()
        if (sswEdiCode.trim()) credentials.ediCode = sswEdiCode.trim()
        if (sswCnpjEdi.trim()) credentials.cnpj_edi = sswCnpjEdi.trim()
      }

      const settings = {
        timeoutMs: Number(timeoutMs) || 20000,
        maxRetries: Number(maxRetries) || 3,
      }

      if (isEditing && connection) {
        const payload: Record<string, unknown> = {
          name: name.trim(),
          environment,
          settings,
        }
        if (Object.keys(credentials).length > 0) {
          payload.credentials = credentials
        }
        await api.patch(`/integrations/connections/${connection.id}`, payload)
        toast.success('Conexão atualizada com sucesso.')
      } else {
        const payload = {
          provider,
          name: name.trim(),
          environment,
          credentials: Object.keys(credentials).length > 0 ? credentials : undefined,
          settings,
        }
        await api.post('/integrations/connections', payload)
        toast.success('Nova conexão configurada com sucesso.')
      }

      onSuccess()
      onOpenChange(false)
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Falha ao salvar conexão de integração.'))
    } finally {
      setSaving(false)
    }
  }

  const hasConfiguredCredentials = Boolean(connection?.credentials?.configured)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px]">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? `Editar Conexão — ${connection?.name}` : 'Conectar Novo Provedor'}
            </DialogTitle>
            <DialogDescription>
              Configure os parâmetros de conectividade, credenciais seguras e ambiente de execução.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="provider-select">Provedor de Integração</Label>
              <Select
                value={provider}
                onValueChange={setProvider}
                disabled={isEditing}
              >
                <SelectTrigger id="provider-select">
                  <SelectValue placeholder="Selecione o provedor" />
                </SelectTrigger>
                <SelectContent>
                  {providerList.map((p) => {
                    const displayName =
                      p.label ||
                      p.name ||
                      (p.code === 'ELOFY'
                        ? 'Elofy (Gestão Organizacional)'
                        : p.code === 'SSW'
                        ? 'SSW (Logística e Rastreio)'
                        : p.code)
                    return (
                      <SelectItem key={p.code} value={p.code}>
                        <span className="font-semibold">{displayName}</span>
                        {p.description && (
                          <span className="text-xs text-muted-foreground ml-2">
                            ({p.description})
                          </span>
                        )}
                      </SelectItem>
                    )
                  })}
                  {providerList.length === 0 && (
                    <>
                      <SelectItem value="ELOFY">Elofy (Gestão Organizacional)</SelectItem>
                      <SelectItem value="SSW">SSW (Logística e Rastreio)</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="conn-name">Nome da Conexão</Label>
              <Input
                id="conn-name"
                placeholder="Ex: Elofy Matriz Produção"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="conn-env">Ambiente</Label>
              <Select
                value={environment}
                onValueChange={(val: 'SANDBOX' | 'PRODUCTION') => setEnvironment(val)}
              >
                <SelectTrigger id="conn-env">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SANDBOX">Homologação / Sandbox</SelectItem>
                  <SelectItem value="PRODUCTION">Produção</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="conn-timeout">Timeout (ms)</Label>
              <Input
                id="conn-timeout"
                type="number"
                value={timeoutMs}
                onChange={(e) => setTimeoutMs(e.target.value)}
              />
            </div>
          </div>

          {/* CREDENCIAIS ESPECÍFICAS DO PROVEDOR ELOFY */}
          {provider === 'ELOFY' && (
            <div className="border rounded-md p-3.5 space-y-3 bg-muted/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Credenciais Elofy (Cifradas em Repouso)
                </span>
                <div className="flex items-center gap-1.5 text-xs">
                  <Button
                    type="button"
                    variant={elofyAuthType === 'TOKEN' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setElofyAuthType('TOKEN')}
                  >
                    API Token
                  </Button>
                  <Button
                    type="button"
                    variant={elofyAuthType === 'CREDENTIALS' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setElofyAuthType('CREDENTIALS')}
                  >
                    Login / Senha
                  </Button>
                </div>
              </div>

              {elofyAuthType === 'TOKEN' ? (
                <div className="space-y-1.5">
                  <Label htmlFor="elofy-token">API Token (Bearer)</Label>
                  <Input
                    id="elofy-token"
                    type="password"
                    placeholder={hasConfiguredCredentials ? '•••••••••••••••• (inalterado)' : 'Cole o token de API'}
                    value={elofyToken}
                    onChange={(e) => setElofyToken(e.target.value)}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="elofy-email">E-mail ou CPF de Acesso</Label>
                    <Input
                      id="elofy-email"
                      type="text"
                      placeholder={hasConfiguredCredentials ? '•••••••• (inalterado)' : 'E-mail ou CPF'}
                      value={elofyEmail}
                      onChange={(e) => setElofyEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="elofy-pass">Senha de Serviço</Label>
                    <Input
                      id="elofy-pass"
                      type="password"
                      placeholder={hasConfiguredCredentials ? '•••••••• (inalterado)' : 'Senha de integração'}
                      value={elofyPassword}
                      onChange={(e) => setElofyPassword(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="elofy-url">URL Base Customizada (Opcional)</Label>
                <Input
                  id="elofy-url"
                  placeholder="https://api.elofy.com.br/v1"
                  value={elofyBaseUrl}
                  onChange={(e) => setElofyBaseUrl(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* CREDENCIAIS ESPECÍFICAS DO PROVEDOR SSW */}
          {provider === 'SSW' && (
            <div className="border rounded-md p-3.5 space-y-3 bg-muted/20">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                Credenciais SSW Logística
              </span>
              <div className="space-y-1.5">
                <Label htmlFor="ssw-token">Token / Senha de Acesso</Label>
                <Input
                  id="ssw-token"
                  type="password"
                  placeholder={hasConfiguredCredentials ? '•••••••••••••••• (inalterado)' : 'Token de integração SSW'}
                  value={sswToken}
                  onChange={(e) => setSswToken(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ssw-edi">Código EDI</Label>
                  <Input
                    id="ssw-edi"
                    placeholder="Código EDI da transportadora"
                    value={sswEdiCode}
                    onChange={(e) => setSswEdiCode(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ssw-cnpj">CNPJ EDI</Label>
                  <Input
                    id="ssw-cnpj"
                    placeholder="CNPJ associado ao EDI"
                    value={sswCnpjEdi}
                    onChange={(e) => setSswCnpjEdi(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Conectar Provedor'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
