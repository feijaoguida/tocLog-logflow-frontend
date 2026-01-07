'use client'

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarMenuItem,
  SidebarRail,
  SidebarFooter,
} from "@/components/ui/sidebar"
import {
  House,
  Users,
  ShoppingCart,
  LifeBuoy,
  Car,
  Box,
  Truck,
  Settings,
  LogOut,
  ChevronRight // Added
} from "lucide-react"
import { useRouter } from "next/navigation"
import { ModeToggle } from "@/components/mode-toggle"
import { useAuth } from "@/context/auth-context"
import React from "react" // Added
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible" // Added
import { Skeleton } from "@/components/ui/skeleton" // Added
import { Switch } from "@/components/ui/switch" // Added
import { Label } from "@/components/ui/label" // Added

export function AppSidebar() {
  const router = useRouter()
  const { hasPermission, logout, isLoading } = useAuth()
  
  // Configuration State
  const [autoCollapse, setAutoCollapse] = React.useState(true)
  const [openGroup, setOpenGroup] = React.useState<string | null>(null)

  // Load Config
  React.useEffect(() => {
      const storedConfig = localStorage.getItem('sidebar_autocollapse')
      if (storedConfig !== null) {
          setAutoCollapse(storedConfig === 'true')
      }
  }, [])

  const toggleAutoCollapse = () => {
      const newState = !autoCollapse
      setAutoCollapse(newState)
      localStorage.setItem('sidebar_autocollapse', String(newState))
  }

  // Handle Group Toggle
  const handleGroupToggle = (title: string, isOpen: boolean) => {
      if (!autoCollapse) return; // Independent toggles if config is off
      if (isOpen) {
          setOpenGroup(title)
      } else if (openGroup === title) {
          setOpenGroup(null) // Closing the current one
      }
  }

  // Menu Definition with Permissions
  const menuGroups = [
      {
          title: "Dashboard",
          url: "/dashboard",
          icon: House,
      },
      {
          title: "Cadastros",
          url: "#",
          icon: Box,
          items: [
              { title: "Funcionários", url: "/dashboard/rh/employees", permission: "rh.employees.view" },
              { title: "Departamentos", url: "/dashboard/rh/departments", permission: "rh.departments.view" },
              { title: "Design System", url: "/dashboard/cadastros/design-system", permission: "system.settings.view" },
              { title: "Controle Permissões", url: "/dashboard/cadastros/permissions", permission: "system.users.view" },
          ]
      },
      {
          title: "Recursos Humanos",
          url: "/dashboard/rh",
          icon: Users,
          permission: "rh.view",
          items: [
              { title: "Intranet", url: "/dashboard/rh" },
              { title: "Férias", url: "/dashboard/rh/vacations", permission: "vacation.view" },
              { title: "Org. Chart", url: "/dashboard/rh/org-chart" },
          ]
      },
      {
          title: "Compras",
          url: "/dashboard/compras",
          icon: ShoppingCart,
          permission: "procurement.requests.view", // Base permission for module
          items: [
              { title: "Dashboard", url: "/dashboard/compras" },
              { title: "Meus Pedidos", url: "/dashboard/compras/pedidos" }, // Everyone can see their own
              { title: "Aprovações", url: "/dashboard/compras/aprovacoes", permission: "procurement.requests.approve" },
              { title: "Cotações", url: "/dashboard/compras/cotacoes", permission: "procurement.quotations.view" },
              { title: "Ordens de Compra", url: "/dashboard/compras/ordens", permission: "procurement.orders.view" },
              { title: "Produtos", url: "/dashboard/compras/cadastros/produtos", permission: "procurement.products.view" },
              { title: "Fornecedores", url: "/dashboard/compras/cadastros/fornecedores", permission: "procurement.suppliers.view" },
          ]
      },
      {
          title: "Gestão de Frotas",
          url: "/dashboard/fleet",
          icon: Car,
          permission: "fleet.vehicles.view",
          items: [
              { title: "Veículos", url: "/dashboard/fleet" },
              { title: "Checklists", url: "/dashboard/fleet/checklists", permission: "fleet.checklists.view" },
              { title: "Manutenções", url: "/dashboard/fleet/maintenance", permission: "fleet.maintenance.view" },
              { title: "Dashboard", url: "/dashboard/fleet/metrics", permission: "fleet.dashboard.view" },
          ]
      },
      {
          title: "Helpdesk",
          url: "/dashboard/helpdesk",
          icon: LifeBuoy,
          permission: "helpdesk.ticket.view.own", // Everyone (User) has this
          items: [
              { title: "Meus Chamados", url: "/dashboard/helpdesk" },
              { title: "Novo Chamado", url: "/dashboard/helpdesk/new", permission: "helpdesk.ticket.create" },
              { title: "Atendimento", url: "/dashboard/helpdesk/queue", permission: "helpdesk.ticket.view.all" }, // For Agents
              { title: "Dashboard", url: "/dashboard/helpdesk/metrics", permission: "helpdesk.dashboard.view" }, // For Managers
          ]
      },
      {
        title: "Logística",
        url: "#",
        icon: Truck,
        permission: "logistics.pallets.view", 
        items: [
            { title: "Paletes", url: "/dashboard/logistics/pallets", permission: "logistics.pallets.view" },
            { title: "Patrimônio", url: "/dashboard/logistics/assets", permission: "logistics.assets.view" },
        ]
      },
  ]

  const filteredGroups = menuGroups.filter(group => {
      // 1. Filter sub-items first
      if (group.items) {
          group.items = group.items.filter(item => !item.permission || hasPermission(item.permission));
      }

      const hasVisibleItems = group.items && group.items.length > 0;
      // Check if user has explicit permission for the group (or if none is required)
      const hasGroupPermission = !group.permission || hasPermission(group.permission);

      // Rule 1: If there are visible sub-items, ALWAYS show the group (so users can access the children).
      if (hasVisibleItems) return true;

      // Rule 2: If there are NO visible sub-items, show the group ONLY IF:
      // - The user has permission for the group itself
      // - AND the URL is not a placeholder "#" (meaning it's a clickable page like a Dashboard)
      if (hasGroupPermission && group.url !== "#") return true;

      // Otherwise hide
      return false;
  });

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Truck className="h-5 w-5" />
            </div>
            <span className="truncate font-semibold text-lg text-primary">TocLog</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {isLoading ? (
                  // Loading Skeleton
                  Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-2 p-2">
                          <Skeleton className="h-4 w-4 rounded" />
                          <Skeleton className="h-4 w-32 rounded" />
                      </div>
                  ))
              ) : (
                  filteredGroups.map((item) => {
                      const hasSubItems = item.items && item.items.length > 0;
                      
                      if (!hasSubItems) {
                          // Simple Link
                          return (
                            <SidebarMenuItem key={item.title}>
                                <SidebarMenuButton asChild tooltip={item.title}>
                                    <a href={item.url}>
                                    <item.icon />
                                    <span>{item.title}</span>
                                    </a>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                          )
                      }
                      
                      // Collapsible Group
                      const isOpen = autoCollapse ? openGroup === item.title : undefined;

                      return (
                        <Collapsible 
                            key={item.title} 
                            asChild 
                            open={isOpen} // Control state if auto-collapse is on
                            onOpenChange={(open) => handleGroupToggle(item.title, open)}
                            className="group/collapsible"
                        >
                            <SidebarMenuItem>
                                <CollapsibleTrigger asChild>
                                    <SidebarMenuButton tooltip={item.title}>
                                        <item.icon />
                                        <span>{item.title}</span>
                                        <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                    </SidebarMenuButton>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <SidebarMenuSub>
                                        {item.items?.map(sub => (
                                            <SidebarMenuSubItem key={sub.title}>
                                                <SidebarMenuSubButton asChild>
                                                    <a href={sub.url}>
                                                        <span>{sub.title}</span>
                                                    </a>
                                                </SidebarMenuSubButton>
                                            </SidebarMenuSubItem>
                                        ))}
                                    </SidebarMenuSub>
                                </CollapsibleContent>
                            </SidebarMenuItem>
                        </Collapsible>
                      )
                  })
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
         <SidebarMenu>
            <SidebarMenuItem className="px-2 pb-2">
                 <ModeToggle />
            </SidebarMenuItem>
            
            <SidebarMenuItem>
                <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    <Switch checked={autoCollapse} onCheckedChange={toggleAutoCollapse} id="collapse-mode" className="scale-75 origin-left" />
                    <Label htmlFor="collapse-mode" className="cursor-pointer">Menu Compacto</Label>
                </div>
            </SidebarMenuItem>

            <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Configurações">
                    <a href="/settings">
                        <Settings />
                        <span>Configurações</span>
                    </a>
                </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <SidebarMenuButton onClick={logout} tooltip="Sair">
                    <LogOut />
                    <span>Sair</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
