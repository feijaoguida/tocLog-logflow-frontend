
import { HRStatsWidget } from "./widgets/HRStatsWidget"
import { FleetStatusWidget } from "./widgets/FleetStatusWidget"
import { PurchasePendingWidget } from "./widgets/PurchasePendingWidget"
import { FeedWidget } from "./widgets/FeedWidget"
import { HRVacationStatsWidget } from "./widgets/HRVacationStatsWidget"
import { HRRoomReservationsWidget } from "./widgets/HRRoomReservationsWidget"
import { FleetVehicleListWidget } from "./widgets/FleetVehicleListWidget"
import { HDMyTicketsWidget } from "./widgets/HDMyTicketsWidget"
import { LogisticsPalletWidget } from "./widgets/LogisticsPalletWidget"
import { PurchaseRecentOrdersWidget } from "./widgets/PurchaseRecentOrdersWidget"
import { PurchaseStatusWidget } from "./widgets/PurchaseStatusWidget"
import { PurchaseNewProductsWidget } from "./widgets/PurchaseNewProductsWidget"
import { FleetChecklistWidget } from "./widgets/FleetChecklistWidget"
import { HDRecentTicketsWidget } from "./widgets/HDRecentTicketsWidget"
import { HDTopStatsWidget } from "./widgets/HDTopStatsWidget"
import { LogisticsAssetsWidget } from "./widgets/LogisticsAssetsWidget"
import { PurchaseSumsWidget } from "./widgets/PurchaseSumsWidget"
import { UnifiedApprovalsWidget } from "./widgets/UnifiedApprovalsWidget"
import { MyVacationsWidget } from "./widgets/MyVacationsWidget"
import { NotificationsWidget } from "./widgets/NotificationsWidget"
import { FleetMaintenanceWidget } from "./widgets/FleetMaintenanceWidget"
import { MyRecentOrdersWidget } from "./widgets/MyRecentOrdersWidget"
import { BirthdaysWidget } from "./widgets/BirthdaysWidget"
import { SeparatorWidget } from "./widgets/SeparatorWidget"

export type WidgetType = 
    | 'HR_STATS' | 'FLEET_STATUS' | 'PURCHASE_PENDING' | 'FEED'
    | 'RH_VACATIONS' | 'RH_ROOMS'
    | 'FLEET_LIST' | 'FLEET_CHECKLISTS'
    | 'HD_MY_TICKETS' | 'HD_RECENT_ALL' | 'HD_TOP_AGENTS' | 'HD_TOP_REQUESTERS' | 'HD_CATEGORIES'
    | 'LOG_PALLETS' | 'LOG_ASSETS'
    | 'PURCHASE_SUMS' | 'PURCHASE_RECENT_ORDERS' | 'PURCHASE_REQ_STATUS' | 'PURCHASE_QUOTE_STATUS' | 'PURCHASE_PO_STATUS' | 'PURCHASE_NEW_PRODUCTS'
    | 'UNIFIED_APPROVALS' | 'MY_VACATIONS' | 'NOTIFICATIONS' | 'FLEET_MAINTENANCE' | 'MY_RECENT_ORDERS' | 'BIRTHDAYS'
    | 'SEPARATOR_H' | 'SEPARATOR_V'

export interface WidgetDefinition {
    id: WidgetType
    name: string
    minW: number
    minH: number
    defaultW: number
    defaultH: number
    component: React.ComponentType<any>
    props?: any // Optional extra props
}

export const WIDGET_REGISTRY: Record<WidgetType, WidgetDefinition> = {
    'HR_STATS': {
        id: 'HR_STATS', name: 'RH - Estatísticas',
        minW: 2, minH: 3, defaultW: 3, defaultH: 4, component: HRStatsWidget
    },
    'RH_VACATIONS': {
        id: 'RH_VACATIONS', name: 'RH - Férias Vencendo',
        minW: 3, minH: 3, defaultW: 3, defaultH: 4, component: HRVacationStatsWidget
    },
    'RH_ROOMS': {
        id: 'RH_ROOMS', name: 'RH - Salas',
        minW: 2, minH: 2, defaultW: 2, defaultH: 3, component: HRRoomReservationsWidget
    },
    'FLEET_STATUS': {
         id: 'FLEET_STATUS', name: 'Frotas - Status',
        minW: 2, minH: 3, defaultW: 3, defaultH: 4, component: FleetStatusWidget
    },
    'FLEET_LIST': {
         id: 'FLEET_LIST', name: 'Frotas - Lista Veículos',
        minW: 3, minH: 4, defaultW: 4, defaultH: 6, component: FleetVehicleListWidget
    },
    'FLEET_CHECKLISTS': {
        id: 'FLEET_CHECKLISTS', name: 'Frotas - Checklists',
        minW: 2, minH: 2, defaultW: 3, defaultH: 3, component: FleetChecklistWidget
    },
    'PURCHASE_PENDING': {
         id: 'PURCHASE_PENDING', name: 'Compras - Pendências',
        minW: 2, minH: 2, defaultW: 3, defaultH: 3, component: PurchasePendingWidget
    },
    'PURCHASE_SUMS': {
         id: 'PURCHASE_SUMS', name: 'Compras - Total',
        minW: 2, minH: 2, defaultW: 3, defaultH: 2, component: PurchaseSumsWidget
    },
    'PURCHASE_RECENT_ORDERS': {
        id: 'PURCHASE_RECENT_ORDERS', name: 'Compras - Últimos Pedidos',
        minW: 3, minH: 3, defaultW: 4, defaultH: 4, component: PurchaseRecentOrdersWidget
    },
    'PURCHASE_REQ_STATUS': {
        id: 'PURCHASE_REQ_STATUS', name: 'Compras - Sts Requisições',
        minW: 3, minH: 4, defaultW: 4, defaultH: 5, component: (props) => <PurchaseStatusWidget {...props} title="Status Requisições" />
    },
    'PURCHASE_QUOTE_STATUS': {
        id: 'PURCHASE_QUOTE_STATUS', name: 'Compras - Sts Cotações',
        minW: 3, minH: 4, defaultW: 4, defaultH: 5, component: (props) => <PurchaseStatusWidget {...props} title="Status Cotações" />
    },
    'PURCHASE_PO_STATUS': {
        id: 'PURCHASE_PO_STATUS', name: 'Compras - Sts Pedidos',
        minW: 3, minH: 4, defaultW: 4, defaultH: 5, component: (props) => <PurchaseStatusWidget {...props} title="Status Pedidos" />
    },
    'PURCHASE_NEW_PRODUCTS': {
        id: 'PURCHASE_NEW_PRODUCTS', name: 'Compras - Novos Produtos',
        minW: 2, minH: 3, defaultW: 3, defaultH: 4, component: PurchaseNewProductsWidget
    },
    'HD_MY_TICKETS': {
        id: 'HD_MY_TICKETS', name: 'HelpDesk - Meus Chamados',
        minW: 2, minH: 2, defaultW: 3, defaultH: 3, component: HDMyTicketsWidget
    },
    'HD_RECENT_ALL': {
        id: 'HD_RECENT_ALL', name: 'HelpDesk - Recentes',
        minW: 3, minH: 3, defaultW: 4, defaultH: 5, component: HDRecentTicketsWidget
    },
    'HD_TOP_AGENTS': {
        id: 'HD_TOP_AGENTS', name: 'HelpDesk - Top Atendentes',
        minW: 2, minH: 3, defaultW: 3, defaultH: 4, component: (props) => <HDTopStatsWidget {...props} title="Top Atendentes" />
    },
    'HD_TOP_REQUESTERS': {
        id: 'HD_TOP_REQUESTERS', name: 'HelpDesk - Top Solicitantes',
        minW: 2, minH: 3, defaultW: 3, defaultH: 4, component: (props) => <HDTopStatsWidget {...props} title="Top Solicitantes" />
    },
    'HD_CATEGORIES': {
        id: 'HD_CATEGORIES', name: 'HelpDesk - Categorias',
        minW: 3, minH: 4, defaultW: 4, defaultH: 5, component: (props) => <PurchaseStatusWidget {...props} title="Categorias" /> // Reusing Pie Chart
    },
    'LOG_PALLETS': {
        id: 'LOG_PALLETS', name: 'Logística - Pallets',
        minW: 2, minH: 2, defaultW: 2, defaultH: 3, component: LogisticsPalletWidget
    },
    'LOG_ASSETS': {
        id: 'LOG_ASSETS', name: 'Logística - Ativos',
        minW: 2, minH: 2, defaultW: 2, defaultH: 3, component: LogisticsAssetsWidget
    },
    'FEED': {
        id: 'FEED', name: 'Feed Social',
        minW: 4, minH: 6, defaultW: 6, defaultH: 10, component: FeedWidget
    },
    'UNIFIED_APPROVALS': {
        id: 'UNIFIED_APPROVALS', name: 'Central de Aprovações',
        minW: 2, minH: 3, defaultW: 3, defaultH: 4, component: UnifiedApprovalsWidget
    },
    'MY_VACATIONS': {
        id: 'MY_VACATIONS', name: 'Minhas Férias',
        minW: 2, minH: 2, defaultW: 3, defaultH: 3, component: MyVacationsWidget
    },
    'NOTIFICATIONS': {
        id: 'NOTIFICATIONS', name: 'Notificações',
        minW: 2, minH: 3, defaultW: 2, defaultH: 4, component: NotificationsWidget
    },
    'FLEET_MAINTENANCE': {
        id: 'FLEET_MAINTENANCE', name: 'Frotas - Em Manutenção',
        minW: 2, minH: 2, defaultW: 3, defaultH: 3, component: FleetMaintenanceWidget
    },
    'MY_RECENT_ORDERS': {
        id: 'MY_RECENT_ORDERS', name: 'Meus Pedidos Recentes',
        minW: 2, minH: 2, defaultW: 3, defaultH: 3, component: MyRecentOrdersWidget
    },
    'BIRTHDAYS': {
        id: 'BIRTHDAYS', name: 'Aniversariantes do Mês',
        minW: 2, minH: 2, defaultW: 2, defaultH: 3, component: BirthdaysWidget
    },
    'SEPARATOR_H': {
        id: 'SEPARATOR_H', name: 'Separador Horizontal',
        minW: 2, minH: 1, defaultW: 12, defaultH: 1, component: (props: any) => <SeparatorWidget orientation="horizontal" {...props} />
    },
    'SEPARATOR_V': {
        id: 'SEPARATOR_V', name: 'Separador Vertical',
        minW: 1, minH: 2, defaultW: 1, defaultH: 4, component: (props: any) => <SeparatorWidget orientation="vertical" {...props} />
    }
}
