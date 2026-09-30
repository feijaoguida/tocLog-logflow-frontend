'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Loader2, MonitorCog, MoonStar, Palette, SunMedium } from "lucide-react"

import { useSettings } from "@/context/settings-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/layout/page-header"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { ThemePaletteCard } from "@/components/theme/theme-palette-card"
import { ThemeSelectionShellPreview } from "@/components/theme/theme-selection-shell-preview"
import { EmailSettingsPanel } from "@/components/email/email-settings-panel"
import {
    THEME_PALETTES,
    getThemePalette,
    resolvePreviewMode,
    type ThemeMode,
    type ThemeColor,
} from "@/lib/theme-system"

const MODE_OPTIONS: Array<{
    id: ThemeMode
    title: string
    description: string
    icon: React.ComponentType<{ className?: string }>
}> = [
    {
        id: 'dark',
        title: 'Modo Escuro',
        description: 'Superfícies escuras com contraste alto e leitura confortável.',
        icon: MoonStar,
    },
    {
        id: 'light',
        title: 'Modo Claro',
        description: 'Superfícies claras com contraste reforçado para jornadas longas.',
        icon: SunMedium,
    },
    {
        id: 'system',
        title: 'Seguir Sistema',
        description: 'Acompanha automaticamente a preferência do seu dispositivo.',
        icon: MonitorCog,
    },
]

export default function SettingsPage() {
    const {
        accordionMode,
        setAccordionMode,
        collapseOnClick,
        setCollapseOnClick,
        itemsPerPage,
        setItemsPerPage,
        themeMode,
        setThemeMode,
        themePalette,
        setThemePalette,
        resolvedTheme,
    } = useSettings()

    const [draftThemeMode, setDraftThemeMode] = useState<ThemeMode>(themeMode)
    const [draftThemePalette, setDraftThemePalette] = useState<ThemeColor>(themePalette)

    const [companyLoading, setCompanyLoading] = useState(false)
    const [companyId, setCompanyId] = useState<string | null>(null)
    const [companyName, setCompanyName] = useState("")
    const [companyDoc, setCompanyDoc] = useState("")
    const [companyDesc, setCompanyDesc] = useState("")

    useEffect(() => {
        fetchCompanyProfile()
    }, [])

    useEffect(() => {
        setDraftThemeMode(themeMode)
        setDraftThemePalette(themePalette)
    }, [themeMode, themePalette])

    const previewMode = resolvePreviewMode(draftThemeMode, resolvedTheme)
    const selectedPalette = useMemo(() => getThemePalette(draftThemePalette), [draftThemePalette])
    const hasPendingThemeChange =
        draftThemeMode !== themeMode || draftThemePalette !== themePalette

    const fetchCompanyProfile = async () => {
        try {
            const res = await api.get('/auth/profile')
            const user = res.data
            if (user.companyId) {
                setCompanyId(user.companyId)
                const compRes = await api.get(`/companies/${user.companyId}`)
                setCompanyName(compRes.data.name)
                setCompanyDoc(compRes.data.document || "")
                setCompanyDesc(compRes.data.description || "")
            }
        } catch {
            // profile/company can fail gracefully if user has no company
        }
    }

    const handleSaveCompany = async () => {
        if (!companyId) return
        setCompanyLoading(true)
        try {
            await api.patch(`/companies/${companyId}`, {
                name: companyName,
                document: companyDoc,
                description: companyDesc,
            })
            toast.success("Dados da empresa atualizados com sucesso!")
        } catch {
            toast.error("Erro ao salvar dados da empresa.")
        } finally {
            setCompanyLoading(false)
        }
    }

    const handleApplyTheme = () => {
        setThemeMode(draftThemeMode)
        setThemePalette(draftThemePalette)
        toast.success("Tema e paleta aplicados com sucesso!", {
            description: `${selectedPalette.name} · ${draftThemeMode === 'system' ? 'Seguir sistema' : draftThemeMode === 'dark' ? 'Modo escuro' : 'Modo claro'}`,
        })
    }

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                eyebrow="Configurações"
                title="Tema"
                description="Escolha a paleta visual e o modo de exibição para personalizar a experiência do LogFlow2."
                actions={
                    <Badge variant="outline" className="px-3 py-1 text-xs">
                        {selectedPalette.name} · {previewMode === 'dark' ? 'Escuro' : 'Claro'}
                    </Badge>
                }
            />

            <Tabs defaultValue="theme" className="w-full space-y-6">
                <TabsList className="grid w-full max-w-[680px] grid-cols-4">
                    <TabsTrigger value="theme">Tema</TabsTrigger>
                    <TabsTrigger value="interface">Interface</TabsTrigger>
                    <TabsTrigger value="company">Empresa</TabsTrigger>
                    <TabsTrigger value="email">E-mail e Alertas</TabsTrigger>
                </TabsList>

                <TabsContent value="theme" className="space-y-6">
                    {/* Bloco 1: Visual por usuário */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Palette className="size-4 text-primary" />
                                <CardTitle>Visual por usuário</CardTitle>
                            </div>
                            <CardDescription>
                                A preferência fica salva neste navegador e orienta o sistema, formulários e futuras telas.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 sm:grid-cols-3">
                                {MODE_OPTIONS.map((option) => {
                                    const Icon = option.icon
                                    const selected = draftThemeMode === option.id

                                    return (
                                        <button
                                            key={option.id}
                                            type="button"
                                            onClick={() => setDraftThemeMode(option.id)}
                                            className={`flex flex-col gap-3 rounded-lg border p-4 text-left shadow-xs transition-all outline-none ${
                                                selected
                                                    ? 'border-primary bg-primary/4 ring-1 ring-primary'
                                                    : 'border-border bg-card hover:border-border-strong hover:bg-surface-subtle'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className={`flex size-9 items-center justify-center rounded-md ${
                                                    selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                                                }`}>
                                                    <Icon className="size-4.5" />
                                                </div>
                                                <span className={`size-3 rounded-full border ${
                                                    selected ? 'border-primary bg-primary' : 'border-border'
                                                }`} />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-semibold tracking-tight text-foreground">{option.title}</h3>
                                                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{option.description}</p>
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Bloco 2: Assinatura visual */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Escolha sua assinatura visual</CardTitle>
                            <CardDescription>
                                Cada paleta ajusta cor principal, sidebar, ícones e componentes do sistema.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                {THEME_PALETTES.map((palette) => (
                                    <ThemePaletteCard
                                        key={palette.id}
                                        palette={palette}
                                        mode={previewMode}
                                        selected={draftThemePalette === palette.id}
                                        onSelect={setDraftThemePalette}
                                    />
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Bloco 3: Preview da seleção */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Preview da seleção</CardTitle>
                            <CardDescription>
                                Veja como a paleta fica aplicada em componentes reais do sistema.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <ThemeSelectionShellPreview
                                palette={selectedPalette}
                                mode={previewMode}
                            />

                            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                                <p className="text-xs text-muted-foreground">
                                    Padrão atual salvo: <span className="font-semibold text-foreground">{getThemePalette(themePalette).name}</span> · {themeMode === 'system' ? 'Seguir sistema' : themeMode === 'dark' ? 'Modo Escuro' : 'Modo Claro'}
                                </p>
                                <Button onClick={handleApplyTheme} disabled={!hasPendingThemeChange}>
                                    Salvar alterações
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="interface" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Preferências de interface</CardTitle>
                            <CardDescription>
                                Controles operacionais que afetam navegação e densidade das telas.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between gap-4">
                                <div className="space-y-0.5">
                                    <Label htmlFor="accordion-mode" className="text-sm font-medium">Menu estilo Acordeão</Label>
                                    <p className="text-xs text-muted-foreground">
                                        Fecha automaticamente o menu anterior ao abrir outro no painel lateral.
                                    </p>
                                </div>
                                <Switch
                                    id="accordion-mode"
                                    checked={accordionMode}
                                    onCheckedChange={setAccordionMode}
                                />
                            </div>

                            <div className="flex items-center justify-between gap-4">
                                <div className="space-y-0.5">
                                    <Label htmlFor="collapse-mode" className="text-sm font-medium">Recolher Menu ao Clicar</Label>
                                    <p className="text-xs text-muted-foreground">
                                        Fecha a barra lateral ao selecionar um item para priorizar a área útil da tela.
                                    </p>
                                </div>
                                <Switch
                                    id="collapse-mode"
                                    checked={collapseOnClick}
                                    onCheckedChange={setCollapseOnClick}
                                />
                            </div>

                            <div className="flex items-center justify-between gap-4">
                                <div className="space-y-0.5">
                                    <Label htmlFor="items-per-page" className="text-sm font-medium">Itens por Página Padrão</Label>
                                    <p className="text-xs text-muted-foreground">
                                        Quantidade padrão de linhas exibidas em tabelas e listagens.
                                    </p>
                                </div>
                                <div className="w-[180px]">
                                    <Select
                                        value={String(itemsPerPage)}
                                        onValueChange={(val) => setItemsPerPage(Number(val))}
                                    >
                                        <SelectTrigger id="items-per-page">
                                            <SelectValue placeholder="Selecione" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="10">10 itens</SelectItem>
                                            <SelectItem value="25">25 itens</SelectItem>
                                            <SelectItem value="50">50 itens</SelectItem>
                                            <SelectItem value="100">100 itens</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="company" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Dados da Empresa</CardTitle>
                            <CardDescription>
                                Informações institucionais da empresa ou filial ativa.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="company-name">Nome da Empresa</Label>
                                    <Input
                                        id="company-name"
                                        value={companyName}
                                        onChange={(e) => setCompanyName(e.target.value)}
                                        placeholder="Razão Social ou Nome Fantasia"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="company-doc">CNPJ / Documento</Label>
                                    <Input
                                        id="company-doc"
                                        value={companyDoc}
                                        onChange={(e) => setCompanyDoc(e.target.value)}
                                        placeholder="00.000.000/0000-00"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="company-desc">Descrição / Atividade</Label>
                                <Input
                                    id="company-desc"
                                    value={companyDesc}
                                    onChange={(e) => setCompanyDesc(e.target.value)}
                                    placeholder="Descrição breve da empresa"
                                />
                            </div>
                            <div className="flex justify-end pt-2">
                                <Button onClick={handleSaveCompany} disabled={companyLoading}>
                                    {companyLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
                                    Salvar Dados
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="email" className="space-y-6">
                    <EmailSettingsPanel />
                </TabsContent>
            </Tabs>
        </div>
    )
}
