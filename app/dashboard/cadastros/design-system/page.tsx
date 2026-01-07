"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"

export default function DesignSystemPage() {
  return (
    <div className="space-y-6 p-10 pb-16 block">
      <div className="space-y-0.5">
        <h2 className="text-2xl font-bold tracking-tight">Design System</h2>
        <p className="text-muted-foreground">
          Visualização dos componentes e tokens de design do projeto.
        </p>
      </div>
      <Separator className="my-6" />

      <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
        <aside className="-mx-4 lg:w-1/5">
            <nav className="flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1">
                <Button variant="ghost" className="bg-muted hover:bg-muted justify-start">Visão Geral</Button>
                <Button variant="ghost" className="justify-start">Typography</Button>
                <Button variant="ghost" className="justify-start">Colors</Button>
                <Button variant="ghost" className="justify-start">Components</Button>
            </nav>
        </aside>
        <div className="flex-1 lg:max-w-4xl space-y-8">
            
            {/* Colors Section */}
            <section className="space-y-4">
                <h3 className="text-lg font-medium">Cores Principais</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                        <div className="h-20 rounded-lg bg-primary shadow-sm border" />
                        <div className="text-sm font-medium">Primary</div>
                        <div className="text-xs text-muted-foreground">Brand color</div>
                    </div>
                    <div className="space-y-2">
                        <div className="h-20 rounded-lg bg-secondary shadow-sm border" />
                        <div className="text-sm font-medium">Secondary</div>
                        <div className="text-xs text-muted-foreground">Muted actions</div>
                    </div>
                    <div className="space-y-2">
                        <div className="h-20 rounded-lg bg-destructive shadow-sm border" />
                        <div className="text-sm font-medium">Destructive</div>
                        <div className="text-xs text-muted-foreground">Errors/Warnings</div>
                    </div>
                    <div className="space-y-2">
                        <div className="h-20 rounded-lg bg-muted shadow-sm border" />
                        <div className="text-sm font-medium">Muted</div>
                        <div className="text-xs text-muted-foreground">Backgrounds</div>
                    </div>
                </div>
            </section>

             <Separator />

             {/* Typography Section */}
             <section className="space-y-4">
                <h3 className="text-lg font-medium">Tipografia</h3>
                <div className="space-y-4 border rounded-lg p-6">
                    <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
                       Heading 1 (Extrabold)
                    </h1>
                    <h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0">
                        Heading 2 (Semibold)
                    </h2>
                    <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">
                        Heading 3 (Semibold)
                    </h3>
                    <h4 className="scroll-m-20 text-xl font-semibold tracking-tight">
                        Heading 4 (Semibold)
                    </h4>
                    <p className="leading-7 [&:not(:first-child)]:mt-6">
                        Parágrafo padrão. O design system utiliza a fonte Inter para garantir legibilidade e modernidade.
                    </p>
                    <p className="text-sm text-muted-foreground">
                        Texto mudo (Muted Foreground)
                    </p>
                </div>
            </section>

            <Separator />

             {/* Components Section */}
             <section className="space-y-4">
                <h3 className="text-lg font-medium">Componentes</h3>
                
                <div className="grid gap-6">
                    {/* Buttons */}
                    <Card>
                        <CardHeader><CardTitle>Botões</CardTitle></CardHeader>
                        <CardContent className="flex flex-wrap gap-4">
                            <Button>Default</Button>
                            <Button variant="secondary">Secondary</Button>
                            <Button variant="destructive">Destructive</Button>
                            <Button variant="outline">Outline</Button>
                            <Button variant="ghost">Ghost</Button>
                            <Button variant="link">Link</Button>
                        </CardContent>
                    </Card>

                    {/* Inputs */}
                    <Card>
                         <CardHeader><CardTitle>Formulários</CardTitle></CardHeader>
                         <CardContent className="grid gap-4 max-w-sm">
                             <div className="grid gap-2">
                                 <Label>Email</Label>
                                 <Input type="email" placeholder="Email" />
                             </div>
                             <div className="flex items-center space-x-2">
                                <Checkbox id="terms" />
                                <Label htmlFor="terms">Aceito os termos</Label>
                             </div>
                        </CardContent>
                    </Card>

                    {/* Badges */}
                    <Card>
                         <CardHeader><CardTitle>Indicadores</CardTitle></CardHeader>
                         <CardContent className="flex gap-4">
                             <Badge>Default</Badge>
                             <Badge variant="secondary">Secondary</Badge>
                             <Badge variant="destructive">Destructive</Badge>
                             <Badge variant="outline">Outline</Badge>
                        </CardContent>
                    </Card>
                </div>
             </section>
        </div>
      </div>
    </div>
  )
}
