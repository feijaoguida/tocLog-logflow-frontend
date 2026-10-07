'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/context/auth-context'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { Bot, Sparkles, User, ShieldCheck } from 'lucide-react'

export interface PersonalProfileData {
  agentName: string
  preferredName: string
  responseStyle: 'DIRECT' | 'EXPLANATORY' | 'STEP_BY_STEP'
  formality: 'FORMAL' | 'INFORMAL'
  icon?: string
  themeColor?: string
  ageGroup?: string
  hobbies?: string
}

interface AiPersonalProfileDialogProps {
  isOpen: boolean
  onClose: () => void
  onSaved?: (profile: PersonalProfileData) => void
  isOnboarding?: boolean
}

export function AiPersonalProfileDialog({
  isOpen,
  onClose,
  onSaved,
  isOnboarding = false,
}: AiPersonalProfileDialogProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)

  const [agentName, setAgentName] = useState('Nina')
  const [preferredName, setPreferredName] = useState('')
  const [responseStyle, setResponseStyle] = useState<'DIRECT' | 'EXPLANATORY' | 'STEP_BY_STEP'>('DIRECT')
  const [formality, setFormality] = useState<'FORMAL' | 'INFORMAL'>('INFORMAL')
  const [themeColor, setThemeColor] = useState('#3B82F6')
  const [ageGroup, setAgeGroup] = useState('')
  const [hobbies, setHobbies] = useState('')

  useEffect(() => {
    if (isOpen) {
      setFetching(true)
      api
        .get('/ai/profile/me')
        .then((res) => {
          if (res.data?.hasProfile && res.data?.profile) {
            const p = res.data.profile
            setAgentName(p.agentName || 'Nina')
            setPreferredName(p.preferredName || user?.name || '')
            setResponseStyle(p.responseStyle || 'DIRECT')
            setFormality(p.formality || 'INFORMAL')
            setThemeColor(p.themeColor || '#3B82F6')
            setAgeGroup(p.ageGroup || '')
            setHobbies(p.hobbies || '')
          } else {
            setPreferredName(user?.name ? user.name.split(' ')[0] : '')
          }
        })
        .catch(() => {
          setPreferredName(user?.name ? user.name.split(' ')[0] : '')
        })
        .finally(() => {
          setFetching(false)
        })
    }
  }, [isOpen, user])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!agentName.trim()) {
      toast.error('Informe o nome do seu agente.')
      return
    }
    if (!preferredName.trim()) {
      toast.error('Informe como prefere ser chamado.')
      return
    }

    setLoading(true)
    try {
      const payload: PersonalProfileData = {
        agentName: agentName.trim(),
        preferredName: preferredName.trim(),
        responseStyle,
        formality,
        icon: 'robot',
        themeColor,
        ageGroup: ageGroup.trim() || undefined,
        hobbies: hobbies.trim() || undefined,
      }

      const res = await api.put('/ai/profile/me', payload)
      toast.success(
        isOnboarding
          ? 'Agente pessoal configurado com sucesso! Bem-vindo.'
          : 'Preferências do seu agente foram atualizadas.'
      )
      if (onSaved) {
        onSaved(res.data?.profile || payload)
      }
      onClose()
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || 'Erro ao salvar preferências do agente.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isOnboarding && onClose()}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-full text-primary">
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle>
                {isOnboarding ? 'Configure seu Agente Pessoal' : 'Personalizar Meu Agente'}
              </DialogTitle>
              <DialogDescription>
                {isOnboarding
                  ? 'Antes de iniciar, defina a identidade do seu assistente de IA.'
                  : 'Ajuste o tom e o estilo com que o assistente interage com você.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {fetching ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Carregando preferências...
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="agentName">Nome do Agente *</Label>
                <Input
                  id="agentName"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  placeholder="Ex: Nina, Atlas"
                  maxLength={50}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="preferredName">Como prefere ser chamado? *</Label>
                <Input
                  id="preferredName"
                  value={preferredName}
                  onChange={(e) => setPreferredName(e.target.value)}
                  placeholder="Ex: Carlos, Carlinhos"
                  maxLength={50}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="responseStyle">Estilo de Resposta</Label>
                <Select
                  value={responseStyle}
                  onValueChange={(val: any) => setResponseStyle(val)}
                >
                  <SelectTrigger id="responseStyle">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DIRECT">Direto e Objetivo</SelectItem>
                    <SelectItem value="EXPLANATORY">Explicativo e Didático</SelectItem>
                    <SelectItem value="STEP_BY_STEP">Passo a Passo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="formality">Tom / Formalidade</Label>
                <Select
                  value={formality}
                  onValueChange={(val: any) => setFormality(val)}
                >
                  <SelectTrigger id="formality">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INFORMAL">Informal e Amigável</SelectItem>
                    <SelectItem value="FORMAL">Formal e Corporativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ageGroup">Faixa Etária (opcional)</Label>
                <Input
                  id="ageGroup"
                  value={ageGroup}
                  onChange={(e) => setAgeGroup(e.target.value)}
                  placeholder="Ex: 25-34 anos"
                  maxLength={20}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="themeColor">Cor do Tema</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="themeColor"
                    value={themeColor}
                    onChange={(e) => setThemeColor(e.target.value)}
                    className="w-10 h-10 p-1 rounded border cursor-pointer bg-background"
                  />
                  <span className="text-xs text-muted-foreground font-mono">{themeColor}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hobbies">Áreas de Interesse / Hobbies (opcional)</Label>
              <Textarea
                id="hobbies"
                value={hobbies}
                onChange={(e) => setHobbies(e.target.value)}
                placeholder="Ex: Logística, processos ágeis, tecnologia (usado para analogias didáticas)"
                rows={2}
                maxLength={200}
              />
            </div>

            <div className="p-3 bg-muted/50 rounded-lg flex items-start gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>
                As preferências do seu agente afetam exclusivamente a linguagem e apresentação.
                As permissões do sistema e regras de negócio corporativas permanecem inalteradas.
              </span>
            </div>

            <DialogFooter className="pt-2">
              {!isOnboarding && (
                <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                  Cancelar
                </Button>
              )}
              <Button type="submit" disabled={loading}>
                {loading ? 'Salvando...' : isOnboarding ? 'Concluir Cadastro e Iniciar' : 'Salvar Alterações'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
