import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"

export default function DesignSystemPage() {
  return (
    <div className="container mx-auto py-10 space-y-12">
      <div className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">TocLog Design System</h1>
        <p className="text-xl text-muted-foreground">Um sistema de design consistente e escalável para criar experiências coesas em todos os produtos da TocLog.</p>
      </div>

      <Separator />

      <section className="space-y-6">
        <h2 className="text-2xl font-bold">Paleta de Cores</h2>
        <p className="text-muted-foreground">Nossa paleta é baseada em tons de vermelho, refletindo a energia e dinamismo da TocLog.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Cores Primárias</CardTitle>
                    <CardDescription>Usadas em ações principais e elementos de destaque</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    <div className="h-12 w-full bg-primary rounded-md flex items-center justify-between px-4 text-primary-foreground font-medium shadow-sm">
                        <span>Primary</span>
                        <span className="text-xs opacity-80">--primary</span>
                    </div>
                     <div className="h-12 w-full bg-primary-foreground border rounded-md flex items-center justify-between px-4 text-primary font-medium">
                        <span>Primary Foreground</span>
                        <span className="text-xs opacity-80">--primary-foreground</span>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Cores Secundárias</CardTitle>
                    <CardDescription>Usadas em elementos de suporte e backgrounds</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    <div className="h-12 w-full bg-secondary rounded-md flex items-center justify-between px-4 text-secondary-foreground font-medium">
                        <span>Secondary</span>
                        <span className="text-xs opacity-80">--secondary</span>
                    </div>
                     <div className="h-12 w-full bg-muted rounded-md flex items-center justify-between px-4 text-muted-foreground font-medium">
                        <span>Muted</span>
                        <span className="text-xs opacity-80">--muted</span>
                    </div>
                     <div className="h-12 w-full bg-accent rounded-md flex items-center justify-between px-4 text-accent-foreground font-medium">
                        <span>Accent</span>
                        <span className="text-xs opacity-80">--accent</span>
                    </div>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>Cores Semânticas</CardTitle>
                    <CardDescription>Comunicam estados e feedback ao usuário</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    <div className="h-12 w-full bg-destructive rounded-md flex items-center justify-between px-4 text-destructive-foreground font-medium">
                        <span>Destructive</span>
                        <span className="text-xs opacity-80">--destructive</span>
                    </div>
                    <div className="h-12 w-full bg-emerald-500 rounded-md flex items-center justify-between px-4 text-white font-medium">
                        <span>Success</span>
                        <span className="text-xs opacity-80">--emerald-500</span>
                    </div>
                </CardContent>
            </Card>
        </div>
        
        <div className="space-y-4">
             <h3 className="text-lg font-semibold">Gradiente da Marca</h3>
             <div className="h-24 w-full rounded-xl bg-gradient-to-br from-red-600 to-red-400 shadow-lg"></div>
             <code className="text-xs text-muted-foreground block">bg-gradient-to-br from-red-600 to-red-400</code>
        </div>
      </section>

      <Separator />

      <section className="space-y-6">
        <h2 className="text-2xl font-bold">Tipografia</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-6">
                <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">H1 - 36px / Bold</p>
                    <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">Título Principal</h1>
                </div>
                <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">H2 - 30px / Semibold</p>
                    <h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0">Título de Seção</h2>
                </div>
                 <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">H3 - 24px / Semibold</p>
                    <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">Subtítulo</h3>
                </div>
            </div>
            <div className="space-y-6">
                 <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Body Large - 18px</p>
                    <p className="leading-7 [&:not(:first-child)]:mt-6 text-lg font-medium">Texto para introduções e destaques importantes.</p>
                </div>
                <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Body - 16px</p>
                    <p className="leading-7 [&:not(:first-child)]:mt-6">Texto padrão para parágrafos e conteúdo geral da aplicação. A legibilidade é prioridade.</p>
                </div>
                 <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Small - 14px</p>
                    <p className="text-sm font-medium leading-none">Texto secundário, descrições e informações complementares.</p>
                </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Caption - 12px</p>
                    <p className="text-xs text-muted-foreground">Labels, timestamps e metadados.</p>
                </div>
            </div>
        </div>
      </section>

      <Separator />

       <section className="space-y-6">
        <h2 className="text-2xl font-bold">Componentes</h2>
        
        <div className="space-y-8">
            <div className="space-y-4">
                <h3 className="text-lg font-semibold">Botões</h3>
                <div className="flex flex-wrap gap-4 items-center">
                    <Button>Default (Primary)</Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="default" className="bg-red-600 hover:bg-red-700">Brand Color</Button>
                    <Button variant="outline">Outline</Button>
                    <Button variant="ghost">Ghost</Button>
                    <Button variant="destructive">Destructive</Button>
                    <Button variant="link">Link Button</Button>
                </div>
                <div className="flex flex-wrap gap-4 items-center mt-4">
                     <Button size="sm">Small</Button>
                     <Button size="default">Default</Button>
                     <Button size="lg">Large</Button>
                     <Button size="icon">
                         <span className="font-bold">+</span>
                     </Button>
                </div>
            </div>

            <div className="space-y-4 max-w-md">
                <h3 className="text-lg font-semibold">Inputs e Campos</h3>
                <div className="grid w-full items-center gap-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input type="email" id="email" placeholder="Email" />
                </div>
                 <div className="grid w-full items-center gap-1.5">
                    <Label htmlFor="text">Texto com erro</Label>
                    <Input type="text" id="text" placeholder="Nome" className="border-red-500 focus-visible:ring-red-500" />
                    <span className="text-xs text-red-500">Mensagem de erro explicativa.</span>
                </div>
            </div>

             <div className="space-y-4">
                <h3 className="text-lg font-semibold">Badges</h3>
                <div className="flex gap-2">
                    <Badge>Default</Badge>
                    <Badge variant="secondary">Secondary</Badge>
                    <Badge variant="outline">Outline</Badge>
                    <Badge variant="destructive">Destructive</Badge>
                     <Badge className="bg-emerald-500 hover:bg-emerald-600">Success</Badge>
                </div>
            </div>
        </div>
      </section>
    </div>
  )
}
