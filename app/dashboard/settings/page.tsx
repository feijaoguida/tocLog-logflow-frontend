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
import { api } from "@/lib/api"
import { toast } from "sonner"
import { ThemePaletteCard } from "@/components/theme/theme-palette-card"
import {
    THEME_PALETTES,
    getThemePalette,
    resolvePreviewMode,
    type ThemeMode,
    type ThemePaletteId,
} from "@/lib/theme-system"

const MODE_OPTIONS: Array<{
    id: ThemeMode
    title: string
    description: string
    icon: React.ComponentType<{ className?: string }>
}> = [
    {
        id: 'light',
        title: 'Modo Claro',
        description: 'Superficies claras com contraste alto e leitura institucional.',
        icon: SunMedium,
    },
    {
        id: 'dark',
        title: 'Modo Escuro',
        description: 'Base escura com contraste reforcado para jornadas longas.',
        icon: MoonStar,
    },
    {
        id: 'system',
        title: 'Seguir Sistema',
        description: 'Acompanha automaticamente a preferencia do dispositivo.',
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
    const [draftThemePalette, setDraftThemePalette] = useState<ThemePaletteId>(themePalette)

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
        } catch (error) {
            console.error(error)
        }
    }

    const handleSaveCompany = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!companyId) return

        setCompanyLoading(true)
        try {
            await api.patch(`/companies/${companyId}`, {
                name: companyName,
                document: companyDoc,
                description: companyDesc
            })
            toast.success("Perfil da empresa atualizado!")
        } catch (error) {
            console.error(error)
            toast.error("Erro ao atualizar empresa.")
        } finally {
            setCompanyLoading(false)
        }
    }

    const handleApplyTheme = () => {
        setThemeMode(draftThemeMode)
        setThemePalette(draftThemePalette)
        toast.success(`Tema ${selectedPalette.name} aplicado em ${previewMode === 'dark' ? 'modo escuro' : 'modo claro'}.`)
    }

    return (
        <div className="app-page">
            <section className="app-page-header theme-surface">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-3">
                        <p className="app-kicker">Configuracao</p>
                        <div className="space-y-2">
                            <h1 className="app-title">Tema</h1>
                            <p className="app-subtitle">
                                Escolha a paleta visual e o modo de exibicao para personalizar a experiencia do LogFlow2.
                                As novas telas devem seguir esta mesma fundacao de layout, tipografia e componentes.
                            </p>
                        </div>
                    </div>
                    <Badge variant="outline" className="rounded-full px-4 py-2 text-sm">
                        {selectedPalette.name} · {previewMode === 'dark' ? 'Escuro' : 'Claro'}
                    </Badge>
                </div>
            </section>

            <Tabs defaultValue="theme" className="w-full space-y-6">
                <TabsList className="grid w-full max-w-[520px] grid-cols-3">
                    <TabsTrigger value="theme">Tema</TabsTrigger>
                    <TabsTrigger value="interface">Interface</TabsTrigger>
                    <TabsTrigger value="company">Empresa</TabsTrigger>
                </TabsList>

                <TabsContent value="theme" className="space-y-6">
                    <section className="app-section-card space-y-6">
                        <div className="rounded-[24px] border border-border/60 bg-primary/6 p-5">
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                    <Palette className="size-5 text-primary" />
                                    <h2 className="text-2xl font-semibold tracking-tight">Visual por usuario</h2>
                                </div>
                                <p className="text-sm leading-6 text-muted-foreground">
                                    A preferencia fica salva neste navegador e orienta o shell, cards, formularios e futuras telas.
                                </p>
                            </div>
                        </div>

                        <div className="grid gap-4 lg:grid-cols-3">
                            {MODE_OPTIONS.map((option) => {
                                const Icon = option.icon
                                const selected = draftThemeMode === option.id

                                return (
                                    <button
                                        key={option.id}
                                        type="button"
                                        onClick={() => setDraftThemeMode(option.id)}
                                        className={`rounded-[24px] border p-5 text-left transition ${selected ? 'border-primary bg-primary/7 shadow-sm' : 'border-border/70 hover:border-primary/40 hover:bg-muted/40'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className={`flex size-11 items-center justify-center rounded-2xl ${selected ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'}`}>
                                                <Icon className="size-5" />
                                            </span>
                                            <div>
                                                <h3 className="text-lg font-semibold tracking-tight">{option.title}</h3>
                                                <p className="mt-1 text-sm leading-6 text-muted-foreground">{option.description}</p>
                                            </div>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    </section>

                    <section className="app-section-card space-y-6">
                        <div className="space-y-2">
                            <p className="app-kicker">Color Palette</p>
                            <h2 className="text-3xl font-semibold tracking-tight">Escolha sua assinatura visual</h2>
                            <p className="text-sm leading-6 text-muted-foreground">
                                Cada paleta ajusta cor principal, sidebar, foco e acentos semanticos mantendo o mesmo sistema de layout e componentes.
                            </p>
                        </div>

                        <div className="grid gap-5 xl:grid-cols-2">
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
                    </section>

                    <section className="app-section-card space-y-5">
                        <div className="space-y-2">
                            <p className="app-kicker">Preview da selecao</p>
                            <h2 className="text-2xl font-semibold tracking-tight">{selectedPalette.name} em {previewMode === 'dark' ? 'modo escuro' : 'modo claro'}</h2>
                            <p className="text-sm leading-6 text-muted-foreground">
                                Esta combinacao passa a orientar cabecalhos, botoes primarios, feedback visual e o menu lateral.
                            </p>
                        </div>

                        <div className="rounded-[28px] border border-border/60 bg-background/60 p-4">
                            <ThemePaletteCard
                                palette={selectedPalette}
                                mode={previewMode}
                                selected
                                className="pointer-events-none"
                            />
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-sm text-muted-foreground">
                                Padrao atual salvo: {getThemePalette(themePalette).name} · {themeMode === 'system' ? 'Seguir sistema' : themeMode === 'dark' ? 'Escuro' : 'Claro'}
                            </p>
                            <Button onClick={handleApplyTheme} disabled={!hasPendingThemeChange}>
                                Aplicar tema
                            </Button>
                        </div>
                    </section>
                </TabsContent>

                <TabsContent value="interface" className="space-y-6">
                    <section className="app-section-card">
                        <div className="space-y-2">
                            <h2 className="text-2xl font-semibold tracking-tight">Preferencias de interface</h2>
                            <p className="text-sm leading-6 text-muted-foreground">
                                Controles operacionais que afetam navegacao e densidade das telas.
                            </p>
                        </div>

                        <div className="mt-6 space-y-5">
                            <PreferenceRow
                                title="Menu em acordeao"
                                description="Apenas um grupo de menu aberto por vez."
                                control={
                                    <Switch id="accordion" checked={accordionMode} onCheckedChange={setAccordionMode} />
                                }
                            />

                            <PreferenceRow
                                title="Recolher ao clicar"
                                description="Fecha o menu lateral automaticamente ao clicar em um item no mobile."
                                control={
                                    <Switch id="collapse" checked={collapseOnClick} onCheckedChange={setCollapseOnClick} />
                                }
                            />

                            <PreferenceRow
                                title="Itens por pagina"
                                description="Padrao para tabelas e listagens. As novas telas devem respeitar este valor."
                                control={
                                    <div className="w-full max-w-[220px]">
                                        <Select value={String(itemsPerPage)} onValueChange={(value) => setItemsPerPage(Number(value))}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="5">5 itens</SelectItem>
                                                <SelectItem value="10">10 itens</SelectItem>
                                                <SelectItem value="20">20 itens</SelectItem>
                                                <SelectItem value="50">50 itens</SelectItem>
                                                <SelectItem value="100">100 itens</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                }
                            />
                        </div>
                    </section>
                </TabsContent>

                <TabsContent value="company" className="space-y-6">
                    <Card className="rounded-[28px] border-border/60 shadow-sm">
                        <CardHeader>
                            <CardTitle>Perfil da empresa</CardTitle>
                            <CardDescription>Informacoes principais da organizacao.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSaveCompany} className="space-y-6">
                                <div className="app-form-grid">
                                    <div className="field-stack md:col-span-2">
                                        <Label htmlFor="compName">Razao Social / Nome</Label>
                                        <Input id="compName" value={companyName} onChange={e => setCompanyName(e.target.value)} required />
                                    </div>
                                    <div className="field-stack">
                                        <Label htmlFor="compDoc">CNPJ / Documento</Label>
                                        <Input id="compDoc" value={companyDoc} onChange={e => setCompanyDoc(e.target.value)} />
                                    </div>
                                    <div className="field-stack">
                                        <Label htmlFor="compDesc">Descricao / Ramo de Atividade</Label>
                                        <Input id="compDesc" value={companyDesc} onChange={e => setCompanyDesc(e.target.value)} />
                                    </div>
                                </div>
                                <div className="flex justify-end">
                                    <Button type="submit" disabled={companyLoading}>
                                        {companyLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Salvar alteracoes
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}

function PreferenceRow({
    title,
    description,
    control,
}: {
    title: string
    description: string
    control: React.ReactNode
}) {
    return (
        <div className="flex flex-col gap-3 rounded-[24px] border border-border/60 p-5 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl space-y-1">
                <h3 className="text-base font-semibold">{title}</h3>
                <p className="text-sm leading-6 text-muted-foreground">{description}</p>
            </div>
            <div className="w-full md:flex md:w-auto md:justify-end">
                {control}
            </div>
        </div>
    )
}
