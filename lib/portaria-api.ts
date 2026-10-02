import { api } from '@/lib/api';

export interface PortariaBranch {
  id: string;
  name: string;
  code?: string | null;
}

export interface PortariaVisitType {
  id: string;
  name: string;
  description?: string | null;
  requiresApproval: boolean;
  requiresInternalAccess: boolean;
  requiresEscort: boolean;
  requiresChecklist: boolean;
  requiresPhoto: boolean;
  requiresDocument: boolean;
  defaultToleranceBeforeMinutes: number;
  defaultToleranceAfterMinutes: number;
  active: boolean;
}

export interface PortariaGate {
  id: string;
  branchId: string;
  name: string;
  code?: string | null;
  active: boolean;
}

export interface PortariaAccessArea {
  id: string;
  branchId: string;
  name: string;
  code?: string | null;
  description?: string | null;
  requiresEpi: boolean;
  requiresEscort: boolean;
  requiresSafetyTerm: boolean;
  requiresChecklist: boolean;
  checklistTemplateId?: string | null;
  active: boolean;
}

export interface PortariaSetting {
  id: string;
  companyId: string;
  branchId?: string | null;
  toleranceBeforeMinutes: number;
  toleranceAfterMinutes: number;
  allowWalkIn: boolean;
  requireApprovalForWalkIn: boolean;
  autoCloseAfterHours: number;
  enableVisualAlertAfterHours: number;
  badgeReturnMandatory: boolean;
  requirePhotoOnArrival: boolean;
  retentionMonths: number;
}

export interface PortariaChecklistTemplate {
  id: string;
  name: string;
  category: string;
  targetScope: string;
  version: number;
  items: Array<{
    id: string;
    description: string;
    required: boolean;
    type?: string;
  }>;
  active: boolean;
}

export interface PortariaVisit {
  id: string;
  code: string;
  branchId: string;
  branch?: PortariaBranch;
  visitTypeId: string;
  visitType?: PortariaVisitType;
  mode: 'INDIVIDUAL' | 'GROUP';
  admissionType: 'SCHEDULED' | 'WALK_IN';
  status: 'SCHEDULED' | 'ARRIVED' | 'APPROVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  expectedArrivalDate: string;
  expectedDepartureDate?: string | null;
  actualArrivalDate?: string | null;
  actualDepartureDate?: string | null;
  hostEmployeeId?: string | null;
  hostName?: string | null;
  hostDepartment?: string | null;
  reason?: string | null;
  notes?: string | null;
  participants: Array<{
    id: string;
    name: string;
    documentHint?: string | null;
    status: string;
    role: string;
    isResponsible?: boolean;
    visitor?: {
      id: string;
      fullName: string;
      phone?: string | null;
    } | null;
  }>;
  vehicles?: Array<{
    id: string;
    vehicle: {
      id: string;
      plate: string;
      brand?: string | null;
      model?: string | null;
      color?: string | null;
      isCompanyVehicle?: boolean;
    };
  }>;
}

export interface PortariaGroup {
  id: string;
  visitId: string;
  name: string;
  institution?: string | null;
  expectedParticipants: number;
  internalEscortUserId?: string | null;
  groupLeaderParticipantId?: string | null;
  status: 'DRAFT' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  visit: PortariaVisit;
  participants: Array<{
    id: string;
    name: string;
    documentHint?: string | null;
    role: string;
    isResponsible: boolean;
    status: string;
  }>;
  summary?: {
    totalExpected: number;
    registered: number;
    arrived: number;
    waitingAuthorization: number;
    approved: number;
    denied: number;
    present: number;
    exited: number;
    noShow: number;
  };
}

export interface PortariaRoute {
  id: string;
  branchId: string;
  visitId?: string | null;
  name: string;
  description?: string | null;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  stops: Array<{
    id: string;
    areaId: string;
    area: PortariaAccessArea;
    order: number;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED' | 'CANCELLED';
    plannedStartAt?: string | null;
    plannedEndAt?: string | null;
    actualStartAt?: string | null;
    actualEndAt?: string | null;
    instructions?: string | null;
    requiresEpi: boolean;
    requiresEscort: boolean;
    requiresSafetyTerm: boolean;
    requiresChecklist: boolean;
  }>;
  nextStop?: any;
  summary?: {
    totalStops: number;
    completedStops: number;
    inProgressStops: number;
    skippedStops: number;
    pendingStops: number;
  };
}

export interface PortariaSession {
  id: string;
  visitId: string;
  participantId: string;
  badgeNumber?: string | null;
  status: 'ACTIVE' | 'CLOSED' | 'REGULARIZED';
  startedAt: string;
  endedAt?: string | null;
  entryGateId?: string | null;
  exitGateId?: string | null;
  visit: PortariaVisit;
  participant: {
    id: string;
    name: string;
    documentHint?: string | null;
  };
}

export const portariaApi = {
  // Contexto
  getContext: () => api.get('/portaria/context').then((r) => r.data),

  // Configurações
  getSettings: (branchId?: string) =>
    api.get('/portaria/settings', { params: { branchId } }).then((r) => r.data),
  updateSettings: (dto: Partial<PortariaSetting>) =>
    api.put('/portaria/settings', dto).then((r) => r.data),

  // Áreas
  getAreas: (branchId?: string) =>
    api.get('/portaria/areas', { params: { branchId } }).then((r) => r.data),
  createArea: (dto: Partial<PortariaAccessArea>) =>
    api.post('/portaria/areas', dto).then((r) => r.data),

  // Portões
  getGates: (branchId?: string) =>
    api.get('/portaria/settings/gates', { params: { branchId } }).then((r) => r.data),
  createGate: (dto: { branchId: string; name: string; code?: string }) =>
    api.post('/portaria/settings/gates', dto).then((r) => r.data),

  // Tipos de Visita
  getVisitTypes: () => api.get('/portaria/settings/visit-types').then((r) => r.data),
  createVisitType: (dto: any) =>
    api.post('/portaria/settings/visit-types', dto).then((r) => r.data),

  // Checklists
  getChecklistTemplates: (category?: string) =>
    api.get('/portaria/checklists/templates', { params: { category } }).then((r) => r.data),
  createChecklistTemplate: (dto: any) =>
    api.post('/portaria/checklists/templates', dto).then((r) => r.data),

  // Visitas
  getVisits: (params?: any) => api.get('/portaria/visits', { params }).then((r) => r.data),
  getVisit: (id: string) => api.get(`/portaria/visits/${id}`).then((r) => r.data),
  createVisit: (dto: any) => api.post('/portaria/visits', dto).then((r) => r.data),
  recordArrival: (id: string, dto?: any) =>
    api.post(`/portaria/visits/${id}/arrival`, dto || {}).then((r) => r.data),
  authorizeVisit: (id: string, dto: any) =>
    api.post(`/portaria/visits/${id}/authorizations`, dto).then((r) => r.data),
  cancelVisit: (id: string, reason: string) =>
    api.post(`/portaria/visits/${id}/cancel`, { reason }).then((r) => r.data),

  // Veículos
  getVehicles: (params?: any) => api.get('/portaria/vehicles', { params }).then((r) => r.data),
  createVehicle: (dto: any) => api.post('/portaria/vehicles', dto).then((r) => r.data),

  // Grupos
  getGroups: (params?: any) => api.get('/portaria/groups', { params }).then((r) => r.data),
  getGroup: (id: string) => api.get(`/portaria/groups/${id}`).then((r) => r.data),
  createGroup: (dto: any) => api.post('/portaria/groups', dto).then((r) => r.data),
  batchCheckIn: (id: string, dto: any) =>
    api.post(`/portaria/groups/${id}/batch-check-in`, dto).then((r) => r.data),
  batchCheckOut: (id: string, dto: any) =>
    api.post(`/portaria/groups/${id}/batch-check-out`, dto).then((r) => r.data),
  completeGroup: (id: string) =>
    api.post(`/portaria/groups/${id}/complete`).then((r) => r.data),

  // Roteiros
  getRoutes: (params?: any) => api.get('/portaria/routes', { params }).then((r) => r.data),
  getRoute: (id: string) => api.get(`/portaria/routes/${id}`).then((r) => r.data),
  createRoute: (dto: any) => api.post('/portaria/routes', dto).then((r) => r.data),
  startRouteStop: (routeId: string, stopId: string, dto?: any) =>
    api.post(`/portaria/routes/${routeId}/stops/${stopId}/start`, dto || {}).then((r) => r.data),
  completeRouteStop: (routeId: string, stopId: string, dto?: any) =>
    api.post(`/portaria/routes/${routeId}/stops/${stopId}/complete`, dto || {}).then((r) => r.data),
  skipRouteStop: (routeId: string, stopId: string, reason: string) =>
    api.post(`/portaria/routes/${routeId}/stops/${stopId}/skip`, { reason }).then((r) => r.data),
  validateStageAccess: (routeId: string, stopId: string, dto: any) =>
    api.post(`/portaria/routes/${routeId}/stops/${stopId}/validate-access`, dto).then((r) => r.data),

  // Sessões e Presença
  getSessions: (params?: any) => api.get('/portaria/sessions', { params }).then((r) => r.data),
  checkIn: (dto: any) => api.post('/portaria/sessions/check-in', dto).then((r) => r.data),
  checkOut: (dto: any) => api.post('/portaria/sessions/check-out', dto).then((r) => r.data),
  regularizeSession: (id: string, dto: any) =>
    api.post(`/portaria/sessions/${id}/regularize`, dto).then((r) => r.data),

  // Bloqueios
  getBlocks: (params?: any) => api.get('/portaria/blocks', { params }).then((r) => r.data),
  createBlock: (dto: any) => api.post('/portaria/blocks', dto).then((r) => r.data),
  deleteBlock: (id: string) => api.delete(`/portaria/blocks/${id}`).then((r) => r.data),
  createOverride: (dto: any) => api.post('/portaria/overrides', dto).then((r) => r.data),
};
