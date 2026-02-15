
'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { api } from "@/lib/api"
// @ts-ignore
import { Responsive as ResponsiveGridLayout } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { WidgetType, WIDGET_REGISTRY } from './widget-registry'
import { Plus, Save, Trash2, Layout, Settings } from 'lucide-react'
import { toast } from 'sonner'
import _ from 'lodash'
import { useAuth } from '@/context/auth-context'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ChevronDown } from "lucide-react"

// Custom Width Provider wrapper using ResizeObserver
const WidthWrapper = ({ children, className }: { children: (width: number) => React.ReactNode, className?: string }) => {
    const [width, setWidth] = useState(1200)
    const ref = React.useRef<HTMLDivElement>(null)

    useEffect(() => {
        const element = ref.current
        if (!element) return
        
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                // Use contentRect for more precise inner width
                const newWidth = entry.contentRect.width
                if (newWidth > 0 && Math.abs(width - newWidth) > 5) { // 5px threshold to avoid jitter
                     // Defer update to next frame to avoid "ResizeObserver loop limit exceeded" or React render cycles
                     requestAnimationFrame(() => setWidth(newWidth))
                }
            }
        })
        
        observer.observe(element)
        return () => observer.disconnect()
    }, []) // Empty dependency, use functional state update if needed but here we lazily update

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
    onViewsChanged?: () => void
}

const WIDGET_COLORS = [
    { name: 'Branco', value: '#ffffff' },
    { name: 'Cinza Claro', value: '#f8fafc' },
    { name: 'Azul Claro', value: '#eff6ff' },
    { name: 'Verde Claro', value: '#f0fdf4' },
    { name: 'Amarelo Claro', value: '#fefce8' },
    { name: 'Vermelho Claro', value: '#fef2f2' },
]

export function DashboardEngine({ initialViews, currentEmployeeId, onViewsChanged }: DashboardEngineProps) {
    const { hasPermission } = useAuth()
    const canManageDashboard = hasPermission('dashboard.manage') || hasPermission('system.settings.view') // Fallback or specific permission

    const [views, setViews] = useState<DashboardView[]>(initialViews)
    const [currentViewId, setCurrentViewId] = useState<string>(initialViews.length > 0 ? initialViews[0].id : '')
    const [isEditing, setIsEditing] = useState(false)
    const [layouts, setLayouts] = useState<any>({})
    const [widgetData, setWidgetData] = useState<any>({})
    const [widgetConfig, setWidgetConfig] = useState<any>({}) // Stores color, title overrides, etc. keyed by widget instance ID (i)
    
    // New View Dialog State
    const [isNewViewOpen, setIsNewViewOpen] = useState(false)
    const [newViewName, setNewViewName] = useState('')

    // Memoize currentView to prevent unnecessary effect triggers
    const currentView = React.useMemo(() => 
        views.find(v => v.id === currentViewId), 
    [views, currentViewId])

    // Sync views from props ONLY if they look genuinely new (e.g. from server refresh)
    // and we haven't touched them locally.
    // Actually, simpler: Only sync if ID list changes or length changes to avoid deep compare loops.
    // Sync views from props ONLY if they look genuinely new (e.g. from server refresh)
    // and we haven't touched them locally.
    useEffect(() => {
        if (initialViews.length > 0) {
             const isDifferent = initialViews.length !== views.length || 
                                 !_.isEqual(initialViews.map(v => v.id), views.map(v => v.id))
             
             if (isDifferent) {
                 const currentViewExistsInInitial = initialViews.some(v => v.id === currentViewId)
                 const currentViewExistsInLocal = views.some(v => v.id === currentViewId)
                 
                 // If we are viewing something that exists locally but NOT in the incoming props,
                 // it's likely a newly created view that hasn't made the round-trip yet.
                 // Preserve local state to avoid jumping back.
                 if (currentViewExistsInLocal && !currentViewExistsInInitial) {
                     return
                 }

                 setViews(initialViews)
                 // Ensure currentViewId is valid
                 if (!currentViewExistsInInitial) {
                     setCurrentViewId(initialViews[0].id)
                 }
             }
        }
    }, [initialViews, currentViewId, views]) // Added views to dependency to be safe with checks

    // Helper to fetch data safely
    const fetchWidgetData = useCallback(async (layout: any[]) => {
        const types = [...new Set(layout.map((item: any) => item.i.split('-')[0]))]
        if (types.length === 0) return
        
        const query = types.join(',')
        api.get(`/dashboard/data?widgets=${query}`)
           .then(({data}) => {
               setWidgetData((prev: any) => {
                   if (_.isEqual(prev, data)) return prev
                   return data
               })
           })
           .catch(e => console.error("Widget data fetch error", e))
    }, [])

    useEffect(() => {
        if (!currentView) return

        // Load layout
        const config: any = currentView.configuration
        const loadedLayout = Array.isArray(config) ? config : (config?.layout || [])
        
        // Extract styles
        const styles: any = {}
        loadedLayout.forEach((item: any) => {
            if (item.style) {
                styles[item.i] = item.style
            }
        })
        
        // Update widget config only if different
        setWidgetConfig((prev: any) => {
            if (_.isEqual(prev, styles)) return prev
            return styles
        })

        // Update layouts only if LOGICALLY different (ignoring RGL internal props if possible, but deep equal is safe for now if layout is clean)
        // We compare against the stored layout in DB vs current state.
        
        const cleanLoaded = loadedLayout.map((l: any) => ({ i: l.i, x: l.x, y: l.y, w: l.w, h: l.h }))
        
        setLayouts((prev: any) => {
            const currentLg = prev.lg || []
            const cleanCurrent = currentLg.map((l: any) => ({ i: l.i, x: l.x, y: l.y, w: l.w, h: l.h }))
            
            if (_.isEqual(cleanLoaded, cleanCurrent)) {
                return prev // No change
            }
            return { lg: loadedLayout }
        })
            
        fetchWidgetData(loadedLayout)

    }, [currentView, fetchWidgetData])

    const handleLayoutChange = useCallback((currentLayout: any, allLayouts: any) => {
        // RGL triggers this often. We MUST compare carefully.
        // We only care about lg layout for now (simplicity)
        
        setLayouts((prev: any) => {
             const prevLg = prev.lg || []
             const newLg = allLayouts.lg || []
             
             // Check lengths first
             if (prevLg.length !== newLg.length) return allLayouts

             // Check deep equality of CORE fields
             const isSame = prevLg.every((item: any, idx: number) => {
                 const newItem = newLg.find((n: any) => n.i === item.i)
                 if (!newItem) return false
                 return item.x === newItem.x && 
                        item.y === newItem.y && 
                        item.w === newItem.w && 
                        item.h === newItem.h
             })

             if (isSame) return prev // Return exact same object reference to bail out of render
             
             return allLayouts
        })
    }, [])

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
        setWidgetConfig((prev: any) => {
            const newConfig = { ...prev }
            delete newConfig[i]
            return newConfig
        })
    }

    const handleUpdateWidgetStyle = (i: string, style: any) => {
        setWidgetConfig((prev: any) => ({
            ...prev,
            [i]: { ...prev[i], ...style }
        }))
    }

    const handleSaveView = async () => {
        if (!currentView) return
        
        try {
            // layout to save is layouts.lg
            // Clean up RGL props and merge with config
            const cleanLayout = layouts.lg.map((l: any) => ({
                i: l.i, x: l.x, y: l.y, w: l.w, h: l.h, minW: l.minW, minH: l.minH,
                style: widgetConfig[l.i] // Persist style
            }))

            await api.put(`/dashboard/views/${currentView.id}`, {
                name: currentView.name,
                description: '',
                layout: cleanLayout, // Saving as the JSON
                isDefault: currentView.isDefault
            })

            toast.success("Visão salva com sucesso!")
            setIsEditing(false)
            // Update local state views to reflect saved layout
            setViews(prev => prev.map(v => v.id === currentView.id ? { ...v, configuration: cleanLayout } : v))
            if (onViewsChanged) onViewsChanged()
        } catch (e) {
             toast.error("Erro ao salvar visão.")
        }
    }

    const handleCreateView = async () => {
         if (!newViewName) return
         if (!currentEmployeeId) {
             toast.error("Erro: Identificação do usuário inválida. Faça logout e login novamente.")
             return
         }

         try {
            const { data: newView } = await api.post('/dashboard/views', {
                name: newViewName,
                employeeId: currentEmployeeId,
                layout: [] // Start empty
            })

            // Configuration comes back as JSON, ensure it's handled
            setViews(prev => [...prev, newView])
            setCurrentViewId(newView.id)
            setIsNewViewOpen(false)
            setNewViewName('')
            setIsEditing(true) // Immediately enter edit mode
            toast.success("Nova visão criada!")
            if (onViewsChanged) onViewsChanged()
         } catch(e: any) {
             const msg = e.response?.data?.message || "Erro ao criar visão"
             toast.error(msg)
         }
    }

    const handleDeleteView = async () => {
        if (!currentView || views.length <= 1) { // Prevents deleting the last view
             toast.error("Você não pode deletar a única visão.")
             return
        }
        
        if (!confirm("Tem certeza que deseja excluir esta visão?")) return

        try {
            await api.delete(`/dashboard/views/${currentView.id}`)
            
            const newViews = views.filter(v => v.id !== currentView.id)
            setViews(newViews)
            setCurrentViewId(newViews[0].id) // Switch to another
            toast.success("Visão removida.")
            if (onViewsChanged) onViewsChanged()
        } catch (e) {
            toast.error("Erro ao deletar visão.")
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between pb-4 border-b">
                <div className="flex items-center gap-4">
                    <select 
                        value={currentViewId} 
                        onChange={(e) => setCurrentViewId(e.target.value)}
                        className="w-[250px] h-10 px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                        {views.map(v => (
                            <option key={v.id} value={v.id}>{v.name}</option>
                        ))}
                    </select>
                    
                    {canManageDashboard && (
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
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {canManageDashboard ? (
                        isEditing ? (
                            <>
                                <div className="mr-4 flex gap-2 items-center">
                                    <p className="text-sm font-medium text-muted-foreground">Adicionar Widget:</p>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" className="w-[200px] h-8 justify-between font-normal">
                                                Selecione...
                                                <ChevronDown className="h-4 w-4 opacity-50" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="w-[200px]">
                                            {Object.values(WIDGET_REGISTRY).map(w => (
                                                <DropdownMenuItem key={w.id} onSelect={() => handleAddWidget(w.id as WidgetType)}>
                                                    {w.name}
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
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
                        )
                    ) : (
                        <p className="text-sm text-muted-foreground italic">Modo de visualização</p>
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
                                const config = widgetConfig[item.i] || {}
                                const bgColor = config.backgroundColor || '#ffffff'

                                return (
                                    <div 
                                        key={item.i} 
                                        className={`${isEditing ? "border-2 border-dashed border-slate-300" : ""} rounded-lg shadow-sm overflow-hidden`}
                                        style={{ backgroundColor: bgColor }}
                                    >
                                        {isEditing && (
                                            <div className="absolute top-1 right-1 z-20 flex gap-1 bg-white/80 p-1 rounded-bl-lg">
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <div className="cursor-pointer p-1 hover:bg-slate-100 rounded">
                                                            <Settings className="h-4 w-4 text-slate-500" />
                                                        </div>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-50">
                                                        <div className="grid gap-2">
                                                            <h4 className="font-medium leading-none">Aparência</h4>
                                                            <div className="grid grid-cols-3 gap-2">
                                                                {WIDGET_COLORS.map(c => (
                                                                    <div 
                                                                        key={c.value}
                                                                        className={`w-6 h-6 rounded-full cursor-pointer border ${c.value === bgColor ? 'ring-2 ring-black' : ''}`}
                                                                        style={{ backgroundColor: c.value }}
                                                                        onClick={() => handleUpdateWidgetStyle(item.i, { backgroundColor: c.value })}
                                                                        title={c.name}
                                                                    />
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </PopoverContent>
                                                </Popover>
                                                <div className="cursor-pointer p-1 hover:bg-red-50 rounded" onClick={() => handleRemoveWidget(item.i)}>
                                                    <Trash2 className="h-4 w-4 text-red-400 hover:text-red-600" />
                                                </div>
                                            </div>
                                        )}
                                        {WidgetComponent ? (
                                            <div className="h-full w-full">
                                                <WidgetComponent data={widgetData[type]} />
                                            </div>
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
