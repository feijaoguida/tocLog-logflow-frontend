"use client"

import React, { useState } from "react"
import {
  Layers,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Info,
  Shield,
  Smartphone,
  Eye,
  ArrowRight,
  Code2,
  Sliders,
  Type,
  Maximize2,
  FileText,
  Boxes,
} from "lucide-react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"

export function DesignSystemView() {
  const [activeTab, setActiveTab] = useState("foundations")

  return (
    <div className="flex w-full flex-col gap-8 pb-16">
      {/* Top Banner / Header */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">
            Foundations
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
            Design System
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
            Conjunto de padrões visuais, componentes e diretrizes para garantir uma experiência consistente, acessível e escalável em toda a plataforma TocLog.
          </p>
        </div>

        {/* Info Card */}
        <Card className="w-full lg:max-w-sm border-border bg-surface-subtle shadow-xs">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded bg-primary/10 text-primary">
                <BookOpen className="size-4" />
              </div>
              <CardTitle className="text-sm font-semibold">Interface consistente</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Mais rapidez no desenvolvimento, clareza operacional e uma experiência unificada para todos os produtos.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-8">
        <TabsList className="h-10 w-fit rounded-lg border border-border bg-muted/60 p-1">
          <TabsTrigger value="foundations" className="rounded-md px-4 text-xs font-medium">Foundations</TabsTrigger>
          <TabsTrigger value="components" className="rounded-md px-4 text-xs font-medium">Components</TabsTrigger>
          <TabsTrigger value="patterns" className="rounded-md px-4 text-xs font-medium">Patterns</TabsTrigger>
          <TabsTrigger value="tokens" className="rounded-md px-4 text-xs font-medium">Tokens</TabsTrigger>
        </TabsList>

        {/* Tab 1: Foundations */}
        <TabsContent value="foundations" className="space-y-8 outline-none">
          {/* Princípios de Design & Como Usar */}
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="size-4 text-primary" />
                    <CardTitle>Princípios de design</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-[11px]">Diretrizes</Badge>
                </div>
                <CardDescription>
                  Nosso sistema combina simplicidade, clareza e eficiência para criar interfaces acessíveis focadas no usuário.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1 rounded-md border border-border p-3.5 bg-surface-subtle">
                  <span className="text-xs font-semibold text-foreground">Consistência</span>
                  <p className="text-xs text-muted-foreground">Mesmos padrões visuais e comportamentais em todas as telas.</p>
                </div>
                <div className="flex flex-col gap-1 rounded-md border border-border p-3.5 bg-surface-subtle">
                  <span className="text-xs font-semibold text-foreground">Acessibilidade</span>
                  <p className="text-xs text-muted-foreground">Contraste WCAG AA, foco por teclado e suporte a leitores de tela.</p>
                </div>
                <div className="flex flex-col gap-1 rounded-md border border-border p-3.5 bg-surface-subtle">
                  <span className="text-xs font-semibold text-foreground">Escalabilidade</span>
                  <p className="text-xs text-muted-foreground">Componentes previsíveis, modulares e prontos para expansão.</p>
                </div>
                <div className="flex flex-col gap-1 rounded-md border border-border p-3.5 bg-surface-subtle">
                  <span className="text-xs font-semibold text-foreground">Foco no Usuário</span>
                  <p className="text-xs text-muted-foreground">Densidade equilibrada para alta produtividade em operações reais.</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <BookOpen className="size-4 text-primary" />
                  <CardTitle>Como usar</CardTitle>
                </div>
                <CardDescription>Regras mandatórias para novos módulos.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {[
                  "Utilize os tokens como fonte única de verdade.",
                  "Prefira componentes prontos e evite customizações.",
                  "Siga as diretrizes de acessibilidade e contraste.",
                  "Mantenha consistência em novas telas e funcionalidades.",
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2.5">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                      {idx + 1}
                    </span>
                    <p className="text-xs text-muted-foreground leading-snug">{item}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Sistema de Cores & Tipografia */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Cores */}
            <Card>
              <CardHeader>
                <CardTitle>Sistema de cores</CardTitle>
                <CardDescription>Escala neutra Zinc, assinaturas de cor e cores semânticas fixas.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <span className="text-xs font-semibold text-foreground">Cores Neutras (Zinc)</span>
                  <div className="mt-2 grid grid-cols-6 gap-1.5 sm:grid-cols-11">
                    {[
                      { l: "50", h: "#FAFAFA", c: "#18181b" },
                      { l: "100", h: "#F4F4F5", c: "#18181b" },
                      { l: "200", h: "#E4E4E7", c: "#18181b" },
                      { l: "300", h: "#D4D4D8", c: "#18181b" },
                      { l: "400", h: "#A1A1AA", c: "#ffffff" },
                      { l: "500", h: "#71717A", c: "#ffffff" },
                      { l: "600", h: "#52525B", c: "#ffffff" },
                      { l: "700", h: "#3F3F46", c: "#ffffff" },
                      { l: "800", h: "#27272A", c: "#ffffff" },
                      { l: "900", h: "#18181B", c: "#ffffff" },
                      { l: "950", h: "#09090B", c: "#ffffff" },
                    ].map((item) => (
                      <div
                        key={item.l}
                        className="flex flex-col items-center justify-center rounded p-1.5 text-center border border-border"
                        style={{ backgroundColor: item.h, color: item.c }}
                      >
                        <span className="text-[10px] font-bold">{item.l}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-xs font-semibold text-foreground">Cores Semânticas</span>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <div className="rounded border border-success/30 bg-success-subtle p-2.5 text-xs">
                      <span className="font-semibold text-success">Sucesso</span>
                      <p className="text-[10px] text-muted-foreground mt-0.5">#16A34A</p>
                    </div>
                    <div className="rounded border border-warning/30 bg-warning-subtle p-2.5 text-xs">
                      <span className="font-semibold text-warning">Aviso</span>
                      <p className="text-[10px] text-muted-foreground mt-0.5">#F59E0B</p>
                    </div>
                    <div className="rounded border border-destructive/30 bg-destructive-subtle p-2.5 text-xs">
                      <span className="font-semibold text-destructive">Erro</span>
                      <p className="text-[10px] text-muted-foreground mt-0.5">#EF4444</p>
                    </div>
                    <div className="rounded border border-info/30 bg-info-subtle p-2.5 text-xs">
                      <span className="font-semibold text-info">Informação</span>
                      <p className="text-[10px] text-muted-foreground mt-0.5">#3B82F6</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tipografia */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Type className="size-4 text-primary" />
                  <CardTitle>Tipografia</CardTitle>
                </div>
                <CardDescription>Família Inter com escala proporcional e legibilidade corporativa.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-baseline justify-between border-b border-border/50 pb-2">
                  <span className="text-xs text-muted-foreground">Display (36px / 700)</span>
                  <span className="text-2xl font-bold tracking-tight">Display Titular</span>
                </div>
                <div className="flex items-baseline justify-between border-b border-border/50 pb-2">
                  <span className="text-xs text-muted-foreground">Heading 1 (30px / 700)</span>
                  <span className="text-xl font-bold tracking-tight">Título Principal</span>
                </div>
                <div className="flex items-baseline justify-between border-b border-border/50 pb-2">
                  <span className="text-xs text-muted-foreground">Heading 2 (24px / 600)</span>
                  <span className="text-lg font-semibold tracking-tight">Seção de Página</span>
                </div>
                <div className="flex items-baseline justify-between border-b border-border/50 pb-2">
                  <span className="text-xs text-muted-foreground">Heading 3 (20px / 600)</span>
                  <span className="text-base font-semibold">Subseção</span>
                </div>
                <div className="flex items-baseline justify-between border-b border-border/50 pb-2">
                  <span className="text-xs text-muted-foreground">Body (14px / 400)</span>
                  <span className="text-sm text-foreground">Texto padrão de corpo da aplicação</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-muted-foreground">Code (12px)</span>
                  <code className="text-xs font-mono bg-muted px-2 py-0.5 rounded text-foreground">const toclog = true</code>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Espaçamentos e Raios */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Maximize2 className="size-4 text-primary" />
                <CardTitle>Espaçamentos e raios de borda</CardTitle>
              </div>
              <CardDescription>Base modular de 4px e limites estritos de border-radius.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-foreground">Escala de Espaçamento</span>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="rounded border border-border p-2 bg-surface-subtle">1 (4px)</div>
                  <div className="rounded border border-border p-2 bg-surface-subtle">2 (8px)</div>
                  <div className="rounded border border-border p-2 bg-surface-subtle">3 (12px)</div>
                  <div className="rounded border border-border p-2 bg-surface-subtle">4 (16px)</div>
                  <div className="rounded border border-border p-2 bg-surface-subtle">6 (24px)</div>
                  <div className="rounded border border-border p-2 bg-surface-subtle">8 (32px)</div>
                  <div className="rounded border border-border p-2 bg-surface-subtle">10 (40px)</div>
                  <div className="rounded border border-border p-2 bg-surface-subtle">12 (48px)</div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-foreground">Raios de Borda Oficiais</span>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="rounded-none border border-border p-2 bg-surface-subtle">none (0px)</div>
                  <div className="rounded-sm border border-border p-2 bg-surface-subtle">sm (4px)</div>
                  <div className="rounded-md border border-border p-2 bg-surface-subtle">md (6px)</div>
                  <div className="rounded-lg border border-border p-2 bg-surface-subtle">lg (8px)</div>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Inputs e botões usam 6px; cards e diálogos usam 8px; status pills usam full.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Components */}
        <TabsContent value="components" className="space-y-8 outline-none">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Primitivos */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Boxes className="size-4 text-primary" />
                  <CardTitle>Componentes primitivos</CardTitle>
                </div>
                <CardDescription>Controles essenciais para formulários e ações.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Botões</span>
                  <div className="mt-2 flex flex-wrap gap-2.5">
                    <Button>Primário</Button>
                    <Button variant="secondary">Secundário</Button>
                    <Button variant="outline">Outline</Button>
                    <Button variant="ghost">Ghost</Button>
                    <Button variant="destructive">Destrutivo</Button>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="demo-name" className="text-xs">Input de texto</Label>
                    <Input id="demo-name" placeholder="Digite seu nome..." />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="demo-select" className="text-xs">Select</Label>
                    <Select defaultValue="matriz">
                      <SelectTrigger id="demo-select">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="matriz">Matriz - São Paulo</SelectItem>
                        <SelectItem value="filial">Filial - Rio de Janeiro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Checkbox id="demo-check" defaultChecked />
                    <Label htmlFor="demo-check" className="text-xs">Checkbox ativo</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch id="demo-switch" defaultChecked />
                    <Label htmlFor="demo-switch" className="text-xs">Switch ativo</Label>
                  </div>
                </div>

                <div>
                  <span className="text-xs font-medium text-muted-foreground">Badges de Status</span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="primary">Principal</Badge>
                    <Badge variant="success">Sucesso</Badge>
                    <Badge variant="warning">Aviso</Badge>
                    <Badge variant="destructive">Erro</Badge>
                    <Badge variant="info">Informação</Badge>
                    <Badge variant="neutral">Neutro</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Exemplo de Formulário */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <FileText className="size-4 text-primary" />
                  <CardTitle>Exemplo prático de formulário</CardTitle>
                </div>
                <CardDescription>Padrão estrutural para telas de cadastro e edição.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="f-name" className="text-xs">Nome completo</Label>
                    <Input id="f-name" defaultValue="Diretor TI (Head)" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="f-email" className="text-xs">E-mail corporativo</Label>
                    <Input
                      id="f-email"
                      defaultValue="diretor@toclog"
                      className="border-destructive ring-1 ring-destructive/20"
                    />
                    <span className="text-[11px] text-destructive">E-mail inválido. Digite um e-mail corporativo.</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="f-bio" className="text-xs">Observações / Descrição</Label>
                  <Textarea id="f-bio" placeholder="Conte um pouco sobre suas atribuições..." rows={3} />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline">Cancelar</Button>
                  <Button>Salvar alterações</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 3: Patterns */}
        <TabsContent value="patterns" className="space-y-8 outline-none">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Estados e Feedback */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Sliders className="size-4 text-primary" />
                  <CardTitle>Estados e feedbacks</CardTitle>
                </div>
                <CardDescription>Padrões de estados previsíveis para toda funcionalidade.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 rounded-md border border-border p-3">
                  <span className="text-xs font-semibold">Skeleton (Carregamento)</span>
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-md border border-border p-3 bg-surface-subtle">
                  <Info className="size-5 text-muted-foreground shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-foreground">Estado Vazio</span>
                    <span className="text-xs text-muted-foreground">Nenhum registro encontrado. Tente ajustar os filtros.</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-md border border-success/20 bg-success-subtle p-3 text-success">
                  <CheckCircle2 className="size-5 shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold">Operação Realizada</span>
                    <span className="text-xs text-success/80">Seus dados foram salvos com sucesso no sistema.</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-md border border-destructive/20 bg-destructive-subtle p-3 text-destructive">
                  <XCircle className="size-5 shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold">Não foi possível concluir</span>
                    <span className="text-xs text-destructive/80">Verifique as permissões de acesso e tente novamente.</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Acessibilidade */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Shield className="size-4 text-primary" />
                  <CardTitle>Acessibilidade e conformidade</CardTitle>
                </div>
                <CardDescription>Diretrizes WCAG 2.1 AA implementadas.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  "Contraste adequado mínimo de 4.5:1 para textos corporativos.",
                  "Navegação completa por teclado com anel de foco visível.",
                  "Rótulos semânticos explicitamente associados a todos os inputs.",
                  "Estados não comunicados somente por cor.",
                  "Layout mobile-first responsivo e adaptável.",
                  "Hierarquia visual única de H1 a H4 por página.",
                ].map((rule, idx) => (
                  <div key={idx} className="flex items-center gap-2.5">
                    <CheckCircle2 className="size-4 text-primary shrink-0" />
                    <span className="text-xs text-muted-foreground">{rule}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 4: Tokens */}
        <TabsContent value="tokens" className="space-y-8 outline-none">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Code2 className="size-4 text-primary" />
                <CardTitle>Mapeamento de tokens CSS</CardTitle>
              </div>
              <CardDescription>Variáveis globais Tailwind v4 `@theme inline`.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border bg-muted/40 font-semibold text-foreground">
                    <tr>
                      <th className="p-2.5">Token CSS</th>
                      <th className="p-2.5">Utility Tailwind</th>
                      <th className="p-2.5">Descrição</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 text-muted-foreground font-mono">
                    <tr>
                      <td className="p-2.5 text-primary">--primary</td>
                      <td className="p-2.5">bg-primary, text-primary</td>
                      <td className="p-2.5 font-sans">Cor principal configurável da assinatura</td>
                    </tr>
                    <tr>
                      <td className="p-2.5">--background</td>
                      <td className="p-2.5">bg-background</td>
                      <td className="p-2.5 font-sans">Superfície base da aplicação (#ffffff / #09090b)</td>
                    </tr>
                    <tr>
                      <td className="p-2.5">--card</td>
                      <td className="p-2.5">bg-card, text-card-foreground</td>
                      <td className="p-2.5 font-sans">Superfície de cards e painéis (#ffffff / #111216)</td>
                    </tr>
                    <tr>
                      <td className="p-2.5">--border</td>
                      <td className="p-2.5">border-border</td>
                      <td className="p-2.5 font-sans">Bordas neutras de 1px (#e4e4e7 / #27272a)</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 text-success">--success</td>
                      <td className="p-2.5">bg-success, text-success</td>
                      <td className="p-2.5 font-sans">Status positivo fixo (#16a34a)</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 text-destructive">--destructive</td>
                      <td className="p-2.5">bg-destructive, text-destructive</td>
                      <td className="p-2.5 font-sans">Ações críticas e erros (#ef4444)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
