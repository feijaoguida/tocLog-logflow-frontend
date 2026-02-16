'use client'

import React, { useEffect, useState } from 'react'
import { useSettings } from "@/context/settings-context"
import { useTheme } from "next-themes"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

export default function SettingsPage() {
    const { accordionMode, setAccordionMode, collapseOnClick, setCollapseOnClick, itemsPerPage, setItemsPerPage } = useSettings()
    const { theme, setTheme } = useTheme()
    
    // Company State
    const [companyLoading, setCompanyLoading] = useState(false)
    const [companyId, setCompanyId] = useState<string | null>(null)
    const [companyName, setCompanyName] = useState("")
    const [companyDoc, setCompanyDoc] = useState("")
    const [companyDesc, setCompanyDesc] = useState("")

    useEffect(() => {
        fetchCompanyProfile()
    }, [])

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
             // Silent fail or toast?
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

    return (
        <div className="flex flex-1 flex-col gap-4 p-4">
            <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>

            <Tabs defaultValue="interface" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                    <TabsTrigger value="interface">Interface</TabsTrigger>
                    <TabsTrigger value="company">Empresa</TabsTrigger>
                </TabsList>

                <TabsContent value="interface">
                    <Card>
                        <CardHeader>
                            <CardTitle>Preferências de Interface</CardTitle>
                            <CardDescription>Personalize sua experiência no sistema.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            
                            <div className="flex items-center justify-between space-x-2">
                                <Label htmlFor="theme" className="flex flex-col space-y-1">
                                    <span>Tema</span>
                                    <span className="font-normal text-xs text-muted-foreground">Escolha entre Claro ou Escuro.</span>
                                </Label>
                                <Select value={theme} onValueChange={setTheme}>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="Selecione o tema" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="light">Claro</SelectItem>
                                        <SelectItem value="dark">Escuro</SelectItem>
                                        <SelectItem value="system">Sistema</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-center justify-between space-x-2">
                                <Label htmlFor="accordion" className="flex flex-col space-y-1">
                                    <span>Menu em Acordeão</span>
                                    <span className="font-normal text-xs text-muted-foreground">Apenas um grupo de menu aberto por vez.</span>
                                </Label>
                                <Switch id="accordion" checked={accordionMode} onCheckedChange={setAccordionMode} />
                            </div>

                            <div className="flex items-center justify-between space-x-2">
                                <Label htmlFor="collapse" className="flex flex-col space-y-1">
                                    <span>Recolher ao Clicar</span>
                                    <span className="font-normal text-xs text-muted-foreground">Fecha o menu lateral automaticamente ao clicar em um item (Mobile).</span>
                                </Label>
                                <Switch id="collapse" checked={collapseOnClick} onCheckedChange={setCollapseOnClick} />
                            </div>

                            <div className="flex items-center justify-between space-x-2">
                                <Label htmlFor="pagination" className="flex flex-col space-y-1">
                                    <span>Itens por Página</span>
                                    <span className="font-normal text-xs text-muted-foreground">Padrão para todas as tabelas de listagem.</span>
                                </Label>
                                <Select value={String(itemsPerPage)} onValueChange={(v) => setItemsPerPage(Number(v))}>
                                    <SelectTrigger className="w-[180px]">
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

                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="company">
                    <Card>
                        <CardHeader>
                            <CardTitle>Perfil da Empresa</CardTitle>
                            <CardDescription>Informações principais da organização.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSaveCompany} className="space-y-4">
                                <div className="grid w-full items-center gap-1.5">
                                    <Label htmlFor="compName">Razão Social / Nome</Label>
                                    <Input id="compName" value={companyName} onChange={e => setCompanyName(e.target.value)} required />
                                </div>
                                <div className="grid w-full items-center gap-1.5">
                                    <Label htmlFor="compDoc">CNPJ / Documento</Label>
                                    <Input id="compDoc" value={companyDoc} onChange={e => setCompanyDoc(e.target.value)} />
                                </div>
                                <div className="grid w-full items-center gap-1.5">
                                    <Label htmlFor="compDesc">Descrição / Ramo de Atividade</Label>
                                    <Input id="compDesc" value={companyDesc} onChange={e => setCompanyDesc(e.target.value)} />
                                </div>
                                <div className="flex justify-end">
                                    <Button type="submit" disabled={companyLoading}>
                                        {companyLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Salvar Alterações
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
