export type RoleName =
  | 'OWNER'
  | 'SALES_MANAGER'
  | 'SALESPERSON'
  | 'INVENTORY_MANAGER'
  | 'OPERATIONS'
  | 'FINANCE'
  | 'VIEWER';

export interface AuthenticatedUser {
  id: string;
  fullName: string;
  email: string;
  branchId: string | null;
  roles: RoleName[];
}

export interface LoginResponse {
  accessToken: string;
  user: AuthenticatedUser;
}

export interface Branch {
  id: string;
  name: string;
  address: string | null;
}

export type VehicleStatus =
  | 'CANDIDATE'
  | 'INTAKE'
  | 'RECONDITIONING'
  | 'AVAILABLE'
  | 'RESERVED'
  | 'IN_DEAL'
  | 'SOLD'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURNED_TO_SUPPLIER';

export interface Vehicle {
  id: string;
  branchId: string;
  licensePlate: string | null;
  vin: string | null;
  manufacturer: string;
  model: string;
  year: number;
  mileageKm: number | null;
  color: string | null;
  bodyType: string | null;
  gearbox: string | null;
  fuelType: string | null;
  status: VehicleStatus;
  listPrice: string | null;
  purchasePrice?: string | null;
  version: number;
  createdAt: string;
}

export interface Customer {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  city: string | null;
  marketingConsent: boolean;
  createdAt: string;
}

export type LeadStatus =
  | 'NEW'
  | 'CONTACTED'
  | 'QUALIFIED'
  | 'MEETING'
  | 'TEST_DRIVE'
  | 'OFFER'
  | 'NEGOTIATION'
  | 'WON'
  | 'LOST'
  | 'NOT_RELEVANT'
  | 'FUTURE_NURTURE';

export interface Lead {
  id: string;
  customerId: string;
  customer?: Customer;
  source: string;
  ownerUserId: string;
  status: LeadStatus;
  lossReason: string | null;
  nextActionDate: string | null;
  version: number;
  createdAt: string;
}

export type TaskType =
  | 'CALL'
  | 'MESSAGE'
  | 'MEETING'
  | 'TEST_DRIVE'
  | 'SERVICE'
  | 'DOCUMENT'
  | 'COLLECTION'
  | 'DELIVERY'
  | 'FOLLOW_UP';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type TaskStatus = 'OPEN' | 'DONE' | 'CANCELLED';
export const TASK_ENTITY_TYPES = ['Lead', 'Customer', 'Vehicle', 'Deal'] as const;
export type TaskEntityType = (typeof TASK_ENTITY_TYPES)[number];

export interface Task {
  id: string;
  entityType: TaskEntityType;
  entityId: string;
  ownerUserId: string;
  type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  dueAt: string | null;
  notes: string | null;
  version: number;
  createdAt: string;
}

export type QuoteStatus = 'DRAFT' | 'SENT' | 'VIEWED' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

export interface Quote {
  id: string;
  leadId: string;
  vehicleId: string;
  price: string;
  discount: string | null;
  validUntil: string;
  status: QuoteStatus;
  supersedesId: string | null;
  version: number;
  createdAt: string;
}

export type DealStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'SIGNED'
  | 'PAID'
  | 'READY_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';
export type PaymentMethod = 'TRANSFER' | 'CREDIT_CARD' | 'CHECK' | 'CASH' | 'FINANCING' | 'TRADE_IN';

export interface Deal {
  id: string;
  quoteId: string;
  leadId: string;
  vehicleId: string;
  salespersonId: string;
  salePrice: string;
  status: DealStatus;
  version: number;
  createdAt: string;
}

export interface Payment {
  id: string;
  dealId: string;
  amount: string;
  method: PaymentMethod;
  reference: string | null;
  createdAt: string;
}

export type DocumentType =
  | 'LICENSE'
  | 'INSPECTION'
  | 'SERVICE_RECORD'
  | 'INVOICE'
  | 'RECEIPT'
  | 'CONTRACT'
  | 'DISCLOSURE'
  | 'TITLE_TRANSFER'
  | 'WARRANTY'
  | 'ID_PHOTO'
  | 'OTHER';

export interface DocumentRecord {
  id: string;
  entityType: TaskEntityType;
  entityId: string;
  type: DocumentType;
  fileName: string;
  supersedesId: string | null;
  createdAt: string;
}

export interface InventoryReport {
  countByStatus: Record<string, number>;
  availableVehicleCount: number;
  availableInventoryValue: number;
  averageAgeDaysInStock: number;
}

export interface SalesReport {
  countByStatus: Record<string, number>;
  countedDealsForRevenue: number;
  totalRevenue: number;
  averageSalePrice: number;
}

export interface LeadsReport {
  countByStatus: Record<string, number>;
  countBySource: Record<string, number>;
  conversionRatePercent: number;
}

export interface MyPerformanceReport {
  leadCountByStatus: Record<string, number>;
  dealsCounted: number;
  totalRevenue: number;
}
