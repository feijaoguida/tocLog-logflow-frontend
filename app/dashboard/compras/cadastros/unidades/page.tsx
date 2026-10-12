'use client'

import { useEffect, useState } from 'react'
import {
  Loader2,
  Pencil,
  Plus,
  RotateCw,
  Ruler,
  Search,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { api } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/api-error'

interface Unit {
  id: string
  name: string
  symbol: string
}

interface Product {
  id: string
  unitId?: string
  unit?: { id: string }
}

export default function UnitsPage() {
  const [units, setUnits] = useState<Unit[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Modal Unidade
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [symbol, setSymbol] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Delete Unidade
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const fetchData = async () => {
    try {
      setLoading(true)
      const [unitsRes, prodsRes] = await Promise.all([
        api.get('/products/units/all'),
        api.get('/products').catch(() => ({ data: [] })),
      ])
      setUnits(unitsRes.data || [])
      setProducts(prodsRes.data || [])
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Erro ao carregar unidades de medida.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchData()
  }, [])

  const handleOpenModal = (unit?: Unit) => {
    if (unit) {
      setEditingId(unit.id)
      setName(unit.name)
      setSymbol(unit.symbol)
    } else {
      setEditingId(null)
      setName('')
      setSymbol('')
    }
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !symbol.trim()) {
      toast.error('Informe o nome e o símbolo da unidade.')
      return
    }

    try {
      setSubmitting(true)
      if (editingId) {
        await api.patch(`/products/units/${editingId}`, {
          name: name.trim(),
          symbol: symbol.trim().toUpperCase(),
        })
        toast.success('Unidade de medida atualizada com sucesso.')
      } else {
        await api.post('/products/units', {
          name: name.trim(),
          symbol: symbol.trim().toUpperCase(),
        })
        toast.success('Unidade de medida cadastrada com sucesso.')
      }
      setIsModalOpen(false)
      await fetchData()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Erro ao salvar unidade de medida.'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      setDeleteLoading(true)
      await api.delete(`/products/units/${deleteId}`)
      toast.success('Unidade de medida excluída com sucesso.')
      setIsDeleteOpen(false)
      setDeleteId(null)
      await fetchData()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível excluir a unidade.'))
    } finally {
      setDeleteLoading(false)
    }
  }

  const filteredUnits = units.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.symbol.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Unidades de Medida
            </h1>
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              {units.length} {units.length === 1 ? 'unidade' : 'unidades'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Padrão de dimensionamento, pesagem e fracionamento utilizado nos pedidos e cotações.
          </p>
        </div>

        <Button
          size="sm"
          className="h-8 gap-1.5 font-semibold"
          onClick={() => handleOpenModal()}
        >
          <Plus className="size-3.5" />
          <span>Nova Unidade</span>
        </Button>
      </div>

      {/* Barra de Pesquisa */}
      <Card className="app-section-card p-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou símbolo (ex: UN, KG, CX, MT)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 pl-9 text-xs"
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-9 px-2.5 text-xs"
            onClick={fetchData}
            title="Atualizar lista"
          >
            <RotateCw className="size-3.5" />
          </Button>
        </div>
      </Card>

      {/* Tabela de Unidades */}
      <Card className="app-section-card overflow-hidden">
        {loading ? (
          <div className="flex min-h-[250px] items-center justify-center">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : filteredUnits.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Ruler className="mx-auto size-10 text-muted-foreground/60" />
            <h3 className="text-sm font-semibold text-foreground">Nenhuma unidade encontrada</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Cadastre unidades de medida para utilizar na parametrização dos produtos de compras.
            </p>
            <Button
              size="sm"
              className="mt-2"
              onClick={() => handleOpenModal()}
            >
              Cadastrar Primeira Unidade
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[120px]">Símbolo</TableHead>
                <TableHead>Nome da Unidade</TableHead>
                <TableHead className="w-[180px]">Produtos Vinculados</TableHead>
                <TableHead className="w-[100px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUnits.map((u) => {
                const count = products.filter(
                  (p) => p.unitId === u.id || p.unit?.id === u.id,
                ).length

                return (
                  <TableRow key={u.id} className="hover:bg-muted/40 transition-colors">
                    <TableCell>
                      <span className="inline-flex items-center rounded-md bg-primary/10 border border-primary/20 px-2.5 py-1 text-xs font-mono font-bold text-primary">
                        {u.symbol}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium text-foreground text-xs">
                      {u.name}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {count} {count === 1 ? 'produto' : 'produtos'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="size-7 text-muted-foreground hover:text-foreground"
                          onClick={() => handleOpenModal(u)}
                          title="Editar unidade"
                        >
                          <Pencil className="size-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="size-7 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                          onClick={() => {
                            setDeleteId(u.id)
                            setIsDeleteOpen(true)
                          }}
                          title="Excluir unidade"
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Modal Formulário */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>
                {editingId ? 'Editar Unidade de Medida' : 'Nova Unidade de Medida'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-4 text-xs">
              <div className="space-y-1.5">
                <Label htmlFor="unitSymbol" className="text-xs font-semibold">
                  Símbolo (Sigla) *
                </Label>
                <Input
                  id="unitSymbol"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  placeholder="Ex: UN, KG, CX, LT, MT"
                  className="h-9 text-xs font-mono uppercase"
                  maxLength={10}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="unitName" className="text-xs font-semibold">
                  Nome por Extenso *
                </Label>
                <Input
                  id="unitName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Unidade, Quilograma, Caixa, Litro"
                  className="h-9 text-xs"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={submitting}>
                {submitting ? <Loader2 className="size-3.5 animate-spin" /> : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmação de Exclusão */}
      <ConfirmDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title="Excluir Unidade de Medida"
        description="Tem certeza que deseja excluir esta unidade? Produtos cadastrados com esta unidade podem ser afetados."
        onConfirm={handleDelete}
        loading={deleteLoading}
        confirmText="Excluir Unidade"
        variant="destructive"
      />
    </div>
  )
}
