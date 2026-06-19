"use client"

import { Check, LayoutTemplate, Palette, RectangleHorizontal, Type } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { ThemePaletteCard } from "@/components/theme/theme-palette-card"
import { THEME_PALETTES } from "@/lib/theme-system"

const TYPOGRAPHY_SCALE = [
  { label: "Kicker", className: "app-kicker", example: "Contexto da pagina" },
  { label: "Titulo principal", className: "app-title", example: "Titulo da tela" },
  { label: "Subtitulo", className: "app-subtitle", example: "Descricao curta que explica o valor da secao." },
]

const LAYOUT_RULES = [
  "Toda tela nova deve abrir com `app-page` e `app-page-header`.",
  "Secoes usam `app-section-card` para manter padding, borda e sombra consistentes.",
  "Formularios administrativos usam `app-form-grid` com uma coluna no mobile e duas no desktop.",
  "Botoes primarios ficam no rodape da secao, preferencialmente alinhados a direita.",
]

const COMPONENT_RULES = [
  "Inputs, selects e textareas usam `w-full` por padrao.",
  "A altura default dos controles e 40px; versao compacta e 36px.",
  "O container define a largura. O conteudo nao pode ditar o tamanho do campo.",
  "Labels ficam acima do campo e hints usam `text-muted-foreground`.",
]

export default function DesignSystemPage() {
  return (
    <div className="app-page">
      <section className="app-page-header theme-surface">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-3">
            <p className="app-kicker">Design System</p>
            <div className="space-y-2">
              <h1 className="app-title">Padrao vivo das telas do LogFlow2</h1>
              <p className="app-subtitle">
                Esta pagina e a referencia operacional para novas telas e refatoracoes.
                O contrato normativo esta em <code>docs/standards/design-system.md</code>.
              </p>
            </div>
          </div>
          <Badge variant="outline" className="rounded-full px-4 py-2 text-sm">
            Uso obrigatorio em telas novas
          </Badge>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="rounded-[28px] border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Type className="size-5 text-primary" />
              Tipografia
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {TYPOGRAPHY_SCALE.map((item) => (
              <div key={item.label} className="rounded-[22px] border border-border/60 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">{item.label}</p>
                <div className={item.className}>{item.example}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <LayoutTemplate className="size-5 text-primary" />
              Regras de layout
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {LAYOUT_RULES.map((rule) => (
              <RuleItem key={rule} text={rule} />
            ))}
            <Separator />
            <div className="rounded-[22px] border border-dashed border-border/70 p-5">
              <p className="text-sm font-semibold">Comando curto recomendado</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                <code>crie/refatore a tela X seguindo docs/standards/design-system.md e os componentes base do frontend</code>
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="app-section-card space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Palette className="size-5 text-primary" />
            <h2 className="text-2xl font-semibold tracking-tight">Paletas oficiais</h2>
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            As paletas abaixo sao as assinaturas oficiais do sistema. Elas alteram tema e shell sem quebrar a mesma estrutura de componentes.
          </p>
        </div>

        <div className="space-y-6">
          <div className="grid gap-5 xl:grid-cols-2">
            {THEME_PALETTES.map((palette) => (
              <ThemePaletteCard key={palette.id} palette={palette} mode="light" />
            ))}
          </div>
          <div className="grid gap-5 xl:grid-cols-2">
            {THEME_PALETTES.map((palette) => (
              <ThemePaletteCard key={`${palette.id}-dark`} palette={palette} mode="dark" />
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="rounded-[28px] border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <RectangleHorizontal className="size-5 text-primary" />
              Tamanhos e comportamento de componentes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {COMPONENT_RULES.map((rule) => (
              <RuleItem key={rule} text={rule} />
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl">Exemplo de formulario padrao</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="app-form-grid">
              <div className="field-stack">
                <Label htmlFor="example-name">Nome do fluxo</Label>
                <Input id="example-name" placeholder="Controle de transferencias" />
              </div>
              <div className="field-stack">
                <Label htmlFor="example-owner">Responsavel</Label>
                <Select defaultValue="manager">
                  <SelectTrigger id="example-owner">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manager">Coordenacao</SelectItem>
                    <SelectItem value="hr">Recursos Humanos</SelectItem>
                    <SelectItem value="operations">Operacoes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="field-stack md:col-span-2">
                <Label htmlFor="example-description">Descricao</Label>
                <Textarea id="example-description" placeholder="Explique em linguagem simples o objetivo desta tela ou fluxo." />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline">Cancelar</Button>
              <Button>Salvar padrao</Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

function RuleItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-[20px] border border-border/60 p-4">
      <span className="mt-0.5 flex size-6 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Check className="size-4" />
      </span>
      <p className="text-sm leading-6 text-foreground">{text}</p>
    </div>
  )
}
