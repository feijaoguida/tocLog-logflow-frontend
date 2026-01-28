
'use client'

import React, { useState, useEffect, useCallback } from 'react'
// @ts-ignore
import { Responsive as ResponsiveGridLayout } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { WidgetType, WIDGET_REGISTRY } from './widget-registry'
import { Plus, Save, Trash2, Layout } from 'lucide-react'
import { toast } from 'sonner'
import _ from 'lodash'

// Custom Width Provider wrapper using ResizeObserver
const WidthWrapper = ({ children, className }: { children: (width: number) => React.ReactNode, className?: string }) => {
    const [width, setWidth] = useState(1200)
    const ref = React.useRef<HTMLDivElement>(null)

    useEffect(() => {
        const element = ref.current
        if (!element) return
        
        const updateWidth = () => {
             if (element) {
                 const newWidth = element.offsetWidth
                 // Avoid state update if width hasn't changed meaningfully
                 setWidth(prev => Math.abs(prev - newWidth) > 1 ? newWidth : prev)
             }
        }
        
        updateWidth()

        const resizeObserver = new ResizeObserver(() => {
             window.requestAnimationFrame(() => {
                 updateWidth()
             })
        })
        
        resizeObserver.observe(element)
        return () => resizeObserver.disconnect()
    }, [])

    return (
        <div ref={ref} className={className} style={{ width: '100%' }}>
            {width > 0 && children(width)}
        </div>
    )
}

interface DashboardView {
    id: string
    name: string
    configuration: {
        layout: ReactGridLayout.Layout[]
        breakpoints: { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }
        cols: { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }
    }
    isDefault?: boolean
}

interface DashboardEngineProps {
    initialViews: DashboardView[]
    currentEmployeeId: string
}

export function DashboardEngine({ initialViews, currentEmployeeId }: DashboardEngineProps) {
    const [views, setViews] = useState<DashboardView[]>(initialViews)
    const [currentViewId, setCurrentViewId] = useState<string>(initialViews.length > 0 ? initialViews[0].id : '')
    const [isEditing, setIsEditing] = useState(false)
    const [layouts, setLayouts] = useState<any>({})
    const [widgetData, setWidgetData] = useState<any>({})
    
    // New View Dialog State
    const [isNewViewOpen, setIsNewViewOpen] = useState(false)
    const [newViewName, setNewViewName] = useState('')

    const currentView = views.find(v => v.id === currentViewId)

    useEffect(() => {
        if (currentView) {
            // Load layout
             // Ensuring layout is in the correct format for RGL
            // If saved from DB, it might be in `currentView.configuration` directly if it's single breakpoint
            // But we want to support responsive. For MVP, we might treat `currentView.configuration` as the main layout array
            // and adapt it.
            
            // Simplification: currentView.configuration IS the array of items with {i, x, y, w, h}
            // We map it to { lg: configuration }
            const loadedLayout = Array.isArray(currentView.configuration) 
                ? currentView.configuration 
                : (currentView.configuration as any)?.layout || []
                
            setLayouts({ lg: loadedLayout })
            
            // Fetch Data
            fetchWidgetData(loadedLayout)
        }
    }, [currentViewId])

    const fetchWidgetData = async (layout: any[]) => {
        // Extract unique widget types from layout
        const types = [...new Set(layout.map((item: any) => {
            // item.i is usually "type-randomId" or just "type"
            return item.i.split('-')[0]
        }))]
        
        if (types.length === 0) return

        try {
            const token = localStorage.getItem('token')
            const query = types.join(',')
            const res = await fetch(`http://localhost:3000/dashboard/data?widgets=${query}`, {
                 headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                setWidgetData(data)
            }
        } catch (e) {
            console.error("Failed to fetch widget data", e)
        }
    }

    const handleLayoutChange = (currentLayout: any, allLayouts: any) => {
        setLayouts(allLayouts)
    }

    const handleAddWidget = (type: WidgetType) => {
        const def = WIDGET_REGISTRY[type]
        const newItem = {
            i: `${type}-${Date.now()}`,
            x: 0,
            y: Infinity, // puts it at the bottom
            w: def.defaultW,
            h: def.defaultH,
            minW: def.minW,
            minH: def.minH
        }
        
        setLayouts((prev: any) => ({
            ...prev,
            lg: [...(prev.lg || []), newItem]
        }))
    }

    const handleRemoveWidget = (i: string) => {
        setLayouts((prev: any) => ({
            ...prev,
            lg: (prev.lg || []).filter((item: any) => item.i !== i)
        }))
    }

    const handleSaveView = async () => {
        if (!currentView) return
        
        try {
            const token = localStorage.getItem('token')
            // layout to save is layouts.lg
            // Clean up RGL props
            const cleanLayout = layouts.lg.map((l: any) => ({
                i: l.i, x: l.x, y: l.y, w: l.w, h: l.h, minW: l.minW, minH: l.minH
            }))

            const res = await fetch(`http://localhost:3000/dashboard/views/${currentView.id}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: currentView.name,
                    description: '',
                    layout: cleanLayout, // Saving as the JSON
                    isDefault: currentView.isDefault
                })
            })

            if (res.ok) {
                toast.success("Visão salva com sucesso!")
                setIsEditing(false)
                // Update local state views to reflect saved layout
                setViews(prev => prev.map(v => v.id === currentView.id ? { ...v, configuration: cleanLayout } : v))
            } else {
                toast.error("Erro ao salvar visão.")
            }
        } catch (e) {
             toast.error("Erro de conexão.")
        }
    }

    const handleCreateView = async () => {
         if (!newViewName) return

         try {
            const token = localStorage.getItem('token')
            const res = await fetch(`http://localhost:3000/dashboard/views`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: newViewName,
                    employeeId: currentEmployeeId,
                    layout: [] // Start empty
                })
            })

            if (res.ok) {
                const newView = await res.json()
                // Configuration comes back as JSON, ensure it's handled
                setViews(prev => [...prev, newView])
                setCurrentViewId(newView.id)
                setIsNewViewOpen(false)
                setNewViewName('')
                setIsEditing(true) // Immediately enter edit mode
                toast.success("Nova visão criada!")
            }
         } catch(e) {
             toast.error("Erro ao criar visão")
         }
    }

    const handleDeleteView = async () => {
        if (!currentView || views.length <= 1) { // Prevents deleting the last view
             toast.error("Você não pode deletar a única visão.")
             return
        }
        
        if (!confirm("Tem certeza que deseja excluir esta visão?")) return

        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`http://localhost:3000/dashboard/views/${currentView.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            
            if (res.ok) {
                const newViews = views.filter(v => v.id !== currentView.id)
                setViews(newViews)
                setCurrentViewId(newViews[0].id) // Switch to another
                toast.success("Visão removida.")
            }
        } catch (e) {}
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between pb-4 border-b">
                <div className="flex items-center gap-4">
                    <Select value={currentViewId} onValueChange={setCurrentViewId}>
                        <SelectTrigger className="w-[250px]">
                            <SelectValue placeholder="Selecione uma visão" />
                        </SelectTrigger>
                        <SelectContent>
                            {views.map(v => (
                                <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    
                    <Dialog open={isNewViewOpen} onOpenChange={setIsNewViewOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="icon">
                                <Plus className="h-4 w-4" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Nova Visão</DialogTitle>
                            </DialogHeader>
                            <div className="py-4">
                                <Input 
                                    placeholder="Nome da Visão (ex: Gestão de Frotas)" 
                                    value={newViewName}
                                    onChange={(e) => setNewViewName(e.target.value)}
                                />
                            </div>
                            <DialogFooter>
                                <Button onClick={handleCreateView}>Criar</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="flex items-center gap-2">
                    {isEditing ? (
                        <>
                             <div className="mr-4 flex gap-2">
                                <p className="text-sm font-medium text-muted-foreground self-center">Adicionar Widget:</p>
                                {Object.values(WIDGET_REGISTRY).map(w => (
                                    <Button key={w.id} variant="secondary" size="sm" onClick={() => handleAddWidget(w.id)}>
                                        {w.name}
                                    </Button>
                                ))}
                            </div>
                            <Button variant="default" onClick={handleSaveView}>
                                <Save className="h-4 w-4 mr-2" /> Salvar Layout
                            </Button>
                            <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancelar</Button>
                        </>
                    ) : (
                        <>
                            <Button variant="outline" onClick={() => setIsEditing(true)}>
                                <Layout className="h-4 w-4 mr-2" /> Editar Layout
                            </Button>
                             <Button variant="ghost" size="icon" onClick={handleDeleteView}>
                                <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                        </>
                    )}
                </div>
            </div>

            <div className={isEditing ? "bg-slate-50/50 border rounded-lg min-h-[500px]" : ""}>
                <WidthWrapper>
                    {(width) => (
                        <ResponsiveGridLayout
                            className="layout"
                            width={width} // Pass the width from wrapper
                            layouts={layouts}
                            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                            cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
                            rowHeight={60}
                            onLayoutChange={handleLayoutChange}
                            // @ts-ignore
                            isDraggable={isEditing}
                            // @ts-ignore
                            isResizable={isEditing}
                            containerPadding={[0, 0]}
                            margin={[16, 16]}
                        >
                            {(layouts.lg || []).map((item: any) => {
                                const type = item.i.split('-')[0] as WidgetType
                                const widgetDef = WIDGET_REGISTRY[type]
                                const WidgetComponent = widgetDef?.component

                                return (
                                    <div key={item.i} className={isEditing ? "border-2 border-dashed border-slate-300 bg-white" : ""}>
                                        {isEditing && (
                                            <div className="absolute top-1 right-1 z-10 cursor-pointer" onClick={() => handleRemoveWidget(item.i)}>
                                                <Trash2 className="h-4 w-4 text-red-400 hover:text-red-600" />
                                            </div>
                                        )}
                                        {WidgetComponent ? (
                                            <WidgetComponent data={widgetData[type]} />
                                        ) : (
                                            <div className="p-4 text-red-500">Widget Unknown</div>
                                        )}
                                    </div>
                                )
                            })}
                        </ResponsiveGridLayout>
                    )}
                </WidthWrapper>
            </div>
             {(!layouts.lg || layouts.lg.length === 0) && !isEditing && (
                 <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
                     <Layout className="h-12 w-12 mb-4 opacity-20" />
                     <p>Esta visão está vazia. Clique em "Editar Layout" para adicionar widgets.</p>
                 </div>
             )}
        </div>
    )
}
