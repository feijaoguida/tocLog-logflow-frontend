export enum MovementType {
  ENTRY = 'ENTRY',
  EXIT = 'EXIT',
  TRANSFER = 'TRANSFER',
  ADJUSTMENT = 'ADJUSTMENT',
}

export enum PalletOwnerType {
  OWN = 'OWN',
  CLIENT = 'CLIENT',
}

export interface PalletBalance {
  id: string;
  branchId: string;
  ownerType: PalletOwnerType;
  clientId?: string;
  quantity: number;
  updatedAt: string;
  branch: { name: string };
  client?: { name: string };
}

export interface CreatePalletMovementDto {
  type: MovementType;
  quantity: number;
  originBranchId?: string;
  destBranchId?: string;
  ownerType: PalletOwnerType;
  clientId?: string;
  observation?: string;
}

export enum AssetStatus {
  ACTIVE = 'ACTIVE',
  IN_TRANSIT = 'IN_TRANSIT',
  WRITEOFF_PENDING = 'WRITEOFF_PENDING',
  WRITTEN_OFF = 'WRITTEN_OFF',
}

export interface Asset {
  id: string;
  code: string;
  name: string;
  description?: string;
  categoryId: string;
  branchId: string;
  status: AssetStatus;
  category: { name: string };
  branch: { name: string };
  createdAt: string;
}
