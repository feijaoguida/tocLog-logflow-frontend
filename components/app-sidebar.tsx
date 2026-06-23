'use client'

import Link from "next/link"

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
  useSidebar,
} from "@/components/ui/sidebar"
import { useRouter } from "next/navigation"

import { useAuth } from "@/context/auth-context"
import React from "react" // Added
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible" // Added
import { Skeleton } from "@/components/ui/skeleton" // Added


import { useSettings } from "@/context/settings-context"

export function AppSidebar() {
  const router = useRouter()
  const { hasPermission, logout, isLoading } = useAuth()
  const { setOpen, isMobile, setOpenMobile } = useSidebar()
  const { accordionMode, collapseOnClick } = useSettings()

  const [openGroup, setOpenGroup] = React.useState<string | null>(null)



  // Handle Group Toggle
  const handleGroupToggle = (title: string, isOpen: boolean) => {
      if (!accordionMode) return; // Independent toggles if config is off
      if (isOpen) {
          setOpenGroup(title)
      } else if (openGroup === title) {
          setOpenGroup(null) // Closing the current one
      }
  }

  const handleItemClick = () => {
    if (collapseOnClick) {
        if (isMobile) {
            setOpenMobile(false)
        } else {
            setOpen(false)
        }
    }
  }

  // Menu Definition with Permissions
  const menuGroups = [
      {
          title: "Dashboard",
          url: "/dashboard",
          icon: "dashboard",
      },
      {
          title: "Cadastros",
          url: "#",
          icon: "dataset",
          items: [
              { title: "Departamentos", url: "/dashboard/rh/departments", permission: "rh.departments.view" },
              { title: "Design System", url: "/dashboard/cadastros/design-system", permission: "system.settings.view" },
              { title: "Filiais", url: "/dashboard/cadastros/branches", permission: "system.branches.view" },
              { title: "Controle Permissões", url: "/dashboard/cadastros/permissions", permission: "system.users.view" },
          ]
      },
      {
          title: "Recursos Humanos",
          url: "/dashboard/rh",
          icon: "group",
          permission: "rh.view",
          items: [
              { title: "Dashboard / Analytics", url: "/dashboard/rh/analytics", permission: "rh.view" },
              { title: "Intranet", url: "/dashboard/rh" },
              { title: "Funcionários", url: "/dashboard/rh/employees", permission: "rh.employees.view" },
              { title: "Férias", url: "/dashboard/rh/vacations", permission: "vacation.view" },
              { title: "Atividades", url: "/dashboard/rh/activities", permission: "rh.activities.view" },
              { title: "Prestação de Contas", url: "/dashboard/rh/expenses", permission: "rh.expenses.view" },
              { title: "Movimentação do Colaborador", url: "/dashboard/rh/movements", permission: "rh.movements.view" },
              { title: "Feedbacks", url: "/dashboard/feedbacks", permission: "feedback.own.view" },
              { title: "Dashboard de Feedbacks", url: "/dashboard/rh/feedbacks/dashboard", permission: "rh.feedbacks.dashboard.view" },
              { title: "Configurações", url: "/dashboard/rh/settings", permission: "rh.feedbacks.settings.manage" },
              { title: "Atestados", url: "/dashboard/rh/certificates" },
              { title: "Org. Chart", url: "/dashboard/rh/org-chart" },
              { title: "Gestão de Salas", url: "/dashboard/rh/salas", permission: "rh.rooms.view" },
              { title: "Agenda de Salas", url: "/dashboard/rh/agendas" }, // Accessible to all
          ]
      },
      {
          title: "Compras",
          url: "/dashboard/compras",
          icon: "shopping_cart",
          permission: "procurement.requests.view", // Base permission for module
          items: [
              { title: "Dashboard", url: "/dashboard/compras" },
              { title: "Meus Pedidos", url: "/dashboard/compras/pedidos" }, // Everyone can see their own
              { title: "Aprovações", url: "/dashboard/compras/aprovacoes", permission: "procurement.requests.approve" },
              { title: "Cotações", url: "/dashboard/compras/cotacoes", permission: "procurement.quotations.view" },
              { title: "Ordens de Compra", url: "/dashboard/compras/ordens", permission: "procurement.orders.view" },
              { title: "Configurações", url: "/dashboard/compras/configuracoes", permission: "procurement.settings.manage" },
              { title: "Produtos", url: "/dashboard/compras/cadastros/produtos", permission: "procurement.products.view" },
              { title: "Fornecedores", url: "/dashboard/compras/cadastros/fornecedores", permission: "procurement.suppliers.view" },
          ]
      },
      {
          title: "Gestão de Frotas",
          url: "/dashboard/fleet",
          icon: "local_shipping",
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
          icon: "support_agent",
          permission: "helpdesk.ticket.view.own", // Everyone (User) has this
          items: [
              { title: "Meus Chamados", url: "/dashboard/helpdesk" },
              { title: "Novo Chamado", url: "/dashboard/helpdesk/new", permission: "helpdesk.ticket.create" },
              { title: "Atendimento", url: "/dashboard/helpdesk/queue", permission: "helpdesk.ticket.view.all" }, // For Agents
              { title: "Dashboard", url: "/dashboard/helpdesk/metrics", permission: "helpdesk.dashboard.view" }, // For Managers
          ]
      },
      {
          title: "Ajuda",
          url: "/dashboard/help",
          icon: "help",
      },
      {
          title: "Frota Externa",
          url: "#",
          icon: "map",
          permission: "externalfleet.view", 
          items: [
              { title: "Motoristas", url: "/dashboard/external-fleet/drivers", permission: "externalfleet.drivers.view" },
              { title: "Montagem Carga", url: "/dashboard/external-fleet/planning", permission: "externalfleet.planning.view" },
              { title: "Rastreamento", url: "/dashboard/external-fleet/tracking", permission: "externalfleet.tracking.view" },
          ]
      },
      {
        title: "Logística",
        url: "#",
        icon: "warehouse",
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

    // Hover Logic for "Collapse on Click"
    const handleMouseEnter = () => {
        if (collapseOnClick && !isMobile) {
            setOpen(true)
        }
    }

    const handleMouseLeave = () => {
        if (collapseOnClick && !isMobile) {
            setOpen(false)
        }
    }

  return (
    <Sidebar 
        collapsible="icon" 
        className="bg-sidebar border-r border-sidebar-border transition-all duration-300"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
    >
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <span className="material-symbols-outlined text-lg">local_shipping</span>
            </div>
            <span className="truncate font-semibold text-lg text-primary group-data-[collapsible=icon]:hidden">TocLog</span>
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
                                <SidebarMenuButton asChild tooltip={item.title} onClick={handleItemClick}>
                                    <Link href={item.url}>
                                    <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                                    <span>{item.title}</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                          )
                      }
                      
                      // Collapsible Group
                      const isOpen = accordionMode ? openGroup === item.title : undefined;

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
                                        <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                                        <span>{item.title}</span>
                                        <span className="material-symbols-outlined ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90">chevron_right</span>
                                    </SidebarMenuButton>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <SidebarMenuSub>
                                        {item.items?.map(sub => (
                                            <SidebarMenuSubItem key={sub.title}>
                                                <SidebarMenuSubButton asChild onClick={handleItemClick}>
                                                    <Link href={sub.url}>
                                                        <span>{sub.title}</span>
                                                    </Link>
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
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Configurações">
                    <Link href="/dashboard/settings">
                        <span className="material-symbols-outlined text-[20px]">settings</span>
                        <span>Configurações</span>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <SidebarMenuButton onClick={logout} tooltip="Sair">
                    <span className="material-symbols-outlined text-[20px]">logout</span>
                    <span>Sair</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
