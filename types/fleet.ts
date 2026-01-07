export type VehicleStatus = 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'BLOCKED';
export type FuelType = 'GASOLINE' | 'ETHANOL' | 'DIESEL' | 'FLEX' | 'ELECTRIC' | 'HYBRID';
export type ChecklistType = 'RECEIVEMENT' | 'DELIVERY' | 'MAINTENANCE_EXIT' | 'PERIODIC' | 'CORRECTIVE';
export type ChecklistStatus = 'OPEN' | 'FINISHED';
export type MaintenanceType = 'PREVENTIVE' | 'CORRECTIVE';
export type MaintenanceStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface VehicleCategory {
    id: string;
    name: string;
}

export interface Vehicle {
    id: string;
    plate: string;
    model: string;
    year: number;
    color: string;
    fuelType: FuelType;
    currentKm: number;
    status: VehicleStatus;
    branchId: string;
    categoryId: string;
    category?: VehicleCategory;
    departmentId?: string;
    observacoes?: string;
    createdAt: string;
    updatedAt: string;
}

export interface Driver {
    id: string;
    userId: string;
    cnh: string;
    cnhCategory: string;
    cnhExpiration: string;
    active: boolean;
}

export interface VehicleTimelineEvent {
    id: string;
    vehicleId: string;
    eventType: string; // CHECKLIST, MAINTENANCE, etc.
    referenceId?: string;
    description: string;
    actorId: string;
    actor?: { name: string; avatarUrl?: string };
    eventDate: string;
}

export interface Checklist {
    id: string;
    type: ChecklistType;
    status: ChecklistStatus;
    km: number;
    startedAt: string;
    finishedAt?: string;
    items: ChecklistItem[];
}

export interface ChecklistItem {
    id: string;
    name: string;
    status: 'OK' | 'NOK' | 'NA';
    observation?: string;
}

export interface Maintenance {
    id: string;
    type: MaintenanceType;
    status: MaintenanceStatus;
    description: string;
    scheduledDate: string;
    estimatedCost?: number;
    supplier?: { name: string };
}
