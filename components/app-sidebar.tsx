'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"

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

import { useAuth } from "@/context/auth-context"
import { api } from "@/lib/api"
import React from "react" // Added
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible" // Added
import { Skeleton } from "@/components/ui/skeleton" // Added


import { useSettings } from "@/context/settings-context"

type MenuItem = {
  title: string
  url: string
  permission?: string
  items?: MenuItem[]
}

type MenuGroup = {
  title: string
  url: string
  icon: string
  permission?: string
  items?: MenuItem[]
}

export function AppSidebar() {
  const pathname = usePathname()
  const { user, hasPermission, logout, isLoading } = useAuth()
  const { setOpen, isMobile, setOpenMobile } = useSidebar()
  const { accordionMode, collapseOnClick } = useSettings()

  const [helpdeskCapabilities, setHelpdeskCapabilities] = React.useState<Record<string, boolean>>({})
  React.useEffect(() => {
    let active = true
    if (!user?.id) return
    const controller = new AbortController()
    api.get('/helpdesk/context', { signal: controller.signal }).then(({ data }) => {
      if (active) setHelpdeskCapabilities(data.capabilities ?? {})
    }).catch(() => {
      if (active && !controller.signal.aborted) setHelpdeskCapabilities({})
    })
    return () => {
      active = false
      controller.abort()
    }
  }, [user?.id])

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

  const filterMenuItems = (items: MenuItem[]): MenuItem[] =>
    items
      .map((item) => ({
        ...item,
        items: item.items ? filterMenuItems(item.items) : undefined,
      }))
      .filter((item) => {
        const hasVisibleChildren = Boolean(item.items?.length)
        const capability: Record<string, boolean | undefined> = {
          '/dashboard/helpdesk': helpdeskCapabilities.myTickets,
          '/dashboard/helpdesk/new': helpdeskCapabilities.createTicket,
          '/dashboard/helpdesk/queue': helpdeskCapabilities.queues,
          '/dashboard/helpdesk/approvals': helpdeskCapabilities.approvals || helpdeskCapabilities.settings,
          '/dashboard/helpdesk/metrics': helpdeskCapabilities.dashboard,
          '/dashboard/helpdesk/configuracoes': helpdeskCapabilities.settings || helpdeskCapabilities.manageQueues,
        }
        const hasItemPermission = item.url in capability ? Boolean(capability[item.url]) : !item.permission || hasPermission(item.permission)

        if (hasVisibleChildren) return true
        if (hasItemPermission && item.url !== "#") return true

        return false
      })

  const renderSubItems = (items: MenuItem[], depth = 0) =>
    items.map((sub) => {
      const hasNestedItems = Boolean(sub.items?.length)

      if (!hasNestedItems) {
        const isActive = pathname === sub.url || (sub.url !== '#' && pathname?.startsWith(sub.url + '/'))
        return (
          <SidebarMenuSubItem key={`${depth}-${sub.title}`}>
            <SidebarMenuSubButton asChild isActive={isActive} onClick={handleItemClick}>
              <Link href={sub.url} className={isActive ? "text-primary font-medium" : ""}>
                <span>{sub.title}</span>
              </Link>
            </SidebarMenuSubButton>
          </SidebarMenuSubItem>
        )
      }

      return (
        <SidebarMenuSubItem key={`${depth}-${sub.title}`}>
          <Collapsible defaultOpen className="group/submenu">
            <CollapsibleTrigger asChild>
              <SidebarMenuSubButton>
                <span>{sub.title}</span>
                <span className="material-symbols-outlined ml-auto text-sm transition-transform duration-200 group-data-[state=open]/submenu:rotate-90">
                  chevron_right
                </span>
              </SidebarMenuSubButton>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub className="ml-2 mt-1">
                {renderSubItems(sub.items ?? [], depth + 1)}
              </SidebarMenuSub>
            </CollapsibleContent>
          </Collapsible>
        </SidebarMenuSubItem>
      )
    })

  // Menu Definition with Permissions
  const menuGroups: MenuGroup[] = [
      {
          title: "Dashboard",
          url: "/dashboard",
          icon: "dashboard",
      },
      {
          title: "Intranet",
          url: "/dashboard/rh",
          icon: "home",
      },
      {
          title: "Assistente de IA",
          url: "/dashboard/ai",
          icon: "smart_toy",
          permission: "ai.use",
      },
      {
          title: "Cadastros",
          url: "#",
          icon: "dataset",
          items: [
              { title: "Usuários", url: "/dashboard/users", permission: "system.users.view" },
              { title: "Controle Permissões", url: "/dashboard/cadastros/permissions", permission: "system.profiles.view" },
              { title: "Departamentos", url: "/dashboard/rh/departments", permission: "rh.departments.view" },
              { title: "Design System", url: "/dashboard/cadastros/design-system", permission: "system.settings.view" },
              { title: "Filiais", url: "/dashboard/cadastros/branches", permission: "system.branches.view" },
              { title: "Inteligência Artificial", url: "/dashboard/settings/ai/connections", permission: "ai.settings.view" },
          ]
      },
      {
          title: "Recursos Humanos",
          url: "/dashboard/rh",
          icon: "group",
          permission: "rh.view",
          items: [
              { title: "Dashboard / Analytics", url: "/dashboard/rh/analytics", permission: "rh.view" },
              { title: "Funcionários", url: "/dashboard/rh/employees", permission: "rh.employees.view" },
              { title: "Importações", url: "/dashboard/rh/imports", permission: "rh.view" },
              { title: "Movimentação do Colaborador", url: "/dashboard/rh/movements", permission: "rh.movements.view" },
              { title: "Dashboard de Feedbacks", url: "/dashboard/rh/feedbacks/dashboard", permission: "rh.feedbacks.dashboard.view" },
              { title: "Configurações", url: "/dashboard/rh/settings", permission: "rh.feedbacks.settings.manage" },
              { title: "Org. Chart", url: "/dashboard/rh/org-chart" },
              { title: "Agenda de Salas", url: "/dashboard/rh/agendas" }, // Accessible to all
              {
                  title: "Cadastros e Solicitações",
                  url: "#",
                  items: [
                      { title: "Férias", url: "/dashboard/rh/vacations", permission: "vacation.view" },
                      { title: "Atividades", url: "/dashboard/rh/activities", permission: "rh.activities.view" },
                      { title: "Prestação de Contas", url: "/dashboard/rh/expenses", permission: "rh.expenses.view" },
                      { title: "Feedbacks", url: "/dashboard/feedbacks", permission: "feedback.own.view" },
                      { title: "Atestados", url: "/dashboard/rh/certificates" },
                      { title: "Gestão de Salas", url: "/dashboard/rh/salas", permission: "rh.rooms.view" },
                  ],
              },
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
              { title: "Minhas aprovações", url: "/dashboard/helpdesk/approvals" },
              { title: "Atendimento", url: "/dashboard/helpdesk/queue", permission: "helpdesk.ticket.view.all" }, // For Agents
              { title: "Dashboard", url: "/dashboard/helpdesk/metrics", permission: "helpdesk.dashboard.view" }, // For Managers
              { title: "Configurações", url: "/dashboard/helpdesk/configuracoes", permission: "helpdesk.settings.manage" },
          ]
      },
      {
          title: "Ajuda",
          url: "/dashboard/help",
          icon: "help",
      },
      {
          title: "Integrações",
          url: "/dashboard/integrations",
          icon: "sync",
          permission: "integrations.view",
          items: [
              { title: "Conexões e Eventos", url: "/dashboard/integrations", permission: "integrations.view" },
          ]
      },
      {
          title: "Frota Externa",
          url: "#",
          icon: "map",
          permission: "external-fleet.drivers.view", 
          items: [
              { title: "Motoristas", url: "/dashboard/external-fleet/drivers", permission: "external-fleet.drivers.view" },
              { title: "Veículos", url: "/dashboard/external-fleet/vehicles", permission: "external-fleet.vehicles.view" },
          ]
      },
      {
          title: "Cargas e Rotas",
          url: "/dashboard/shipments",
          icon: "route",
          permission: "shipments.cargo.view",
          items: [
              { title: "Cargas", url: "/dashboard/shipments", permission: "shipments.cargo.view" },
              { title: "Rotas", url: "/dashboard/shipments/routes", permission: "shipments.routes.view" },
              { title: "Rastreamento", url: "/dashboard/shipments/tracking", permission: "shipments.routes.view" },
              { title: "Configurações", url: "/dashboard/shipments/settings", permission: "shipments.settings.manage" },
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
      {
        title: "Portaria",
        url: "/dashboard/portaria",
        icon: "badge",
        items: [
            { title: "Painel Geral", url: "/dashboard/portaria" },
            { title: "Visitas e Recepção", url: "/dashboard/portaria/visitas" },
            { title: "Grupos e Caravanas", url: "/dashboard/portaria/grupos", permission: "portaria.group.manage" },
            { title: "Roteiros e Áreas", url: "/dashboard/portaria/roteiros", permission: "portaria.visit.view" },
            { title: "Veículos", url: "/dashboard/portaria/veiculos" },
            { title: "Presentes no Local", url: "/dashboard/portaria/presentes", permission: "portaria.access.operate" },
            { title: "Ocorrências e Turno", url: "/dashboard/portaria/ocorrencias", permission: "portaria.access.operate" },
            { title: "Configurações", url: "/dashboard/portaria/configuracoes", permission: "portaria.settings.manage" },
        ]
      },
  ]

  const filteredGroups = menuGroups
      .map((group) => ({
          ...group,
          items: group.items ? filterMenuItems(group.items) : undefined,
      }))
      .filter(group => {

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
                          const isActive = pathname === item.url || (item.url !== '#' && pathname?.startsWith(item.url + '/'))
                          return (
                            <SidebarMenuItem key={item.title}>
                                <SidebarMenuButton asChild tooltip={item.title} isActive={isActive} onClick={handleItemClick}>
                                    <Link href={item.url} className={isActive ? "text-primary font-medium" : ""}>
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
                                        {renderSubItems(item.items ?? [])}
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
                <SidebarMenuButton asChild tooltip="Configurações" isActive={pathname?.startsWith('/dashboard/settings')}>
                    <Link href="/dashboard/settings" className={pathname?.startsWith('/dashboard/settings') ? "text-primary font-medium" : ""}>
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
