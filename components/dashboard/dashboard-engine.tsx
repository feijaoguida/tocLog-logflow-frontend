
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
import { toast } from 'sonner'
import _ from 'lodash'
import { useAuth } from '@/context/auth-context'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

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
    { name: 'Transparente', value: 'transparent' },
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
        // RGL triggers this often. 
        // We directly update layouts to ensure the controlled component stays in sync.
        // Deep comparison here was likely causing issues where state didn't update, 
        // forcing RGL to revert to old props on next render.
        setLayouts(allLayouts)
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
        setWidgetConfig((prev: any) => {
            return {
                ...prev,
                [i]: { ...prev[i], ...style }
            }
        })
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

    // Compute effective layout to force static mode when not editing
    const displayLayouts = React.useMemo(() => {
        const newLayouts: any = {}
        Object.keys(layouts).forEach(key => {
            newLayouts[key] = layouts[key].map((item: any) => ({
                ...item,
                static: !isEditing
            }))
        })
        return newLayouts
    }, [layouts, isEditing])

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
                                    <span className="material-symbols-outlined text-[18px]">add</span>
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
                                                <span className="material-symbols-outlined opacity-50 text-[18px]">keyboard_arrow_down</span>
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="max-h-[300px] overflow-y-auto w-[250px]">
                                            {Object.values(WIDGET_REGISTRY).map(w => (
                                                <DropdownMenuItem key={w.id} onSelect={() => handleAddWidget(w.id as WidgetType)}>
                                                    {w.name}
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                                <Button variant="default" onClick={handleSaveView}>
                                    <span className="material-symbols-outlined mr-2 text-[18px]">save</span> Salvar Layout
                                </Button>
                                <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancelar</Button>
                            </>
                        ) : (
                            <>
                                <Button variant="outline" onClick={() => setIsEditing(true)}>
                                    <span className="material-symbols-outlined mr-2 text-[18px]">dashboard</span> Editar Layout
                                </Button>
                                 <Button variant="ghost" size="icon" onClick={handleDeleteView}>
                                    <span className="material-symbols-outlined text-red-500 text-[18px]">delete</span>
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
                            layouts={displayLayouts}
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
                            {(displayLayouts.lg || []).map((item: any) => {
                                const type = item.i.split('-')[0] as WidgetType
                                const widgetDef = WIDGET_REGISTRY[type]
                                const WidgetComponent = widgetDef?.component
                                const config = widgetConfig[item.i] || {}
                                // Default background to transparent for Separators if not set
                                const isSeparator = type.startsWith('SEPARATOR')
                                const defaultBg = isSeparator ? 'transparent' : '#ffffff'
                                const bgColor = config.backgroundColor || defaultBg

                                return (
                                    <div 
                                        key={item.i} 
                                        data-grid={item}
                                        className={`${isEditing ? "border-2 border-dashed border-slate-300" : ""} rounded-lg shadow-sm overflow-hidden`}
                                        style={{ backgroundColor: bgColor }}
                                    >
                                        {isEditing && (
                                            <div className="absolute top-1 right-1 z-20 flex gap-1 bg-white/80 p-1 rounded-bl-lg">
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <div className="cursor-pointer p-1 hover:bg-slate-100 rounded">
                                                            <span className="material-symbols-outlined text-slate-500 text-[16px]">settings</span>
                                                        </div>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-60">
                                                        <div className="grid gap-4">
                                                            <div>
                                                                <h4 className="font-medium leading-none mb-2">Fundo do Widget</h4>
                                                                <div className="grid grid-cols-4 gap-2">
                                                                    {WIDGET_COLORS.map(c => (
                                                                        <div 
                                                                            key={c.value}
                                                                            className={`w-6 h-6 rounded-full cursor-pointer border relative ${c.value === bgColor ? 'ring-2 ring-black' : ''}`}
                                                                            style={{ backgroundColor: c.value === 'transparent' ? 'white' : c.value }}
                                                                            onClick={() => handleUpdateWidgetStyle(item.i, { backgroundColor: c.value })}
                                                                            title={c.name}
                                                                        >
                                                                            {c.value === 'transparent' && (
                                                                                <div className="absolute inset-0 flex items-center justify-center text-red-500 text-[10px] font-bold">/</div>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                    <div className="relative w-6 h-6 rounded-full overflow-hidden border cursor-pointer ring-offset-1 hover:ring-2 ring-gray-400">
                                                                        <input 
                                                                            type="color" 
                                                                            className="absolute -top-2 -left-2 w-10 h-10 p-0 border-0 cursor-pointer"
                                                                            value={bgColor === 'transparent' ? '#ffffff' : bgColor}
                                                                            onChange={(e) => handleUpdateWidgetStyle(item.i, { backgroundColor: e.target.value })}
                                                                            title="Cor Personalizada"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        
                                                        {isSeparator && (
                                                            <div className="grid gap-2 border-t pt-2">
                                                                <h4 className="font-medium leading-none">Estilo da Linha</h4>
                                                                <div className="space-y-3">
                                                                     <div>
                                                                        <label className="text-xs text-muted-foreground block mb-1">Cor</label>
                                                                        <div className="flex gap-2 flex-wrap">
                                                                            {['#000000', '#e2e8f0', '#94a3b8', '#64748b', '#ef4444', '#3b82f6', '#22c55e', '#eab308'].map(c => (
                                                                                <div 
                                                                                    key={c}
                                                                                    className={`w-5 h-5 rounded-full cursor-pointer border ${config.lineColor === c ? 'ring-2 ring-black' : ''}`}
                                                                                    style={{ backgroundColor: c }}
                                                                                    onClick={() => handleUpdateWidgetStyle(item.i, { lineColor: c })}
                                                                                />
                                                                            ))}
                                                                            <div className="relative w-5 h-5 rounded-full overflow-hidden border cursor-pointer ring-offset-1 hover:ring-2 ring-gray-400">
                                                                                <input 
                                                                                    type="color" 
                                                                                    className="absolute -top-2 -left-2 w-10 h-10 p-0 border-0 cursor-pointer"
                                                                                    value={config.lineColor || '#000000'}
                                                                                    onChange={(e) => handleUpdateWidgetStyle(item.i, { lineColor: e.target.value })}
                                                                                    title="Cor Personalizada"
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                     </div>
                                                                     <div className="grid grid-cols-2 gap-2">
                                                                         <div>
                                                                             <label className="text-xs text-muted-foreground block mb-1">Espessura</label>
                                                                             <div className="flex items-center gap-2">
                                                                                 <input 
                                                                                    type="range" min="1" max="10" step="1"
                                                                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                                                                    value={config.thickness || 2}
                                                                                    onChange={(e) => handleUpdateWidgetStyle(item.i, { thickness: parseInt(e.target.value) })}
                                                                                 />
                                                                                 <span className="text-xs w-4">{config.thickness || 2}px</span>
                                                                             </div>
                                                                         </div>
                                                                          <div>
                                                                             <label className="text-xs text-muted-foreground block mb-1">Tipo</label>
                                                                             <select 
                                                                                className="w-full text-xs border rounded p-1"
                                                                                value={config.lineStyle || 'solid'}
                                                                                onChange={(e) => handleUpdateWidgetStyle(item.i, { lineStyle: e.target.value })}
                                                                             >
                                                                                 <option value="solid">Sólido</option>
                                                                                 <option value="dashed">Tracejado</option>
                                                                                 <option value="dotted">Pontilhado</option>
                                                                             </select>
                                                                         </div>
                                                                     </div>
                                                                     <div className="flex items-center gap-2">
                                                                         <label className="text-xs text-muted-foreground">Pontas:</label>
                                                                         <div className="flex gap-1">
                                                                             {['butt', 'round', 'square'].map(cap => (
                                                                                 <div 
                                                                                    key={cap}
                                                                                    className={`px-2 py-1 text-[10px] border rounded cursor-pointer ${config.lineCap === cap ? 'bg-slate-900 text-white' : 'bg-white hover:bg-slate-100'}`}
                                                                                    onClick={() => handleUpdateWidgetStyle(item.i, { lineCap: cap })}
                                                                                >
                                                                                    {cap === 'butt' ? 'Reta' : cap === 'round' ? 'Red.' : 'Quad.'}
                                                                                </div>
                                                                             ))}
                                                                         </div>
                                                                     </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                        </div>
                                                    </PopoverContent>
                                                </Popover>
                                                <div className="cursor-pointer p-1 hover:bg-red-50 rounded" onClick={() => handleRemoveWidget(item.i)}>
                                                    <span className="material-symbols-outlined text-red-400 hover:text-red-600 text-[16px]">delete</span>
                                                </div>
                                            </div>
                                        )}
                                        {WidgetComponent ? (
                                            <div className="h-full w-full">
                                                <WidgetComponent data={widgetData[type]} config={config} />
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
                     <span className="material-symbols-outlined opacity-20 text-[48px] mb-4">dashboard</span>
                     <p>Esta visão está vazia. Clique em "Editar Layout" para adicionar widgets.</p>
                 </div>
             )}
        </div>
    )
}
