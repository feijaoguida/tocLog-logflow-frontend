'use client'

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Pencil, Trash2, Loader2, Search, Package, Ruler, Tag } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"

// Interfaces
interface Category { id: string, name: string }
interface Unit { id: string, name: string, symbol: string }
interface Product { 
    id: string
    name: string
    description: string | null
    category: Category
    unit: Unit
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  
  // Dialog State (Product)
  const [isProductOpen, setIsProductOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formLoading, setFormLoading] = useState(false)

  // Product Form
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [unitId, setUnitId] = useState("")

  // Fetch Data
  const fetchData = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const headers = { 'Authorization': `Bearer ${token}` }
      
      const [prodRes, catRes, unitRes] = await Promise.all([
          fetch('http://localhost:3000/products', { headers }),
          fetch('http://localhost:3000/products/categories/all', { headers }),
          fetch('http://localhost:3000/products/units/all', { headers })
      ])
      
      if(prodRes.ok) setProducts(await prodRes.json())
      if(catRes.ok) setCategories(await catRes.json())
      if(unitRes.ok) setUnits(await unitRes.json())
    } catch (error) {
      toast.error("Erro ao carregar dados.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  // Product Actions
  const handleSaveProduct = async (e: React.FormEvent) => {
      e.preventDefault()
      setFormLoading(true)
      try {
          const token = localStorage.getItem('token')
          const payload = { name, description, categoryId, unitId }
          
          let url = 'http://localhost:3000/products'
          let method = 'POST'
          if(editingId) {
              url = `http://localhost:3000/products/${editingId}`
              method = 'PATCH'
          }

          const res = await fetch(url, {
              method,
              headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify(payload)
          })

          if(!res.ok) throw new Error()
          
          toast.success("Produto salvo com sucesso")
          setIsProductOpen(false)
          fetchData()
          resetForm()
      } catch(e) {
          toast.error("Erro ao salvar produto")
      } finally {
          setFormLoading(false)
      }
  }

  const handleDeleteProduct = async (id: string) => {
      if(!confirm("Deseja excluir este produto?")) return
      try {
          const token = localStorage.getItem('token')
          await fetch(`http://localhost:3000/products/${id}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
          })
          toast.success("Produto excluído")
          fetchData()
      } catch { toast.error("Erro ao excluir") }
  }

  const resetForm = () => {
      setName(""); setDescription(""); setCategoryId(""); setUnitId("")
      setEditingId(null)
  }

  const handleEdit = (p: Product) => {
      setEditingId(p.id)
      setName(p.name)
      setDescription(p.description || "")
      setCategoryId(p.category.id)
      setUnitId(p.unit.id)
      setIsProductOpen(true)
  }

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Catálogo de Produtos</h1>
            <p className="text-muted-foreground">Gerencie produtos, categorias e unidades de medida.</p>
          </div>
          <Button onClick={() => { resetForm(); setIsProductOpen(true) }} className="gap-2">
            <Plus className="h-4 w-4"/> Novo Produto
          </Button>
        </div>

        <Tabs defaultValue="products" className="space-y-4">
            <TabsList>
                <TabsTrigger value="products">Produtos</TabsTrigger>
                <TabsTrigger value="categories">Categorias</TabsTrigger>
                <TabsTrigger value="units">Unidades de Medida</TabsTrigger>
            </TabsList>

            <TabsContent value="products" className="space-y-4">
                 <div className="flex items-center gap-2">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Buscar produtos..." className="pl-8" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredProducts.map(p => (
                        <Card key={p.id} className="group relative hover:border-primary/50 transition-all">
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2">
                                        <Package className="h-5 w-5 text-primary" />
                                        <CardTitle className="text-lg truncate">{p.name}</CardTitle>
                                    </div>
                                    <Badge variant="outline">{p.unit.symbol}</Badge>
                                </div>
                                <CardDescription className="line-clamp-2 h-[40px]">{p.description || "Sem descrição"}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                                    <Tag className="h-3 w-3" /> {p.category.name}
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEdit(p)}>Editar</Button>
                                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteProduct(p.id)}><Trash2 className="h-4 w-4"/></Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    {!loading && filteredProducts.length === 0 && <div className="col-span-full text-center text-muted-foreground py-10">Nenhum produto encontrado.</div>}
                </div>
            </TabsContent>

            <TabsContent value="categories">
                <Card>
                    <CardHeader><CardTitle>Categorias</CardTitle><CardDescription>Gerencie as categorias de produtos.</CardDescription></CardHeader>
                    <CardContent>
                        <ul className="space-y-2 max-w-md">
                            {categories.map(c => <li key={c.id} className="p-3 border rounded-md flex justify-between items-center bg-muted/20"><span>{c.name}</span></li>)}
                        </ul>
                        <div className="mt-4 p-4 bg-muted/30 rounded-lg max-w-md pointer-events-none opacity-50">CRUD de Categorias Simplificado (Implementar modal similar a produtos)</div>
                    </CardContent>
                </Card>
            </TabsContent>
            
            <TabsContent value="units">
                <Card>
                    <CardHeader><CardTitle>Unidades de Medida</CardTitle><CardDescription>Gerencie as unidades (kg, m, un).</CardDescription></CardHeader>
                    <CardContent>
                         <ul className="space-y-2 max-w-md">
                            {units.map(u => <li key={u.id} className="p-3 border rounded-md flex justify-between items-center bg-muted/20"><span>{u.name} ({u.symbol})</span></li>)}
                        </ul>
                        <div className="mt-4 p-4 bg-muted/30 rounded-lg max-w-md pointer-events-none opacity-50">CRUD de Unidades Simplificado (Implementar modal similar a produtos)</div>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>

        {/* Product Modal */}
        <Dialog open={isProductOpen} onOpenChange={setIsProductOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{editingId ? "Editar Produto" : "Novo Produto"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="grid gap-2">
                        <Label>Nome do Produto</Label>
                        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Cadeira de Escritório" />
                    </div>
                    <div className="grid gap-2">
                        <Label>Descrição</Label>
                        <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Detalhes técnicos..." />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>Categoria</Label>
                            <Select value={categoryId} onValueChange={setCategoryId}>
                                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                <SelectContent>
                                    {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>Unidade</Label>
                            <Select value={unitId} onValueChange={setUnitId}>
                                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                <SelectContent>
                                    {units.map(u => <SelectItem key={u.id} value={u.id}>{u.symbol} - {u.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsProductOpen(false)}>Cancelar</Button>
                    <Button onClick={handleSaveProduct} disabled={formLoading}>
                        {formLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  )
}
