/**
 * Every Hebrew term a user sees, in one place, per docs/design-system.md's
 * dictionary — source code (types, endpoints) stays in English.
 */
import type {
  DealStatus,
  DocumentType,
  LeadStatus,
  PaymentMethod,
  RoleName,
  TaskEntityType,
  TaskPriority,
  TaskStatus,
  TaskType,
  VehicleStatus,
} from './types';

export const NAV_LABELS = {
  home: 'דף הבית',
  vehicles: 'רכבים',
  customers: 'לקוחות',
  tasks: 'משימות',
  deals: 'עסקאות',
  documents: 'מסמכים',
};

export const ROLE_LABELS_HE: Record<RoleName, string> = {
  OWNER: 'בעלים',
  SALES_MANAGER: 'מנהל מכירות',
  SALESPERSON: 'איש מכירות',
  INVENTORY_MANAGER: 'מנהל מלאי',
  OPERATIONS: 'תפעול',
  FINANCE: 'כספים',
  VIEWER: 'צפייה בלבד',
};

export const VEHICLE_STATUS_LABELS_HE: Record<VehicleStatus, string> = {
  CANDIDATE: 'רכב מועמד',
  INTAKE: 'בקליטה',
  RECONDITIONING: 'בהכנה',
  AVAILABLE: 'זמין למכירה',
  RESERVED: 'משוריין',
  IN_DEAL: 'בעסקה',
  SOLD: 'נמכר',
  DELIVERED: 'נמסר ללקוח',
  CANCELLED: 'בוטל',
  RETURNED_TO_SUPPLIER: 'הוחזר לספק',
};

export const LEAD_STATUS_LABELS_HE: Record<LeadStatus, string> = {
  NEW: 'חדש',
  CONTACTED: 'יצרנו קשר',
  QUALIFIED: 'מתאים',
  MEETING: 'נקבעה פגישה',
  TEST_DRIVE: 'נסיעת מבחן',
  OFFER: 'ניתנה הצעה',
  NEGOTIATION: 'במשא ומתן',
  WON: 'נסגר בהצלחה',
  LOST: 'אבד',
  NOT_RELEVANT: 'לא רלוונטי',
  FUTURE_NURTURE: 'טיפוח לעתיד',
};

export const TASK_TYPE_LABELS_HE: Record<TaskType, string> = {
  CALL: 'שיחת טלפון',
  MESSAGE: 'הודעה',
  MEETING: 'פגישה',
  TEST_DRIVE: 'נסיעת מבחן',
  SERVICE: 'טיפול/שירות',
  DOCUMENT: 'מסמך',
  COLLECTION: 'גבייה',
  DELIVERY: 'מסירת רכב',
  FOLLOW_UP: 'לחזור ללקוח',
};

export const TASK_PRIORITY_LABELS_HE: Record<TaskPriority, string> = {
  LOW: 'נמוכה',
  MEDIUM: 'בינונית',
  HIGH: 'גבוהה',
};

export const TASK_STATUS_LABELS_HE: Record<TaskStatus, string> = {
  OPEN: 'פתוחה',
  DONE: 'הושלמה',
  CANCELLED: 'בוטלה',
};

export const TASK_ENTITY_TYPE_LABELS_HE: Record<TaskEntityType, string> = {
  Lead: 'לקוח מתעניין',
  Customer: 'לקוח',
  Vehicle: 'רכב',
  Deal: 'עסקה',
};

export const DEAL_STATUS_LABELS_HE: Record<DealStatus, string> = {
  DRAFT: 'טיוטה',
  PENDING_APPROVAL: 'ממתין לאישור',
  SIGNED: 'נחתם',
  PAID: 'שולם',
  READY_FOR_DELIVERY: 'מוכן למסירה',
  DELIVERED: 'נמסר',
  CANCELLED: 'בוטל',
};

export const PAYMENT_METHOD_LABELS_HE: Record<PaymentMethod, string> = {
  TRANSFER: 'העברה בנקאית',
  CREDIT_CARD: 'כרטיס אשראי',
  CHECK: "צ'ק",
  CASH: 'מזומן',
  FINANCING: 'מימון',
  TRADE_IN: 'טרייד-אין',
};

export const DOCUMENT_TYPE_LABELS_HE: Record<DocumentType, string> = {
  LICENSE: 'רישיון רכב',
  INSPECTION: 'טסט',
  SERVICE_RECORD: 'תיעוד טיפול',
  INVOICE: 'חשבונית',
  RECEIPT: 'קבלה',
  CONTRACT: 'חוזה',
  DISCLOSURE: 'גילוי נאות',
  TITLE_TRANSFER: 'העברת בעלות',
  WARRANTY: 'אחריות',
  ID_PHOTO: 'צילום תעודה מזהה',
  OTHER: 'אחר',
};

/** Status color per docs/design-system.md's StatusBadge rule: color always paired with text. */
export type StatusTone = 'neutral' | 'success' | 'warning' | 'danger' | 'primary';

export const VEHICLE_STATUS_TONE: Record<VehicleStatus, StatusTone> = {
  CANDIDATE: 'neutral',
  INTAKE: 'neutral',
  RECONDITIONING: 'warning',
  AVAILABLE: 'success',
  RESERVED: 'primary',
  IN_DEAL: 'primary',
  SOLD: 'success',
  DELIVERED: 'success',
  CANCELLED: 'danger',
  RETURNED_TO_SUPPLIER: 'danger',
};

export const LEAD_STATUS_TONE: Record<LeadStatus, StatusTone> = {
  NEW: 'neutral',
  CONTACTED: 'primary',
  QUALIFIED: 'primary',
  MEETING: 'primary',
  TEST_DRIVE: 'primary',
  OFFER: 'warning',
  NEGOTIATION: 'warning',
  WON: 'success',
  LOST: 'danger',
  NOT_RELEVANT: 'danger',
  FUTURE_NURTURE: 'neutral',
};

export const TASK_STATUS_TONE: Record<TaskStatus, StatusTone> = {
  OPEN: 'warning',
  DONE: 'success',
  CANCELLED: 'danger',
};

export const DEAL_STATUS_TONE: Record<DealStatus, StatusTone> = {
  DRAFT: 'neutral',
  PENDING_APPROVAL: 'warning',
  SIGNED: 'primary',
  PAID: 'primary',
  READY_FOR_DELIVERY: 'primary',
  DELIVERED: 'success',
  CANCELLED: 'danger',
};

export function formatCurrency(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  const numeric = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(numeric)) return '—';
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0,
  }).format(numeric);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('he-IL', { dateStyle: 'short' }).format(new Date(value));
}
