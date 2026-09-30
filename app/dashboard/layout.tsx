import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { ChatWidget } from "./rh/components/chat-widget"
import { UserProfile } from "@/components/user-profile"
import { Search } from "lucide-react"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-13 shrink-0 items-center justify-between gap-4 border-b border-border bg-background/95 px-4 backdrop-blur-xs transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 md:px-6">
          <div className="flex items-center gap-2.5">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-1 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard" className="text-sm text-muted-foreground hover:text-primary">
                    TocLog
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-sm font-medium text-foreground">
                    Dashboard
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative hidden w-64 max-w-sm sm:flex items-center">
              <Search className="pointer-events-none absolute left-2.5 size-4 text-muted-foreground" />
              <input
                type="search"
                placeholder="Buscar no sistema..."
                className="h-8.5 w-full rounded-md border border-input bg-surface-subtle pl-8 pr-11 text-xs placeholder:text-muted-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/20"
                readOnly
              />
              <kbd className="pointer-events-none absolute right-2 inline-flex h-4.5 select-none items-center gap-0.5 rounded border border-border bg-card px-1 font-mono text-[10px] font-medium text-muted-foreground">
                <span className="text-[11px]">⌘</span>K
              </kbd>
            </div>

            <UserProfile />
          </div>
        </header>

        <main className="flex flex-1 flex-col p-4 md:p-6">
          {children}
        </main>
        
        <ChatWidget />
      </SidebarInset>
    </SidebarProvider>
  )
}
